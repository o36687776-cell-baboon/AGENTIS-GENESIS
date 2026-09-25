import { useStore } from "@/state/store";
import { Card } from "@/design-system/components/Card";
import { Progress } from "@/design-system/components/Progress";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Badge } from "@/design-system/components/Badge";
import { Icon } from "@/design-system/icons";
import { AgentGrid } from "@/components/agents/AgentGrid";
import { ActivityTimeline } from "@/components/system/ActivityTimeline";
import { Approval } from "@/components/feedback/Approval";
import { useMounted } from "@/hooks/useMounted";
import { mockWorkTree, generateActivityFeed } from "@/data/mockData";

export function Dashboard() {
  const workTrees = useStore((s) => s.workTreeList);
  const agents = useStore((s) => s.agentList);
  const systemStatus = useStore((s) => s.systemStatus);
  const activeWorkTrees = workTrees.filter((w) => w.status === "running");

  const activeAgents = agents.filter(
    (a) => a.status !== "idle" && a.status !== "completed"
  ).length;
  const waitingAgents = agents.filter((a) => a.status === "waiting").length;

  return (
    <div className="space-y-6">
      <GreetingSection />

      <ActiveWorkSection workTrees={activeWorkTrees} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AgentsSnapshotSection />
        <AttentionSection />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivitySnapshot />
        <SystemSummary systemStatus={systemStatus} />
      </div>
    </div>
  );
}

function GreetingSection() {
  const mounted = useMounted();
  const greeting = mounted
    ? (() => {
        const hour = new Date().getHours();
        return hour < 12
          ? "Good morning"
          : hour < 18
            ? "Good afternoon"
            : "Good evening";
      })()
    : "Genesis";

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-hero font-medium text-[var(--color-off-white)]">
        {greeting}
      </h1>
      <p className="text-lg text-[var(--color-soft-grey)]">
        What are we building today?
      </p>
      <button
        onClick={() => {}}
        className="w-full max-w-lg rounded-md border border-[var(--border-active)] bg-[var(--color-charcoal)] px-4 py-2.5 text-left text-sm text-[var(--color-soft-grey)] placeholder-[var(--color-mid-grey)] transition-all focus:border-[var(--signal-primary)] focus:outline-none focus:text-[var(--color-off-white)]"
      >
        <span className="font-mono text-xs uppercase tracking-[0.05em] text-[var(--signal-primary)]">
          GENESIS
        </span>{" "}
        Tell me what you need…
      </button>
    </div>
  );
}

function ActiveWorkSection({ workTrees }: { workTrees: typeof mockWorkTree[] }) {
  if (workTrees.length === 0) {
    return (
      <Card surface={2} border className="p-6">
        <p className="text-sm text-[var(--color-soft-grey)]">
          No active work trees. Create a new work tree to begin.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <NodeIndicator color="primary" active size="sm" />
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
          Active Work
        </span>
      </div>
      <div className="space-y-3">
        {workTrees.map((wt) => (
          <div
            key={wt.id}
            className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--color-charcoal)] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <NodeIndicator color="primary" active pulse size="xs" />
              <span className="font-medium text-[var(--color-light-grey)]">
                {wt.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 font-mono text-xs text-[var(--color-light-grey)] tabular-nums">
                {wt.progress}%
              </span>
              <div className="w-48">
                <Progress value={wt.progress} label={false} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentsSnapshotSection() {
  const agents = useStore((s) => s.agentList);
  const activeAgents = agents.filter(
    (a) => a.status !== "idle" && a.status !== "completed"
  );

  return (
    <Card surface={2} border>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <NodeIndicator color="ai" active size="sm" />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Active Agents
          </span>
        </div>
        <AgentGrid agents={activeAgents} variant="list" />
      </div>
    </Card>
  );
}

function AttentionSection() {
  const workTrees = useStore((s) => s.workTreeList);
  const approvals = workTrees.flatMap((w) => w.approvals);
  const blockedTasks = workTrees.flatMap((w) =>
    w.tasks.filter((t) => t.status === "blocked")
  );
  const failed = workTrees.flatMap((w) =>
    w.tasks.filter((t) => t.status === "failed")
  );

  return (
    <Card surface={2} border>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <NodeIndicator color="warning" active size="sm" />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Attention
          </span>
        </div>
        <div className="space-y-3 text-sm">
          <AttentionRow
            icon="alert"
            label="Approvals required"
            value={approvals.length}
            color="warning"
          />
          <AttentionRow
            icon="warning"
            label="Blocked tasks"
            value={blockedTasks.length}
            color="error"
          />
          <AttentionRow
            icon="x"
            label="Failed tasks"
            value={failed.length}
            color="error"
          />
        </div>

        {approvals.length > 0 && (
          <div className="mt-3">
            {approvals.map((appr) => (
              <Approval
                key={appr.id}
                request={appr}
                onApprove={() => {}}
                onCancel={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function AttentionRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: "primary" | "ai" | "warning" | "error";
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon name={icon as any} size={14} />
        <span className="text-[var(--color-soft-grey)]">{label}</span>
      </div>
      <Badge
        variant="solid"
        color={color}
        className="font-mono text-xs"
      >
        {value > 0 ? value.toString().padStart(2, "0") : "00"}
      </Badge>
    </div>
  );
}

function ActivitySnapshot() {
  const events = generateActivityFeed();

  return (
    <Card surface={2} border>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <NodeIndicator color="blue" size="xs" />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Recent Activity
          </span>
        </div>
        <ActivityTimeline events={events} max={6} />
      </div>
    </Card>
  );
}

function SystemSummary({ systemStatus }: { systemStatus: any }) {
  return (
    <Card surface={2} border>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <NodeIndicator color="success" active size="xs" />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            System
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric value={systemStatus.agents} label="Agents" />
          <Metric value={systemStatus.tasks} label="Tasks" />
          <Metric value={systemStatus.running} label="Running" accent="primary" />
          <Metric value={systemStatus.queued} label="Queued" />
          <Metric value={systemStatus.errors} label="Errors" accent="error" />
          <Metric value={`${systemStatus.apiHealth}%`} label="API Health" accent="success" />
        </div>
      </div>
    </Card>
  );
}

function Metric({
  value,
  label,
  accent = "muted",
}: {
  value: string | number;
  label: string;
  accent?: "muted" | "primary" | "success" | "error";
}) {
  const accentStyle = {
    muted: "var(--color-soft-grey)",
    primary: "var(--signal-primary)",
    success: "var(--signal-success)",
    error: "var(--signal-error)",
  }[accent];

  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--color-charcoal)] px-3 py-2">
      <span className="text-xs text-[var(--color-soft-grey)]">{label}</span>
      <span className="font-mono text-sm" style={{ color: accentStyle }}>
        {value}
      </span>
    </div>
  );
}
