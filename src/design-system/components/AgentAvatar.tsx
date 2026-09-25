import { cn } from "@/design-system/utils";
import { NodeIndicator } from "./NodeIndicator";
import type { StateConfig } from "@/design-system/lib/state-colors";

const avatarMap: Record<string, string> = {
  grid: "GRID",
  orbit: "ORBIT",
  node: "NODE",
  sigil: "SIGIL",
};

interface AgentAvatarProps {
  avatar?: string;
  name: string;
  statusColor?: StateConfig["color"];
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
  pulse?: boolean;
}

export function AgentAvatar({
  avatar = "node",
  name,
  statusColor = "muted",
  size = "md",
  active = false,
  pulse = false,
  className,
}: AgentAvatarProps) {
  const label = avatarMap[avatar] ?? avatar.toUpperCase();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeConfig = {
    sm: { dim: "w-8 h-8 text-xs", dot: "sm" as const },
    md: { dim: "w-10 h-10 text-sm", dot: "md" as const },
    lg: { dim: "w-12 h-12 text-base", dot: "lg" as const },
  };

  const cfg = sizeConfig[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-lg font-mono font-medium uppercase tracking-[0.05em] border border-[var(--border-default)]",
        cfg.dim,
        active && "shadow-[0_0_12px_rgba(217,255,0,0.2)]",
        className
      )}
      style={{
        backgroundColor: "var(--color-charcoal)",
        color: "var(--color-light-grey)",
      }}
      aria-label={name}
    >
      <span className="z-10">{label}</span>
      <span className="absolute -bottom-1 -right-1 z-0">
        <NodeIndicator color={statusColor} active={active} pulse={pulse} size={cfg.dot} />
      </span>
    </div>
  );
}

export function AgentAvatarSimple({
  name,
  statusColor = "muted",
  size = "md",
  active = false,
  className,
}: Omit<AgentAvatarProps, "avatar">) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeConfig = {
    sm: { dim: "w-8 h-8 text-xs" },
    md: { dim: "w-10 h-10 text-sm" },
    lg: { dim: "w-12 h-12 text-base" },
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-lg font-mono font-medium uppercase tracking-[0.05em] border border-[var(--border-default)]",
        sizeConfig[size].dim,
        active && "shadow-[0_0_12px_rgba(217,255,0,0.2)]",
        className
      )}
      style={{ backgroundColor: "var(--color-charcoal)", color: "var(--color-light-grey)" }}
      aria-label={name}
    >
      <span>{initials}</span>
    </div>
  );
}

export const agentAvatarTypes = Object.keys(avatarMap);
