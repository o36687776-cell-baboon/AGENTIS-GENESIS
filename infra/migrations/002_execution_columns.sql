-- AGENTIS GENESIS - Database Schema for MariaDB
-- Migration: 002_execution_columns.sql
-- Adds the execution linkage, correlation tracking and idempotency key that
-- the API needs in order to start and track a Step Functions execution.

USE genesis;

-- Track the Step Functions execution bound to a work tree.
ALTER TABLE work_trees
    ADD COLUMN IF NOT EXISTS execution_arn VARCHAR(512) NULL AFTER progress,
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64) NULL AFTER execution_arn,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) NULL AFTER correlation_id;

-- Multiple NULLs are permitted in a MariaDB UNIQUE index, so work trees that
-- were never started with an idempotency key do not collide.
ALTER TABLE work_trees
    ADD UNIQUE INDEX IF NOT EXISTS uq_work_trees_idempotency_key (idempotency_key);

ALTER TABLE work_trees
    ADD INDEX IF NOT EXISTS idx_correlation_id (correlation_id);

-- Agent runs record the model that produced a result and the token cost.
ALTER TABLE agent_runs
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64) NULL AFTER work_tree_id;

ALTER TABLE agent_runs
    ADD INDEX IF NOT EXISTS idx_correlation_id (correlation_id);
