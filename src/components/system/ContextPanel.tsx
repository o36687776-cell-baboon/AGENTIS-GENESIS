import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Card } from "@/design-system/components/Card";
import type { WorkTree } from "@/types";

interface ContextPanelProps {
  workTree: WorkTree;
}

export function ContextPanel({ workTree }: ContextPanelProps) {
  const ctx = workTree.context;

  return (
    <Card surface={3} className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <NodeIndicator color="blue" size="xs" />
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
          Current Context
        </span>
      </div>

      <div className="space-y-2.5">
        <ContextRow
          label="Project"
          value={ctx.project}
          icon="worktree"
        />
        <ContextRow
          label="Application"
          value={ctx.application}
          icon="system"
        />
        <ContextRow
          label="Documents"
          value={String(ctx.documents)}
          icon="artifacts"
          valueColor="light"
        />
        <ContextRow
          label="Active Agents"
          value={String(ctx.activeAgents)}
          icon="agents"
          valueColor="ai"
        />
        <ContextRow
          label="Recent Decisions"
          value={String(ctx.recentDecisions)}
          icon="knowledge"
        />
        <ContextRow
          label="Relevant Memory"
          value={String(ctx.relevantMemory)}
          icon="memory"
        />
        {ctx.deadline && (
          <ContextRow label="Deadline" value={ctx.deadline} icon="timeline" valueColor="warning" />
        )}
      </div>
    </Card>
  );
}

function ContextRow({
  label,
  value,
  icon,
  valueColor = "secondary",
}: {
  label: string;
  value: string;
  icon: string;
  valueColor?: "default" | "secondary" | "light" | "ai" | "primary" | "warning";
}) {
  const valueStyle = {
    default: { color: "var(--color-soft-grey)" },
    secondary: { color: "var(--color-soft-grey)" },
    light: { color: "var(--color-light-grey)" },
    ai: { color: "var(--signal-ai)" },
    primary: { color: "var(--signal-primary)" },
    warning: { color: "var(--signal-warning)" },
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon name={icon as any} size={14} className="text-[var(--color-mid-grey)]" />
        <span className="text-sm text-[var(--color-soft-grey)]">{label}</span>
      </div>
      <span
        className="font-mono text-xs"
        style={valueStyle[valueColor] ?? valueStyle.default}
      >
        {value}
      </span>
    </div>
  );
}
