import { getConfig } from "../config";
import * as db from "../database/services";
import * as ai from "../ai";
import { getArtifactSignedUrl } from "../artifacts";
import { startExecution, describeExecution, ExecutionUnavailableError } from "../execution";
import { generateId } from "../database/services";
import {
  createResponse,
  ok,
  fail,
  statusForError,
  parseBody,
  readPathParam,
  EventLike,
} from "./response";
import { requireAuth, isAuthFailure, AuthenticatedCaller } from "./auth";

const WORK_TREE_ID = /^\/api\/work-trees\/([^/]+)$/;
const WORK_TREE_ACTIVITY = /^\/api\/work-trees\/([^/]+)\/activity$/;
const WORK_TREE_ARTIFACTS = /^\/api\/work-trees\/([^/]+)\/artifacts$/;
const WORK_TREE_EXECUTION = /^\/api\/work-trees\/([^/]+)\/execution$/;
const WORK_TREE_ACTION = /^\/api\/work-trees\/([^/]+)\/(plan|run|pause|resume)$/;
const AGENT_ID = /^\/api\/agents\/([^/]+)$/;
const ARTIFACT_URL = /^\/api\/artifacts\/([^/]+)\/url$/;
const APPROVAL_ACTION = /^\/api\/approvals\/([^/]+)\/(approve|reject)$/;

function getRequestId(event: EventLike): string {
  const headers = event.headers || {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === "x-request-id");
  return (key ? headers[key] : undefined) || event.requestContext?.requestId || generateId();
}

function parseJsonColumn(value: string | null | undefined): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function serializeWorkTree(row: db.WorkTreeRow): Record<string, unknown> {
  return { ...row, context: parseJsonColumn(row.context) };
}

function serializeAgent(row: db.AgentRow): Record<string, unknown> {
  return {
    ...row,
    capabilities: parseJsonColumn(row.capabilities),
    permissions: parseJsonColumn(row.permissions),
    tools: parseJsonColumn(row.tools),
    resource_usage: parseJsonColumn(row.resource_usage),
  };
}

function serializeTask(row: db.TaskRow): Record<string, unknown> {
  return {
    ...row,
    input: parseJsonColumn(row.input),
    output: parseJsonColumn(row.output),
    dependencies: parseJsonColumn(row.dependencies),
  };
}

function serializeArtifact(row: db.ArtifactRow): Record<string, unknown> {
  return { ...row, metadata: parseJsonColumn(row.metadata) };
}

function serializeApproval(row: db.ApprovalRow): Record<string, unknown> {
  return {
    ...row,
    recipients: parseJsonColumn(row.recipients),
    attachments: parseJsonColumn(row.attachments),
  };
}

function serializeEvent(row: db.ActivityEventRow): Record<string, unknown> {
  return { ...row, metadata: parseJsonColumn(row.metadata) };
}

function serializePlan(row: db.WorkTreePlanRow | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    tasks: parseJsonColumn(row.tasks),
    risks: parseJsonColumn(row.risks),
  };
}

function requireId(
  value: string | undefined,
  message: string,
  requestId: string
): { id: string } | { response: ReturnType<typeof createResponse> } {
  if (!value) {
    return {
      response: createResponse(400, fail("VALIDATION_ERROR", message, requestId)),
    };
  }
  return { id: value };
}

async function handleHealth(requestId: string) {
  const config = getConfig();
  const dbHealthy = await import("../database").then((m) => m.healthCheck());

  return ok({
    status: dbHealthy ? "ok" : "degraded",
    services: {
      api: "ok",
      database: dbHealthy ? "ok" : "error",
      bedrock: config.mockAi ? "mock" : "configured",
      secrets: config.bedrockApiKeySecretArn ? "configured" : "not_configured",
      storage: config.artifactBucketName ? "configured" : "not_configured",
      orchestration: config.stateMachineArn ? "configured" : "not_configured",
    },
    auth: {
      required: config.authRequired,
      issuer: config.cognitoIssuer || "not_configured",
    },
    environment: config.environment,
    correlationId: requestId,
    timestamp: new Date().toISOString(),
  });
}

async function handleListWorkTrees() {
  const rows = await db.getWorkTrees();
  return ok(rows.map(serializeWorkTree));
}

async function handleCreateWorkTree(event: EventLike, requestId: string, caller: AuthenticatedCaller) {
  const body = parseBody(event) as { name?: string; objective?: string; context?: object } | null;

  if (!body || !body.name || !body.objective) {
    return fail("VALIDATION_ERROR", "name and objective are required", requestId);
  }

  const workTree = await db.createWorkTree({
    name: body.name,
    objective: body.objective,
    context: { ...(body.context || {}), createdBy: caller.subject },
  });

  await db.createActivityEvent({
    workTreeId: workTree.id,
    eventType: "WORK_TREE_CREATED",
    status: "success",
    message: `Work tree "${workTree.name}" created`,
    metadata: { requestId, actor: caller.subject },
  });

  return ok(serializeWorkTree(workTree));
}

