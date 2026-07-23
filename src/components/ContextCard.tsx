import { motion } from "framer-motion";
import { Check, Laptop, Loader2, Server } from "lucide-react";
import { spring } from "../lib/motion";
import type { DockerContext } from "../types/docker";

interface ContextCardProps {
  context: DockerContext;
  isSwitching: boolean;
  onUse: (name: string) => void;
}

export function ContextCard({ context, isSwitching, onUse }: ContextCardProps) {
  const Icon = context.kind === "ssh" ? Server : Laptop;

  return (
    <motion.button
      type="button"
      layout
      onClick={() => !context.active && !isSwitching && onUse(context.name)}
      whileHover={context.active ? undefined : { scale: 1.015 }}
      whileTap={context.active ? undefined : { scale: 0.985 }}
      transition={spring}
      className={
        "glass group relative w-full rounded-2xl p-4 text-left " +
        (context.active ? "cursor-default" : "cursor-pointer hover:border-white/20")
      }
    >
      {/* Liquid glow ring that flows between cards when the context changes. */}
      {context.active && (
        <motion.div
          layoutId="active-context-glow"
          transition={spring}
          className="pointer-events-none absolute -inset-px rounded-2xl border border-cyan-300/50"
          style={{
            boxShadow:
              "0 0 0 1px rgba(103,232,249,0.22), 0 0 36px rgba(34,211,238,0.26), inset 0 0 26px rgba(34,211,238,0.10)",
          }}
        />
      )}

      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
          <Icon
            className={`h-5 w-5 ${context.kind === "ssh" ? "text-violet-300" : "text-cyan-300"}`}
            strokeWidth={1.6}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-white/90">
              {context.name}
            </span>
            {context.kind === "ssh" && (
              <span className="shrink-0 rounded-md border border-violet-300/25 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-violet-200/90">
                SSH
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-white/40">
            {context.endpoint}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
          ) : context.active ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Active
            </span>
          ) : (
            <span className="text-xs font-medium text-white/0 transition-colors group-hover:text-white/45">
              Switch
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
