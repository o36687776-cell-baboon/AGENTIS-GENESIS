import { Icon } from "@/design-system/icons";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import type { ApprovalRequest } from "@/types";

interface ApprovalProps {
  request: ApprovalRequest;
  onApprove?: () => void;
  onEdit?: () => void;
  onReview?: () => void;
  onCancel?: () => void;
  className?: string;
}

const riskConfig: Record<ApprovalRequest["riskLevel"], { color: string; label: string }> = {
  low: { color: "success", label: "Low" },
  medium: { color: "blue", label: "Medium" },
  high: { color: "warning", label: "High" },
  critical: { color: "error", label: "Critical" },
};

export function Approval({
  request,
  onApprove,
  onEdit,
  onReview,
  onCancel,
  className,
}: ApprovalProps) {
  const cfg = riskConfig[request.riskLevel];

  return (
    <Card surface={3} border className={className}>
      <div className="mb-4 flex items-center gap-2.5">
        <NodeIndicator color="warning" active pulse size="sm" />
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--signal-warning)]">
          HUMAN APPROVAL REQUIRED
        </span>
        <Badge variant="solid" color={cfg.color as any} className="ml-auto font-mono text-xs">
          {cfg.label}
        </Badge>
      </div>

      <h3 className="text-h4 font-medium text-[var(--color-off-white)]">
        {request.title}
      </h3>
      <p className="mt-1 text-sm text-[var(--color-soft-grey)]">
        {request.description}
      </p>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[var(--color-soft-grey)]">Recipients</span>
          <span className="font-mono text-[var(--color-off-white)]">
            {request.recipients ?? 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-soft-grey)]">Attachments</span>
          <span className="font-mono text-[var(--color-off-white)]">
            {request.attachments ?? 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-soft-grey)]">External</span>
          <span
            className="font-mono"
            style={{ color: request.external ? "var(--signal-error)" : "var(--signal-success)" }}
          >
            {request.external ? "YES" : "NO"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {onReview && (
          <button
            onClick={onReview}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-graphite)] px-3 py-1.5 text-sm font-medium text-[var(--color-off-white)] hover:bg-[var(--color-deep-black)]"
          >
            REVIEW
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-graphite)] px-3 py-1.5 text-sm text-[var(--color-off-white)] hover:bg-[var(--color-deep-black)]"
          >
            EDIT
          </button>
        )}
        <button
          onClick={onApprove}
          className="rounded-md bg-[var(--signal-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-void)] hover:brightness-110"
        >
          APPROVE
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-graphite)] px-3 py-1.5 text-sm text-[var(--color-soft-grey)] hover:bg-[var(--color-deep-black)]"
          >
            CANCEL
          </button>
        )}
      </div>
    </Card>
  );
}
