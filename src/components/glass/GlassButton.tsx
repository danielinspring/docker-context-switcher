import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { spring } from "../../lib/motion";

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const VARIANT_CLASSES: Record<NonNullable<GlassButtonProps["variant"]>, string> = {
  primary:
    "border-cyan-300/30 bg-gradient-to-br from-cyan-400/25 to-blue-500/20 text-cyan-100 " +
    "hover:border-cyan-300/50 hover:from-cyan-400/30 hover:to-blue-500/25 " +
    "shadow-[0_4px_24px_rgba(34,211,238,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]",
  ghost:
    "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white/90 " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
};

export function GlassButton({
  children,
  onClick,
  type = "button",
  variant = "ghost",
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: GlassButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={spring}
      className={
        "inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 " +
        "text-sm font-medium backdrop-blur-xl transition-colors " +
        "disabled:cursor-not-allowed disabled:opacity-40 " +
        `${VARIANT_CLASSES[variant]} ${className}`
      }
    >
      {children}
    </motion.button>
  );
}
