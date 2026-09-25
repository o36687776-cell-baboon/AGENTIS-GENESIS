import { cn } from "@/design-system/utils";
import { type StateConfig, getStateColor } from "@/design-system/lib/state-colors";

export interface ChipProps {
  label: string;
  color?: StateConfig["color"];
  icon?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

const sizeMap = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
};

export function Chip({ label, color = "muted", icon, size = "md", className }: ChipProps) {
  const c = getStateColor(color);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--color-charcoal)]",
        sizeMap[size],
        className
      )}
    >
      {icon && <span style={{ color: c }}>{icon}</span>}
      <span className="text-mono" style={{ color: c }}>
        {label}
      </span>
    </span>
  );
}