async function handleGetWorkTree(id: string, requestId: string) {
  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return fail("NOT_FOUND", "Work tree not found", requestId);
  }

  const [agents, tasks, artifactRows, approvals, activity, plan, runs] = await Promise.all([
    db.getAgentsByWorkTree(id),
    db.getTasksByWorkTree(id),
    db.getArtifactsByWorkTree(id),
    db.getApprovalsByWorkTree(id),
    db.getActivityEventsByWorkTree(id),
    db.getWorkTreePlan(id),
    db.getAgentRunsByWorkTree(id),
  ]);

  return ok({
    ...serializeWorkTree(workTree),
    agents: agents.map(serializeAgent),
    tasks: tasks.map(serializeTask),
    artifacts: artifactRows.map(serializeArtifact),
    approvals: approvals.map(serializeApproval),
    activity: activity.map(serializeEvent),
    plan: serializePlan(plan),
    runs,
  });
}

async function handlePlanWorkTree(id: string, event: EventLike, requestId: string) {
  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return fail("NOT_FOUND", "Work tree not found", requestId);
  }

  const body = parseBody(event) as { objective?: string } | null;
  const plan = await ai.generatePlan({
    objective: body?.objective || workTree.objective,
    context: workTree.context,
    existingWorkTreeId: id,
  });

  const planRecord = await db.createWorkTreePlan({
    workTreeId: id,
    objective: plan.objective,
    summary: plan.summary,
    context: workTree.context,
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
    metadata: { requestId, planId: planRecord.id, taskCount: plan.tasks.length },
  });

  return ok(plan);
}

async function handleRunWorkTree(
  id: string,
  event: EventLike,
  requestId: string,
  caller: AuthenticatedCaller
) {
  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return fail("NOT_FOUND", "Work tree not found", requestId);
  }

  const body = parseBody(event) as { idempotencyKey?: string } | null;
  const idempotencyKey = body?.idempotencyKey || null;

  if (idempotencyKey) {
    const existing = await db.getWorkTreeByIdempotencyKey(idempotencyKey);
    if (existing && existing.id !== id) {
      return fail("CONFLICT", "Idempotency key already used for another work tree", requestId);
    }
    if (existing && existing.execution_arn) {
      return ok({
        workTreeId: id,
        status: existing.status,
        executionArn: existing.execution_arn,
        correlationId: existing.correlation_id,
        idempotentReplay: true,
      });
    }
  }

  if (workTree.execution_arn && workTree.status === "running") {
    return fail("CONFLICT", "Execution already in progress for this work tree", requestId);
  }

  const correlationId = workTree.correlation_id || generateId();

  try {
    const started = await startExecution(
      {
        workTreeId: id,
        objective: workTree.objective,
        correlationId,
        idempotencyKey,
      },
      caller.subject
    );

    await db.attachExecution({
      workTreeId: id,
      executionArn: started.executionArn,
      correlationId,
      idempotencyKey,
    });

    await db.updateWorkTree(id, { status: "running" });

    await db.createActivityEvent({
      workTreeId: id,
      eventType: "WORK_TREE_STARTED",
      status: "info",
      message: "Work tree execution started",
      metadata: { requestId, correlationId, executionArn: started.executionArn },
    });

    return ok({
      workTreeId: id,
      status: "running",
      executionArn: started.executionArn,
      correlationId,
      idempotentReplay: false,
    });
  } catch (error) {
    if (error instanceof ExecutionUnavailableError) {
      await db.createActivityEvent({
        workTreeId: id,
        eventType: "WORK_TREE_START_FAILED",
        status: "error",
        message: error.message,
        metadata: { requestId },
      });
      return fail("ORCHESTRATION_UNAVAILABLE", error.message, requestId);
    }
    throw error;
  }
}

async function handlePauseWorkTree(id: string, requestId: string) {
  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return fail("NOT_FOUND", "Work tree not found", requestId);
  }

  await db.updateWorkTree(id, { status: "waiting" });
  await db.createActivityEvent({
    workTreeId: id,
    eventType: "WORK_TREE_PAUSED",
    status: "warning",
    message: "Work tree paused",
    metadata: { requestId },
  });

  return ok({ workTreeId: id, status: "waiting" });
}

