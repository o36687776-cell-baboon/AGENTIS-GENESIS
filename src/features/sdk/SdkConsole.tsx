"use client";

import { useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { api, isApiError } from "@/lib/api/client";

type Phase = "idle" | "create" | "plan" | "run" | "activity" | "done" | "error";

const PHASES: Array<{ id: Phase; label: string }> = [
  { id: "idle", label: "IDLE" },
  { id: "create", label: "CREATING" },
  { id: "plan", label: "PLANNING" },
  { id: "run", label: "RUNNING" },
  { id: "activity", label: "READING" },
  { id: "done", label: "COMPLETED" },
];

const LIVE_BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL !== "/api"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : null
    : null;

interface ConsoleState {
  phase: Phase;
  workTreeId: string | null;
  requestLog: Array<{ label: string; method: string; path: string; status: string }>;
  planTasks: Array<{ title: string; agentType?: string; priority?: string }>;
  activityCount: number;
  error: string | null;
}

const INITIAL: ConsoleState = {
  phase: "idle",
  workTreeId: null,
  requestLog: [],
  planTasks: [],
  activityCount: 0,
  error: null,
};

export function SdkConsole() {
  const [objective, setObjective] = useState(
    "Research the Nairobi renewable-energy market"
  );
  const [name, setName] = useState("Nairobi energy market");
  const [state, setState] = useState<ConsoleState>(INITIAL);

  const running =
    state.phase !== "idle" && state.phase !== "done" && state.phase !== "error";

  const currentIndex = useMemo(
    () => PHASES.findIndex((p) => p.id === state.phase),
    [state.phase]
  );

  const log = (entry: { label: string; method: string; path: string; status: string }) =>
    setState((s) => ({ ...s, requestLog: [...s.requestLog, entry] }));

  async function runLive() {
    setState(INITIAL);

    try {
      setState((s) => ({ ...s, phase: "create" }));
      const created = await api.workTrees.create({ name, objective });
      log({ label: "Create work tree", method: "POST", path: "/work-trees", status: "200" });

      setState((s) => ({ ...s, phase: "plan", workTreeId: created.id }));
      const plan = await api.workTrees.plan(created.id, objective);
      log({ label: "Generate plan", method: "POST", path: `/work-trees/${created.id}/plan`, status: "200" });

      setState((s) => ({ ...s, phase: "run" }));
      await api.workTrees.run(created.id);
      log({ label: "Set running", method: "POST", path: `/work-trees/${created.id}/run`, status: "200" });

      setState((s) => ({ ...s, phase: "activity" }));
      const activity = await api.workTrees.activity(created.id);
      log({ label: "Read activity", method: "GET", path: `/work-trees/${created.id}/activity`, status: "200" });

      setState((s) => ({
        ...s,
        phase: "done",
        planTasks: Array.isArray(plan?.tasks) ? plan.tasks : [],
        activityCount: activity.length,
      }));
    } catch (err) {
      if (isApiError(err)) {
        log({
          label: "Request failed",
          method: "-",
          path: "-",
          status: `${err.statusCode} ${err.code}`,
        });
      }
      setState((s) => ({
        ...s,
        phase: "error",
        error: err instanceof Error ? err.message : "Request failed",
      }));
    }
  }

  function runDemo() {
    setState(INITIAL);
    const demoId = `wt_demo_${Math.random().toString(36).slice(2, 10)}`;

    const script: Array<{
      delay: number;
      phase: Phase;
      apply: (prev: ConsoleState) => ConsoleState;
    }> = [
      {
        delay: 0,
        phase: "create",
        apply: (p) => ({
          ...p,
          workTreeId: demoId,
          requestLog: [
            ...p.requestLog,
            { label: "Create work tree", method: "POST", path: "/work-trees", status: "200" },
          ],
        }),
      },
      {
        delay: 700,
        phase: "plan",
        apply: (p) => ({
          ...p,
          requestLog: [
            ...p.requestLog,
            {
              label: "Generate plan",
              method: "POST",
              path: `/work-trees/${demoId}/plan`,
              status: "200",
            },
          ],
        }),
      },
      {
        delay: 1400,
        phase: "run",
        apply: (p) => ({
          ...p,
          planTasks: [
            { title: "Collect market data", agentType: "research", priority: "high" },
            { title: "Analyse supply and demand", agentType: "analysis", priority: "high" },
            { title: "Compile findings", agentType: "builder", priority: "medium" },
            { title: "Verify sources", agentType: "verification", priority: "medium" },
          ],
          requestLog: [
            ...p.requestLog,
            {
              label: "Set running",
              method: "POST",
              path: `/work-trees/${demoId}/run`,
              status: "200",
            },
          ],
        }),
      },
      {
        delay: 2100,
        phase: "activity",
        apply: (p) => ({
          ...p,
          requestLog: [
            ...p.requestLog,
            {
              label: "Read activity",
              method: "GET",
              path: `/work-trees/${demoId}/activity`,
              status: "200",
            },
          ],
        }),
      },
      {
        delay: 2800,
        phase: "done",
        apply: (p) => ({ ...p, activityCount: 4 }),
      },
    ];

    script.forEach((step) => {
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
        <span className="text-xs text-[var(--color-soft-grey)]">
          {LIVE_BASE_URL
            ? `NEXT_PUBLIC_API_BASE_URL is set to ${LIVE_BASE_URL}. Live mode calls the real API.`
            : "No API base URL is configured, so the button below replays a scripted demonstration. It makes no network requests and the responses shown are not real."}
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

            <label className="mb-1 block font-mono text-xs text-[var(--color-soft-grey)]">
              name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={running}
              className="mb-3 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--color-void)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-off-white)] outline-none focus:border-[var(--signal-primary)] disabled:opacity-50"
            />

            <label className="mb-1 block font-mono text-xs text-[var(--color-soft-grey)]">
              objective
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={running}
              rows={3}
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--color-void)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-off-white)] outline-none focus:border-[var(--signal-primary)] disabled:opacity-50"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {LIVE_BASE_URL && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={running}
                  onClick={runLive}
                  icon={<Icon name="play" size={12} />}
                >
                  Run against API
                </Button>
              )}
              <Button
                variant={LIVE_BASE_URL ? "secondary" : "primary"}
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
                  Request failed
                </div>
                <p className="mt-1 font-mono text-xs text-[var(--color-soft-grey)]">
                  {state.error}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card surface={3} border>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <NodeIndicator color={state.phase === "error" ? "error" : "blue"} size="sm" active={running} />
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
                Response
              </span>
            </div>

            {state.requestLog.length === 0 ? (
              <p className="font-mono text-xs text-[var(--color-mid-grey)]">
                awaiting run
              </p>
            ) : (
              <div className="space-y-1.5">
                {state.requestLog.map((e, i) => (
                  <div key={i} className="rounded-md bg-[var(--color-void)] px-2.5 py-1.5">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge
                        size="sm"
                        color={
                          e.status.startsWith("2")
                            ? "success"
                            : e.status.startsWith("4")
                              ? "warning"
                              : "error"
                        }
                        variant="subtle"
                      >
                        {e.status}
                      </Badge>
                      <span className="font-mono text-xs text-[var(--color-off-white)]">
                        {e.label}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-[var(--color-soft-grey)]">
                      <span className="text-[var(--signal-primary)]">{e.method}</span>{" "}
                      {e.path}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {state.workTreeId && (
              <div className="mt-3 rounded-md bg-[var(--color-void)] px-2.5 py-1.5">
                <span className="font-mono text-xs text-[var(--color-soft-grey)]">
                  workTreeId{" "}
                  <span className="text-[var(--signal-primary)]">{state.workTreeId}</span>
                </span>
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
                      <span className="truncate text-xs text-[var(--color-off-white)]">
                        {t.title}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-[var(--color-soft-grey)]">
                        {t.agentType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.phase === "done" && (
              <div className="mt-3 flex items-center gap-2">
                <Icon name="check" size={13} className="text-[var(--signal-success)]" />
                <span className="font-mono text-xs text-[var(--signal-success)]">
                  {state.activityCount} activity event
                  {state.activityCount === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
