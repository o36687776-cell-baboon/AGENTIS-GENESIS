import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { MemoryTree } from "@/components/memory/MemoryTree";
import { Table } from "@/components/data/Table";
import { Icon } from "@/design-system/icons";
import { formatDate } from "@/lib/date";
import { useStore } from "@/state/store";
import { mockMemory } from "@/data/mockData";
import { getConfidenceConfig } from "@/design-system/lib/state-colors";

type MemoryView = "tree" | "table";

export function MemoryView() {
  const [view, setView] = useState<MemoryView>("tree");
  const [domain, setDomain] = useState<"all" | "personal" | "project" | "organization">("all");

  const items = mockMemory.filter((i) => (domain === "all" ? true : i.domain === domain));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NodeIndicator color="ai" size="sm" />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Knowledge Memory
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "personal", "project", "organization"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              className={`rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-mono uppercase transition-all ${
                domain === d
                  ? "border-[var(--signal-primary)] bg-[var(--color-charcoal)] text-[var(--signal-primary)]"
                  : "text-[var(--color-soft-grey)] hover:border-[var(--border-active)] hover:text-[var(--color-off-white)]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView("tree")}
            className={`rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-mono uppercase transition-all ${
              view === "tree"
                ? "border-[var(--signal-primary)] bg-[var(--color-charcoal)] text-[var(--signal-primary)]"
                : "text-[var(--color-soft-grey)] hover:border-[var(--border-active)] hover:text-[var(--color-off-white)]"
            }`}
          >
            Tree
          </button>
          <button
            onClick={() => setView("table")}
            className={`rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-mono uppercase transition-all ${
              view === "table"
                ? "border-[var(--signal-primary)] bg-[var(--color-charcoal)] text-[var(--signal-primary)]"
                : "text-[var(--color-soft-grey)] hover:border-[var(--border-active)] hover:text-[var(--color-off-white)]"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {view === "tree" ? (
        <MemoryTree items={items} />
      ) : (
        <Card surface={3} border>
          <div className="p-2">
            <Table
              data={items}
              columns={[
                { key: "fact", header: "Fact", render: (i) => <p className="max-w-xs text-sm text-[var(--color-light-grey)] line-clamp-1">{i.fact}</p> },
                { key: "source", header: "Source", render: (i) => <span className="text-sm text-[var(--color-soft-grey)]">{i.source}</span> },
                {
                  key: "confidence",
                  header: "Confidence",
                  render: (i) => {
                    const c = getConfidenceConfig(i.confidence);
                    return (
                      <span
                        className="font-mono text-xs"
                        style={{ color: `var(--signal-${c.color === "muted" ? "soft-grey" : c.color})` }}
                      >
                        {c.label}
                      </span>
                    );
                  },
                },
                { key: "lastUsed", header: "Last Used", render: (i) => <span className="font-mono text-xs text-[var(--color-mid-grey)]">{formatDate(i.lastUsed)}</span> },
                { key: "domain", header: "Domain", render: (i) => <span className="text-sm text-[var(--color-soft-grey)]">{i.domain}</span> },
              ]}
              rowKey={(i) => i.id}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
