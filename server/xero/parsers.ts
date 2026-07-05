import type {
  Account,
  BankTransaction,
  Contact,
  CreateQuoteResult,
  Invoice,
  Item,
  McpToolResult,
  OrganisationDetails,
  ReportGrid,
  TrackingCategory,
  TrackingOption,
} from "./types.js";

// Every list-* tool (except the two report tools) returns one MCP text block per
// record, formatted as human-readable "Key: Value" lines with occasional flag-only
// lines that carry no colon (e.g. "Unreconciled", "No email"). See NOTES.md §1.
function parseKeyValueBlock(text: string): { fields: Record<string, string>; flags: string[] } {
  const fields: Record<string, string> = {};
  const flags: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      flags.push(line);
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    fields[key] = value;
  }
  return { fields, flags };
}

// Fields like "Contact: Truxton Property Management (aca6e01a-...)" pack a display
// name and a GUID into one line — split them back apart.
const NAME_WITH_ID_RE = /^(.*)\s\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i;
function splitNameAndId(value: string | undefined): { name?: string; id?: string } {
  if (!value) return {};
  const match = value.match(NAME_WITH_ID_RE);
  if (!match) return { name: value };
  return { name: match[1], id: match[2] };
}

// Xero MCP date strings are locale-dependent `Date.prototype.toString()` output
// (e.g. "Sun May 24 2026 01:00:00 GMT+0100 (英国夏令时间)") — see NOTES.md §4.
// `new Date(...)` parses them fine; normalize to ISO immediately.
function toIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function textBlocks(result: McpToolResult): string[] {
  return result.content.filter((c) => c.type === "text").map((c) => c.text);
}

export function parseInvoices(result: McpToolResult): Invoice[] {
  const blocks = textBlocks(result).slice(1); // first block is "Found N invoices:"
  return blocks.map((text) => {
    const { fields } = parseKeyValueBlock(text);
    const contact = splitNameAndId(fields["Contact"]);
    return {
      invoiceId: fields["Invoice ID"],
      invoiceNumber: fields["Invoice"],
      reference: fields["Reference"],
      type: fields["Type"],
      status: fields["Status"],
      contactName: contact.name,
      contactId: contact.id,
      date: toIso(fields["Date"]),
      dueDate: toIso(fields["Due Date"]),
      lineAmountTypes: fields["Line Amount Types"],
      subTotal: toNumber(fields["Sub Total"]),
      totalTax: toNumber(fields["Total Tax"]),
      total: toNumber(fields["Total"]),
      currency: fields["Currency"],
      currencyRate: toNumber(fields["Currency Rate"]),
      lastUpdated: toIso(fields["Last Updated"]),
      fullyPaidOn: toIso(fields["Fully Paid On"]),
      amountDue: toNumber(fields["Amount Due"]),
      amountPaid: toNumber(fields["Amount Paid"]),
      amountCredited: toNumber(fields["Amount Credited"]),
    };
  });
}

export function parseContacts(result: McpToolResult): Contact[] {
  const blocks = textBlocks(result).slice(1); // first block is "Found N contacts (page X):"
  return blocks.map((text) => {
    const { fields } = parseKeyValueBlock(text);
    return {
      contactId: fields["ID"],
      name: fields["Contact"],
      firstName: fields["First Name"],
      lastName: fields["Last Name"],
      email: fields["Email"],
      type: fields["Type"],
      status: fields["Status"],
      lastUpdated: toIso(fields["Last Updated"]),
    };
  });
}

export function parseBankTransactions(result: McpToolResult): BankTransaction[] {
  const blocks = textBlocks(result).slice(1); // first block is "Found N bank transactions:"
  return blocks.map((text) => {
    const { fields, flags } = parseKeyValueBlock(text.split("\nLine Items:")[0]);
    const bankAccount = splitNameAndId(fields["Bank Account"]);
    const contact = splitNameAndId(fields["Contact"]);
    return {
      bankTransactionId: fields["Bank Transaction ID"],
      bankAccountName: bankAccount.name,
      bankAccountId: bankAccount.id,
      contactName: contact.name,
      contactId: contact.id,
      reference: fields["Reference"],
      date: toIso(fields["Date"]),
      subTotal: toNumber(fields["Sub Total"]),
      total: toNumber(fields["Total"]),
      reconciled: !flags.includes("Unreconciled"),
      currencyCode: fields["Currency Code"],
      transactionStatus: flags.find((f) => f === "AUTHORISED" || f === "DELETED" || f === "VOIDED"),
      lineAmountTypes: fields["Line Amount Types"],
      hasAttachments: !flags.includes("Does not have attachments"),
    };
  });
}

