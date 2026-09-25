import { cn } from "@/design-system/utils";

interface TreeConnectorProps {
  depth: number;
  className?: string;
}

export function TreeConnector({ depth, className }: TreeConnectorProps) {
  if (depth <= 0) return null;
  const indent = depth * 16;
  return (
    <div
      className={cn("absolute top-0 bottom-0 pointer-events-none", className)}
      style={{ left: `${indent}px` }}
    >
      <div className="absolute top-0 bottom-0 w-px bg-[var(--color-mid-grey)]" />
      {Array.from({ length: depth }).map((_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 w-px bg-[var(--color-mid-grey)] opacity-40"
          style={{ left: `${(i + 1) * 16}px` }}
        />
      ))}
    </div>
  );
}

interface TreeNodeLineProps {
  active?: boolean;
  className?: string;
  width?: number;
}

export function TreeNodeLine({ active = false, className, width = 48 }: TreeNodeLineProps) {
  return (
    <div
      className={cn(
        "h-px transition-all duration-300",
        active
          ? "bg-[var(--signal-primary)] shadow-[0_0_4px_rgba(217,255,0,0.4)]"
          : "bg-[var(--color-mid-grey)]",
        className
      )}
      style={{ width }}
    />

  );
}

interface NodeLinkProps {
  color?: "default" | "primary" | "ai";
  dashed?: boolean;
  className?: string;
}

export function NodeLink({ color = "default", dashed = false, className }: NodeLinkProps) {
  const colorVar = {
    default: "var(--color-mid-grey)",
    primary: "var(--signal-primary)",
    ai: "var(--signal-ai)",
  };
  return (
    <div
      className={cn(
        "h-px",
        dashed && "border-t border-dashed",
        className
      )}
      style={{
        backgroundColor: colorVar[color],
        backgroundImage: dashed
          ? `repeating-linear-gradient(90, ${colorVar[color]}, ${colorVar[color]} 4px, transparent 4px, transparent 8px)`
          : undefined,
      }}
    />
  );
}

interface OrbitAnimationProps {
  children?: React.ReactNode;
  active?: boolean;
  className?: string;
}

export function OrbitAnimation({ children, active = true, className }: OrbitAnimationProps) {
  return (
    <div
      className={cn(
        "relative",
        active && "animate-[spin_3s_linear_infinite]",
        className
      )}
    >
      {children}
    </div>
  );
}
