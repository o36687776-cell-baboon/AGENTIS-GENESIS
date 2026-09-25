import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";
import { Icon, type GenesisIconName } from "@/design-system/icons";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import { PlanPreview } from "./PlanPreview";
import { ExecutionTimeline } from "./ExecutionTimeline";

const suggestions: Array<{ label: string; icon: GenesisIconName }> = [
  { label: "Research", icon: "agents" },
  { label: "Create", icon: "plus" },
  { label: "Analyze", icon: "search" },
  { label: "Automate", icon: "automations" },
  { label: "Find", icon: "knowledge" },
];

const commandPhases = [
  { id: "intent", label: "INTENT" },
  { id: "interpret", label: "INTERPRET" },
  { id: "plan", label: "PLAN" },
  { id: "confirm", label: "CONFIRM" },
  { id: "execute", label: "EXECUTE" },
  { id: "verify", label: "VERIFY" },
  { id: "deliver", label: "DELIVER" },
];

interface CommandCenterProps {
  open: boolean;
  onClose: () => void;
}

export function CommandCenter({ open, onClose }: CommandCenterProps) {
  const mounted = useMounted();
  const [phase, setPhase] = useState<"input" | "interpret" | "planning" | "completed">("input");
  const [input, setInput] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setPhase("input");
      setCurrentStep(0);
      setInput("");
    }
  }, [open]);

  const handleInput = (value: string) => {
    setInput(value);
    setPhase("interpret");
  };

  const startPlan = () => {
    setPhase("planning");
    setCurrentStep(0);
    const interval = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= commandPhases.length - 1) {
          clearInterval(interval);
          setPhase("completed");
          return s;
        }
        return s + 1;
      });
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      handleInput(input.trim());
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (phase === "completed" && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && mounted && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdrop}
        >
          <motion.div
            className="relative w-full max-w-2xl rounded-xl border border-[var(--border-active)] bg-[var(--color-charcoal)] shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.28 }}
          >
            <AnimatePresence mode="wait">
              {phase === "input" && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <div className="mb-4 flex items-center gap-2.5">
                    <NodeIndicator color="ai" active pulse size="sm" />
                    <span className="font-mono text-sm text-[var(--color-soft-grey)]">
                      GENESIS COMMAND
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="What would you like Genesis to accomplish?"
                      className="w-full rounded-md border border-[var(--border-active)] bg-[var(--color-void)] px-4 py-3 text-base text-[var(--color-off-white)] placeholder-[var(--color-soft-grey)] outline-none"
                      autoFocus
                    />
                    <Icon
                      name="search"
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-soft-grey)]"
                    />
                  </div>
                  <div className="mt-4">
                    <span className="text-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]">
                      Suggested
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => handleInput(`${s.label} Q4 strategy report.`)}
                          className="rounded-md border border-[var(--border-subtle)] bg-[var(--color-deep-black)] px-3 py-1.5 text-sm text-[var(--color-off-white)] transition-all hover:border-[var(--border-active)] hover:bg-[var(--color-graphite)]"
                        >
                          <span className="flex items-center gap-1.5">
                            <Icon name={s.icon} size={14} />
                            {s.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2 text-xs text-[var(--color-soft-grey)]">
                    <kbd className="rounded border border-[var(--border-default)] px-1.5 py-0.25">
                      ESC
                    </kbd>
                    <span>to close</span>
                  </div>
                </motion.div>
              )}

              {phase === "interpret" && (
                <motion.div
                  key="interpret"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6"
                >
                  <div className="mb-2 flex items-center justify-center">
                    <NodeIndicator color="ai" active size="lg" />
                    <div className="absolute -z-0">
                      <NodeNetwork />
                    </div>
                  </div>
                  <h3 className="text-center text-h3 font-medium">
                    Interpreting intent…
                  </h3>
                  <p className="mt-2 text-center text-sm text-[var(--color-soft-grey)]">
                    Genesis is analyzing your objective and mapping the work tree.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <PlanPreview onConfirm={startPlan} />
                  </div>
                </motion.div>
              )}

              {phase === "planning" && (
                <motion.div
                  key="planning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <ExecutionTimeline
                    phases={commandPhases}
                    currentStep={currentStep}
                    onReset={() => {
                      setPhase("input");
                      setCurrentStep(0);
                    }}
                    completed={currentStep >= commandPhases.length - 1}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NodeNetwork() {
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <motion.div
        className="absolute h-12 w-0.5 bg-[var(--signal-ai)]"
        initial={{ opacity: 0.3 }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          height: ["48px", "64px", "48px"],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-[var(--signal-ai)]"
          style={{
            top: `${30 + Math.sin((i * Math.PI) / 2) * 40}px`,
            left: `${60 + Math.cos((i * Math.PI) / 2) * 40}px`,
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={`b-${i}`}
          className="absolute h-1 w-1 rounded-full bg-[var(--signal-primary)]"
          style={{
            bottom: `${30 + Math.sin((i * Math.PI) / 2) * 40}px`,
            right: `${60 + Math.cos((i * Math.PI) / 2) * 40}px`,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
        />
      ))}
    </div>
  );
}
