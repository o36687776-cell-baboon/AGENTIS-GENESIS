function createResponse(statusCode: number, body: any) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

interface VerificationEvent {
  action: string;
  workTreeId?: string;
  results?: any;
}

export async function handler(event: VerificationEvent): Promise<any> {
  const action = event.action;

  try {
    switch (action) {
      case "verify": {
        const { workTreeId, results } = event;
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