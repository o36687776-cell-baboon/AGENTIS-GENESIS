import { cn } from "@/design-system/utils";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";

interface MetricProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  accent?: "primary" | "ai" | "blue" | "success" | "warning" | "error" | "muted";
  className?: string;
}

export function Metric({
  label,
  value,
  change,
  positive,
  accent = "muted",
  className,
}: MetricProps) {
  const accentStyle = {
    primary: "var(--signal-primary)",
    ai: "var(--signal-ai)",
    blue: "var(--signal-blue)",
    success: "var(--signal-success)",
    warning: "var(--signal-warning)",
    error: "var(--signal-error)",
    muted: "var(--color-soft-grey)",
  }[accent];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl text-[var(--color-off-white)] tabular-nums">
          {value}
        </span>
        {change && (
          <span
            className="flex items-center gap-0.5 font-mono text-xs"
            style={{
              color: positive
                ? "var(--signal-success)"
                : "var(--signal-error)",
            }}
          >
            {change}
          </span>
        )}
      </div>
      <span className="h-px w-8" style={{ backgroundColor: accentStyle }} />
    </div>
  );
}
