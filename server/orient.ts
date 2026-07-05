import type { Contact, Invoice } from "./xero/types.js";
import type { Hypothesis, OodaEvent } from "./events.js";
import { daysBetween } from "./dateUtils.js";

function currency(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

interface ContactStats {
  contactId: string;
  name: string;
  invoiceCount: number;
  totalRevenue: number;
  avgIntervalDays: number | null;
  daysSinceLastInvoice: number;
}

function computeContactStats(invoices: Invoice[], contacts: Contact[]): ContactStats[] {
  const now = new Date().toISOString();
  const byContact = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    if (!inv.contactId || inv.type !== "ACCREC" || !inv.date) continue;
    const list = byContact.get(inv.contactId) ?? [];
    list.push(inv);
    byContact.set(inv.contactId, list);
  }

  const stats: ContactStats[] = [];
  for (const [contactId, invs] of byContact) {
    const sorted = [...invs].sort((a, b) => a.date!.localeCompare(b.date!));
    const totalRevenue = sorted.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
    let avgIntervalDays: number | null = null;
    if (sorted.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].date!, sorted[i].date!));
      avgIntervalDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    }
    const lastDate = sorted[sorted.length - 1].date!;
    const name = contacts.find((c) => c.contactId === contactId)?.name ?? sorted[0].contactName ?? "Unknown";
    stats.push({
      contactId,
      name,
      invoiceCount: sorted.length,
      totalRevenue,
      avgIntervalDays,
      daysSinceLastInvoice: daysBetween(lastDate, now),
    });
  }
  return stats;
}

// Dormant high-value customer: top-15%-by-revenue contact whose silence has run
// past 2x their own historical ordering rhythm. See build brief §4.3.
function detectDormantCustomers(stats: ContactStats[]): Hypothesis[] {
  const eligible = stats.filter((s) => s.avgIntervalDays !== null && s.avgIntervalDays > 0);
  if (eligible.length === 0) return [];

  const byRevenueDesc = [...eligible].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const top15Count = Math.max(1, Math.ceil(byRevenueDesc.length * 0.15));
  const topRevenueIds = new Set(byRevenueDesc.slice(0, top15Count).map((s) => s.contactId));

  const flagged = eligible.filter(
    (s) => topRevenueIds.has(s.contactId) && s.daysSinceLastInvoice > 2 * s.avgIntervalDays!
  );
  flagged.sort(
    (a, b) => b.daysSinceLastInvoice / b.avgIntervalDays! - a.daysSinceLastInvoice / a.avgIntervalDays!
  );

  return flagged.slice(0, 3).map((s) => {
    const overshootRatio = s.daysSinceLastInvoice / s.avgIntervalDays!;
    const revenuePosition = byRevenueDesc.findIndex((x) => x.contactId === s.contactId) + 1;
    const revenuePercentileTop = revenuePosition / byRevenueDesc.length;

    const overshootStrength = Math.min(1, (overshootRatio - 2) / 2); // 0 at the 2x threshold, 1 at 4x+
    const revenueRank = 1 - revenuePercentileTop; // 1 = highest-revenue contact
    const dataCompleteness = Math.min(1, s.invoiceCount / 5);
    const confidence =
      Math.round(Math.min(0.95, 0.5 * overshootStrength + 0.3 * revenueRank + 0.2 * dataCompleteness) * 100) / 100;

    return {
      id: `dormant-${s.contactId}`,
      kind: "dormant_customer",
      subjectContactId: s.contactId,
      label: `Customer ${s.name} dormant`,
      detail: `Top ${Math.max(1, Math.round(revenuePercentileTop * 100))}% customer by revenue (${currency(s.totalRevenue)} total), average order every ${Math.round(s.avgIntervalDays!)} days, now ${s.daysSinceLastInvoice} days silent — ${overshootRatio.toFixed(1)}x their usual interval.`,
      impactGBP: Math.round(s.totalRevenue),
      confidence,
      relatedIds: [],
      evidence: [
        { source: "list-invoices", value: `${s.invoiceCount} invoices, ${currency(s.totalRevenue)} lifetime revenue` },
        { source: "computed", value: `avg interval ${Math.round(s.avgIntervalDays!)}d, last invoice ${s.daysSinceLastInvoice}d ago` },
      ],
      confidenceFormula: {
        formula: "confidence = 0.5×overshoot_strength + 0.3×revenue_rank + 0.2×data_completeness",
        inputs: {
          overshoot_strength: Math.round(overshootStrength * 100) / 100,
          revenue_rank: Math.round(revenueRank * 100) / 100,
          data_completeness: Math.round(dataCompleteness * 100) / 100,
        },
        weights: { overshoot_strength: 0.5, revenue_rank: 0.3, data_completeness: 0.2 },
      },
    };
  });
}

