import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Badge } from "@/design-system/components/Badge";
import type { ActivityEvent } from "@/types";

interface ActivityTimelineProps {
  events: ActivityEvent[];
  compact?: boolean;
  max?: number;
}

export function ActivityTimeline({
  events,
  compact = false,
  max,
}: ActivityTimelineProps) {
  const display = max ? events.slice(0, max) : events;

  if (display.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[var(--color-soft-grey)]">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {display.map((event) => {
        const eventColor = {
          info: "muted",
          success: "success",
          warning: "warning",
          error: "error",
        }[event.type] as "muted" | "success" | "warning" | "error";

        return (
          <div key={event.id} className="relative flex gap-2.5">
            {!compact && (
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-mid-grey)]" />
            )}
            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
              <NodeIndicator color={eventColor} size="xs" active />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-[var(--color-soft-grey)]">
                  {event.timestamp}
                </span>
                {event.agent && (
                  <Badge variant="subtle" color="ai" className="font-mono text-xs">
                    {event.agent}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-[var(--color-light-grey)]">
                {event.detail ?? event.action}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
