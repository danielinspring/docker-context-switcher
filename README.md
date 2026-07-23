# Docker Context Switcher

A liquid-glass desktop app for switching Docker contexts between local engines
and remote SSH endpoints — built with Tauri, React, Tailwind CSS, and
Framer Motion.

> **Status: working.** The Rust backend drives the real `docker` CLI; the
> React UI runs against it, and falls back to an in-memory mock when served
> outside the Tauri shell (`npm run dev`) so the interface stays reviewable
> without a daemon.

## Features

- **Local engine status** — live indicator for the local Docker engine:
  🟢 running / 🟡 stopped / 🔴 not installed.
- **Context discovery** — lists every Docker context on the machine and
  highlights the active one.
- **One-click switching** — selecting a context runs `docker context use
  <name>`, so the change persists for every terminal session.
- **Remote SSH registration** — a form that creates
  `ssh://user@host:port` contexts for NAS boxes, lab servers, etc.
- **Resource console** — for the active context (local *or* remote SSH):
  - **Containers** with live state, plus start / stop / restart / remove.
  - **Images**, **Volumes**, and **Networks** with in-use vs. unused flags.
  - **Disk usage** per category (`docker system df`) showing size and exactly
    what is reclaimable, with a one-click **prune** for each — plus targeted
    `docker …prune` and per-item removal, all gated by a confirmation that
    shows the exact command before it runs.
- **Liquid Glass UI** — real macOS window vibrancy (Tauri `windowEffects`)
  under frosted glass panels, drifting aurora gradients, and spring-physics
  transitions.

## Development

```bash
npm install

# Full desktop app (macOS vibrancy, Rust backend)
npm run tauri dev

# UI-only preview in a browser (mock backend, no Rust toolchain needed)
npm run dev
```

Production bundle (`.app` + `.dmg`):

```bash
npm run tauri build
```

Prerequisites: Node 20+, Rust stable, and Xcode command line tools.

## Architecture

```
src/                      React + TypeScript frontend
├── components/           Presentational components (glass design system)
├── hooks/useDocker.ts    Single source of truth for contexts + engine state
├── lib/backend.ts        Typed IPC boundary — falls back to lib/mock.ts
│                         when running outside the Tauri shell
└── styles/global.css     Liquid Glass tokens (Tailwind v4 @theme)

src-tauri/                Rust backend (Tauri v2)
├── src/commands.rs       IPC commands — thin wrappers over docker.rs
├── src/docker.rs         Typed Docker operations (parse CLI JSON, mutations)
├── src/platform.rs       OS seams + the run_docker primitive (timeout, PATH)
└── tauri.conf.json       Transparent window + native vibrancy config
```

### Design decisions

- **Context discovery uses `docker context ls --format json`,** not
  `~/.docker/config.json`. The config file only stores `currentContext`;
  context definitions live under `~/.docker/contexts/meta/<hash>/meta.json`,
  so the CLI is the only stable, documented interface.
- **`docker context use` persists globally**, but shells that export
  `DOCKER_HOST` or `DOCKER_CONTEXT` override it. Phase 2 will detect and
  surface that so a switch never *silently* fails to take effect.
- **Engine status is probed against the active local context's endpoint**
  (e.g. OrbStack/Docker Desktop sockets), not a hardcoded
  `/var/run/docker.sock`.
- **All process execution uses argument vectors, never shell strings**, so
  user-supplied names/hosts can't inject commands.
- **Everything OS-specific lives in `src-tauri/src/platform.rs`** — Windows
  (named pipes, `docker.exe`) and Linux support extend that module only.

## Roadmap

- [x] Phase 1 — repository scaffold, Liquid Glass UI, window config
- [x] Phase 2 — Rust backend: context ls/use/create, engine ping
- [x] Phase 3 — resource console (containers/images/volumes/networks), disk
      usage + prune, confirm gating
- [ ] Phase 4 — menu-bar quick switcher, per-context health polling,
      Windows/Linux builds

## License

[MIT](./LICENSE)
