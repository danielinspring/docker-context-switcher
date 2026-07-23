import { useCallback, useEffect, useState } from "react";
import {
  createSshContext,
  getEngineStatus,
  listContexts,
  switchContext,
} from "../lib/backend";
import type {
  DockerContext,
  EngineStatus,
  NewSshContext,
} from "../types/docker";

const ENGINE_POLL_INTERVAL_MS = 10_000;

/** Single source of truth for contexts + engine health in the UI. */
export function useDocker() {
  const [contexts, setContexts] = useState<DockerContext[]>([]);
  const [engine, setEngine] = useState<EngineStatus>({ state: "unknown" });
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextContexts, nextEngine] = await Promise.all([
        listContexts(),
        getEngineStatus(),
      ]);
      setContexts(nextContexts);
      setEngine(nextEngine);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      getEngineStatus().then(setEngine).catch(() => {});
    }, ENGINE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const switchTo = useCallback(
    async (name: string) => {
      setSwitching(name);
      try {
        await switchContext(name);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSwitching(null);
      }
    },
    [refresh],
  );

  // Errors intentionally propagate to the caller so the form can show them inline.
  const addSshContext = useCallback(
    async (spec: NewSshContext) => {
      await createSshContext(spec);
      await refresh();
    },
    [refresh],
  );

  return { contexts, engine, loading, switching, error, refresh, switchTo, addSshContext };
}
