import { converse } from "./bedrock";
import { ExecutionPlan, PlannerInput, PlanTask, PlanRisk } from "./types";

const PLANNER_SYSTEM_PROMPT = `You are the Genesis Planner, an AI system that decomposes high-level objectives into structured execution plans for a multi-agent operating environment.

Your output MUST be valid JSON matching the ExecutionPlan schema exactly. Do not include any explanatory text outside the JSON.

Available agent types:
- research: Information gathering, web search, document analysis, data mining
- analysis: Statistical analysis, anomaly detection, forecasting, modeling
- builder: Code generation, document creation, artifact production, synthesis
- verification: Quality assurance, validation, testing, compliance checking

Task priorities: low, medium, high, critical
Risk severities: low, medium, high, critical

Rules:
1. Break the objective into 3-10 discrete tasks
2. Assign appropriate agent types based on task nature
3. Identify dependencies between tasks
4. Estimate duration in minutes for each task
5. Identify 0-3 risks with mitigations
6. Determine if approval is required (consequential actions: external communications, data deletion, financial commitments, security changes)
7. Return ONLY the JSON object`;

function generateUserPrompt(input: PlannerInput): string {
  return `Objective: ${input.objective}

${input.context ? `Context: ${input.context}` : ""}
${input.existingWorkTreeId ? `Existing Work Tree: ${input.existingWorkTreeId}` : ""}

Generate a complete execution plan as JSON.`;
}

function parsePlanResponse(response: string): ExecutionPlan {
  try {
    const cleaned = response.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const plan = JSON.parse(cleaned) as ExecutionPlan;
    return validatePlan(plan);
  } catch (error) {
    throw new Error(`Failed to parse planner response: ${error}`);
  }
}

function validatePlan(plan: any): ExecutionPlan {
  if (!plan.objective || !plan.summary || !plan.tasks || !Array.isArray(plan.tasks)) {
    throw new Error("Invalid plan: missing required fields");
  }

  const validTasks: PlanTask[] = plan.tasks.map((t: any, i: number) => ({
    id: t.id || `task-${i + 1}`,
    title: t.title || `Task ${i + 1}`,
    description: t.description || "",
    agentType: ["research", "analysis", "builder", "verification"].includes(t.agentType) ? t.agentType : "research",
    status: "queued",
    priority: ["low", "medium", "high", "critical"].includes(t.priority) ? t.priority : "medium",
    dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
    estimatedDurationMinutes: typeof t.estimatedDurationMinutes === "number" ? t.estimatedDurationMinutes : 30,
  }));

  const validRisks: PlanRisk[] = Array.isArray(plan.risks)
    ? plan.risks.map((r: any, i: number) => ({
        id: r.id || `risk-${i + 1}`,
        title: r.title || `Risk ${i + 1}`,
        description: r.description || "",
        severity: ["low", "medium", "high", "critical"].includes(r.severity) ? r.severity : "medium",
        mitigation: r.mitigation,
      }))
    : [];

  return {
    objective: plan.objective,
    summary: plan.summary,
    context: plan.context || "",
    tasks: validTasks,
    risks: validRisks,
    requiresApproval: Boolean(plan.requiresApproval),
    approvalReason: plan.approvalReason,
    estimatedTotalDurationMinutes: validTasks.reduce((sum, t) => sum + (t.estimatedDurationMinutes || 30), 0),
  };
}

export async function generatePlan(input: PlannerInput): Promise<ExecutionPlan> {
  const config = await import("../config").then((m) => m.getConfig());

  if (config.mockAi) {
    return generateMockPlan(input);
  }

  const response = await converse({
    messages: [
      { role: "user", content: [{ text: generateUserPrompt(input) }] },
    ],
    system: [{ text: PLANNER_SYSTEM_PROMPT }],
    inferenceConfig: {
      maxTokens: 4096,
      temperature: 0.2,
      topP: 0.9,
    },
  });

  const responseText = response.output.message.content[0]?.text || "";
  return parsePlanResponse(responseText);
}

function generateMockPlan(input: PlannerInput): ExecutionPlan {
  const tasks: PlanTask[] = [
    {
      id: "task-1",
      title: "Research market landscape",
      description: "Gather market data, competitor analysis, and industry trends",
      agentType: "research",
      status: "queued",
      priority: "high",
      dependencies: [],
      estimatedDurationMinutes: 45,
    },
    {
      id: "task-2",
      title: "Analyze collected data",
      description: "Perform statistical analysis on market data to identify patterns",
      agentType: "analysis",
      status: "queued",
      priority: "high",
      dependencies: ["task-1"],
      estimatedDurationMinutes: 60,
    },
    {
      id: "task-3",
      title: "Build strategy document",
      description: "Synthesize findings into a comprehensive strategy report",
      agentType: "builder",
      status: "queued",
      priority: "high",
      dependencies: ["task-2"],
      estimatedDurationMinutes: 30,
    },
    {
      id: "task-4",
      title: "Verify strategy quality",
      description: "Validate the strategy document for completeness and accuracy",
      agentType: "verification",
      status: "queued",
      priority: "medium",
      dependencies: ["task-3"],
      estimatedDurationMinutes: 15,
    },
  ];

  return {
    objective: input.objective,
    summary: `Multi-phase execution plan for: ${input.objective}`,
    context: input.context || "",
    tasks,
    risks: [
      {
        id: "risk-1",
        title: "Data availability risk",
        description: "Required market data may not be accessible",
        severity: "medium",
        mitigation: "Use alternative data sources and cached datasets",
      },
    ],
    requiresApproval: false,
    estimatedTotalDurationMinutes: 150,
  };
}