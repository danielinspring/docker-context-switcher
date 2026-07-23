/** Health of the local Docker engine, as probed by the Rust backend. */
export type EngineState = "running" | "stopped" | "not-installed" | "unknown";

export interface EngineStatus {
  state: EngineState;
  /** Server version, when the engine answered the ping. */
  version?: string;
  /** Endpoint that was probed, e.g. `unix:///var/run/docker.sock`. */
  endpoint?: string;
}

export type ContextKind = "local" | "ssh" | "tcp";

export interface DockerContext {
  name: string;
  description?: string;
  /** Docker endpoint, e.g. `ssh://user@host:22` or a unix socket path. */
  endpoint: string;
  kind: ContextKind;
  /** Whether this is the currently selected `docker context`. */
  active: boolean;
}

/** Form payload for registering a remote SSH endpoint. */
export interface NewSshContext {
  name: string;
  user: string;
  host: string;
  port: number;
}

/* -------------------------------------------------------------------------- */
/* Resources                                                                  */
/* -------------------------------------------------------------------------- */

export interface Container {
  id: string;
  name: string;
  image: string;
  /** Raw docker state: running | exited | created | paused | restarting | … */
  state: string;
  /** Human status line, e.g. "Exited (137) 9 days ago". */
  status: string;
  ports: string;
  running: boolean;
}

export interface Image {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
  /** Number of containers using this image (-1 when docker reports N/A). */
  containers: number;
  dangling: boolean;
  inUse: boolean;
}

export interface Volume {
  name: string;
  driver: string;
  size: string;
  /** Container references; 0 means the volume is unused. */
  links: number;
  inUse: boolean;
}

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  /** Docker's built-in networks (bridge/host/none) can't be removed. */
  predefined: boolean;
}

export type DiskCategoryKey = "images" | "containers" | "volumes" | "build-cache";

export interface DiskCategory {
  key: DiskCategoryKey;
  label: string;
  size: string;
  /** Raw reclaimable string, e.g. "4.894GB (63%)". */
  reclaimable: string;
  totalCount: number;
  active: number;
  /** Whether there is anything to reclaim (drives the prune button state). */
  reclaimableBytes: boolean;
}

export type ContainerAction = "start" | "stop" | "restart" | "remove";

export type PruneTarget =
  | "containers"
  | "images"
  | "volumes"
  | "networks"
  | "build-cache"
  | "system";

export type ResourceTab = "containers" | "images" | "volumes" | "networks";
