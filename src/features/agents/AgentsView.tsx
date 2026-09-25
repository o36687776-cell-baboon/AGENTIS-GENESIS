import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Table, type Column } from "@/components/data/Table";
import { AgentGrid } from "@/components/agents/AgentGrid";
import { Icon } from "@/design-system/icons";
import { useAppAgents } from "@/state/store";
import type { Agent } from "@/types";

type AgentView = "grid" | "table";

const agentColumns: Column<Agent>[] = [
  {
    key: "name",
    header: "Agent",
    render: (a) => (
      <div className="flex items-center gap-2.5">
        <NodeIndicator
          color="ai"
          size="xs"
          active={a.status !== "idle" && a.status !== "completed"}
        />
        <span className="font-medium text-[var(--color-light-grey)]">{a.name}</span>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (a) => (
      <span className="text-sm text-[var(--color-soft-grey)]">{a.type}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (a) => (
      <span
        className="font-mono text-xs"
        style={{
          color: `var(--signal-${
            a.status === "executing"
              ? "primary"
              : a.status === "thinking"
              ? "ai"
              : "soft-grey"
          })`,
        }}
      >
        {a.status}
      </span>
    ),
  },
  {
    key: "model",
    header: "Model",
    render: (a) => (
      <span className="text-sm text-[var(--color-soft-grey)]">{a.model}</span>
    ),
  },
  {
    key: "progress",
    header: "Progress",
    render: (a) => (
      <span className="font-mono text-xs text-[var(--color-light-grey)] tabular-nums">
        {(a.progress ?? 0)}%
      </span>
    ),
  },
  {
    key: "tools",
    header: "Tools",
    render: (a) => (
      <span className="font-mono text-xs text-[var(--color-soft-grey)]">
        {a.tools.length}
      </span>
    ),
  },
];

export function AgentsView() {
  const { agents } = useAppAgents();
  const [view, setView] = useState<AgentView>("grid");
  const [search, setSearch] = useState("");

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-md border border-[var(--border-subtle)] bg-[var(--color-charcoal)] px-3 py-1.5 pl-9 text-sm text-[var(--color-off-white)] placeholder-[var(--color-soft-grey)] outline-none focus:border-[var(--signal-ai)]"
          />
          <Icon
            name="search"
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-soft-grey)]"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView("grid")}
            className={`rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-mono uppercase transition-all ${
              view === "grid"
                ? "border-[var(--signal-ai)] bg-[var(--color-charcoal)] text-[var(--signal-ai)]"
                : "text-[var(--color-soft-grey)] hover:border-[var(--border-active)] hover:text-[var(--color-off-white)]"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setView("table")}
            className={`rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-mono uppercase transition-all ${
              view === "table"
                ? "border-[var(--signal-ai)] bg-[var(--color-charcoal)] text-[var(--signal-ai)]"
                : "text-[var(--color-soft-grey)] hover:border-[var(--border-active)] hover:text-[var(--color-off-white)]"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <AgentGrid agents={filtered} columns={4} />
      ) : (
        <Card surface={3} border>
          <div className="p-2">
            <Table
              data={filtered}
              columns={agentColumns}
              rowKey={(a) => a.id}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
