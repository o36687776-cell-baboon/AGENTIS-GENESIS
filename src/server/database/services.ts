import { query, execute, getPool } from "../database";
import { v4 as uuidv4 } from "uuid";

export interface WorkTreeRow {
  id: string;
  name: string;
  objective: string;
  context: string;
  status: string;
  progress: number;
  execution_arn: string | null;
  correlation_id: string | null;
  idempotency_key: string | null;
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
  status: "info" | "success" | "warning" | "error";
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

export interface AgentRunRow {
  id: string;
  agent_id: string;
  task_id: string | null;
  work_tree_id: string;
  status: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  tools_used: string | null;
  result: string | null;
  error: string | null;
  verification_status: string;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
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

export function generateId(): string {
  return uuidv4().replace(/-/g, "");
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeRow<T extends object>(row: T): T {
  if (!row) return row;
  const result: Record<string, any> = { ...(row as Record<string, any>) };
  if ("progress" in result) result.progress = toNumber(result.progress);
  if ("sources_count" in result) result.sources_count = toNumber(result.sources_count);
  if ("tools_count" in result) result.tools_count = toNumber(result.tools_count);
  if ("agents_count" in result) result.agents_count = toNumber(result.agents_count);
  if ("input_tokens" in result) result.input_tokens = toNumber(result.input_tokens);
  if ("output_tokens" in result) result.output_tokens = toNumber(result.output_tokens);
  if ("estimated_total_duration_minutes" in result) {
    result.estimated_total_duration_minutes = result.estimated_total_duration_minutes === null
      ? null
      : toNumber(result.estimated_total_duration_minutes);
  }
  if ("estimated_duration_minutes" in result) {
    result.estimated_duration_minutes = result.estimated_duration_minutes === null
      ? null
      : toNumber(result.estimated_duration_minutes);
  }
  return result as T;
}

function normalizeRows<T extends object>(rows: T[]): T[] {
  return (rows || []).map((row) => normalizeRow(row));
}

export async function createWorkTree(data: {
  name: string;
  objective: string;
  context?: object;
}): Promise<WorkTreeRow> {
  const id = generateId();
  const now = new Date();
  const contextJson = JSON.stringify(data.context || {});

  await execute(
    `INSERT INTO work_trees (id, name, objective, context, status, progress, created_at, updated_at)
     VALUES (:id, :name, :objective, :context, 'idle', 0, :now, :now)`,
    { id, name: data.name, objective: data.objective, context: contextJson, now }
  );

  return {
    id,
    name: data.name,
    objective: data.objective,
    context: contextJson,
    status: "idle",
    progress: 0,
    execution_arn: null,
    correlation_id: null,
    idempotency_key: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
}

export async function getWorkTree(id: string): Promise<WorkTreeRow | null> {
  const rows = await query<WorkTreeRow>(
    `SELECT * FROM work_trees WHERE id = :id`,
    { id }
  );
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function getWorkTrees(): Promise<WorkTreeRow[]> {
  const rows = await query<WorkTreeRow>(
    `SELECT * FROM work_trees ORDER BY created_at DESC`
  );
  return normalizeRows(rows);
}

export async function getWorkTreeByIdempotencyKey(key: string): Promise<WorkTreeRow | null> {
  const rows = await query<WorkTreeRow>(
    `SELECT * FROM work_trees WHERE idempotency_key = :key LIMIT 1`,
    { key }
  );
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function updateWorkTree(id: string, updates: Partial<WorkTreeRow>): Promise<void> {
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  Object.entries(updates).forEach(([key, value]) => {
    if (key === "id" || key === "created_at" || value === undefined) return;
    fields.push(`${key} = :${key}`);
    params[key] = value;
  });

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  await execute(
    `UPDATE work_trees SET ${fields.join(", ")} WHERE id = :id`,
    params
  );
}

export async function attachExecution(data: {
  workTreeId: string;
  executionArn: string;
  correlationId: string;
  idempotencyKey: string | null;
}): Promise<void> {
  await execute(
    `UPDATE work_trees
        SET execution_arn = :executionArn,
            correlation_id = :correlationId,
            idempotency_key = COALESCE(:idempotencyKey, idempotency_key),
            updated_at = NOW()
      WHERE id = :workTreeId`,
    {
      executionArn: data.executionArn,
      correlationId: data.correlationId,
      idempotencyKey: data.idempotencyKey,
      workTreeId: data.workTreeId,
    }
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
  const capabilities = JSON.stringify(data.capabilities);
  const permissions = JSON.stringify(data.permissions);
  const tools = JSON.stringify(data.tools);
  const resourceUsage = JSON.stringify({ tokens: 0, sources: 0, tools: 0 });
  const avatar = data.avatar || null;

  await execute(
    `INSERT INTO agents (id, work_tree_id, name, type, version, status, capabilities, permissions,
      current_goal, current_task, model, memory_scope, tools, resource_usage, progress, avatar, created_at, updated_at)
     VALUES (:id, :workTreeId, :name, :type, :version, 'idle', :capabilities, :permissions,
      NULL, NULL, :model, :memoryScope, :tools, :resourceUsage, 0, :avatar, :now, :now)`,
    {
      id,
      workTreeId: data.workTreeId,
      name: data.name,
      type: data.type,
      version: data.version,
      capabilities,
      permissions,
      model: data.model,
      memoryScope: data.memoryScope,
      tools,
      resourceUsage,
      avatar,
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
    capabilities,
    permissions,
    current_goal: null,
    current_task: null,
    model: data.model,
    memory_scope: data.memoryScope,
    tools,
    resource_usage: resourceUsage,
    progress: 0,
    avatar,
    created_at: now,
    updated_at: now,
  };
}

export async function getAgentsByWorkTree(workTreeId: string): Promise<AgentRow[]> {
  const rows = await query<AgentRow>(
    `SELECT * FROM agents WHERE work_tree_id = :workTreeId ORDER BY created_at`,
    { workTreeId }
  );
  return normalizeRows(rows);
}

export async function getAgent(id: string): Promise<AgentRow | null> {
  const rows = await query<AgentRow>(`SELECT * FROM agents WHERE id = :id`, { id });
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function getAgentByWorkTreeAndType(
  workTreeId: string,
  type: string
): Promise<AgentRow | null> {
  const rows = await query<AgentRow>(
    `SELECT * FROM agents WHERE work_tree_id = :workTreeId AND type = :type ORDER BY created_at LIMIT 1`,
    { workTreeId, type }
  );
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function updateAgent(id: string, updates: Partial<AgentRow>): Promise<void> {
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  Object.entries(updates).forEach(([key, value]) => {
    if (key === "id" || key === "created_at" || value === undefined) return;
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    fields.push(`${snakeKey} = :${key}`);
    params[key] = value;
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
  const input = JSON.stringify(data.input || {});
  const dependencies = JSON.stringify(data.dependencies || []);
  const agentId = data.agentId || null;
  const estimatedDurationMinutes = data.estimatedDurationMinutes ?? null;

  await execute(
    `INSERT INTO tasks (id, work_tree_id, agent_id, title, description, status, progress, priority,
      input, dependencies, estimated_duration_minutes, created_at, updated_at)
     VALUES (:id, :workTreeId, :agentId, :title, :description, 'queued', 0, :priority,
      :input, :dependencies, :estimatedDurationMinutes, :now, :now)`,
    {
      id,
      workTreeId: data.workTreeId,
      agentId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      input,
      dependencies,
      estimatedDurationMinutes,
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    agent_id: agentId,
    title: data.title,
    description: data.description,
    status: "queued",
    progress: 0,
    priority: data.priority,
    input,
    output: null,
    dependencies,
    estimated_duration_minutes: estimatedDurationMinutes,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getTasksByWorkTree(workTreeId: string): Promise<TaskRow[]> {
  const rows = await query<TaskRow>(
    `SELECT * FROM tasks WHERE work_tree_id = :workTreeId ORDER BY created_at`,
    { workTreeId }
  );
  return normalizeRows(rows);
}

export async function getTask(id: string): Promise<TaskRow | null> {
  const rows = await query<TaskRow>(`SELECT * FROM tasks WHERE id = :id`, { id });
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function updateTask(id: string, updates: Partial<TaskRow>): Promise<void> {
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  Object.entries(updates).forEach(([key, value]) => {
    if (key === "id" || key === "created_at" || value === undefined) return;
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    fields.push(`${snakeKey} = :${key}`);
    params[key] = value;
  });

  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");

  await execute(`UPDATE tasks SET ${fields.join(", ")} WHERE id = :id`, params);
}

export async function createAgentRun(data: {
  agentId: string;
  taskId: string;
  workTreeId: string;
  model: string;
}): Promise<AgentRunRow> {
  const id = generateId();
  const now = new Date();

  await execute(
    `INSERT INTO agent_runs (id, agent_id, task_id, work_tree_id, status, model,
      input_tokens, output_tokens, tools_used, result, error, verification_status,
      started_at, completed_at, created_at)
     VALUES (:id, :agentId, :taskId, :workTreeId, 'running', :model,
      0, 0, '[]', NULL, NULL, 'pending', :now, NULL, :now)`,
    {
      id,
      agentId: data.agentId,
      taskId: data.taskId,
      workTreeId: data.workTreeId,
      model: data.model,
      now,
    }
  );

  return {
    id,
    agent_id: data.agentId,
    task_id: data.taskId,
    work_tree_id: data.workTreeId,
    status: "running",
    model: data.model,
    input_tokens: 0,
    output_tokens: 0,
    tools_used: "[]",
    result: null,
    error: null,
    verification_status: "pending",
    started_at: now,
    completed_at: null,
    created_at: now,
  };
}

export async function completeAgentRun(data: {
  agentRunId: string;
  status: "completed" | "failed";
  inputTokens: number;
  outputTokens: number;
  result?: unknown;
  error?: string | null;
}): Promise<void> {
  await execute(
    `UPDATE agent_runs
        SET status = :status,
            input_tokens = :inputTokens,
            output_tokens = :outputTokens,
            result = :result,
            error = :error,
            completed_at = NOW()
      WHERE id = :agentRunId`,
    {
      status: data.status,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      result: data.result === undefined ? null : JSON.stringify(data.result),
      error: data.error ?? null,
      agentRunId: data.agentRunId,
    }
  );
}

export async function getAgentRunsByWorkTree(workTreeId: string): Promise<AgentRunRow[]> {
  const rows = await query<AgentRunRow>(
    `SELECT * FROM agent_runs WHERE work_tree_id = :workTreeId ORDER BY created_at`,
    { workTreeId }
  );
  return normalizeRows(rows);
}

export async function createArtifact(data: {
  workTreeId: string;
  taskId?: string;
  name: string;
  type: "document" | "spreadsheet" | "presentation" | "code" | "data";
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
  const metadata = JSON.stringify(data.metadata || {});
  const model = data.model || "";
  const sourcesCount = data.sourcesCount ?? 0;
  const toolsCount = data.toolsCount ?? 0;
  const agentsCount = data.agentsCount ?? 0;
  const createdBy = data.createdBy || null;
  const agentId = data.agentId || null;
  const taskId = data.taskId || null;

  await execute(
    `INSERT INTO artifacts (id, work_tree_id, task_id, name, type, version, s3_key, s3_bucket,
      created_by, agent_id, model, sources_count, tools_count, agents_count,
      verified, human_reviewed, approved, verification_status, metadata, created_at, updated_at)
     VALUES (:id, :workTreeId, :taskId, :name, :type, :version, :s3Key, :s3Bucket,
      :createdBy, :agentId, :model, :sourcesCount, :toolsCount, :agentsCount,
      FALSE, FALSE, FALSE, 'pending', :metadata, :now, :now)`,
    {
      id,
      workTreeId: data.workTreeId,
      taskId,
      name: data.name,
      type: data.type,
      version: data.version,
      s3Key: data.s3Key,
      s3Bucket: data.s3Bucket,
      createdBy,
      agentId,
      model,
      sourcesCount,
      toolsCount,
      agentsCount,
      metadata,
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    task_id: taskId,
    name: data.name,
    type: data.type,
    version: data.version,
    s3_key: data.s3Key,
    s3_bucket: data.s3Bucket,
    created_by: createdBy,
    agent_id: agentId,
    model,
    sources_count: sourcesCount,
    tools_count: toolsCount,
    agents_count: agentsCount,
    verified: false,
    human_reviewed: false,
    approved: false,
    verification_status: "pending",
    metadata,
    created_at: now,
    updated_at: now,
  };
}

export async function getArtifactsByWorkTree(workTreeId: string): Promise<ArtifactRow[]> {
  const rows = await query<ArtifactRow>(
    `SELECT * FROM artifacts WHERE work_tree_id = :workTreeId ORDER BY created_at DESC`,
    { workTreeId }
  );
  return normalizeRows(rows);
}

export async function getArtifactById(id: string): Promise<ArtifactRow | null> {
  const rows = await query<ArtifactRow>(`SELECT * FROM artifacts WHERE id = :id`, { id });
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function updateArtifactVerification(
  id: string,
  status: "pending" | "verified" | "failed"
): Promise<void> {
  await execute(
    `UPDATE artifacts
        SET verification_status = :status,
            verified = :verified,
            updated_at = NOW()
      WHERE id = :id`,
    { id, status, verified: status === "verified" }
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
  const recipients = JSON.stringify(data.recipients || {});
  const attachments = JSON.stringify(data.attachments || {});
  const taskId = data.taskId || null;
  const requestedBy = data.requestedBy || null;
  const external = data.external || false;
  const expiresAt = data.expiresAt || null;

  await execute(
    `INSERT INTO approvals (id, work_tree_id, task_id, title, description, risk_level,
      recipients, attachments, external, status, requested_by, requested_at, expires_at)
     VALUES (:id, :workTreeId, :taskId, :title, :description, :riskLevel,
      :recipients, :attachments, :external, 'pending', :requestedBy, :now, :expiresAt)`,
    {
      id,
      workTreeId: data.workTreeId,
      taskId,
      title: data.title,
      description: data.description,
      riskLevel: data.riskLevel,
      recipients,
      attachments,
      external,
      requestedBy,
      now,
      expiresAt,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    task_id: taskId,
    title: data.title,
    description: data.description,
    risk_level: data.riskLevel,
    recipients,
    attachments,
    external,
    status: "pending",
    requested_by: requestedBy,
    decided_by: null,
    decided_at: null,
    requested_at: now,
    expires_at: expiresAt,
  };
}

export async function getApprovalsByWorkTree(workTreeId: string): Promise<ApprovalRow[]> {
  const rows = await query<ApprovalRow>(
    `SELECT * FROM approvals WHERE work_tree_id = :workTreeId ORDER BY requested_at DESC`,
    { workTreeId }
  );
  return normalizeRows(rows);
}

export async function getApproval(id: string): Promise<ApprovalRow | null> {
  const rows = await query<ApprovalRow>(`SELECT * FROM approvals WHERE id = :id`, { id });
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function updateApproval(id: string, updates: Partial<ApprovalRow>): Promise<void> {
  const fields: string[] = [];
  const params: Record<string, any> = { id };

  Object.entries(updates).forEach(([key, value]) => {
    if (key === "id" || key === "requested_at" || value === undefined) return;
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    fields.push(`${snakeKey} = :${key}`);
    params[key] = value;
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
  const agentId = data.agentId || null;
  const taskId = data.taskId || null;
  const message = data.message || null;
  const metadata = JSON.stringify(data.metadata || {});

  await execute(
    `INSERT INTO activity_events (id, work_tree_id, agent_id, task_id, event_type, status, message, metadata, timestamp)
     VALUES (:id, :workTreeId, :agentId, :taskId, :eventType, :status, :message, :metadata, :now)`,
    {
      id,
      workTreeId: data.workTreeId,
      agentId,
      taskId,
      eventType: data.eventType,
      status: data.status,
      message,
      metadata,
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    agent_id: agentId,
    task_id: taskId,
    event_type: data.eventType,
    status: data.status,
    message,
    metadata,
    timestamp: now,
  };
}

export async function getActivityEventsByWorkTree(
  workTreeId: string,
  limit = 100
): Promise<ActivityEventRow[]> {
  const rows = await query<ActivityEventRow>(
    `SELECT * FROM activity_events WHERE work_tree_id = :workTreeId ORDER BY timestamp DESC LIMIT :limit`,
    { workTreeId, limit }
  );
  return normalizeRows(rows);
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
  const workTreeId = data.workTreeId || null;
  const source = data.source || null;
  const expiry = data.expiry || null;

  await execute(
    `INSERT INTO memories (id, work_tree_id, fact, source, confidence, permission, domain, expiry, created_at, last_used_at, updated_at)
     VALUES (:id, :workTreeId, :fact, :source, :confidence, :permission, :domain, :expiry, :now, NULL, :now)`,
    {
      id,
      workTreeId,
      fact: data.fact,
      source,
      confidence: data.confidence,
      permission: data.permission,
      domain: data.domain,
      expiry,
      now,
    }
  );

  return {
    id,
    work_tree_id: workTreeId,
    fact: data.fact,
    source,
    confidence: data.confidence,
    permission: data.permission,
    domain: data.domain,
    expiry,
    created_at: now,
    last_used_at: null,
    updated_at: now,
  };
}

export async function getMemoriesByWorkTree(workTreeId: string): Promise<MemoryRow[]> {
  const rows = await query<MemoryRow>(
    `SELECT * FROM memories WHERE work_tree_id = :workTreeId OR work_tree_id IS NULL ORDER BY created_at DESC`,
    { workTreeId }
  );
  return normalizeRows(rows);
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
  const summary = data.summary || null;
  const context = data.context || null;
  const tasks = JSON.stringify(data.tasks);
  const risks = JSON.stringify(data.risks || []);
  const approvalReason = data.approvalReason || null;

  await execute(
    `INSERT INTO work_tree_plans (id, work_tree_id, objective, summary, context, tasks, risks,
      requires_approval, approval_reason, estimated_total_duration_minutes, created_at, updated_at)
     VALUES (:id, :workTreeId, :objective, :summary, :context, :tasks, :risks,
      :requiresApproval, :approvalReason, :estimatedTotalDurationMinutes, :now, :now)`,
    {
      id,
      workTreeId: data.workTreeId,
      objective: data.objective,
      summary,
      context,
      tasks,
      risks,
      requiresApproval: data.requiresApproval,
      approvalReason,
      estimatedTotalDurationMinutes: data.estimatedTotalDurationMinutes,
      now,
    }
  );

  return {
    id,
    work_tree_id: data.workTreeId,
    objective: data.objective,
    summary,
    context,
    tasks,
    risks,
    requires_approval: data.requiresApproval,
    approval_reason: approvalReason,
    estimated_total_duration_minutes: data.estimatedTotalDurationMinutes,
    created_at: now,
    updated_at: now,
  };
}

export async function getWorkTreePlan(workTreeId: string): Promise<WorkTreePlanRow | null> {
  const rows = await query<WorkTreePlanRow>(
    `SELECT * FROM work_tree_plans WHERE work_tree_id = :workTreeId ORDER BY created_at DESC LIMIT 1`,
    { workTreeId }
  );
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export { getPool };
