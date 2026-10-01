"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const config_1 = require("../config");
const db = __importStar(require("../database/services"));
const ai = __importStar(require("../ai"));
const artifacts_1 = require("../artifacts");
const execution_1 = require("../execution");
const services_1 = require("../database/services");
const response_1 = require("./response");
const auth_1 = require("./auth");
const WORK_TREE_ID = /^\/api\/work-trees\/([^/]+)$/;
const WORK_TREE_ACTIVITY = /^\/api\/work-trees\/([^/]+)\/activity$/;
const WORK_TREE_ARTIFACTS = /^\/api\/work-trees\/([^/]+)\/artifacts$/;
const WORK_TREE_EXECUTION = /^\/api\/work-trees\/([^/]+)\/execution$/;
const WORK_TREE_ACTION = /^\/api\/work-trees\/([^/]+)\/(plan|run|pause|resume)$/;
const AGENT_ID = /^\/api\/agents\/([^/]+)$/;
const ARTIFACT_URL = /^\/api\/artifacts\/([^/]+)\/url$/;
const APPROVAL_ACTION = /^\/api\/approvals\/([^/]+)\/(approve|reject)$/;
function getRequestId(event) {
    const headers = event.headers || {};
    const key = Object.keys(headers).find((k) => k.toLowerCase() === "x-request-id");
    return (key ? headers[key] : undefined) || event.requestContext?.requestId || (0, services_1.generateId)();
}
function parseJsonColumn(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "string")
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
function serializeWorkTree(row) {
    return { ...row, context: parseJsonColumn(row.context) };
}
function serializeAgent(row) {
    return {
        ...row,
        capabilities: parseJsonColumn(row.capabilities),
        permissions: parseJsonColumn(row.permissions),
        tools: parseJsonColumn(row.tools),
        resource_usage: parseJsonColumn(row.resource_usage),
    };
}
function serializeTask(row) {
    return {
        ...row,
        input: parseJsonColumn(row.input),
        output: parseJsonColumn(row.output),
        dependencies: parseJsonColumn(row.dependencies),
    };
}
function serializeArtifact(row) {
    return { ...row, metadata: parseJsonColumn(row.metadata) };
}
function serializeApproval(row) {
    return {
        ...row,
        recipients: parseJsonColumn(row.recipients),
        attachments: parseJsonColumn(row.attachments),
    };
}
function serializeEvent(row) {
    return { ...row, metadata: parseJsonColumn(row.metadata) };
}
function serializePlan(row) {
    if (!row)
        return null;
    return {
        ...row,
        tasks: parseJsonColumn(row.tasks),
        risks: parseJsonColumn(row.risks),
    };
}
function requireId(value, message, requestId) {
    if (!value) {
        return {
            response: (0, response_1.createResponse)(400, (0, response_1.fail)("VALIDATION_ERROR", message, requestId)),
        };
    }
    return { id: value };
}
async function handleHealth(requestId) {
    const config = (0, config_1.getConfig)();
    const dbHealthy = await Promise.resolve().then(() => __importStar(require("../database"))).then((m) => m.healthCheck());
    return (0, response_1.ok)({
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
    return (0, response_1.ok)(rows.map(serializeWorkTree));
}
async function handleCreateWorkTree(event, requestId, caller) {
    const body = (0, response_1.parseBody)(event);
    if (!body || !body.name || !body.objective) {
        return (0, response_1.fail)("VALIDATION_ERROR", "name and objective are required", requestId);
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
    return (0, response_1.ok)(serializeWorkTree(workTree));
}
async function handleGetWorkTree(id, requestId) {
    const workTree = await db.getWorkTree(id);
    if (!workTree) {
        return (0, response_1.fail)("NOT_FOUND", "Work tree not found", requestId);
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
    return (0, response_1.ok)({
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
async function handlePlanWorkTree(id, event, requestId) {
    const workTree = await db.getWorkTree(id);
    if (!workTree) {
        return (0, response_1.fail)("NOT_FOUND", "Work tree not found", requestId);
    }
    const body = (0, response_1.parseBody)(event);
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
    return (0, response_1.ok)(plan);
}
async function handleRunWorkTree(id, event, requestId, caller) {
    const workTree = await db.getWorkTree(id);
    if (!workTree) {
        return (0, response_1.fail)("NOT_FOUND", "Work tree not found", requestId);
    }
    const body = (0, response_1.parseBody)(event);
    const idempotencyKey = body?.idempotencyKey || null;
    if (idempotencyKey) {
        const existing = await db.getWorkTreeByIdempotencyKey(idempotencyKey);
        if (existing && existing.id !== id) {
            return (0, response_1.fail)("CONFLICT", "Idempotency key already used for another work tree", requestId);
        }
        if (existing && existing.execution_arn) {
            return (0, response_1.ok)({
                workTreeId: id,
                status: existing.status,
                executionArn: existing.execution_arn,
                correlationId: existing.correlation_id,
                idempotentReplay: true,
            });
        }
    }
    if (workTree.execution_arn && workTree.status === "running") {
        return (0, response_1.fail)("CONFLICT", "Execution already in progress for this work tree", requestId);
    }
    const correlationId = workTree.correlation_id || (0, services_1.generateId)();
    try {
        const started = await (0, execution_1.startExecution)({
            workTreeId: id,
            objective: workTree.objective,
            correlationId,
            idempotencyKey,
        }, caller.subject);
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
        return (0, response_1.ok)({
            workTreeId: id,
            status: "running",
            executionArn: started.executionArn,
            correlationId,
            idempotentReplay: false,
        });
    }
    catch (error) {
        if (error instanceof execution_1.ExecutionUnavailableError) {
            await db.createActivityEvent({
                workTreeId: id,
                eventType: "WORK_TREE_START_FAILED",
                status: "error",
                message: error.message,
                metadata: { requestId },
            });
            return (0, response_1.fail)("ORCHESTRATION_UNAVAILABLE", error.message, requestId);
        }
        throw error;
    }
}
async function handlePauseWorkTree(id, requestId) {
    const workTree = await db.getWorkTree(id);
    if (!workTree) {
        return (0, response_1.fail)("NOT_FOUND", "Work tree not found", requestId);
    }
    await db.updateWorkTree(id, { status: "waiting" });
    await db.createActivityEvent({
        workTreeId: id,
        eventType: "WORK_TREE_PAUSED",
        status: "warning",
        message: "Work tree paused",
        metadata: { requestId },
    });
    return (0, response_1.ok)({ workTreeId: id, status: "waiting" });
}
async function handleResumeWorkTree(id, requestId, caller) {
    const workTree = await db.getWorkTree(id);
    if (!workTree) {
        return (0, response_1.fail)("NOT_FOUND", "Work tree not found", requestId);
    }
    if (workTree.status === "waiting" && workTree.execution_arn) {
        return (0, response_1.fail)("CONFLICT", "A paused execution cannot be resumed in place. Start a new execution instead.", requestId);
    }
    const correlationId = workTree.correlation_id || (0, services_1.generateId)();
    const started = await (0, execution_1.startExecution)({
        workTreeId: id,
        objective: workTree.objective,
        correlationId,
        idempotencyKey: null,
    }, caller.subject);
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
    return (0, response_1.ok)({
        workTreeId: id,
        status: "running",
        executionArn: started.executionArn,
        correlationId,
    });
}
async function handleExecutionStatus(id, requestId) {
    const workTree = await db.getWorkTree(id);
    if (!workTree) {
        return (0, response_1.fail)("NOT_FOUND", "Work tree not found", requestId);
    }
    if (!workTree.execution_arn) {
        return (0, response_1.ok)({ workTreeId: id, status: "NOT_STARTED", storedStatus: workTree.status });
    }
    const state = await (0, execution_1.describeExecution)(workTree.execution_arn);
    return (0, response_1.ok)({
        workTreeId: id,
        status: state.status,
        storedStatus: workTree.status,
        executionArn: workTree.execution_arn,
        correlationId: workTree.correlation_id,
        errorName: state.errorName,
        errorCause: state.errorCause,
    });
}
async function handleArtifacts(id, requestId) {
    const workTree = await db.getWorkTree(id);
    if (!workTree) {
        return (0, response_1.fail)("NOT_FOUND", "Work tree not found", requestId);
    }
    const rows = await db.getArtifactsByWorkTree(id);
    return (0, response_1.ok)(rows.map(serializeArtifact));
}
async function handleArtifactUrl(id, requestId) {
    const config = (0, config_1.getConfig)();
    const artifact = await db.getArtifactById(id);
    if (!artifact) {
        return (0, response_1.fail)("NOT_FOUND", "Artifact not found", requestId);
    }
    const url = await (0, artifacts_1.getArtifactSignedUrl)(artifact.s3_key, config.artifactUrlTtlSeconds);
    return (0, response_1.ok)({
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
    const all = [];
    for (const wt of workTrees) {
        all.push(...(await db.getAgentsByWorkTree(wt.id)));
    }
    return (0, response_1.ok)(all.map(serializeAgent));
}
async function handleGetAgent(id, requestId) {
    const agent = await db.getAgent(id);
    if (!agent) {
        return (0, response_1.fail)("NOT_FOUND", "Agent not found", requestId);
    }
    return (0, response_1.ok)(serializeAgent(agent));
}
async function handleListTasks() {
    const workTrees = await db.getWorkTrees();
    const all = [];
    for (const wt of workTrees) {
        all.push(...(await db.getTasksByWorkTree(wt.id)));
    }
    return (0, response_1.ok)(all.map(serializeTask));
}
async function handleApprovalAction(id, decision, caller) {
    const existing = await db.getApproval(id);
    if (!existing) {
        return (0, response_1.fail)("NOT_FOUND", "Approval not found", id);
    }
    if (existing.status !== "pending") {
        return (0, response_1.fail)("CONFLICT", `Approval already ${existing.status}`, id);
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
    return (0, response_1.ok)({ id, status: decision, decided_by: caller.subject });
}
async function handleAiChat(event, requestId) {
    const body = (0, response_1.parseBody)(event);
    if (!body || !body.message) {
        return (0, response_1.fail)("VALIDATION_ERROR", "message is required", requestId);
    }
    const response = await ai.converse({
        messages: [{ role: "user", content: [{ text: body.message }] }],
        system: [
            {
                text: "You are the Genesis AI assistant for AGENTIS GENESIS. Help users with their objectives.",
            },
        ],
    });
    return (0, response_1.ok)({
        response: response.output.message.content[0]?.text || "",
        usage: response.usage,
    });
}
async function handler(event) {
    const requestId = getRequestId(event);
    const method = event.requestContext?.http?.method || "GET";
    const path = event.requestContext?.http?.path || "/";
    try {
        const auth = (0, auth_1.requireAuth)(event, requestId);
        if ((0, auth_1.isAuthFailure)(auth)) {
            return auth.response;
        }
        const caller = auth.caller;
        let response;
        if (method === "GET" && path === "/api/health") {
            response = await handleHealth(requestId);
        }
        else if (method === "GET" && path === "/api/work-trees") {
            response = await handleListWorkTrees();
        }
        else if (method === "POST" && path === "/api/work-trees") {
            response = await handleCreateWorkTree(event, requestId, caller);
        }
        else if (method === "GET" && WORK_TREE_ID.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", WORK_TREE_ID), "Work tree ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handleGetWorkTree(parsed.id, requestId);
        }
        else if (method === "POST" && /^\/api\/work-trees\/[^/]+\/plan$/.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", WORK_TREE_ACTION), "Work tree ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handlePlanWorkTree(parsed.id, event, requestId);
        }
        else if (method === "POST" && /^\/api\/work-trees\/[^/]+\/run$/.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", WORK_TREE_ACTION), "Work tree ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handleRunWorkTree(parsed.id, event, requestId, caller);
        }
        else if (method === "POST" && /^\/api\/work-trees\/[^/]+\/pause$/.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", WORK_TREE_ACTION), "Work tree ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handlePauseWorkTree(parsed.id, requestId);
        }
        else if (method === "POST" && /^\/api\/work-trees\/[^/]+\/resume$/.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", WORK_TREE_ACTION), "Work tree ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handleResumeWorkTree(parsed.id, requestId, caller);
        }
        else if (method === "GET" && WORK_TREE_ACTIVITY.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", WORK_TREE_ACTIVITY), "Work tree ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            const activity = await db.getActivityEventsByWorkTree(parsed.id);
            response = (0, response_1.ok)(activity.map(serializeEvent));
        }
        else if (method === "GET" && WORK_TREE_ARTIFACTS.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", WORK_TREE_ARTIFACTS), "Work tree ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handleArtifacts(parsed.id, requestId);
        }
        else if (method === "GET" && WORK_TREE_EXECUTION.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", WORK_TREE_EXECUTION), "Work tree ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handleExecutionStatus(parsed.id, requestId);
        }
        else if (method === "GET" && path === "/api/agents") {
            response = await handleListAgents();
        }
        else if (method === "GET" && AGENT_ID.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", AGENT_ID), "Agent ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handleGetAgent(parsed.id, requestId);
        }
        else if (method === "GET" && path === "/api/tasks") {
            response = await handleListTasks();
        }
        else if (method === "GET" && ARTIFACT_URL.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", ARTIFACT_URL), "Artifact ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            response = await handleArtifactUrl(parsed.id, requestId);
        }
        else if (method === "POST" && /^\/api\/approvals\/[^/]+\/(approve|reject)$/.test(path)) {
            const parsed = requireId((0, response_1.readPathParam)(event, "id", APPROVAL_ACTION), "Approval ID is required", requestId);
            if ("response" in parsed)
                return parsed.response;
            const decision = path.endsWith("/approve") ? "approved" : "rejected";
            response = await handleApprovalAction(parsed.id, decision, caller);
        }
        else if (method === "POST" && path === "/api/ai/chat") {
            response = await handleAiChat(event, requestId);
        }
        else {
            response = (0, response_1.fail)("NOT_FOUND", `Route ${method} ${path} not found`, requestId);
        }
        const statusCode = response.success ? 200 : (0, response_1.statusForError)(response.error?.code || "INTERNAL_ERROR");
        return (0, response_1.createResponse)(statusCode, response);
    }
    catch (error) {
        console.error(JSON.stringify({ level: "error", requestId, method, path, message: error instanceof Error ? error.message : String(error) }));
        return (0, response_1.createResponse)(500, (0, response_1.fail)("INTERNAL_ERROR", error instanceof Error ? error.message : "Internal server error", requestId));
    }
}
