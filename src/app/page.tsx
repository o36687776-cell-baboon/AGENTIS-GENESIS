"use client";

import { useEffect } from "react";
import { useStore } from "@/state/store";
import { AppShell } from "@/components/navigation/AppShell";
import { Dashboard } from "@/features/dashboard/Dashboard";

export default function DashboardPage() {
  const activeSection = useStore((s) => s.activeSection);
  const setActiveSection = useStore((s) => s.setActiveSection);

  useEffect(() => {
    setActiveSection("dashboard");
  }, [setActiveSection]);

  return (
    <AppShell title="HOME" breadcrumb={[]}>
      <Dashboard />
    </AppShell>
  );
}
