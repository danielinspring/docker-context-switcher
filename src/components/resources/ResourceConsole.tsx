import { motion } from "framer-motion";
import { Boxes, RefreshCw, Server, Laptop } from "lucide-react";
import { useState } from "react";
import { useResources } from "../../hooks/useResources";
import { spring } from "../../lib/motion";
import type {
  Container,
  DiskCategory,
  DockerContext,
  Image,
  Network,
  PruneTarget,
  ResourceTab,
  Volume,
} from "../../types/docker";
import { ConfirmDialog, type ConfirmRequest } from "../ConfirmDialog";
import { GlassButton } from "../glass/GlassButton";
import { Pill } from "../ui/Pill";
import { ContainersTab } from "./ContainersTab";
import { DiskUsage } from "./DiskUsage";
import { ImagesTab } from "./ImagesTab";
import { NetworksTab } from "./NetworksTab";
import { ResourceToast } from "./ResourceToast";
import { VolumesTab } from "./VolumesTab";

const PRUNE_COPY: Record<
  DiskCategory["key"],
  { target: PruneTarget; command: string; message: string }
> = {
  images: {
    target: "images",
    command: "image prune -a -f",
    message: "Removes every image not used by an existing container.",
  },
  containers: {
    target: "containers",
    command: "container prune -f",
    message: "Removes all stopped containers.",
  },
  volumes: {
    target: "volumes",
    command: "volume prune -a -f",
    message: "Removes all volumes not used by at least one container.",
  },
  "build-cache": {
    target: "build-cache",
    command: "builder prune -f",
    message: "Removes all dangling build cache.",
  },
};

export function ResourceConsole({ context }: { context?: DockerContext }) {
  const r = useResources(context?.name);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  if (!context) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Boxes className="h-10 w-10 text-white/15" strokeWidth={1.3} />
        <p className="text-sm text-white/35">
          No active context. Select one on the left to inspect its resources.
        </p>
      </div>
    );
  }

  const prefix = `docker --context ${context.name} `;

  const ask = (request: Omit<ConfirmRequest, "onConfirm">, run: () => Promise<unknown> | undefined) => {
    setConfirm({
      ...request,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await run();
        } finally {
          setConfirmBusy(false);
          setConfirm(null);
        }
      },
    });
  };

  const confirmRemoveContainer = (c: Container) =>
    ask(
      {
        title: `Remove container?`,
        message: `"${c.name}" will be force-removed. This cannot be undone.`,
        command: `${prefix}rm -f ${c.id}`,
        confirmLabel: "Remove",
      },
      () => r.runContainerAction(c.id, "remove"),
    );

  const confirmRemoveImage = (image: Image) =>
    ask(
      {
        title: "Remove image?",
        message: image.inUse
          ? "This image is in use by a container and may fail to remove."
          : "This image will be deleted from the daemon.",
        command: `${prefix}rmi ${image.id}`,
        confirmLabel: "Remove",
      },
      () => r.removeImageById(image.id),
    );

  const confirmRemoveVolume = (volume: Volume) =>
    ask(
      {
        title: "Remove volume?",
        message: `Volume "${volume.name}" and its data will be permanently deleted.`,
        command: `${prefix}volume rm ${volume.name}`,
        confirmLabel: "Remove",
      },
      () => r.removeVolumeByName(volume.name),
    );

  const confirmRemoveNetwork = (network: Network) =>
    ask(
      {
        title: "Remove network?",
        message: `Network "${network.name}" will be removed.`,
        command: `${prefix}network rm ${network.id}`,
        confirmLabel: "Remove",
      },
      () => r.removeNetworkById(network.id),
    );

  const confirmPrune = (category: DiskCategory) => {
    const copy = PRUNE_COPY[category.key];
    if (!copy) return;
    ask(
      {
        title: `Prune ${category.label.toLowerCase()}?`,
        message: `${copy.message} Reclaims ${category.reclaimable}.`,
        command: `${prefix}${copy.command}`,
        confirmLabel: "Prune",
      },
      () => r.runPrune(copy.target),
    );
  };

  const TABS: { key: ResourceTab; label: string; count: number }[] = [
    { key: "containers", label: "Containers", count: r.containers.length },
    { key: "images", label: "Images", count: r.images.length },
    { key: "volumes", label: "Volumes", count: r.volumes.length },
    { key: "networks", label: "Networks", count: r.networks.length },
  ];

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {context.kind === "ssh" ? (
              <Server className="h-5 w-5 text-violet-300" strokeWidth={1.6} />
            ) : (
              <Laptop className="h-5 w-5 text-cyan-300" strokeWidth={1.6} />
            )}
            <h1 className="truncate text-xl font-semibold text-white/95">
              {context.name}
            </h1>
            <Pill tone={context.kind === "ssh" ? "violet" : "cyan"}>
              {context.kind.toUpperCase()}
            </Pill>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-white/35">
            {context.endpoint}
          </p>
        </div>
        <GlassButton onClick={r.refresh} aria-label="Refresh resources">
          <RefreshCw className={`h-4 w-4 ${r.loading ? "animate-spin" : ""}`} />
        </GlassButton>
      </div>

      <DiskUsage
        disk={r.disk}
        loading={r.loading}
        pruning={r.pruning}
        onPrune={confirmPrune}
      />

      {r.error && (
        <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {r.error}
        </p>
      )}

      {/* Tab bar */}
      <div className="mt-5 flex gap-1 border-b border-white/[0.07]">
        {TABS.map((t) => {
          const active = r.tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => r.setTab(t.key)}
              className={
                "relative px-3.5 py-2.5 text-sm font-medium transition-colors " +
                (active ? "text-white/90" : "text-white/40 hover:text-white/65")
              }
            >
              <span className="flex items-center gap-1.5">
                {t.label}
                <span
                  className={
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold " +
                    (active ? "bg-white/12 text-white/70" : "bg-white/5 text-white/35")
                  }
                >
                  {t.count}
                </span>
              </span>
              {active && (
                <motion.div
                  layoutId="resource-tab-underline"
                  transition={spring}
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-cyan-300"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        {r.loading && r.containers.length === 0 ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass h-[62px] animate-pulse rounded-xl opacity-60" />
            ))}
          </div>
        ) : r.tab === "containers" ? (
          <ContainersTab
            containers={r.containers}
            busy={r.busy}
            onAction={r.runContainerAction}
            onRemove={confirmRemoveContainer}
          />
        ) : r.tab === "images" ? (
          <ImagesTab images={r.images} busy={r.busy} onRemove={confirmRemoveImage} />
        ) : r.tab === "volumes" ? (
          <VolumesTab volumes={r.volumes} busy={r.busy} onRemove={confirmRemoveVolume} />
        ) : (
          <NetworksTab networks={r.networks} busy={r.busy} onRemove={confirmRemoveNetwork} />
        )}
      </div>

      <ResourceToast toast={r.toast} onDismiss={r.dismissToast} />
      <ConfirmDialog
        request={confirm}
        busy={confirmBusy}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
