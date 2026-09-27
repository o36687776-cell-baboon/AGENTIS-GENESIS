import { Pool, PoolConnection, ResultSetHeader } from "mysql2/promise";
export interface DatabaseCredentials {
    username: string;
    password: string;
    host?: string;
    port?: number;
}
export declare function getDatabaseCredentials(): Promise<DatabaseCredentials>;
export declare function getPool(): Promise<Pool>;
export declare function query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]>;
export declare function execute(sql: string, params?: Record<string, any>): Promise<ResultSetHeader>;
export declare function transaction<T>(callback: (conn: PoolConnection) => Promise<T>): Promise<T>;
export declare function closePool(): Promise<void>;
export declare function healthCheck(): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map