/**
 * Display labels for agent types.
 *
 * The stored value is the routing slug the planner emits and the worker
 * dispatches on. The interface shows the specialist's identity instead, which
 * keeps ROCKERFELLER reading as MARKETING INTELLIGENCE rather than exposing an
 * internal identifier.
 */
const AGENT_TYPE_LABELS: Record<string, string> = {
  research: "Research",
  analysis: "Analysis",
  builder: "Builder",
  verification: "Verification",
  rockefeller: "Marketing Intelligence",
  atlas: "Geospatial Intelligence",
};

export function agentTypeLabel(type: string): string {
  return AGENT_TYPE_LABELS[type] ?? type;
}