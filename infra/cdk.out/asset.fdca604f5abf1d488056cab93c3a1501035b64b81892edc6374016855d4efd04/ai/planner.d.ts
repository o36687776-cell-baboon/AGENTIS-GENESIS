import { ExecutionPlan, PlannerInput } from "./types";
/**
 * The single list of agent types the planner may emit. The worker's agent
 * profile registry must stay in step with this: an agent type added here but
 * absent there would silently fall back to the research agent.
 */
export declare const KNOWN_AGENT_TYPES: readonly ["research", "analysis", "builder", "verification", "rockefeller", "atlas"];
export declare function generatePlan(input: PlannerInput): Promise<ExecutionPlan>;
