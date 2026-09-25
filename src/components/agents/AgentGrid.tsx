import { memo } from "react";
import { AgentCard } from "./AgentCard";
import { AgentActivity } from "./AgentActivity";
import type { Agent } from "@/types";

interface AgentGridProps {
  agents: Agent[];
  variant?: "card" | "list" | "compact";
  columns?: "auto" | 1 | 2 | 3 | 4;
  onSelect?: (agent: Agent) => void;
}

export const AgentGrid = memo(function AgentGrid({
  agents,
  variant = "card",
  columns = "auto",
  onSelect,
}: AgentGridProps) {
  if (variant === "list") {
    return (
      <div className="divide-y divide-[var(--border-subtle)">
        {agents.map((agent) => (
          <div key={agent.id} className="py-2.5 first:pt-0 last:pb-0">
            <AgentActivity agent={agent} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="space-y-1.5">
        {agents.map((agent) => (
          <AgentActivity key={agent.id} agent={agent} compact />
        ))}
      </div>
    );
  }

  const columnClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className={`grid gap-4 ${columnClass[columns]}`}>
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onClick={onSelect ? () => onSelect(agent) : undefined} />
      ))}
    </div>
  );
});
