import { motion } from "framer-motion";
import { ExternalLink, Loader2, Target, UserCheck } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProposedAction } from "@/lib/types";

const STATUS_TONE = {
  proposed: "warn",
  approved: "ok",
  rejected: "risk",
  failed: "risk",
} as const;

export function DecideColumn({
  actions,
  stepState,
  approvingIds,
  onApprove,
  onReject,
}: {
  actions: ProposedAction[];
  stepState: "idle" | "active" | "done";
  approvingIds: Set<string>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <Card className="min-h-[480px]">
      <CardHeader>
        <CardTitle>
          <Target size={16} className="text-xero-navy" />
          Decide
        </CardTitle>
        {stepState === "idle" && <Badge tone="neutral">idle</Badge>}
        {stepState === "active" && <Badge tone="info">planning</Badge>}
        {stepState === "done" && <Badge tone="ok">done · {actions.length} actions</Badge>}
      </CardHeader>
      <p className="mb-4 text-[12px] text-xero-grey">Planning ordered action set</p>

      {stepState === "done" && actions.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-xero-line text-center text-[12px] text-xero-grey">
          No hypotheses to act on yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actions.map((a, i) => {
            const isApproving = approvingIds.has(a.id);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-md border border-xero-line p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-xero-ink">
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-xero-bg text-[10px] text-xero-grey">
                      {i + 1}
                    </span>
                    {a.title}
                  </span>
                  <Badge tone={STATUS_TONE[a.status]}>{a.status === "proposed" ? "needs approval" : a.status}</Badge>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-xero-grey">{a.reason}</p>

                {a.xeroResult?.deepLink && (
                  <a
                    href={a.xeroResult.deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-xero-navy hover:underline"
                  >
                    <ExternalLink size={11} />
                    View in Xero
                  </a>
                )}
                {a.status === "failed" && a.error && (
                  <p className="mt-2 text-[11px] text-risk">Write failed: {a.error}</p>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-warn">
                    <UserCheck size={12} />
                    Needs approval
                  </span>
                  {a.status === "proposed" && (
                    <div className="flex gap-2">
                      <Button variant="secondary" disabled={isApproving} onClick={() => onReject(a.id)}>
                        Reject
                      </Button>
                      <Button variant="primary" disabled={isApproving} onClick={() => onApprove(a.id)}>
                        {isApproving ? <Loader2 size={13} className="animate-spin" /> : "Approve"}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
