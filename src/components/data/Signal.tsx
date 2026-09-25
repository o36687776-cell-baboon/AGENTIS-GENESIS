import { cn } from "@/design-system/utils";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";

interface SignalProps {
  label: string;
  value: string | number;
  color: "primary" | "ai" | "blue" | "success" | "warning" | "error";
  pulse?: boolean;
  className?: string;
}

export function Signal({ label, value, color, pulse = false, className }: SignalProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="font-mono text-xs text-[var(--color-soft-grey)]">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <NodeIndicator color={color} active size="xs" pulse={pulse} />
        <span
          className="font-mono text-xs tabular-nums"
          style={{ color: `var(--signal-${color})` }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
