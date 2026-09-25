import { Icon } from "@/design-system/icons";
import { Card } from "@/design-system/components/Card";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import type { Artifact } from "@/types";
import { ArtifactCard } from "./ArtifactCard";

interface ArtifactViewerProps {
  artifact: Artifact;
  relatedArtifacts?: Artifact[];
  onClose?: () => void;
}

export function ArtifactViewer({
  artifact,
  relatedArtifacts = [],
  onClose,
}: ArtifactViewerProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-[rgba(5,5,5,0.8)] backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 mx-4 grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card surface={3} border className="h-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <NodeIndicator color="blue" size="xs" active />
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
                  Artifact Viewer
                </span>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="rounded p-1 text-[var(--color-soft-grey)] hover:text-[var(--color-off-white)]"
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>

            <div className="mb-4 text-h3 font-medium text-[var(--color-off-white)]">
              {artifact.name}
            </div>

            <div className="prose prose-sm max-w-none text-[var(--color-soft-grey)]">
              <p>{artifact.content ?? "No content available."}</p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <ArtifactCard artifact={artifact} showProvenance />
          {relatedArtifacts.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-center gap-2">
                <NodeIndicator color="muted" size="xs" />
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
                  Related Artifacts
                </span>
              </div>
              <div className="space-y-2">
                {relatedArtifacts.map((a) => (
                  <ArtifactCard key={a.id} artifact={a} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
