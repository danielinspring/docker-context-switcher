import { AnimatePresence } from "framer-motion";
import { HardDrive, Trash2 } from "lucide-react";
import type { Volume } from "../../types/docker";
import { Pill } from "../ui/Pill";
import { RowAction } from "./RowAction";
import { EmptyState, RowShell } from "./parts";

interface VolumesTabProps {
  volumes: Volume[];
  busy: Set<string>;
  onRemove: (volume: Volume) => void;
}

export function VolumesTab({ volumes, busy, onRemove }: VolumesTabProps) {
  if (volumes.length === 0) {
    return <EmptyState icon={HardDrive} message="No volumes in this context." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {volumes.map((volume) => {
          const isBusy = busy.has(`volume:${volume.name}`);
          return (
            <RowShell key={volume.name}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-[13px] text-white/85">
                    {volume.name}
                  </span>
                  {volume.inUse ? (
                    <Pill tone="green">in use</Pill>
                  ) : (
                    <Pill tone="neutral">unused</Pill>
                  )}
                </div>
                <p className="truncate text-[11px] text-white/35">
                  {volume.size} · {volume.driver}
                  {volume.links >= 0 && ` · ${volume.links} link(s)`}
                </p>
              </div>

              <RowAction
                icon={Trash2}
                label="Remove volume"
                danger
                busy={isBusy}
                disabled={volume.inUse}
                onClick={() => onRemove(volume)}
              />
            </RowShell>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
