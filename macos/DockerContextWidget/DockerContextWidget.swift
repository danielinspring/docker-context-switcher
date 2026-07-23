import SwiftUI
import WidgetKit

// These three constants must stay in sync with `src-tauri/src/widget.rs`
// (APP_GROUP + the `status.json` filename) and with the App Group capability
// added to BOTH the widget and the main-app targets in Xcode.
private let appGroupIdentifier = "group.dev.codish.docker-context-switcher"
private let snapshotFileName = "status.json"

// MARK: - Shared model (mirrors the Rust `WidgetSnapshot`)

struct Snapshot: Codable {
    var activeContext: String
    var activeKind: String // "local" | "ssh" | "tcp"
    var engineState: String // "running" | "stopped" | "not-installed" | "unknown"
    var contextCount: Int
    var updatedAt: TimeInterval

    static let placeholder = Snapshot(
        activeContext: "orbstack",
        activeKind: "local",
        engineState: "running",
        contextCount: 3,
        updatedAt: Date().timeIntervalSince1970
    )
}

private func loadSnapshot() -> Snapshot? {
    guard
        let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupIdentifier
        ),
        let data = try? Data(contentsOf: container.appendingPathComponent(snapshotFileName))
    else { return nil }
    return try? JSONDecoder().decode(Snapshot.self, from: data)
}

// MARK: - Timeline

struct DockerEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?
}

struct Provider: TimelineProvider {
    func placeholder(in _: Context) -> DockerEntry {
        DockerEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (DockerEntry) -> Void) {
        let snapshot = context.isPreview ? .placeholder : (loadSnapshot() ?? .placeholder)
        completion(DockerEntry(date: Date(), snapshot: snapshot))
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<DockerEntry>) -> Void) {
        let entry = DockerEntry(date: Date(), snapshot: loadSnapshot())
        // WidgetKit budgets refreshes; poll ~every 15 min. The app rewrites the
        // snapshot whenever its own state changes, so it's fresh on the next tick.
        let next = Date().addingTimeInterval(15 * 60)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Presentation helpers

private func engineColor(_ state: String) -> Color {
    switch state {
    case "running": return Color(red: 0.20, green: 0.83, blue: 0.60)
    case "stopped": return Color(red: 0.98, green: 0.75, blue: 0.14)
    case "not-installed": return Color(red: 0.97, green: 0.44, blue: 0.44)
    default: return Color.gray
    }
}

private func engineLabel(_ state: String) -> String {
    switch state {
    case "running": return "Running"
    case "stopped": return "Stopped"
    case "not-installed": return "Not installed"
    default: return "Unknown"
    }
}

// MARK: - Views

struct SmallView: View {
    let snapshot: Snapshot?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("🐋").font(.system(size: 26))
            Spacer(minLength: 0)
            if let snapshot {
                Text(snapshot.activeContext)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                HStack(spacing: 5) {
                    Circle().fill(engineColor(snapshot.engineState)).frame(width: 8, height: 8)
                    Text(engineLabel(snapshot.engineState))
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
                Text("\(snapshot.contextCount) contexts")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.45))
            } else {
                Text("Open Docker Context Switcher")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct MediumView: View {
    let snapshot: Snapshot?

    var body: some View {
        HStack(spacing: 16) {
            Text("🐋").font(.system(size: 44))

            VStack(alignment: .leading, spacing: 6) {
                if let snapshot {
                    HStack(spacing: 8) {
                        Text(snapshot.activeContext)
                            .font(.title3).bold()
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        if snapshot.activeKind == "ssh" {
                            Text("SSH")
                                .font(.caption2).bold()
                                .padding(.horizontal, 5).padding(.vertical, 2)
                                .background(Color.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 4))
                                .foregroundStyle(.white.opacity(0.85))
                        }
                    }
                    HStack(spacing: 6) {
                        Circle().fill(engineColor(snapshot.engineState)).frame(width: 9, height: 9)
                        Text(engineLabel(snapshot.engineState))
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.8))
                    }
                    HStack(spacing: 4) {
                        Text("\(snapshot.contextCount) contexts · updated")
                        Text(Date(timeIntervalSince1970: snapshot.updatedAt), style: .relative)
                    }
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.45))
                } else {
                    Text("No data yet")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Open Docker Context Switcher once to populate the widget.")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct DockerContextWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            switch family {
            case .systemMedium: MediumView(snapshot: entry.snapshot)
            default: SmallView(snapshot: entry.snapshot)
            }
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [
                    Color(red: 0.07, green: 0.17, blue: 0.34),
                    Color(red: 0.02, green: 0.03, blue: 0.06),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

// MARK: - Widget

@main
struct DockerContextWidget: Widget {
    let kind = "DockerContextWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DockerContextWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Docker Context")
        .description("The active Docker context and local engine status.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
