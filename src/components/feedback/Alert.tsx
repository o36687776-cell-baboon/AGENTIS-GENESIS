import { Icon } from "@/design-system/icons";
import { Card } from "@/design-system/components/Card";

export type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title: string;
  description?: string;
  actions?: Array<{ label: string; onClick: () => void; variant?: "primary" | "secondary" | "ghost" }>;
  className?: string;
}

const variantConfig: Record<AlertVariant, { icon: string; color: string; bg: string }> = {
  info: { icon: "alert", color: "var(--signal-blue)", bg: "rgba(110,168,255,0.08)" },
  success: { icon: "check", color: "var(--signal-success)", bg: "rgba(103,232,165,0.08)" },
  warning: { icon: "warning", color: "var(--signal-warning)", bg: "rgba(245,199,106,0.08)" },
  error: {
        icon: "x",
  color: "var(--signal-error)",
    bg: "rgba(255,107,107,0.08)",
},
};

export function Alert({
  variant = "info",
  title,
  description,
  actions,
  className,
}: AlertProps) {
  const cfg = variantConfig[variant];

  return (
    <Card
      surface={3}
      border
      className={className}
      style={{
        backgroundColor: cfg.bg,
      }}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon name={cfg.icon as any} size={16} style={{ color: cfg.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-[var(--color-off-white)]">
            {title}
          </h4>
          {description && (
            <p className="mt-1 text-sm text-[var(--color-soft-grey)]">
              {description}
            </p>
          )}
          {actions && (
            <div className="mt-3 flex gap-2">
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className="rounded-md px-3 py-1.5 text-sm font-medium transition-all"
                  style={{
                    backgroundColor:
                      action.variant === "primary"
                        ? cfg.color
                        : "var(--color-graphite)",
                    color:
                      action.variant === "primary"
                        ? "var(--color-void)"
                        : "var(--color-off-white)",
                    border:
                      action.variant === "secondary"
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
