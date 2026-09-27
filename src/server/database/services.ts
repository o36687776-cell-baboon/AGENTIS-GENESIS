import { query, execute, transaction, getPool } from "../database";
import { v4 as uuidv4 } from "uuid";

export interface WorkTreeRow {
  id: string;
  name: string;
  objective: string;
  context: string;
  status: string;
  progress: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface AgentRow {
  id: string;
  work_tree_id: string | null;
  name: string;
  type: string;
  version: string;
  status: string;
  capabilities: string;
  permissions: string;
  current_goal: string | null;
  current_task: string | null;
  model: string;
  memory_scope: string;
  tools: string;
  resource_usage: string;
  progress: number;
  avatar: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskRow {
  id: string;
  work_tree_id: string;
  agent_id: string | null;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  priority: string;
  input: string | null;
  output: string | null;
  dependencies: string | null;
  estimated_duration_minutes: number | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ArtifactRow {
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
  metadata: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalRow {
  id: string;
  work_tree_id: string;
  task_id: string | null;
  title: string;
  description: string | null;
  risk_level: string;
  recipients: string | null;
  attachments: string | null;
  external: boolean;
  status: string;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: Date | null;
  requested_at: Date;
  expires_at: Date | null;
}

export interface ActivityEventRow {
  id: string;
  work_tree_id: string;
  agent_id: string | null;
  task_id: string | null;
  event_type: string;
  status: string;
  message: string | null;
  metadata: string | null;
  timestamp: Date;
}

export interface MemoryRow {
  id: string;
  work_tree_id: string | null;
  fact: string;
  source: string | null;
  confidence: string;
  permission: string;
  domain: string;
  expiry: Date | null;
  created_at: Date;
  last_used_at: Date | null;
  updated_at: Date;
}

export interface WorkTreePlanRow {
  id: string;
  work_tree_id: string;
  objective: string;
  summary: string | null;
  context: string | null;
  tasks: string;
  risks: string | null;
  requires_approval: boolean;
  approval_reason: string | null;
  estimated_total_duration_minutes: number;
  created_at: Date;
  updated_at: Date;
}

function generateId(): string {
  return uuidv4().replace(/-/g, "");
}

export async function createWorkTree(data: {
  name: string;
  objective: string;
  context?: object;
}): Promise<WorkTreeRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO work_trees (id, name, objective, context, status, progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'idle', 0, ?, ?)`,
    { id, name: data.name, objective: data.objective, context: JSON.stringify(data.context || {}), now }
  );

  return {
    id,
    name: data.name,
    objective: data.objective,
    context: JSON.stringify(data.context || {}),
    status: "idle",
    progress: 0,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
}

export async function getWorkTree(id: string): Promise<WorkTreeRow | null> {
  const rows = await query<WorkTreeRow[]>(
    `SELECT * FROM work_trees WHERE id = ?`,
    { id }
  );
  return rows[0] || null;
}

export async function getWorkTrees(): Promise<WorkTreeRow[]> {
  return query<WorkTreeRow[]>(
    `SELECT * FROM work_trees ORDER BY created_at DESC`
  );
}

export async function updateWorkTree(id: string, updates: Partial<WorkTreeRow>): Promise<void> {
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  if (updates.name !== undefined) {
    fields.push("name = :name");
    params.name = updates.name;
  }
  if (updates.objective !== undefined) {
    fields.push("objective = :objective");
    params.objective = updates.objective;
  }
  if (updates.context !== undefined) {
    fields.push("context = :context");
    params.context = updates.context;
  }
  if (updates.status !== undefined) {
    fields.push("status = :status");
    params.status = updates.status;
  }
  if (updates.progress !== undefined) {
    fields.push("progress = :progress");
    params.progress = updates.progress;
  }
  if (updates.completed_at !== undefined) {
    fields.push("completed_at = :completed_at");
    params.completed_at = updates.completed_at;
  }

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  await execute(
    `UPDATE work_trees SET ${fields.join(", ")} WHERE id = :id`,
    params
  );
}

export async function createAgent(data: {
  workTreeId: string;
  name: string;
  type: string;
  version: string;
  model: string;
  capabilities: string[];
  permissions: string[];
  memoryScope: string;
  tools: string[];
  avatar?: string;
}): Promise<AgentRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO agents (id, work_tree_id, name, type, version, status, capabilities, permissions,
      current_goal, current_task, model, memory_scope, tools, resource_usage, progress, avatar, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'idle', ?, ?, NULL, NULL, ?, ?, ?, '{"tokens":0,"sources":0,"tools":0}', 0, ?, ?, ?)`,
    {
      id,
      workTreeId: data.workTreeId,
      name: data.name,
      type: data.type,
      version: data.version,
      capabilities: JSON.stringify(data.capabilities),
      permissions: JSON.stringify(data.permissions),
      model: data.model,
      memoryScope: data.memoryScope,
      tools: JSON.stringify(data.tools),
      avatar: data.avatar || null,
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    name: data.name,
    type: data.type,
    version: data.version,
    status: "idle",
    capabilities: JSON.stringify(data.capabilities),
    permissions: JSON.stringify(data.permissions),
    current_goal: null,
    current_task: null,
    model: data.model,
    memory_scope: data.memoryScope,
    tools: JSON.stringify(data.tools),
    resource_usage: '{"tokens":0,"sources":0,"tools":0}',
    progress: 0,
    avatar: data.avatar || null,
    created_at: now,
    updated_at: now,
  };
}

export async function getAgentsByWorkTree(workTreeId: string): Promise<AgentRow[]> {
  return query<AgentRow[]>(
    `SELECT * FROM agents WHERE work_tree_id = ? ORDER BY created_at`,
    { workTreeId }
  );
}

export async function getAgent(id: string): Promise<AgentRow | null> {
  const rows = await query<AgentRow[]>(`SELECT * FROM agents WHERE id = ?`, { id });
  return rows[0] || null;
}

export async function updateAgent(id: string, updates: Partial<AgentRow>): Promise<void> {
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== "id" && key !== "created_at" && value !== undefined) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = :${key}`);
      params[key] = value;
    }
  });

  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");

  await execute(`UPDATE agents SET ${fields.join(", ")} WHERE id = :id`, params);
}

export async function createTask(data: {
  workTreeId: string;
  agentId?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  dependencies?: string[];
  estimatedDurationMinutes?: number;
  input?: object;
}): Promise<TaskRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO tasks (id, work_tree_id, agent_id, title, description, status, progress, priority,
      input, dependencies, estimated_duration_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?, ?, ?, ?)`,
    {
      id,
      workTreeId: data.workTreeId,
      agentId: data.agentId || null,
      title: data.title,
      description: data.description,
      priority: data.priority,
      input: JSON.stringify(data.input || {}),
      dependencies: JSON.stringify(data.dependencies || []),
      estimatedDurationMinutes: data.estimatedDurationMinutes || null,
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    agent_id: data.agentId || null,
    title: data.title,
    description: data.description,
    status: "queued",
    progress: 0,
    priority: data.priority,
    input: JSON.stringify(data.input || {}),
    output: null,
    dependencies: JSON.stringify(data.dependencies || []),
    estimated_duration_minutes: data.estimatedDurationMinutes || null,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getTasksByWorkTree(workTreeId: string): Promise<TaskRow[]> {
  return query<TaskRow[]>(
    `SELECT * FROM tasks WHERE work_tree_id = ? ORDER BY created_at`,
    { workTreeId }
  );
}

export async function getTask(id: string): Promise<TaskRow | null> {
  const rows = await query<TaskRow[]>(`SELECT * FROM tasks WHERE id = ?`, { id });
  return rows[0] || null;
}

export async function updateTask(id: string, updates: Partial<TaskRow>): Promise<void> {
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== "id" && key !== "created_at" && value !== undefined) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = :${key}`);
      params[key] = value;
    }
  });

  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");

  await execute(`UPDATE tasks SET ${fields.join(", ")} WHERE id = :id`, params);
}

export async function createArtifact(data: {
  workTreeId: string;
  taskId?: string;
  name: string;
  type: string;
  version: string;
  s3Key: string;
  s3Bucket: string;
  createdBy?: string;
  agentId?: string;
  model?: string;
  sourcesCount?: number;
  toolsCount?: number;
  agentsCount?: number;
  metadata?: object;
}): Promise<ArtifactRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO artifacts (id, work_tree_id, task_id, name, type, version, s3_key, s3_bucket,
      created_by, agent_id, model, sources_count, tools_count, agents_count,
      verified, human_reviewed, approved, verification_status, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, FALSE, 'pending', ?, ?, ?)`,
    {
      id,
      workTreeId: data.workTreeId,
      taskId: data.taskId || null,
      name: data.name,
      type: data.type,
      version: data.version,
      s3Key: data.s3Key,
      s3Bucket: data.s3Bucket,
      createdBy: data.createdBy || null,
      agentId: data.agentId || null,
      model: data.model || "",
      sourcesCount: data.sourcesCount || 0,
      toolsCount: data.toolsCount || 0,
      agentsCount: data.agentsCount || 0,
      metadata: JSON.stringify(data.metadata || {}),
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    task_id: data.taskId || null,
    name: data.name,
    type: data.type,
    version: data.version,
    s3_key: data.s3Key,
    s3_bucket: data.s3Bucket,
    created_by: data.createdBy || null,
    agent_id: data.agentId || null,
    model: data.model || "",
    sources_count: data.sourcesCount || 0,
    tools_count: data.toolsCount || 0,
    agents_count: data.agentsCount || 0,
    verified: false,
    human_reviewed: false,
    approved: false,
    verification_status: "pending",
    metadata: JSON.stringify(data.metadata || {}),
    created_at: now,
    updated_at: now,
  };
}

export async function getArtifactsByWorkTree(workTreeId: string): Promise<ArtifactRow[]> {
  return query<ArtifactRow[]>(
    `SELECT * FROM artifacts WHERE work_tree_id = ? ORDER BY created_at DESC`,
    { workTreeId }
  );
}

export async function createApproval(data: {
  workTreeId: string;
  taskId?: string;
  title: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  recipients?: object;
  attachments?: object;
  external?: boolean;
  requestedBy?: string;
  expiresAt?: Date;
}): Promise<ApprovalRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO approvals (id, work_tree_id, task_id, title, description, risk_level,
      recipients, attachments, external, status, requested_by, requested_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    {
      id,
      workTreeId: data.workTreeId,
      taskId: data.taskId || null,
      title: data.title,
      description: data.description,
      riskLevel: data.riskLevel,
      recipients: JSON.stringify(data.recipients || {}),
      attachments: JSON.stringify(data.attachments || {}),
      external: data.external || false,
      requestedBy: data.requestedBy || null,
      now,
      expiresAt: data.expiresAt || null,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    task_id: data.taskId || null,
    title: data.title,
    description: data.description,
    risk_level: data.riskLevel,
    recipients: JSON.stringify(data.recipients || {}),
    attachments: JSON.stringify(data.attachments || {}),
    external: data.external || false,
    status: "pending",
    requested_by: data.requestedBy || null,
    decided_by: null,
    decided_at: null,
    requested_at: now,
    expires_at: data.expiresAt || null,
  };
}

export async function getApprovalsByWorkTree(workTreeId: string): Promise<ApprovalRow[]> {
  return query<ApprovalRow[]>(
    `SELECT * FROM approvals WHERE work_tree_id = ? ORDER BY requested_at DESC`,
    { workTreeId }
  );
}

export async function updateApproval(id: string, updates: Partial<ApprovalRow>): Promise<void> {
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== "id" && key !== "requested_at" && value !== undefined) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = :${key}`);
      params[key] = value;
    }
  });

  if (fields.length === 0) return;

  await execute(`UPDATE approvals SET ${fields.join(", ")} WHERE id = :id`, params);
}

export async function createActivityEvent(data: {
  workTreeId: string;
  agentId?: string;
  taskId?: string;
  eventType: string;
  status: "info" | "success" | "warning" | "error";
  message?: string;
  metadata?: object;
}): Promise<ActivityEventRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO activity_events (id, work_tree_id, agent_id, task_id, event_type, status, message, metadata, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    {
      id,
      workTreeId: data.workTreeId,
      agentId: data.agentId || null,
      taskId: data.taskId || null,
      eventType: data.eventType,
      status: data.status,
      message: data.message || null,
      metadata: JSON.stringify(data.metadata || {}),
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    agent_id: data.agentId || null,
    task_id: data.taskId || null,
    event_type: data.eventType,
    status: data.status,
    message: data.message || null,
    metadata: JSON.stringify(data.metadata || {}),
    timestamp: now,
  };
}

export async function getActivityEventsByWorkTree(workTreeId: string, limit = 100): Promise<ActivityEventRow[]> {
  return query<ActivityEventRow[]>(
    `SELECT * FROM activity_events WHERE work_tree_id = ? ORDER BY timestamp DESC LIMIT ?`,
    { workTreeId, limit }
  );
}

export async function createMemory(data: {
  workTreeId?: string;
  fact: string;
  source?: string;
  confidence: "verified" | "supported" | "inferred" | "uncertain" | "unknown";
  permission: "read" | "write" | "admin";
  domain: "personal" | "project" | "organization";
  expiry?: Date;
}): Promise<MemoryRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO memories (id, work_tree_id, fact, source, confidence, permission, domain, expiry, created_at, last_used_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    {
      id,
      workTreeId: data.workTreeId || null,
      fact: data.fact,
      source: data.source || null,
      confidence: data.confidence,
      permission: data.permission,
      domain: data.domain,
      expiry: data.expiry || null,
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId || null,
    fact: data.fact,
    source: data.source || null,
    confidence: data.confidence,
    permission: data.permission,
    domain: data.domain,
    expiry: data.expiry || null,
    created_at: now,
    last_used_at: null,
    updated_at: now,
  };
}

export async function getMemoriesByWorkTree(workTreeId: string): Promise<MemoryRow[]> {
  return query<MemoryRow[]>(
    `SELECT * FROM memories WHERE work_tree_id = ? OR work_tree_id IS NULL ORDER BY created_at DESC`,
    { workTreeId }
  );
}

export async function createWorkTreePlan(data: {
  workTreeId: string;
  objective: string;
  summary?: string;
  context?: string;
  tasks: object[];
  risks?: object[];
  requiresApproval: boolean;
  approvalReason?: string;
  estimatedTotalDurationMinutes: number;
}): Promise<WorkTreePlanRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO work_tree_plans (id, work_tree_id, objective, summary, context, tasks, risks,
      requires_approval, approval_reason, estimated_total_duration_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    {
      id,
      workTreeId: data.workTreeId,
      objective: data.objective,
      summary: data.summary || null,
      context: data.context || null,
      tasks: JSON.stringify(data.tasks),
      risks: JSON.stringify(data.risks || []),
      requiresApproval: data.requiresApproval,
      approvalReason: data.approvalReason || null,
      estimatedTotalDurationMinutes: data.estimatedTotalDurationMinutes,
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    objective: data.objective,
    summary: data.summary || null,
    context: data.context || null,
    tasks: JSON.stringify(data.tasks),
    risks: JSON.stringify(data.risks || []),
    requires_approval: data.requiresApproval,
    approval_reason: data.approvalReason || null,
    estimated_total_duration_minutes: data.estimatedTotalDurationMinutes,
    created_at: now,
    updated_at: now,
  };
}

export async function getWorkTreePlan(workTreeId: string): Promise<WorkTreePlanRow | null> {
  const rows = await query<WorkTreePlanRow[]>(
    `SELECT * FROM work_tree_plans WHERE work_tree_id = ? ORDER BY created_at DESC LIMIT 1`,
    { workTreeId }
  );
  return rows[0] || null;
}