import { useEffect, useState } from "react";
import { Eye, Lightbulb, RefreshCw, Target, Zap, CheckCircle2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OodaStep } from "@/lib/types";
import type { StepState } from "@/hooks/useOodaRun";

const STEPS: { key: OodaStep; label: string; icon: typeof Eye }[] = [
  { key: "observe", label: "Observe", icon: Eye },
  { key: "orient", label: "Orient", icon: Lightbulb },
  { key: "decide", label: "Decide", icon: Target },
  { key: "act", label: "Act", icon: Zap },
  { key: "learn", label: "Learn", icon: RefreshCw },
];

function useElapsed(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return seconds;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function OodaStepper({
  steps,
  running,
  onRestart,
}: {
  steps: Record<OodaStep, StepState>;
  running: boolean;
  onRestart: () => void;
}) {
  const elapsed = useElapsed(running);

  return (
    <div className="flex h-12 items-center justify-between rounded-[var(--radius-card)] border border-xero-line bg-xero-card px-3">
      <div className="flex flex-1 items-center">
        {STEPS.map(({ key, label, icon: Icon }, i) => {
          const state = steps[key];
          return (
            <div key={key} className="flex flex-1 items-center">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] transition-colors",
                  state === "active" && "bg-info-bg text-xero-navy",
                  state === "done" && "text-ok",
                  state === "idle" && "text-xero-grey"
                )}
              >
                {state === "done" ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <motion.span
                    animate={state === "active" ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ repeat: state === "active" ? Infinity : 0, duration: 1.2 }}
                  >
                    <Icon size={15} />
                  </motion.span>
                )}
                {label}
              </div>
              {i < STEPS.length - 1 && <div className="mx-1 h-px flex-1 bg-xero-line" />}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 pl-3">
        <span className="font-mono text-[12px] tabular-nums text-xero-grey">{formatClock(elapsed)}</span>
        <Button variant="secondary" onClick={onRestart} aria-label="Restart run">
          <RotateCcw size={13} />
          Restart
        </Button>
      </div>
    </div>
  );
}
