import Link from "next/link";
import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Progress } from "@/design-system/components/Progress";
import { Badge } from "@/design-system/components/Badge";
import { Icon } from "@/design-system/icons";
import { useStore } from "@/state/store";
import { getNodeStateConfig } from "@/design-system/lib/state-colors";
import type { WorkTree } from "@/types";

export function AllWorkTrees() {
  const workTrees = useStore((s) => s.workTreeList);
  const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
  const setSelectedWorkTree = useStore((s) => s.setSelectedWorkTree);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "archived">("all");

  const filtered = workTrees.filter((w) => {
    if (filter === "active") return w.status === "running" || w.status === "queued";
    if (filter === "completed") return w.status === "completed";
    if (filter === "archived") return w.status === "archived";
    return true;
  });

  if (workTrees.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <NodeIndicator color="muted" size="lg" />
        <div>
          <h3 className="text-h3 font-medium text-[var(--color-light-grey)]">
            No Active Work Trees
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--color-soft-grey)]">
            Your workspace is clear. Start with an objective and Genesis will
            construct the work tree.
          </p>
        </div>
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="rounded-md bg-[var(--signal-primary)] px-4 py-2 text-sm font-medium text-[var(--color-void)] hover:brightness-110"
        >
          CREATE WORK TREE
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md border border-[var(--border-subtle)] px-3 py-1 text-xs font-mono uppercase transition-all ${
                filter === f
                  ? "border-[var(--signal-primary)] bg-[var(--color-charcoal)] text-[var(--signal-primary)]"
                  : "text-[var(--color-soft-grey)] hover:border-[var(--border-active)] hover:text-[var(--color-off-white)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--signal-primary)] px-3 py-1.5 text-xs font-medium text-[var(--color-void)] hover:brightness-110"
        >
          <Icon name="plus" size={14} />
          NEW WORK TREE
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((wt) => {
          const cfg = getNodeStateConfig(wt.status);
          return (
            <Link
              key={wt.id}
              href={`/work/${wt.id}`}
              onClick={() => setSelectedWorkTree(wt.id)}
              className="group block"
            >
              <Card
                surface={2}
                border
                padding="md"
                className="h-full transition-all duration-280 group-hover:border-[var(--border-active)] group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <NodeIndicator
                      color={cfg.color as any}
                      active={wt.status === "running"}
                      pulse={wt.status === "running"}
                      size="sm"
                    />
                    <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
                      WORK TREE
                    </span>
                  </div>
                  <Badge variant="subtle" color={cfg.color as any} className="font-mono text-xs">
                    {cfg.label}
                  </Badge>
                </div>

                <h3 className="text-h4 font-medium text-[var(--color-off-white)] group-hover:text-[var(--signal-primary)] transition-colors">
                  {wt.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--color-soft-grey)]">
                  {wt.objective}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-[var(--color-soft-grey)]">
                    <Icon name="agents" size={12} />
                    {wt.agents.length} agents
                  </span>
                  <span className="font-mono text-[var(--color-light-grey)] tabular-nums">
                    {wt.progress}%
                  </span>
                </div>

                <div className="mt-2 w-20">
                  <Progress value={wt.progress} label={false} size="sm" />
                </div>

                <div className="mt-3 flex gap-2 text-xs text-[var(--color-soft-grey)]">
                  <span className="flex items-center gap-1">
                    <Icon name="artifacts" size={12} />
                    {wt.artifacts.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="timeline" size={12} />
                    {wt.approvals.length} approvals
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="warning" size={12} />
                    {wt.risks} risks
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
