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
} from "../types/docker";

/**
 * In-memory mock backend used when the UI runs outside the Tauri shell
 * (plain `npm run dev` in a browser). Keeps the scaffold fully interactive —
 * including start/stop/remove and prune — so layout, motion, and flows can be
 * reviewed before touching a real daemon.
 */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let contexts: DockerContext[] = [
  {
    name: "orbstack",
    description: "OrbStack",
    endpoint: "unix:///Users/you/.orbstack/run/docker.sock",
    kind: "local",
    active: true,
  },
  {
    name: "default",
    description: "Current DOCKER_HOST based configuration",
    endpoint: "unix:///var/run/docker.sock",
    kind: "local",
    active: false,
  },
  {
    name: "gyedan-ub",
    description: "Remote SSH endpoint",
    endpoint: "ssh://gyedan@gyedan-ub:22",
    kind: "ssh",
    active: false,
  },
  {
    name: "bcl-2",
    description: "Remote SSH endpoint",
    endpoint: "ssh://claw@bcl-2:22",
    kind: "ssh",
    active: false,
  },
];

interface Resources {
  containers: Container[];
  images: Image[];
  volumes: Volume[];
  networks: Network[];
}

function seed(context: string): Resources {
  const remote = context !== "orbstack";
  return {
    containers: [
      {
        id: "a125d478849f",
        name: `${context}-api-1`,
        image: "identity-backup-api",
        state: "running",
        status: "Up 2 hours",
        ports: "0.0.0.0:8080->8080/tcp",
        running: true,
      },
      {
        id: "b93fce2210aa",
        name: `${context}-postgres-1`,
        image: "postgres:16",
        state: "running",
        status: "Up 2 hours (healthy)",
        ports: "5432/tcp",
        running: true,
      },
      {
        id: "c40aa77bd001",
        name: `${context}-worker-1`,
        image: "redis:7",
        state: "exited",
        status: "Exited (137) 9 days ago",
        ports: "",
        running: false,
      },
    ].slice(0, remote ? 2 : 3),
    images: [
      {
        id: "a70fcf540f9e",
        repository: "discovery-api",
        tag: "bb9de38",
        size: "261MB",
        created: "19 hours ago",
        containers: 1,
        dangling: false,
        inUse: true,
      },
      {
        id: "5f1e0a2b3c4d",
        repository: "postgres",
        tag: "16",
        size: "438MB",
        created: "3 weeks ago",
        containers: 1,
        dangling: false,
        inUse: true,
      },
      {
        id: "9a8b7c6d5e4f",
        repository: "<none>",
        tag: "<none>",
        size: "512MB",
        created: "2 months ago",
        containers: 0,
        dangling: true,
        inUse: false,
      },
    ],
    volumes: [
      {
        name: `${context}_postgres-data`,
        driver: "local",
        size: "49.36MB",
        links: 1,
        inUse: true,
      },
      {
        name: "hwp_converter_redis_data",
        driver: "local",
        size: "404B",
        links: 0,
        inUse: false,
      },
      {
        name: "0a40d88fdd7a8339d5227dbe6b9ede13248cab04",
        driver: "local",
        size: "128MB",
        links: 0,
        inUse: false,
      },
    ],
    networks: [
      { id: "cd03575fc45d", name: "bridge", driver: "bridge", scope: "local", predefined: true },
      { id: "1a2b3c4d5e6f", name: "host", driver: "host", scope: "local", predefined: true },
      { id: "7g8h9i0j1k2l", name: "none", driver: "null", scope: "local", predefined: true },
      {
        id: "abcdef123456",
        name: `${context}_default`,
        driver: "bridge",
        scope: "local",
        predefined: false,
      },
    ],
  };
}

const store = new Map<string, Resources>();
function resources(context: string): Resources {
  if (!store.has(context)) store.set(context, seed(context));
  return store.get(context)!;
}

/* ------------------------------- contexts ------------------------------- */

export async function listContexts(): Promise<DockerContext[]> {
  await wait(300);
  return contexts.map((context) => ({ ...context }));
}

export async function getEngineStatus(): Promise<EngineStatus> {
  await wait(220);
  return {
    state: "running",
    version: "28.0.1",
    endpoint: "unix:///Users/you/.orbstack/run/docker.sock",
  };
}

export async function switchContext(name: string): Promise<void> {
  await wait(500);
  if (!contexts.some((context) => context.name === name)) {
    throw new Error(`context "${name}" does not exist`);
  }
  contexts = contexts.map((context) => ({
    ...context,
    active: context.name === name,
  }));
}

export async function createSshContext(spec: NewSshContext): Promise<DockerContext> {
  await wait(650);
  if (contexts.some((context) => context.name === spec.name)) {
    throw new Error(`context "${spec.name}" already exists`);
  }
  const created: DockerContext = {
    name: spec.name,
    description: "Remote SSH endpoint",
    endpoint: `ssh://${spec.user}@${spec.host}:${spec.port}`,
    kind: "ssh",
    active: false,
  };
  contexts = [...contexts, created];
  return created;
}

