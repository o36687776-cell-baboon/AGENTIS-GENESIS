import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Progress } from "@/design-system/components/Progress";
import { Badge } from "@/design-system/components/Badge";
import type { WorkTree } from "@/types";
import { getNodeStateConfig } from "@/design-system/lib/state-colors";

interface WorkTreeHeaderProps {
  workTree: WorkTree;
}

export function WorkTreeHeader({ workTree }: WorkTreeHeaderProps) {
  const stateConfig = getNodeStateConfig(workTree.status);

  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <NodeIndicator
            color={stateConfig.color as any}
            active={workTree.status === "running"}
            pulse={workTree.status === "running"}
            size="sm"
          />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            WORK TREE
          </span>
          <Badge
            variant="subtle"
            color={stateConfig.color as any}
            className="font-mono text-xs"
          >
            {stateConfig.label.toUpperCase()}
          </Badge>
        </div>
        <h1 className="text-h1 font-medium text-[var(--color-off-white)]">
          {workTree.name}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--color-soft-grey)]">
          {workTree.objective}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Icon name="play" size={12} className="text-[var(--color-soft-grey)]" />
          <span className="font-mono text-xs text-[var(--color-soft-grey)]">
            CREATED {new Date(workTree.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="w-28">
          <Progress value={workTree.progress} label size="sm" />
        </div>
      </div>
    </div>
  );
}
