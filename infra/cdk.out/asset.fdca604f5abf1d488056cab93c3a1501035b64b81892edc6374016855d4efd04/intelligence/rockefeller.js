"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROCKERFELLER_AGENT_TYPE = void 0;
exports.resolveGoogleCredential = resolveGoogleCredential;
exports.resetGoogleCredentialCache = resetGoogleCredentialCache;
exports.buildProviders = buildProviders;
exports.buildQueries = buildQueries;
exports.gatherMarketingIntelligence = gatherMarketingIntelligence;
exports.buildGroundingContext = buildGroundingContext;
const secrets = __importStar(require("../ai/secrets"));
const config_1 = require("../config");
const google_providers_1 = require("./google-providers");
const entity_resolution_1 = require("./entity-resolution");
/**
 * ROCKERFELLER's intelligence pass.
 *
 * Cost ordering is deliberate and matches the Genesis execution discipline:
 * cheap discovery runs first, enrichment targets only what discovery found,
 * corroboration checks the strongest candidates, and the expensive analysis is
 * left to Bedrock with the evidence already assembled. Identical queries are
 * never repeated within a single pass.
 */
exports.ROCKERFELLER_AGENT_TYPE = "rockefeller";
let cachedCredential = null;
const CREDENTIAL_TTL_MS = 5 * 60 * 1000;
/**
 * Reads the Google marketing credential from Secrets Manager. The credential is
 * never logged, never returned to a prompt, and never written to an artifact.
 * An absent secret yields null, which makes every provider report UNAVAILABLE.
 */
async function resolveGoogleCredential() {
    const config = (0, config_1.getConfig)();
    // Under MOCK_AI the secrets helper substitutes placeholder values for any ARN.
    // Accepting one of those would make every provider believe it is authorised
    // and issue real calls with a fake key, so mock mode is treated as absent.
    if (!config.googleMarketingSecretArn || config.mockAi) {
        return null;
    }
    const now = Date.now();
    if (cachedCredential && now - cachedCredential.fetchedAt < CREDENTIAL_TTL_MS) {
        return cachedCredential.value;
    }
    let value = null;
    try {
        const apiKey = (await secrets.getSecretValue(config.googleMarketingSecretArn, "googleApiKey")) || "";
        const trimmed = apiKey.trim();
        // Guard against the development placeholder leaking through as a key.
        const isPlaceholder = !trimmed || trimmed === "mock-secret-value" || trimmed === "dev_password";
        value = isPlaceholder ? null : { apiKey: trimmed };
    }
    catch {
        // A missing or unreadable secret means the capability is unavailable, not
        // that the mission should fail.
        value = null;
    }
    cachedCredential = { value, fetchedAt: now };
    return value;
}
function resetGoogleCredentialCache() {
    cachedCredential = null;
}
function buildProviders(resolveCredential) {
    return {
        search: (0, google_providers_1.createSearchProvider)("google-search", resolveCredential),
        places: (0, google_providers_1.createPlacesProvider)("google-places", resolveCredential),
        geocoding: (0, google_providers_1.createGeocodingProvider)("google-geocoding", resolveCredential),
        trends: (0, google_providers_1.createTrendsProvider)("google-trends", resolveCredential),
        earthEngine: (0, google_providers_1.createEarthEngineProvider)("earth-engine", resolveCredential),
    };
}
let evidenceCounter = 0;
function nextEvidenceId() {
    evidenceCounter += 1;
    return `ev-${Date.now().toString(36)}-${evidenceCounter}`;
}
function record(classification, source, observation, unavailable = false) {
    return {
        id: nextEvidenceId(),
        classification,
        source,
        observation,
        unavailable,
        retrievedAt: new Date().toISOString(),
    };
}
/**
 * Derives search queries from the objective once. Repeated identical searches
 * are never issued, which keeps both cost and quota pressure bounded.
 */
