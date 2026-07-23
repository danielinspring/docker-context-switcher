import type { ReactNode } from "react";

export type PillTone = "green" | "amber" | "red" | "violet" | "cyan" | "neutral";

const TONE_CLASSES: Record<PillTone, string> = {
  green: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200/90",
  amber: "border-amber-300/25 bg-amber-400/10 text-amber-200/90",
  red: "border-red-300/25 bg-red-400/10 text-red-200/90",
  violet: "border-violet-300/25 bg-violet-400/10 text-violet-200/90",
  cyan: "border-cyan-300/25 bg-cyan-400/10 text-cyan-100/90",
  neutral: "border-white/12 bg-white/5 text-white/50",
};

export function Pill({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: PillTone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
