import { cn } from "@/design-system/utils";
import { type ButtonVariant } from "./Button";

export type IconButtonVariant = "ghost" | "secondary" | "solid";

const variantStyles: Record<IconButtonVariant, string> = {
  ghost:
    "text-[var(--color-soft-grey)] hover:text-[var(--color-off-white)] hover:bg-[var(--color-charcoal)]",
  secondary:
    "text-[var(--color-off-white)] border border-[var(--border-default)] hover:bg-[var(--color-charcoal)]",
  solid:
    "text-[var(--color-void)] bg-[var(--signal-primary)] hover:brightness-110",
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  variant?: IconButtonVariant;
  size?: "sm" | "md" | "lg";
}

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  className,
  ...props
}: IconButtonProps) {
  const sizeStyles = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded transition-all duration-160 focus:outline-none focus-visible:outline-1 focus-visible:outline-offset-2",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
