import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { softSpring } from "../lib/motion";
import { GlassButton } from "./glass/GlassButton";

export interface ConfirmRequest {
  title: string;
  message: string;
  /** Optional command line shown so the user knows exactly what runs. */
  command?: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  request: ConfirmRequest | null;
  busy: boolean;
  onCancel: () => void;
}

/** Destructive-action gate. Prune and every removal route through this. */
export function ConfirmDialog({ request, busy, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!request) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [request, busy, onCancel]);

  return (
    <AnimatePresence>
      {request && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-6">
          <motion.div
            className="absolute inset-0 bg-[#02040a]/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onCancel()}
          />

          <motion.div
            className="glass-strong relative w-full max-w-sm rounded-3xl p-6"
            initial={{ opacity: 0, y: 28, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={softSpring}
          >
            <div className="flex gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-300/20 bg-red-400/10">
                <AlertTriangle className="h-5 w-5 text-red-300" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-white/95">{request.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/55">
                  {request.message}
                </p>
              </div>
            </div>

            {request.command && (
              <code className="mt-4 block break-all rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs leading-relaxed text-cyan-200/75">
                {request.command}
              </code>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <GlassButton onClick={onCancel} disabled={busy}>
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={() => void request.onConfirm()}
                disabled={busy}
                className="!border-red-300/30 !from-red-400/25 !to-rose-500/20 !text-red-100 hover:!border-red-300/50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {request.confirmLabel}
              </GlassButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
