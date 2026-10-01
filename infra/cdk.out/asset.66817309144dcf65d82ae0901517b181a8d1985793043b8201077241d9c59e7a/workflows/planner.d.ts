import * as ai from "../ai";
interface PlannerEvent {
    action: string;
    workTree?: {
        id?: string;
        objective?: string;
        context?: unknown;
    };
    objective?: string;
    correlationId?: string;
}
export declare function handler(event: PlannerEvent): Promise<{
    tasks: ai.PlanTask[];
    correlationId: string | undefined;
    taskCount: number;
    objective: string;
    summary: string;
    context: string;
    risks: ai.PlanRisk[];
    requiresApproval: boolean;
    approvalReason?: string;
    estimatedTotalDurationMinutes: number;
}>;
export {};
