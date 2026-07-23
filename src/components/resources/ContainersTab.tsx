import { AnimatePresence } from "framer-motion";
import { Container as ContainerIcon, Play, RotateCw, Square, Trash2 } from "lucide-react";
import type { Container, ContainerAction } from "../../types/docker";
import { Pill, type PillTone } from "../ui/Pill";
import { RowAction } from "./RowAction";
import { EmptyState, MonoId, RowShell } from "./parts";

function stateTone(state: string): PillTone {
  switch (state) {
    case "running":
      return "green";
    case "paused":
    case "restarting":
    case "created":
      return "amber";
    case "exited":
    case "dead":
      return "neutral";
    default:
      return "neutral";
  }
}

interface ContainersTabProps {
  containers: Container[];
  busy: Set<string>;
  onAction: (id: string, action: ContainerAction) => void;
  onRemove: (container: Container) => void;
}

export function ContainersTab({ containers, busy, onAction, onRemove }: ContainersTabProps) {
  if (containers.length === 0) {
    return <EmptyState icon={ContainerIcon} message="No containers in this context." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {containers.map((container) => {
          const isBusy = busy.has(`container:${container.id}`);
          return (
            <RowShell key={container.id}>
              <Pill tone={stateTone(container.state)} dot>
                {container.state}
              </Pill>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white/90">
                    {container.name}
                  </span>
                  <MonoId>{container.id}</MonoId>
                </div>
                <p className="truncate text-xs text-white/40">
                  <span className="font-mono">{container.image}</span>
                  {container.ports && (
                    <span className="text-white/30"> · {container.ports}</span>
                  )}
                </p>
                <p className="truncate text-[11px] text-white/30">{container.status}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {container.running ? (
                  <>
                    <RowAction
                      icon={Square}
                      label="Stop"
                      busy={isBusy}
                      onClick={() => onAction(container.id, "stop")}
                    />
                    <RowAction
                      icon={RotateCw}
                      label="Restart"
                      busy={isBusy}
                      onClick={() => onAction(container.id, "restart")}
                    />
                  </>
                ) : (
                  <RowAction
                    icon={Play}
                    label="Start"
                    busy={isBusy}
                    onClick={() => onAction(container.id, "start")}
                  />
                )}
                <RowAction
                  icon={Trash2}
                  label="Remove"
                  danger
                  busy={isBusy}
                  onClick={() => onRemove(container)}
                />
              </div>
            </RowShell>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
