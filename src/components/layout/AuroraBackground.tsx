import { motion } from "framer-motion";

const drift = (duration: number) => ({
  duration,
  repeat: Infinity,
  repeatType: "mirror" as const,
  ease: "easeInOut" as const,
});

/**
 * Fluid gradient layer that lives beneath every glass surface.
 * Sits on top of the macOS vibrancy layer (or the browser-preview wallpaper)
 * and drifts slowly to keep the glass alive without stealing attention.
 */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Readability tint over whatever the desktop shows through vibrancy. */}
      <div className="absolute inset-0 bg-[#05070f]/65" />

      <motion.div
        className="absolute -top-40 -left-32 h-[440px] w-[440px] rounded-full bg-cyan-500/25 blur-[130px]"
        animate={{ x: [0, 130, 40], y: [0, 70, 150], scale: [1, 1.18, 0.94] }}
        transition={drift(26)}
      />
      <motion.div
        className="absolute -bottom-48 -right-36 h-[520px] w-[520px] rounded-full bg-violet-600/25 blur-[150px]"
        animate={{ x: [0, -110, -30], y: [0, -80, -160], scale: [1, 0.92, 1.15] }}
        transition={drift(32)}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-blue-500/15 blur-[120px]"
        animate={{ x: [-60, 80, -20], y: [30, -50, 60], scale: [1.05, 0.9, 1.1] }}
        transition={drift(40)}
      />

      {/* Fine grain so large gradients never band. */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.9) 0.5px, transparent 0.5px)",
          backgroundSize: "3px 3px",
        }}
      />
    </div>
  );
}
