import { useEffect, useState } from "react";
import { Icon } from "@/design-system/icons";
import { useStore } from "@/state/store";

export function CommandBar() {
  const toggleCommandCenter = useStore((s) => s.toggleCommandCenter);
  const commandInput = useStore((s) => s.commandInput);

  const placeholders = [
    "What would you like Genesis to accomplish?",
    "Analyze the Q3 sales data and prepare a report.",
    "Create a new work tree for product research.",
    "Show me everything that changed today.",
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  return (
    <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--color-black)] p-2.5">
      <button
        type="button"
        onClick={toggleCommandCenter}
        className="flex flex-1 items-center gap-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--color-charcoal)] px-3 py-2 text-left text-sm text-[var(--color-soft-grey)] transition-all duration-160 hover:border-[var(--border-active)] hover:text-[var(--color-off-white)] focus:outline-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-primary)]"
      >
        <Icon name="command" size={16} className="text-[var(--signal-primary)]" />
        <span className="truncate">{commandInput || placeholders[placeholderIdx]}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <kbd className="hidden rounded border border-[var(--border-default)] px-1.5 py-0.25 text-mono text-xs text-[var(--color-soft-grey)] sm:inline">
            ⌘K
          </kbd>
          <span className="text-[var(--color-soft-grey)]">↵</span>
        </span>
      </button>
    </div>
  );
}
