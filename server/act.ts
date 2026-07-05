import { xero } from "./xero/mcpClient.js";
import type { ProposedAction } from "./events.js";

// Act — real Xero writes, but ONLY draft and ONLY on approval (brief §4.5/§9).
// draft_followup has nothing to write: the brief is explicit that a collection/
// reactivation "email" is just drafted text for a human to copy and send — the
// Xero MCP server never sends email. Only draft_quote touches the real org.
export async function executeAction(action: ProposedAction): Promise<ProposedAction> {
  const actionedAt = new Date().toISOString();

  if (action.kind === "draft_followup") {
    return { ...action, status: "approved", actionedAt };
  }

  if (action.kind === "draft_quote") {
    if (!action.payload) {
      return { ...action, status: "failed", error: "missing quote payload", actionedAt };
    }
    try {
      const xeroResult = await xero.createDraftQuote(action.payload);
      return { ...action, status: "approved", xeroResult, actionedAt };
    } catch (err) {
      return { ...action, status: "failed", error: (err as Error).message, actionedAt };
    }
  }

  return { ...action, status: "failed", error: `unknown action kind: ${action.kind}`, actionedAt };
}
