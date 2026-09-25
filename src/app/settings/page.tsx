"use client";

import { useEffect } from "react";
import { useStore } from "@/state/store";
import { AppShell } from "@/components/navigation/AppShell";
import { SettingsView } from "@/features/settings/SettingsView";

export default function SettingsPage() {
  const setActiveSection = useStore((s) => s.setActiveSection);

  useEffect(() => {
    setActiveSection("settings");
  }, [setActiveSection]);

  return (
    <AppShell
      title="SETTINGS"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Settings", active: true },
      ]}
    >
      <SettingsView />
    </AppShell>
  );
}
