import { useMemo } from "react";
import { WorkTreeBranch } from "./WorkTreeBranch";
import { WorkTreeHeader } from "./WorkTreeHeader";
import type { WorkTree, WorkTreeNode, Agent } from "@/types";
import { getNodeStateConfig, getAgentStatusConfig } from "@/design-system/lib/state-colors";

interface WorkTreeProps {
  workTree: WorkTree;
  onSelectNode?: (node: WorkTreeNode) => void;
  showHeader?: boolean;
}

export function WorkTree({
  workTree,
  onSelectNode,
  showHeader = true,
}: WorkTreeProps) {
  const branches = useMemo(() => buildBranches(workTree), [workTree]);

  return (
    <div className="w-full">
      {showHeader && <WorkTreeHeader workTree={workTree} />}

      <div className="relative pl-2">
        <div className="absolute left-[3px] top-0 bottom-0 w-px bg-[var(--color-mid-grey)]" />
      </div>

      <div className="space-y-3">
        {branches.map((branch) => (
          <WorkTreeBranch
            key={branch.id}
            label={branch.label}
            icon={branch.icon}
            color={branch.color}
            nodes={branch.nodes}
            onSelect={onSelectNode}
          />
        ))}
      </div>
    </div>
  );
}

function buildBranches(wt: WorkTree) {
  const objectiveNode: WorkTreeNode = {
    id: `obj-${wt.id}`,
    type: "objective",
    title: wt.objective,
    state: wt.status,
    progress: wt.progress,
  };

  const contextNodes: WorkTreeNode[] = [];
  wt.context.documents &&
    contextNodes.push({
      id: "ctx-docs",
      type: "context",
      title: `${wt.context.documents} documents`,
      state: "completed",
      owner: wt.context.project,
    });
  if (wt.context.deadline) {
    contextNodes.push({
      id: "ctx-deadline",
      type: "context",
      title: `Deadline: ${wt.context.deadline}`,
      state: "completed",
    });
  }
  contextNodes.push(
    {
      id: "ctx-decisions",
      type: "context",
      title: `${wt.context.recentDecisions} recent decisions`,
      state: "completed",
    },
    {
      id: "ctx-memory",
      type: "context",
      title: `${wt.context.relevantMemory} relevant memory items`,
      state: "completed",
    }
  );

  const agentNodes: WorkTreeNode[] = wt.agents.map((a): WorkTreeNode => {
    const statusCfg = getAgentStatusConfig(a.status);
    return {
      id: `agent-${a.id}`,
      type: "agent",
      title: a.name,
      description: `${a.type} · ${a.model}`,
      state: agentStatusToNodeState(a.status),
      progress: a.progress,
      agent: a.name,
      owner: a.version,
    };
  });

  const taskNodes: WorkTreeNode[] = wt.tasks.map((t): WorkTreeNode => {
    const stateCfg = getNodeStateConfig(t.status);
    return {
      id: `task-${t.id}`,
      type: "task",
      title: t.title,
      description: t.description,
      state: t.status,
      progress: t.progress,
      agent: t.agent,
    };
  });

  const artifactNodes: WorkTreeNode[] = wt.artifacts.map((a): WorkTreeNode => ({
    id: `art-${a.id}`,
    type: "artifact",
    title: a.name,
    description: `${a.type} · v${a.version}`,
    state: a.approved ? "completed" : a.humanReviewed ? "needs-approval" : "completed",
    progress: 100,
    agent: a.agent,
  }));

  const approvalNodes: WorkTreeNode[] = wt.approvals.map((a): WorkTreeNode => ({
    id: `appr-${a.id}`,
    type: "approval",
    title: a.title,
    description: a.description,
    state: "needs-approval",
  }));

  const riskNodes: WorkTreeNode[] = Array.from({ length: wt.risks }, (_, i): WorkTreeNode => ({
    id: `risk-${i}`,
    type: "risk",
    title: `Risk ${i + 1}`,
    state: "blocked",
  }));

  const outcomeNode: WorkTreeNode = {
    id: `outcome-${wt.id}`,
    type: "outcome",
    title: "Deliverable complete",
    state: wt.status === "running" ? "running" : "completed",
    progress: wt.progress,
  };

  return [
    {
      id: "branch-objective",
      label: "OBJECTIVE",
      icon: "signal",
      color: "primary" as const,
      nodes: [objectiveNode],
    },
    {
      id: "branch-context",
      label: "CONTEXT",
      icon: "knowledge",
      color: "blue" as const,
      nodes: contextNodes,
    },
    {
      id: "branch-agents",
      label: "AGENTS",
      icon: "agents",
      color: "ai" as const,
      nodes: agentNodes,
    },
    {
      id: "branch-tasks",
      label: "TASKS",
      icon: "tasks",
      color: "primary" as const,
      nodes: taskNodes,
    },
    {
      id: "branch-artifacts",
      label: "ARTIFACTS",
      icon: "artifacts",
      color: "blue" as const,
      nodes: artifactNodes,
    },
    {
      id: "branch-approvals",
      label: "APPROVALS",
      icon: "alert",
      color: "warning" as const,
      nodes: approvalNodes,
    },
    {
      id: "branch-risks",
      label: "RISKS",
      icon: "warning",
      color: "warning" as const,
      nodes: riskNodes,
    },
    {
      id: "branch-outcome",
      label: "OUTCOME",
      icon: "check",
      color: "success" as const,
      nodes: [outcomeNode],
    },
  ];
}

function agentStatusToNodeState(status: Agent["status"]): WorkTreeNode["state"] {
  const map: Record<Agent["status"], WorkTreeNode["state"]> = {
    idle: "idle",
    thinking: "running",
    planning: "queued",
    executing: "running",
    waiting: "waiting",
    blocked: "blocked",
    delegating: "running",
    verifying: "running",
    completed: "completed",
  };
  return map[status];
}
