// Mirrors server/events.ts and server/observe.ts result shapes.
// Kept in sync by hand for now — see NOTES.md if this ever drifts from the backend.

export type OodaStep = "observe" | "orient" | "decide" | "act" | "learn";

export interface HypothesisEvidence {
  source: string;
  value: string;
}

export interface ConfidenceFormula {
  formula: string;
  inputs: Record<string, number>;
  weights: Record<string, number>;
}

export interface Hypothesis {
  id: string;
  kind: "dormant_customer" | "late_payment_risk";
  label: string;
  detail: string;
  impactGBP: number | null;
  confidence: number;
  relatedIds: string[];
  evidence: HypothesisEvidence[];
  confidenceFormula: ConfidenceFormula;
}

export interface CreateQuoteResult {
  quoteId?: string;
  contactName?: string;
  total?: number;
  status?: string;
  deepLink?: string;
}

export interface ProposedAction {
  id: string;
  hypothesisId: string;
  title: string;
  reason: string;
  kind: "draft_quote" | "draft_followup";
  permission: "needs_approval";
  status: "proposed" | "approved" | "rejected" | "failed";
  xeroResult?: CreateQuoteResult;
  error?: string;
  actionedAt?: string;
}

export type OodaEvent =
  | { type: "step"; step: OodaStep; state: "active" | "done" }
  | { type: "source"; id: string; label: string; value?: unknown; state: "loading" | "done" | "error"; error?: string }
  | { type: "hypothesis"; hypothesis: Hypothesis }
  | { type: "action"; action: ProposedAction }
  | { type: "toast"; tone: "info" | "warn"; text: string };

export interface BankBalanceObserve {
  accounts: { accountId: string; name: string }[];
  balanceAvailable: false;
  note: string;
  recentTransactionCount: number;
}

export interface AgedInvoicesObserve {
  count: number;
  totalOutstanding: number;
  oldestDueDate: string | null;
  invoices: { invoiceId: string; contactName?: string; total: number; dueDate?: string }[];
}

export interface PnlTrendObserve {
  periodLabels: string[];
  totalIncomeByPeriod: number[];
  netProfitByPeriod: number[];
}

export interface ContactHistoryObserve {
  contactCount: number;
  topByRecency: { contactId: string; name: string; daysSinceLastInvoice: number; invoiceCount: number }[];
}

export interface PaymentPatternsObserve {
  paidInvoiceCount: number;
  avgDaysSalesOutstanding: number | null;
}

export interface HealthResponse {
  xeroConnected: boolean;
  demoMode: boolean;
  org: string | null;
  error?: string;
}
