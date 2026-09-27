import { createPool, Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getConfig } from "../config";

let pool: Pool | null = null;

export interface DatabaseCredentials {
  username: string;
  password: string;
  host?: string;
  port?: number;
}

export async function getDatabaseCredentials(): Promise<DatabaseCredentials> {
  const config = getConfig();

  if (config.mockAi || config.nodeEnv === "development") {
    return {
      username: "genesis_admin",
      password: "dev_password",
      host: "localhost",
      port: 3306,
    };
  }

  if (!config.databaseSecretArn) {
    throw new Error("DATABASE_SECRET_ARN not configured");
  }

  const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
  const client = new SecretsManagerClient({ region: config.awsRegion });
  const command = new GetSecretValueCommand({ SecretId: config.databaseSecretArn });
  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error("Database secret is empty");
  }

  const secret = JSON.parse(response.SecretString);
  return {
    username: secret.username,
    password: secret.password,
    host: config.databaseProxyEndpoint,
    port: config.databasePort,
  };
}

export async function getPool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const credentials = await getDatabaseCredentials();

  pool = createPool({
    host: credentials.host,
    port: credentials.port,
    user: credentials.username,
    password: credentials.password,
    database: getConfig().databaseName,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: { rejectUnauthorized: false },
    namedPlaceholders: true,
  });

  return pool;
}

export async function query<T extends RowDataPacket[]>(sql: string, params?: Record<string, any>): Promise<T> {
  const pool = await getPool();
  const [rows] = await pool.execute<T>(sql, params);
  return rows;
}

export async function execute(sql: string, params?: Record<string, any>): Promise<ResultSetHeader> {
  const pool = await getPool();
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

export async function transaction<T>(callback: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const pool = await getPool();
    await pool.execute("SELECT 1");
    return true;
  } catch {
    return false;
  }
}