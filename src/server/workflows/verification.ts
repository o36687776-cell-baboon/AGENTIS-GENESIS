import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

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
      case "verify": {
        const { workTreeId, results } = body;
        const requiresApproval = false;
        return createResponse(200, { success: true, data: { requiresApproval, approved: true, checks: [] } });
      }

      default:
        return createResponse(400, { success: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error("Verification error:", error);
    return createResponse(500, { success: false, error: error instanceof Error ? error.message : "Internal error" });
  }
}