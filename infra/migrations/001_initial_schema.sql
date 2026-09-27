-- AGENTIS GENESIS - Database Schema for MariaDB
-- Migration: 001_initial_schema.sql

CREATE DATABASE IF NOT EXISTS genesis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE genesis;

-- Work Trees table
CREATE TABLE IF NOT EXISTS work_trees (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    objective TEXT NOT NULL,
    context JSON,
    status ENUM('idle', 'queued', 'running', 'waiting', 'blocked', 'needs-approval', 'failed', 'completed', 'archived') DEFAULT 'idle',
    progress DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    version VARCHAR(50),
    status ENUM('idle', 'thinking', 'planning', 'executing', 'waiting', 'blocked', 'delegating', 'verifying', 'completed') DEFAULT 'idle',
    capabilities JSON,
    permissions JSON,
    current_goal TEXT,
    current_task VARCHAR(64),
    model VARCHAR(100),
    memory_scope VARCHAR(50),
    tools JSON,
    resource_usage JSON,
    progress DECIMAL(5,2) DEFAULT 0.00,
    avatar VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE SET NULL,
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('idle', 'queued', 'running', 'waiting', 'blocked', 'needs-approval', 'failed', 'completed', 'archived') DEFAULT 'idle',
    progress DECIMAL(5,2) DEFAULT 0.00,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    input JSON,
    output JSON,
    dependencies JSON,
    estimated_duration_minutes INT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority)
) ENGINE=InnoDB;

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64) NOT NULL,
    task_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    type ENUM('document', 'spreadsheet', 'presentation', 'code', 'data') NOT NULL,
    version VARCHAR(50),
    s3_key VARCHAR(512) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    created_by VARCHAR(64),
    agent_id VARCHAR(64),
    model VARCHAR(100),
    sources_count INT DEFAULT 0,
    tools_count INT DEFAULT 0,
    agents_count INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    human_reviewed BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT FALSE,
    verification_status ENUM('pending', 'verified', 'failed') DEFAULT 'pending',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_task_id (task_id),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB;

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64) NOT NULL,
    task_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    recipients JSON,
    attachments JSON,
    external BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    requested_by VARCHAR(64),
    decided_by VARCHAR(64),
    decided_at TIMESTAMP NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at)
) ENGINE=InnoDB;

-- Activity Events table
CREATE TABLE IF NOT EXISTS activity_events (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64),
    task_id VARCHAR(64),
    event_type VARCHAR(100) NOT NULL,
    status ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    message TEXT,
    metadata JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_event_type (event_type)
) ENGINE=InnoDB;

-- Memories table
CREATE TABLE IF NOT EXISTS memories (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64),
    fact TEXT NOT NULL,
    source VARCHAR(255),
    confidence ENUM('verified', 'supported', 'inferred', 'uncertain', 'unknown') DEFAULT 'unknown',
    permission ENUM('read', 'write', 'admin') DEFAULT 'read',
    domain ENUM('personal', 'project', 'organization') DEFAULT 'project',
    expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE SET NULL,
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_domain (domain),
    INDEX idx_confidence (confidence)
) ENGINE=InnoDB;

-- Knowledge Items table
CREATE TABLE IF NOT EXISTS knowledge_items (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    source_type VARCHAR(50),
    source_reference VARCHAR(512),
    tags JSON,
    embedding_id VARCHAR(64),
    created_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE SET NULL,
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB;

-- Agent Runs table
CREATE TABLE IF NOT EXISTS agent_runs (
    id VARCHAR(64) PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL,
    task_id VARCHAR(64),
    work_tree_id VARCHAR(64) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    model VARCHAR(100),
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    tools_used JSON,
    result JSON,
    error TEXT,
    verification_status ENUM('pending', 'verified', 'failed') DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE CASCADE,
    INDEX idx_agent_id (agent_id),
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Tool Runs table
CREATE TABLE IF NOT EXISTS tool_runs (
    id VARCHAR(64) PRIMARY KEY,
    agent_run_id VARCHAR(64) NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    input JSON,
    output JSON,
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    error TEXT,
    duration_ms INT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
    INDEX idx_agent_run_id (agent_run_id),
    INDEX idx_tool_name (tool_name)
) ENGINE=InnoDB;

-- Audit Events table
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64),
    actor_type ENUM('user', 'agent', 'system') NOT NULL,
    actor_id VARCHAR(64),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(64),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE SET NULL,
    INDEX idx_work_tree_id (work_tree_id),
    INDEX idx_actor_id (actor_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB;

-- Work Tree Plans table (for planner output)
CREATE TABLE IF NOT EXISTS work_tree_plans (
    id VARCHAR(64) PRIMARY KEY,
    work_tree_id VARCHAR(64) NOT NULL,
    objective TEXT NOT NULL,
    summary TEXT,
    context TEXT,
    tasks JSON NOT NULL,
    risks JSON,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_reason TEXT,
    estimated_total_duration_minutes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_tree_id) REFERENCES work_trees(id) ON DELETE CASCADE,
    INDEX idx_work_tree_id (work_tree_id)
) ENGINE=InnoDB;