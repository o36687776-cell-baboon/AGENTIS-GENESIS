"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { useStore } from "@/state/store";
import { AppShell } from "@/components/navigation/AppShell";
import { WorkTreePage } from "@/features/worktrees/WorkTreePage";
import { Loader } from "@/components/system/Loader";
import type { WorkTree } from "@/types";

export default function WorkTreeDetailPage() {
  const params = useParams<{ id: string }>();
  const workTreeId = params?.id;
  const getWorkTree = useStore((s) => s.getWorkTree);
  const loadWorkTree = useStore((s) => s.loadWorkTree);
  const setActiveSection = useStore((s) => s.setActiveSection);
  const [workTree, setWorkTree] = useState<WorkTree | null | undefined>(undefined);

  useEffect(() => {
    setActiveSection("worktrees");
    void loadData();

    async function loadData() {
      const existing = getWorkTree(workTreeId);
      if (existing) {
        setWorkTree(existing);
      } else {
        const loaded = await loadWorkTree(workTreeId);
        setWorkTree(loaded);
      }
    }
  }, [workTreeId, getWorkTree, loadWorkTree, setActiveSection]);

  if (workTree === undefined) {
    return (
      <AppShell title="WORK TREE" breadcrumb={[]}>
        <Loader label="LOADING CONTEXT" />
      </AppShell>
    );
  }

  if (workTree === null) {
    notFound();
    return null;
  }

  return (
    <AppShell
      title={workTree.name.toUpperCase()}
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Work Trees", href: "/work" },
        { label: workTree.name, active: true },
      ]}
    >
      <WorkTreePage workTree={workTree} />
    </AppShell>
  );
}
