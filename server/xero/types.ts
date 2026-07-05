export interface McpTextContent {
  type: "text";
  text: string;
}

export interface McpToolResult {
  content: McpTextContent[];
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber?: string;
  reference?: string;
  type?: "ACCREC" | "ACCPAY" | string;
  status?: string;
  contactName?: string;
  contactId?: string;
  date?: string;
  dueDate?: string;
  lineAmountTypes?: string;
  subTotal?: number;
  totalTax?: number;
  total?: number;
  currency?: string;
  currencyRate?: number;
  lastUpdated?: string;
  fullyPaidOn?: string;
  amountDue?: number;
  amountPaid?: number;
  amountCredited?: number;
}

export interface Contact {
  contactId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  type?: string;
  status?: string;
  lastUpdated?: string;
}

export interface BankTransaction {
  bankTransactionId: string;
  bankAccountName?: string;
  bankAccountId?: string;
  contactName?: string;
  contactId?: string;
  reference?: string;
  date?: string;
  subTotal?: number;
  total?: number;
  reconciled: boolean;
  currencyCode?: string;
  transactionStatus?: string;
  lineAmountTypes?: string;
  hasAttachments: boolean;
}

export interface Item {
  itemId: string;
  name: string;
  code?: string;
  description?: string;
  purchaseDescription?: string;
  salesPrice?: number;
  purchasePrice?: number;
  salesAccount?: string;
  purchaseAccount?: string;
  trackedAsInventory?: boolean;
  isSold?: boolean;
  isPurchased?: boolean;
  lastUpdated?: string;
}

export interface TrackingOption {
  optionId: string;
  name: string;
  status: string;
}

export interface TrackingCategory {
  trackingCategoryId: string;
  name: string;
  status: string;
  options: TrackingOption[];
}

export interface Account {
  accountId: string;
  name: string;
  code?: string;
  type?: string;
  status?: string;
  taxType?: string;
  description?: string;
}

export interface OrganisationDetails {
  name?: string;
  legalName?: string;
  organisationId?: string;
  baseCurrency?: string;
  countryCode?: string;
  organisationStatus?: string;
  isDemoCompany?: boolean;
  createdDate?: string;
}

// --- Report grid (list-profit-and-loss, list-aged-receivables-by-contact) ---

export interface ReportCellAttribute {
  id: string;
  value: string;
}

export interface ReportCell {
  value: string;
  attributes?: ReportCellAttribute[];
}

export interface ReportHeaderRow {
  rowType: "Header";
  cells: ReportCell[];
}

export interface ReportDataRow {
  rowType: "Row" | "SummaryRow";
  cells: ReportCell[];
}

export interface ReportSection {
  rowType: "Section";
  title: string;
  rows: ReportDataRow[];
}

export type ReportNode = ReportHeaderRow | ReportSection;
export type ReportGrid = ReportNode[];

// --- Write results ---

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode: string;
  taxType: string;
}

export interface CreateQuotePayload {
  contactId: string;
  lineItems: QuoteLineItem[];
  reference?: string;
  title?: string;
  summary?: string;
}

export interface CreateQuoteResult {
  quoteId?: string;
  contactName?: string;
  total?: number;
  status?: string;
  deepLink?: string;
}
