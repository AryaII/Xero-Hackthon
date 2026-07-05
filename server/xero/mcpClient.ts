import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseAccounts,
  parseBankTransactions,
  parseContacts,
  parseCreateQuoteResult,
  parseInvoices,
  parseItems,
  parseOrganisationDetails,
  parseReportGrid,
  parseTrackingCategories,
} from "./parsers.js";
import type {
  Account,
  BankTransaction,
  Contact,
  CreateQuotePayload,
  CreateQuoteResult,
  Invoice,
  Item,
  McpToolResult,
  OrganisationDetails,
  ReportGrid,
  TrackingCategory,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@xeroapi/xero-mcp-server@latest"],
        env: {
          ...process.env,
          XERO_CLIENT_ID: process.env.XERO_CLIENT_ID ?? "",
          XERO_CLIENT_SECRET: process.env.XERO_CLIENT_SECRET ?? "",
          XERO_SCOPES: process.env.XERO_SCOPES ?? "",
        },
      });
      const client = new Client({ name: "cashflow-agent", version: "0.1.0" }, { capabilities: {} });
      await client.connect(transport);
      return client;
    })();
  }
  return clientPromise;
}

// The two report tools return the grid as a JSON string inside the LAST text block
// (see NOTES.md §2); every other list-* tool returns one formatted text block per
// record (see NOTES.md §1). Fixtures were captured with that same shape, so
// DEMO_MODE can reuse them unchanged.
function loadFixture(toolName: string): McpToolResult {
  const filePath = path.join(FIXTURES_DIR, `${toolName}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as McpToolResult;
}

async function call(toolName: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
  if (isDemoMode()) return loadFixture(toolName);
  const client = await getClient();
  const result = await client.callTool({ name: toolName, arguments: args });
  return result as McpToolResult;
}

const MAX_PAGES = 20; // safety cap — see NOTES.md §6b rate-limit guidance

async function fetchAllInvoices(): Promise<Invoice[]> {
  // DEMO_MODE fixtures are a single static snapshot — the "page" arg is ignored by
  // call(), so paging further would just reload the same 10 records forever.
  if (isDemoMode()) return parseInvoices(await call("list-invoices", { page: 1 }));

  const all: Invoice[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = parseInvoices(await call("list-invoices", { page }));
    all.push(...batch);
    if (batch.length < 10) break; // page size is 10 — see NOTES.md
  }
  return all;
}

async function fetchAllContacts(): Promise<Contact[]> {
  if (isDemoMode()) return parseContacts(await call("list-contacts", { page: 1 }));

  const all: Contact[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = parseContacts(await call("list-contacts", { page }));
    all.push(...batch);
    if (batch.length < 100) break; // page size is up to 100 per the tool description
  }
  return all;
}

export const xero = {
  organisation: async (): Promise<OrganisationDetails> =>
    parseOrganisationDetails(await call("list-organisation-details")),

  accounts: async (): Promise<Account[]> => parseAccounts(await call("list-accounts")),

  bankTransactions: async (page = 1): Promise<BankTransaction[]> =>
    parseBankTransactions(await call("list-bank-transactions", { page })),

  invoices: fetchAllInvoices,

  contacts: fetchAllContacts,

  // Per-contact only — never loop this over every contact (NOTES.md §6b / brief §6b).
  agedReceivablesByContact: async (contactId: string): Promise<ReportGrid> =>
    parseReportGrid(await call("list-aged-receivables-by-contact", { contactId })),

  // periods must be <=11; periods:12 always errors (NOTES.md §3).
  profitAndLoss: async (periods = 11): Promise<ReportGrid> =>
    parseReportGrid(await call("list-profit-and-loss", { periods, timeframe: "MONTH" })),

  trackingCategories: async (): Promise<TrackingCategory[]> =>
    parseTrackingCategories(await call("list-tracking-categories")),

  // Requires accounting.reports.balancesheet.read — see NOTES.md §5b for the
  // XERO_SCOPES gotcha that made this look unavailable at first.
  balanceSheet: async (): Promise<ReportGrid> => parseReportGrid(await call("list-report-balance-sheet")),

  items: async (page = 1): Promise<Item[]> => parseItems(await call("list-items", { page })),

  // Real write — only ever DRAFT, only after human approval (brief §4.5/§9).
  // Blocked under DEMO_MODE: there's no fixture for it, and demo mode's whole
  // point is zero live Xero calls.
  createDraftQuote: async (payload: CreateQuotePayload): Promise<CreateQuoteResult> => {
    if (isDemoMode()) throw new Error("createDraftQuote is not available in DEMO_MODE");
    const client = await getClient();
    const result = (await client.callTool({
      name: "create-quote",
      arguments: { ...payload },
    })) as McpToolResult;
    return parseCreateQuoteResult(result);
  },
};

export async function closeXeroClient(): Promise<void> {
  if (!clientPromise) return;
  const client = await clientPromise;
  await client.close();
  clientPromise = null;
}
