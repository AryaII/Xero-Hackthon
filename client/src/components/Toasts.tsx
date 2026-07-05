import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Toasts({ toasts }: { toasts: { id: number; tone: "info" | "warn"; text: string }[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "rounded-md border px-4 py-2.5 text-[13px] shadow-lg",
              t.tone === "info" && "border-xero-blue bg-info-bg text-xero-navy",
              t.tone === "warn" && "border-warn bg-warn-bg text-warn"
            )}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