// Late-payment risk: for each open receivable, project a pay date from that
// contact's own historical payment lag (fallback to the org-wide average when
// the contact has no paid-invoice history) and flag it past the due date.
function detectLatePaymentRisk(invoices: Invoice[]): Hypothesis[] {
  const paidByContact = new Map<string, number[]>();
  const allLags: number[] = [];
  for (const inv of invoices) {
    if (!inv.date || !inv.fullyPaidOn) continue;
    const lag = daysBetween(inv.date, inv.fullyPaidOn);
    allLags.push(lag);
    if (!inv.contactId) continue;
    const list = paidByContact.get(inv.contactId) ?? [];
    list.push(lag);
    paidByContact.set(inv.contactId, list);
  }
  const orgAvgLag = allLags.length > 0 ? allLags.reduce((a, b) => a + b, 0) / allLags.length : null;

  const open = invoices.filter(
    (inv) => inv.type === "ACCREC" && inv.status === "AUTHORISED" && (inv.amountDue ?? 0) > 0 && inv.date && inv.dueDate
  );

  const flagged: {
    inv: Invoice;
    historicalLag: number;
    usedFallback: boolean;
    contactPaidCount: number;
    daysToDue: number;
    lateByDays: number;
  }[] = [];

  for (const inv of open) {
    const contactLags = inv.contactId ? paidByContact.get(inv.contactId) : undefined;
    const usedFallback = !contactLags || contactLags.length === 0;
    const historicalLag = usedFallback
      ? orgAvgLag
      : contactLags!.reduce((a, b) => a + b, 0) / contactLags!.length;
    if (historicalLag === null) continue; // no data anywhere to project from

    const daysToDue = daysBetween(inv.date!, inv.dueDate!);
    const lateByDays = Math.round(historicalLag - daysToDue);
    if (lateByDays > 0) {
      flagged.push({ inv, historicalLag, usedFallback, contactPaidCount: contactLags?.length ?? 0, daysToDue, lateByDays });
    }
  }

  flagged.sort((a, b) => (b.inv.amountDue ?? 0) - (a.inv.amountDue ?? 0));

  return flagged.slice(0, 3).map(({ inv, historicalLag, usedFallback, contactPaidCount, lateByDays }) => {
    const latenessStrength = Math.min(1, lateByDays / 14);
    const dataCompleteness = usedFallback ? 0.5 : Math.min(1, contactPaidCount / 3);
    const confidence = Math.round(Math.min(0.95, 0.6 * latenessStrength + 0.4 * dataCompleteness) * 100) / 100;

    return {
      id: `late-payment-${inv.invoiceId}`,
      kind: "late_payment_risk",
      label: `${inv.contactName ?? "Unknown contact"} predicted to pay late`,
      detail: `Invoice ${inv.invoiceNumber ?? inv.invoiceId.slice(0, 8)} for ${currency(inv.amountDue ?? 0)} is due ${inv.dueDate?.slice(0, 10)}. Based on ${usedFallback ? "the org-wide average payment lag (no history for this contact)" : `this contact's ${contactPaidCount} prior paid invoices`}, predicted payment is ${lateByDays} day(s) after the due date.`,
      impactGBP: Math.round(inv.amountDue ?? 0),
      confidence,
      relatedIds: [],
      evidence: [
        { source: "list-invoices", value: `due ${inv.dueDate?.slice(0, 10)}, ${currency(inv.amountDue ?? 0)} outstanding` },
        {
          source: "computed",
          value: usedFallback
            ? `org-wide avg payment lag ${Math.round(historicalLag)}d`
            : `${contactPaidCount} prior paid invoices, avg lag ${Math.round(historicalLag)}d`,
        },
      ],
      confidenceFormula: {
        formula: "confidence = 0.6×lateness_strength + 0.4×data_completeness",
        inputs: {
          lateness_strength: Math.round(latenessStrength * 100) / 100,
          data_completeness: Math.round(dataCompleteness * 100) / 100,
        },
        weights: { lateness_strength: 0.6, data_completeness: 0.4 },
      },
    };
  });
}

export async function runOrient(
  raw: { invoices: Invoice[]; contacts: Contact[] },
  emit: (event: OodaEvent) => void
): Promise<Hypothesis[]> {
  emit({ type: "step", step: "orient", state: "active" });

  const stats = computeContactStats(raw.invoices, raw.contacts);
  const dormant = detectDormantCustomers(stats);
  const latePayment = detectLatePaymentRisk(raw.invoices);
  const hypotheses = [...dormant, ...latePayment];

  for (const hypothesis of hypotheses) {
    emit({ type: "hypothesis", hypothesis });
  }
  if (hypotheses.length === 0) {
    emit({
      type: "toast",
      tone: "info",
      text: "No dormant-customer or late-payment signals found in this data — honest empty state, not a bug.",
    });
  }

  emit({ type: "step", step: "orient", state: "done" });
  return hypotheses;
}
