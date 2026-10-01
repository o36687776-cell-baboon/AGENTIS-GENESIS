import { SFNClient } from "@aws-sdk/client-sfn";
export declare function getSfnClient(): SFNClient;
export interface ExecutionStart {
    workTreeId: string;
    objective: string;
    correlationId: string;
    idempotencyKey: string | null;
}
/**
 * Only identifiers and short control fields are placed into the execution
 * input. Task text, model output and artifact content stay in MariaDB and S3
 * and are read by the workers from there, so the Step Functions payload stays
 * well inside the 256 KB state limit.
 */
export interface ExecutionInput {
    workTreeId: string;
    objective: string;
    correlationId: string;
    requestedBy: string;
    startedAt: string;
}
export declare function buildExecutionInput(start: ExecutionStart, requestedBy: string): ExecutionInput;
export interface StartedExecution {
    executionArn: string;
    executionName: string;
    startDate: string;
    correlationId: string;
}
export declare function startExecution(start: ExecutionStart, requestedBy: string): Promise<StartedExecution>;
export type ExecutionStatus = "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "ABORTED" | "UNKNOWN";
export interface ExecutionState {
    status: ExecutionStatus;
    errorName?: string;
    errorCause?: string;
    stoppedAt?: string;
}
export declare function describeExecution(executionArn: string): Promise<ExecutionState>;
export declare function stopExecution(executionArn: string, cause: string): Promise<void>;
export declare class ExecutionUnavailableError extends Error {
    constructor(message: string);
}
