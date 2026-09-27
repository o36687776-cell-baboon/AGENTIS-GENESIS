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
const db = __importStar(require("../database/services"));
const ai = __importStar(require("../ai"));
const services_1 = require("../database/services");
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}
async function handler(event) {
    const action = event.action;
    try {
        switch (action) {
            case "generatePlan": {
                const { workTree, objective } = event;
                const plan = await ai.generatePlan({
                    objective: objective || workTree?.objective || "",
                    context: workTree?.context,
                    existingWorkTreeId: workTree?.id,
                });
                return createResponse(200, { success: true, data: plan });
            }
            case "loadWorkTree": {
                const workTreeId = event.workTreeId || "";
                const workTree = await db.getWorkTree(workTreeId);
                if (!workTree) {
                    return createResponse(404, { success: false, error: "Work tree not found" });
                }
                const [agents, tasks, artifacts, approvals, activity] = await Promise.all([
                    db.getAgentsByWorkTree(workTreeId),
                    db.getTasksByWorkTree(workTreeId),
                    db.getArtifactsByWorkTree(workTreeId),
                    db.getApprovalsByWorkTree(workTreeId),
                    db.getActivityEventsByWorkTree(workTreeId),
                ]);
                return createResponse(200, { success: true, data: { ...workTree, agents, tasks, artifacts, approvals, activity } });
            }
            case "createTasks": {
                const workTreeId = event.workTreeId || "";
                const plan = event.plan || { tasks: [] };
                const createdTasks = [];
                for (const task of plan.tasks) {
                    const created = await db.createTask({
                        workTreeId,
                        title: task.title,
                        description: task.description,
                        priority: task.priority,
                        dependencies: task.dependencies,
                        estimatedDurationMinutes: task.estimatedDurationMinutes,
                        input: { planTaskId: task.id, agentType: task.agentType },
                    });
                    createdTasks.push(created);
                }
                await db.updateWorkTree(workTreeId, { status: "running" });
                return createResponse(200, { success: true, data: createdTasks });
            }
            case "executeTask": {
                const task = event.task;
                const workTreeId = event.workTreeId || "";
                if (!task || !task.id) {
                    return createResponse(400, { success: false, error: "Task is required" });
                }
                const runId = (0, services_1.generateId)();
                await db.createActivityEvent({
                    workTreeId,
                    taskId: task.id,
                    eventType: "AGENT_STARTED",
                    status: "info",
                    message: `Agent started task: ${task.title}`,
                });
                await db.updateTask(task.id, { status: "running", started_at: new Date() });
                const mockResult = {
                    output: `Completed: ${task.title}`,
                    artifacts: [],
                    metrics: { tokens: 1000, durationMs: 5000 },
                };
                await db.updateTask(task.id, { status: "completed", progress: 100, completed_at: new Date(), output: JSON.stringify(mockResult) });
                await db.createActivityEvent({
                    workTreeId,
                    taskId: task.id,
                    eventType: "AGENT_COMPLETED",
                    status: "success",
                    message: `Task completed: ${task.title}`,
                });
                return createResponse(200, { success: true, data: { taskId: task.id, result: mockResult, status: "completed" } });
            }
            case "storeResults": {
                const executionResults = event.executionResults || [];
                return createResponse(200, { success: true, data: { stored: executionResults.length } });
            }
            case "verify": {
                const workTreeId = event.workTreeId || "";
                const requiresApproval = false;
                return createResponse(200, { success: true, data: { requiresApproval, approved: true } });
            }
            case "checkApproval": {
                const workTreeId = event.workTreeId || "";
                return createResponse(200, { success: true, data: { approved: true } });
            }
            case "finalize": {
                const workTreeId = event.workTreeId || "";
                await db.updateWorkTree(workTreeId, { status: "completed", progress: 100, completed_at: new Date() });
                await db.createActivityEvent({
                    workTreeId,
                    eventType: "WORK_TREE_COMPLETED",
                    status: "success",
                    message: `Work tree completed successfully`,
                });
                return createResponse(200, { success: true, data: { outcome: "completed" } });
            }
            default:
                return createResponse(400, { success: false, error: `Unknown action: ${action}` });
        }
    }
    catch (error) {
        console.error("Worker error:", error);
        return createResponse(500, { success: false, error: error instanceof Error ? error.message : "Internal error" });
    }
}
//# sourceMappingURL=agent-worker.js.map