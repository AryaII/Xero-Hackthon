import type { Hypothesis, OodaEvent, ProposedAction } from "./events.js";

// Deterministic mapping, no LLM — every write stays a DRAFT and needs_approval
// per the brief's safety guardrails (§4.4/§9).
function toAction(hypothesis: Hypothesis): ProposedAction {
  if (hypothesis.kind === "dormant_customer" && hypothesis.subjectContactId) {
    const contactLabel = hypothesis.label.replace("Customer ", "").replace(" dormant", "");
    // Simple heuristic: a welcome-back credit worth 10% of their lifetime
    // revenue with us, floored at £1 (Xero quotes need a positive line amount).
    const offerValue = Math.max(1, Math.round((hypothesis.impactGBP ?? 10) * 0.1));
    return {
      id: `action-${hypothesis.id}`,
      hypothesisId: hypothesis.id,
      title: `Draft reactivation quote for ${contactLabel}`,
      reason: hypothesis.detail,
      kind: "draft_quote",
      permission: "needs_approval",
      status: "proposed",
      payload: {
        contactId: hypothesis.subjectContactId,
        lineItems: [
          {
            description: `Welcome back — loyalty credit (10% of lifetime spend)`,
            quantity: 1,
            unitAmount: offerValue,
            accountCode: "200", // Sales — see NOTES.md (list-accounts fixture)
            taxType: "OUTPUT2", // matches the Sales account's configured tax type
          },
        ],
        reference: `Reactivation offer — ${contactLabel}`,
        title: "Welcome back offer",
        summary: hypothesis.detail,
      },
    };
  }
  return {
    id: `action-${hypothesis.id}`,
    hypothesisId: hypothesis.id,
    title: `Draft follow-up: ${hypothesis.label}`,
    reason: hypothesis.detail,
    kind: "draft_followup",
    permission: "needs_approval",
    status: "proposed",
  };
}

export async function runDecide(
  hypotheses: Hypothesis[],
  emit: (event: OodaEvent) => void
): Promise<ProposedAction[]> {
  emit({ type: "step", step: "decide", state: "active" });
  const actions = hypotheses.map(toAction);
  for (const action of actions) emit({ type: "action", action });
  emit({ type: "step", step: "decide", state: "done" });
  return actions;
}
