import { AnimatePresence } from "framer-motion";
import { Network as NetworkIcon, Trash2 } from "lucide-react";
import type { Network } from "../../types/docker";
import { Pill } from "../ui/Pill";
import { RowAction } from "./RowAction";
import { EmptyState, MonoId, RowShell } from "./parts";

interface NetworksTabProps {
  networks: Network[];
  busy: Set<string>;
  onRemove: (network: Network) => void;
}

export function NetworksTab({ networks, busy, onRemove }: NetworksTabProps) {
  if (networks.length === 0) {
    return <EmptyState icon={NetworkIcon} message="No networks in this context." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {networks.map((network) => {
          const isBusy = busy.has(`network:${network.id}`);
          return (
            <RowShell key={network.id}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white/90">
                    {network.name}
                  </span>
                  <MonoId>{network.id}</MonoId>
                  {network.predefined && <Pill tone="cyan">built-in</Pill>}
                </div>
                <p className="truncate text-[11px] text-white/35">
                  {network.driver} · {network.scope}
                </p>
              </div>

              <RowAction
                icon={Trash2}
                label="Remove network"
                danger
                busy={isBusy}
                disabled={network.predefined}
                onClick={() => onRemove(network)}
              />
            </RowShell>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
