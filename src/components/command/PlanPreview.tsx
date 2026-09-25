import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { Badge } from "@/design-system/components/Badge";

interface PlanStep {
  id: number;
  title: string;
  description: string;
  agent?: string;
  tool?: string;
}

const planSteps: PlanStep[] = [
  { id: 1, title: "Read sales dataset", description: "Load Q3 Sales Dataset from financial database", agent: "Vector" },
  { id: 2, title: "Validate data", description: "Validate 18,420 records for quality and completeness", agent: "Vector" },
  { id: 3, title: "Calculate KPIs", description: "Compute MRR, churn, CAC, LTV, conversion rates", agent: "Astrid" },
  { id: 4, title: "Identify anomalies", description: "Detect anomalies in Q3 sales performance", agent: "Vector" },
  { id: 5, title: "Compare previous quarter", description: "Benchmark Q3 against Q2 baselines", agent: "Astrid" },
  { id: 6, title: "Generate report", description: "Produce final Q4 strategy report document", agent: "Genesis" },
  { id: 7, title: "Request approval", description: "Submit report for stakeholder review", agent: "Genesis" },
  { id: 8, title: "Export final artifact", description: "Export final artifact and archive", agent: "Genesis" },
];

interface PlanPreviewProps {
  onConfirm: () => void;
}

export function PlanPreview({ onConfirm }: PlanPreviewProps) {
  return (
    <div className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--color-void)] p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <NodeIndicator color="primary" active size="sm" />
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--signal-primary)]">
          GENESIS PLAN
        </span>
      </div>

      <h4 className="text-h4 font-medium">Analyze Q3 sales performance.</h4>

      <div className="mt-3 space-y-1.5">
        {planSteps.map((step) => (
          <div key={step.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-mono">
              {step.id.toString().padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[var(--color-light-grey)]">
                {step.title}
              </div>
              <p className="text-sm text-[var(--color-soft-grey)]">
                {step.description}
              </p>
              {step.agent && (
                <div className="mt-1 flex items-center gap-1.5">
                  <NodeIndicator color="muted" size="xs" />
                  <span className="font-mono text-xs text-[var(--color-soft-grey)]">
                    {step.agent}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
        <span className="text-[var(--color-soft-grey)]">
          Estimated: <span className="text-[var(--color-light-grey)]">12 min</span> ·{" "}
          <span className="text-[var(--color-light-grey)]">3 agents</span> ·{" "}
          <span className="text-[var(--color-light-grey)]">8 tools</span>
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 rounded-md bg-[var(--signal-primary)] px-3 py-1.5 text-center text-sm font-medium text-[var(--color-void)] transition-all hover:brightness-110"
        >
          START
        </button>
        <button className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-graphite)] px-3 py-1.5 text-sm text-[var(--color-off-white)] transition-all hover:bg-[var(--color-deep-black)]">
          MODIFY PLAN
        </button>
        <button className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-graphite)] px-3 py-1.5 text-sm text-[var(--color-soft-grey)] transition-all hover:bg-[var(--color-deep-black)]">
          CANCEL
        </button>
      </div>
    </div>
  );
}
