import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import type { SystemStatus } from "@/types";

interface SystemStatusProps {
  status?: SystemStatus;
}

const metricRows = [
  { label: "Agents", key: "agents" as const, color: "muted" },
  { label: "Tasks", key: "tasks" as const, color: "muted" },
  { label: "Running", key: "running" as const, color: "primary" },
  { label: "Queued", key: "queued" as const, color: "muted" },
  { label: "Errors", key: "errors" as const, color: "error" },
] as const;

export function SystemStatusPanel({ status }: SystemStatusProps) {
  const data = status ?? {
    agents: 7,
    tasks: 23,
    running: 6,
    queued: 11,
    errors: 1,
    apiHealth: 99.9,
    memory: "healthy" as const,
    security: "protected" as const,
  };

  return (
    <Card surface={3} className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <NodeIndicator color="success" active size="xs" />
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
          System Status
        </span>
      </div>

      <div className="space-y-1.5">
        {metricRows.map((row) => (
          <div key={row.key} className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-soft-grey)]">{row.label}</span>
            <span
              className="font-mono text-xs"
              style={{ color: getColor(row.color) }}
            >
              {data[row.key]}
            </span>
          </div>
        ))}
        <div className="border-t border-[var(--border-subtle)] pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-soft-grey)]">API Health</span>
            <span className="font-mono text-xs text-[var(--signal-success)]">
              {data.apiHealth}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4">
        <StatusIndicator label="Memory" status={data.memory} />
        <StatusIndicator label="Security" status={data.security} />
      </div>
    </Card>
  );
}

interface StatusIndicatorProps {
  label: string;
  status: string;
}

const statusLabelMap: Record<string, Record<string, { color: string; label: string }>> =
  {
    memory: {
      healthy: { color: "success", label: "Healthy" },
      degraded: { color: "warning", label: "Degraded" },
      critical: { color: "error", label: "Critical" },
    },
    security: {
      protected: { color: "success", label: "Protected" },
      warning: { color: "warning", label: "Warning" },
      compromised: { color: "error", label: "Compromised" },
    },
  };

function StatusIndicator({ label, status }: StatusIndicatorProps) {
  const key = label.toLowerCase();
  const cfg = statusLabelMap[key]?.[status] ?? { color: "muted", label: status };

  return (
    <div className="flex items-center gap-1.5">
      <NodeIndicator color={cfg.color as any} active size="xs" />
      <span className="text-xs">
        <span className="text-[var(--color-soft-grey)]">{label}</span>{" "}
        <span style={{ color: getColor(cfg.color) }}>{cfg.label}</span>
      </span>
    </div>
  );
}

function getColor(color: string) {
  return {
    primary: "var(--signal-primary)",
    ai: "var(--signal-ai)",
    blue: "var(--signal-blue)",
    success: "var(--signal-success)",
    warning: "var(--signal-warning)",
    error: "var(--signal-error)",
    muted: "var(--color-soft-grey)",
    disabled: "var(--color-mid-grey)",
  }[color] ?? "inherit";
}
