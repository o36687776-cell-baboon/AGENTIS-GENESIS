import { useState } from "react";
import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import type { WorkTreeNode } from "@/types";
import { WorkTreeNodeComponent } from "./WorkTreeNode";

interface WorkTreeBranchProps {
  label: string;
  icon: string;
  color: "primary" | "ai" | "blue" | "success" | "warning" | "muted";
  nodes: WorkTreeNode[];
  depth?: number;
  defaultExpanded?: boolean;
  onSelect?: (node: WorkTreeNode) => void;
}

export function WorkTreeBranch({
  label,
  icon,
  color = "muted",
  nodes,
  depth = 0,
  defaultExpanded = true,
  onSelect,
}: WorkTreeBranchProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const total = nodes.length;
  const completed = nodes.filter((n) => n.state === "completed").length;
  const running = nodes.filter((n) => n.state === "running" || n.state === "queued").length;

  const signalColor = {
    primary: "var(--signal-primary)",
    ai: "var(--signal-ai)",
    blue: "var(--signal-blue)",
    success: "var(--signal-success)",
    warning: "var(--signal-warning)",
    muted: "var(--color-soft-grey)",
  }[color];

  return (
    <div className="mb-2">
      <div
        className="group flex items-center gap-1.5 px-1 py-1.5 text-xs font-mono uppercase tracking-[0.05em] cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        style={{ color: signalColor }}
      >
        <NodeIndicator color={color} size="xs" active={running > 0} pulse={running > 0} />
        <span
          className="transition-transform duration-280"
          style={{ transform: expanded ? "rotate(0deg)" : "none" }}
        >
          <Icon name={expanded ? "chevron-down" : "chevron-right"} size={12} />
        </span>
        <span>{label}</span>
        <span className="ml-auto text-[var(--color-mid-grey)]">{total}</span>
      </div>

      {expanded && (
        <div className="space-y-0.25">
          {nodes.map((node) => (
            <WorkTreeNodeComponent
              key={node.id}
              node={node}
              depth={depth}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {!expanded && (
        <div className="border-l border-dashed border-[var(--color-mid-grey)] opacity-30">
          <div className="ml-1.5 mt-1 h-px w-8 bg-[var(--color-mid-grey)]" />
        </div>
      )}
    </div>
  );
}
