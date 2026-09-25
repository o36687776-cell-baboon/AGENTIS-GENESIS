import { cn } from "@/design-system/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "subtle" | "default" | "active";
  orientation?: "horizontal" | "vertical";
}

const variantVars = {
  subtle: "var(--border-subtle)",
  default: "var(--border-default)",
  active: "var(--border-active)",
};

export function Divider({
  className,
  variant = "subtle",
  orientation = "horizontal",
  ...props
}: DividerProps) {
  return (
    <div
      className={cn(
        orientation === "vertical"
          ? "w-px h-full"
          : "h-px w-full",
        "bg-[var(--border-subtle)]",
        className
      )}
      style={{ backgroundColor: variantVars[variant] }}
      {...props}
    />
  );
}
