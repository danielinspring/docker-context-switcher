//! Bridge that feeds the macOS WidgetKit extension.
//!
//! WidgetKit widgets are sandboxed SwiftUI views that cannot run `docker`
//! themselves; they only render a snapshot the host app hands them. This app
//! (non-sandboxed) writes that snapshot as JSON into the shared **App Group**
//! container, and the widget reads it via
//! `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)`.
//!
//! The group id and the `status.json` filename must stay in sync with
//! `macos/DockerContextWidget/DockerContextWidget.swift`. See `docs/WIDGET.md`.

use serde::{Deserialize, Serialize};

/// App Group shared by the main app and the widget extension.
/// Must match the entitlement on both Xcode targets.
pub const APP_GROUP: &str = "group.dev.codish.docker-context-switcher";

/// The compact status the widget renders. Mirrors the Swift `Snapshot` struct.
#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WidgetSnapshot {
    pub active_context: String,
    /// `local` | `ssh` | `tcp`
    pub active_kind: String,
    /// `running` | `stopped` | `not-installed` | `unknown`
    pub engine_state: String,
    pub context_count: u32,
    /// Unix seconds; stamped here so the writer stays the single source of time.
    #[serde(default)]
    pub updated_at: u64,
}

/// Persist the snapshot for the widget. No-op (Ok) on non-macOS targets so the
/// shared command surface stays identical across platforms.
pub fn write_snapshot(mut snapshot: WidgetSnapshot) -> Result<(), String> {
    snapshot.updated_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    #[cfg(target_os = "macos")]
    {
        use std::fs;
        use std::path::PathBuf;

        let home = std::env::var_os("HOME").ok_or("HOME is not set")?;
        let dir = PathBuf::from(home)
            .join("Library/Group Containers")
            .join(APP_GROUP);
        fs::create_dir_all(&dir).map_err(|e| format!("create group container: {e}"))?;

        let json =
            serde_json::to_string_pretty(&snapshot).map_err(|e| format!("serialize: {e}"))?;
        fs::write(dir.join("status.json"), json).map_err(|e| format!("write snapshot: {e}"))?;
    }

    #[cfg(not(target_os = "macos"))]
    let _ = snapshot;

    Ok(())
}
