import { useStore } from "@/state/store";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { CommandBar } from "./CommandBar";
import { CommandCenter } from "@/components/command/CommandCenter";
import { Breadcrumb } from "./Breadcrumb";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { useEffect } from "react";

export function AppShell({
  children,
  title = "AGENTIS GENESIS",
  breadcrumb,
}: {
  children: React.ReactNode;
  title?: string;
  breadcrumb?: Parameters<typeof Breadcrumb>[0]["items"];
}) {
  const commandCenterOpen = useStore((s) => s.commandCenterOpen);
  const setCommandCenterOpen = useStore((s) => s.setCommandCenterOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandCenterOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === "Escape" && commandCenterOpen) {
        e.preventDefault();
        setCommandCenterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setCommandCenterOpen, toggleSidebar, commandCenterOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <StatusBar title={title} />

        <main className="relative flex-1 overflow-y-auto">
          {breadcrumb && (
            <div className="border-b border-[var(--border-subtle)] bg-[var(--color-black)] px-4 py-2.5">
              <Breadcrumb items={breadcrumb} />
            </div>
          )}
          <div className="p-5">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>

        <CommandBar />
      </div>

      <CommandCenter open={commandCenterOpen} onClose={() => setCommandCenterOpen(false)} />
    </div>
  );
}
