import { Icon } from "@/design-system/icons";
import { useStore } from "@/state/store";
import type { ActiveSection } from "@/state/store";

interface NavItemProps {
  id: ActiveSection;
  label: string;
  icon: string;
  section?: string;
  indicator?: boolean;
}

export function NavItem({ id, label, icon, indicator }: NavItemProps) {
  const activeSection = useStore((s) => s.activeSection);
  const setActiveSection = useStore((s) => s.setActiveSection);
  const collapsed = useStore((s) => s.sidebarCollapsed);

  const active = activeSection === id;

  return (
    <button
      type="button"
      onClick={() => setActiveSection(id)}
      className={`nav-item group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-all duration-160 ${
        collapsed ? "justify-center" : ""
      } ${
        active
          ? "bg-[color:mix(12%,var(--signal-primary),_transparent)] text-[var(--signal-primary)]"
          : "text-[var(--color-soft-grey)] hover:text-[var(--color-off-white)] hover:bg-[var(--color-charcoal)]"
      }`}
      aria-label={label}
      title={label}
    >
      {active && (
        <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--signal-primary)]" />
      )}
      <span className="flex h-5 w-5 items-center justify-center">
        <Icon
          name={icon as any}
          size={collapsed ? 18 : 16}
          className={active ? "text-[var(--signal-primary)]" : ""}
        />
      </span>
      {!collapsed && <span>{label}</span>}
      {indicator && !collapsed && active && (
        <span className="ml-auto rounded bg-[var(--signal-ai)] px-1.5 py-0.25 text-mono text-xs">
          2
        </span>
      )}
      {!collapsed && (
        <span className="absolute inset-0 rounded-md border border-transparent opacity-0 group-hover:border-[var(--border-active)] group-hover:opacity-100 transition-opacity duration-160" />
      )}
    </button>
  );
}

interface NavSectionProps {
  label?: string;
  children: React.ReactNode;
}

export function NavSection({ label, children }: NavSectionProps) {
  return (
    <div className="mb-4">
      {label && (
        <div className="px-2.5 pb-1.5 text-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}
