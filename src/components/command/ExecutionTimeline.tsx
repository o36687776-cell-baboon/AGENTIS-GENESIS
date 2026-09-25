import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Badge } from "@/design-system/components/Badge";
import { Progress } from "@/design-system/components/Progress";

interface ExecutionPhase {
  id: string;
  label: string;
}

interface ExecutionTimelineProps {
  phases: ExecutionPhase[];
  currentStep: number;
  onReset: () => void;
  completed: boolean;
}

const phaseDescriptions: Record<string, string> = {
  intent: "Your objective has been captured.",
  interpret: "Genesis is mapping objectives to work nodes.",
  plan: "A work tree plan is being constructed.",
  confirm: "Reviewing plan before execution.",
  execute: "Agents are executing assigned tasks.",
  verify: "Results are being verified against success criteria.",
  deliver: "Outcome delivered. Artifact archived.",
};

export function ExecutionTimeline({
  phases,
  currentStep,
  onReset,
  completed,
}: ExecutionTimelineProps) {
  const progress = phases.length > 0 ? ((currentStep + 1) / phases.length) * 100 : 0;

  return (
    <div className="w-full max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <NodeIndicator color={completed ? "success" : "primary"} active pulse={!completed} size="sm" />
          <Badge
            variant="subtle"
            color={completed ? "success" : "ai"}
            className="font-mono text-xs"
          >
            {completed ? "COMPLETED" : "EXECUTING"}
          </Badge>
        </div>
        <span className="font-mono text-xs text-[var(--color-soft-grey)]">
          {currentStep + 1} / {phases.length}
        </span>
      </div>

      <Progress value={progress} color={completed ? "success" : "primary"} label={false} size="sm" />

      <div className="mt-5 space-y-3.5">
        {phases.map((phase, idx) => {
          const status: "pending" | "active" | "complete" =
            idx < currentStep ? "complete"
            : idx === currentStep ? "active"
            : "pending";
          const color = status === "active" ? "primary" : status === "complete" ? "success" : "muted";
          return (
            <div key={phase.id} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {status === "complete" ? (
                  <Icon name="check" size={14} className="text-[var(--signal-success)]" />
                ) : status === "active" ? (
                  <NodeIndicator color="primary" active pulse size="xs" />
                ) : (
                  <NodeIndicator color={color} size="xs" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="subtle" color={color} className="font-mono text-xs">
                    {phase.label}
                  </Badge>
                  {status === "active" && (
                    <span className="font-mono text-xs text-[var(--color-soft-grey)]">
                      {phaseDescriptions[phase.id] ?? ""}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-soft-grey)]">
                  {phaseDescriptions[phase.id] ?? "…"}
                </p>
              </div>
              {status === "complete" && (
                <Icon name="check" size={14} className="text-[var(--signal-success)]" />
              )}
            </div>
          );
        })}
      </div>

      {completed && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onReset}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-graphite)] px-3 py-1.5 text-sm text-[var(--color-off-white)] transition-all hover:bg-[var(--color-deep-black)]"
          >
            New Command (⌘K)
          </button>
        </div>
      )}
    </div>
  );
}
