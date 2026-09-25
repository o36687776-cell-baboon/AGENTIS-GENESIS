import { useStore } from "@/state/store";
import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";

interface StatusBarProps {
  title?: string;
}

export function StatusBar({ title }: StatusBarProps) {
  const statusMenuOpen = useStore((s) => s.statusMenuOpen);
  const toggleStatusMenu = useStore((s) => s.toggleStatusMenu);
  const toggleCommandCenter = useStore((s) => s.toggleCommandCenter);
  const systemStatus = useStore((s) => s.systemStatus);

  return (
    <header className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--color-black)] px-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-[var(--color-soft-grey)]">
          {title ?? "AGENTIS GENESIS"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 rounded-md opacity-0 ring-1 ring-[var(--signal-primary)] ring-offset-2 ring-offset-[var(--color-void)] transition-opacity peer-focus-within:opacity-100" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 rounded-md border border-[var(--border-subtle)] bg-[var(--color-charcoal)] px-2.5 py-1.5 text-sm text-[var(--color-off-white)] placeholder-[var(--color-soft-grey)] outline-none transition-colors focus:border-[var(--signal-primary)]"
            onFocus={() => toggleCommandCenter()}
            readOnly
          />
          <Icon
            name="search"
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-soft-grey)]"
          />
        </div>
        {systemStatus && (
          <SystemStatusMenu
            open={statusMenuOpen}
            onToggle={toggleStatusMenu}
            status={systemStatus}
          />
        )}
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-soft-grey)]">
          <NodeIndicator color="success" size="sm" active />
          <span className="font-mono">ONLINE</span>
        </div>
      </div>
    </header>
  );
}

function SystemStatusMenu({
  open,
  onToggle,
  status,
}: {
  open: boolean;
  onToggle: () => void;
  status: {
    agents: number;
    tasks: number;
    running: number;
    queued: number;
    errors: number;
    apiHealth: number;
  };
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-soft-grey)] hover:text-[var(--color-off-white)] hover:bg-[var(--color-charcoal)]"
      >
        <NodeIndicator color="primary" size="xs" active />
        GENESIS ONLINE
        <Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 w-64 rounded-lg border border-[var(--border-default)] bg-[var(--color-charcoal)] p-3 text-xs shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="font-mono text-[var(--color-soft-grey)]">
            <StatusRow label="Agents" value={String(status.agents)} />
            <StatusRow label="Tasks" value={String(status.tasks)} />
            <StatusRow label="Running" value={String(status.running)} accent="primary" />
            <StatusRow label="Queued" value={String(status.queued)} />
            <StatusRow label="Errors" value={String(status.errors)} accent="error" />
            <StatusRow
              label="API Health"
              value={`${status.apiHealth}%`}
              accent="success"
            />
            <div className="mt-2 border-t border-[var(--border-subtle)] pt-2 font-mono text-[var(--color-success)]">
              <span className="flex justify-between">
                <span>Memory</span>
                <span>Healthy</span>
              </span>
              <span className="flex justify-between">
                <span>Security</span>
                <span>Protected</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "error" | "success";
}) {
  const accentColor = accent
    ? { primary: "var(--signal-primary)", error: "var(--signal-error)", success: "var(--signal-success)" }[accent]
    : "inherit";
  return (
    <div className="flex justify-between py-0.5">
      <span style={{ color: "var(--color-light-grey)" }}>{label}</span>
      <span style={{ color: accentColor }}>{value}</span>
    </div>
  );
}
