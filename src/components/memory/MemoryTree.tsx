import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { MemoryItem } from "./MemoryItem";
import type { MemoryItem as MemoryItemT } from "@/types";

interface MemoryTreeProps {
  items: MemoryItemT[];
  onItemClick?: (item: MemoryItemT) => void;
}

interface MemoryGroup {
  domain: "personal" | "project" | "organization";
  label: string;
  items: MemoryItemT[];
}

export function MemoryTree({ items, onItemClick }: MemoryTreeProps) {
  const allGroups: MemoryGroup[] = [
    {
      domain: "personal",
      label: "PERSONAL",
      items: items.filter((i) => i.domain === "personal"),
    },
    {
      domain: "project",
      label: "PROJECT",
      items: items.filter((i) => i.domain === "project"),
    },
    {
      domain: "organization",
      label: "ORGANIZATION",
      items: items.filter((i) => i.domain === "organization"),
    },
  ];
  const groups = allGroups.filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.domain}>
          <div className="mb-3 flex items-center gap-2.5">
            <NodeIndicator
              color={
                group.domain === "organization"
                  ? "primary"
                  : group.domain === "project"
                  ? "ai"
                  : "blue"
              }
              size="xs"
            />
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
              {group.label}
            </span>
            <span className="text-xs text-[var(--color-mid-grey)]">
              {group.items.length}
            </span>
          </div>
          <div className="space-y-2">
            {group.items.map((item) => (
              <MemoryItem
                key={item.id}
                item={item}
                onClick={onItemClick ? () => onItemClick(item) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
