"use client";

import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { SdkConsole } from "./SdkConsole";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

function SectionHeader({ label, id }: { label: string; id?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5" id={id}>
      <NodeIndicator color="primary" active size="sm" />
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
        {label}
      </span>
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card surface={3} border>
      <div className={cn("p-4", className)}>{children}</div>
    </Card>
  );
}

function CodeBlock({ code, caption }: { code: string; caption?: string }) {
  return (
    <div>
      {caption && (
        <div className="mb-1.5 font-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]">
          {caption}
        </div>
      )}
      <pre className="overflow-x-auto whitespace-pre rounded-md border border-[var(--border-subtle)] bg-[var(--color-void)] p-3 text-mono text-xs leading-relaxed text-[var(--color-light-grey)]">
        {code}
      </pre>
    </div>
  );
}

type Status = "live" | "partial" | "planned" | "absent";

const statusMeta: Record<Status, { label: string; color: "success" | "warning" | "ai" | "error" }> = {
  live: { label: "Implemented", color: "success" },
  partial: { label: "Partial", color: "warning" },
  planned: { label: "Planned", color: "ai" },
  absent: { label: "Not implemented", color: "error" },
};

function StatusBadge({ status }: { status: Status }) {
  const meta = statusMeta[status];
  return (
    <Badge size="sm" color={meta.color} variant="outline">
      {meta.label}
    </Badge>
  );
}

const ROUTES: Array<{
  method: string;
  path: string;
  purpose: string;
  request?: string;
  response: string;
  errors: string;
}> = [
  {
    method: "GET",
    path: "/api/health",
    purpose: "Liveness probe and service dependency report.",
    response: "{ status, services: { api, database, bedrock, secrets, storage }, environment, timestamp }",
    errors: "500 INTERNAL_ERROR",
  },
  {
    method: "GET",
    path: "/api/work-trees",
    purpose: "List every work tree in the database.",
    response: "WorkTree[]",
    errors: "500 INTERNAL_ERROR",
  },
  {
    method: "POST",
    path: "/api/work-trees",
    purpose: "Create a work tree from a name and objective.",
    request: '{ name: string, objective: string, context?: object }',
    response: "WorkTree",
    errors: "400 VALIDATION_ERROR if name or objective missing; 500 INTERNAL_ERROR",
  },
  {
    method: "GET",
    path: "/api/work-trees/:id",
    purpose: "Fetch one work tree with its agents, tasks, artifacts, approvals, activity and plan.",
    response: "WorkTree & { agents, tasks, artifacts, approvals, activity, plan }",
    errors: "400 VALIDATION_ERROR if id missing; 404 NOT_FOUND; 500 INTERNAL_ERROR",
  },
  {
    method: "POST",
    path: "/api/work-trees/:id/plan",
    purpose: "Generate an execution plan via Amazon Bedrock and persist it.",
    request: '{ objective?: string }',
    response: "ExecutionPlan (camelCase)",
    errors: "400 VALIDATION_ERROR; 404 NOT_FOUND; 500 INTERNAL_ERROR",
  },
  {
    method: "POST",
    path: "/api/work-trees/:id/run",
    purpose: "Set the work tree status to running and emit an activity event.",
    response: "{ workTreeId, status: \"running\" }",
    errors: "400 VALIDATION_ERROR; 404 NOT_FOUND; 500 INTERNAL_ERROR",
  },
  {
    method: "POST",
    path: "/api/work-trees/:id/pause",
    purpose: "Set the work tree status to waiting and emit an activity event.",
    response: "{ workTreeId, status: \"waiting\" }",
    errors: "400 VALIDATION_ERROR; 500 INTERNAL_ERROR",
  },
  {
    method: "POST",
    path: "/api/work-trees/:id/resume",
    purpose: "Set the work tree status back to running and emit an activity event.",
    response: "{ workTreeId, status: \"running\" }",
    errors: "400 VALIDATION_ERROR; 500 INTERNAL_ERROR",
  },
  {
    method: "GET",
    path: "/api/work-trees/:id/activity",
    purpose: "Return activity events for a work tree, capped at 100 rows.",
    response: "ActivityEvent[]",
    errors: "400 VALIDATION_ERROR; 500 INTERNAL_ERROR",
  },
  {
    method: "GET",
    path: "/api/agents",
    purpose: "List all agents across all work trees.",
    response: "Agent[]",
    errors: "500 INTERNAL_ERROR",
  },
  {
    method: "GET",
    path: "/api/agents/:id",
    purpose: "Fetch a single agent row.",
    response: "Agent",
    errors: "400 VALIDATION_ERROR; 404 NOT_FOUND; 500 INTERNAL_ERROR",
  },
  {
    method: "GET",
    path: "/api/tasks",
    purpose: "List all tasks across all work trees.",
    response: "Task[]",
    errors: "500 INTERNAL_ERROR",
  },
  {
    method: "POST",
    path: "/api/approvals/:id/approve",
    purpose: "Mark an approval as approved and stamp decided_at.",
    response: '{ id, status: "approved" }',
    errors: "400 VALIDATION_ERROR; 500 INTERNAL_ERROR",
  },
  {
    method: "POST",
    path: "/api/approvals/:id/reject",
    purpose: "Mark an approval as rejected and stamp decided_at.",
    response: '{ id, status: "rejected" }',
    errors: "400 VALIDATION_ERROR; 500 INTERNAL_ERROR",
  },
  {
    method: "POST",
    path: "/api/ai/chat",
    purpose: "Single-turn Bedrock Converse call with a fixed system prompt.",
    request: '{ message: string }',
    response: "{ response, usage: { inputTokens, outputTokens, totalTokens } }",
    errors: "400 VALIDATION_ERROR if message missing; 500 INTERNAL_ERROR",
  },
];

