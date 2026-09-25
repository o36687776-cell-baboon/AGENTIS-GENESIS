import { useMemo } from "react";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
  groupBy?: "priority" | "agent" | "status" | "none";
  columns?: "auto" | 1 | 2 | 3;
  onSelect?: (task: Task) => void;
}

export function TaskList({
  tasks,
  groupBy = "none",
  columns = "auto",
  onSelect,
}: TaskListProps) {
  const grouped = useMemo(() => {
    if (groupBy === "none") return { All: tasks };

    return tasks.reduce(
      (acc, task) => {
        const key = groupBy === "priority"
          ? task.priority
          : groupBy === "agent"
          ? task.agent ?? "Unassigned"
          : task.status;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
      },
      {} as Record<string, Task[]>
    );
  }, [tasks, groupBy]);

  const columnClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([group, groupTasks]) => (
        <div key={group}>
          {groupBy !== "none" && (
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--signal-primary)]">
                {group}
              </span>
              <span className="text-xs text-[var(--color-mid-grey)]">
                {groupTasks.length}
              </span>
            </div>
          )}
          <div className={`grid gap-3 ${groupBy === "none" ? columnClass[columns] : columnClass["auto"]}`}>
            {groupTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={onSelect ? () => onSelect(task) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
