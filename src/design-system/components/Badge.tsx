import { cn } from "@/design-system/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "subtle" | "outline" | "solid";
  color?:
    | "primary"
    | "ai"
    | "blue"
    | "success"
    | "warning"
    | "error"
    | "muted"
    | "disabled";
  size?: "sm" | "md";
  className?: string;
}

const colorVars: Record<NonNullable<BadgeProps["color"]>, string> = {
  primary: "var(--signal-primary)",
  ai: "var(--signal-ai)",
  blue: "var(--signal-blue)",
  success: "var(--signal-success)",
  warning: "var(--signal-warning)",
  error: "var(--signal-error)",
  muted: "var(--color-soft-grey)",
  disabled: "var(--color-mid-grey)",
};

const sizeMap = {
  sm: "px-1.5 py-0 text-mono text-xs",
  md: "px-2 py-0.5 text-xs",
};

export function Badge({
  children,
  variant = "default",
  color,
  size = "md",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium uppercase",
        sizeMap[size],
        variant === "solid" && color && "text-[var(--color-void)]",
        variant === "outline" && color && "border border-current",
        variant === "subtle" && color && "bg-[color:mix(15%,theme(colors.white),_transparent)]",
        className
      )}
      style={{
        ...(color && { color: colorVars[color] }),
        ...(color && variant === "solid" && { backgroundColor: colorVars[color] }),
        ...(color && variant === "outline" && { borderColor: colorVars[color] }),
      }}
    >
      {children}
    </span>
  );
}
