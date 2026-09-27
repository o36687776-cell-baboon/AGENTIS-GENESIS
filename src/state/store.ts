"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Agent, Task, WorkTree, WorkTreeNode, SystemStatus } from "@/types";
import { mockAgents, mockTasks, allWorkTrees, generateActivityFeed, mockSystemStatus } from "@/data/mockData";
import { RealApi, USE_REAL_API } from "@/services/realApi";

export type ActiveSection =
  | "dashboard"
  | "worktrees"
  | "agents"
  | "tasks"
  | "artifacts"
  | "automations"
  | "memory"
  | "knowledge"
  | "system"
  | "settings";

export interface UIState {
  sidebarCollapsed: boolean;
  activeSection: ActiveSection;
  selectedWorkTreeId: string | null;
  commandCenterOpen: boolean;
  commandInput: string;
  statusMenuOpen: boolean;
  mobileMenuOpen: boolean;
  reducedMotion: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveSection: (section: ActiveSection) => void;
  setSelectedWorkTree: (id: string | null) => void;
  toggleCommandCenter: () => void;
  setCommandCenterOpen: (open: boolean) => void;
  setCommandInput: (value: string) => void;
  toggleStatusMenu: () => void;
  toggleMobileMenu: () => void;
}

export interface AppDataState {
  workTrees: Record<string, WorkTree>;
  agents: Record<string, Agent>;
  tasks: Record<string, Task>;
  systemStatus: SystemStatus;
  workTreeNodes: Record<string, WorkTreeNode>;
  workTreeList: WorkTree[];
  agentList: Agent[];
  taskList: Task[];
  workTreeNodeList: WorkTreeNode[];
  isLoading: boolean;
  error: string | null;
  useRealApi: boolean;

  getWorkTree: (id: string) => WorkTree | undefined;
  loadWorkTrees: () => Promise<void>;
  loadSystemStatus: () => Promise<void>;
  loadWorkTree: (id: string) => Promise<WorkTree | null>;
  updateAgentStatus: (id: string, status: Agent["status"]) => void;
  updateTaskStatus: (id: string, status: Task["status"]) => void;
  toggleNodeCollapse: (id: string) => void;
  createWorkTree: (data: { name: string; objective: string; context?: Record<string, any> }) => Promise<WorkTree | null>;
  planWorkTree: (id: string, objective?: string) => Promise<any>;
  runWorkTree: (id: string) => Promise<any>;
  pauseWorkTree: (id: string) => Promise<any>;
  resumeWorkTree: (id: string) => Promise<any>;
  aiChat: (message: string) => Promise<string>;
}

export type AppStore = UIState & AppDataState;

function mapWorkTreeToStore(wt: WorkTree): WorkTree {
  return wt;
}

