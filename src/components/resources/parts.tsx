import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { spring } from "../../lib/motion";

/** Consistent glass row shell shared by every resource tab. */
export function RowShell({ children }: { children: ReactNode }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={spring}
      className="glass flex items-center gap-3 rounded-xl px-3.5 py-2.5"
    >
      {children}
    </motion.li>
  );
}

export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <Icon className="h-8 w-8 text-white/20" strokeWidth={1.4} />
      <p className="text-sm text-white/35">{message}</p>
    </div>
  );
}

export function MonoId({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] text-white/35">{children}</span>;
}
