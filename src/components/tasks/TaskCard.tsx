import { memo } from "react";
import { AgentAvatar } from "@/design-system/components/AgentAvatar";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Progress } from "@/design-system/components/Progress";
import { Badge } from "@/design-system/components/Badge";
import { Icon } from "@/design-system/icons";
import { getNodeStateConfig } from "@/design-system/lib/state-colors";
import { useMounted } from "@/hooks/useMounted";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const priorityColor = {
  low: "muted",
  medium: "blue",
  high: "primary",
  critical: "error",
} as const;

export const TaskCard = memo(function TaskCard({ task, onClick }: TaskCardProps) {
  const mounted = useMounted();
  const stateConfig = getNodeStateConfig(task.status);
  const isSignal = stateConfig.color !== "muted" && stateConfig.color !== "disabled";
  const isActive = task.status === "running" || task.status === "queued";

  return (
    <div
      className="group flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-charcoal)] p-4 transition-all duration-280 hover:border-[var(--border-active)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <NodeIndicator
              color={isSignal ? stateConfig.color : "muted"}
              active={isActive}
              pulse={isActive}
              size="xs"
            />
            <h3 className="font-medium text-[var(--color-light-grey)] truncate">
              {task.title}
            </h3>
            <Badge variant="subtle" color={priorityColor[task.priority]} className="font-mono text-xs">
              {task.priority.toUpperCase()}
            </Badge>
          </div>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-soft-grey)]">
              {task.description}
            </p>
          )}
        </div>
        <Badge variant="solid" color={isSignal ? stateConfig.color : "muted"} className="font-mono text-xs">
          {stateConfig.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {task.agent && (
            <>
              <AgentAvatar name={task.agent} size="sm" statusColor="success" />
              <span className="text-sm text-[var(--color-soft-grey)]">
                {task.agent}
              </span>
            </>
          )}
          {task.estimated && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-mid-grey)]">
              <Icon name="timeline" size={12} />
              {task.estimated}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.dependencies && task.dependencies.length > 0 && (
            <span className="text-xs text-[var(--color-soft-grey)]">
              {task.dependencies.length} dep{task.dependencies.length > 1 ? "s" : ""}
            </span>
          )}
          <span className="w-12 text-right font-mono text-xs text-[var(--color-light-grey)] tabular-nums">
            {task.progress}%
          </span>
        </div>
      </div>

      <Progress value={task.progress} label={false} size="sm" />

      <div className="mt-1 text-right text-mono text-xs text-[var(--color-mid-grey)]">
        Updated {mounted ? timeAgo(new Date(task.updatedAt)) : ""}
      </div>
    </div>
  );
});

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
