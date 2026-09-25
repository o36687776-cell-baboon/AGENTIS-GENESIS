"use client";

import { useState } from "react";
import { useStore } from "@/state/store";
import { AppShell } from "@/components/navigation/AppShell";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { Hero } from "@/components/landing/Hero";

export default function DashboardPage() {
  const [entered, setEntered] = useState(false);
  const setActiveSection = useStore((s) => s.setActiveSection);

  const handleEnter = () => {
    setActiveSection("dashboard");
    setEntered(true);
  };

  if (!entered) {
    return <Hero onEnter={handleEnter} />;
  }

  return (
    <AppShell title="HOME" breadcrumb={[]}>
      <Dashboard />
    </AppShell>
  );
}
