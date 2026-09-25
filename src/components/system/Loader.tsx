import { Icon } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";

interface LoaderProps {
  label?: string;
  sublabel?: string;
}

export function Loader({
  label = "LOADING",
  sublabel = "Connecting agents...",
}: LoaderProps) {
  return (
    <div className="flex h-80 flex-col items-center justify-center gap-6 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <NodeIndicator color="ai" active pulse size="lg" />
        <div className="absolute -inset-4">
          <div className="agent-orbit absolute h-8 w-8 rounded-full bg-[var(--signal-primary)] opacity-60" />
          <div className="absolute h-12 w-0.5 bg-[var(--color-mid-grey)]" />
        </div>
      </div>
      <div>
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--signal-ai)]">
          {label}
        </span>
        <p className="mt-1 text-sm text-[var(--color-soft-grey)]">{sublabel}</p>
      </div>
    </div>
  );
}
