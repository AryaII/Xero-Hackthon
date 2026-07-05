import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@xeroapi/xero-mcp-server@latest"],
  env: {
    ...process.env,
    XERO_CLIENT_ID: process.env.XERO_CLIENT_ID,
    XERO_CLIENT_SECRET: process.env.XERO_CLIENT_SECRET,
    XERO_SCOPES: process.env.XERO_SCOPES ?? "",
  },
});

const client = new Client({ name: "cashflow-agent-fixtures", version: "0.1.0" }, { capabilities: {} });
await client.connect(transport);
console.log("Connected to Xero MCP server.\n");

const fixturesDir = path.resolve(__dirname, "__fixtures__");
fs.mkdirSync(fixturesDir, { recursive: true });

function extractText(result) {
  return result.content
    ?.filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

async function sample(name, args) {
  console.log(`--- calling ${name}(${JSON.stringify(args)}) ---`);
  const result = await client.callTool({ name, arguments: args });
  fs.writeFileSync(path.join(fixturesDir, `${name}.json`), JSON.stringify(result, null, 2));
  console.log(`saved ${name}.json (${(extractText(result) ?? "").length} chars of text content)\n`);
  return result;
}

// 1. contacts first — need a real contactId for aged-receivables
const contactsResult = await sample("list-contacts", { page: 1 });
const contactsText = extractText(contactsResult) ?? "";
// try to find a Contact ID / GUID in the text
const idMatch = contactsText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
const sampleContactId = idMatch ? idMatch[0] : null;
console.log(`Picked sample contactId for aged-receivables: ${sampleContactId ?? "(none found — inspect list-contacts.json manually)"}\n`);

await sample("list-invoices", { page: 1 });
await sample("list-bank-transactions", { page: 1 });

if (sampleContactId) {
  await sample("list-aged-receivables-by-contact", { contactId: sampleContactId });
} else {
  console.log("Skipping list-aged-receivables-by-contact — no contactId found.\n");
}

await sample("list-profit-and-loss", { periods: 12, timeframe: "MONTH" });
await sample("list-tracking-categories", {});
await sample("list-items", { page: 1 });

await client.close();
console.log("Done. Fixtures saved to " + fixturesDir);
