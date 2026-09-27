import { api, isApiError } from "@/lib/api";
import { WorkTree, Agent, Task, Artifact, ActivityEvent, SystemStatus } from "@/types";
import { mockSystemStatus, allWorkTrees, generateActivityFeed } from "@/data/mockData";

const USE_REAL_API = typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL !== "/api";

function mapWorkTree(wt: any): WorkTree {
  return {
    id: wt.id,
    name: wt.name,
    objective: wt.objective,
    status: wt.status as WorkTree["status"],
    progress: wt.progress,
    createdAt: wt.created_at || wt.createdAt,
    agents: wt.agents || [],
    tasks: wt.tasks || [],
    artifacts: wt.artifacts || [],
    risks: wt.risks || 0,
    approvals: wt.approvals || [],
    activity: wt.activity || [],
    context: wt.context || {
      project: wt.name,
      application: "Strategy Workspace",
      documents: 0,
      activeAgents: 0,
      recentDecisions: 0,
      relevantMemory: 0,
    },
  };
}

function mapAgent(a: any): Agent {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    version: a.version,
    status: a.status as Agent["status"],
    capabilities: typeof a.capabilities === "string" ? JSON.parse(a.capabilities) : a.capabilities || [],
    permissions: typeof a.permissions === "string" ? JSON.parse(a.permissions) : a.permissions || [],
    currentGoal: a.current_goal,
    currentTask: a.current_task,
    model: a.model,
    memoryScope: a.memory_scope,
    tools: typeof a.tools === "string" ? JSON.parse(a.tools) : a.tools || [],
    resourceUsage: typeof a.resource_usage === "string" ? JSON.parse(a.resource_usage) : a.resource_usage || { tokens: 0, sources: 0, tools: 0 },
    progress: a.progress,
    avatar: a.avatar,
  };
}

function mapTask(t: any): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description || "",
    status: t.status as Task["status"],
    agent: t.agent_id,
    progress: t.progress,
    priority: t.priority as Task["priority"],
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    estimated: t.estimated_duration_minutes ? `${t.estimated_duration_minutes} min` : undefined,
    dependencies: typeof t.dependencies === "string" ? JSON.parse(t.dependencies) : t.dependencies || [],
  };
}

function mapArtifact(a: any): Artifact {
  return {
    id: a.id,
    name: a.name,
    type: a.type as Artifact["type"],
    version: a.version,
    createdAt: a.created_at,
    createdBy: a.created_by || "",
    agent: a.agent_id || "",
    model: a.model,
    sources: a.sources_count,
    tools: a.tools_count,
    agents: a.agents_count,
    verified: a.verified,
    humanReviewed: a.human_reviewed,
    approved: a.approved,
  };
}

function mapActivity(a: any): ActivityEvent {
  return {
    id: a.id,
    timestamp: new Date(a.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    agent: a.agent_id || "System",
    action: a.event_type.toLowerCase().replace(/_/g, " "),
    detail: a.message,
    type: a.status as ActivityEvent["type"],
  };
}

export class RealApi {
  static async getSystemStatus(): Promise<SystemStatus> {
    if (!USE_REAL_API) {
      return mockSystemStatus;
    }
    try {
      const health = await api.health.check();
      return {
        agents: 0,
        tasks: 0,
        running: 0,
        queued: 0,
        errors: health.services.database === "ok" ? 0 : 1,
        apiHealth: health.services.api === "ok" ? 99.9 : 0,
        memory: health.services.database === "ok" ? "healthy" : "degraded",
        security: "protected",
      };
    } catch {
      return mockSystemStatus;
    }
  }

  static async getWorkTrees(): Promise<WorkTree[]> {
    if (!USE_REAL_API) {
      return allWorkTrees;
    }
    try {
      const workTrees = await api.workTrees.list();
      return workTrees.map(mapWorkTree);
    } catch (error) {
      console.error("Failed to load work trees:", error);
      return allWorkTrees;
    }
  }

  static async getWorkTree(id: string): Promise<WorkTree | null> {
    if (!USE_REAL_API) {
      return allWorkTrees.find((w) => w.id === id) ?? null;
    }
    try {
      const workTree = await api.workTrees.get(id);
      return mapWorkTree(workTree);
    } catch (error) {
      if (isApiError(error) && error.statusCode === 404) {
        return null;
      }
      console.error("Failed to load work tree:", error);
      return null;
    }
  }

  static async createWorkTree(data: { name: string; objective: string; context?: Record<string, any> }): Promise<WorkTree | null> {
    if (!USE_REAL_API) {
      return null;
    }
    try {
      const workTree = await api.workTrees.create(data);
      return mapWorkTree(workTree);
    } catch (error) {
      console.error("Failed to create work tree:", error);
      return null;
    }
  }

  static async planWorkTree(id: string, objective?: string) {
    if (!USE_REAL_API) {
      return null;
    }
    try {
      return await api.workTrees.plan(id, objective);
    } catch (error) {
      console.error("Failed to plan work tree:", error);
      return null;
    }
  }

  static async runWorkTree(id: string) {
    if (!USE_REAL_API) {
      return { workTreeId: id, status: "running" };
    }
    try {
      return await api.workTrees.run(id);
    } catch (error) {
      console.error("Failed to run work tree:", error);
      return null;
    }
  }

  static async pauseWorkTree(id: string) {
    if (!USE_REAL_API) {
      return { workTreeId: id, status: "waiting" };
    }
    try {
      return await api.workTrees.pause(id);
    } catch (error) {
      console.error("Failed to pause work tree:", error);
      return null;
    }
  }

  static async resumeWorkTree(id: string) {
    if (!USE_REAL_API) {
      return { workTreeId: id, status: "running" };
    }
    try {
      return await api.workTrees.resume(id);
    } catch (error) {
      console.error("Failed to resume work tree:", error);
      return null;
    }
  }

  static async getRecentActivity() {
    if (!USE_REAL_API) {
      return generateActivityFeed().slice(0, 6);
    }
    try {
      const workTrees = await api.workTrees.list();
      if (workTrees.length > 0) {
        const activity = await api.workTrees.activity(workTrees[0].id);
        return activity.slice(0, 6);
      }
      return [];
    } catch {
      return generateActivityFeed().slice(0, 6);
    }
  }

  static async getPendingApprovals() {
    if (!USE_REAL_API) {
      return mockSystemStatus.errors;
    }
    try {
      const workTrees = await api.workTrees.list();
      let allApprovals: any[] = [];
      for (const wt of workTrees) {
        const tree = await api.workTrees.get(wt.id);
        allApprovals = [...allApprovals, ...(tree.approvals || [])];
      }
      return allApprovals.filter((a) => a.status === "pending").length;
    } catch {
      return mockSystemStatus.errors;
    }
  }

  static async aiChat(message: string) {
    if (!USE_REAL_API) {
      return `Mock response to: ${message}`;
    }
    try {
      const response = await api.ai.chat(message);
      return response.response;
    } catch (error) {
      console.error("AI chat failed:", error);
      return "AI service unavailable";
    }
  }
}

export { USE_REAL_API };