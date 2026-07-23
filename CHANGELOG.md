# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- macOS widget (WidgetKit): app-side bridge that publishes a status snapshot to
  a shared App Group (`src-tauri/src/widget.rs`), plus a scaffolded SwiftUI
  widget extension under `macos/`. Building the widget requires an Apple
  Developer account — see `docs/WIDGET.md`.

## [0.1.0] - 2026-07-23

### Added

- Liquid Glass desktop UI (Tauri 2 + React + Tailwind + Framer Motion) with
  native macOS window vibrancy.
- Context management: discover contexts (`docker context ls`), switch the active
  context (`docker context use`), and register remote SSH endpoints
  (`docker context create --docker host=ssh://…`).
- Local Docker engine status indicator (running / stopped / not installed).
- Resource console for the active context (local or SSH): containers with
  start / stop / restart / remove; images, volumes, and networks with in-use
  flags and per-item removal.
- Per-category disk usage (`docker system df`) with reclaimable amounts and
  one-click prune, gated by a command-preview confirmation dialog.
- macOS menu-bar (tray) icon with minimize-to-tray and window toggle.
- Whale app + tray icons.

[Unreleased]: https://github.com/danielinspring/docker-context-switcher/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/danielinspring/docker-context-switcher/releases/tag/v0.1.0