export const useStore = create<AppStore>()(
  devtools((set, get) => ({
    sidebarCollapsed: false,
    activeSection: "dashboard",
    selectedWorkTreeId: null,
    commandCenterOpen: false,
    commandInput: "",
    statusMenuOpen: false,
    mobileMenuOpen: false,
    reducedMotion: false,

    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    setActiveSection: (section) => set({ activeSection: section, mobileMenuOpen: false }),
    setSelectedWorkTree: (id) => set({ selectedWorkTreeId: id }),
    toggleCommandCenter: () => set((s) => ({ commandCenterOpen: !s.commandCenterOpen })),
    setCommandCenterOpen: (open) => set({ commandCenterOpen: open, commandInput: "" }),
    setCommandInput: (value) => set({ commandInput: value }),
    toggleStatusMenu: () => set((s) => ({ statusMenuOpen: !s.statusMenuOpen })),
    toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

    workTrees: {},
    agents: {},
    tasks: {},
    systemStatus: {
      agents: 0,
      tasks: 0,
      running: 0,
      queued: 0,
      errors: 0,
      apiHealth: 0,
      memory: "healthy",
      security: "protected",
    },
    workTreeNodes: {},
    workTreeList: [],
    agentList: [],
    taskList: [],
    workTreeNodeList: [],
    isLoading: false,
    error: null,
    useRealApi: USE_REAL_API,

    loadWorkTrees: async () => {
      set({ isLoading: true, error: null });
      try {
        const workTrees = await RealApi.getWorkTrees();
        const trees: Record<string, WorkTree> = {};
        const agents: Record<string, Agent> = {};
        const tasks: Record<string, Task> = {};
        const nodes: Record<string, WorkTreeNode> = {};

        workTrees.forEach((wt) => {
          trees[wt.id] = wt;
          wt.agents.forEach((a) => {
            agents[a.id] = a;
          });
          wt.tasks.forEach((t) => {
            tasks[t.id] = t;
          });
          wt.activity.forEach((a) => {
            nodes[a.id] = {
              id: a.id,
              type: "task",
              title: a.action,
              state: (a.type === "success" || a.type === "completed") ? "completed" : "running",
              agent: a.agent,
            };
          });
        });

        set({
          workTrees: trees,
          agents,
          tasks,
          workTreeNodes: nodes,
          workTreeList: workTrees,
          agentList: Object.values(agents),
          taskList: Object.values(tasks),
          workTreeNodeList: Object.values(nodes),
          isLoading: false,
        });
        if (!get().selectedWorkTreeId && workTrees.length > 0) {
          set({ selectedWorkTreeId: workTrees[0].id });
        }
      } catch (err) {
        console.error("Failed to load work trees:", err);
        const workTrees = allWorkTrees;
        const trees: Record<string, WorkTree> = {};
        const agents: Record<string, Agent> = {};
        const tasks: Record<string, Task> = {};
        const nodes: Record<string, WorkTreeNode> = {};

        workTrees.forEach((wt) => {
          trees[wt.id] = wt;
          wt.agents.forEach((a) => {
            agents[a.id] = a;
          });
          wt.tasks.forEach((t) => {
            tasks[t.id] = t;
          });
          wt.activity.forEach((a) => {
            nodes[a.id] = {
              id: a.id,
              type: "task",
              title: a.action,
              state: "completed",
              agent: a.agent,
            };
          });
        });

        set({
          workTrees: trees,
          agents,
          tasks,
          workTreeNodes: nodes,
          workTreeList: workTrees,
          agentList: Object.values(agents),
          taskList: Object.values(tasks),
          workTreeNodeList: Object.values(nodes),
          isLoading: false,
          error: "Using mock data - backend not configured",
        });
        if (!get().selectedWorkTreeId && workTrees.length > 0) {
          set({ selectedWorkTreeId: workTrees[0].id });
        }
      }
    },

    loadSystemStatus: async () => {
      set({ isLoading: true });
      try {
        const status = await RealApi.getSystemStatus();
        set({
          systemStatus: {
            agents: status.agents,
            tasks: status.tasks,
            running: status.running,
            queued: status.queued,
            errors: status.errors,
            apiHealth: status.apiHealth,
            memory: status.memory,
            security: status.security,
          },
          isLoading: false,
        });
      } catch {
        set({
          systemStatus: mockSystemStatus,
          isLoading: false,
        });
      }
    },

    loadWorkTree: async (id) => {
      set({ isLoading: true });
      try {
        const wt = await RealApi.getWorkTree(id);
        if (wt) {
          set((s) => {
            const nextWorkTrees = { ...s.workTrees, [wt.id]: wt };
            const nextAgents = {
              ...s.agents,
              ...Object.fromEntries(wt.agents.map((a) => [a.id, a])),
            };
            const nextTasks = {
              ...s.tasks,
              ...Object.fromEntries(wt.tasks.map((t) => [t.id, t])),
            };
            return {
              workTrees: nextWorkTrees,
              agents: nextAgents,
              tasks: nextTasks,
              selectedWorkTreeId: wt.id,
              workTreeList: Object.values(nextWorkTrees),
              agentList: Object.values(nextAgents),
              taskList: Object.values(nextTasks),
            };
          });
        }
        set({ isLoading: false });
        return wt;
      } catch {
        set({ isLoading: false });
        return null;
      }
    },

    updateAgentStatus: (id, status) =>
      set((s) => {
        const nextAgents = { ...s.agents, [id]: { ...s.agents[id], status } };
        return { agents: nextAgents, agentList: Object.values(nextAgents) };
      }),

    updateTaskStatus: (id, status) =>
      set((s) => {
        const nextTasks = { ...s.tasks, [id]: { ...s.tasks[id], status } };
        return { tasks: nextTasks, taskList: Object.values(nextTasks) };
      }),

    toggleNodeCollapse: (id) =>
      set((s) => {
        const nextNodes = {
          ...s.workTreeNodes,
          [id]: { ...s.workTreeNodes[id], collapsed: !s.workTreeNodes[id].collapsed },
        };
        return {
          workTreeNodes: nextNodes,
          workTreeNodeList: Object.values(nextNodes),
        };
      }),

    createWorkTree: async (data) => {
      const wt = await RealApi.createWorkTree(data);
      if (wt) {
        set((s) => {
          const nextWorkTrees = { ...s.workTrees, [wt.id]: wt };
          return {
            workTrees: nextWorkTrees,
            workTreeList: Object.values(nextWorkTrees),
            selectedWorkTreeId: wt.id,
          };
        });
      }
      return wt;
    },

    planWorkTree: async (id, objective) => {
      return RealApi.planWorkTree(id, objective);
    },

    runWorkTree: async (id) => {
      const result = await RealApi.runWorkTree(id);
      if (result) {
        set((s) => {
          const wt = s.workTrees[id];
          if (wt) {
            const nextWorkTrees = { ...s.workTrees, [id]: { ...wt, status: "running" } };
            return { workTrees: nextWorkTrees, workTreeList: Object.values(nextWorkTrees) };
          }
          return s;
        });
      }
      return result;
    },

    pauseWorkTree: async (id) => {
      const result = await RealApi.pauseWorkTree(id);
      if (result) {
        set((s) => {
          const wt = s.workTrees[id];
          if (wt) {
            const nextWorkTrees = { ...s.workTrees, [id]: { ...wt, status: "waiting" } };
            return { workTrees: nextWorkTrees, workTreeList: Object.values(nextWorkTrees) };
          }
          return s;
        });
      }
      return result;
    },

    resumeWorkTree: async (id) => {
      const result = await RealApi.resumeWorkTree(id);
      if (result) {
        set((s) => {
          const wt = s.workTrees[id];
          if (wt) {
            const nextWorkTrees = { ...s.workTrees, [id]: { ...wt, status: "running" } };
            return { workTrees: nextWorkTrees, workTreeList: Object.values(nextWorkTrees) };
          }
          return s;
        });
      }
      return result;
    },

    aiChat: async (message) => {
      return RealApi.aiChat(message);
    },

    getWorkTree: (id) => get().workTrees[id],
  }))
);

