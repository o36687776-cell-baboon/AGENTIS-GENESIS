"use client";
import { useEffect } from "react";
import { useStore } from "@/state/store";
import { AppShell } from "@/components/navigation/AppShell";
import { SdkView } from "@/features/sdk/SdkView";

export default function SdkPage() {
  const setActiveSection = useStore((s) => s.setActiveSection);
  useEffect(() => { setActiveSection("sdk"); }, [setActiveSection]);
  return (
    <AppShell title="SDK" breadcrumb={[
      { label: "Home", href: "/" },
      { label: "Developer", active: true },
      { label: "SDK" },
    ]}>
      <SdkView />
    </AppShell>
  );
}
