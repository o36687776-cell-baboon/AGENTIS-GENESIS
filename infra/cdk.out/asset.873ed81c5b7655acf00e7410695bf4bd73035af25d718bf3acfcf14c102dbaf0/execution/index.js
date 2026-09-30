"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionUnavailableError = void 0;
exports.getSfnClient = getSfnClient;
exports.buildExecutionInput = buildExecutionInput;
exports.startExecution = startExecution;
exports.describeExecution = describeExecution;
exports.stopExecution = stopExecution;
const client_sfn_1 = require("@aws-sdk/client-sfn");
const config_1 = require("../config");
const services_1 = require("../database/services");
let sfnClient = null;
function getSfnClient() {
    if (sfnClient)
        return sfnClient;
    const config = (0, config_1.getConfig)();
    sfnClient = new client_sfn_1.SFNClient({ region: config.awsRegion });
    return sfnClient;
}
function buildExecutionInput(start, requestedBy) {
    return {
        workTreeId: start.workTreeId,
        objective: start.objective.slice(0, 4000),
        correlationId: start.correlationId,
        requestedBy: requestedBy || "anonymous",
        startedAt: new Date().toISOString(),
    };
}
async function startExecution(start, requestedBy) {
    const config = (0, config_1.getConfig)();
    if (!config.stateMachineArn) {
        throw new ExecutionUnavailableError("STATE_MACHINE_ARN is not configured");
    }
    const executionName = `wt-${start.workTreeId.slice(0, 16)}-${(0, services_1.generateId)().slice(0, 12)}`;
    const client = getSfnClient();
    const command = new client_sfn_1.StartExecutionCommand({
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
async function describeExecution(executionArn) {
    const client = getSfnClient();
    const response = await client.send(new client_sfn_1.DescribeExecutionCommand({ executionArn }));
    const map = {
        RUNNING: "RUNNING",
        SUCCEEDED: "SUCCEEDED",
        FAILED: "FAILED",
        TIMED_OUT: "TIMED_OUT",
        ABORTED: "ABORTED",
    };
    // The SDK renamed the error fields to Error/Cause; accept both shapes so the
    // module keeps working across client versions.
    const error = response.error;
    return {
        status: map[response.status || ""] || "UNKNOWN",
        errorName: error?.name || error?.Error,
        errorCause: error?.cause || error?.Cause,
        stoppedAt: response.stopDate ? response.stopDate.toISOString() : undefined,
    };
}
async function stopExecution(executionArn, cause) {
    const client = getSfnClient();
    await client.send(new client_sfn_1.StopExecutionCommand({ executionArn, error: "ExecutionStopped", cause: cause.slice(0, 256) }));
}
class ExecutionUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = "ExecutionUnavailableError";
    }
}
exports.ExecutionUnavailableError = ExecutionUnavailableError;
