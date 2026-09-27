#!/usr/bin/env node
/**
 * Database Migration Runner for AGENTIS GENESIS
 * Runs SQL migrations against the MariaDB database
 */

import { createPool } from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  filename: string;
  sql: string;
}

async function getMigrations(migrationsDir: string): Promise<Migration[]> {
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.map((filename) => ({
    filename,
    sql: fs.readFileSync(path.join(migrationsDir, filename), "utf-8"),
  }));
}

async function ensureMigrationTable(pool: any): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

async function getAppliedMigrations(pool: any): Promise<string[]> {
  const [rows] = await pool.execute("SELECT filename FROM schema_migrations ORDER BY applied_at");
  return rows.map((r: any) => r.filename);
}

async function runMigration(pool: any, migration: Migration): Promise<void> {
  const statements = migration.sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    await pool.execute(statement);
  }

  await pool.execute("INSERT INTO schema_migrations (id, filename) VALUES (?, ?)", [
    migration.filename,
    migration.filename,
  ]);
}

async function main(): Promise<void> {
  const migrationsDir = path.join(__dirname, "../infra/migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const host = process.env.DATABASE_HOST || "localhost";
  const port = parseInt(process.env.DATABASE_PORT || "3306", 10);
  const user = process.env.DATABASE_USER || "genesis_admin";
  const password = process.env.DATABASE_PASSWORD || "dev_password";
  const database = process.env.DATABASE_NAME || "genesis";

  const pool = createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log("Connecting to database...");
    await ensureMigrationTable(pool);

    const applied = await getAppliedMigrations(pool);
    console.log(`Already applied migrations: ${applied.length}`);

    const migrations = await getMigrations(migrationsDir);
    console.log(`Found ${migrations.length} migration files`);

    for (const migration of migrations) {
      if (applied.includes(migration.filename)) {
        console.log(`Skipping ${migration.filename} (already applied)`);
        continue;
      }

      console.log(`Applying ${migration.filename}...`);
      await runMigration(pool, migration);
      console.log(`Applied ${migration.filename}`);
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();