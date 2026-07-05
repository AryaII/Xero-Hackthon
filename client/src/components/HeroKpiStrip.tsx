import { Line, LineChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { computeCashHealthScore } from "@/lib/cashHealthScore";
import type { AgedInvoicesObserve, BankBalanceObserve, Hypothesis, PaymentPatternsObserve } from "@/lib/types";
import type { SourceState } from "@/hooks/useOodaRun";

type Tone = "ok" | "warn" | "risk" | "info" | "neutral";

const toneText: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  risk: "text-risk",
  info: "text-xero-navy",
  neutral: "text-xero-grey",
};

function KpiCard({
  label,
  value,
  note,
  tone,
  trend,
  series,
}: {
  label: string;
  value: string;
  note?: string;
  tone: Tone;
  trend?: { direction: "up" | "down"; text: string };
  series?: number[];
}) {
  const content = (
    <Card className="flex flex-col gap-2">
      <span className="text-[13px] text-xero-grey">{label}</span>
      <span className="font-[500] text-[28px] leading-none text-xero-ink">{value}</span>
      <div className="flex items-center justify-between">
        {trend ? (
          <span className={cn("flex items-center gap-1 text-[12px]", toneText[tone])}>
            {trend.direction === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend.text}
          </span>
        ) : (
          <span className="text-[12px] text-xero-grey">{note}</span>
        )}
      </div>
      {series && series.length > 1 && (
        <div className="h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.map((v, i) => ({ i, v }))}>
              <Line type="monotone" dataKey="v" stroke="currentColor" className={toneText[tone]} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
  return note && !trend ? <Tooltip label={note}>{content}</Tooltip> : content;
}

function currency(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

export function HeroKpiStrip({
  sources,
  hypotheses,
}: {
  sources: Record<string, SourceState>;
  hypotheses: Hypothesis[];
}) {
  const bankBalance = sources["bank-balance"]?.value as BankBalanceObserve | undefined;
  const agedReceivables = sources["aged-receivables"]?.value as AgedInvoicesObserve | undefined;
  const agedPayables = sources["aged-payables"]?.value as AgedInvoicesObserve | undefined;
  const paymentPatterns = sources["payment-patterns"]?.value as PaymentPatternsObserve | undefined;
  const health = computeCashHealthScore(paymentPatterns, agedReceivables, agedPayables, hypotheses);

  return (
    <div className="mx-auto mt-6 grid max-w-[1280px] grid-cols-1 gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Available cash"
        value={bankBalance ? "Unavailable" : "—"}
        note={bankBalance?.note ?? "Waiting for Observe…"}
        tone="neutral"
      />
      <KpiCard
        label="Cash health score"
        value={health ? `${health.score} / 100` : "—"}
        note={
          health
            ? `DSO ${Math.round(health.dsoScore * 100)}% · coverage ${Math.round(health.coverageScore * 100)}% · risk ${Math.round(health.riskScore * 100)}%`
            : "Waiting for Observe…"
        }
        tone={health ? (health.score >= 70 ? "ok" : health.score >= 40 ? "warn" : "risk") : "neutral"}
      />
      <KpiCard
        label="Revenue at risk"
        value={agedReceivables ? currency(agedReceivables.totalOutstanding) : "—"}
        note={agedReceivables ? `${agedReceivables.count} overdue invoices` : "Waiting for Observe…"}
        tone="risk"
      />
      <KpiCard
        label="Opportunities identified"
        value={String(hypotheses.length)}
        note={hypotheses.length > 0 ? "From dormant-customer + late-payment detectors" : "None found in this data yet"}
        tone={hypotheses.length > 0 ? "info" : "neutral"}
      />
    </div>
  );
}
