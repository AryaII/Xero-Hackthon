import { ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProposedAction } from "@/lib/types";

const STATUS_TONE = {
  proposed: "warn",
  approved: "ok",
  rejected: "risk",
  failed: "risk",
} as const;

export function ActionsTimelineTab({
  actions,
  approvingIds,
  onApprove,
  onReject,
}: {
  actions: ProposedAction[];
  approvingIds: Set<string>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (actions.length === 0) {
    return (
      <Card>
        <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-xero-line text-center text-[12px] text-xero-grey">
          The approval queue populates once Decide proposes actions — run the loop from the
          Agent Thinking tab.
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {actions.map((a) => {
        const isApproving = approvingIds.has(a.id);
        return (
          <Card key={a.id} className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-xero-ink">{a.title}</span>
                <Badge tone={STATUS_TONE[a.status]}>{a.status === "proposed" ? "needs approval" : a.status}</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-[12px] text-xero-grey">{a.reason}</p>
              {a.xeroResult?.deepLink && (
                <a
                  href={a.xeroResult.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-xero-navy hover:underline"
                >
                  <ExternalLink size={11} />
                  View in Xero
                </a>
              )}
              {a.status === "failed" && a.error && (
                <p className="mt-1 text-[11px] text-risk">Write failed: {a.error}</p>
              )}
            </div>
            {a.status === "proposed" && (
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" disabled={isApproving} onClick={() => onReject(a.id)}>
                  Reject
                </Button>
                <Button variant="primary" disabled={isApproving} onClick={() => onApprove(a.id)}>
                  {isApproving ? <Loader2 size={13} className="animate-spin" /> : "Approve"}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
