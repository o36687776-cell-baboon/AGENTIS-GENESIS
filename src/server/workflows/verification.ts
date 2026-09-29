import * as db from "../database/services";
import { getConfig } from "../config";

interface VerificationEvent {
  action: string;
  workTreeId?: string;
  correlationId?: string;
  results?: {
    workTreeId?: string;
    total?: number;
    completed?: number;
    failed?: number;
    progress?: number;
  };
}

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

const APPROVAL_RISK_LEVELS = new Set(["high", "critical"]);

/**
 * Verification reads the persisted state of the work tree rather than trusting
 * an upstream flag. A run only passes when every task actually completed, every
 * task produced a non-empty stored result, and at least one artifact exists.
 * Anything short of that is a failure, never an approval.
 */
export async function handler(event: VerificationEvent) {
  try {
    switch (event.action) {
      case "verify": {
        const workTreeId = event.workTreeId || "";
        const config = getConfig();

        const workTree = await db.getWorkTree(workTreeId);
        if (!workTree) {
          throw Object.assign(new Error("Work tree not found"), { name: "WorkTreeNotFound" });
        }

        const [tasks, artifactRows, approvals, runs] = await Promise.all([
          db.getTasksByWorkTree(workTreeId),
          db.getArtifactsByWorkTree(workTreeId),
          db.getApprovalsByWorkTree(workTreeId),
          db.getAgentRunsByWorkTree(workTreeId),
        ]);

        const checks: Check[] = [];

        const total = tasks.length;
        const completed = tasks.filter((t) => t.status === "completed").length;
        const failed = tasks.filter((t) => t.status === "failed").length;

        checks.push({
          name: "tasks_present",
          passed: total > 0,
          detail: total > 0 ? `${total} task${total === 1 ? "" : "s"} recorded` : "no tasks were created",
        });

        checks.push({
          name: "all_tasks_completed",
          passed: total > 0 && failed === 0 && completed === total,
          detail: `${completed} completed, ${failed} failed, ${total} total`,
        });

        const emptyOutputs = tasks.filter(
          (t) => t.status === "completed" && (!t.output || t.output.length < 2)
        );
        checks.push({
          name: "results_persisted",
          passed: total > 0 && emptyOutputs.length === 0,
          detail:
            emptyOutputs.length === 0
              ? "every completed task stored a result"
              : `${emptyOutputs.length} completed task(s) stored no result`,
        });

        checks.push({
          name: "artifacts_present",
          passed: artifactRows.length > 0,
          detail: `${artifactRows.length} artifact${artifactRows.length === 1 ? "" : "s"} stored`,
        });

        const failedRuns = runs.filter((r) => r.status === "failed");
        checks.push({
          name: "agent_runs_healthy",
          passed: failedRuns.length === 0,
          detail: `${runs.length} run(s), ${failedRuns.length} failed`,
        });

        const verified = checks.every((check) => check.passed);

        for (const artifact of artifactRows) {
          if (artifact.verification_status === "pending") {
            await db.updateArtifactVerification(artifact.id, verified ? "verified" : "failed");
          }
        }

        // An approval is required when the work is not clean, when the planner
        // asked for one, or when any approval record sits at high or critical
        // risk. It is never auto-granted.
        const plan = await db.getWorkTreePlan(workTreeId);
        const elevatedRisk = approvals.some(
          (a) => a.status === "pending" && APPROVAL_RISK_LEVELS.has(a.risk_level)
        );

        const requiresApproval =
          !verified || Boolean(plan?.requires_approval) || elevatedRisk;

        let approvalId: string | undefined;
        let approvalDeadline: string | undefined;

        if (requiresApproval) {
          const existing = approvals.find((a) => a.status === "pending");
          if (existing) {
            approvalId = existing.id;
            approvalDeadline = existing.expires_at
              ? new Date(existing.expires_at).toISOString()
              : undefined;
          } else {
            const riskLevel = elevatedRisk ? "high" : "medium";
            const created = await db.createApproval({
              workTreeId,
              title: `Human review required: ${workTree.name}`,
              description: verified
                ? "The run completed but the planner marked it for review."
                : "Automated verification did not pass for this execution.",
              riskLevel,
              requestedBy: "genesis-verification",
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
            approvalId = created.id;
            approvalDeadline = created.expires_at
              ? new Date(created.expires_at).toISOString()
              : undefined;
          }

          await db.updateWorkTree(workTreeId, { status: "needs-approval" });
        }

        await db.createActivityEvent({
          workTreeId,
          eventType: "VERIFICATION_COMPLETED",
          status: verified ? "success" : "error",
          message: verified
            ? `Verification passed ${checks.length} checks`
            : `Verification failed: ${checks.filter((c) => !c.passed).map((c) => c.name).join(", ")}`,
          metadata: {
            correlationId: event.correlationId || null,
            checks: checks.map((c) => ({ name: c.name, passed: c.passed })),
            requiresApproval,
            approvalId: approvalId || null,
          },
        });

        return {
          approved: verified && !requiresApproval,
          requiresApproval,
          checks,
          approvalId,
          approvalDeadline,
          summary: {
            total,
            completed,
            failed,
            artifacts: artifactRows.length,
            runs: runs.length,
            model: config.bedrockModelId,
          },
        };
      }

      default:
        throw Object.assign(new Error(`Unknown action: ${event.action}`), {
          name: "ValidationError",
        });
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        action: event.action,
        workTreeId: event.workTreeId,
        message: error instanceof Error ? error.message : String(error),
      })
    );
    throw error;
  }
}