interface MatrixRow {
  capability: string;
  object: string;
  status: Status;
  iface: string;
  note: string;
}

const MATRIX: MatrixRow[] = [
  {
    capability: "Work tree lifecycle",
    object: "WorkTree",
    status: "partial",
    iface: "API",
    note: "create, list and read exist; no update or delete route",
  },
  {
    capability: "Planning",
    object: "Task / ExecutionPlan",
    status: "live",
    iface: "API + Bedrock",
    note: "the one live Bedrock path in the runtime",
  },
  {
    capability: "Execution control",
    object: "Execution",
    status: "partial",
    iface: "API",
    note: "run/pause/resume only write a status column; the state machine is never started",
  },
  {
    capability: "Agent execution",
    object: "Agent",
    status: "absent",
    iface: "internal only",
    note: "agent-worker returns a hardcoded result and never calls a model",
  },
  {
    capability: "Artifacts",
    object: "Artifact",
    status: "absent",
    iface: "not wired",
    note: "S3 helpers exist but have no importers and no route",
  },
  {
    capability: "Verification",
    object: "Verification",
    status: "absent",
    iface: "internal only",
    note: "verification worker always returns approved with no checks",
  },
  {
    capability: "Human approval",
    object: "Approval",
    status: "partial",
    iface: "API",
    note: "records can be written and read; no runtime gate enforces them",
  },
  {
    capability: "Activity events",
    object: "Event",
    status: "live",
    iface: "API",
    note: "written on create, plan, run, pause and resume",
  },
  {
    capability: "Memory",
    object: "MemoryItem",
    status: "absent",
    iface: "not exposed",
    note: "table and service functions exist; no HTTP route",
  },
  {
    capability: "Knowledge base",
    object: "KnowledgeItem",
    status: "absent",
    iface: "not exposed",
    note: "schema only, zero code references",
  },
  {
    capability: "Direct model access",
    object: "Model",
    status: "live",
    iface: "API",
    note: "chat route and planner; streaming helper is unused",
  },
  {
    capability: "Authentication",
    object: "Identity",
    status: "absent",
    iface: "none",
    note: "API Gateway AuthorizationType is NONE; no auth code in src/server",
  },
  {
    capability: "Retry and backoff",
    object: "Execution",
    status: "partial",
    iface: "infrastructure",
    note: "defined on Step Functions tasks only; no runtime retry logic",
  },
  {
    capability: "Dead-letter handling",
    object: "Event",
    status: "absent",
    iface: "none",
    note: "no SQS resource in any stack and no catch state in the state machine",
  },
  {
    capability: "Idempotency",
    object: "Event",
    status: "absent",
    iface: "none",
    note: "no idempotency key handling anywhere in the repository",
  },
  {
    capability: "Observability",
    object: "Event",
    status: "partial",
    iface: "CloudWatch",
    note: "dashboard and four alarms provisioned; no request tracing in runtime",
  },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What is the Genesis SDK?",
    a: "It is the developer interface into AGENTIS GENESIS. Today the surface is a typed HTTP client over the Genesis API rather than a published npm package. The architecture for a distributable SDK is documented on this page and the package itself is the next implementation layer.",
  },
  {
    q: "What is a Work Tree?",
    a: "The central abstraction. It holds an objective, optional context, and relations to agents, tasks, artifacts, approvals, risks and activity. It is created through POST /api/work-trees and is the unit you pass to plan, run, pause and resume.",
  },
  {
    q: "How do agents execute work?",
    a: "They do not yet, at runtime. The Step Functions state machine, the planner, agent-worker and verification Lambdas are all provisioned, but no code path calls StartExecution, and the agent worker returns a hardcoded result. The execution model below describes the implemented contract, not an autonomous pipeline.",
  },
  {
    q: "Where does model inference happen?",
    a: "On the server, in two places: the planner calls Bedrock Converse when a work tree is planned, and the chat route calls Converse for a single turn. A single model ID is configured, anthropic.claude-3-5-sonnet-20241022-v2:0, and it is set through BEDROCK_MODEL_ID.",
  },
  {
    q: "How are artifacts stored?",
    a: "The intent is S3, with an artifacts table recording the key, bucket, provenance and verification status. A complete S3 helper module exists, including multipart upload and presigned reads, but nothing imports it and no route calls it. Treat artifact retrieval as unimplemented.",
  },
  {
    q: "How does authentication work?",
    a: "It does not yet. There is no authentication or authorization at any layer: API Gateway is configured with AuthorizationType NONE, the CORS allow-origin is a wildcard, and no auth code exists in the server. The database, Bedrock and Secrets Manager credentials are correctly confined to the Lambda execution role and must never reach a browser.",
  },
  {
    q: "Can developers run multiple agents?",
    a: "The Step Functions map is configured with a concurrency of 3, and Lambda reserved concurrency is set to 20, 10, 10 and 5 across the four functions. Those are infrastructure limits. Nothing in the runtime starts that machinery, so the practical answer today is no.",
  },
  {
    q: "How is execution verified?",
    a: "The verification worker is 33 lines long and returns requiresApproval false, approved true and an empty checks array unconditionally. The approval gate in the state machine can therefore never be entered. The approvals table and its two routes are real; the enforcement is not.",
  },
  {
    q: "How are failures handled?",
    a: "At the router boundary, every unhandled error becomes a 500 with code INTERNAL_ERROR and a requestId. Retries with exponential backoff exist only as a Step Functions task property. There is no dead-letter queue, no idempotency, and no rate limiting anywhere in the codebase.",
  },
  {
    q: "Can Genesis be integrated into an existing application?",
    a: "Yes, through the HTTP API. Point a client at the API Gateway base URL and call the documented routes. The integration is read and control oriented today: create a work tree, plan it, drive its status, and read activity. You should assume the surface will change, since several capabilities are partial.",
  },
];

