import { motion } from "framer-motion";
import { Boxes, Container, HardDrive, Layers, Loader2, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { spring } from "../../lib/motion";
import type { DiskCategory, DiskCategoryKey, PruneTarget } from "../../types/docker";

const ICONS: Record<DiskCategoryKey, LucideIcon> = {
  images: Layers,
  containers: Container,
  volumes: HardDrive,
  "build-cache": Boxes,
};

interface DiskUsageProps {
  disk: DiskCategory[];
  loading: boolean;
  pruning: PruneTarget | null;
  onPrune: (category: DiskCategory) => void;
}

export function DiskUsage({ disk, loading, pruning, onPrune }: DiskUsageProps) {
  if (loading && disk.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass h-[104px] animate-pulse rounded-2xl opacity-60" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {disk.map((category) => {
        const Icon = ICONS[category.key];
        const isPruning = pruning === (category.key as PruneTarget);
        const canPrune = category.reclaimableBytes && !pruning;

        return (
          <motion.div
            key={category.key}
            layout
            className="glass relative flex flex-col justify-between rounded-2xl p-3.5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-white/45">
                <Icon className="h-4 w-4" strokeWidth={1.6} />
                <span className="text-[11px] font-medium uppercase tracking-[0.1em]">
                  {category.label}
                </span>
              </div>
              <motion.button
                type="button"
                onClick={() => canPrune && onPrune(category)}
                disabled={!canPrune}
                aria-label={`Prune ${category.label}`}
                title={
                  category.reclaimableBytes
                    ? `Reclaim ${category.reclaimable}`
                    : "Nothing to reclaim"
                }
                whileHover={canPrune ? { scale: 1.1 } : undefined}
                whileTap={canPrune ? { scale: 0.9 } : undefined}
                transition={spring}
                className={
                  "grid h-7 w-7 place-items-center rounded-lg border transition-colors " +
                  "disabled:cursor-not-allowed disabled:opacity-25 " +
                  "border-amber-300/20 bg-amber-400/5 text-amber-200/80 hover:border-amber-300/45 hover:bg-amber-400/15 hover:text-amber-100"
                }
              >
                {isPruning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                )}
              </motion.button>
            </div>

            <div className="mt-3">
              <p className="text-xl font-semibold tracking-tight text-white/90">
                {category.size}
              </p>
              <p className="mt-0.5 text-[11px] text-white/40">
                {category.active >= 0 ? `${category.active} active · ` : ""}
                {category.totalCount >= 0 ? `${category.totalCount} total` : ""}
              </p>
            </div>

            <p
              className={
                "mt-2 text-[11px] font-medium " +
                (category.reclaimableBytes ? "text-amber-300/85" : "text-white/25")
              }
            >
              {category.reclaimableBytes
                ? `${category.reclaimable} reclaimable`
                : "Nothing to reclaim"}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
