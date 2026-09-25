import { memo } from "react";
import { AgentAvatar } from "@/design-system/components/AgentAvatar";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Progress } from "@/design-system/components/Progress";
import { Badge } from "@/design-system/components/Badge";
import { Chip } from "@/design-system/components/Chip";
import { Button } from "@/design-system/components/Button";
import { Icon } from "@/design-system/icons";
import { getAgentStatusConfig } from "@/design-system/lib/state-colors";
import { formatTokens } from "@/design-system/utils";
import type { Agent } from "@/types";

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

export const AgentCard = memo(function AgentCard({ agent, onClick }: AgentCardProps) {
  const statusConfig = getAgentStatusConfig(agent.status);
  const isSignal = statusConfig.color !== "muted" && statusConfig.color !== "disabled";
  const isActive = agent.status !== "idle" && agent.status !== "completed";

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--color-charcoal)] p-4 transition-all duration-280 hover:border-[var(--border-active)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="mb-3 flex items-center justify-between">
        <AgentAvatar
          name={agent.name}
          avatar={agent.avatar}
          statusColor={isSignal ? statusConfig.color : "muted"}
          active={isActive}
          pulse={isActive}
          size="md"
        />
        <Chip label={agent.version} color="muted" size="sm" />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <NodeIndicator
          color={isSignal ? statusConfig.color : "muted"}
          active={isActive}
          pulse={isActive}
          size="xs"
        />
        <span className="font-mono text-xs uppercase tracking-[0.1em]">
          {statusConfig.label.toUpperCase()}
        </span>
      </div>

      <h3 className="text-h4 font-medium text-[var(--color-off-white)]">
        {agent.name}
      </h3>
      <p className="mt-0.5 text-sm text-[var(--color-soft-grey)]">
        {agent.type} · {agent.model}
      </p>

      {agent.currentTask && (
        <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--color-deep-black)] p-2.5">
          <div className="text-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]">
            Current task
          </div>
          <p className="mt-0.5 text-sm text-[var(--color-light-grey)]">
            {agent.currentTask}
          </p>
        </div>
      )}

      <div className="mt-3 space-y-1">
        <MetricRow label="Tools" value={String(agent.tools.length)} />
        <MetricRow label="Sources" value={String(agent.resourceUsage.sources)} />
        <MetricRow label="Tokens" value={formatTokens(agent.resourceUsage.tokens)} />
      </div>

      <div className="mt-4">
        <Progress value={agent.progress ?? 0} label size="sm" />
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="ghost" size="sm" icon={<Icon name="check" size={14} />}>
          VIEW
        </Button>
        <Button variant="ghost" size="sm" icon={<Icon name={isActive ? "pause" : "play"} size={14} />}>
          {isActive ? "PAUSE" : "RUN"}
        </Button>
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          boxShadow: isActive
            ? "0 0 0 1px rgba(217,255,0,0.1), 0 0 12px rgba(217,255,0,0.1)"
            : undefined,
        }}
      />
    </div>
  );
});

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--color-soft-grey)]">{label}</span>
      <span className="font-mono text-[var(--color-light-grey)] tabular-nums">
        {value.padStart(2, "0")}
      </span>
    </div>
  );
}
