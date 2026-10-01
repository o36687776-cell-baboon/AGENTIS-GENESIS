"use strict";
/**
 * Evidence and provider contracts for ROCKERFELLER marketing intelligence.
 *
 * The central rule of this module is that an inferred signal is never recorded
 * as an observation. Every finding carries an explicit classification, and
 * every provider call reports its own availability so that an unavailable
 * capability is visible as unavailable rather than silently absent.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVIDENCE_CLASS_LABELS = void 0;
exports.EVIDENCE_CLASS_LABELS = {
    OBSERVED_FACT: "Observed fact",
    PUBLICLY_EXPRESSED_INTENT: "Publicly expressed intent",
    MARKET_SIGNAL: "Market signal",
    GEOGRAPHIC_SIGNAL: "Geographic signal",
    DERIVED_SIGNAL: "Derived signal",
    AGENT_HYPOTHESIS: "Agent hypothesis",
    UNKNOWN_UNVERIFIED: "Unknown / unverified",
};
