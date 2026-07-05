import { useCallback, useEffect, useRef, useState } from "react";
import { approveAction, rejectAction, startRun, streamUrl } from "@/lib/api";
import type { Hypothesis, OodaEvent, OodaStep, ProposedAction } from "@/lib/types";

export type StepState = "idle" | "active" | "done";

export interface SourceState {
  id: string;
  label: string;
  state: "loading" | "done" | "error";
  value?: unknown;
  error?: string;
}

const STEP_ORDER: OodaStep[] = ["observe", "orient", "decide", "act", "learn"];

export function useOodaRun() {
  const [steps, setSteps] = useState<Record<OodaStep, StepState>>({
    observe: "idle",
    orient: "idle",
    decide: "idle",
    act: "idle",
    learn: "idle",
  });
  const [sources, setSources] = useState<Record<string, SourceState>>({});
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const [toasts, setToasts] = useState<{ id: number; tone: "info" | "warn"; text: string }[]>([]);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const toastIdRef = useRef(0);

  const applyEvent = useCallback((event: OodaEvent) => {
    if (event.type === "step") {
      setSteps((prev) => ({ ...prev, [event.step]: event.state }));
    } else if (event.type === "source") {
      setSources((prev) => ({
        ...prev,
        [event.id]: { id: event.id, label: event.label, state: event.state, value: event.value, error: event.error },
      }));
    } else if (event.type === "hypothesis") {
      setHypotheses((prev) => (prev.some((h) => h.id === event.hypothesis.id) ? prev : [...prev, event.hypothesis]));
    } else if (event.type === "action") {
      setActions((prev) => (prev.some((a) => a.id === event.action.id) ? prev : [...prev, event.action]));
    } else if (event.type === "toast") {
      const id = toastIdRef.current++;
      setToasts((prev) => [...prev, { id, tone: event.tone, text: event.text }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }
  }, []);

  const start = useCallback(async () => {
    eventSourceRef.current?.close();
    setSteps({ observe: "idle", orient: "idle", decide: "idle", act: "idle", learn: "idle" });
    setSources({});
    setHypotheses([]);
    setActions([]);
    setRunning(true);

    const { runId } = await startRun();
    const es = new EventSource(streamUrl(runId));
    eventSourceRef.current = es;
    // React StrictMode (dev) double-invokes this effect, which can start a second
    // run before the first's in-flight SSE messages are done arriving. Both runs
    // analyze the same real Xero data and produce deterministic hypothesis ids, so
    // without this guard their events interleave into the same state.
    const isStale = () => eventSourceRef.current !== es;
    es.onmessage = (msg) => {
      if (isStale()) return;
      const event = JSON.parse(msg.data) as OodaEvent;
      applyEvent(event);
      if (event.type === "step" && event.step === STEP_ORDER[STEP_ORDER.length - 1] && event.state === "done") {
        es.close();
        setRunning(false);
      }
    };
    es.onerror = () => {
      if (isStale()) return;
      es.close();
      setRunning(false);
    };
  }, [applyEvent]);

  useEffect(() => {
    start();
    return () => eventSourceRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = useCallback(async (id: string) => {
    setApprovingIds((prev) => new Set(prev).add(id));
    try {
      // Real Xero write for draft_quote actions — apply whatever the server
      // actually did, not an optimistic guess (it can fail).
      const { action } = await approveAction(id);
      setActions((prev) => prev.map((a) => (a.id === id ? action : a)));
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const reject = useCallback(async (id: string) => {
    const { action } = await rejectAction(id);
    setActions((prev) => prev.map((a) => (a.id === id ? action : a)));
  }, []);

  return { steps, sources, hypotheses, actions, approvingIds, toasts, running, restart: start, approve, reject };
}
