"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { api, isApiError } from "@/lib/api/client";
import { getSession, beginLogin, isAuthConfigured } from "@/lib/auth/cognito";

type Phase =
  | "idle"
  | "create"
  | "plan"
  | "run"
  | "poll"
  | "artifacts"
  | "done"
  | "error";

const PHASES: Array<{ id: Phase; label: string }> = [
  { id: "idle", label: "IDLE" },
  { id: "create", label: "CREATING" },
  { id: "plan", label: "PLANNING" },
  { id: "run", label: "EXECUTING" },
  { id: "poll", label: "MONITORING" },
  { id: "artifacts", label: "COLLECTING" },
  { id: "done", label: "COMPLETED" },
];

const LIVE_BASE_URL =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_API_BASE_URL &&
  process.env.NEXT_PUBLIC_API_BASE_URL !== "/api"
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : null;

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;
const TERMINAL = new Set(["SUCCEEDED", "FAILED", "TIMED_OUT", "ABORTED"]);

interface LogEntry {
  label: string;
  method: string;
  path: string;
  status: string;
}

interface ConsoleState {
  phase: Phase;
  workTreeId: string | null;
  correlationId: string | null;
  executionStatus: string | null;
  log: LogEntry[];
  planTasks: Array<{ title: string; agentType?: string; priority?: string }>;
  artifacts: Array<{ id: string; name: string; verified: boolean }>;
  activityCount: number;
  totalTokens: number;
  error: string | null;
}

