import { cn } from "@/design-system/utils";
import { type StateConfig, getStateColor } from "@/design-system/lib/state-colors";

interface StatusDotProps {
  color?: StateConfig["color"];
  size?: "xs" | "sm" | "md";
  pulse?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "w-1.5 h-1.5",
  sm: "w-2.5 h-2.5",
  md: "w-3.5 h-3.5",
};

export function StatusDot({ color = "muted", size = "sm", pulse = false, className }: StatusDotProps) {
  const bgVar = getStateColor(color);
  return (
    <span
      className={cn(
        "rounded-full block",
        sizeMap[size],
        pulse ? "animate-pulse" : "",
        className
      )}
      style={{ backgroundColor: bgVar }}
    />
  );
}
