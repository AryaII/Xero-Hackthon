import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CashFlowChart } from "@/components/CashFlowChart";
import { computeCashFlowForecast } from "@/lib/cashFlowForecast";
import type { AgedInvoicesObserve, BankBalanceObserve, Hypothesis } from "@/lib/types";
import type { SourceState } from "@/hooks/useOodaRun";

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-xero-line text-center text-[12px] text-xero-grey">
      {children}
    </div>
  );
}

function currency(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function InvoiceTable({ data, amountLabel }: { data: AgedInvoicesObserve | undefined; amountLabel: string }) {
  if (!data || data.invoices.length === 0) {
    return <Placeholder>No data yet — run Observe.</Placeholder>;
  }
  const rows = [...data.invoices].sort((a, b) => b.total - a.total).slice(0, 5);
  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="text-left text-xero-grey">
          <th className="pb-2 font-normal">Contact</th>
          <th className="pb-2 font-normal">{amountLabel}</th>
          <th className="pb-2 font-normal">Due date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((inv) => (
          <tr key={inv.invoiceId} className="border-t border-xero-line">
            <td className="py-2 text-xero-ink">{inv.contactName ?? "Unknown"}</td>
            <td className="py-2 font-mono text-xero-ink">{currency(inv.total)}</td>
            <td className="py-2 text-xero-grey">{inv.dueDate?.slice(0, 10) ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OpportunitiesTable({ hypotheses }: { hypotheses: Hypothesis[] }) {
  if (hypotheses.length === 0) {
    return <Placeholder>No hypotheses yet — run Observe → Orient.</Placeholder>;
  }
  const sorted = [...hypotheses].sort((a, b) => (b.impactGBP ?? 0) - (a.impactGBP ?? 0));
  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="text-left text-xero-grey">
          <th className="pb-2 font-normal">Hypothesis</th>
          <th className="pb-2 font-normal">Impact</th>
          <th className="pb-2 font-normal">Confidence</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((h) => (
          <tr key={h.id} className="border-t border-xero-line">
            <td className="py-2 text-xero-ink">{h.label}</td>
            <td className="py-2 font-mono text-xero-ink">{h.impactGBP !== null ? currency(h.impactGBP) : "—"}</td>
            <td className="py-2">
              <Badge tone={h.confidence >= 0.6 ? "risk" : h.confidence >= 0.35 ? "warn" : "info"}>
                {Math.round(h.confidence * 100)}%
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DashboardTab({
  sources,
  hypotheses,
}: {
  sources: Record<string, SourceState>;
  hypotheses: Hypothesis[];
}) {
  const agedReceivables = sources["aged-receivables"]?.value as AgedInvoicesObserve | undefined;
  const agedPayables = sources["aged-payables"]?.value as AgedInvoicesObserve | undefined;
  const bankBalance = sources["bank-balance"]?.value as BankBalanceObserve | undefined;
  const hasScheduleData = (agedReceivables?.invoices.length ?? 0) > 0 || (agedPayables?.invoices.length ?? 0) > 0;
  const hasRealBalance = bankBalance?.balanceAvailable === true;
  const forecast = computeCashFlowForecast(
    agedReceivables,
    agedPayables,
    hasRealBalance ? bankBalance.totalBalance : 0
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{hasRealBalance ? "Cash flow — next 90 days" : "Net cash movement — next 90 days"}</CardTitle>
        </CardHeader>
        <p className="mb-2 text-[11px] text-xero-grey">
          {hasRealBalance
            ? "Real starting balance plus scheduled receivables and payables, projected forward. Safety threshold set at £4,000."
            : "Relative movement from real scheduled receivables and payables — not an absolute cash balance (bank balance unavailable this run; see NOTES.md §5b)."}
        </p>
        {hasScheduleData ? (
          <CashFlowChart data={forecast} safetyThreshold={hasRealBalance ? 4000 : undefined} />
        ) : (
          <Placeholder>No data yet — run Observe.</Placeholder>
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Opportunities &amp; risks (by impact)</CardTitle>
        </CardHeader>
        <OpportunitiesTable hypotheses={hypotheses} />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top receivables risk</CardTitle>
          </CardHeader>
          <InvoiceTable data={agedReceivables} amountLabel="Amount" />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top payables optimization</CardTitle>
          </CardHeader>
          <InvoiceTable data={agedPayables} amountLabel="Amount" />
        </Card>
      </div>
    </div>
  );
}