export function SdkView() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [routeFilter, setRouteFilter] = useState<string>("ALL");

  const methods = ["ALL", "GET", "POST"];
  const routes =
    routeFilter === "ALL" ? ROUTES : ROUTES.filter((r) => r.method === routeFilter);

  const liveCount = MATRIX.filter((m) => m.status === "live").length;
  const partialCount = MATRIX.filter((m) => m.status === "partial").length;
  const absentCount = MATRIX.filter((m) => m.status === "absent").length;

  return (
    <div className="space-y-6 pb-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--color-deep-black)] p-6">
        <div className="genesis-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2.5">
            <NodeIndicator color="primary" active pulse size="sm" />
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--signal-primary)]">
              Developer SDK
            </span>
          </div>
          <h1 className="max-w-3xl text-display font-medium text-[var(--color-off-white)]">
            Build intelligent work into your own applications.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-soft-grey)]">
            AGENTIS GENESIS is the operating environment for intelligent work. This is
            the programmatic interface into it: create Work Trees, drive execution
            state, read activity, and plan against Amazon Bedrock.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge size="sm" color="success" variant="outline">
              {ROUTES.length} documented routes
            </Badge>
            <Badge size="sm" color="warning" variant="outline">
              {partialCount} partial capabilities
            </Badge>
            <Badge size="sm" color="error" variant="outline">
              {absentCount} not implemented
            </Badge>
            <Badge size="sm" color="ai" variant="outline">
              no published package yet
            </Badge>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" })}>
              Start with the API
            </Button>
            <Button
              variant="secondary"
              onClick={() => document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })}
            >
              View architecture
            </Button>
          </div>
        </div>
      </div>

      {/* WHAT IS THIS */}
      <section>
        <SectionHeader label="What is the Genesis developer surface" />
        <div className="grid gap-3 lg:grid-cols-3">
          <Panel>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="worktree" size={14} className="text-[var(--signal-primary)]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-off-white)]">
                Work Tree
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-soft-grey)]">
              The unit of work. An objective, optional context, and relations to agents,
              tasks, artifacts, approvals and activity. Everything else in Genesis hangs
              off a work tree.
            </p>
          </Panel>
          <Panel>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="system" size={14} className="text-[var(--signal-ai)]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-off-white)]">
                Execution control
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-soft-grey)]">
              Plan, run, pause and resume are explicit verbs against a work tree. The
              lifecycle is observable through the activity event stream rather than
              pushed to you.
            </p>
          </Panel>
          <Panel>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="lock" size={14} className="text-[var(--signal-blue)]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-off-white)]">
                Backend only
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-soft-grey)]">
              Database, Bedrock and Secrets Manager credentials live in the Lambda
              execution role. A browser never receives them, and never talks to
              MariaDB or Step Functions directly.
            </p>
          </Panel>
        </div>
      </section>

      {/* CONSOLE */}
      <section>
        <SectionHeader label="Interactive console" />
        <SdkConsole />
      </section>

      {/* QUICKSTART */}
      <section id="quickstart">
        <SectionHeader label="Quickstart" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
              01 &mdash; Base URL
            </div>
            <p className="mb-3 text-sm text-[var(--color-soft-grey)]">
              There is no published npm package yet. Call the HTTP API directly and
              point the base URL at your deployment.
            </p>
            <CodeBlock
              caption="Environment"
              code={`# The deployed API Gateway invoke URL
GENESIS_API_BASE_URL=https://<id>.execute-api.<region>.amazonaws.com/api

# Next.js client resolves this at runtime
NEXT_PUBLIC_API_BASE_URL=$GENESIS_API_BASE_URL`}
            />
          </Panel>

          <Panel>
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
              02 &mdash; Create a Work Tree
            </div>
            <p className="mb-3 text-sm text-[var(--color-soft-grey)]">
              Name and objective are both required. The response is the created row.
            </p>
            <CodeBlock
              caption="POST /api/work-trees"
              code={`const res = await fetch(\`\${base}/work-trees\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Nairobi energy market",
    objective: "Research the Nairobi renewable-energy market",
    context: { sources: "verified public sources" },
  }),
});

const { success, data, error } = await res.json();
// data: WorkTree  |  error: { code, message, requestId }`}
            />
          </Panel>

          <Panel>
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
              03 &mdash; Plan
            </div>
            <p className="mb-3 text-sm text-[var(--color-soft-grey)]">
              Planning calls Bedrock Converse, persists the plan, and sets the work tree
              to queued. This is the one live model path in the runtime.
            </p>
            <CodeBlock
              caption="POST /api/work-trees/:id/plan"
              code={`const res = await fetch(\`\${base}/work-trees/\${id}/plan\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ objective }),
});

const plan = (await res.json()).data;
// camelCase: objective, summary, context,
// tasks[], risks[], requiresApproval,
// approvalReason, estimatedTotalDurationMinutes`}
            />
          </Panel>

          <Panel>
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
              04 &mdash; Drive and observe
            </div>
            <p className="mb-3 text-sm text-[var(--color-soft-grey)]">
              Run, pause and resume currently write the status column and emit an
              activity event. Read the stream to follow what happened.
            </p>
            <CodeBlock
              caption="Execution control"
              code={`await post(\`/work-trees/\${id}/run\`);     // status -> running
await post(\`/work-trees/\${id}/pause\`);   // status -> waiting
await post(\`/work-trees/\${id}/resume\`);  // status -> running

const { data: activity } =
  await get(\`/work-trees/\${id}/activity\`);
// ActivityEvent[], capped at 100 rows`}
            />
          </Panel>
        </div>
      </section>

      {/* PRIMITIVES */}
      <section>
        <SectionHeader label="Domain model" />
        <Panel>
          <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-[var(--color-light-grey)]">
{`WorkTree
 ├── Objective            objective string
 ├── Context              optional JSON
 ├── Agents               Agent[]
 ├── Tasks                Task[]
 ├── Artifacts            Artifact[]      schema only, never written
 ├── Approvals            Approval[]
 ├── Risks                count on the row
 └── Outcome              progress + status + completed_at`}
          </pre>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "WorkTree", v: "id, name, objective, status, progress" },
              { k: "Agent", v: "id, type, status, model, memory_scope" },
              { k: "Task", v: "id, agent_id, status, priority, dependencies" },
              { k: "ActivityEvent", v: "event_type, status, message, timestamp" },
            ].map((t) => (
              <div key={t.k} className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-void)] p-2.5">
                <div className="font-mono text-xs text-[var(--signal-primary)]">{t.k}</div>
                <div className="mt-1 text-xs text-[var(--color-soft-grey)]">{t.v}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* EXECUTION MODEL */}
      <section>
        <SectionHeader label="Execution model" />
        <Panel>
          <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-[var(--color-light-grey)]">
{`REQUEST
  ↓
PLAN              live    Bedrock Converse via POST /plan
  ↓
QUEUE             status  work tree set to queued
  ↓
EXECUTE           stub    no StartExecution call exists
  ↓
OBSERVE           live    activity_events written per transition
  ↓
VERIFY            stub    worker always returns approved
  ↓
APPROVE           data    approvals writable, no runtime gate
  ↓
OUTCOME           data    progress, status, completed_at`}
          </pre>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-soft-grey)]">
            Steps marked <span className="text-[var(--signal-success)]">live</span> run
            today. Steps marked <span className="text-[var(--signal-error)]">stub</span>{" "}
            or <span className="text-[var(--signal-warning)]">status</span> exist as
            infrastructure or as columns, not as runtime behaviour.
          </p>
        </Panel>
      </section>

      {/* API REFERENCE */}
      <section id="api">
        <SectionHeader label="API reference" />
        <div className="mb-3 flex gap-2">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setRouteFilter(m)}
              className={cn(
                "rounded-md border px-3 py-1 font-mono text-xs uppercase transition-all",
                routeFilter === m
                  ? "border-[var(--signal-primary)] bg-[var(--color-charcoal)] text-[var(--signal-primary)]"
                  : "text-[var(--color-soft-grey)] hover:border-[var(--border-active)] hover:text-[var(--color-off-white)]"
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {routes.map((r) => (
            <Panel key={`${r.method}-${r.path}`} className="!p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  size="sm"
                  color={r.method === "GET" ? "blue" : "primary"}
                  variant="solid"
                >
                  {r.method}
                </Badge>
                <code className="font-mono text-xs text-[var(--color-off-white)]">
                  {r.path}
                </code>
              </div>
              <p className="mb-2 text-sm text-[var(--color-soft-grey)]">{r.purpose}</p>
              <div className="space-y-1.5">
                {r.request && (
                  <div className="font-mono text-xs">
                    <span className="text-[var(--color-soft-grey)]">request </span>
                    <span className="text-[var(--color-mid-grey)]">{r.request}</span>
                  </div>
                )}
                <div className="font-mono text-xs">
                  <span className="text-[var(--color-soft-grey)]">response </span>
                  <span className="text-[var(--signal-success)]">{r.response}</span>
                </div>
                <div className="font-mono text-xs">
                  <span className="text-[var(--color-soft-grey)]">errors </span>
                  <span className="text-[var(--signal-warning)]">{r.errors}</span>
                </div>
              </div>
            </Panel>
          ))}
        </div>
        <div className="mt-3">
          <Panel className="!p-3">
            <div className="flex items-start gap-2.5">
              <Icon name="warning" size={14} className="mt-0.5 shrink-0 text-[var(--signal-warning)]" />
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.075em] text-[var(--signal-warning)]">
                  Known issue: id routes
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-soft-grey)]">
                  The router matches <code className="font-mono text-[var(--color-light-grey)]">/:id</code>{" "}
                  with a regex but reads the identifier from{" "}
                  <code className="font-mono text-[var(--color-light-grey)]">event.pathParameters.id</code>.
                  API Gateway is configured with a single <code className="font-mono text-[var(--color-light-grey)]">$default</code>{" "}
                  route, which does not populate path parameters. Every id-scoped route
                  therefore returns 400 VALIDATION_ERROR until the gateway declares
                  explicit paths. Verify against a live deployment before relying on
                  them.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture">
        <SectionHeader label="Under the hood" />
        <ArchitectureDiagram />
      </section>

      {/* SECURITY */}
      <section>
        <SectionHeader label="Security" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="check" size={14} className="text-[var(--signal-success)]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-off-white)]">
                In place
              </h3>
            </div>
            <ul className="space-y-1.5 text-sm text-[var(--color-soft-grey)]">
              <li>&middot; Database credentials resolved from Secrets Manager at runtime</li>
              <li>&middot; MariaDB and the API Lambda live inside the VPC</li>
              <li>&middot; Bedrock reached through IAM-signed requests, not static keys</li>
              <li>&middot; S3 bucket blocks all public access and enforces SSL</li>
              <li>&middot; Secrets never reach the browser bundle</li>
            </ul>
          </Panel>
          <Panel>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="alert" size={14} className="text-[var(--signal-error)]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-off-white)]">
                Not in place
              </h3>
            </div>
            <ul className="space-y-1.5 text-sm text-[var(--color-soft-grey)]">
              <li>&middot; No authentication on any endpoint</li>
              <li>&middot; No authorization, roles or multi-tenancy</li>
              <li>&middot; CORS allow-origin is a wildcard</li>
              <li>&middot; A Bedrock API key secret exists but is never read</li>
              <li>&middot; Public routes can list and approve without identity</li>
            </ul>
            <p className="mt-3 rounded-md border border-[var(--signal-error)] bg-[color:mix(8%,var(--signal-error),_transparent)] p-2.5 text-xs leading-relaxed text-[var(--signal-error)]">
              Do not expose this API to untrusted clients in its current state. An
              authorizer must be added before any external integration.
            </p>
          </Panel>
        </div>
      </section>

      {/* OBSERVABILITY */}
      <section>
        <SectionHeader label="Observability" />
        <Panel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Request identity", v: "X-Request-ID is honoured and echoed on every response" },
              { k: "Activity stream", v: "activity_events rows per lifecycle transition" },
              { k: "State", v: "work_trees.status and .progress readable at any time" },
              { k: "Infrastructure", v: "CloudWatch dashboard and four alarms provisioned" },
            ].map((o) => (
              <div key={o.k} className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-void)] p-3">
                <div className="font-mono text-xs text-[var(--signal-primary)]">{o.k}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-[var(--color-soft-grey)]">{o.v}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-soft-grey)]">
            X-Ray tracing and full state machine logging are configured on the Step
            Functions stack. Neither is reachable yet, because nothing starts an
            execution. Structured runtime logging beyond the requestId console line does
            not exist.
          </p>
        </Panel>
      </section>

      {/* MATRIX */}
      <section>
        <SectionHeader label="Capability matrix" />
        <Panel className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {["Capability", "Genesis object", "Status", "Interface", "Note"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((m) => (
                  <tr key={m.capability} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-3 py-2 text-xs text-[var(--color-off-white)]">{m.capability}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--color-light-grey)]">{m.object}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--color-soft-grey)]">{m.iface}</td>
                    <td className="px-3 py-2 text-xs text-[var(--color-soft-grey)]">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] px-3 py-2">
            <span className="font-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]">
              Summary
            </span>
            <Badge size="sm" color="success" variant="subtle">{liveCount} implemented</Badge>
            <Badge size="sm" color="warning" variant="subtle">{partialCount} partial</Badge>
            <Badge size="sm" color="error" variant="subtle">{absentCount} not implemented</Badge>
          </div>
        </Panel>
      </section>

      {/* FAQ */}
      <section>
        <SectionHeader label="Questions" />
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <button
              key={f.q}
              type="button"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left"
            >
              <Panel className="!p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--color-off-white)]">
                    {f.q}
                  </span>
                  <Icon
                    name={openFaq === i ? "chevron-up" : "chevron-down"}
                    size={14}
                    className="shrink-0 text-[var(--color-soft-grey)]"
                  />
                </div>
                {openFaq === i && (
                  <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-soft-grey)]">
                    {f.a}
                  </p>
                )}
              </Panel>
            </button>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section>
        <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--color-deep-black)] p-6">
          <div className="genesis-grid pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative text-center">
            <h2 className="text-h1 font-medium text-[var(--color-off-white)]">
              Build with Genesis.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-soft-grey)]">
              Turn objectives into controlled, verifiable intelligent work.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" })}
              >
                Open quickstart
              </Button>
              <Button
                variant="secondary"
                onClick={() => document.getElementById("api")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore API
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
