# Contributing

Thanks for your interest in improving Docker Context Switcher! This document
covers how to get set up and what we look for in a change.

By participating, you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Development setup

Prerequisites: Node.js 20+, Rust (stable, via [rustup](https://rustup.rs)),
Xcode Command Line Tools, and a working Docker CLI.

```bash
npm install
npm run tauri dev   # full app
npm run dev         # UI only, against the in-memory mock (no Rust/Docker)
```

## Project layout

- `src/` — React + TypeScript frontend. `lib/backend.ts` is the single typed
  boundary to Rust and falls back to `lib/mock.ts` outside the Tauri shell.
- `src-tauri/src/` — Rust backend. `docker.rs` holds the typed Docker
  operations, `platform.rs` the `run_docker` primitive and OS seams, `tray.rs`
  the menu-bar integration, `commands.rs` the thin IPC wrappers.

See the [Architecture section of the README](./README.md#architecture) for the
bigger picture.

## Coding conventions

**Rust**

- Format with `cargo fmt` and keep `cargo clippy --all-targets` warning-free —
  CI enforces both.
- **Never build shell command strings.** All process execution goes through
  `platform::run_docker`, which takes an argument vector. User-supplied values
  (context names, hosts, ids) must be passed as separate args, never
  interpolated into a command line.
- Keep OS-specific behaviour (binary names, socket paths, activation policy)
  inside `platform.rs` so Windows/Linux support stays a matter of extending
  that module.

**TypeScript / React**

- `tsc` runs in `strict` mode; keep it clean (CI runs `npm run build`).
- Presentational components stay dumb; data flows through the `useDocker` /
  `useResources` hooks.

**Adding an IPC command**

1. Implement the typed operation in `src-tauri/src/docker.rs`.
2. Add a `#[tauri::command]` wrapper in `commands.rs` and register it in
   `lib.rs`.
3. Add the matching wrapper in `src/lib/backend.ts` **and** a mock in
   `src/lib/mock.ts` so the browser preview keeps working.

## Commit messages

Write imperative, present-tense summaries ("Add volume prune", not "Added…").
Keep the subject under ~72 characters and explain the *why* in the body when it
isn't obvious.

## Pull requests

1. Fork and create a topic branch off `main`.
2. Make your change; ensure CI passes locally:
   ```bash
   npm run build
   cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo build
   ```
3. Open a PR describing the change and how you tested it. Screenshots or a short
   clip are very welcome for UI changes.

## Reporting bugs & requesting features

Use the [issue templates](https://github.com/danielinspring/docker-context-switcher/issues/new/choose).
For anything security-sensitive, follow [SECURITY.md](./SECURITY.md) instead of
opening a public issue.
