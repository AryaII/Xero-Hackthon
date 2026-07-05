import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, RefreshCw, XCircle, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Hypothesis, ProposedAction } from "@/lib/types";

function currency(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function impactFor(hypotheses: Hypothesis[], hypothesisId: string): number {
  return hypotheses.find((h) => h.id === hypothesisId)?.impactGBP ?? 0;
}

export function LearnSummary({ hypotheses, actions }: { hypotheses: Hypothesis[]; actions: ProposedAction[] }) {
  const resolved = actions.filter((a) => a.status !== "proposed");
  if (actions.length === 0) return null;

  const cashRiskDefended = actions
    .filter((a) => a.kind === "draft_followup" && a.status === "approved")
    .reduce((sum, a) => sum + impactFor(hypotheses, a.hypothesisId), 0);

  const revenueIdentified = actions
    .filter((a) => a.kind === "draft_quote" && a.status === "approved")
    .reduce((sum, a) => sum + impactFor(hypotheses, a.hypothesisId), 0);

  const approvalsNeeded = actions.filter((a) => a.status === "proposed").length;

  const quoteCount = actions.filter((a) => a.kind === "draft_quote" && a.status === "approved").length;
  const followupCount = actions.filter((a) => a.kind === "draft_followup" && a.status === "approved").length;
  const rejectedCount = actions.filter((a) => a.status === "rejected").length;

  const memoryNote =
    resolved.length === 0
      ? "Memory: no actions resolved yet — approve or reject items in the Decide column or Actions Timeline."
      : `Memory updated: ${quoteCount} real draft quote(s) created in Xero, ${followupCount} follow-up(s) drafted, ${rejectedCount} rejected this session. ${approvalsNeeded} still awaiting approval.`;

  const log = [...resolved].sort((a, b) => (b.actionedAt ?? "").localeCompare(a.actionedAt ?? ""));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Zap size={16} className="text-xero-navy" />
          <h3 className="text-[15px] font-semibold text-xero-ink">Act &amp; Learn — summary</h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-xero-bg p-3">
            <span className="text-[11px] text-xero-grey">Cash risk defended</span>
            <div className="font-mono text-[22px] font-medium text-ok">{currency(cashRiskDefended)}</div>
          </div>
          <div className="rounded-md bg-xero-bg p-3">
            <span className="text-[11px] text-xero-grey">Revenue identified</span>
            <div className="font-mono text-[22px] font-medium text-xero-navy">{currency(revenueIdentified)}</div>
          </div>
          <div className="rounded-md bg-xero-bg p-3">
            <span className="text-[11px] text-xero-grey">Human approvals needed</span>
            <div className="font-mono text-[22px] font-medium text-warn">{approvalsNeeded}</div>
          </div>
        </div>

        {log.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {log.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-xero-grey">
                    {a.actionedAt ? new Date(a.actionedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                  </span>
                  {a.status === "approved" && <CheckCircle2 size={13} className="text-ok" />}
                  {a.status === "rejected" && <XCircle size={13} className="text-risk" />}
                  {a.status === "failed" && <XCircle size={13} className="text-risk" />}
                  <span className="text-xero-ink">{a.title}</span>
                </span>
                {a.xeroResult?.deepLink && (
                  <a
                    href={a.xeroResult.deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-[11px] text-xero-navy hover:underline"
                  >
                    <ExternalLink size={11} />
                    View in Xero
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 flex items-center gap-1.5 text-[11px] italic text-xero-grey">
          <RefreshCw size={11} />
          {memoryNote}
        </p>
      </Card>
    </motion.div>
  );
}