async function handleResumeWorkTree(id: string, requestId: string, caller: AuthenticatedCaller) {
  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return fail("NOT_FOUND", "Work tree not found", requestId);
  }

  if (workTree.status === "waiting" && workTree.execution_arn) {
    return fail(
      "CONFLICT",
      "A paused execution cannot be resumed in place. Start a new execution instead.",
      requestId
    );
  }

  const correlationId = workTree.correlation_id || generateId();
  const started = await startExecution(
    {
      workTreeId: id,
      objective: workTree.objective,
      correlationId,
      idempotencyKey: null,
    },
    caller.subject
  );

  await db.attachExecution({
    workTreeId: id,
    executionArn: started.executionArn,
    correlationId,
    idempotencyKey: null,
  });
  await db.updateWorkTree(id, { status: "running" });

  await db.createActivityEvent({
    workTreeId: id,
    eventType: "WORK_TREE_RESUMED",
    status: "info",
    message: "Work tree resumed with a new execution",
    metadata: { requestId, correlationId, executionArn: started.executionArn },
  });

  return ok({
    workTreeId: id,
    status: "running",
    executionArn: started.executionArn,
    correlationId,
  });
}

async function handleExecutionStatus(id: string, requestId: string) {
  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return fail("NOT_FOUND", "Work tree not found", requestId);
  }

  if (!workTree.execution_arn) {
    return ok({ workTreeId: id, status: "NOT_STARTED", storedStatus: workTree.status });
  }

  const state = await describeExecution(workTree.execution_arn);
  return ok({
    workTreeId: id,
    status: state.status,
    storedStatus: workTree.status,
    executionArn: workTree.execution_arn,
    correlationId: workTree.correlation_id,
    errorName: state.errorName,
    errorCause: state.errorCause,
  });
}

async function handleArtifacts(id: string, requestId: string) {
  const workTree = await db.getWorkTree(id);
  if (!workTree) {
    return fail("NOT_FOUND", "Work tree not found", requestId);
  }
  const rows = await db.getArtifactsByWorkTree(id);
  return ok(rows.map(serializeArtifact));
}

async function handleArtifactUrl(id: string, requestId: string) {
  const config = getConfig();
  const artifact = await db.getArtifactById(id);
  if (!artifact) {
    return fail("NOT_FOUND", "Artifact not found", requestId);
  }

  const url = await getArtifactSignedUrl(artifact.s3_key, config.artifactUrlTtlSeconds);
  return ok({
    id: artifact.id,
    name: artifact.name,
    type: artifact.type,
    s3Key: artifact.s3_key,
    url,
    expiresIn: config.artifactUrlTtlSeconds,
  });
}

async function handleListAgents() {
  const workTrees = await db.getWorkTrees();
  const all: db.AgentRow[] = [];
  for (const wt of workTrees) {
    all.push(...(await db.getAgentsByWorkTree(wt.id)));
  }
  return ok(all.map(serializeAgent));
}

async function handleGetAgent(id: string, requestId: string) {
  const agent = await db.getAgent(id);
  if (!agent) {
    return fail("NOT_FOUND", "Agent not found", requestId);
  }
  return ok(serializeAgent(agent));
}

async function handleListTasks() {
  const workTrees = await db.getWorkTrees();
  const all: db.TaskRow[] = [];
  for (const wt of workTrees) {
    all.push(...(await db.getTasksByWorkTree(wt.id)));
  }
  return ok(all.map(serializeTask));
}

async function handleApprovalAction(
  id: string,
  decision: "approved" | "rejected",
  caller: AuthenticatedCaller
) {
  const existing = await db.getApproval(id);
  if (!existing) {
    return fail("NOT_FOUND", "Approval not found", id);
  }
  if (existing.status !== "pending") {
    return fail("CONFLICT", `Approval already ${existing.status}`, id);
  }

  await db.updateApproval(id, {
    status: decision,
    decided_by: caller.subject,
    decided_at: new Date(),
  });

  await db.createActivityEvent({
    workTreeId: existing.work_tree_id,
    taskId: existing.task_id || undefined,
    eventType: decision === "approved" ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED",
    status: decision === "approved" ? "success" : "warning",
    message: `Approval ${decision} by ${caller.subject}`,
    metadata: { approvalId: id, actor: caller.subject },
  });

  return ok({ id, status: decision, decided_by: caller.subject });
}

async function handleAiChat(event: EventLike, requestId: string) {
  const body = parseBody(event) as { message?: string } | null;
  if (!body || !body.message) {
    return fail("VALIDATION_ERROR", "message is required", requestId);
  }

  const response = await ai.converse({
    messages: [{ role: "user", content: [{ text: body.message }] }],
    system: [
      {
        text: "You are the Genesis AI assistant for AGENTIS GENESIS. Help users with their objectives.",
      },
    ],
  });

  return ok({
    response: response.output.message.content[0]?.text || "",
    usage: response.usage,
  });
}

