import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { softSpring } from "../../lib/motion";
import type { Toast } from "../../hooks/useResources";

export function ResourceToast({
  toast,
  onDismiss,
}: {
  toast: Toast | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={softSpring}
          className="glass-strong pointer-events-auto absolute bottom-4 left-1/2 z-50 flex max-w-[92%] -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-2.5"
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-red-300" />
          )}
          <span className="truncate text-sm text-white/85">{toast.message}</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
