"use client";

import { useEffect } from "react";
import { useStore } from "@/state/store";
import { AppShell } from "@/components/navigation/AppShell";
import { MemoryView } from "@/features/memory/MemoryView";

export default function MemoryPage() {
  const setActiveSection = useStore((s) => s.setActiveSection);

  useEffect(() => {
    setActiveSection("memory");
  }, [setActiveSection]);

  return (
    <AppShell
      title="MEMORY"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Memory", active: true },
      ]}
    >
      <MemoryView />
    </AppShell>
  );
}
