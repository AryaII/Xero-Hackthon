import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const required = ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env — stopping.`);
    process.exit(1);
  }
}

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

const client = new Client({ name: "cashflow-agent-discovery", version: "0.1.0" }, { capabilities: {} });

console.log("Connecting to Xero MCP server (npx @xeroapi/xero-mcp-server@latest)...");
await client.connect(transport);
console.log("Connected.\n");

const toolsResult = await client.listTools();
console.log(`=== tools/list (${toolsResult.tools.length} tools) ===`);
for (const tool of toolsResult.tools) {
  console.log(`\n--- ${tool.name} ---`);
  console.log(tool.description ?? "(no description)");
  console.log(JSON.stringify(tool.inputSchema, null, 2));
}

const fixturesDir = path.resolve(__dirname, "__fixtures__");
fs.mkdirSync(fixturesDir, { recursive: true });
fs.writeFileSync(
  path.join(fixturesDir, "_tools-list.json"),
  JSON.stringify(toolsResult.tools, null, 2)
);
console.log(`\nSaved tool list to ${path.join(fixturesDir, "_tools-list.json")}`);

console.log("\n=== calling list-organisation-details ===");
const orgToolName = toolsResult.tools.find((t) => t.name === "list-organisation-details")?.name;
if (!orgToolName) {
  console.error("No tool named 'list-organisation-details' found. Available tool names:");
  console.error(toolsResult.tools.map((t) => t.name).join(", "));
  process.exit(1);
}

const orgResult = await client.callTool({ name: orgToolName, arguments: {} });
console.log(JSON.stringify(orgResult, null, 2));
fs.writeFileSync(
  path.join(fixturesDir, "list-organisation-details.json"),
  JSON.stringify(orgResult, null, 2)
);

await client.close();
console.log("\nDone.");
