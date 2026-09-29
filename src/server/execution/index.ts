import { SFNClient, StartExecutionCommand, DescribeExecutionCommand, StopExecutionCommand } from "@aws-sdk/client-sfn";
import { getConfig } from "../config";
import { generateId } from "../database/services";

let sfnClient: SFNClient | null = null;

export function getSfnClient(): SFNClient {
  if (sfnClient) return sfnClient;
  const config = getConfig();
  sfnClient = new SFNClient({ region: config.awsRegion });
  return sfnClient;
}

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

export function buildExecutionInput(start: ExecutionStart, requestedBy: string): ExecutionInput {
  return {
    workTreeId: start.workTreeId,
    objective: start.objective.slice(0, 4000),
    correlationId: start.correlationId,
    requestedBy: requestedBy || "anonymous",
    startedAt: new Date().toISOString(),
  };
}

export interface StartedExecution {
  executionArn: string;
  executionName: string;
  startDate: string;
  correlationId: string;
}

export async function startExecution(start: ExecutionStart, requestedBy: string): Promise<StartedExecution> {
  const config = getConfig();

  if (!config.stateMachineArn) {
    throw new ExecutionUnavailableError("STATE_MACHINE_ARN is not configured");
  }

  const executionName = `wt-${start.workTreeId.slice(0, 16)}-${generateId().slice(0, 12)}`;

  const client = getSfnClient();
  const command = new StartExecutionCommand({
    stateMachineArn: config.stateMachineArn,
    name: executionName,
    input: JSON.stringify(buildExecutionInput(start, requestedBy)),
  });

  const response = await client.send(command);

  return {
    executionArn: response.executionArn || "",
    executionName: response.executionArn ? executionName : executionName,
    startDate: response.startDate ? response.startDate.toISOString() : new Date().toISOString(),
    correlationId: start.correlationId,
  };
}

export type ExecutionStatus =
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED_OUT"
  | "ABORTED"
  | "UNKNOWN";

export interface ExecutionState {
  status: ExecutionStatus;
  errorName?: string;
  errorCause?: string;
  stoppedAt?: string;
}

export async function describeExecution(executionArn: string): Promise<ExecutionState> {
  const client = getSfnClient();
  const response = await client.send(
    new DescribeExecutionCommand({ executionArn })
  );

  const map: Record<string, ExecutionStatus> = {
    RUNNING: "RUNNING",
    SUCCEEDED: "SUCCEEDED",
    FAILED: "FAILED",
    TIMED_OUT: "TIMED_OUT",
    ABORTED: "ABORTED",
  };

  // The SDK renamed the error fields to Error/Cause; accept both shapes so the
  // module keeps working across client versions.
  const error = response.error as
    | { name?: string; cause?: string; Error?: string; Cause?: string }
    | undefined;

  return {
    status: map[response.status || ""] || "UNKNOWN",
    errorName: error?.name || error?.Error,
    errorCause: error?.cause || error?.Cause,
    stoppedAt: response.stopDate ? response.stopDate.toISOString() : undefined,
  };
}

export async function stopExecution(executionArn: string, cause: string): Promise<void> {
  const client = getSfnClient();
  await client.send(
    new StopExecutionCommand({ executionArn, error: "ExecutionStopped", cause: cause.slice(0, 256) })
  );
}

export class ExecutionUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionUnavailableError";
  }
}
