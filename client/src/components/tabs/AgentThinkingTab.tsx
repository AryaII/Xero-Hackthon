import { OodaStepper } from "@/components/OodaStepper";
import { ObserveColumn } from "@/components/ObserveColumn";
import { OrientColumn } from "@/components/OrientColumn";
import { DecideColumn } from "@/components/DecideColumn";
import { LearnSummary } from "@/components/LearnSummary";
import type { useOodaRun } from "@/hooks/useOodaRun";
import type { StepState } from "@/hooks/useOodaRun";

export function AgentThinkingTab({ ooda }: { ooda: ReturnType<typeof useOodaRun> }) {
  const { steps, sources, hypotheses, actions, approvingIds, running, restart, approve, reject } = ooda;

  // Act/Learn aren't SSE-driven steps — approval happens whenever a human
  // clicks, not on a fixed timeline — so their stepper state is derived live
  // from the real approval-queue state instead.
  const anyResolved = actions.some((a) => a.status !== "proposed");
  const allResolved = actions.length > 0 && actions.every((a) => a.status !== "proposed");
  const actState: StepState = actions.length === 0 ? "idle" : allResolved ? "done" : "active";
  const learnState: StepState = anyResolved ? (allResolved ? "done" : "active") : "idle";
  const displaySteps = { ...steps, act: actState, learn: learnState };

  return (
    <div className="flex flex-col gap-4">
      <OodaStepper steps={displaySteps} running={running} onRestart={restart} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ObserveColumn sources={sources} stepState={steps.observe} />
        <OrientColumn hypotheses={hypotheses} stepState={steps.orient} />
        <DecideColumn
          actions={actions}
          stepState={steps.decide}
          approvingIds={approvingIds}
          onApprove={approve}
          onReject={reject}
        />
      </div>
      <LearnSummary hypotheses={hypotheses} actions={actions} />
    </div>
  );
}
