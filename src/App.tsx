import { Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { AddContextModal } from "./components/AddContextModal";
import { ContextList } from "./components/ContextList";
import { EngineStatusCard } from "./components/EngineStatusCard";
import { GlassButton } from "./components/glass/GlassButton";
import { AuroraBackground } from "./components/layout/AuroraBackground";
import { FooterBar } from "./components/layout/FooterBar";
import { TitleBar } from "./components/layout/TitleBar";
import { ResourceConsole } from "./components/resources/ResourceConsole";
import { useDocker } from "./hooks/useDocker";

export default function App() {
  const docker = useDocker();
  const [modalOpen, setModalOpen] = useState(false);
  const activeContext = docker.contexts.find((context) => context.active);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <AuroraBackground />

      <TitleBar />

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Left rail — engine + context switcher */}
        <aside className="flex w-[360px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-white/[0.07] px-5 pb-5 pt-1">
          <EngineStatusCard engine={docker.engine} />

          <section className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                Contexts
              </h2>
              <div className="flex items-center gap-2">
                <GlassButton onClick={docker.refresh} aria-label="Refresh contexts">
                  <RefreshCw className="h-4 w-4" />
                </GlassButton>
                <GlassButton variant="primary" onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add
                </GlassButton>
              </div>
            </div>

            {docker.error && (
              <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {docker.error}
              </p>
            )}

            <ContextList
              contexts={docker.contexts}
              loading={docker.loading}
              switching={docker.switching}
              onUse={docker.switchTo}
            />
          </section>
        </aside>

        {/* Right pane — resource console for the active context */}
        <main className="min-w-0 flex-1 px-6 pb-5 pt-1">
          <ResourceConsole context={activeContext} />
        </main>
      </div>

      <FooterBar active={activeContext} />

      <AddContextModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={docker.addSshContext}
      />
    </div>
  );
}
