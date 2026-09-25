"use client";

import { motion } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";
import { Icon } from "@/design-system/icons";

const container = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12, delayChildren: 0.1, duration: 0.45 },
  },
};

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export function Hero({ onEnter }: { onEnter: () => void }) {
  const mounted = useMounted();

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[var(--color-void)] text-[var(--color-off-white)]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b0c11] via-[var(--color-void)] to-[#0b0c11]" />
      <div className="absolute inset-0 -z-10 genesis-data-flow opacity-35" />

      <motion.header
        className="absolute top-6 flex items-center justify-between gap-2 text-[var(--color-soft-grey)]"
        initial={mounted ? "hidden" : "show"}
        animate={mounted ? "show" : "show"}
        variants={container}
      >
        <motion.div className="flex items-center gap-2" variants={item}>
          <Icon name="signal" size={13} className="text-[var(--signal-primary)]" />
          <span className="tech-meta text-[10px] uppercase tracking-[0.2em]">AGENTIS GENESIS</span>
        </motion.div>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-mid-grey)]">
          INTELLIGENCE IN MOTION
        </span>
      </motion.header>

      <motion.div
        className="flex flex-col items-center"
        initial={mounted ? "hidden" : "show"}
        animate={mounted ? "show" : "show"}
        variants={container}
      >
        <motion.h1 className="text-center text-hero font-medium leading-tight text-[var(--color-off-white)]" variants={item}>
          <span className="block">THE EVOLUTION OF</span>
          <span className="block text-[var(--signal-primary)]">INTELLIGENCE</span>
        </motion.h1>

        <motion.p className="tech-meta mt-2 text-center text-xs uppercase tracking-[0.25em] text-[var(--color-soft-grey)]" variants={item}>
          From primitive instincts to artificial minds.
        </motion.p>

        <motion.div className="my-10 flex justify-center" variants={item}>
          <img
            src="/agentis-hero.png"
            alt=""
            aria-hidden="true"
            className="block max-h-[60vh] w-full max-w-3xl rounded-md border border-[var(--border-subtle)] object-contain opacity-95"
          />
        </motion.div>

        <motion.p className="tech-meta mb-8 text-center text-xs uppercase tracking-[0.3em] text-[var(--color-soft-grey)]" variants={item}>
          <span>SAME DNA</span>
          <span className="px-2.5 text-[var(--signal-ai)]">—— INTELLIGENT DIRECTED EVOLUTION ——</span>
          <span>NEW INTELLIGENCE</span>
        </motion.p>

        <motion.button
          onClick={onEnter}
          className="group relative inline-flex items-center gap-2 rounded-md border border-[var(--border-active)] bg-[var(--color-deep-black)] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-[var(--color-off-white)] transition-all hover:border-[var(--signal-primary)] hover:text-[var(--signal-primary)]"
          variants={item}
          whileHover={{ boxShadow: "0 0 0 3px rgba(155,123,255,0.3)" }}
        >
          <span>ENTER GENESIS</span>
          <Icon name="chevron-right" size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </motion.button>
      </motion.div>

      <motion.footer
        className="absolute bottom-6 flex items-center justify-between gap-2 w-full text-[var(--color-mid-grey)]"
        initial={mounted ? "hidden" : "show"}
        animate={mounted ? "show" : "show"}
        variants={container}
      >
        <motion.span className="tech-meta text-[10px] uppercase tracking-[0.2em]" variants={item}>
          v1.0 genesis-os
        </motion.span>
        <motion.div className="flex items-center gap-2" variants={item}>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-success)]" />
          <span className="tech-meta text-[10px]">SYSTEMS NOMINAL</span>
        </motion.div>
      </motion.footer>
    </section>
  );
}
