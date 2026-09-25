import { useState } from "react";
import { Icon } from "@/design-system/icons";
import { Card } from "@/design-system/components/Card";
import { WorkTree } from "@/components/worktree/WorkTree";
import { AgentGrid } from "@/components/agents/AgentGrid";
import { TaskList } from "@/components/tasks/TaskList";
import { ActivityTimeline } from "@/components/system/ActivityTimeline";
import { ContextPanel } from "@/components/system/ContextPanel";
import { Approval } from "@/components/feedback/Approval";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { SystemStatusPanel } from "@/components/system/SystemStatus";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Badge } from "@/design-system/components/Badge";
import { Table } from "@/components/data/Table";
import type { WorkTree as WorkTreeT, Task } from "@/types";

interface WorkTreePageProps {
  workTree: WorkTreeT;
}

const tabs = [
  { id: "overview", label: "Overview", icon: "signal" },
  { id: "plan", label: "Plan", icon: "knowledge" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "agents", label: "Agents", icon: "agents" },
  { id: "context", label: "Context", icon: "system" },
  { id: "artifacts", label: "Artifacts", icon: "artifacts" },
  { id: "activity", label: "Activity", icon: "timeline" },
  { id: "risks", label: "Risks", icon: "warning" },
  { id: "approvals", label: "Approvals", icon: "alert" },
  { id: "audit", label: "Audit", icon: "knowledge" },
] as const;

