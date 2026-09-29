"use client";

import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";

interface Layer {
  label: string;
  detail: string;
  state: "wired" | "provisioned" | "idle";
}

const FLOW: Layer[] = [
  { label: "CLIENT", detail: "Next.js app or your own application", state: "wired" },
  { label: "API GATEWAY", detail: "HTTP API, $default route, AuthorizationType NONE", state: "wired" },
  { label: "API LAMBDA", detail: "api-handler, 15 routes, in-VPC, 30s timeout", state: "wired" },
  { label: "GENESIS PLANNER", detail: "Bedrock Converse, plan validation, persistence", state: "wired" },
  { label: "STEP FUNCTIONS", detail: "8 tasks, retry policy, Map concurrency 3", state: "provisioned" },
  { label: "WORKERS", detail: "planner, agent-worker, verification", state: "idle" },
  { label: "BEDROCK", detail: "Converse only, one model ID, IAM-signed", state: "wired" },
];

const SUPPORT: Layer[] = [
  { label: "MARIADB 10.11.9", detail: "RDS behind RDS Proxy, pool limit 10, 13 tables", state: "wired" },
  { label: "S3", detail: "encrypted, versioned, public access blocked", state: "provisioned" },
  { label: "SECRETS MANAGER", detail: "DB secret in use, Bedrock key secret unread", state: "wired" },
  { label: "IAM", detail: "per-stack least-privilege execution roles", state: "wired" },
  { label: "CLOUDWATCH", detail: "dashboard, 4 alarms, explicit log groups", state: "provisioned" },
  { label: "X-RAY", detail: "enabled on the state machine", state: "idle" },
];

const stateMeta: Record<Layer["state"], { color: "success" | "warning" | "ai"; label: string }> = {
  wired: { color: "success", label: "in use" },
  provisioned: { color: "warning", label: "provisioned" },
  idle: { color: "ai", label: "not reachable" },
};

function LayerRow({ layer, last }: { layer: Layer; last?: boolean }) {
  const meta = stateMeta[layer.state];
  return (
    <div className="flex items-stretch gap-3">
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span
          className="mt-3 h-2 w-2 shrink-0 rounded-full"
          style={{
            backgroundColor: `var(--signal-${meta.color === "success" ? "success" : meta.color === "warning" ? "warning" : "ai"})`,
          }}
        />
        {!last && <span className="w-px flex-1 bg-[var(--border-subtle)]" />}
      </div>
      <div className="flex-1 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs tracking-[0.075em] text-[var(--color-off-white)]">
            {layer.label}
          </span>
          <Badge size="sm" color={meta.color} variant="subtle">
            {meta.label}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-soft-grey)]">
          {layer.detail}
        </p>
      </div>
    </div>
  );
}

export function ArchitectureDiagram() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card surface={3} border>
        <div className="p-4">
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Request path
          </div>
          {FLOW.map((layer, i) => (
            <LayerRow key={layer.label} layer={layer} last={i === FLOW.length - 1} />
          ))}
        </div>
      </Card>

      <Card surface={3} border>
        <div className="p-4">
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Supporting services
          </div>
          {SUPPORT.map((layer, i) => (
            <LayerRow key={layer.label} layer={layer} last={i === SUPPORT.length - 1} />
          ))}
        </div>
      </Card>

      <Card surface={2} border className="lg:col-span-2">
        <div className="p-4">
          <div className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-[var(--color-soft-grey)]">
            Stack dependency order
          </div>
          <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-[var(--color-light-grey)]">
{`VPC  →  Database  →  Storage / Secrets  →  API  →  StepFunctions  →  Monitoring`}
          </pre>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-soft-grey)]">
            Seven stacks, connected by scalar CloudFormation exports resolved with{" "}
            <code className="font-mono text-[var(--color-light-grey)]">Fn.importValue</code>{" "}
            rather than construct references, so each stack can be updated
            independently. Nothing is deployed yet.
          </p>
        </div>
      </Card>
    </div>
  );
}
