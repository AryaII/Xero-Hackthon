import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lightbulb } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Hypothesis } from "@/lib/types";

function currency(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function HypothesisCard({ hypothesis, index }: { hypothesis: Hypothesis; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-md border border-xero-line p-3"
    >
      <button className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 font-mono text-[10px] text-xero-grey">H{index + 1}</span>
          <span className="text-[13px] font-semibold text-xero-ink">{hypothesis.label}</span>
        </div>
        <ChevronDown size={14} className={cn("mt-0.5 shrink-0 text-xero-grey transition-transform", open && "rotate-180")} />
      </button>

      {hypothesis.impactGBP !== null && (
        <p className="mt-1 text-[12px] text-xero-grey">Impact: {currency(hypothesis.impactGBP)}</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] text-xero-grey">Confidence</span>
        <Progress value={hypothesis.confidence * 100} className="flex-1" />
        <span className="font-mono text-[11px] text-xero-ink">{Math.round(hypothesis.confidence * 100)}%</span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-3 text-[11px] leading-relaxed text-xero-grey">{hypothesis.detail}</p>
            <div className="mt-2 flex flex-col gap-1">
              {hypothesis.evidence.map((e, i) => (
                <span key={i} className="font-mono text-[10px] text-xero-grey">
                  · [{e.source}] {e.value}
                </span>
              ))}
            </div>
            <div className="mt-2 rounded bg-xero-bg p-2 font-mono text-[10px] text-xero-grey">
              {hypothesis.confidenceFormula.formula}
              <br />
              {Object.entries(hypothesis.confidenceFormula.inputs).map(([k, v]) => (
                <span key={k}>
                  {k} = {v}
                  <br />
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function OrientColumn({ hypotheses, stepState }: { hypotheses: Hypothesis[]; stepState: "idle" | "active" | "done" }) {
  return (
    <Card className="min-h-[480px]">
      <CardHeader>
        <CardTitle>
          <Lightbulb size={16} className="text-xero-navy" />
          Orient
        </CardTitle>
        {stepState === "idle" && <Badge tone="neutral">idle</Badge>}
        {stepState === "active" && <Badge tone="info">analyzing</Badge>}
        {stepState === "done" && <Badge tone="ok">done · {hypotheses.length} hypotheses</Badge>}
      </CardHeader>
      <p className="mb-4 text-[12px] text-xero-grey">Forming hypotheses with confidence scores</p>

      {stepState === "done" && hypotheses.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-xero-line text-center text-[12px] text-xero-grey">
          No dormant-customer or late-payment signals in this data right now —
          <br />
          honest empty state, not a bug.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {hypotheses.map((h, i) => (
            <HypothesisCard key={h.id} hypothesis={h} index={i} />
          ))}
        </div>
      )}
    </Card>
  );
}
