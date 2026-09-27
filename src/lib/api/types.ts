export interface ApiError extends Error {
  code: string;
  requestId: string;
  statusCode: number;
}

export interface WorkTree {
  id: string;
  name: string;
  objective: string;
  context?: Record<string, any>;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  agents?: Agent[];
  tasks?: Task[];
  artifacts?: Artifact[];
  approvals?: Approval[];
  activity?: ActivityEvent[];
  plan?: WorkTreePlan;
}

export interface Agent {
  id: string;
  work_tree_id: string | null;
  name: string;
  type: string;
  version: string;
  status: string;
  capabilities: string[];
  permissions: string[];
  current_goal: string | null;
  current_task: string | null;
  model: string;
  memory_scope: string;
  tools: string[];
  resource_usage: {
    tokens: number;
    sources: number;
    tools: number;
  };
  progress: number;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  work_tree_id: string;
  agent_id: string | null;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  priority: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  dependencies: string[];
  estimated_duration_minutes: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  work_tree_id: string;
  task_id: string | null;
  name: string;
  type: string;
  version: string;
  s3_key: string;
  s3_bucket: string;
  created_by: string | null;
  agent_id: string | null;
  model: string;
  sources_count: number;
  tools_count: number;
  agents_count: number;
  verified: boolean;
  human_reviewed: boolean;
  approved: boolean;
  verification_status: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  work_tree_id: string;
  task_id: string | null;
  title: string;
  description: string | null;
  risk_level: string;
  recipients?: Record<string, any>;
  attachments?: Record<string, any>;
  external: boolean;
  status: string;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  requested_at: string;
  expires_at: string | null;
}

export interface ActivityEvent {
  id: string;
  work_tree_id: string;
  agent_id: string | null;
  task_id: string | null;
  event_type: string;
  status: string;
  message: string | null;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface WorkTreePlan {
  id: string;
  work_tree_id: string;
  objective: string;
  summary: string | null;
  context: string | null;
  tasks: PlanTask[];
  risks: PlanRisk[];
  requires_approval: boolean;
  approval_reason: string | null;
  estimated_total_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  agentType: string;
  status: string;
  priority: string;
  dependencies: string[];
  estimatedDurationMinutes?: number;
}

export interface PlanRisk {
  id: string;
  title: string;
  description: string;
  severity: string;
  mitigation?: string;
}

export interface HealthResponse {
  status: string;
  services: {
    api: string;
    database: string;
    bedrock: string;
    secrets: string;
    storage: string;
  };
  environment: string;
  timestamp: string;
}

export interface AiChatResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}