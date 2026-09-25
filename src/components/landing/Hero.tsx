"use client";

import { motion } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";
import { EvolutionTimeline } from "@/components/landing/EvolutionTimeline";
import { Icon } from "@/design-system/icons";

export function Hero({ onEnter }: { onEnter: () => void }) {
  const mounted = useMounted();

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[var(--color-void)] text-[var(--color-off-white)]">
      <div className="absolute inset-0 genesis-data-flow opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-deep-black),_transparent_60%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-10 text-center">
        <motion.header
          className="mb-6 flex flex-col items-center gap-1"
          initial={mounted ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 text-[var(--signal-primary)]">
            <Icon name="signal" size={14} />
            <span className="tech-meta text-xs uppercase tracking-[0.15em]">AGENTIS GENESIS</span>
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-soft-grey)]">
            INTELLIGENCE IN MOTION
          </span>
        </motion.header>

        <motion.h1
          className="text-hero font-medium text-[var(--color-off-white)]"
          initial={mounted ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="block">THE EVOLUTION OF</span>
          <span className="block text-[var(--signal-primary)]">INTELLIGENCE</span>
        </motion.h1>

        <motion.p
          className="mt-4 max-w-xl text-base text-[var(--color-soft-grey)]"
          initial={mounted ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          From primitive instincts to artificial minds.
        </motion.p>

        <motion.div
          className="my-8 w-full"
          initial={mounted ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <EvolutionTimeline />
        </motion.div>

        <motion.p
          className="tech-meta mb-8 text-xs uppercase tracking-[0.25em] text-[var(--color-soft-grey)]"
          initial={mounted ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.5 }}
        >
          SAME DNA{" "}
          <span className="text-[var(--signal-ai)]">——— INTELLIGENT DIRECTED EVOLUTION ———</span>
        </motion.p>

        <motion.button
          onClick={onEnter}
          className="group relative inline-flex items-center gap-2 rounded-md border border-[var(--border-active)] bg-[var(--color-deep-black)] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-[var(--color-off-white)] transition-all hover:border-[var(--signal-primary)] hover:text-[var(--signal-primary)]"
          initial={mounted ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.6 }}
          whileHover={{ boxShadow: "0 0 0 3px rgba(155,123,255,0.25)" }}
        >
          <span>ENTER GENESIS</span>
          <Icon name="chevron-right" size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </motion.button>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-between px-6 py-4 text-[var(--color-mid-grey)]">
        <span className="tech-meta text-[10px] uppercase tracking-[0.2em]">v1.0 genesis-os</span>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-success)]" />
          <span className="tech-meta text-[10px]">SYSTEMS NOMINAL</span>
        </div>
      </div>
    </section>
  );
}
