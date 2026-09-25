import { SystemStatus, WorkTree } from "@/types";
import { mockSystemStatus, allWorkTrees, generateActivityFeed } from "@/data/mockData";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockApi {
  static async getSystemStatus(): Promise<SystemStatus> {
    await delay(300);
    return mockSystemStatus;
  }

  static async getWorkTrees(): Promise<WorkTree[]> {
    await delay(400);
    return allWorkTrees;
  }

  static async getWorkTree(id: string): Promise<WorkTree | null> {
    await delay(500);
    return allWorkTrees.find((w) => w.id === id) ?? null;
  }

  static async getRecentActivity() {
    await delay(200);
    return generateActivityFeed().slice(0, 6);
  }

  static async getPendingApprovals() {
    await delay(200);
    return mockSystemStatus.errors;
  }
}
