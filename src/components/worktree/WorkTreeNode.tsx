import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { StatusDot } from "@/design-system/components/StatusDot";
import { Progress } from "@/design-system/components/Progress";
import { Badge } from "@/design-system/components/Badge";
import type { ChipProps } from "@/design-system/components/Chip";
import { Chip } from "@/design-system/components/Chip";
import { AgentAvatar } from "@/design-system/components/AgentAvatar";
import { getNodeStateConfig } from "@/design-system/lib/state-colors";
import type { WorkTreeNode } from "@/types";

interface WorkTreeNodeProps {
  node: WorkTreeNode;
  depth?: number;
  expanded?: boolean;
  onSelect?: (node: WorkTreeNode) => void;
}

const typeConfig: Record<WorkTreeNode["type"], { label: string; icon: string; color: ChipProps["color"] }> = {
  objective: { label: "Objective", icon: "signal", color: "primary" },
  context: { label: "Context", icon: "knowledge", color: "blue" },
  agent: { label: "Agent", icon: "agents", color: "ai" },
  task: { label: "Task", icon: "tasks", color: "primary" },
  artifact: { label: "Artifact", icon: "artifacts", color: "blue" },
  approval: { label: "Approval", icon: "alert", color: "warning" },
  risk: { label: "Risk", icon: "warning", color: "warning" },
  outcome: { label: "Outcome", icon: "check", color: "success" },
};

export function WorkTreeNodeComponent({
  node,
  depth = 0,
  expanded = true,
  onSelect,
}: WorkTreeNodeProps) {
  const config = typeConfig[node.type] ?? typeConfig.context;
  const stateConfig = getNodeStateConfig(node.state);
  const isInteractive = !!onSelect;

  const handleClick = () => {
    if (isInteractive && onSelect) onSelect(node);
  };

  return (
    <div
      className={`group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-all duration-160 hover:bg-[var(--color-charcoal)] ${
        stateConfig.color !== "muted" && stateConfig.color !== "disabled"
          ? "border-l-2 border-transparent hover:border-[var(--signal-primary)]"
          : ""
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={handleClick}
      role={isInteractive ? "button" : undefined}
    >
      <NodeIndicator
        color={
          node.state === "running"
            ? "primary"
            : node.state === "completed"
            ? "success"
            : node.state === "failed"
            ? "error"
            : node.state === "blocked"
            ? "warning"
            : node.progress && node.progress > 0
            ? "ai"
            : "muted"
        }
        active={node.state === "running"}
        pulse={node.state === "running"}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--color-off-white)] truncate">
            {node.title}
          </span>
          <Chip label={config.label} color={config.color} size="sm" />
          {node.state === "running" && (
            <Badge variant="subtle" color="primary" className="font-mono text-xs">
              {stateConfig.label.toUpperCase()}
            </Badge>
          )}
          {node.state === "completed" && (
            <Badge variant="subtle" color="success" className="font-mono text-xs">
              {stateConfig.label.toUpperCase()}
            </Badge>
          )}
          {node.state === "failed" && (
            <Badge variant="subtle" color="error" className="font-mono text-xs">
              {stateConfig.label.toUpperCase()}
            </Badge>
          )}
        </div>

        {node.description && (
          <p className="mt-0.5 text-sm text-[var(--color-soft-grey)] line-clamp-1">
            {node.description}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-4 text-xs text-[var(--color-soft-grey)]">
          {node.agent && (
            <span className="flex items-center gap-1.5">
              <AgentAvatar name={node.agent} statusColor="success" size="sm" />
              <span>{node.agent}</span>
            </span>
          )}
          {node.owner && (
            <span className="flex items-center gap-1">
              <StatusDot color="muted" size="xs" />
              <span>{node.owner}</span>
            </span>
          )}
          {typeof node.progress === "number" && node.progress >= 0 && (
            <div className="flex items-center gap-2">
              <Progress value={node.progress} label={false} size="sm" />
            </div>
          )}
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="flex items-center">
          <button
            type="button"
            className="rounded p-0.5 text-[var(--color-soft-grey)] hover:text-[var(--color-off-white)]"
          >
            <Icon name={expanded ? "chevron-down" : "chevron-right"} size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
