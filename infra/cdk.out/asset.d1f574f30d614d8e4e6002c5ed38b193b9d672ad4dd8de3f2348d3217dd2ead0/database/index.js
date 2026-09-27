"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseCredentials = getDatabaseCredentials;
exports.getPool = getPool;
exports.query = query;
exports.execute = execute;
exports.transaction = transaction;
exports.closePool = closePool;
exports.healthCheck = healthCheck;
const promise_1 = require("mysql2/promise");
const config_1 = require("../config");
let pool = null;
async function getDatabaseCredentials() {
    const config = (0, config_1.getConfig)();
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
    const { SecretsManagerClient, GetSecretValueCommand } = await Promise.resolve().then(() => __importStar(require("@aws-sdk/client-secrets-manager")));
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
async function getPool() {
    if (pool) {
        return pool;
    }
    const credentials = await getDatabaseCredentials();
    pool = (0, promise_1.createPool)({
        host: credentials.host,
        port: credentials.port,
        user: credentials.username,
        password: credentials.password,
        database: (0, config_1.getConfig)().databaseName,
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
async function query(sql, params) {
    const pool = await getPool();
    const [rows] = await pool.execute(sql, params);
    return rows;
}
async function execute(sql, params) {
    const pool = await getPool();
    const [result] = await pool.execute(sql, params);
    return result;
}
async function transaction(callback) {
    const pool = await getPool();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await callback(conn);
        await conn.commit();
        return result;
    }
    catch (error) {
        await conn.rollback();
        throw error;
    }
    finally {
        conn.release();
    }
}
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
async function healthCheck() {
    try {
        const pool = await getPool();
        await pool.execute("SELECT 1");
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=index.js.map