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
const services_1 = require("../database/services");
const config = (0, config_1.getConfig)();
function createResponse(statusCode, body) {
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
function getRequestId(event) {
    return event.headers["x-request-id"] || event.requestContext.requestId || (0, services_1.generateId)();
}
function parseBody(event) {
    if (!event.body)
        return null;
    try {
        return JSON.parse(event.body);
    }
    catch {
        return null;
    }
}
async function handleHealth() {
    const dbHealthy = await Promise.resolve().then(() => __importStar(require("../database"))).then((m) => m.healthCheck());
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
async function handleGetWorkTrees() {
    const workTrees = await db.getWorkTrees();
    return { success: true, data: workTrees };
}
async function handleCreateWorkTree(event) {
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
async function handleGetWorkTree(event) {
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
async function handlePlanWorkTree(event) {
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
async function handleRunWorkTree(event) {
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
async function handlePauseWorkTree(event) {
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
async function handleResumeWorkTree(event) {
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
async function handleGetActivity(event) {
    const id = event.pathParameters?.id;
    if (!id) {
        return { success: false, error: { code: "VALIDATION_ERROR", message: "Work tree ID is required", requestId: getRequestId(event) } };
    }
    const activity = await db.getActivityEventsByWorkTree(id);
    return { success: true, data: activity };
}
async function handleGetAgents() {
    const workTrees = await db.getWorkTrees();
    let allAgents = [];
    for (const wt of workTrees) {
        const agents = await db.getAgentsByWorkTree(wt.id);
        allAgents = [...allAgents, ...agents];
    }
    return { success: true, data: allAgents };
}
async function handleGetAgent(event) {
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
async function handleGetTasks() {
    const workTrees = await db.getWorkTrees();
    let allTasks = [];
    for (const wt of workTrees) {
        const tasks = await db.getTasksByWorkTree(wt.id);
        allTasks = [...allTasks, ...tasks];
    }
    return { success: true, data: allTasks };
}
async function handleApprove(event) {
    const id = event.pathParameters?.id;
    if (!id) {
        return { success: false, error: { code: "VALIDATION_ERROR", message: "Approval ID is required", requestId: getRequestId(event) } };
    }
    await db.updateApproval(id, { status: "approved", decided_at: new Date() });
    return { success: true, data: { id, status: "approved" } };
}
async function handleReject(event) {
    const id = event.pathParameters?.id;
    if (!id) {
        return { success: false, error: { code: "VALIDATION_ERROR", message: "Approval ID is required", requestId: getRequestId(event) } };
    }
    await db.updateApproval(id, { status: "rejected", decided_at: new Date() });
    return { success: true, data: { id, status: "rejected" } };
}
async function handleAiChat(event) {
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
async function handler(event) {
    const requestId = getRequestId(event);
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    try {
        let response;
        if (method === "GET" && path === "/api/health") {
            response = await handleHealth();
        }
        else if (method === "GET" && path === "/api/work-trees") {
            response = await handleGetWorkTrees();
        }
        else if (method === "POST" && path === "/api/work-trees") {
            response = await handleCreateWorkTree(event);
        }
        else if (method === "GET" && path.match(/^\/api\/work-trees\/[^/]+$/)) {
            response = await handleGetWorkTree(event);
        }
        else if (method === "POST" && path.match(/^\/api\/work-trees\/[^/]+\/plan$/)) {
            response = await handlePlanWorkTree(event);
        }
        else if (method === "POST" && path.match(/^\/api\/work-trees\/[^/]+\/run$/)) {
            response = await handleRunWorkTree(event);
        }
        else if (method === "POST" && path.match(/^\/api\/work-trees\/[^/]+\/pause$/)) {
            response = await handlePauseWorkTree(event);
        }
        else if (method === "POST" && path.match(/^\/api\/work-trees\/[^/]+\/resume$/)) {
            response = await handleResumeWorkTree(event);
        }
        else if (method === "GET" && path.match(/^\/api\/work-trees\/[^/]+\/activity$/)) {
            response = await handleGetActivity(event);
        }
        else if (method === "GET" && path === "/api/agents") {
            response = await handleGetAgents();
        }
        else if (method === "GET" && path.match(/^\/api\/agents\/[^/]+$/)) {
            response = await handleGetAgent(event);
        }
        else if (method === "GET" && path === "/api/tasks") {
            response = await handleGetTasks();
        }
        else if (method === "POST" && path.match(/^\/api\/approvals\/[^/]+\/approve$/)) {
            response = await handleApprove(event);
        }
        else if (method === "POST" && path.match(/^\/api\/approvals\/[^/]+\/reject$/)) {
            response = await handleReject(event);
        }
        else if (method === "POST" && path === "/api/ai/chat") {
            response = await handleAiChat(event);
        }
        else {
            response = { success: false, error: { code: "NOT_FOUND", message: `Route ${method} ${path} not found`, requestId } };
        }
        const statusCode = response.success ? 200 : response.error?.code === "NOT_FOUND" ? 404 : response.error?.code === "VALIDATION_ERROR" ? 400 : 500;
        return createResponse(statusCode, { ...response, error: response.error ? { ...response.error, requestId } : undefined });
    }
    catch (error) {
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
