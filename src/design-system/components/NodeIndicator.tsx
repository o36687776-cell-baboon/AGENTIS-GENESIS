import { cn } from "@/design-system/utils";
import { type StateConfig, getStateColor } from "@/design-system/lib/state-colors";

interface NodeIndicatorProps {
  color?: StateConfig["color"];
  active?: boolean;
  pulse?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "w-2 h-2",
  sm: "w-2.5 h-2.5",
  md: "w-4 h-4",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
};

export function NodeIndicator({
  color = "muted",
  active = false,
  pulse = false,
  size = "md",
  className,
}: NodeIndicatorProps) {
  const isSignal = !["muted", "disabled"].includes(color);
  const bgVar = isSignal ? getStateColor(color) : getStateColor(color);

  return (
    <span
      className={cn(
        "rounded-full block",
        sizeMap[size],
        isSignal
          ? "border-2 border-transparent"
          : "",
        active && isSignal
          ? "shadow-[0_0_8px_rgba(217,255,0,0.5)]"
          : "",
        pulse && isSignal ? "animate-pulse-slow" : "",
        className
      )}
      style={{ backgroundColor: bgVar }}
      aria-label={active ? "active node" : "node"}
    />
  );
}
