import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import type { ActivityEvent, Task } from "@/types";

interface TaskTimelineProps {
  task: Task;
  events?: ActivityEvent[];
}

export function TaskTimeline({ task, events = [] }: TaskTimelineProps) {
  const phases = [
    { id: "queued", label: "Queued" },
    { id: "running", label: "In Progress" },
    { id: "completed", label: "Completed" },
    { id: "verified", label: "Verified" },
  ];

  const currentPhase =
    task.status === "queued"
      ? 0
      : task.status === "running"
      ? 1
      : task.status === "completed"
      ? 3
      : 2;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
          Lifecycle
        </span>
        <span className="text-xs text-[var(--color-mid-grey)]">
          {task.status}
        </span>
      </div>
      <div className="relative flex h-6 items-center">
        <div className="absolute left-0 right-0 top-2.5 h-px bg-[var(--color-mid-grey)]" />
        {phases.map((phase, idx) => {
          const active = idx <= currentPhase;
          return (
            <div
              key={phase.id}
              className="absolute flex flex-col items-center"
              style={{ left: `${(idx / (phases.length - 1)) * 100}%` }}
            >
              <NodeIndicator
                color={active ? "primary" : "muted"}
                active={idx === currentPhase}
                pulse={idx === currentPhase}
                size="xs"
              />
              <span
                className={`mt-2 text-mono text-xs ${
                  active
                    ? "text-[var(--color-light-grey)]"
                    : "text-[var(--color-mid-grey)]"
                }`}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
