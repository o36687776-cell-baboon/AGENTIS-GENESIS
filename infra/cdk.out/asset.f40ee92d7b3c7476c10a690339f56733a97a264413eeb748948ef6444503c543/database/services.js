"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.createWorkTree = createWorkTree;
exports.getWorkTree = getWorkTree;
exports.getWorkTrees = getWorkTrees;
exports.updateWorkTree = updateWorkTree;
exports.createAgent = createAgent;
exports.getAgentsByWorkTree = getAgentsByWorkTree;
exports.getAgent = getAgent;
exports.updateAgent = updateAgent;
exports.createTask = createTask;
exports.getTasksByWorkTree = getTasksByWorkTree;
exports.getTask = getTask;
exports.updateTask = updateTask;
exports.createArtifact = createArtifact;
exports.getArtifactsByWorkTree = getArtifactsByWorkTree;
exports.createApproval = createApproval;
exports.getApprovalsByWorkTree = getApprovalsByWorkTree;
exports.updateApproval = updateApproval;
exports.createActivityEvent = createActivityEvent;
exports.getActivityEventsByWorkTree = getActivityEventsByWorkTree;
exports.createMemory = createMemory;
exports.getMemoriesByWorkTree = getMemoriesByWorkTree;
exports.createWorkTreePlan = createWorkTreePlan;
exports.getWorkTreePlan = getWorkTreePlan;
const database_1 = require("../database");
const uuid_1 = require("uuid");
function generateId() {
    return (0, uuid_1.v4)().replace(/-/g, "");
}
async function createWorkTree(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO work_trees (id, name, objective, context, status, progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'idle', 0, ?, ?)`, { id, name: data.name, objective: data.objective, context: JSON.stringify(data.context || {}), now });
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
async function getWorkTree(id) {
    const rows = await (0, database_1.query)(`SELECT * FROM work_trees WHERE id = ?`, { id });
    return rows[0] || null;
}
async function getWorkTrees() {
    return (0, database_1.query)(`SELECT * FROM work_trees ORDER BY created_at DESC`);
}
async function updateWorkTree(id, updates) {
    const fields = [];
    const params = { id };
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
    if (fields.length === 0)
        return;
    fields.push("updated_at = NOW()");
    await (0, database_1.execute)(`UPDATE work_trees SET ${fields.join(", ")} WHERE id = :id`, params);
}
async function createAgent(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO agents (id, work_tree_id, name, type, version, status, capabilities, permissions,
      current_goal, current_task, model, memory_scope, tools, resource_usage, progress, avatar, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'idle', ?, ?, NULL, NULL, ?, ?, ?, '{"tokens":0,"sources":0,"tools":0}', 0, ?, ?, ?)`, {
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
    });
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
async function getAgentsByWorkTree(workTreeId) {
    return (0, database_1.query)(`SELECT * FROM agents WHERE work_tree_id = ? ORDER BY created_at`, { workTreeId });
}
async function getAgent(id) {
    const rows = await (0, database_1.query)(`SELECT * FROM agents WHERE id = ?`, { id });
    return rows[0] || null;
}
async function updateAgent(id, updates) {
    const fields = [];
    const params = { id };
    Object.entries(updates).forEach(([key, value]) => {
        if (key !== "id" && key !== "created_at" && value !== undefined) {
            const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
            fields.push(`${snakeKey} = :${key}`);
            params[key] = value;
        }
    });
    if (fields.length === 0)
        return;
    fields.push("updated_at = NOW()");
    await (0, database_1.execute)(`UPDATE agents SET ${fields.join(", ")} WHERE id = :id`, params);
}
async function createTask(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO tasks (id, work_tree_id, agent_id, title, description, status, progress, priority,
      input, dependencies, estimated_duration_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?, ?, ?, ?)`, {
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
    });
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
async function getTasksByWorkTree(workTreeId) {
    return (0, database_1.query)(`SELECT * FROM tasks WHERE work_tree_id = ? ORDER BY created_at`, { workTreeId });
}
async function getTask(id) {
    const rows = await (0, database_1.query)(`SELECT * FROM tasks WHERE id = ?`, { id });
    return rows[0] || null;
}
async function updateTask(id, updates) {
    const fields = [];
    const params = { id };
    Object.entries(updates).forEach(([key, value]) => {
        if (key !== "id" && key !== "created_at" && value !== undefined) {
            const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
            fields.push(`${snakeKey} = :${key}`);
            params[key] = value;
        }
    });
    if (fields.length === 0)
        return;
    fields.push("updated_at = NOW()");
    await (0, database_1.execute)(`UPDATE tasks SET ${fields.join(", ")} WHERE id = :id`, params);
}
async function createArtifact(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO artifacts (id, work_tree_id, task_id, name, type, version, s3_key, s3_bucket,
      created_by, agent_id, model, sources_count, tools_count, agents_count,
      verified, human_reviewed, approved, verification_status, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, FALSE, 'pending', ?, ?, ?)`, {
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
    });
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
async function getArtifactsByWorkTree(workTreeId) {
    return (0, database_1.query)(`SELECT * FROM artifacts WHERE work_tree_id = ? ORDER BY created_at DESC`, { workTreeId });
}
async function createApproval(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO approvals (id, work_tree_id, task_id, title, description, risk_level,
      recipients, attachments, external, status, requested_by, requested_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`, {
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
    });
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
async function getApprovalsByWorkTree(workTreeId) {
    return (0, database_1.query)(`SELECT * FROM approvals WHERE work_tree_id = ? ORDER BY requested_at DESC`, { workTreeId });
}
async function updateApproval(id, updates) {
    const fields = [];
    const params = { id };
    Object.entries(updates).forEach(([key, value]) => {
        if (key !== "id" && key !== "requested_at" && value !== undefined) {
            const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
            fields.push(`${snakeKey} = :${key}`);
            params[key] = value;
        }
    });
    if (fields.length === 0)
        return;
    await (0, database_1.execute)(`UPDATE approvals SET ${fields.join(", ")} WHERE id = :id`, params);
}
async function createActivityEvent(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO activity_events (id, work_tree_id, agent_id, task_id, event_type, status, message, metadata, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, {
        id,
        workTreeId: data.workTreeId,
        agentId: data.agentId || null,
        taskId: data.taskId || null,
        eventType: data.eventType,
        status: data.status,
        message: data.message || null,
        metadata: JSON.stringify(data.metadata || {}),
        now,
    });
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
async function getActivityEventsByWorkTree(workTreeId, limit = 100) {
    return (0, database_1.query)(`SELECT * FROM activity_events WHERE work_tree_id = ? ORDER BY timestamp DESC LIMIT ?`, { workTreeId, limit });
}
async function createMemory(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO memories (id, work_tree_id, fact, source, confidence, permission, domain, expiry, created_at, last_used_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`, {
        id,
        workTreeId: data.workTreeId || null,
        fact: data.fact,
        source: data.source || null,
        confidence: data.confidence,
        permission: data.permission,
        domain: data.domain,
        expiry: data.expiry || null,
        now,
    });
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
async function getMemoriesByWorkTree(workTreeId) {
    return (0, database_1.query)(`SELECT * FROM memories WHERE work_tree_id = ? OR work_tree_id IS NULL ORDER BY created_at DESC`, { workTreeId });
}
async function createWorkTreePlan(data) {
    const id = generateId();
    const now = new Date();
    await (0, database_1.execute)(`INSERT INTO work_tree_plans (id, work_tree_id, objective, summary, context, tasks, risks,
      requires_approval, approval_reason, estimated_total_duration_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, {
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
    });
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
async function getWorkTreePlan(workTreeId) {
    const rows = await (0, database_1.query)(`SELECT * FROM work_tree_plans WHERE work_tree_id = ? ORDER BY created_at DESC LIMIT 1`, { workTreeId });
    return rows[0] || null;
}
