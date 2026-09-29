import * as ai from "../ai";
import { getConfig } from "../config";
import { classifyFailure } from "../execution/retry";

interface PlannerEvent {
  action: string;
  workTree?: {
    id?: string;
    objective?: string;
    context?: unknown;
  };
  objective?: string;
  correlationId?: string;
}

export async function handler(event: PlannerEvent) {
  const config = getConfig();

  try {
    switch (event.action) {
      case "generatePlan": {
        const objective = event.objective || event.workTree?.objective;
        if (!objective) {
          throw Object.assign(new Error("objective is required"), { name: "ValidationError" });
        }

        const plan = await ai.generatePlan({
          objective,
          context: event.workTree?.context as string | undefined,
          existingWorkTreeId: event.workTree?.id,
        });

        const truncated = plan.tasks.slice(0, config.maxTasksPerExecution);

        // Returned as a plain business object. Step Functions stores this
        // directly on the execution state, so no API Gateway response envelope
        // is wrapped around it.
        return {
          ...plan,
          tasks: truncated,
          correlationId: event.correlationId,
          taskCount: truncated.length,
        };
      }

      default:
        throw Object.assign(new Error(`Unknown action: ${event.action}`), {
          name: "ValidationError",
        });
    }
  } catch (error) {
    const classified = classifyFailure(error);
    // Rethrow so the state machine task fails and the configured retry policy
    // decides whether it is retried. A fatal failure fails on the first pass.
    throw Object.assign(
      new Error(
        JSON.stringify({
          message: classified.message,
          name: classified.name,
          class: classified.class,
        })
      ),
      { name: classified.name }
    );
  }
}
