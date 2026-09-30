interface VerificationEvent {
    action: string;
    workTreeId?: string;
    correlationId?: string;
    results?: {
        workTreeId?: string;
        total?: number;
        completed?: number;
        failed?: number;
        progress?: number;
    };
}
interface Check {
    name: string;
    passed: boolean;
    detail: string;
}
/**
 * Verification reads the persisted state of the work tree rather than trusting
 * an upstream flag. A run only passes when every task actually completed, every
 * task produced a non-empty stored result, and at least one artifact exists.
 * Anything short of that is a failure, never an approval.
 */
export declare function handler(event: VerificationEvent): Promise<{
    approved: boolean;
    requiresApproval: boolean;
    checks: Check[];
    approvalId: string | undefined;
    approvalDeadline: string | undefined;
    summary: {
        total: number;
        completed: number;
        failed: number;
        artifacts: number;
        runs: number;
        model: string;
    };
}>;
export {};
