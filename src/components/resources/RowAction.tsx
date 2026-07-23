import { motion } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";
import { spring } from "../../lib/motion";

interface RowActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  danger?: boolean;
}

/** Compact icon-and-label button used inside resource rows. */
export function RowAction({
  icon: Icon,
  label,
  onClick,
  busy = false,
  disabled = false,
  danger = false,
}: RowActionProps) {
  const isDisabled = disabled || busy;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      title={label}
      whileHover={isDisabled ? undefined : { scale: 1.06 }}
      whileTap={isDisabled ? undefined : { scale: 0.92 }}
      transition={spring}
      className={
        "grid h-8 w-8 place-items-center rounded-lg border backdrop-blur-md transition-colors " +
        "disabled:cursor-not-allowed disabled:opacity-30 " +
        (danger
          ? "border-red-300/20 bg-red-400/5 text-red-200/80 hover:border-red-300/40 hover:bg-red-400/15 hover:text-red-100"
          : "border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:bg-white/10 hover:text-white/90")
      }
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" strokeWidth={1.8} />}
    </motion.button>
  );
}