export async function handler(event: EventLike) {
  const requestId = getRequestId(event);
  const method = event.requestContext?.http?.method || "GET";
  const path = event.requestContext?.http?.path || "/";

  try {
    const auth = requireAuth(event, requestId);
    if (isAuthFailure(auth)) {
      return auth.response;
    }
    const caller = auth.caller;

    let response: ReturnType<typeof ok> | ReturnType<typeof fail>;

    if (method === "GET" && path === "/api/health") {
      response = await handleHealth(requestId);
    } else if (method === "GET" && path === "/api/work-trees") {
      response = await handleListWorkTrees();
    } else if (method === "POST" && path === "/api/work-trees") {
      response = await handleCreateWorkTree(event, requestId, caller);
    } else if (method === "GET" && WORK_TREE_ID.test(path)) {
      const parsed = requireId(readPathParam(event, "id", WORK_TREE_ID), "Work tree ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handleGetWorkTree(parsed.id, requestId);
    } else if (method === "POST" && /^\/api\/work-trees\/[^/]+\/plan$/.test(path)) {
      const parsed = requireId(readPathParam(event, "id", WORK_TREE_ACTION), "Work tree ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handlePlanWorkTree(parsed.id, event, requestId);
    } else if (method === "POST" && /^\/api\/work-trees\/[^/]+\/run$/.test(path)) {
      const parsed = requireId(readPathParam(event, "id", WORK_TREE_ACTION), "Work tree ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handleRunWorkTree(parsed.id, event, requestId, caller);
    } else if (method === "POST" && /^\/api\/work-trees\/[^/]+\/pause$/.test(path)) {
      const parsed = requireId(readPathParam(event, "id", WORK_TREE_ACTION), "Work tree ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handlePauseWorkTree(parsed.id, requestId);
    } else if (method === "POST" && /^\/api\/work-trees\/[^/]+\/resume$/.test(path)) {
      const parsed = requireId(readPathParam(event, "id", WORK_TREE_ACTION), "Work tree ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handleResumeWorkTree(parsed.id, requestId, caller);
    } else if (method === "GET" && WORK_TREE_ACTIVITY.test(path)) {
      const parsed = requireId(readPathParam(event, "id", WORK_TREE_ACTIVITY), "Work tree ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      const activity = await db.getActivityEventsByWorkTree(parsed.id);
      response = ok(activity.map(serializeEvent));
    } else if (method === "GET" && WORK_TREE_ARTIFACTS.test(path)) {
      const parsed = requireId(readPathParam(event, "id", WORK_TREE_ARTIFACTS), "Work tree ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handleArtifacts(parsed.id, requestId);
    } else if (method === "GET" && WORK_TREE_EXECUTION.test(path)) {
      const parsed = requireId(readPathParam(event, "id", WORK_TREE_EXECUTION), "Work tree ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handleExecutionStatus(parsed.id, requestId);
    } else if (method === "GET" && path === "/api/agents") {
      response = await handleListAgents();
    } else if (method === "GET" && AGENT_ID.test(path)) {
      const parsed = requireId(readPathParam(event, "id", AGENT_ID), "Agent ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handleGetAgent(parsed.id, requestId);
    } else if (method === "GET" && path === "/api/tasks") {
      response = await handleListTasks();
    } else if (method === "GET" && ARTIFACT_URL.test(path)) {
      const parsed = requireId(readPathParam(event, "id", ARTIFACT_URL), "Artifact ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      response = await handleArtifactUrl(parsed.id, requestId);
    } else if (method === "POST" && /^\/api\/approvals\/[^/]+\/(approve|reject)$/.test(path)) {
      const parsed = requireId(readPathParam(event, "id", APPROVAL_ACTION), "Approval ID is required", requestId);
      if ("response" in parsed) return parsed.response;
      const decision = path.endsWith("/approve") ? "approved" : "rejected";
      response = await handleApprovalAction(parsed.id, decision, caller);
    } else if (method === "POST" && path === "/api/ai/chat") {
      response = await handleAiChat(event, requestId);
    } else {
      response = fail("NOT_FOUND", `Route ${method} ${path} not found`, requestId);
    }

    const statusCode = response.success ? 200 : statusForError(response.error?.code || "INTERNAL_ERROR");
    return createResponse(statusCode, response);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", requestId, method, path, message: error instanceof Error ? error.message : String(error) }));
    return createResponse(
      500,
      fail("INTERNAL_ERROR", error instanceof Error ? error.message : "Internal server error", requestId)
    );
  }
}
