import { getPool } from "../database";
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
export declare function generateId(): string;
export declare function normalizeRow<T extends object>(row: T): T;
export declare function createWorkTree(data: {
    name: string;
    objective: string;
    context?: object;
}): Promise<WorkTreeRow>;
export declare function getWorkTree(id: string): Promise<WorkTreeRow | null>;
export declare function getWorkTrees(): Promise<WorkTreeRow[]>;
export declare function getWorkTreeByIdempotencyKey(key: string): Promise<WorkTreeRow | null>;
export declare function updateWorkTree(id: string, updates: Partial<WorkTreeRow>): Promise<void>;
export declare function attachExecution(data: {
    workTreeId: string;
    executionArn: string;
    correlationId: string;
    idempotencyKey: string | null;
}): Promise<void>;
export declare function createAgent(data: {
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
}): Promise<AgentRow>;
export declare function getAgentsByWorkTree(workTreeId: string): Promise<AgentRow[]>;
export declare function getAgent(id: string): Promise<AgentRow | null>;
export declare function getAgentByWorkTreeAndType(workTreeId: string, type: string): Promise<AgentRow | null>;
export declare function updateAgent(id: string, updates: Partial<AgentRow>): Promise<void>;
export declare function createTask(data: {
    workTreeId: string;
    agentId?: string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    dependencies?: string[];
    estimatedDurationMinutes?: number;
    input?: object;
}): Promise<TaskRow>;
export declare function getTasksByWorkTree(workTreeId: string): Promise<TaskRow[]>;
export declare function getTask(id: string): Promise<TaskRow | null>;
export declare function updateTask(id: string, updates: Partial<TaskRow>): Promise<void>;
export declare function createAgentRun(data: {
    agentId: string;
    taskId: string;
    workTreeId: string;
    model: string;
}): Promise<AgentRunRow>;
export declare function completeAgentRun(data: {
    agentRunId: string;
    status: "completed" | "failed";
    inputTokens: number;
    outputTokens: number;
    result?: unknown;
    error?: string | null;
}): Promise<void>;
export declare function getAgentRunsByWorkTree(workTreeId: string): Promise<AgentRunRow[]>;
export declare function createArtifact(data: {
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
}): Promise<ArtifactRow>;
export declare function getArtifactsByWorkTree(workTreeId: string): Promise<ArtifactRow[]>;
export declare function getArtifactById(id: string): Promise<ArtifactRow | null>;
export declare function updateArtifactVerification(id: string, status: "pending" | "verified" | "failed"): Promise<void>;
export declare function createApproval(data: {
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
}): Promise<ApprovalRow>;
export declare function getApprovalsByWorkTree(workTreeId: string): Promise<ApprovalRow[]>;
export declare function getApproval(id: string): Promise<ApprovalRow | null>;
export declare function updateApproval(id: string, updates: Partial<ApprovalRow>): Promise<void>;
export declare function createActivityEvent(data: {
    workTreeId: string;
    agentId?: string;
    taskId?: string;
    eventType: string;
    status: "info" | "success" | "warning" | "error";
    message?: string;
    metadata?: object;
}): Promise<ActivityEventRow>;
export declare function getActivityEventsByWorkTree(workTreeId: string, limit?: number): Promise<ActivityEventRow[]>;
export declare function createMemory(data: {
    workTreeId?: string;
    fact: string;
    source?: string;
    confidence: "verified" | "supported" | "inferred" | "uncertain" | "unknown";
    permission: "read" | "write" | "admin";
    domain: "personal" | "project" | "organization";
    expiry?: Date;
}): Promise<MemoryRow>;
export declare function getMemoriesByWorkTree(workTreeId: string): Promise<MemoryRow[]>;
export declare function createWorkTreePlan(data: {
    workTreeId: string;
    objective: string;
    summary?: string;
    context?: string;
    tasks: object[];
    risks?: object[];
    requiresApproval: boolean;
    approvalReason?: string;
    estimatedTotalDurationMinutes: number;
}): Promise<WorkTreePlanRow>;
export declare function getWorkTreePlan(workTreeId: string): Promise<WorkTreePlanRow | null>;
export { getPool };
