"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Agent, Task, WorkTree, WorkTreeNode } from "@/types";
import { mockAgents, mockTasks } from "@/data/mockData";
import { MockApi } from "@/services/mockApi";

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
  systemStatus: {
    agents: number;
    tasks: number;
    running: number;
    queued: number;
    errors: number;
    apiHealth: number;
    memory: "healthy" | "degraded" | "critical";
    security: "protected" | "warning" | "compromised";
  };
  workTreeNodes: Record<string, WorkTreeNode>;
  workTreeList: WorkTree[];
  agentList: Agent[];
  taskList: Task[];
  workTreeNodeList: WorkTreeNode[];
  isLoading: boolean;
  error: string | null;

  getWorkTree: (id: string) => WorkTree | undefined;
  loadWorkTrees: () => Promise<void>;
  loadSystemStatus: () => Promise<void>;
  loadWorkTree: (id: string) => Promise<WorkTree | null>;
  updateAgentStatus: (id: string, status: Agent["status"]) => void;
   updateTaskStatus: (id: string, status: Task["status"]) => void;
  toggleNodeCollapse: (id: string) => void;
}

export type AppStore = UIState & AppDataState;

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

    loadWorkTrees: async () => {
      set({ isLoading: true, error: null });
      try {
        const workTrees = await MockApi.getWorkTrees();
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
              state: "id" in a ? "completed" : "running",
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
        set({ error: "Failed to load work trees", isLoading: false });
      }
    },

    loadSystemStatus: async () => {
      set({ isLoading: true });
      try {
        const status = await MockApi.getSystemStatus();
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
          systemStatus: {
            agents: 4,
            tasks: 10,
            running: 3,
            queued: 4,
            errors: 1,
            apiHealth: 99.9,
            memory: "healthy",
            security: "protected",
          },
          isLoading: false,
        });
      }
    },

    loadWorkTree: async (id) => {
      set({ isLoading: true });
      try {
        const wt = await MockApi.getWorkTree(id);
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
    loadWorkTrees: s.loadWorkTrees,
    loadSystemStatus: s.loadSystemStatus,
    loadWorkTree: s.loadWorkTree,
    updateAgentStatus: s.updateAgentStatus,
    updateTaskStatus: s.updateTaskStatus,
    toggleNodeCollapse: s.toggleNodeCollapse,
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
