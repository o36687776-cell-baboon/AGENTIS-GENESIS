import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { getConfig } from "./config";
import * as db from "./database/services";
import * as artifacts from "./artifacts";
import * as ai from "./ai";
import { generateId } from "./database/services";

const config = getConfig();

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId: string;
  };
}

function createResponse<T>(statusCode: number, body: ApiResponse<T>): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Request-ID",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getRequestId(event: APIGatewayProxyEventV2): string {
  return event.headers["x-request-id"] || event.requestContext.requestId || generateId();
}

function parseBody(event: APIGatewayProxyEventV2): any {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

async function handleHealth(): Promise<ApiResponse> {
  const dbHealthy = await import("./database").then((m) => m.healthCheck());
  const config = getConfig();

  return {
    success: true,
    data: {
      status: "ok",
      services: {
        api: "ok",
        database: dbHealthy ? "ok" : "error",
        bedrock: config.mockAi ? "mock" : "configured",
        secrets: config.bedrockApiKeySecretArn ? "configured" : "not_configured",
        storage: config.artifactBucketName ? "configured" : "not_configured",
      },
      environment: config.environment,
      timestamp: new Date().toISOString(),
    },
  };
}

async function handleGetWorkTrees(): Promise<ApiResponse> {
  const workTrees = await db.getWorkTrees();
  return { success: true, data: workTrees };
}

async function handleCreateWorkTree(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const body = parseBody(event);
  if (!body || !body.name || !body.objective) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "name and objective are required", requestId: getRequestId(event) } };
  }

  const workTree = await db.createWorkTree({
    name: body.name,
    objective: body.objective,
    context: body.context,
  });

  await db.createActivityEvent({
    workTreeId: workTree.id,
    eventType: "WORK_TREE_CREATED",
    status: "success",
    message: `Work tree "${workTree.name}" created`,
  });

  return { success: true, data: workTree };
}

async function handleGetWorkTree(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Work tree ID is required", requestId: getRequestId(event) } };
  }

  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return { success: false, error: { code: "NOT_FOUND", message: "Work tree not found", requestId: getRequestId(event) } };
  }

  const [agents, tasks, artifactsList, approvals, activity, plan] = await Promise.all([
    db.getAgentsByWorkTree(id),
    db.getTasksByWorkTree(id),
    db.getArtifactsByWorkTree(id),
    db.getApprovalsByWorkTree(id),
    db.getActivityEventsByWorkTree(id),
    db.getWorkTreePlan(id),
  ]);

  return {
    success: true,
    data: {
      ...workTree,
      agents,
      tasks,
      artifacts: artifactsList,
      approvals,
      activity,
      plan,
    },
  };
}

async function handlePlanWorkTree(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Work tree ID is required", requestId: getRequestId(event) } };
  }

  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return { success: false, error: { code: "NOT_FOUND", message: "Work tree not found", requestId: getRequestId(event) } };
  }

  const body = parseBody(event);
  const plan = await ai.generatePlan({
    objective: body?.objective || workTree.objective,
    context: workTree.context,
    existingWorkTreeId: id,
  });

  const planRecord = await db.createWorkTreePlan({
    workTreeId: id,
    objective: plan.objective,
    summary: plan.summary,
    context: plan.context,
    tasks: plan.tasks,
    risks: plan.risks,
    requiresApproval: plan.requiresApproval,
    approvalReason: plan.approvalReason,
    estimatedTotalDurationMinutes: plan.estimatedTotalDurationMinutes,
  });

  await db.updateWorkTree(id, { status: "queued" });

  await db.createActivityEvent({
    workTreeId: id,
    eventType: "PLAN_CREATED",
    status: "success",
    message: `Execution plan created with ${plan.tasks.length} tasks`,
    metadata: { planId: planRecord.id, taskCount: plan.tasks.length },
  });

  return { success: true, data: plan };
}

async function handleRunWorkTree(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Work tree ID is required", requestId: getRequestId(event) } };
  }

  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return { success: false, error: { code: "NOT_FOUND", message: "Work tree not found", requestId: getRequestId(event) } };
  }

  await db.updateWorkTree(id, { status: "running" });

  await db.createActivityEvent({
    workTreeId: id,
    eventType: "WORK_TREE_STARTED",
    status: "success",
    message: `Work tree execution started`,
  });

  return { success: true, data: { workTreeId: id, status: "running" } };
}

async function handlePauseWorkTree(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Work tree ID is required", requestId: getRequestId(event) } };
  }

  await db.updateWorkTree(id, { status: "waiting" });

  await db.createActivityEvent({
    workTreeId: id,
    eventType: "WORK_TREE_PAUSED",
    status: "warning",
    message: `Work tree paused`,
  });

  return { success: true, data: { workTreeId: id, status: "waiting" } };
}

