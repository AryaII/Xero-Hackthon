import { xero } from "./xero/mcpClient.js";
import { findReportRow, getReportHeaderCells } from "./xero/parsers.js";
import type { Contact, Invoice } from "./xero/types.js";
import type { OodaEvent } from "./events.js";
import { daysBetween } from "./dateUtils.js";

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

function computeAgedInvoices(invoices: Invoice[], type: "ACCREC" | "ACCPAY"): AgedInvoicesObserve {
  const open = invoices.filter(
    (inv) => inv.type === type && inv.status === "AUTHORISED" && (inv.amountDue ?? 0) > 0
  );
  const totalOutstanding = open.reduce((sum, inv) => sum + (inv.amountDue ?? 0), 0);
  const sortedByDue = [...open].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  return {
    count: open.length,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    oldestDueDate: sortedByDue[0]?.dueDate ?? null,
    invoices: open.map((inv) => ({
      invoiceId: inv.invoiceId,
      contactName: inv.contactName,
      total: inv.total ?? 0,
      dueDate: inv.dueDate,
    })),
  };
}

function computeContactHistory(contacts: Contact[], invoices: Invoice[]): ContactHistoryObserve {
  const now = new Date().toISOString();
  const byContact = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    if (!inv.contactId) continue;
    const list = byContact.get(inv.contactId) ?? [];
    list.push(inv);
    byContact.set(inv.contactId, list);
  }
  const rows = [...byContact.entries()].map(([contactId, invs]) => {
    const latest = invs.reduce((max, inv) => ((inv.date ?? "") > (max.date ?? "") ? inv : max));
    const name = contacts.find((c) => c.contactId === contactId)?.name ?? latest.contactName ?? "Unknown";
    return {
      contactId,
      name,
      daysSinceLastInvoice: latest.date ? daysBetween(latest.date, now) : Number.POSITIVE_INFINITY,
      invoiceCount: invs.length,
    };
  });
  rows.sort((a, b) => a.daysSinceLastInvoice - b.daysSinceLastInvoice);
  return { contactCount: contacts.length, topByRecency: rows.slice(0, 10) };
}

function computePaymentPatterns(invoices: Invoice[]): PaymentPatternsObserve {
  const paid = invoices.filter((inv) => inv.fullyPaidOn && inv.date);
  if (paid.length === 0) return { paidInvoiceCount: 0, avgDaysSalesOutstanding: null };
  const totalDays = paid.reduce((sum, inv) => sum + daysBetween(inv.date!, inv.fullyPaidOn!), 0);
  return {
    paidInvoiceCount: paid.length,
    avgDaysSalesOutstanding: Math.round((totalDays / paid.length) * 10) / 10,
  };
}

function computePnlTrend(): Promise<PnlTrendObserve> {
  return xero.profitAndLoss(11).then((grid) => {
    const header = getReportHeaderCells(grid);
    const periodLabels = header.slice(1); // first cell is the blank label column
    const toNumbers = (row: string[] | undefined) =>
      (row ?? []).slice(1).map((v) => Number(v.replace(/,/g, "")) || 0);
    return {
      periodLabels,
      totalIncomeByPeriod: toNumbers(findReportRow(grid, "Total Income")),
      netProfitByPeriod: toNumbers(findReportRow(grid, "Net Profit")),
    };
  });
}

export interface ObserveResult {
  bankBalance: BankBalanceObserve;
  agedReceivables: AgedInvoicesObserve;
  agedPayables: AgedInvoicesObserve;
  pnlTrend: PnlTrendObserve;
  contactHistory: ContactHistoryObserve;
  paymentPatterns: PaymentPatternsObserve;
  raw: { invoices: Invoice[]; contacts: Contact[] };
}

export async function runObserve(emit: (event: OodaEvent) => void): Promise<ObserveResult> {
  emit({ type: "step", step: "observe", state: "active" });

  emit({ type: "source", id: "bank-balance", label: "Bank balance", state: "loading" });
  const [accounts, recentTx] = await Promise.all([xero.accounts(), xero.bankTransactions(1)]);
  const bankBalance: BankBalanceObserve = {
    accounts: accounts
      .filter((a) => a.type === "BANK")
      .map((a) => ({ accountId: a.accountId, name: a.name })),
    balanceAvailable: false,
    note: "Live balance unavailable: list-trial-balance/list-report-balance-sheet are not authorized under the current scopes (see NOTES.md §5b). Showing account identity and recent activity only.",
    recentTransactionCount: recentTx.length,
  };
  emit({ type: "source", id: "bank-balance", label: "Bank balance", value: bankBalance, state: "done" });

  const invoices = await xero.invoices();

  emit({ type: "source", id: "aged-receivables", label: "Aged receivables", state: "loading" });
  const agedReceivables = computeAgedInvoices(invoices, "ACCREC");
  emit({ type: "source", id: "aged-receivables", label: "Aged receivables", value: agedReceivables, state: "done" });

  emit({ type: "source", id: "aged-payables", label: "Aged payables", state: "loading" });
  const agedPayables = computeAgedInvoices(invoices, "ACCPAY");
  emit({ type: "source", id: "aged-payables", label: "Aged payables", value: agedPayables, state: "done" });

  emit({ type: "source", id: "pnl-trend", label: "P&L trend (12mo)", state: "loading" });
  const pnlTrend = await computePnlTrend();
  emit({ type: "source", id: "pnl-trend", label: "P&L trend (12mo)", value: pnlTrend, state: "done" });

  emit({ type: "source", id: "contact-history", label: "Contact history", state: "loading" });
  const contacts = await xero.contacts();
  const contactHistory = computeContactHistory(contacts, invoices);
  emit({ type: "source", id: "contact-history", label: "Contact history", value: contactHistory, state: "done" });

  emit({ type: "source", id: "payment-patterns", label: "Payment patterns", state: "loading" });
  const paymentPatterns = computePaymentPatterns(invoices);
  emit({ type: "source", id: "payment-patterns", label: "Payment patterns", value: paymentPatterns, state: "done" });

  emit({ type: "step", step: "observe", state: "done" });

  return {
    bankBalance,
    agedReceivables,
    agedPayables,
    pnlTrend,
    contactHistory,
    paymentPatterns,
    raw: { invoices, contacts },
  };
}
