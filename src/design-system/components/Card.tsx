import { cn } from "@/design-system/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  surface?: 0 | 1 | 2 | 3 | 4 | 5;
  border?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const surfaceVars: Record<number, string> = {
  0: "var(--color-void)",
  1: "var(--color-black)",
  2: "var(--color-deep-black)",
  3: "var(--color-charcoal)",
  4: "var(--color-graphite)",
  5: "var(--color-dark-grey)",
};

const paddingVars = {
  none: "0",
  sm: "8px",
  md: "16px",
  lg: "24px",
};

export function Card({
  className,
  surface = 2,
  border = true,
  padding = "md",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        border && "border border-[var(--border-subtle)]",
        className
      )}
      style={{ backgroundColor: surfaceVars[surface], padding: paddingVars[padding] }}
      {...props}
    />
  );
}

export function Surface({
  className,
  surface = 2,
  border = false,
  ...props
}: Omit<CardProps, "padding">) {
  return (
    <div
      className={cn(
        border && "border border-[var(--border-subtle)]",
        className
      )}
      style={{ backgroundColor: surfaceVars[surface] }}
      {...props}
    />
  );
}
