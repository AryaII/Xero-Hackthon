import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "ok" | "warn" | "risk" | "info" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  risk: "bg-risk-bg text-risk",
  info: "bg-info-bg text-xero-navy",
  neutral: "bg-xero-bg text-xero-grey",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
