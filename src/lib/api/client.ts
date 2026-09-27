import type {
  WorkTree,
  Agent,
  Task,
  Artifact,
  Approval,
  ActivityEvent,
  HealthResponse,
  AiChatResponse,
  WorkTreePlan,
  ApiError,
} from "./types";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
  }
  return process.env.API_BASE_URL || "http://localhost:3000/api";
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error: ApiError = new Error(data.error?.message || "Request failed") as ApiError;
    error.code = data.error?.code || "UNKNOWN_ERROR";
    error.requestId = data.error?.requestId || "";
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

export const api = {
  health: {
    check: () => request<HealthResponse>("/health"),
  },

  workTrees: {
    list: () => request<{ success: boolean; data: WorkTree[] }>("/work-trees").then((r) => r.data),
    get: (id: string) => request<{ success: boolean; data: WorkTree }>(`/work-trees/${id}`).then((r) => r.data),
    create: (data: { name: string; objective: string; context?: Record<string, any> }) =>
      request<{ success: boolean; data: WorkTree }>("/work-trees", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    plan: (id: string, objective?: string) =>
      request<{ success: boolean; data: WorkTreePlan }>(`/work-trees/${id}/plan`, {
        method: "POST",
        body: JSON.stringify({ objective }),
      }).then((r) => r.data),
    run: (id: string) =>
      request<{ success: boolean; data: { workTreeId: string; status: string } }>(`/work-trees/${id}/run`, {
        method: "POST",
      }).then((r) => r.data),
    pause: (id: string) =>
      request<{ success: boolean; data: { workTreeId: string; status: string } }>(`/work-trees/${id}/pause`, {
        method: "POST",
      }).then((r) => r.data),
    resume: (id: string) =>
      request<{ success: boolean; data: { workTreeId: string; status: string } }>(`/work-trees/${id}/resume`, {
        method: "POST",
      }).then((r) => r.data),
    activity: (id: string) =>
      request<{ success: boolean; data: ActivityEvent[] }>(`/work-trees/${id}/activity`).then((r) => r.data),
  },

  agents: {
    list: () => request<{ success: boolean; data: Agent[] }>("/agents").then((r) => r.data),
    get: (id: string) => request<{ success: boolean; data: Agent }>(`/agents/${id}`).then((r) => r.data),
  },

  tasks: {
    list: () => request<{ success: boolean; data: Task[] }>("/tasks").then((r) => r.data),
  },

  approvals: {
    approve: (id: string) =>
      request<{ success: boolean; data: { id: string; status: string } }>(`/approvals/${id}/approve`, {
        method: "POST",
      }).then((r) => r.data),
    reject: (id: string) =>
      request<{ success: boolean; data: { id: string; status: string } }>(`/approvals/${id}/reject`, {
        method: "POST",
      }).then((r) => r.data),
  },

  ai: {
    chat: (message: string) =>
      request<{ success: boolean; data: AiChatResponse }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      }).then((r) => r.data),
  },
};

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && "code" in error && "requestId" in error && "statusCode" in error;
}