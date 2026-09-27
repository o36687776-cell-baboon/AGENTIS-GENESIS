import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import * as ai from "../ai";

function createResponse(statusCode: number, body: any) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = event.body ? JSON.parse(event.body) : {};
  const action = body.action;

  try {
    switch (action) {
      case "generatePlan": {
        const { workTree, objective } = body;
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