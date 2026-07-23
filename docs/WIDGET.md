# macOS Widget (WidgetKit)

The Notification Center / desktop widget is a **native WidgetKit extension**.
Tauri cannot build or contain a widget — WidgetKit widgets are sandboxed SwiftUI
views that render a snapshot the host app feeds them; they can't run a WebView
or execute `docker`. So the widget lives in its own Swift target and talks to
the app through a shared **App Group** file.

```
┌────────────────────┐   writes    ~/Library/Group Containers/
│  Tauri app (Rust)  │ ──────────▶  group.dev.codish.docker-context-switcher/
│  src/widget.rs     │              status.json
└────────────────────┘                     │ reads
                                            ▼
                              ┌──────────────────────────────┐
                              │  Widget extension (SwiftUI)   │
                              │  macos/DockerContextWidget/   │
                              └──────────────────────────────┘
```

The app already writes `status.json` on every refresh (see
`src-tauri/src/widget.rs`, published from `useDocker`). What remains is the
native target, which **requires a paid Apple Developer account** (App Groups and
widget signing are not available with ad-hoc signing).

## What's in this folder

| File | Purpose |
| --- | --- |
| `DockerContextWidget/DockerContextWidget.swift` | The widget: timeline provider + small/medium SwiftUI views |
| `DockerContextWidget/Info.plist` | Widget-extension Info.plist |
| `DockerContextWidget/DockerContextWidget.entitlements` | App Group entitlement for the widget (sandboxed) |
| `DockerContextSwitcher.entitlements` | App Group entitlement for the **main** app (not sandboxed) |

The App Group id and snapshot filename are duplicated in three places and must
match exactly:

- `src-tauri/src/widget.rs` → `APP_GROUP` and `status.json`
- `DockerContextWidget/*.entitlements` and `DockerContextSwitcher.entitlements`
- `DockerContextWidget.swift` → `appGroupIdentifier` / `snapshotFileName`

## One-time setup (Xcode + Apple Developer account)

1. **Create the widget target.** In an Xcode project, *File ▸ New ▸ Target ▸
   Widget Extension*. Name it `DockerContextWidget`, bundle id
   `dev.codish.docker-context-switcher.widget`. Uncheck "Include Live Activity".
   Delete the generated sources and add the files from
   `macos/DockerContextWidget/` instead. (The `@main` attribute in
   `DockerContextWidget.swift` is correct for a Widget Extension target — an
   editor may flag it when viewing the file outside a target; that's harmless.)

2. **Enable the App Group on both targets.** Select the main app target and the
   widget target → *Signing & Capabilities* → **+ Capability ▸ App Groups** →
   add `group.dev.codish.docker-context-switcher`. Set your Team on both so
   provisioning includes the group.

3. **Build & embed.** Tauri produces the main `.app`
   (`npm run tauri build` → `src-tauri/target/release/bundle/macos/`). Embed the
   built widget `.appex` and re-sign the bundle with your Developer ID and the
   main-app entitlements:

   ```bash
   APP="src-tauri/target/release/bundle/macos/Docker Context Switcher.app"
   mkdir -p "$APP/Contents/PlugIns"
   cp -R path/to/DockerContextWidget.appex "$APP/Contents/PlugIns/"

   codesign --force --sign "Developer ID Application: YOUR NAME (TEAMID)" \
     --entitlements macos/DockerContextWidget/DockerContextWidget.entitlements \
     "$APP/Contents/PlugIns/DockerContextWidget.appex"

   codesign --force --deep --sign "Developer ID Application: YOUR NAME (TEAMID)" \
     --entitlements macos/DockerContextSwitcher.entitlements \
     "$APP"
   ```

   To have `tauri build` sign the app with the App Group entitlement directly,
   point `tauri.conf.json` at the entitlements file and set a signing identity:

   ```jsonc
   "bundle": {
     "macOS": {
       "entitlements": "../macos/DockerContextSwitcher.entitlements",
       "signingIdentity": "Developer ID Application: YOUR NAME (TEAMID)"
     }
   }
   ```

   (Left unset, the current build stays unsigned/ad-hoc and the widget won't
   function — but the rest of the app still works.)

4. **Populate & add.** Launch the app once so it writes `status.json`, then add
   the *Docker Context* widget from the widget gallery (right-click desktop or
   Notification Center → Edit Widgets).

## Data contract (`status.json`)

```json
{
  "activeContext": "orbstack",
  "activeKind": "local",
  "engineState": "running",
  "contextCount": 4,
  "updatedAt": 1753260000
}
```

- `activeKind`: `local` | `ssh` | `tcp`
- `engineState`: `running` | `stopped` | `not-installed` | `unknown`
- `updatedAt`: Unix seconds (stamped by the app)

## Limitations

- The widget shows a **snapshot**, not live data — it can't run `docker`.
- WidgetKit budgets refreshes; the timeline reloads roughly every 15 minutes.
  The app rewrites the snapshot whenever its own state changes, so the widget is
  current on its next tick. Forcing an immediate reload
  (`WidgetCenter.reloadAllTimelines()`) would require a small native shim in the
  main app, which the Tauri shell doesn't currently include.
- Requires macOS 14+ (uses `containerBackground(for: .widget)`).
