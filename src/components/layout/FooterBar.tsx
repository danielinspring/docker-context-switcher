import { Terminal } from "lucide-react";
import type { DockerContext } from "../../types/docker";

/** Status strip mirroring the shell command the active selection maps to. */
export function FooterBar({ active }: { active?: DockerContext }) {
  return (
    <footer className="relative z-10 flex h-10 shrink-0 items-center justify-center gap-2 border-t border-white/[0.06] text-xs text-white/35">
      <Terminal className="h-3.5 w-3.5" strokeWidth={1.6} />
      <span className="font-mono">
        docker context use {active?.name ?? "…"}
      </span>
    </footer>
  );
}
