import * as db from "../database/services";
import * as ai from "../ai";
import { generateId } from "../database/services";

interface WorkerEvent {
  action: string;
  workTreeId?: string;
  objective?: string;
  workTree?: any;
  plan?: any;
  task?: any;
  tasks?: any[];
  executionResults?: any[];
  results?: any;
  verification?: any;
}

function createResponse(statusCode: number, body: any) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(event: WorkerEvent): Promise<any> {
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
        const runId = generateId();
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
  } catch (error) {
    console.error("Worker error:", error);
    return createResponse(500, { success: false, error: error instanceof Error ? error.message : "Internal error" });
  }
}