import * as db from "../database/services";
import * as ai from "../ai";
import { uploadArtifact } from "../artifacts";
import { getConfig } from "../config";
import { withRetry, classifyFailure, DEFAULT_RETRY } from "../execution/retry";
import { generateId } from "../database/services";

interface WorkerEvent {
  action: string;
  workTreeId?: string;
  correlationId?: string;
  workTree?: { id?: string };
  plan?: { tasks?: PlanTaskLike[]; risks?: unknown[] };
  task?: TaskRef;
  executionResults?: TaskOutcome[];
  verification?: VerificationOutcome;
}

interface PlanTaskLike {
  id?: string;
  title?: string;
  description?: string;
  agentType?: string;
  priority?: string;
  dependencies?: string[];
  estimatedDurationMinutes?: number;
}

/** Compact shape the Map iterates over. Full task rows are re-read from MariaDB. */
interface TaskRef {
  id: string;
  agentId: string | null;
  title: string;
  agentType: string;
  priority: string;
}

interface TaskOutcome {
  taskId: string;
  status: "completed" | "failed";
  artifactId?: string;
  chars?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

interface VerificationOutcome {
  approved: boolean;
  requiresApproval: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  approvalDeadline?: string;
  approvalId?: string;
}

const AGENT_PROFILES: Record<string, { name: string; capabilities: string[] }> = {
  research: { name: "Research Agent", capabilities: ["search", "synthesis", "citation"] },
  analysis: { name: "Analysis Agent", capabilities: ["comparison", "statistics", "modelling"] },
  builder: { name: "Builder Agent", capabilities: ["drafting", "structuring", "formatting"] },
  verification: { name: "Verification Agent", capabilities: ["fact-check", "consistency"] },
};

function defaultAgentType(value: string | undefined): string {
  const known = Object.keys(AGENT_PROFILES);
  return value && known.includes(value) ? value : "research";
}

const PRIORITIES = new Set(["low", "medium", "high", "critical"]);

function normalizePriority(value: string | undefined): "low" | "medium" | "high" | "critical" {
  if (value && PRIORITIES.has(value)) {
    return value as "low" | "medium" | "high" | "critical";
  }
  return "medium";
}

async function ensureAgent(workTreeId: string, agentType: string): Promise<db.AgentRow> {
  const existing = await db.getAgentByWorkTreeAndType(workTreeId, agentType);
  if (existing) return existing;

  const config = getConfig();
  const profile = AGENT_PROFILES[agentType] || AGENT_PROFILES.research;

  return db.createAgent({
    workTreeId,
    name: profile.name,
    type: agentType,
    version: "1.0.0",
    model: config.bedrockModelId,
    capabilities: profile.capabilities,
    permissions: ["read:worktree", "write:artifact"],
    memoryScope: "worktree",
    tools: [],
  });
}

function buildTaskPrompt(params: {
  objective: string;
  title: string;
  description: string;
  agentType: string;
}): string {
  return [
    `You are the ${params.agentType} agent inside AGENTIS GENESIS, a controlled execution environment.`,
    "",
    `Overall objective: ${params.objective}`,
    `Your assigned task: ${params.title}`,
    params.description ? `Task detail: ${params.description}` : "",
    "",
    "Produce a substantive, self-contained result for this task.",
    "State concrete findings rather than describing what you would do.",
    "If information is uncertain, say so explicitly instead of inventing specifics.",
    "Return plain prose. Do not wrap the answer in code fences or JSON.",
  ]
    .filter(Boolean)
    .join("\n");
}

function extractText(response: ai.BedrockConverseResponse): string {
  const blocks = response.output?.message?.content || [];
  return blocks.map((block) => block.text || "").join("\n").trim();
}

async function markWorkTreeFailed(workTreeId: string, message: string, correlationId?: string) {
  await db.updateWorkTree(workTreeId, { status: "failed" });
  await db.createActivityEvent({
    workTreeId,
    eventType: "WORK_TREE_FAILED",
    status: "error",
    message,
    metadata: { correlationId: correlationId || null },
  });
}

export async function handler(event: WorkerEvent) {
  const config = getConfig();

  try {
    switch (event.action) {
      case "loadWorkTree": {
        const workTreeId = event.workTreeId || "";
        const workTree = await db.getWorkTree(workTreeId);
        if (!workTree) {
          throw Object.assign(new Error("Work tree not found"), { name: "WorkTreeNotFound" });
        }

        const plan = await db.getWorkTreePlan(workTreeId);
        const tasks = await db.getTasksByWorkTree(workTreeId);

        // Deliberately compact: the full task list, activity stream and
        // artifacts stay in MariaDB. Only the fields the planner needs travel
        // inside the Step Functions state.
        return {
          id: workTree.id,
          name: workTree.name,
          objective: workTree.objective,
          status: workTree.status,
          progress: workTree.progress,
          context: workTree.context,
          correlationId: workTree.correlation_id || event.correlationId,
          existingTaskCount: tasks.length,
          planSummary: plan?.summary || null,
        };
      }

      case "createTasks": {
        const workTreeId = event.workTreeId || "";
        const planTasks = event.plan?.tasks || [];
        if (planTasks.length === 0) {
          throw Object.assign(new Error("Plan contains no tasks"), { name: "ValidationError" });
        }
        if (planTasks.length > config.maxTasksPerExecution) {
          throw Object.assign(
            new Error(
              `Plan exceeds the execution limit of ${config.maxTasksPerExecution} tasks`
            ),
            { name: "ValidationError" }
          );
        }

        const existing = await db.getTasksByWorkTree(workTreeId);
        if (existing.length > 0) {
          throw Object.assign(
            new Error("Tasks already exist for this work tree; refusing to duplicate"),
            { name: "ValidationError" }
          );
        }

        const refs: TaskRef[] = [];

        for (const planTask of planTasks) {
          const agentType = defaultAgentType(planTask.agentType);
          const agent = await ensureAgent(workTreeId, agentType);

          const task = await db.createTask({
            workTreeId,
            agentId: agent.id,
            title: planTask.title || "Untitled task",
            description: planTask.description || "",
            priority: normalizePriority(planTask.priority),
            dependencies: planTask.dependencies || [],
            estimatedDurationMinutes: planTask.estimatedDurationMinutes,
            input: { agentType, planTaskId: planTask.id || null },
          });

          refs.push({
            id: task.id,
            agentId: agent.id,
            title: task.title,
            agentType,
            priority: task.priority,
          });
        }

        await db.updateWorkTree(workTreeId, { status: "running" });
        await db.createActivityEvent({
          workTreeId,
          eventType: "TASKS_CREATED",
          status: "info",
          message: `Created ${refs.length} task${refs.length === 1 ? "" : "s"}`,
          metadata: { correlationId: event.correlationId || null, taskIds: refs.map((r) => r.id) },
        });

        return refs;
      }

      case "executeTask": {
        const taskRef = event.task;
        const workTreeId = event.workTreeId || "";
        if (!taskRef?.id) {
          throw Object.assign(new Error("Task reference is required"), { name: "ValidationError" });
        }

        const workTree = await db.getWorkTree(workTreeId);
        if (!workTree) {
          throw Object.assign(new Error("Work tree not found"), { name: "WorkTreeNotFound" });
        }

        const task = await db.getTask(taskRef.id);
        if (!task) {
          throw Object.assign(new Error("Task not found"), { name: "TaskNotFound" });
        }

        const agentId = task.agent_id || taskRef.agentId;
        if (!agentId) {
          throw Object.assign(new Error("Task has no assigned agent"), { name: "ValidationError" });
        }

        const agent = await db.getAgent(agentId);
        const agentType = taskRef.agentType || "research";

        const agentRun = await db.createAgentRun({
          agentId,
          taskId: task.id,
          workTreeId,
          model: config.bedrockModelId,
        });

        await db.updateTask(task.id, { status: "running", progress: 10, started_at: new Date() });
        await db.updateAgent(agentId, { status: "executing", current_task: task.id, current_goal: task.title });
        await db.createActivityEvent({
          workTreeId,
          agentId,
          taskId: task.id,
          eventType: "AGENT_STARTED",
          status: "info",
          message: `Agent started task: ${task.title}`,
          metadata: { correlationId: event.correlationId || null, agentRunId: agentRun.id },
        });

        try {
          const prompt = buildTaskPrompt({
            objective: workTree.objective,
            title: task.title,
            description: task.description || "",
            agentType,
          });

          // The real model call. Classification inside withRetry means a
          // throttled call backs off, while a validation or access error fails
          // on the first attempt instead of being retried three times.
          const response = await withRetry(
            () =>
              ai.converse({
                messages: [{ role: "user", content: [{ text: prompt }] }],
                system: [
                  {
                    text: "You are a Genesis execution agent. Return only the work product for the assigned task.",
                  },
                ],
                inferenceConfig: { maxTokens: 4096, temperature: 0.3, topP: 0.9 },
              }),
            DEFAULT_RETRY
          );

          const text = extractText(response);

          if (!text) {
            throw Object.assign(
              new Error("Model returned an empty result"),
              { name: "EmptyModelResult" }
            );
          }

          const output = text.slice(0, config.maxOutputChars);

          const artifactRecord = await uploadArtifact(
            workTreeId,
            task.id,
            `${task.id}.md`,
            Buffer.from(output, "utf8"),
            "text/markdown",
            { agentType, correlationId: event.correlationId || "" }
          );

          const persisted = await db.createArtifact({
            workTreeId,
            taskId: task.id,
            name: `${task.title}.md`,
            type: "document",
            version: "1",
            s3Key: artifactRecord.s3Key,
            s3Bucket: config.artifactBucketName,
            createdBy: agentId,
            agentId,
            model: config.bedrockModelId,
            toolsCount: 0,
            agentsCount: 1,
            metadata: { agentType, correlationId: event.correlationId || null, taskId: task.id },
          });

          await db.updateTask(task.id, {
            status: "completed",
            progress: 100,
            completed_at: new Date(),
            output: JSON.stringify({ output, artifactId: persisted.id, s3Key: persisted.s3_key }),
          });

          await db.completeAgentRun({
            agentRunId: agentRun.id,
            status: "completed",
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            result: { chars: output.length, artifactId: persisted.id },
          });

          await db.updateAgent(agentId, { status: "idle", current_task: null, current_goal: null });
          await db.createActivityEvent({
            workTreeId,
            agentId,
            taskId: task.id,
            eventType: "AGENT_COMPLETED",
            status: "success",
            message: `Task completed: ${task.title}`,
            metadata: {
              correlationId: event.correlationId || null,
              artifactId: persisted.id,
              inputTokens: response.usage.inputTokens,
              outputTokens: response.usage.outputTokens,
            },
          });

          return {
            taskId: task.id,
            status: "completed",
            artifactId: persisted.id,
            chars: output.length,
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
          } satisfies TaskOutcome;
        } catch (error) {
          const classified = classifyFailure(error);

          await db.updateTask(task.id, { status: "failed", completed_at: new Date() });
          await db.updateAgent(agentId, { status: "idle", current_task: null, current_goal: null });
          await db.completeAgentRun({
            agentRunId: agentRun.id,
            status: "failed",
            inputTokens: 0,
            outputTokens: 0,
            error: classified.message,
          });
          await db.createActivityEvent({
            workTreeId,
            agentId,
            taskId: task.id,
            eventType: "AGENT_FAILED",
            status: "error",
            message: `Task failed: ${task.title}`,
            metadata: {
              correlationId: event.correlationId || null,
              errorName: classified.name,
              errorClass: classified.class,
            },
          });

          throw error;
        }
      }

      case "storeResults": {
        const workTreeId = event.workTreeId || "";
        const results = event.executionResults || [];
        const tasks = await db.getTasksByWorkTree(workTreeId);

        const completed = tasks.filter((t) => t.status === "completed").length;
        const failed = tasks.filter((t) => t.status === "failed").length;
        const total = tasks.length;
        const progress = total === 0 ? 0 : Math.round(((completed + failed) / total) * 100);

        await db.updateWorkTree(workTreeId, { progress });

        return {
          workTreeId,
          total,
          completed,
          failed,
          progress,
          resultCount: results.length,
          correlationId: event.correlationId || null,
        };
      }

      case "checkApproval": {
        const workTreeId = event.workTreeId || "";
        const approvals = await db.getApprovalsByWorkTree(workTreeId);
        const pending = approvals.find((a) => a.status === "pending");

        if (!pending) {
          return { approved: true, reason: "no_pending_approval" };
        }

        return {
          approved: pending.status === "approved",
          reason: pending.status,
          approvalId: pending.id,
        };
      }

      case "finalize": {
        const workTreeId = event.workTreeId || "";
        const verification = event.verification as VerificationOutcome | undefined;

        if (!verification || !verification.approved) {
          await markWorkTreeFailed(
            workTreeId,
            "Verification did not pass; the work tree was not completed",
            event.correlationId
          );
          return { outcome: "verification_failed", workTreeId };
        }

        await db.updateWorkTree(workTreeId, {
          status: "completed",
          progress: 100,
          completed_at: new Date(),
        });

        const artifacts = await db.getArtifactsByWorkTree(workTreeId);
        for (const artifact of artifacts) {
          if (artifact.verification_status === "pending") {
            await db.updateArtifactVerification(artifact.id, "verified");
          }
        }

        await db.createActivityEvent({
          workTreeId,
          eventType: "WORK_TREE_COMPLETED",
          status: "success",
          message: "Work tree completed successfully",
          metadata: {
            correlationId: event.correlationId || null,
            artifactCount: artifacts.length,
            checks: verification.checks?.length || 0,
          },
        });

        return { outcome: "completed", workTreeId, artifactCount: artifacts.length };
      }

      default:
        throw Object.assign(new Error(`Unknown action: ${event.action}`), {
          name: "ValidationError",
        });
    }
  } catch (error) {
    const classified = classifyFailure(error);
    console.error(
      JSON.stringify({
        level: "error",
        action: event.action,
        workTreeId: event.workTreeId,
        correlationId: event.correlationId,
        errorName: classified.name,
        errorClass: classified.class,
        message: classified.message,
      })
    );

    // Rethrow so the Step Functions task fails visibly and the retry policy
    // applies. Only a missing work tree is silently absorbed, because a
    // missing parent is not retryable.
    if (classified.name === "WorkTreeNotFound") {
      return { outcome: "work_tree_missing", workTreeId: event.workTreeId };
    }

    throw error;
  }
}
