import { motion } from "framer-motion";
import { Container } from "lucide-react";
import { softSpring } from "../lib/motion";
import type { EngineStatus } from "../types/docker";
import { ENGINE_STATUS_META, StatusDot } from "./StatusDot";

/** Hero card showing the health of the local Docker engine (left rail). */
export function EngineStatusCard({ engine }: { engine: EngineStatus }) {
  const meta = ENGINE_STATUS_META[engine.state];

  return (
    <motion.section
      className="glass rounded-2xl p-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5">
          <Container className={`h-5 w-5 ${meta.textClass}`} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
            Local Docker Engine
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-base font-semibold">
            <StatusDot state={engine.state} />
            <span className={meta.textClass}>{meta.label}</span>
            {engine.version && (
              <span className="text-xs font-normal text-white/30">
                v{engine.version}
              </span>
            )}
          </p>
        </div>
      </div>

      {engine.endpoint && (
        <p className="mt-2.5 truncate border-t border-white/[0.06] pt-2.5 font-mono text-[11px] text-white/30">
          {engine.endpoint}
        </p>
      )}
    </motion.section>
  );
}
