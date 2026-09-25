"use client";

import { useEffect } from "react";
import { useStore } from "@/state/store";
import { AppShell } from "@/components/navigation/AppShell";
import { AgentsView } from "@/features/agents/AgentsView";

export default function AgentsPage() {
  const setActiveSection = useStore((s) => s.setActiveSection);

  useEffect(() => {
    setActiveSection("agents");
  }, [setActiveSection]);

  return (
    <AppShell
      title="AGENTS"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Agents", active: true },
      ]}
    >
      <AgentsView />
    </AppShell>
  );
}
