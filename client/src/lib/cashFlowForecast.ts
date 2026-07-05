import type { AgedInvoicesObserve } from "./types";

export interface CashFlowPoint {
  day: number;
  dateLabel: string;
  inflow: number;
  outflow: number;
  cashPosition: number;
}

// Real data only: buckets each open receivable/payable by its due date's
// offset from today (overdue items collapse into day 0 — they're already
// due) and walks a 90-day cumulative projection. When a real starting balance
// is available (see NOTES.md §5b — this needed the right XERO_SCOPES, not a
// missing Xero permission), `cashPosition` is an absolute forecast; otherwise
// it's relative movement from zero.
export function computeCashFlowForecast(
  receivables: AgedInvoicesObserve | undefined,
  payables: AgedInvoicesObserve | undefined,
  startingBalance = 0
): CashFlowPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inflowByDay = new Map<number, number>();
  const outflowByDay = new Map<number, number>();

  const bucket = (invoices: AgedInvoicesObserve["invoices"] | undefined, map: Map<number, number>) => {
    for (const inv of invoices ?? []) {
      if (!inv.dueDate) continue;
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const dayOffset = Math.round((due.getTime() - today.getTime()) / 86_400_000);
      const clamped = Math.max(0, Math.min(90, dayOffset)); // overdue -> day 0, beyond 90d -> day 90
      map.set(clamped, (map.get(clamped) ?? 0) + inv.total);
    }
  };
  bucket(receivables?.invoices, inflowByDay);
  bucket(payables?.invoices, outflowByDay);

  const points: CashFlowPoint[] = [];
  let cashPosition = startingBalance;
  for (let day = 0; day <= 90; day++) {
    const inflow = inflowByDay.get(day) ?? 0;
    const outflow = outflowByDay.get(day) ?? 0;
    cashPosition += inflow - outflow;
    const date = new Date(today.getTime() + day * 86_400_000);
    points.push({
      day,
      dateLabel: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      inflow,
      outflow,
      cashPosition: Math.round(cashPosition * 100) / 100,
    });
  }
  return points;
}
