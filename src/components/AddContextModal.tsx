import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { softSpring } from "../lib/motion";
import type { NewSshContext } from "../types/docker";
import { GlassButton } from "./glass/GlassButton";

interface AddContextModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (spec: NewSshContext) => Promise<void>;
}

const EMPTY_FORM = { name: "", user: "", host: "", port: "22" };

// Mirrors Docker's context-name restrictions.
const NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.+-]*$/;

export function AddContextModal({ open, onClose, onSubmit }: AddContextModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const portNumber = Number(form.port);
  const valid =
    NAME_PATTERN.test(form.name) &&
    form.user.trim().length > 0 &&
    form.host.trim().length > 0 &&
    !/\s/.test(form.host) &&
    Number.isInteger(portNumber) &&
    portNumber >= 1 &&
    portNumber <= 65535;

  const commandPreview = `docker context create ${form.name || "<name>"} --docker "host=ssh://${form.user || "<user>"}@${form.host || "<host>"}:${form.port || "22"}"`;

  const set = (key: keyof typeof EMPTY_FORM) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        user: form.user.trim(),
        host: form.host.trim(),
        port: portNumber,
      });
      setForm(EMPTY_FORM);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6">
          <motion.div
            className="absolute inset-0 bg-[#02040a]/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.form
            onSubmit={handleSubmit}
            className="glass-strong relative w-full max-w-md rounded-3xl p-6"
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={softSpring}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white/95">New SSH Context</h2>
                <p className="mt-1 text-sm text-white/45">
                  Register a remote Docker endpoint reachable over SSH.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-white/55">Context Name</span>
                <input
                  className="glass-input"
                  placeholder="synology-nas"
                  value={form.name}
                  onChange={set("name")}
                  autoFocus
                  spellCheck={false}
                />
              </label>

              <div className="grid grid-cols-[1fr_1.4fr_88px] gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-white/55">SSH User</span>
                  <input
                    className="glass-input"
                    placeholder="admin"
                    value={form.user}
                    onChange={set("user")}
                    spellCheck={false}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-white/55">Host / IP</span>
                  <input
                    className="glass-input"
                    placeholder="192.168.1.20"
                    value={form.host}
                    onChange={set("host")}
                    spellCheck={false}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-white/55">Port</span>
                  <input
                    className="glass-input"
                    placeholder="22"
                    inputMode="numeric"
                    value={form.port}
                    onChange={set("port")}
                    spellCheck={false}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  Will execute
                </p>
                <code className="block break-all font-mono text-xs leading-relaxed text-cyan-200/80">
                  {commandPreview}
                </code>
              </div>

              {error && (
                <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <GlassButton onClick={onClose}>Cancel</GlassButton>
                <GlassButton type="submit" variant="primary" disabled={!valid || submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Context
                </GlassButton>
              </div>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
