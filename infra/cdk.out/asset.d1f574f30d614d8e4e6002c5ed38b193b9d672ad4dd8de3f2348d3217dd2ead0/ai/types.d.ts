export interface PlanTask {
    id: string;
    title: string;
    description: string;
    agentType: "research" | "analysis" | "builder" | "verification";
    status: "queued" | "running" | "completed" | "failed" | "waiting";
    priority: "low" | "medium" | "high" | "critical";
    dependencies: string[];
    estimatedDurationMinutes?: number;
}
export interface PlanRisk {
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    mitigation?: string;
}
export interface ExecutionPlan {
    objective: string;
    summary: string;
    context: string;
    tasks: PlanTask[];
    risks: PlanRisk[];
    requiresApproval: boolean;
    approvalReason?: string;
    estimatedTotalDurationMinutes: number;
}
export interface PlannerInput {
    objective: string;
    context?: string;
    existingWorkTreeId?: string;
    userPreferences?: Record<string, any>;
}
//# sourceMappingURL=types.d.ts.map