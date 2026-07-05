import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseInvoices,
  parseContacts,
  parseBankTransactions,
  parseItems,
  parseTrackingCategories,
  parseOrganisationDetails,
  parseReportGrid,
  getReportHeaderCells,
  findReportRow,
} from "./parsers.js";
import type { McpToolResult } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "__fixtures__");

function load(name: string): McpToolResult {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), "utf8"));
}

const invoices = parseInvoices(load("list-invoices.json"));
console.log(`Invoices parsed: ${invoices.length}`);
console.log(invoices[0]);
console.log(invoices[2]); // has Reference + Amount Due + Amount Paid

const contacts = parseContacts(load("list-contacts.json"));
console.log(`\nContacts parsed: ${contacts.length}`);
console.log(contacts[0]);
console.log(contacts[1]); // no email

const bankTx = parseBankTransactions(load("list-bank-transactions.json"));
console.log(`\nBank transactions parsed: ${bankTx.length}`);
console.log(bankTx[0]);

const items = parseItems(load("list-items.json"));
console.log(`\nItems parsed: ${items.length}`);
console.log(items[0]);

const trackingCategories = parseTrackingCategories(load("list-tracking-categories.json"));
console.log(`\nTracking categories parsed: ${trackingCategories.length}`);
console.log(JSON.stringify(trackingCategories[0], null, 2));

const org = parseOrganisationDetails(load("list-organisation-details.json"));
console.log("\nOrganisation:", org);

const pnl = parseReportGrid(load("list-profit-and-loss.json"));
console.log("\nP&L header columns:", getReportHeaderCells(pnl));
console.log("P&L Net Profit row:", findReportRow(pnl, "Net Profit"));
console.log("P&L Total Income row:", findReportRow(pnl, "Total Income"));

const aged = parseReportGrid(load("list-aged-receivables-by-contact.json"));
console.log("\nAged receivables header columns:", getReportHeaderCells(aged));
console.log("Aged receivables Total row:", findReportRow(aged, "Total"));

// sanity assertions
const assertions: [string, boolean][] = [
  ["invoice[0] has invoiceId", !!invoices[0].invoiceId],
  ["invoice[0] date is ISO", !!invoices[0].date && invoices[0].date!.includes("T")],
  ["invoice[0] total is number", typeof invoices[0].total === "number"],
  ["contact[0] has contactId", !!contacts[0].contactId],
  ["contact[1] has no email (undefined)", contacts[1].email === undefined],
  ["bankTx[0] has bankTransactionId", !!bankTx[0].bankTransactionId],
  ["item[0] name parsed despite colon in value", items[0].name === "Fish out of Water: Finding Your Brand"],
  ["trackingCategories[0] has 4 options", trackingCategories[0]?.options.length === 4],
  ["org name is Demo Company (UK)", org.name === "Demo Company (UK)"],
  ["P&L header has 13 columns (blank + 12 periods, periods:11 is additive)", getReportHeaderCells(pnl).length === 13],
  ["P&L Net Profit row resolves despite being a plain Row", findReportRow(pnl, "Net Profit") !== undefined],
];
console.log("\n=== assertions ===");
let failed = 0;
for (const [label, ok] of assertions) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
  if (!ok) failed++;
}
process.exit(failed > 0 ? 1 : 0);
