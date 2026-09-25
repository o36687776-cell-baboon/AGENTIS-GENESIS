import { cn } from "@/design-system/utils";
import { type StateConfig, getStateColor } from "@/design-system/lib/state-colors";

interface ProgressProps {
  value: number;
  color?: StateConfig["color"];
  size?: "sm" | "md" | "lg";
  label?: boolean;
  className?: string;
  barClassName?: string;
}

const sizeMap = {
  sm: "h-0.5",
  md: "h-1",
  lg: "h-2",
};

export function Progress({
  value,
  color = "primary",
  size = "md",
  label = true,
  className,
  barClassName,
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = getStateColor(color);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-[var(--color-mid-grey)]",
          sizeMap[size],
          barClassName
        )}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: fill }}
        />
      </div>
      {label && (
        <span className="mt-1 block text-mono text-xs text-[var(--color-soft-grey)] tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
