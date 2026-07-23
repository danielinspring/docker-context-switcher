import type { EngineState } from "../types/docker";

export const ENGINE_STATUS_META: Record<
  EngineState,
  { dotClass: string; textClass: string; label: string }
> = {
  running: {
    dotClass: "bg-status-running",
    textClass: "text-status-running",
    label: "Running",
  },
  stopped: {
    dotClass: "bg-status-stopped",
    textClass: "text-status-stopped",
    label: "Stopped",
  },
  "not-installed": {
    dotClass: "bg-status-missing",
    textClass: "text-status-missing",
    label: "Not installed",
  },
  unknown: {
    dotClass: "bg-white/30",
    textClass: "text-white/40",
    label: "Checking…",
  },
};

export function StatusDot({ state }: { state: EngineState }) {
  const meta = ENGINE_STATUS_META[state];
  return (
    <span className="relative flex h-2.5 w-2.5">
      {state === "running" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${meta.dotClass}`}
        />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
      />
    </span>
  );
}
