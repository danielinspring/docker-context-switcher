/**
 * Custom title bar for the frameless-feeling window.
 * `data-tauri-drag-region` keeps the whole strip draggable; macOS traffic
 * lights overlay the top-left corner (`titleBarStyle: "Overlay"`).
 */
export function TitleBar() {
  return (
    <header
      data-tauri-drag-region
      className="relative z-20 flex h-12 shrink-0 items-center justify-center"
    >
      <span className="pointer-events-none text-[13px] font-medium tracking-wide text-white/45">
        Docker Context Switcher
      </span>
    </header>
  );
}
