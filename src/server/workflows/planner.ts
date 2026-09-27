import * as ai from "../ai";

function createResponse(statusCode: number, body: any) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

interface PlannerEvent {
  action: string;
  workTree?: any;
  objective?: string;
}

export async function handler(event: PlannerEvent): Promise<any> {
  const action = event.action;

  try {
    switch (action) {
      case "generatePlan": {
        const { workTree, objective } = event;
        const plan = await ai.generatePlan({
          objective: objective || workTree?.objective,
          context: workTree?.context,
          existingWorkTreeId: workTree?.id,
        });
        return createResponse(200, { success: true, data: plan });
      }

      default:
        return createResponse(400, { success: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error("Planner error:", error);
    return createResponse(500, { success: false, error: error instanceof Error ? error.message : "Internal error" });
  }
}