"use client";

import { useEffect } from "react";
import { useStore } from "@/state/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const loadWorkTrees = useStore((s) => s.loadWorkTrees);
  const loadSystemStatus = useStore((s) => s.loadSystemStatus);

  useEffect(() => {
    loadWorkTrees();
    loadSystemStatus();
  }, [loadWorkTrees, loadSystemStatus]);

  return <>{children}</>;
}
