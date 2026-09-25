import { cn } from "@/design-system/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded font-medium transition-all duration-160 focus:outline-none focus-visible:outline-1 focus-visible:outline-offset-2";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--signal-primary)] text-[var(--color-void)] hover:brightness-110 active:scale-[0.98] focus-visible:outline-[var(--signal-primary)]",
  secondary:
    "bg-[var(--color-charcoal)] text-[var(--color-off-white)] border border-[var(--border-default)] hover:bg-[var(--color-graphite)] focus-visible:outline-[var(--color-soft-grey)]",
  ghost:
    "text-[var(--color-soft-grey)] hover:text-[var(--color-off-white)] hover:bg-[var(--color-charcoal)] focus-visible:outline-[var(--color-soft-grey)]",
  danger:
    "bg-[var(--signal-error)] text-[var(--color-void)] hover:brightness-110 focus-visible:outline-[var(--signal-error)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 h-8 text-xs",
  md: "px-3.5 h-9 text-sm",
  lg: "px-4 h-10 text-sm font-medium",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
}
