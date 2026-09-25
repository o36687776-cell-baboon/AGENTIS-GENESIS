import { NodeState, AgentStatus } from "@/types";

export interface StateConfig {
  label: string;
  color: "primary" | "ai" | "blue" | "success" | "warning" | "error" | "muted" | "disabled";
}

export const nodeStateConfig: Record<NodeState, StateConfig> = {
  idle: { label: "Idle", color: "muted" },
  queued: { label: "Queued", color: "muted" },
  running: { label: "Running", color: "primary" },
  waiting: { label: "Waiting", color: "muted" },
  blocked: { label: "Blocked", color: "warning" },
  "needs-approval": { label: "Needs Approval", color: "blue" },
  failed: { label: "Failed", color: "error" },
  completed: { label: "Completed", color: "success" },
  archived: { label: "Archived", color: "disabled" },
};

export const agentStatusConfig: Record<AgentStatus, StateConfig> = {
  idle: { label: "Idle", color: "muted" },
  thinking: { label: "Thinking", color: "ai" },
  planning: { label: "Planning", color: "blue" },
  executing: { label: "Executing", color: "primary" },
  waiting: { label: "Waiting", color: "muted" },
  blocked: { label: "Blocked", color: "warning" },
  delegating: { label: "Delegating", color: "ai" },
  verifying: { label: "Verifying", color: "success" },
  completed: { label: "Completed", color: "success" },
};

export const confidenceConfig: Record<string, StateConfig> = {
  verified: { label: "Verified", color: "success" },
  supported: { label: "Supported", color: "blue" },
  inferred: { label: "Inferred", color: "warning" },
  uncertain: { label: "Uncertain", color: "muted" },
  unknown: { label: "Unknown", color: "disabled" },
};

export const signalColorVars: Record<StateConfig["color"], string> = {
  primary: "var(--signal-primary)",
  ai: "var(--signal-ai)",
  blue: "var(--signal-blue)",
  success: "var(--signal-success)",
  warning: "var(--signal-warning)",
  error: "var(--signal-error)",
  muted: "var(--color-soft-grey)",
  disabled: "var(--color-mid-grey)",
};

export const getStateColor = (color: StateConfig["color"]): string => signalColorVars[color];

export const getNodeStateConfig = (state: NodeState): StateConfig => nodeStateConfig[state] ?? nodeStateConfig.idle;
export const getAgentStatusConfig = (status: AgentStatus): StateConfig => agentStatusConfig[status] ?? agentStatusConfig.idle;
export const getConfidenceConfig = (confidence: string): StateConfig => confidenceConfig[confidence] ?? confidenceConfig.unknown;
