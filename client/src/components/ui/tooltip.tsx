import type { ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-xero-ink px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