export const useUI = () =>
  useStore((s) => ({
    sidebarCollapsed: s.sidebarCollapsed,
    activeSection: s.activeSection,
    selectedWorkTreeId: s.selectedWorkTreeId,
    commandCenterOpen: s.commandCenterOpen,
    commandInput: s.commandInput,
    statusMenuOpen: s.statusMenuOpen,
    mobileMenuOpen: s.mobileMenuOpen,
    reducedMotion: s.reducedMotion,
    toggleSidebar: s.toggleSidebar,
    setSidebarCollapsed: s.setSidebarCollapsed,
    setActiveSection: s.setActiveSection,
    setSelectedWorkTree: s.setSelectedWorkTree,
    toggleCommandCenter: s.toggleCommandCenter,
    setCommandCenterOpen: s.setCommandCenterOpen,
    setCommandInput: s.setCommandInput,
    toggleStatusMenu: s.toggleStatusMenu,
    toggleMobileMenu: s.toggleMobileMenu,
  }));

export const useAppData = () =>
  useStore((s) => ({
    workTrees: s.workTreeList,
    workTreeMap: s.workTrees,
    getWorkTree: (id: string) => s.workTrees[id],
    agents: s.agentList,
    getAgent: (id: string) => s.agents[id],
    tasks: s.taskList,
    getTask: (id: string) => s.tasks[id],
    workTreeNodes: s.workTreeNodeList,
    systemStatus: s.systemStatus,
    isLoading: s.isLoading,
    error: s.error,
    useRealApi: s.useRealApi,
    loadWorkTrees: s.loadWorkTrees,
    loadSystemStatus: s.loadSystemStatus,
    loadWorkTree: s.loadWorkTree,
    updateAgentStatus: s.updateAgentStatus,
    updateTaskStatus: s.updateTaskStatus,
    toggleNodeCollapse: s.toggleNodeCollapse,
    createWorkTree: s.createWorkTree,
    planWorkTree: s.planWorkTree,
    runWorkTree: s.runWorkTree,
    pauseWorkTree: s.pauseWorkTree,
    resumeWorkTree: s.resumeWorkTree,
    aiChat: s.aiChat,
  }));

export const useAppAgents = () =>
  useStore((s) => ({
    agents: s.agentList,
    getAgent: (id: string) => s.agents[id],
    updateAgentStatus: s.updateAgentStatus,
  }));

export const useTasks = () =>
  useStore((s) => ({
    tasks: s.taskList,
    getTask: (id: string) => s.tasks[id],
    updateTaskStatus: s.updateTaskStatus,
  }));