export function WorkTreePage({ workTree }: WorkTreePageProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-4">
      <div className="border-b border-[var(--border-subtle)]">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-mono uppercase transition-all ${
                activeTab === tab.id
                  ? "border-[var(--signal-primary)] text-[var(--signal-primary)]"
                  : "border-transparent text-[var(--color-soft-grey)] hover:text-[var(--color-off-white)] hover:border-[var(--border-active)]"
              }`}
            >
              <Icon name={tab.icon as any} size={12} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-4">
        {activeTab === "overview" && <OverviewTab workTree={workTree} />}
        {activeTab === "plan" && <PlanTab workTree={workTree} />}
        {activeTab === "tasks" && <TasksTab tasks={workTree.tasks} />}
        {activeTab === "agents" && <AgentsTab agents={workTree.agents} />}
        {activeTab === "context" && <ContextTab workTree={workTree} />}
        {activeTab === "artifacts" && <ArtifactsTab artifacts={workTree.artifacts} />}
        {activeTab === "activity" && <ActivityTab events={workTree.activity} />}
        {activeTab === "risks" && <RisksTab workTree={workTree} />}
        {activeTab === "approvals" && <ApprovalsTab approvals={workTree.approvals} />}
        {activeTab === "audit" && <AuditTab workTree={workTree} />}
      </div>
    </div>
  );
}

function OverviewTab({ workTree }: { workTree: WorkTreeT }) {
  return (
    <div className="space-y-4">
      <WorkTree workTree={workTree} onSelectNode={() => {}} />
    </div>
  );
}

function PlanTab({ workTree }: { workTree: WorkTreeT }) {
  return (
    <Card surface={3} border>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <NodeIndicator color="primary" active size="xs" />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Execution Plan
          </span>
        </div>
        <p className="mb-3 text-sm text-[var(--color-soft-grey)]">
          Plan is derived from the work tree structure.
        </p>
        <div className="space-y-2.5">
          {workTree.tasks.map((task, i) => (
            <PlanStepItem key={task.id} task={task} index={i + 1} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function PlanStepItem({ task, index }: { task: Task; index: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs text-[var(--color-soft-grey)]">
        {String(index).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-light-grey)]">{task.title}</span>
          {task.agent && <NodeIndicator color="ai" size="xs" />}
        </div>
        <p className="text-xs text-[var(--color-mid-grey)]">{task.description}</p>
      </div>
      <Badge variant="subtle" color="primary" className="font-mono text-xs">
        {task.priority}
      </Badge>
    </div>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  return (
    <Card surface={3} border>
      <div className="p-4">
        <TaskList tasks={tasks} groupBy="priority" />
      </div>
    </Card>
  );
}

function AgentsTab({ agents }: { agents: WorkTreeT["agents"] }) {
  return (
    <Card surface={3} border>
      <div className="p-4">
        <AgentGrid agents={agents} />
      </div>
    </Card>
  );
}

function ContextTab({ workTree }: { workTree: WorkTreeT }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ContextPanel workTree={workTree} />
      </div>
      <div>
        <SystemStatusPanel />
      </div>
    </div>
  );
}

function ArtifactsTab({ artifacts }: { artifacts: WorkTreeT["artifacts"] }) {
  return (
    <Card surface={3} border>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {artifacts.map((artifact) => (
            <ArtifactCard key={artifact.id} artifact={artifact} showProvenance />
          ))}
        </div>
      </div>
    </Card>
  );
}

function ActivityTab({ events }: { events: WorkTreeT["activity"] }) {
  return (
    <Card surface={3} border>
      <div className="p-4">
        <ActivityTimeline events={events} />
      </div>
    </Card>
  );
}

function RisksTab({ workTree }: { workTree: WorkTreeT }) {
  return (
    <Card surface={3} border>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <NodeIndicator color="error" size="xs" />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Risks ({workTree.risks})
          </span>
        </div>
        <div className="space-y-2.5">
          <RiskItem
            title="Data dependency risk"
            description="Financial model depends on Q3 dataset validation"
            severity="medium"
          />
          <RiskItem
            title="Timeline compression risk"
            description="Report deadline is tight; may require overtime"
            severity="high"
          />
        </div>
      </div>
    </Card>
  );
}

function RiskItem({
  title,
  description,
  severity,
}: {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}) {
  const color = { low: "success", medium: "warning", high: "error" }[severity] as "success" | "warning" | "error";
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-deep-black)] p-3">
      <div className="flex items-center gap-2">
        <NodeIndicator color={color} active size="xs" />
        <h4 className="font-medium text-[var(--color-light-grey)]">{title}</h4>
        <Badge variant="subtle" color={color} className="ml-auto font-mono text-xs">
          {severity.toUpperCase()}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-[var(--color-soft-grey)]">{description}</p>
    </div>
  );
}

function ApprovalsTab({ approvals }: { approvals: WorkTreeT["approvals"] }) {
  return (
    <div className="space-y-3">
      {approvals.map((appr) => (
        <Approval key={appr.id} request={appr} />
      ))}
      {approvals.length === 0 && (
        <p className="text-sm text-[var(--color-soft-grey)]">
          No pending approvals.
        </p>
      )}
    </div>
  );
}

function AuditTab({ workTree }: { workTree: WorkTreeT }) {
  const auditData = [
    { id: "1", action: "Work tree created", actor: "User", ts: workTree.createdAt },
    { id: "2", action: "Objective set", actor: "Genesis", ts: workTree.createdAt },
    { id: "3", action: "Agents assigned", actor: "Genesis", ts: workTree.createdAt },
  ];

  return (
    <Card surface={3} border>
      <div className="p-4">
        <Table
          data={auditData}
          columns={[
            { key: "id", header: "#", render: (r) => <span className="text-xs text-[var(--color-mid-grey)]">{r.id}</span> },
            { key: "action", header: "Action", render: (r) => <span className="text-sm text-[var(--color-light-grey)]">{r.action}</span> },
            { key: "actor", header: "Actor", render: (r) => <span className="text-sm text-[var(--color-soft-grey)]">{r.actor}</span> },
            { key: "ts", header: "Timestamp", render: (r) => <span className="font-mono text-xs text-[var(--color-mid-grey)]">{new Date(r.ts).toLocaleString()}</span> },
          ]}
        />
      </div>
    </Card>
  );
}