/* ------------------------------ resources ------------------------------- */

export async function listContainers(context: string): Promise<Container[]> {
  await wait(300);
  return resources(context).containers.map((c) => ({ ...c }));
}

export async function listImages(context: string): Promise<Image[]> {
  await wait(320);
  return resources(context).images.map((i) => ({ ...i }));
}

export async function listVolumes(context: string): Promise<Volume[]> {
  await wait(360);
  return resources(context).volumes.map((v) => ({ ...v }));
}

export async function listNetworks(context: string): Promise<Network[]> {
  await wait(260);
  return resources(context).networks.map((n) => ({ ...n }));
}

export async function diskUsage(context: string): Promise<DiskCategory[]> {
  await wait(340);
  const r = resources(context);
  const reclaimableImages = r.images.filter((i) => !i.inUse).length;
  const reclaimableVolumes = r.volumes.filter((v) => !v.inUse).length;
  const stoppedContainers = r.containers.filter((c) => !c.running).length;
  return [
    {
      key: "images",
      label: "Images",
      size: "7.7GB",
      reclaimable: reclaimableImages > 0 ? "4.894GB (63%)" : "0B (0%)",
      totalCount: r.images.length,
      active: r.images.filter((i) => i.inUse).length,
      reclaimableBytes: reclaimableImages > 0,
    },
    {
      key: "containers",
      label: "Containers",
      size: "79MB",
      reclaimable: stoppedContainers > 0 ? "79MB (100%)" : "0B (0%)",
      totalCount: r.containers.length,
      active: r.containers.filter((c) => c.running).length,
      reclaimableBytes: stoppedContainers > 0,
    },
    {
      key: "volumes",
      label: "Local Volumes",
      size: "900.2MB",
      reclaimable: reclaimableVolumes > 0 ? "900MB (99%)" : "0B (0%)",
      totalCount: r.volumes.length,
      active: r.volumes.filter((v) => v.inUse).length,
      reclaimableBytes: reclaimableVolumes > 0,
    },
    {
      key: "build-cache",
      label: "Build Cache",
      size: "3.839GB",
      reclaimable: "3.013GB",
      totalCount: 91,
      active: 0,
      reclaimableBytes: true,
    },
  ];
}

export async function containerAction(
  context: string,
  id: string,
  action: ContainerAction,
): Promise<void> {
  await wait(600);
  const r = resources(context);
  const container = r.containers.find((c) => c.id === id);
  if (!container) throw new Error(`no such container: ${id}`);
  switch (action) {
    case "start":
    case "restart":
      container.running = true;
      container.state = "running";
      container.status = "Up 1 second";
      break;
    case "stop":
      container.running = false;
      container.state = "exited";
      container.status = "Exited (0) 1 second ago";
      break;
    case "remove":
      r.containers = r.containers.filter((c) => c.id !== id);
      break;
  }
}

export async function removeImage(context: string, id: string): Promise<void> {
  await wait(500);
  const r = resources(context);
  const image = r.images.find((i) => i.id === id);
  if (image?.inUse) throw new Error("image is being used by a container");
  r.images = r.images.filter((i) => i.id !== id);
}

export async function removeVolume(context: string, name: string): Promise<void> {
  await wait(500);
  const r = resources(context);
  const volume = r.volumes.find((v) => v.name === name);
  if (volume?.inUse) throw new Error("volume is in use");
  r.volumes = r.volumes.filter((v) => v.name !== name);
}

export async function removeNetwork(context: string, id: string): Promise<void> {
  await wait(450);
  const r = resources(context);
  const network = r.networks.find((n) => n.id === id);
  if (network?.predefined) throw new Error("pre-defined network cannot be removed");
  r.networks = r.networks.filter((n) => n.id !== id);
}

export async function prune(context: string, target: PruneTarget): Promise<string> {
  await wait(800);
  const r = resources(context);
  switch (target) {
    case "containers":
      r.containers = r.containers.filter((c) => c.running);
      return "Total reclaimed space: 79MB";
    case "images":
      r.images = r.images.filter((i) => i.inUse);
      return "Total reclaimed space: 4.894GB";
    case "volumes":
      r.volumes = r.volumes.filter((v) => v.inUse);
      return "Total reclaimed space: 900MB";
    case "networks":
      r.networks = r.networks.filter((n) => n.predefined || n.name.includes("_default"));
      return "Total reclaimed space: 0B";
    case "build-cache":
      return "Total reclaimed space: 3.013GB";
    case "system":
      r.containers = r.containers.filter((c) => c.running);
      r.images = r.images.filter((i) => i.inUse);
      return "Total reclaimed space: 8.7GB";
  }
}
