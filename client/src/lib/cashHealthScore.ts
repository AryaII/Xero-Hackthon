import type { AgedInvoicesObserve, Hypothesis, PaymentPatternsObserve } from "./types";

export interface CashHealthScore {
  score: number; // 0..100
  dsoScore: number;
  coverageScore: number;
  riskScore: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Transparent, deterministic formula (same style as the Orient confidence
// formulas — no LLM, no fabricated inputs). Three real signals:
//  - dsoScore: actual avg days-sales-outstanding vs. a 30-day (Net 30) benchmark
//  - coverageScore: real aged-receivables total vs. real aged-payables total
//  - riskScore: real late-payment-risk hypothesis impact as a fraction of
//    receivables outstanding
export function computeCashHealthScore(
  paymentPatterns: PaymentPatternsObserve | undefined,
  agedReceivables: AgedInvoicesObserve | undefined,
  agedPayables: AgedInvoicesObserve | undefined,
  hypotheses: Hypothesis[]
): CashHealthScore | null {
  if (!paymentPatterns || paymentPatterns.avgDaysSalesOutstanding === null || !agedReceivables || !agedPayables) {
    return null;
  }

  const dsoScore = clamp01(1 - paymentPatterns.avgDaysSalesOutstanding / 30);

  const receivablesTotal = agedReceivables.totalOutstanding;
  const payablesTotal = agedPayables.totalOutstanding;
  const coverageScore = payablesTotal === 0 ? 1 : clamp01(receivablesTotal / (2 * payablesTotal));

  const lateRiskImpact = hypotheses
    .filter((h) => h.kind === "late_payment_risk")
    .reduce((sum, h) => sum + (h.impactGBP ?? 0), 0);
  const riskScore = receivablesTotal === 0 ? 1 : clamp01(1 - lateRiskImpact / receivablesTotal);

  const score = Math.round(100 * (0.35 * dsoScore + 0.35 * coverageScore + 0.3 * riskScore));

  return { score, dsoScore, coverageScore, riskScore };
}
