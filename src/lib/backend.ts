import { invoke } from "@tauri-apps/api/core";
import * as mock from "./mock";
import type {
  Container,
  ContainerAction,
  DiskCategory,
  DockerContext,
  EngineStatus,
  Image,
  Network,
  NewSshContext,
  PruneTarget,
  Volume,
  WidgetSnapshot,
} from "../types/docker";

/**
 * Thin typed boundary between the React app and the Rust backend.
 *
 * Every call degrades to the in-memory mock when the app is served outside
 * the Tauri shell, so `npm run dev` in a plain browser stays fully usable
 * for UI review. Command names must stay in sync with
 * `src-tauri/src/commands.rs`.
 */
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function listContexts(): Promise<DockerContext[]> {
  return isTauri ? invoke("list_contexts") : mock.listContexts();
}

export function getEngineStatus(): Promise<EngineStatus> {
  return isTauri ? invoke("local_engine_status") : mock.getEngineStatus();
}

export function switchContext(name: string): Promise<void> {
  return isTauri ? invoke("switch_context", { name }) : mock.switchContext(name);
}

export function createSshContext(spec: NewSshContext): Promise<DockerContext> {
  return isTauri
    ? invoke("create_ssh_context", { spec })
    : mock.createSshContext(spec);
}

/* -------------------------------------------------------------------------- */
/* Resources                                                                  */
/* -------------------------------------------------------------------------- */

export function listContainers(context: string): Promise<Container[]> {
  return isTauri
    ? invoke("list_containers", { context })
    : mock.listContainers(context);
}

export function listImages(context: string): Promise<Image[]> {
  return isTauri ? invoke("list_images", { context }) : mock.listImages(context);
}

export function listVolumes(context: string): Promise<Volume[]> {
  return isTauri
    ? invoke("list_volumes", { context })
    : mock.listVolumes(context);
}

export function listNetworks(context: string): Promise<Network[]> {
  return isTauri
    ? invoke("list_networks", { context })
    : mock.listNetworks(context);
}

export function diskUsage(context: string): Promise<DiskCategory[]> {
  return isTauri ? invoke("disk_usage", { context }) : mock.diskUsage(context);
}

export function containerAction(
  context: string,
  id: string,
  action: ContainerAction,
): Promise<void> {
  return isTauri
    ? invoke("container_action", { context, id, action })
    : mock.containerAction(context, id, action);
}

export function removeImage(context: string, id: string): Promise<void> {
  return isTauri
    ? invoke("remove_image", { context, id })
    : mock.removeImage(context, id);
}

export function removeVolume(context: string, name: string): Promise<void> {
  return isTauri
    ? invoke("remove_volume", { context, name })
    : mock.removeVolume(context, name);
}

export function removeNetwork(context: string, id: string): Promise<void> {
  return isTauri
    ? invoke("remove_network", { context, id })
    : mock.removeNetwork(context, id);
}

export function prune(context: string, target: PruneTarget): Promise<string> {
  return isTauri
    ? invoke("prune", { context, target })
    : mock.prune(context, target);
}

/** Publish a status snapshot for the macOS widget. No-op in the browser. */
export function publishWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  return isTauri
    ? invoke("publish_widget_snapshot", { snapshot })
    : Promise.resolve();
}