export function parseItems(result: McpToolResult): Item[] {
  const blocks = textBlocks(result).slice(1); // first block is "Found N items:"
  return blocks.map((text) => {
    const { fields } = parseKeyValueBlock(text);
    return {
      itemId: fields["ID"],
      name: fields["Item"],
      code: fields["Code"],
      description: fields["Description"],
      purchaseDescription: fields["Purchase Description"],
      salesPrice: toNumber(fields["Sales Price"]),
      purchasePrice: toNumber(fields["Purchase Price"]),
      salesAccount: fields["Sales Account"],
      purchaseAccount: fields["Purchase Account"],
      trackedAsInventory: fields["Tracked as Inventory"] === "Yes",
      isSold: fields["Is Sold"] === "Yes",
      isPurchased: fields["Is Purchased"] === "Yes",
      lastUpdated: toIso(fields["Last Updated"]),
    };
  });
}

const OPTION_RE = /Option ID: ([^\n,]+)\nName: ([^\n,]+)\nStatus: ([^\n,]+)/g;

export function parseTrackingCategories(result: McpToolResult): TrackingCategory[] {
  const blocks = textBlocks(result).slice(1); // first block is "Found N tracking categories:"
  return blocks.map((text) => {
    const [header, optionsBlob = ""] = text.split(/Found \d+ tracking options:\n/);
    const { fields } = parseKeyValueBlock(header);
    const options: TrackingOption[] = [];
    for (const match of optionsBlob.matchAll(OPTION_RE)) {
      options.push({ optionId: match[1], name: match[2], status: match[3] });
    }
    return {
      trackingCategoryId: fields["Tracking Category ID"],
      name: fields["Name"],
      status: fields["Status"],
      options,
    };
  });
}

export function parseAccounts(result: McpToolResult): Account[] {
  const blocks = textBlocks(result).slice(1); // first block is "Found N accounts:"
  return blocks.map((text) => {
    const { fields } = parseKeyValueBlock(text);
    return {
      accountId: fields["ID"],
      name: fields["Account"],
      code: fields["Code"],
      type: fields["Type"],
      status: fields["Status"],
      taxType: fields["Tax Type"],
      description: fields["Description"],
    };
  });
}

export function parseOrganisationDetails(result: McpToolResult): OrganisationDetails {
  const blocks = textBlocks(result);
  const detailBlock = blocks[blocks.length - 1] ?? "";
  const { fields } = parseKeyValueBlock(detailBlock);
  const stripFallback = (v: string | undefined) => v?.split(" || ")[0];
  return {
    name: stripFallback(fields["Name"]),
    legalName: stripFallback(fields["Legal Name"]),
    organisationId: stripFallback(fields["Organisation ID"]),
    baseCurrency: stripFallback(fields["Base Currency"]),
    countryCode: stripFallback(fields["Country Code"]),
    organisationStatus: fields["Organisation Status"],
    isDemoCompany: fields["Is Demo Company"] === "Yes",
    createdDate: stripFallback(fields["Created Date"]),
  };
}

// --- Report grid parsing (list-profit-and-loss, list-aged-receivables-by-contact) ---
// The grid is JSON.stringify'd inside the LAST text block; earlier blocks are a
// plain-text preamble (report name / date range). See NOTES.md §2.
export function parseReportGrid(result: McpToolResult): ReportGrid {
  const blocks = textBlocks(result);
  const jsonBlock = blocks[blocks.length - 1] ?? "[]";
  return JSON.parse(jsonBlock) as ReportGrid;
}

export function getReportHeaderCells(grid: ReportGrid): string[] {
  const header = grid.find((node) => node.rowType === "Header");
  return header ? header.cells.map((c) => c.value) : [];
}

// Matches by label regardless of rowType — totals like "Total Income" are
// `SummaryRow`, but "Gross Profit"/"Net Profit" are plain `Row`s in an
// untitled section. See NOTES.md §2.
export function findReportRow(grid: ReportGrid, label: string): string[] | undefined {
  for (const node of grid) {
    if (node.rowType !== "Section") continue;
    const row = node.rows.find((r) => r.cells[0]?.value === label);
    if (row) return row.cells.map((c) => c.value);
  }
  return undefined;
}

// create-quote's response is a single text block, not a per-record list — see
// NOTES.md §5c. It DOES include a real "Link to view" deep link, verified live.
export function parseCreateQuoteResult(result: McpToolResult): CreateQuoteResult {
  const text = textBlocks(result)[0] ?? "";
  const { fields } = parseKeyValueBlock(text);
  return {
    quoteId: fields["ID"],
    contactName: fields["Contact"],
    total: toNumber(fields["Total"]),
    status: fields["Status"],
    deepLink: fields["Link to view"],
  };
}
