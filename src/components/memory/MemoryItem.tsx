import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Badge } from "@/design-system/components/Badge";
import { Chip } from "@/design-system/components/Chip";
import { getConfidenceConfig } from "@/design-system/lib/state-colors";
import { formatDate } from "@/lib/date";
import type { MemoryItem } from "@/types";

interface MemoryItemProps {
  item: MemoryItem;
  onClick?: () => void;
}

export function MemoryItem({ item, onClick }: MemoryItemProps) {
  const confidenceConfig = getConfidenceConfig(item.confidence);

  return (
    <div
      className="group flex flex-col gap-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--color-deep-black)] p-3 transition-all duration-160 hover:border-[var(--border-active)] hover:bg-[var(--color-charcoal)]"
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-[var(--color-light-grey)]">{item.fact}</p>
        <Badge variant="subtle" color={confidenceConfig.color} className="font-mono text-xs">
          {confidenceConfig.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <MemoryMeta label="Source" value={item.source} />
        <MemoryMeta
          label="Created"
          value={formatDate(item.created)}
        />
        <MemoryMeta
          label="Last used"
          value={formatDate(item.lastUsed)}
        />
        <MemoryMeta label="Permission" value={item.permission} />
        {item.expiry && (
          <MemoryMeta
            label="Expiry"
            value={formatDate(item.expiry)}
            accent="warning"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Chip
          label={item.domain}
          color={
            item.domain === "organization"
              ? "primary"
              : item.domain === "project"
              ? "ai"
              : "blue"
          }
          size="sm"
        />
      </div>
    </div>
  );
}

function MemoryMeta({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "default" | "warning";
}) {
  return (
    <div>
      <div className="font-mono text-xs text-[var(--color-mid-grey)]">{label}</div>
      <div
        className="font-mono text-xs"
        style={{
          color:
            accent === "warning"
              ? "var(--signal-warning)"
              : "var(--color-soft-grey)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
