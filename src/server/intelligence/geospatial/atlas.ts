import { createHash } from "crypto";
import { resolveGoogleCredential } from "../rockefeller";
import type { ProviderStatus } from "../types";
import { createEarthObservationProvider, describeScope } from "./earth-engine";
import {
  DEFAULT_ATLAS_LIMITS,
  geometryExtentDegrees,
  type AtlasIntelligence,
  type AtlasLimits,
  type DatasetDescriptor,
  type GeospatialEvidence,
  type GeospatialScope,
  type SpatialStatistic,
} from "./types";

/**
 * The ATLAS analysis pass.
 *
 * Stage order follows cost: dataset discovery is cheap and runs first, data
 * selection is bounded to what discovery actually returned, and only then is a
 * single reduction attempted. A scope that exceeds the configured extent or
 * temporal range is refused rather than silently downgraded, because silently
 * reducing the analysis would change the meaning of the answer.
 */

let evidenceCounter = 0;

function nextEvidenceId(): string {
  evidenceCounter += 1;
  return `geo-${Date.now().toString(36)}-${evidenceCounter}`;
}

function record(
  classification: GeospatialEvidence["classification"],
  source: string,
  observation: string,
  extra: Partial<GeospatialEvidence> = {}
): GeospatialEvidence {
  return {
    id: nextEvidenceId(),
    classification,
    source,
    observation,
    retrievedAt: new Date().toISOString(),
    ...extra,
  };
}

export interface AtlasOptions {
  objective: string;
  scope?: GeospatialScope;
  limits?: AtlasLimits;
}

/** Stable identifier so geometry never needs to travel in workflow state. */
export function geometryIdFor(scope: GeospatialScope | undefined): string | null {
  if (!scope?.boundary) return null;
  return `geom-${createHash("sha256")
    .update(JSON.stringify(scope.boundary))
    .digest("hex")
    .slice(0, 16)}`;
}

export function parseScope(context: unknown): GeospatialScope | undefined {
  if (!context || typeof context !== "object") return undefined;
  const record = context as Record<string, unknown>;
  const scope = (record.geospatialScope || record.scope) as GeospatialScope | undefined;

  if (!scope || typeof scope !== "object") return undefined;

  return scope;
}

function scopeWithinLimits(scope: GeospatialScope | undefined, limits: AtlasLimits): string | null {
  if (!scope) return null;

  if (scope.boundary) {
    const extent = geometryExtentDegrees(scope.boundary);
    if (extent > limits.maxSpatialExtentDegrees) {
      return `Requested extent of ${extent.toFixed(2)} degrees exceeds the ATLAS task limit of ${limits.maxSpatialExtentDegrees} degrees. Narrow the boundary and resubmit.`;
    }
  }

  if (scope.timeWindow) {
    const start = Date.parse(scope.timeWindow.start);
    const end = Date.parse(scope.timeWindow.end);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return "The supplied time window is not a valid date range.";
    }
    if (end < start) {
      return "The supplied time window ends before it begins.";
    }
    const days = (end - start) / (1000 * 60 * 60 * 24);
    if (days > limits.maxTemporalRangeDays) {
      return `Requested range of ${Math.round(days)} days exceeds the ATLAS task limit of ${limits.maxTemporalRangeDays} days.`;
    }
  }

  return null;
}