function buildQueries(objective) {
    const trimmed = objective.trim();
    const queries = new Set();
    queries.add(trimmed);
    // Only add derived variants when the objective is long enough for them to be
    // meaningfully different from the original.
    if (trimmed.split(/\s+/).length >= 3) {
        queries.add(`${trimmed} market`);
        queries.add(`${trimmed} competitors`);
        queries.add(`${trimmed} pricing`);
    }
    return Array.from(queries).slice(0, 3);
}
async function gatherMarketingIntelligence(options) {
    const providers = buildProviders(resolveGoogleCredential);
    const maxEnrichments = Math.min(options.maxEnrichments ?? 3, 5);
    const evidence = [];
    const providerReports = [];
    const unavailable = [];
    const searchedQueries = new Set();
    const report = (name, operation, status, latencyMs) => {
        providerReports.push({ name, status, operation, latencyMs });
    };
    // ---- Stage 1: cheap discovery -------------------------------------------
    const discoveredLinks = [];
    for (const query of buildQueries(options.objective)) {
        if (searchedQueries.has(query))
            continue;
        searchedQueries.add(query);
        const result = await providers.search.search(query, {
            limit: 8,
            geo: options.geo,
        });
        report(result.provider, result.operation, result.status, result.latencyMs);
        if (result.status !== "AVAILABLE" || !result.data) {
            unavailable.push(`${result.operation} (${result.status})`);
            continue;
        }
        for (const item of result.data) {
            discoveredLinks.push(item);
            evidence.push(record("OBSERVED_FACT", `${result.provider}:${query}`, `Public search result at position ${item.rank ?? "?"}: "${item.title}" (${item.link}). Ranking is a provider-reported position, not a traffic or conversion measurement.`));
        }
    }
    // ---- Stage 2: targeted entity enrichment --------------------------------
    const placeResults = [];
    if (options.geo || options.objective.split(/\s+/).length >= 2) {
        const places = await providers.places.searchPlaces(options.objective, { limit: maxEnrichments });
        report(places.provider, places.operation, places.status, places.latencyMs);
        if (places.status === "AVAILABLE" && places.data) {
            placeResults.push(...places.data);
            for (const place of placeResults) {
                evidence.push(record("GEOGRAPHIC_SIGNAL", `${places.provider}:searchPlaces`, `Public business listing "${place.name}" in ${place.address || "an unspecified address"}. A listing records that a business registered itself publicly; it carries no intent from any individual.`));
            }
        }
        else {
            unavailable.push(`${places.operation} (${places.status})`);
        }
    }
    // ---- Stage 3: corroboration ---------------------------------------------
    const entities = (0, entity_resolution_1.resolveEntities)(placeResults.map(entity_resolution_1.candidateFromPlace));
    for (const entity of entities) {
        if (entity.status === "NEEDS_REVIEW") {
            evidence.push(record("DERIVED_SIGNAL", "entity-resolution", `Entities sharing the name "${entity.candidate.name}" were found with no strong shared identifier, so they are kept separate pending review.`));
        }
    }
    // ---- Stage 4: aggregate market signal ------------------------------------
    const terms = buildQueries(options.objective).map((query) => query.replace(/\s+(market|competitors|pricing)$/i, ""));
    const trends = await providers.trends.interest(terms, { geo: options.geo, timeframe: "today 12-m" });
    report(trends.provider, trends.operation, trends.status, trends.latencyMs);
    if (trends.status === "AVAILABLE" && trends.data && trends.data.length > 0) {
        for (const signal of trends.data) {
            evidence.push(record("MARKET_SIGNAL", `${trends.provider}:interest`, `Aggregate interest signal for "${signal.term}"${signal.geo ? ` in ${signal.geo}` : ""}. This is an aggregate market pattern and cannot be attributed to any individual.`));
        }
    }
    else {
        unavailable.push(`${trends.operation} (${trends.status})`);
    }
    // ---- Optional geospatial context ----------------------------------------
    // Earth Engine is never required. Its status is recorded and nothing else.
    const earthEngine = await providers.earthEngine.status();
    report(earthEngine.provider, earthEngine.operation, earthEngine.status, earthEngine.latencyMs);
    // ---- Explicit gaps -------------------------------------------------------
    // Every unavailable capability becomes a visible gap. The set of metrics
    // that are never fabricated is stated outright so no downstream reader can
    // mistake silence for a zero.
    for (const metric of [
        "search volume",
        "traffic",
        "conversions",
        "Google Analytics data",
        "Search Console data",
        "ranking accuracy beyond provider-reported position",
        "competitor revenue or performance metrics",
        "individual-level intent",
    ]) {
        evidence.push(record("UNKNOWN_UNVERIFIED", "provider-availability", `${metric}: not collected in this execution.`, true));
    }
    const intelligence = {
        evidence,
        providers: providerReports,
        unavailableCapabilities: unavailable,
        retrievedAt: new Date().toISOString(),
    };
    return {
        intelligence,
        entities,
        context: buildGroundingContext(intelligence, entities, options.objective),
    };
}
function buildGroundingContext(intelligence, entities, objective) {
    const lines = [];
    const observed = intelligence.evidence.filter((e) => e.classification === "OBSERVED_FACT");
    const signals = intelligence.evidence.filter((e) => e.classification === "MARKET_SIGNAL" || e.classification === "GEOGRAPHIC_SIGNAL");
    const gaps = intelligence.evidence.filter((e) => e.unavailable);
    lines.push(`ROCKERFELLER EVIDENCE CONTEXT for objective: ${objective}`);
    lines.push("");
    lines.push(`Provider availability:`);
    for (const provider of intelligence.providers) {
        lines.push(`  - ${provider.name}.${provider.operation}: ${provider.status} (${provider.latencyMs}ms)`);
    }
    lines.push("");
    if (observed.length > 0) {
        lines.push("OBSERVED FACTS (retrieved from providers):");
        for (const item of observed.slice(0, 12)) {
            lines.push(`  - ${item.observation}`);
        }
        lines.push("");
    }
    else {
        lines.push("OBSERVED FACTS: none were retrieved; no provider returned data.");
        lines.push("");
    }
    if (signals.length > 0) {
        lines.push("AGGREGATE AND GEOGRAPHIC SIGNALS (never individual intent):");
        for (const item of signals.slice(0, 8)) {
            lines.push(`  - ${item.observation}`);
        }
        lines.push("");
    }
    const reviewable = entities.filter((e) => e.status !== "DISTINCT");
    if (reviewable.length > 0) {
        lines.push("ENTITY RESOLUTION:");
        for (const entity of reviewable) {
            lines.push(`  - ${entity.candidate.name}: ${entity.status} (corroboration: ${entity.corroboration.join(", ") || "none"})`);
        }
        lines.push("");
    }
    if (gaps.length > 0) {
        lines.push("EXPLICITLY UNAVAILABLE (do not estimate or invent these):");
        for (const gap of gaps) {
            lines.push(`  - ${gap.observation}`);
        }
    }
    return lines.join("\n");
}
