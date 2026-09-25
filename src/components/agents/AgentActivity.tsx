import { memo } from "react";
import { motion } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";
import { AgentAvatar } from "@/design-system/components/AgentAvatar";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Badge } from "@/design-system/components/Badge";
import { Icon } from "@/design-system/icons";
import { getAgentStatusConfig } from "@/design-system/lib/state-colors";
import type { Agent } from "@/types";

interface AgentActivityProps {
  agent: Agent;
  compact?: boolean;
}

export const AgentActivity = memo(function AgentActivity({
  agent,
  compact = false,
}: AgentActivityProps) {
  const statusConfig = getAgentStatusConfig(agent.status);
  const isSignal = statusConfig.color !== "muted" && statusConfig.color !== "disabled";
  const isActive = agent.status !== "idle" && agent.status !== "completed";
  const mounted = useMounted();

  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        <AgentAvatar
          name={agent.name}
          avatar={agent.avatar}
          size="sm"
          statusColor={isSignal ? statusConfig.color : "muted"}
          active={isActive}
          pulse={isActive}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[var(--color-light-grey)]">
              {agent.name}
            </span>
            <Badge variant="subtle" color={isSignal ? statusConfig.color : "muted"} className="font-mono text-xs">
              {statusConfig.label}
            </Badge>
          </div>
          {agent.currentTask && (
            <p className="text-sm text-[var(--color-soft-grey)] truncate">
              {agent.currentTask}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs">
          {isActive && (
            <div className="agent-orbit">
              <NodeIndicator color={isSignal ? statusConfig.color : "muted"} size="xs" />
            </div>
          )}
          <span className="font-mono text-[var(--color-soft-grey)] tabular-nums">
            {agent.progress ?? 0}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {isActive && mounted && (
          <motion.span
            className="absolute -inset-1 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(155,123,255,0.3) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        <AgentAvatar
          name={agent.name}
          avatar={agent.avatar}
          size="md"
          statusColor={isSignal ? statusConfig.color : "muted"}
          active={isActive}
          pulse={isActive}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-[var(--color-off-white)]">
            {agent.name}
          </span>
          <Badge variant="subtle" color={isSignal ? statusConfig.color : "muted"} className="font-mono text-xs">
            {statusConfig.label}
          </Badge>
        </div>
        {agent.currentTask && (
          <p className="text-sm text-[var(--color-soft-grey)]">
            {agent.currentTask}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-[var(--color-soft-grey)] tabular-nums">
          {(agent.progress ?? 0).toString().padStart(2, "0")}%
        </span>
      </div>
    </div>
  );
});
