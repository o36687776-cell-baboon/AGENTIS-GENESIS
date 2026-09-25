export type NodeState =
  | "idle"
  | "queued"
  | "running"
  | "waiting"
  | "blocked"
  | "needs-approval"
  | "failed"
  | "completed"
  | "archived";

export type AgentStatus =
  | "idle"
  | "thinking"
  | "planning"
  | "executing"
  | "waiting"
  | "blocked"
  | "delegating"
  | "verifying"
  | "completed";

export type NodeType =
  | "objective"
  | "context"
  | "agent"
  | "task"
  | "artifact"
  | "approval"
  | "risk"
  | "outcome";

export interface WorkTreeNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  state: NodeState;
  progress?: number;
  owner?: string;
  agent?: string;
  children?: WorkTreeNode[];
  collapsed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  version: string;
  status: AgentStatus;
  capabilities: string[];
  permissions: string[];
  currentGoal?: string;
  currentTask?: string;
  model: string;
  memoryScope: string;
  tools: string[];
  resourceUsage: {
    tokens: number;
    sources: number;
    tools: number;
  };
  progress?: number;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: NodeState;
  agent?: string;
  progress: number;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
  estimated?: string;
  dependencies?: string[];
}

export interface Artifact {
  id: string;
  name: string;
  type: "document" | "spreadsheet" | "presentation" | "code" | "data";
  version: string;
  createdAt: string;
  createdBy: string;
  agent: string;
  model: string;
  sources: number;
  tools: number;
  agents: number;
  verified: boolean;
  humanReviewed: boolean;
  approved: boolean;
  content?: string;
}

export interface MemoryItem {
  id: string;
  fact: string;
  source: string;
  confidence: "verified" | "supported" | "inferred" | "uncertain" | "unknown";
  created: string;
  lastUsed: string;
  expiry?: string;
  permission: "read" | "write" | "admin";
  domain: "personal" | "project" | "organization";
}

export interface PlanStep {
  id: string;
  order: number;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "blocked";
  agent?: string;
  tool?: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  recipients?: number;
  attachments?: number;
  external: boolean;
  requestedAt: string;
}

export interface SystemStatus {
  agents: number;
  tasks: number;
  running: number;
  queued: number;
  errors: number;
  apiHealth: number;
  memory: "healthy" | "degraded" | "critical";
  security: "protected" | "warning" | "compromised";
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  detail?: string;
  type: "info" | "success" | "warning" | "error";
}

export interface WorkTree {
  id: string;
  name: string;
  objective: string;
  status: NodeState;
  progress: number;
  createdAt: string;
  agents: Agent[];
  tasks: Task[];
  artifacts: Artifact[];
  risks: number;
  approvals: ApprovalRequest[];
  activity: ActivityEvent[];
  context: {
    project: string;
    application: string;
    documents: number;
    activeAgents: number;
    recentDecisions: number;
    relevantMemory: number;
    deadline?: string;
  };
}