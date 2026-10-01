export type FailureClass = "retryable" | "fatal" | "throttled" | "credential";
export interface ClassifiedFailure {
    class: FailureClass;
    retryable: boolean;
    retryAfterSeconds?: number;
    message: string;
    name: string;
}
export declare function classifyFailure(error: unknown): ClassifiedFailure;
export interface RetryOptions {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
}
export declare const DEFAULT_RETRY: RetryOptions;
/**
 * Bounded exponential backoff with full jitter, applied only to failures the
 * classifier marked as retryable. Fatal and credential failures surface on the
 * first attempt so the workflow fails fast instead of burning attempts.
 */
export declare function withRetry<T>(operation: (attempt: number) => Promise<T>, options?: RetryOptions): Promise<T>;