export async function gatherAtlasIntelligence(options: AtlasOptions): Promise<AtlasIntelligence> {
  const limits = options.limits || DEFAULT_ATLAS_LIMITS;
  const provider = createEarthObservationProvider("earth-engine", resolveGoogleCredential, limits);

  const evidence: GeospatialEvidence[] = [];
  const providerReports: AtlasIntelligence["providers"] = [];
  const unavailableCapabilities: string[] = [];
  const datasetsUnavailable: string[] = [];
  const statistics: SpatialStatistic[] = [];
  let providerCalls = 0;

  const report = (name: string, operation: string, status: ProviderStatus, latencyMs: number) => {
    providerReports.push({ name, status, operation, latencyMs });
  };

  const scope = options.scope;
  const limitFailure = scopeWithinLimits(scope, limits);

  if (limitFailure) {
    evidence.push(record("UNKNOWN_UNVERIFIED", "atlas-limits", limitFailure, { unavailable: true }));
  }

  // ---- Stage 1: cheap dataset discovery -----------------------------------
  const datasetsConsidered: DatasetDescriptor[] = [];

  if (limitFailure) {
    // The scope was refused, so no provider is contacted at all.
    unavailableCapabilities.push("dataset discovery (scope refused by limits)");
  } else {
    const capability = deriveCapability(options.objective);
    const discovery = await provider.discoverDatasets(capability, { limit: limits.maxDatasets });
    providerCalls += 1;
    report(provider.name, discovery.operation, discovery.status, discovery.latencyMs);

    if (discovery.status === "AVAILABLE" && discovery.data) {
      for (const dataset of discovery.data) {
        if (datasetsConsidered.length >= limits.maxDatasets) break;
        datasetsConsidered.push(dataset);
        evidence.push(
          record(
            "REMOTE_SENSING_OBSERVATION",
            `${provider.name}:datasets.discover`,
            `Dataset "${dataset.name}" (${dataset.id}) is listed by the provider${
              dataset.startDate || dataset.endDate
                ? ` with coverage reported as ${dataset.startDate || "?"} to ${dataset.endDate || "?"}`
                : ""
            }. Listing indicates catalog presence only, not that the requested extent and window are covered.`,
            {
              dataset: dataset.id,
              operation: "datasets.discover",
              timestamp: dataset.endDate,
            }
          )
        );
      }
    } else if (discovery.status === "UNAUTHORIZED") {
      datasetsUnavailable.push("earth-engine");
      unavailableCapabilities.push(`dataset discovery (${discovery.status})`);
      evidence.push(
        record(
          "UNKNOWN_UNVERIFIED",
          `${provider.name}:datasets.discover`,
          "The configured credential is not authorised for Earth Engine dataset discovery.",
          { unavailable: true }
        )
      );
    } else {
      datasetsUnavailable.push("earth-engine");
      unavailableCapabilities.push(`dataset discovery (${discovery.status})`);
      evidence.push(
        record(
          "UNKNOWN_UNVERIFIED",
          `${provider.name}:datasets.discover`,
          `Dataset discovery did not complete: ${discovery.error || discovery.status}.`,
          { unavailable: true }
        )
      );
    }
  }

  // ---- Stage 2: bounded observation ---------------------------------------
  if (!limitFailure && datasetsConsidered.length > 0 && providerCalls < limits.maxProviderCalls) {
    const dataset = datasetsConsidered[0];
    const observation = await provider.observe({
      datasetId: dataset.id,
      scope: scope || {},
      operation: "zonal_reduction",
    });
    providerCalls += 1;
    report(provider.name, observation.operation, observation.status, observation.latencyMs);

    if (observation.status === "AVAILABLE" && observation.data) {
      const values = observation.data.values || {};
      const measured = Object.keys(values);

      if (measured.length === 0) {
        evidence.push(
          record(
            "UNKNOWN_UNVERIFIED",
            `${provider.name}:${observation.operation}`,
            `The provider accepted the request over ${describeScope(scope || {})} but returned no measured values, so no statistic is reported.`,
            {
              dataset: dataset.id,
              operation: observation.operation,
              geometry: geometryIdFor(scope)
                ? { type: "REGION", geometryId: geometryIdFor(scope)!, summary: describeScope(scope || {}) }
                : undefined,
              unavailable: true,
            }
          )
        );
      } else {
        for (const [name, value] of Object.entries(values)) {
          const statistic: SpatialStatistic = {
            name,
            value,
            units: "unspecified",
            method: observation.operation,
            dataset: dataset.id,
            timeWindow: scope?.timeWindow,
            spatialExtent: describeScope(scope || {}),
            resolution: observation.data?.resolution,
            limitations: "Value reported by the provider without an independent verification step.",
          };
          statistics.push(statistic);
          evidence.push(
            record(
              "SPATIAL_STATISTIC",
              `${provider.name}:${observation.operation}`,
              `${name} = ${value} ${statistic.units} for ${statistic.dataset} over ${statistic.spatialExtent}${
                scope?.timeWindow ? ` (${scope.timeWindow.start} to ${scope.timeWindow.end})` : ""
              }.`,
              {
                dataset: dataset.id,
                operation: observation.operation,
                timestamp: scope?.timeWindow?.end,
                resolution: statistic.resolution,
              }
            )
          );
        }
      }
    } else {
      datasetsUnavailable.push(dataset.id);
      unavailableCapabilities.push(`observation (${observation.status})`);
      evidence.push(
        record(
          "UNKNOWN_UNVERIFIED",
          `${provider.name}:${observation.operation}`,
          `The bounded observation did not complete: ${observation.error || observation.status}.`,
          { unavailable: true, dataset: dataset.id }
        )
      );
    }
  }

  // ---- Explicit gaps -------------------------------------------------------
  // Measurements that were not collected are named, so no downstream reader can
  // mistake their absence for a zero.
  const uncollected = [
    "per-pixel imagery",
    "crop type classification",
    "crop health or yield estimate",
    "vegetation index",
    "surface water extent",
    "elevation profile",
    "route or travel time",
    "change magnitude or significance",
  ];

  if (statistics.length === 0) {
    for (const metric of uncollected) {
      evidence.push(
        record("UNKNOWN_UNVERIFIED", "provider-availability", `${metric}: not measured in this execution.`, {
          unavailable: true,
        })
      );
    }
  }

  // Optional geospatial context is recorded without being required.
  const availability = await provider.discoverDatasets("earth-observation", { limit: 1 });
  providerCalls += 1;
  report(provider.name, availability.operation, availability.status, availability.latencyMs);

  return {
    evidence,
    datasetsConsidered,
    datasetsUnavailable,
    statistics,
    providers: providerReports,
    unavailableCapabilities,
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Derives a dataset capability keyword from the objective. This is a coarse
 * first filter only; the provider performs the real matching, and a poor match
 * yields fewer or no datasets rather than a fabricated one.
 */
function deriveCapability(objective: string): string {
  const lower = objective.toLowerCase();
  const hints: Array<[RegExp, string]> = [
    [/vegetation|ndvi|crop|plant|forest/, "vegetation"],
    [/water|flood|river|lake|surface.water/, "surface_water"],
    [/land.?cover|land.?use|classif/, "land_cover"],
    [/elevation|terrain|topograph/, "elevation"],
    [/urban|city|built.?up|infrastructure/, "built_up"],
    [/climate|temperature|precipitation|weather/, "climate"],
    [/satellite|imagery|image/, "satellite_imagery"],
  ];

  for (const [pattern, capability] of hints) {
    if (pattern.test(lower)) return capability;
  }
  return "satellite_imagery";
}

export function buildAtlasGroundingContext(intelligence: AtlasIntelligence, objective: string): string {
  const lines: string[] = [];
  const measured = intelligence.evidence.filter((entry) => !entry.unavailable);
  const gaps = intelligence.evidence.filter((entry) => entry.unavailable);

  lines.push(`ATLAS GEOSPATIAL EVIDENCE CONTEXT for objective: ${objective}`);
  lines.push("");

  lines.push("Provider availability:");
  for (const provider of intelligence.providers) {
    lines.push(`  - ${provider.name}.${provider.operation}: ${provider.status} (${provider.latencyMs}ms)`);
  }
  lines.push("");

  if (intelligence.datasetsConsidered.length > 0) {
    lines.push("DATASETS CONSIDERED (catalog presence, not extent coverage):");
    for (const dataset of intelligence.datasetsConsidered) {
      lines.push(`  - ${dataset.name} [${dataset.id}]`);
    }
    lines.push("");
  } else {
    lines.push("DATASETS CONSIDERED: none were returned by dataset discovery.");
    lines.push("");
  }

  if (measured.length > 0) {
    lines.push("MEASURED EVIDENCE (each with its provenance):");
    for (const entry of measured.slice(0, 12)) {
      lines.push(`  - [${entry.classification}] ${entry.observation}`);
    }
    lines.push("");
  }

  if (gaps.length > 0) {
    lines.push("NOT MEASURED / UNVERIFIED (never estimate these):");
    for (const gap of gaps.slice(0, 12)) {
      lines.push(`  - ${gap.observation}`);
    }
  }

  return lines.join("\n");
}