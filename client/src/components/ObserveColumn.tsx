import { Landmark, FileText, Receipt, TrendingUp, Users, Clock, Loader2, CheckCircle2, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SourceState } from "@/hooks/useOodaRun";
import type {
  AgedInvoicesObserve,
  BankBalanceObserve,
  ContactHistoryObserve,
  PaymentPatternsObserve,
  PnlTrendObserve,
} from "@/lib/types";

function currency(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function currencyCompact(n: number): string {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(0)}k`;
  return currency(n);
}

const ROWS: {
  id: string;
  label: string;
  icon: typeof Landmark;
  format: (value: unknown) => string;
}[] = [
  {
    id: "bank-balance",
    label: "Bank balance",
    icon: Landmark,
    format: (v) => {
      const val = v as BankBalanceObserve;
      return `${val.accounts.length} accounts · balance unavailable`;
    },
  },
  {
    id: "aged-receivables",
    label: "Aged receivables",
    icon: FileText,
    format: (v) => {
      const val = v as AgedInvoicesObserve;
      return `${val.count} invoices · ${currency(val.totalOutstanding)}`;
    },
  },
  {
    id: "aged-payables",
    label: "Aged payables",
    icon: Receipt,
    format: (v) => {
      const val = v as AgedInvoicesObserve;
      return `${val.count} bills · ${currency(val.totalOutstanding)}`;
    },
  },
  {
    id: "pnl-trend",
    label: "P&L trend (12mo)",
    icon: TrendingUp,
    format: (v) => {
      const val = v as PnlTrendObserve;
      const total = val.totalIncomeByPeriod.reduce((a, b) => a + b, 0);
      return `${currencyCompact(total)} revenue`;
    },
  },
  {
    id: "contact-history",
    label: "Contact history",
    icon: Users,
    format: (v) => {
      const val = v as ContactHistoryObserve;
      return `${val.contactCount} contacts`;
    },
  },
  {
    id: "payment-patterns",
    label: "Payment patterns",
    icon: Clock,
    format: (v) => {
      const val = v as PaymentPatternsObserve;
      return val.avgDaysSalesOutstanding !== null ? `${val.avgDaysSalesOutstanding}d avg DSO` : "no paid invoices yet";
    },
  },
];

export function ObserveColumn({ sources, stepState }: { sources: Record<string, SourceState>; stepState: "idle" | "active" | "done" }) {
  const doneCount = ROWS.filter((r) => sources[r.id]?.state === "done").length;

  return (
    <Card className="min-h-[480px]">
      <CardHeader>
        <CardTitle>
          <Eye size={16} className="text-xero-navy" />
          Observe
        </CardTitle>
        {stepState === "idle" && <Badge tone="neutral">idle</Badge>}
        {stepState === "active" && <Badge tone="info">running</Badge>}
        {stepState === "done" && <Badge tone="ok">done · {doneCount} sources</Badge>}
      </CardHeader>
      <p className="mb-4 text-[12px] text-xero-grey">Pulling Xero data in parallel</p>
      <ul className="flex flex-col gap-3">
        {ROWS.map(({ id, label, icon: Icon, format }) => {
          const source = sources[id];
          return (
            <li key={id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="flex items-center gap-2 text-xero-ink">
                <Icon size={15} className="text-xero-grey" />
                {label}
              </span>
              {!source && <span className="text-xero-grey">—</span>}
              {source?.state === "loading" && <Loader2 size={14} className="animate-spin text-xero-navy" />}
              {source?.state === "done" && (
                <span className="flex items-center gap-1.5 font-mono text-[12px] text-xero-ink">
                  {format(source.value)}
                  <CheckCircle2 size={13} className="text-ok" />
                </span>
              )}
              {source?.state === "error" && <span className="text-[12px] text-risk">error</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
