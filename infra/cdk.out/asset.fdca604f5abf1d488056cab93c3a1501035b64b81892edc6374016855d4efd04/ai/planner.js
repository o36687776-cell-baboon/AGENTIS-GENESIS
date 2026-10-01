"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWN_AGENT_TYPES = void 0;
exports.generatePlan = generatePlan;
const bedrock_1 = require("./bedrock");
/**
 * The single list of agent types the planner may emit. The worker's agent
 * profile registry must stay in step with this: an agent type added here but
 * absent there would silently fall back to the research agent.
 */
exports.KNOWN_AGENT_TYPES = [
    "research",
    "analysis",
    "builder",
    "verification",
    "rockefeller",
    "atlas",
];
const PLANNER_SYSTEM_PROMPT = `You are the Genesis Planner, an AI system that decomposes high-level objectives into structured execution plans for a multi-agent operating environment.

Your output MUST be valid JSON matching the ExecutionPlan schema exactly. Do not include any explanatory text outside the JSON.

Available agent types:
- research: Information gathering, web search, document analysis, data mining
- analysis: Statistical analysis, anomaly detection, forecasting, modeling
- builder: Code generation, document creation, artifact production, synthesis
- verification: Quality assurance, validation, testing, compliance checking
- rockefeller: Marketing and market intelligence specialist. Use for market
  discovery, search-intent and content-opportunity discovery, competitor and
  SEO intelligence, geographic market context, campaign briefs, and market
  monitoring. Rockefeller works from evidence and must never present an
  inference as an observation, or state a metric it did not actually collect.
- atlas: Geospatial intelligence and Earth observation specialist. Use for
  land-cover and vegetation analysis, surface water, elevation and terrain,
  temporal change detection, spatial statistics, and spatial operations such as
  routing and area accessibility. Every figure atlas reports must carry its
  dataset, time window, extent, resolution and method. Never state a
  measurement, coordinate or statistic it did not actually retrieve, and never
  convert unavailable data into zero.

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
function generateUserPrompt(input) {
    return `Objective: ${input.objective}

${input.context ? `Context: ${input.context}` : ""}
${input.existingWorkTreeId ? `Existing Work Tree: ${input.existingWorkTreeId}` : ""}

Generate a complete execution plan as JSON.`;
}
function parsePlanResponse(response) {
    try {
        const cleaned = response.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
        const plan = JSON.parse(cleaned);
        return validatePlan(plan);
    }
    catch (error) {
        throw new Error(`Failed to parse planner response: ${error}`);
    }
}
function validatePlan(plan) {
    if (!plan.objective || !plan.summary || !plan.tasks || !Array.isArray(plan.tasks)) {
        throw new Error("Invalid plan: missing required fields");
    }
    const validTasks = plan.tasks.map((t, i) => ({
        id: t.id || `task-${i + 1}`,
        title: t.title || `Task ${i + 1}`,
        description: t.description || "",
        agentType: exports.KNOWN_AGENT_TYPES.includes(t.agentType) ? t.agentType : "research",
        status: "queued",
        priority: ["low", "medium", "high", "critical"].includes(t.priority) ? t.priority : "medium",
        dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
        estimatedDurationMinutes: typeof t.estimatedDurationMinutes === "number" ? t.estimatedDurationMinutes : 30,
    }));
    const validRisks = Array.isArray(plan.risks)
        ? plan.risks.map((r, i) => ({
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
async function generatePlan(input) {
    const config = await Promise.resolve().then(() => __importStar(require("../config"))).then((m) => m.getConfig());
    if (config.mockAi) {
        return generateMockPlan(input);
    }
    const response = await (0, bedrock_1.converse)({
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
function generateMockPlan(input) {
    const tasks = [
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
