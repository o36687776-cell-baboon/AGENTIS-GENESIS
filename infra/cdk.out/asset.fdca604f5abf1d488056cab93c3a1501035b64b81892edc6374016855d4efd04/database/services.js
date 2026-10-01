"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = void 0;
exports.generateId = generateId;
exports.normalizeRow = normalizeRow;
exports.createWorkTree = createWorkTree;
exports.getWorkTree = getWorkTree;
exports.getWorkTrees = getWorkTrees;
exports.getWorkTreeByIdempotencyKey = getWorkTreeByIdempotencyKey;
exports.updateWorkTree = updateWorkTree;
exports.attachExecution = attachExecution;
exports.createAgent = createAgent;
exports.getAgentsByWorkTree = getAgentsByWorkTree;
exports.getAgent = getAgent;
exports.getAgentByWorkTreeAndType = getAgentByWorkTreeAndType;
exports.updateAgent = updateAgent;
exports.createTask = createTask;
exports.getTasksByWorkTree = getTasksByWorkTree;
exports.getTask = getTask;
exports.updateTask = updateTask;
exports.createAgentRun = createAgentRun;
exports.completeAgentRun = completeAgentRun;
exports.getAgentRunsByWorkTree = getAgentRunsByWorkTree;
exports.createArtifact = createArtifact;
exports.getArtifactsByWorkTree = getArtifactsByWorkTree;
exports.getArtifactById = getArtifactById;
exports.updateArtifactVerification = updateArtifactVerification;
exports.createApproval = createApproval;
exports.getApprovalsByWorkTree = getApprovalsByWorkTree;
exports.getApproval = getApproval;
exports.updateApproval = updateApproval;
exports.createActivityEvent = createActivityEvent;
exports.getActivityEventsByWorkTree = getActivityEventsByWorkTree;
exports.createMemory = createMemory;
exports.getMemoriesByWorkTree = getMemoriesByWorkTree;
exports.createWorkTreePlan = createWorkTreePlan;
exports.getWorkTreePlan = getWorkTreePlan;
const database_1 = require("../database");
Object.defineProperty(exports, "getPool", { enumerable: true, get: function () { return database_1.getPool; } });
const uuid_1 = require("uuid");
function generateId() {
    return (0, uuid_1.v4)().replace(/-/g, "");
}
function toNumber(value) {
    if (value === null || value === undefined)
        return 0;
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
}
function normalizeRow(row) {
    if (!row)
        return row;
    const result = { ...row };
    if ("progress" in result)
        result.progress = toNumber(result.progress);
    if ("sources_count" in result)
        result.sources_count = toNumber(result.sources_count);
    if ("tools_count" in result)
        result.tools_count = toNumber(result.tools_count);
    if ("agents_count" in result)
        result.agents_count = toNumber(result.agents_count);
    if ("input_tokens" in result)
        result.input_tokens = toNumber(result.input_tokens);
    if ("output_tokens" in result)
        result.output_tokens = toNumber(result.output_tokens);
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
    return result;
}
function normalizeRows(rows) {
    return (rows || []).map((row) => normalizeRow(row));
}
async function createWorkTree(data) {
    const id = generateId();
    const now = new Date();
    const contextJson = JSON.stringify(data.context || {});
    await (0, database_1.execute)(`INSERT INTO work_trees (id, name, objective, context, status, progress, created_at, updated_at)
     VALUES (:id, :name, :objective, :context, 'idle', 0, :now, :now)`, { id, name: data.name, objective: data.objective, context: contextJson, now });
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
async function getWorkTree(id) {
    const rows = await (0, database_1.query)(`SELECT * FROM work_trees WHERE id = :id`, { id });
    return rows[0] ? normalizeRow(rows[0]) : null;
}
async function getWorkTrees() {
    const rows = await (0, database_1.query)(`SELECT * FROM work_trees ORDER BY created_at DESC`);
    return normalizeRows(rows);
}
async function getWorkTreeByIdempotencyKey(key) {
    const rows = await (0, database_1.query)(`SELECT * FROM work_trees WHERE idempotency_key = :key LIMIT 1`, { key });
    return rows[0] ? normalizeRow(rows[0]) : null;
}
async function updateWorkTree(id, updates) {
    const fields = [];
    const params = { id };
    Object.entries(updates).forEach(([key, value]) => {
        if (key === "id" || key === "created_at" || value === undefined)
            return;
        fields.push(`${key} = :${key}`);
        params[key] = value;
    });
    if (fields.length === 0)
        return;
    fields.push("updated_at = NOW()");
    await (0, database_1.execute)(`UPDATE work_trees SET ${fields.join(", ")} WHERE id = :id`, params);
}
async function attachExecution(data) {
    await (0, database_1.execute)(`UPDATE work_trees
        SET execution_arn = :executionArn,
            correlation_id = :correlationId,
            idempotency_key = COALESCE(:idempotencyKey, idempotency_key),
            updated_at = NOW()
      WHERE id = :workTreeId`, {
        executionArn: data.executionArn,
        correlationId: data.correlationId,
        idempotencyKey: data.idempotencyKey,
        workTreeId: data.workTreeId,
    });
}
async function createAgent(data) {
    const id = generateId();
    const now = new Date();
    const capabilities = JSON.stringify(data.capabilities);
    const permissions = JSON.stringify(data.permissions);
    const tools = JSON.stringify(data.tools);
    const resourceUsage = JSON.stringify({ tokens: 0, sources: 0, tools: 0 });
    const avatar = data.avatar || null;
    await (0, database_1.execute)(`INSERT INTO agents (id, work_tree_id, name, type, version, status, capabilities, permissions,
      current_goal, current_task, model, memory_scope, tools, resource_usage, progress, avatar, created_at, updated_at)
     VALUES (:id, :workTreeId, :name, :type, :version, 'idle', :capabilities, :permissions,
      NULL, NULL, :model, :memoryScope, :tools, :resourceUsage, 0, :avatar, :now, :now)`, {
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
    });
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
async function getAgentsByWorkTree(workTreeId) {
    const rows = await (0, database_1.query)(`SELECT * FROM agents WHERE work_tree_id = :workTreeId ORDER BY created_at`, { workTreeId });
    return normalizeRows(rows);
}
async function getAgent(id) {
    const rows = await (0, database_1.query)(`SELECT * FROM agents WHERE id = :id`, { id });
    return rows[0] ? normalizeRow(rows[0]) : null;
}
async function getAgentByWorkTreeAndType(workTreeId, type) {
    const rows = await (0, database_1.query)(`SELECT * FROM agents WHERE work_tree_id = :workTreeId AND type = :type ORDER BY created_at LIMIT 1`, { workTreeId, type });
    return rows[0] ? normalizeRow(rows[0]) : null;
}
async function updateAgent(id, updates) {
    const fields = [];
    const params = { id };
    Object.entries(updates).forEach(([key, value]) => {
        if (key === "id" || key === "created_at" || value === undefined)
            return;
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = :${key}`);
        params[key] = value;
    });
    if (fields.length === 0)
        return;
    fields.push("updated_at = NOW()");
    await (0, database_1.execute)(`UPDATE agents SET ${fields.join(", ")} WHERE id = :id`, params);
}
async function createTask(data) {
    const id = generateId();
    const now = new Date();
    const input = JSON.stringify(data.input || {});
    const dependencies = JSON.stringify(data.dependencies || []);
    const agentId = data.agentId || null;
    const estimatedDurationMinutes = data.estimatedDurationMinutes ?? null;
    await (0, database_1.execute)(`INSERT INTO tasks (id, work_tree_id, agent_id, title, description, status, progress, priority,
      input, dependencies, estimated_duration_minutes, created_at, updated_at)
     VALUES (:id, :workTreeId, :agentId, :title, :description, 'queued', 0, :priority,
      :input, :dependencies, :estimatedDurationMinutes, :now, :now)`, {
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
    });
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
async function getTasksByWorkTree(workTreeId) {
    const rows = await (0, database_1.query)(`SELECT * FROM tasks WHERE work_tree_id = :workTreeId ORDER BY created_at`, { workTreeId });
    return normalizeRows(rows);
}
async function getTask(id) {
    const rows = await (0, database_1.query)(`SELECT * FROM tasks WHERE id = :id`, { id });
    return rows[0] ? normalizeRow(rows[0]) : null;
}
async function updateTask(id, updates) {
    const fields = [];
    const params = { id };
    Object.entries(updates).forEach(([key, value]) => {
        if (key === "id" || key === "created_at" || value === undefined)
            return;
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = :${key}`);
        params[key] = value;
    });
    if (fields.length === 0)
        return;
    fields.push("updated_at = NOW()");
    await (0, database_1.execute)(`UPDATE tasks SET ${fields.join(", ")} WHERE id = :id`, params);
}
async function createAgentRun(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO agent_runs (id, agent_id, task_id, work_tree_id, status, model,
      input_tokens, output_tokens, tools_used, result, error, verification_status,
      started_at, completed_at, created_at)
     VALUES (:id, :agentId, :taskId, :workTreeId, 'running', :model,
      0, 0, '[]', NULL, NULL, 'pending', :now, NULL, :now)`, {
        id,
        agentId: data.agentId,
        taskId: data.taskId,
        workTreeId: data.workTreeId,
        model: data.model,
        now,
    });
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
async function completeAgentRun(data) {
    await (0, database_1.execute)(`UPDATE agent_runs
        SET status = :status,
            input_tokens = :inputTokens,
            output_tokens = :outputTokens,
            result = :result,
            error = :error,
            completed_at = NOW()
      WHERE id = :agentRunId`, {
        status: data.status,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        result: data.result === undefined ? null : JSON.stringify(data.result),
        error: data.error ?? null,
        agentRunId: data.agentRunId,
    });
}
async function getAgentRunsByWorkTree(workTreeId) {
    const rows = await (0, database_1.query)(`SELECT * FROM agent_runs WHERE work_tree_id = :workTreeId ORDER BY created_at`, { workTreeId });
    return normalizeRows(rows);
}
async function createArtifact(data) {
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
    await (0, database_1.execute)(`INSERT INTO artifacts (id, work_tree_id, task_id, name, type, version, s3_key, s3_bucket,
      created_by, agent_id, model, sources_count, tools_count, agents_count,
      verified, human_reviewed, approved, verification_status, metadata, created_at, updated_at)
     VALUES (:id, :workTreeId, :taskId, :name, :type, :version, :s3Key, :s3Bucket,
      :createdBy, :agentId, :model, :sourcesCount, :toolsCount, :agentsCount,
      FALSE, FALSE, FALSE, 'pending', :metadata, :now, :now)`, {
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
    });
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
async function getArtifactsByWorkTree(workTreeId) {
    const rows = await (0, database_1.query)(`SELECT * FROM artifacts WHERE work_tree_id = :workTreeId ORDER BY created_at DESC`, { workTreeId });
    return normalizeRows(rows);
}
async function getArtifactById(id) {
    const rows = await (0, database_1.query)(`SELECT * FROM artifacts WHERE id = :id`, { id });
    return rows[0] ? normalizeRow(rows[0]) : null;
}
async function updateArtifactVerification(id, status) {
    await (0, database_1.execute)(`UPDATE artifacts
        SET verification_status = :status,
            verified = :verified,
            updated_at = NOW()
      WHERE id = :id`, { id, status, verified: status === "verified" });
}
async function createApproval(data) {
    const id = generateId();
    const now = new Date();
    const recipients = JSON.stringify(data.recipients || {});
    const attachments = JSON.stringify(data.attachments || {});
    const taskId = data.taskId || null;
    const requestedBy = data.requestedBy || null;
    const external = data.external || false;
    const expiresAt = data.expiresAt || null;
    await (0, database_1.execute)(`INSERT INTO approvals (id, work_tree_id, task_id, title, description, risk_level,
      recipients, attachments, external, status, requested_by, requested_at, expires_at)
     VALUES (:id, :workTreeId, :taskId, :title, :description, :riskLevel,
      :recipients, :attachments, :external, 'pending', :requestedBy, :now, :expiresAt)`, {
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
    });
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
async function getApprovalsByWorkTree(workTreeId) {
    const rows = await (0, database_1.query)(`SELECT * FROM approvals WHERE work_tree_id = :workTreeId ORDER BY requested_at DESC`, { workTreeId });
    return normalizeRows(rows);
}
async function getApproval(id) {
    const rows = await (0, database_1.query)(`SELECT * FROM approvals WHERE id = :id`, { id });
    return rows[0] ? normalizeRow(rows[0]) : null;
}
async function updateApproval(id, updates) {
    const fields = [];
    const params = { id };
    Object.entries(updates).forEach(([key, value]) => {
        if (key === "id" || key === "requested_at" || value === undefined)
            return;
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = :${key}`);
        params[key] = value;
    });
    if (fields.length === 0)
        return;
    await (0, database_1.execute)(`UPDATE approvals SET ${fields.join(", ")} WHERE id = :id`, params);
}
async function createActivityEvent(data) {
    const id = generateId();
    const now = new Date();
    const agentId = data.agentId || null;
    const taskId = data.taskId || null;
    const message = data.message || null;
    const metadata = JSON.stringify(data.metadata || {});
    await (0, database_1.execute)(`INSERT INTO activity_events (id, work_tree_id, agent_id, task_id, event_type, status, message, metadata, timestamp)
     VALUES (:id, :workTreeId, :agentId, :taskId, :eventType, :status, :message, :metadata, :now)`, {
        id,
        workTreeId: data.workTreeId,
        agentId,
        taskId,
        eventType: data.eventType,
        status: data.status,
        message,
        metadata,
        now,
    });
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
async function getActivityEventsByWorkTree(workTreeId, limit = 100) {
    const rows = await (0, database_1.query)(`SELECT * FROM activity_events WHERE work_tree_id = :workTreeId ORDER BY timestamp DESC LIMIT :limit`, { workTreeId, limit });
    return normalizeRows(rows);
}
async function createMemory(data) {
    const id = generateId();
    const now = new Date();
    const workTreeId = data.workTreeId || null;
    const source = data.source || null;
    const expiry = data.expiry || null;
    await (0, database_1.execute)(`INSERT INTO memories (id, work_tree_id, fact, source, confidence, permission, domain, expiry, created_at, last_used_at, updated_at)
     VALUES (:id, :workTreeId, :fact, :source, :confidence, :permission, :domain, :expiry, :now, NULL, :now)`, {
        id,
        workTreeId,
        fact: data.fact,
        source,
        confidence: data.confidence,
        permission: data.permission,
        domain: data.domain,
        expiry,
        now,
    });
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
async function getMemoriesByWorkTree(workTreeId) {
    const rows = await (0, database_1.query)(`SELECT * FROM memories WHERE work_tree_id = :workTreeId OR work_tree_id IS NULL ORDER BY created_at DESC`, { workTreeId });
    return normalizeRows(rows);
}
async function createWorkTreePlan(data) {
    const id = generateId();
    const now = new Date();
    const summary = data.summary || null;
    const context = data.context || null;
    const tasks = JSON.stringify(data.tasks);
    const risks = JSON.stringify(data.risks || []);
    const approvalReason = data.approvalReason || null;
    await (0, database_1.execute)(`INSERT INTO work_tree_plans (id, work_tree_id, objective, summary, context, tasks, risks,
      requires_approval, approval_reason, estimated_total_duration_minutes, created_at, updated_at)
     VALUES (:id, :workTreeId, :objective, :summary, :context, :tasks, :risks,
      :requiresApproval, :approvalReason, :estimatedTotalDurationMinutes, :now, :now)`, {
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
    });
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
async function getWorkTreePlan(workTreeId) {
    const rows = await (0, database_1.query)(`SELECT * FROM work_tree_plans WHERE work_tree_id = :workTreeId ORDER BY created_at DESC LIMIT 1`, { workTreeId });
    return rows[0] ? normalizeRow(rows[0]) : null;
}
