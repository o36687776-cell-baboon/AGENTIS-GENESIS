import { useStore, ActiveSection } from "@/state/store";
import { NavItem, NavSection } from "./NavItem";
import { Icon } from "@/design-system/icons";

export function Sidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  const navItems: Array<{
    id: ActiveSection;
    label: string;
    icon: string;
    indicator?: boolean;
  }> = [
    { id: "dashboard", label: "Home", icon: "home" },
    { id: "worktrees", label: "Work Trees", icon: "worktree" },
    { id: "agents", label: "Agents", icon: "agents" },
    { id: "tasks", label: "Tasks", icon: "tasks" },
    { id: "artifacts", label: "Artifacts", icon: "artifacts" },
    { id: "automations", label: "Automations", icon: "automations" },
    { id: "memory", label: "Memory", icon: "memory" },
    { id: "knowledge", label: "Knowledge", icon: "knowledge" },
  ];

  const systemItems = [
    { id: "system" as ActiveSection, label: "System", icon: "system" },
    { id: "settings" as ActiveSection, label: "Settings", icon: "settings" },
  ];

  return (
    <nav
      className={`relative flex h-screen flex-col overflow-y-auto overflow-x-hidden border-r border-[var(--border-subtle)] bg-[var(--color-black)] transition-[width] duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      <div className="p-4">
        <div className={`mb-6 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <span className="flex h-8 w-8 items-center justify-center">
            <Icon name="command" size={20} className="text-[var(--signal-primary)]" />
          </span>
          {!collapsed && (
            <>
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--signal-primary)]">
                AGENTIS
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-light-grey)]">
                GENESIS
              </span>
            </>
          )}
        </div>
        <div className="mb-2 h-px bg-[var(--border-subtle)]" />
        <NavSection>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              indicator={item.indicator}
            />
          ))}
        </NavSection>
        <div className="my-4 h-px bg-[var(--border-subtle)]" />
        <NavSection label="SYSTEM">
          {systemItems.map((item) => (
            <NavItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </NavSection>
        <div className="mt-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="nav-item group relative flex w-full items-center justify-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-[var(--color-soft-grey)] hover:text-[var(--color-off-white)] hover:bg-[var(--color-charcoal)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <Icon name="expand" size={16} />
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="collapse" size={16} />
                <span>Collapse</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
