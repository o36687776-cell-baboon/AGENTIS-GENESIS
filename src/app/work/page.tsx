"use client";

import { useEffect } from "react";
import { useStore } from "@/state/store";
import { AppShell } from "@/components/navigation/AppShell";
import { AllWorkTrees } from "@/features/worktrees/AllWorkTrees";

export default function WorkTreesPage() {
  const setActiveSection = useStore((s) => s.setActiveSection);

  useEffect(() => {
    setActiveSection("worktrees");
  }, [setActiveSection]);

  return (
    <AppShell
      title="WORK TREES"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Work Trees", active: true },
      ]}
    >
      <AllWorkTrees />
    </AppShell>
  );
}