const INITIAL: ConsoleState = {
  phase: "idle",
  workTreeId: null,
  correlationId: null,
  executionStatus: null,
  log: [],
  planTasks: [],
  artifacts: [],
  activityCount: 0,
  totalTokens: 0,
  error: null,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SdkConsole() {
  const [objective, setObjective] = useState(
    "Research the Nairobi renewable-energy market"
  );
  const [name, setName] = useState("Nairobi energy market");
  const [state, setState] = useState<ConsoleState>(INITIAL);
  const [signedIn, setSignedIn] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSignedIn(Boolean(getSession()));
  }, []);

  useEffect(
    () => () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    },
    []
  );

  const running =
    state.phase !== "idle" && state.phase !== "done" && state.phase !== "error";

  const currentIndex = PHASES.findIndex((p) => p.id === state.phase);

  const pushLog = useCallback((entry: LogEntry) => {
    setState((s) => ({ ...s, log: [...s.log, entry] }));
  }, []);

  const fail = useCallback((error: unknown, label: string) => {
    const status = isApiError(error) ? `${error.statusCode} ${error.code}` : "ERR";
    const message = error instanceof Error ? error.message : "Request failed";
    setState((s) => ({
      ...s,
      phase: "error",
      error: message,
      log: [...s.log, { label, method: "-", path: "-", status }],
    }));
  }, []);

  const runLive = useCallback(async () => {
    setState(INITIAL);

    // 1. Create
    setState((s) => ({ ...s, phase: "create" }));
    let workTreeId: string;
    try {
      const created = await api.workTrees.create({ name, objective });
      workTreeId = created.id;
      pushLog({ label: "Create work tree", method: "POST", path: "/work-trees", status: "200" });
    } catch (error) {
      fail(error, "Create work tree");
      return;
    }

    // 2. Plan through Bedrock
    setState((s) => ({ ...s, phase: "plan", workTreeId }));
    try {
      const plan = await api.workTrees.plan(workTreeId, objective);
      pushLog({ label: "Generate plan", method: "POST", path: `/work-trees/${workTreeId}/plan`, status: "200" });
      setState((s) => ({
        ...s,
        planTasks: Array.isArray(plan?.tasks)
          ? plan.tasks.map((t) => ({ title: t.title, agentType: t.agentType, priority: t.priority }))
          : [],
      }));
    } catch (error) {
      fail(error, "Generate plan");
      return;
    }

    // 3. Start the Step Functions execution
    setState((s) => ({ ...s, phase: "run" }));
    let executionStatus: string;
    try {
      const started = await api.workTrees.run(workTreeId, `sdk-console-${Date.now()}`);
      pushLog({ label: "Start execution", method: "POST", path: `/work-trees/${workTreeId}/run`, status: "200" });
      setState((s) => ({ ...s, correlationId: started.correlationId }));
      executionStatus = "RUNNING";
    } catch (error) {
      fail(error, "Start execution");
      return;
    }

    // 4. Poll the real execution until it reaches a terminal state
    setState((s) => ({ ...s, phase: "poll" }));
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const poll = async (): Promise<void> => {
      if (Date.now() > deadline) {
        setState((s) => ({
          ...s,
          phase: "error",
          error: "Execution did not reach a terminal state within the polling window",
        }));
        return;
      }

      try {
        const status = await api.workTrees.execution(workTreeId);
        executionStatus = status.status;
        setState((s) => ({ ...s, executionStatus: status.status }));

        if (TERMINAL.has(status.status)) {
          pushLog({
            label: "Execution settled",
            method: "GET",
            path: `/work-trees/${workTreeId}/execution`,
            status: status.status,
          });

          if (status.status !== "SUCCEEDED") {
            setState((s) => ({
              ...s,
              phase: "error",
              error: status.errorCause || status.errorName || `Execution ${status.status}`,
            }));
            return;
          }

          setState((s) => ({ ...s, phase: "artifacts" }));
          await collect(workTreeId);
          return;
        }
      } catch (error) {
        fail(error, "Read execution status");
        return;
      }

      pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    const collect = async (id: string) => {
      try {
        const [artifacts, activity, workTree] = await Promise.all([
          api.workTrees.artifacts(id),
          api.workTrees.activity(id),
          api.workTrees.get(id),
        ]);
        pushLog({ label: "Collect artifacts", method: "GET", path: `/work-trees/${id}/artifacts`, status: "200" });

        const tokens = (workTree.runs || []).reduce(
          (total, run) => total + (run.input_tokens || 0) + (run.output_tokens || 0),
          0
        );

        setState((s) => ({
          ...s,
          phase: "done",
          executionStatus: "SUCCEEDED",
          artifacts: artifacts.map((a) => ({ id: a.id, name: a.name, verified: a.verified })),
          activityCount: activity.length,
          totalTokens: tokens,
        }));
      } catch (error) {
        fail(error, "Collect results");
      }
    };

    await poll();
  }, [name, objective, pushLog, fail]);

  function runDemo() {
    setState(INITIAL);
    const demoId = `wt_demo_${Math.random().toString(36).slice(2, 10)}`;

    const steps: Array<{ delay: number; phase: Phase; apply: (p: ConsoleState) => ConsoleState }> = [
      {
        delay: 0,
        phase: "create",
        apply: (p) => ({
          ...p,
          workTreeId: demoId,
          correlationId: `demo-${Math.random().toString(36).slice(2, 8)}`,
          log: [...p.log, { label: "Create work tree", method: "POST", path: "/work-trees", status: "200" }],
        }),
      },
      {
        delay: 700,
        phase: "plan",
        apply: (p) => ({
          ...p,
          planTasks: [
            { title: "Collect market data", agentType: "research", priority: "high" },
            { title: "Analyse supply and demand", agentType: "analysis", priority: "high" },
            { title: "Compile findings", agentType: "builder", priority: "medium" },
            { title: "Verify sources", agentType: "verification", priority: "medium" },
          ],
          log: [...p.log, { label: "Generate plan", method: "POST", path: `/work-trees/${demoId}/plan`, status: "200" }],
        }),
      },
      {
        delay: 1600,
        phase: "run",
        apply: (p) => ({
          ...p,
          executionStatus: "RUNNING",
          log: [
            ...p.log,
            { label: "Start execution", method: "POST", path: `/work-trees/${demoId}/run`, status: "200" },
          ],
        }),
      },
      {
        delay: 2800,
        phase: "poll",
        apply: (p) => ({ ...p, executionStatus: "RUNNING" }),
      },
      {
        delay: 4200,
        phase: "artifacts",
        apply: (p) => ({
          ...p,
          executionStatus: "SUCCEEDED",
          artifacts: [
            { id: "art-1", name: "Collect market data.md", verified: true },
            { id: "art-2", name: "Analyse supply and demand.md", verified: true },
          ],
        }),
      },
      {
        delay: 5200,
        phase: "done",
        apply: (p) => ({ ...p, activityCount: 9, totalTokens: 4820 }),
      },
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setState((prev) => (prev.phase === "error" ? prev : step.apply(prev)));
      }, step.delay);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {LIVE_BASE_URL ? (
          <Badge size="sm" color="success" variant="outline">
            live api available
          </Badge>
        ) : (
          <Badge size="sm" color="warning" variant="outline">
            demonstration only
          </Badge>
        )}
        {isAuthConfigured() && (
          <Badge size="sm" color={signedIn ? "success" : "blue"} variant="outline">
            {signedIn ? "signed in" : "sign-in required"}
          </Badge>
        )}
        <span className="text-xs text-[var(--color-soft-grey)]">
          {!LIVE_BASE_URL
            ? "No API base URL is configured, so the button replays a scripted demonstration. It makes no network requests and the responses shown are not real."
            : !signedIn
              ? "The Genesis API requires a Cognito access token. Sign in before running against the live API."
              : "This drives the real end-to-end path: create, plan through Bedrock, start a Step Functions execution, poll it, then collect artifacts."}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card surface={3} border>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <NodeIndicator color="primary" active size="sm" />
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
                Create work tree
              </span>
            </div>

            <label className="mb-1 block font-mono text-xs text-[var(--color-soft-grey)]">name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={running}
              className="mb-3 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--color-void)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-off-white)] outline-none focus:border-[var(--signal-primary)] disabled:opacity-50"
            />

            <label className="mb-1 block font-mono text-xs text-[var(--color-soft-grey)]">objective</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={running}
              rows={3}
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--color-void)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-off-white)] outline-none focus:border-[var(--signal-primary)] disabled:opacity-50"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {LIVE_BASE_URL && isAuthConfigured() && !signedIn && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => beginLogin()}
                  icon={<Icon name="lock" size={12} />}
                >
                  Sign in
                </Button>
              )}
              {LIVE_BASE_URL && (!isAuthConfigured() || signedIn) && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={running}
                  onClick={runLive}
                  icon={<Icon name="play" size={12} />}
                >
                  Run end to end
                </Button>
              )}
              <Button
                variant={LIVE_BASE_URL && (!isAuthConfigured() || signedIn) ? "secondary" : "primary"}
                size="sm"
                disabled={running}
                onClick={runDemo}
                icon={<Icon name="play" size={12} />}
              >
                Run demonstration
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={running}
                onClick={() => setState(INITIAL)}
                icon={<Icon name="x" size={12} />}
              >
                Reset
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {PHASES.map((p, i) => {
                const done = currentIndex > i || state.phase === "done";
                const active = currentIndex === i;
                return (
                  <span
                    key={p.id}
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-xs transition-colors",
                      active
                        ? "bg-[var(--signal-primary)] text-[var(--color-void)]"
                        : done
                          ? "bg-[color:mix(15%,var(--signal-success),_transparent)] text-[var(--signal-success)]"
                          : "bg-[var(--color-void)] text-[var(--color-mid-grey)]"
                    )}
                  >
                    {p.label}
                  </span>
                );
              })}
            </div>

            {state.error && (
              <div className="mt-3 rounded-md border border-[var(--signal-error)] bg-[color:mix(8%,var(--signal-error),_transparent)] p-2.5">
                <div className="font-mono text-xs uppercase text-[var(--signal-error)]">
                  Execution did not complete
                </div>
                <p className="mt-1 font-mono text-xs text-[var(--color-soft-grey)]">{state.error}</p>
              </div>
            )}
          </div>
        </Card>

        <Card surface={3} border>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <NodeIndicator
                color={state.phase === "error" ? "error" : state.phase === "done" ? "success" : "blue"}
                size="sm"
                active={running}
              />
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
                Response
              </span>
            </div>

            {state.log.length === 0 ? (
              <p className="font-mono text-xs text-[var(--color-mid-grey)]">awaiting run</p>
            ) : (
              <div className="space-y-1.5">
                {state.log.map((e, i) => (
                  <div key={i} className="rounded-md bg-[var(--color-void)] px-2.5 py-1.5">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge
                        size="sm"
                        color={
                          e.status === "SUCCEEDED" || e.status.startsWith("2")
                            ? "success"
                            : e.status.startsWith("4")
                              ? "warning"
                              : e.status === "RUNNING"
                                ? "blue"
                                : "error"
                        }
                        variant="subtle"
                      >
                        {e.status}
                      </Badge>
                      <span className="font-mono text-xs text-[var(--color-off-white)]">{e.label}</span>
                    </div>
                    <div className="font-mono text-xs text-[var(--color-soft-grey)]">
                      <span className="text-[var(--signal-primary)]">{e.method}</span> {e.path}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {state.workTreeId && (
              <div className="mt-3 space-y-1.5">
                <div className="rounded-md bg-[var(--color-void)] px-2.5 py-1.5">
                  <span className="font-mono text-xs text-[var(--color-soft-grey)]">
                    workTreeId <span className="text-[var(--signal-primary)]">{state.workTreeId}</span>
                  </span>
                </div>
                {state.correlationId && (
                  <div className="rounded-md bg-[var(--color-void)] px-2.5 py-1.5">
                    <span className="font-mono text-xs text-[var(--color-soft-grey)]">
                      correlationId <span className="text-[var(--signal-ai)]">{state.correlationId}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {state.planTasks.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 font-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]">
                  plan.tasks
                </div>
                <div className="space-y-1">
                  {state.planTasks.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-md bg-[var(--color-void)] px-2.5 py-1.5"
                    >
                      <span className="truncate text-xs text-[var(--color-off-white)]">{t.title}</span>
                      <span className="shrink-0 font-mono text-xs text-[var(--color-soft-grey)]">{t.agentType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.artifacts.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 font-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]">
                  artifacts
                </div>
                <div className="space-y-1">
                  {state.artifacts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-[var(--color-void)] px-2.5 py-1.5"
                    >
                      <span className="truncate text-xs text-[var(--color-off-white)]">{a.name}</span>
                      <Badge size="sm" color={a.verified ? "success" : "warning"} variant="subtle">
                        {a.verified ? "verified" : "pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.phase === "done" && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon name="check" size={13} className="text-[var(--signal-success)]" />
                  <span className="font-mono text-xs text-[var(--signal-success)]">
                    {state.activityCount} activity event{state.activityCount === 1 ? "" : "s"}
                  </span>
                </div>
                {state.totalTokens > 0 && (
                  <div className="flex items-center gap-2">
                    <Icon name="signal" size={13} className="text-[var(--signal-ai)]" />
                    <span className="font-mono text-xs text-[var(--signal-ai)]">
                      {state.totalTokens.toLocaleString()} tokens consumed
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
