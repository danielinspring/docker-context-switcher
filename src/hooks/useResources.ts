import { useCallback, useEffect, useRef, useState } from "react";
import {
  containerAction,
  diskUsage,
  listContainers,
  listImages,
  listNetworks,
  listVolumes,
  prune,
  removeImage,
  removeNetwork,
  removeVolume,
} from "../lib/backend";
import type {
  Container,
  ContainerAction,
  DiskCategory,
  Image,
  Network,
  PruneTarget,
  ResourceTab,
  Volume,
} from "../types/docker";

/** Transient banner surfaced after a prune / removal completes. */
export interface Toast {
  kind: "success" | "error";
  message: string;
}

/**
 * Owns every resource view for a single context. Reloads when the active
 * context changes, tracks per-item busy state so rows can show spinners, and
 * refreshes only the sections a mutation actually touches.
 */
export function useResources(context: string | undefined) {
  const [tab, setTab] = useState<ResourceTab>("containers");
  const [containers, setContainers] = useState<Container[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [disk, setDisk] = useState<DiskCategory[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [pruning, setPruning] = useState<PruneTarget | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Guards against a slow response from a previous context clobbering state
  // after the user has already switched away.
  const requestRef = useRef(0);

  const markBusy = useCallback((key: string, on: boolean) => {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const loadDisk = useCallback(async (ctx: string) => {
    setDisk(await diskUsage(ctx));
  }, []);

  const loadSection = useCallback(async (ctx: string, section: ResourceTab) => {
    switch (section) {
      case "containers":
        setContainers(await listContainers(ctx));
        break;
      case "images":
        setImages(await listImages(ctx));
        break;
      case "volumes":
        setVolumes(await listVolumes(ctx));
        break;
      case "networks":
        setNetworks(await listNetworks(ctx));
        break;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!context) return;
    const ticket = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const [c, i, v, n, d] = await Promise.all([
        listContainers(context),
        listImages(context),
        listVolumes(context),
        listNetworks(context),
        diskUsage(context),
      ]);
      if (ticket !== requestRef.current) return; // superseded
      setContainers(c);
      setImages(i);
      setVolumes(v);
      setNetworks(n);
      setDisk(d);
    } catch (err) {
      if (ticket === requestRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (ticket === requestRef.current) setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    setContainers([]);
    setImages([]);
    setVolumes([]);
    setNetworks([]);
    setDisk([]);
    void refresh();
  }, [refresh]);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  /** Run a mutation with busy tracking + a section refresh + a result toast. */
  const mutate = useCallback(
    async (
      key: string,
      op: () => Promise<string | void>,
      after: () => Promise<void>,
      successMessage: string,
    ) => {
      if (!context) return;
      markBusy(key, true);
      try {
        const result = await op();
        await after();
        setToast({
          kind: "success",
          message: typeof result === "string" && result ? result : successMessage,
        });
      } catch (err) {
        setToast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        markBusy(key, false);
      }
    },
    [context, markBusy],
  );

  const runContainerAction = useCallback(
    (id: string, action: ContainerAction) => {
      if (!context) return;
      const ctx = context;
      return mutate(
        `container:${id}`,
        () => containerAction(ctx, id, action),
        async () => {
          await Promise.all([loadSection(ctx, "containers"), loadDisk(ctx)]);
        },
        `Container ${action}ed`,
      );
    },
    [context, mutate, loadSection, loadDisk],
  );

  const removeImageById = useCallback(
    (id: string) => {
      if (!context) return;
      const ctx = context;
      return mutate(
        `image:${id}`,
        () => removeImage(ctx, id),
        async () => {
          await Promise.all([loadSection(ctx, "images"), loadDisk(ctx)]);
        },
        "Image removed",
      );
    },
    [context, mutate, loadSection, loadDisk],
  );

  const removeVolumeByName = useCallback(
    (name: string) => {
      if (!context) return;
      const ctx = context;
      return mutate(
        `volume:${name}`,
        () => removeVolume(ctx, name),
        async () => {
          await Promise.all([loadSection(ctx, "volumes"), loadDisk(ctx)]);
        },
        "Volume removed",
      );
    },
    [context, mutate, loadSection, loadDisk],
  );

  const removeNetworkById = useCallback(
    (id: string) => {
      if (!context) return;
      const ctx = context;
      return mutate(
        `network:${id}`,
        () => removeNetwork(ctx, id),
        () => loadSection(ctx, "networks"),
        "Network removed",
      );
    },
    [context, mutate, loadSection, loadDisk],
  );

  const runPrune = useCallback(
    async (target: PruneTarget) => {
      if (!context) return;
      setPruning(target);
      try {
        const message = await prune(context, target);
        await refresh();
        setToast({ kind: "success", message: message || "Prune complete" });
      } catch (err) {
        setToast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setPruning(null);
      }
    },
    [context, refresh],
  );

  return {
    tab,
    setTab,
    containers,
    images,
    volumes,
    networks,
    disk,
    loading,
    error,
    busy,
    pruning,
    toast,
    dismissToast: () => setToast(null),
    refresh,
    runContainerAction,
    removeImageById,
    removeVolumeByName,
    removeNetworkById,
    runPrune,
  };
}
