import { Icon } from "@/design-system/icons";
import { Card } from "@/design-system/components/Card";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Badge } from "@/design-system/components/Badge";
import { formatDateTime } from "@/lib/date";
import type { Artifact } from "@/types";

interface ArtifactCardProps {
  artifact: Artifact;
  onClick?: () => void;
  showProvenance?: boolean;
}

const typeConfig: Record<Artifact["type"], { label: string; icon: string }> = {
  document: { label: "Document", icon: "artifacts" },
  spreadsheet: { label: "Spreadsheet", icon: "table" as never },
  presentation: { label: "Presentation", icon: "artifacts" },
  code: { label: "Code", icon: "knowledge" },
  data: { label: "Data", icon: "table" as never },
};

export function ArtifactCard({
  artifact,
  onClick,
  showProvenance = false,
}: ArtifactCardProps) {
  const cfg = typeConfig[artifact.type] ?? typeConfig.document;
  const version = Number(artifact.version);
  const isRecent = version < 1.5;

  return (
    <Card
      surface={3}
      border
      padding="md"
      className="group transition-all duration-280 hover:border-[var(--border-active)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={cfg.icon as any} size={16} className="text-[var(--color-soft-grey)]" />
          <span className="font-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]">
            {cfg.label}
          </span>
        </div>
        <Badge
          variant={isRecent ? "solid" : "subtle"}
          color="ai"
          className="font-mono text-xs"
        >
          v{artifact.version}
        </Badge>
      </div>

      <h3 className="text-h4 font-medium text-[var(--color-off-white)]">
        {artifact.name}
      </h3>

      {artifact.content && (
        <p className="mt-1 line-clamp-2 text-sm text-[var(--color-soft-grey)]">
          {artifact.content}
        </p>
      )}

      {showProvenance && (
        <div className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
          <ProvenanceRow label="Created by" value={artifact.createdBy} />
          <ProvenanceRow label="Agent" value={artifact.agent} accent="ai" />
          <ProvenanceRow label="Model" value={artifact.model} />
          <ProvenanceRow label="Sources" value={String(artifact.sources)} />
          <ProvenanceRow label="Tools" value={String(artifact.tools)} />
          <ProvenanceRow label="Agents" value={String(artifact.agents)} />
          <ProvenanceRow label="Created" value={formatDateTime(artifact.createdAt)} />
          <div className="flex justify-between">
            <span className="text-xs text-[var(--color-soft-grey)]">Verified</span>
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <NodeIndicator color={artifact.verified ? "success" : "muted"} size="xs" />
              {artifact.verified ? "YES" : "NO"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-[var(--color-soft-grey)]">Human reviewed</span>
            <span className="font-mono text-xs">
              {artifact.humanReviewed ? "YES" : "NO"}
            </span>
          </div>
        </div>
      )}

      {onClick && (
        <div className="mt-3 flex justify-end text-[var(--color-soft-grey)] group-hover:text-[var(--color-off-white)]">
          <Icon name="external" size={14} />
        </div>
      )}
    </Card>
  );
}

function ProvenanceRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "default" | "ai";
}) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-[var(--color-soft-grey)]">{label}</span>
      <span
        className="font-mono text-xs"
        style={{
          color: accent === "ai" ? "var(--signal-ai)" : "var(--color-light-grey)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