async function handleResumeWorkTree(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Work tree ID is required", requestId: getRequestId(event) } };
  }

  await db.updateWorkTree(id, { status: "running" });

  await db.createActivityEvent({
    workTreeId: id,
    eventType: "WORK_TREE_RESUMED",
    status: "success",
    message: `Work tree resumed`,
  });

  return { success: true, data: { workTreeId: id, status: "running" } };
}

async function handleGetActivity(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Work tree ID is required", requestId: getRequestId(event) } };
  }

  const activity = await db.getActivityEventsByWorkTree(id);
  return { success: true, data: activity };
}

async function handleGetAgents(): Promise<ApiResponse> {
  const workTrees = await db.getWorkTrees();
  let allAgents: any[] = [];
  for (const wt of workTrees) {
    const agents = await db.getAgentsByWorkTree(wt.id);
    allAgents = [...allAgents, ...agents];
  }
  return { success: true, data: allAgents };
}

async function handleGetAgent(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Agent ID is required", requestId: getRequestId(event) } };
  }

  const agent = await db.getAgent(id);
  if (!agent) {
    return { success: false, error: { code: "NOT_FOUND", message: "Agent not found", requestId: getRequestId(event) } };
  }

  return { success: true, data: agent };
}

async function handleGetTasks(): Promise<ApiResponse> {
  const workTrees = await db.getWorkTrees();
  let allTasks: any[] = [];
  for (const wt of workTrees) {
    const tasks = await db.getTasksByWorkTree(wt.id);
    allTasks = [...allTasks, ...tasks];
  }
  return { success: true, data: allTasks };
}

async function handleApprove(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Approval ID is required", requestId: getRequestId(event) } };
  }

  await db.updateApproval(id, { status: "approved", decided_at: new Date() });

  return { success: true, data: { id, status: "approved" } };
}

async function handleReject(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const id = event.pathParameters?.id;
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Approval ID is required", requestId: getRequestId(event) } };
  }

  await db.updateApproval(id, { status: "rejected", decided_at: new Date() });

  return { success: true, data: { id, status: "rejected" } };
}

async function handleAiChat(event: APIGatewayProxyEventV2): Promise<ApiResponse> {
  const body = parseBody(event);
  if (!body || !body.message) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "message is required", requestId: getRequestId(event) } };
  }

  const response = await ai.converse({
    messages: [
      { role: "user", content: [{ text: body.message }] },
    ],
    system: [{ text: "You are the Genesis AI assistant for AGENTIS GENESIS. Help users with their objectives." }],
  });

  return {
    success: true,
    data: {
      response: response.output.message.content[0]?.text || "",
      usage: response.usage,
    },
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = getRequestId(event);
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    let response: ApiResponse;

    if (method === "GET" && path === "/api/health") {
      response = await handleHealth();
    } else if (method === "GET" && path === "/api/work-trees") {
      response = await handleGetWorkTrees();
    } else if (method === "POST" && path === "/api/work-trees") {
      response = await handleCreateWorkTree(event);
    } else if (method === "GET" && path.match(/^\/api\/work-trees\/[^/]+$/)) {
      response = await handleGetWorkTree(event);
    } else if (method === "POST" && path.match(/^\/api\/work-trees\/[^/]+\/plan$/)) {
      response = await handlePlanWorkTree(event);
    } else if (method === "POST" && path.match(/^\/api\/work-trees\/[^/]+\/run$/)) {
      response = await handleRunWorkTree(event);
    } else if (method === "POST" && path.match(/^\/api\/work-trees\/[^/]+\/pause$/)) {
      response = await handlePauseWorkTree(event);
    } else if (method === "POST" && path.match(/^\/api\/work-trees\/[^/]+\/resume$/)) {
      response = await handleResumeWorkTree(event);
    } else if (method === "GET" && path.match(/^\/api\/work-trees\/[^/]+\/activity$/)) {
      response = await handleGetActivity(event);
    } else if (method === "GET" && path === "/api/agents") {
      response = await handleGetAgents();
    } else if (method === "GET" && path.match(/^\/api\/agents\/[^/]+$/)) {
      response = await handleGetAgent(event);
    } else if (method === "GET" && path === "/api/tasks") {
      response = await handleGetTasks();
    } else if (method === "POST" && path.match(/^\/api\/approvals\/[^/]+\/approve$/)) {
      response = await handleApprove(event);
    } else if (method === "POST" && path.match(/^\/api\/approvals\/[^/]+\/reject$/)) {
      response = await handleReject(event);
    } else if (method === "POST" && path === "/api/ai/chat") {
      response = await handleAiChat(event);
    } else {
      response = { success: false, error: { code: "NOT_FOUND", message: `Route ${method} ${path} not found`, requestId } };
    }

    const statusCode = response.success ? 200 : response.error?.code === "NOT_FOUND" ? 404 : response.error?.code === "VALIDATION_ERROR" ? 400 : 500;
    return createResponse(statusCode, { ...response, error: response.error ? { ...response.error, requestId } : undefined });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return createResponse(500, {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Internal server error",
        requestId,
      },
    });
  }
}