"use client";

import { motion } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";

const figures: { id: string; label: string; x: number; ai?: boolean }[] = [
  { id: "early", label: "Early human", x: 110 },
  { id: "tool", label: "Tool use", x: 270 },
  { id: "upright", label: "Upright posture", x: 430 },
  { id: "human", label: "Homo sapiens", x: 590 },
  { id: "homoai", label: "HOMO AI", x: 750, ai: true },
];

export function EvolutionTimeline() {
  const mounted = useMounted();

  return (
    <motion.svg
      aria-hidden="true"
      role="img"
      viewBox="0 0 920 260"
      className="h-auto w-full max-w-3xl"
      style={{ color: "var(--color-soft-grey)" }}
      initial={mounted ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <defs>
        <linearGradient id="genesisTimelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(217,255,0,0.08)" />
          <stop offset="100%" stopColor="rgba(155,123,255,0.12)" />
        </linearGradient>
        <marker id="genesisArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <path d="M0,0 L9,3 L0,6 Z" fill="currentColor" />
        </marker>
      </defs>

      <line x1="40" y1="130" x2="840" y2="130" stroke="url(#genesisTimelineGrad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="640" y1="130" x2="810" y2="130" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#genesisArrow)" opacity={0.55} />

      {figures.map((f) => (
        <g key={f.id} transform={`translate(${f.x}, 0)`}>
          <line x1="0" y1="108" x2="0" y2="128" stroke="currentColor" strokeWidth="1.5" opacity={0.45} />
          <Figure id={f.id} ai={f.ai} />
          <text x="0" y="174" textAnchor="middle" fontSize="11" fill="currentColor" opacity={0.6} fontFamily="var(--font-mono)">
            {f.label}
          </text>
          {f.ai && (
            <text x="0" y="194" textAnchor="middle" fontSize="10" fill="var(--signal-ai)" opacity={0.7} fontFamily="var(--font-mono)">
              INTELLIGENCE EVOLVED
            </text>
          )}
        </g>
      ))}
    </motion.svg>
  );
}

function Figure({ id, ai }: { id: string; ai?: boolean }) {
  if (ai) {
    return (
      <g transform="translate(0, 92)">
        <circle cx="0" cy="-12" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <g stroke="currentColor" strokeWidth="1.1" opacity={0.5}>
          <path d="M -15 0 L 15 0 M 0 -15 L 0 6 M -10 -5 L 10 -5" />
          <path d="M -11 -1 L -6 -6 M 6 -6 L 11 -1" />
        </g>
        <g fill="rgba(155,123,255,0.6)">
          <circle cx="-7" cy="-13" r="2.4" />
          <circle cx="7" cy="-17" r="2.4" />
          <circle cx="0" cy="-4" r="2.4" />
          <circle cx="-9" cy="4" r="2.4" />
          <circle cx="9" cy="4" r="2.4" />
        </g>
        <path d="M -14 -2 C -10 -9 -5 -13 0 -15 C 5 -13 10 -9 14 -2" fill="none" stroke="rgba(155,123,255,0.35)" strokeWidth="1" />
        <g stroke="rgba(155,123,255,0.45)" strokeWidth="1" opacity={0.65}>
          <path d="M -26 -6 L -12 0" />
          <path d="M 12 0 L 26 -6" />
          <path d="M -18 6 L -6 2" />
          <path d="M 6 2 L 18 6" />
          <circle cx="-26" cy="-6" r="1.6" fill="rgba(155,123,255,0.5)" />
          <circle cx="26" cy="-6" r="1.6" fill="rgba(155,123,255,0.5)" />
        </g>
      </g>
    );
  }

  if (id === "early") {
    return (
      <g transform="translate(0, 96)">
        <circle cx="0" cy="-14" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 0 -8 L 0 8 M -6 2 L 6 -2 M -6 -2 C 0 -4 6 -4 6 0" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 0 8 L -3 14 M 0 8 L 3 14" stroke="currentColor" strokeWidth="1.5" />
      </g>
    );
  }

  if (id === "tool") {
    return (
      <g transform="translate(0, 96)">
        <circle cx="0" cy="-14" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M -10 -10 L -4 -14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 4 -4 L 0 6 M -6 2 L 6 -2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 0 8 L -3 14 M 0 8 L 3 14" stroke="currentColor" strokeWidth="1.5" />
        <g stroke="currentColor" strokeWidth="1.5">
          <line x1="-16" y1="-14" x2="-18" y2="-8" />
          <line x1="-18" y1="-8" x2="-14" y2="-6" />
        </g>
      </g>
    );
  }

  if (id === "upright") {
    return (
      <g transform="translate(0, 92)">
        <circle cx="0" cy="-14" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 0 -8 L 0 8" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0" y1="8" x2="-4" y2="18" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0" y1="8" x2="4" y2="18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M -5 12 L -2 8 L 2 8 L 5 12" stroke="currentColor" strokeWidth="1.5" />
      </g>
    );
  }

  return (
    <g transform="translate(0, 88)">
      <circle cx="0" cy="-14" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 0 -8 C -3 -6 -4 0 -2 4 M 0 -8 C 3 -6 4 0 2 4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 0 6 L -4 14 M 0 6 L 4 14 M -4 8 L 4 8" stroke="currentColor" strokeWidth="1.5" />
    </g>
  );
}
