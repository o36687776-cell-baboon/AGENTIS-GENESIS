"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY = void 0;
exports.classifyFailure = classifyFailure;
exports.withRetry = withRetry;
/**
 * Bedrock throttling surfaces under several different error names depending on
 * the model and the SDK version, so classification matches on markers rather
 * than a single identifier.
 */
const THROTTLE_MARKERS = [
    "ThrottlingException",
    "TooManyRequestsException",
    "ServiceQuotaExceededException",
    "ModelTimeoutException",
    "ModelNotReadyException",
    "ModelStreamErrorException",
    "RequestLimitExceeded",
    "SlowDown",
    "ProvisionedThroughputExceededException",
];
const FATAL_MARKERS = [
    "AccessDeniedException",
    "ValidationException",
    "ResourceNotFoundException",
    "UnrecognizedClientException",
    "ModelErrorException",
    "InternalServerException",
    "IllegalArgumentException",
];
function classifyFailure(error) {
    const err = error;
    const name = err?.name || "UnknownError";
    const message = err?.message || String(error);
    const status = err?.$metadata?.httpStatusCode;
    if (name === "ExecutionUnavailableError" || name === "ValidationError") {
        return { class: "fatal", retryable: false, message, name };
    }
    if (name === "CredentialsProviderError" || name === "AccessDenied") {
        return { class: "credential", retryable: false, message, name };
    }
    if (THROTTLE_MARKERS.includes(name) || (status === 429 && status !== undefined)) {
        return {
            class: "throttled",
            retryable: true,
            retryAfterSeconds: err?.retryAfter,
            message,
            name,
        };
    }
    if (FATAL_MARKERS.includes(name)) {
        return { class: "fatal", retryable: false, message, name };
    }
    if (status !== undefined && status >= 500) {
        return { class: "retryable", retryable: true, message, name };
    }
    if (status !== undefined && status >= 400 && status < 500) {
        return { class: "fatal", retryable: false, message, name };
    }
    return { class: "retryable", retryable: true, message, name };
}
exports.DEFAULT_RETRY = {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 10000,
};
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Bounded exponential backoff with full jitter, applied only to failures the
 * classifier marked as retryable. Fatal and credential failures surface on the
 * first attempt so the workflow fails fast instead of burning attempts.
 */
async function withRetry(operation, options = exports.DEFAULT_RETRY) {
    let lastError;
    for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
        try {
            return await operation(attempt);
        }
        catch (error) {
            lastError = error;
            const classified = classifyFailure(error);
            if (!classified.retryable || attempt === options.maxAttempts) {
                throw error;
            }
            const backoff = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
            const jitter = classified.retryAfterSeconds !== undefined
                ? classified.retryAfterSeconds * 1000
                : Math.random() * backoff;
            await delay(jitter);
        }
    }
    throw lastError;
}
