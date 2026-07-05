import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashFlowPoint } from "@/lib/cashFlowForecast";

function currency(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function compactCurrency(n: number): string {
  if (Math.abs(n) >= 1000) return `${n < 0 ? "-" : ""}£${(Math.abs(n) / 1000).toFixed(0)}k`;
  return currency(n);
}

function CashFlowTooltip({ active, payload }: { active?: boolean; payload?: { payload: CashFlowPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-xero-line bg-white p-2 text-[11px] shadow-md">
      <div className="font-medium text-xero-ink">{p.dateLabel}</div>
      <div className="text-xero-grey">In: {currency(p.inflow)}</div>
      <div className="text-xero-grey">Out: {currency(p.outflow)}</div>
      <div className="font-mono text-xero-ink">Cash position: {currency(p.cashPosition)}</div>
    </div>
  );
}

export function CashFlowChart({
  data,
  safetyThreshold,
}: {
  data: CashFlowPoint[];
  /** Absolute £ threshold to draw as a reference line — omit for relative-movement mode. */
  safetyThreshold?: number;
}) {
  const tickIndices = [0, 15, 30, 45, 60, 75, 90];
  const referenceY = safetyThreshold ?? 0;
  const referenceLabel = safetyThreshold !== undefined ? "Safety threshold" : "Break-even";

  return (
    <div
      className="h-80"
      aria-label={
        safetyThreshold !== undefined
          ? "Projected cash position over the next 90 days, from a real starting balance plus scheduled receivables and payables"
          : "Cumulative net cash movement over the next 90 days, from real scheduled receivables and payables"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E1E5E9" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            ticks={tickIndices.map((i) => data[i]?.dateLabel).filter(Boolean)}
            tick={{ fontSize: 11, fill: "#7A7E85" }}
            axisLine={{ stroke: "#E1E5E9" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={compactCurrency}
            tick={{ fontSize: 11, fill: "#7A7E85" }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CashFlowTooltip />} />
          <ReferenceLine
            y={referenceY}
            stroke="#D64545"
            strokeDasharray="4 4"
            label={{ value: referenceLabel, fontSize: 11, fill: "#D64545", position: "insideBottomRight" }}
          />
          <Line type="monotone" dataKey="cashPosition" stroke="#13B5EA" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
