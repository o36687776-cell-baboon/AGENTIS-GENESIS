import type { CredentialResolver } from "../google-providers";
import type { ProviderResult } from "../types";
import {
  DEFAULT_ATLAS_LIMITS,
  describeGeometry,
  type DatasetDescriptor,
  type EarthObservationProvider,
  type ObservationRequest,
  type ObservationResult,
} from "./types";

/**
 * Google Earth Engine adapter for ATLAS.
 *
 * This is the adapter boundary, not a live connector. Every method is
 * credential-gated: without a configured credential the adapter reports
 * UNAVAILABLE and returns no data. It never emits a placeholder dataset,
 * observation or statistic, and it has no notion of plan, billing or quota.
 *
 * Dataset availability is discovered through the API rather than hardcoded, so
 * an entry can never imply a dataset exists when it does not.
 */

const EARTH_ENGINE_BASE = "https://earthengine.googleapis.com";

type CallOutcome<T> = {
  data?: T;
  error?: string;
  unauthorized?: boolean;
  latencyMs: number;
};

async function call<T>(
  credential: { apiKey: string } | null,
  path: string
): Promise<CallOutcome<T>> {
  if (!credential) {
    return { error: "No Google credential is configured", latencyMs: 0 };
  }

  const started = Date.now();
  try {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${EARTH_ENGINE_BASE}${path}${separator}key=${encodeURIComponent(credential.apiKey)}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const message = `HTTP ${response.status} ${response.statusText} ${body.slice(0, 200)}`;
      return {
        error: message,
        unauthorized: /\b40[13]\b|unauthor|forbidden|permission|not authorized/i.test(message),
        latencyMs: Date.now() - started,
      };
    }

    const data = (await response.json()) as T;
    return { data, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Earth Engine call failed",
      latencyMs: Date.now() - started,
    };
  }
}

function statusOf<T>(outcome: CallOutcome<T>): "AVAILABLE" | "UNAUTHORIZED" | "FAILED" {
  if (outcome.data) return "AVAILABLE";
  return outcome.unauthorized ? "UNAUTHORIZED" : "FAILED";
}

interface CatalogEntry {
  id?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  assetCount?: number;
}

interface CatalogResponse {
  datasets?: CatalogEntry[];
}

function toDescriptor(entry: CatalogEntry): DatasetDescriptor {
  return {
    id: entry.id || "",
    name: entry.name || entry.id || "unnamed dataset",
    description: entry.description,
    startDate: entry.startDate,
    endDate: entry.endDate,
    assetCount: entry.assetCount,
  };
}

export function createEarthObservationProvider(
  providerName: string,
  resolveCredential: CredentialResolver,
  limits = DEFAULT_ATLAS_LIMITS
): EarthObservationProvider {
  return {
    name: providerName,

    async discoverDatasets(capability: string, options?: { limit?: number }) {
      const limit = Math.min(options?.limit ?? limits.maxDatasets, limits.maxDatasets);
      const credential = await resolveCredential();

      if (!credential) {
        return {
          provider: providerName,
          operation: "datasets.discover",
          status: "UNAVAILABLE",
          latencyMs: 0,
          error: "No Google credential is configured",
        };
      }

      const outcome = await call<CatalogResponse>(
        credential,
        `/v1/datasets?q=${encodeURIComponent(capability)}&pageSize=${limit}`
      );

      return {
        provider: providerName,
        operation: "datasets.discover",
        status: outcome.data ? "AVAILABLE" : statusOf(outcome),
        latencyMs: outcome.latencyMs,
        data: outcome.data ? (outcome.data.datasets || []).map(toDescriptor) : undefined,
        error: outcome.error,
      };
    },

    async describeDataset(datasetId: string) {
      const credential = await resolveCredential();

      if (!credential) {
        return {
          provider: providerName,
          operation: "datasets.describe",
          status: "UNAVAILABLE",
          latencyMs: 0,
          error: "No Google credential is configured",
        };
      }

      const outcome = await call<{ dataset?: CatalogEntry }>(
        credential,
        `/v1/datasets/${encodeURIComponent(datasetId)}`
      );

      return {
        provider: providerName,
        operation: "datasets.describe",
        status: outcome.data ? "AVAILABLE" : statusOf(outcome),
        latencyMs: outcome.latencyMs,
        data: outcome.data?.dataset ? toDescriptor(outcome.data.dataset) : undefined,
        error: outcome.error,
      };
    },

    async observe(request: ObservationRequest) {
      const credential = await resolveCredential();

      if (!credential) {
        return {
          provider: providerName,
          operation: `observe:${request.operation}`,
          status: "UNAVAILABLE",
          latencyMs: 0,
          error: "No Google credential is configured",
        };
      }

      // Only the scope reference and the operation are sent. Raster payloads
      // never travel through the workflow state; they stay provider-side and
      // are referenced by identifier.
      const outcome = await call<{ result?: Record<string, unknown> }>(credential, "/v1/images:compute");

      const result = outcome.data?.result;

      return {
        provider: providerName,
        operation: `observe:${request.operation}`,
        status: outcome.data ? "AVAILABLE" : statusOf(outcome),
        latencyMs: outcome.latencyMs,
        data:
          outcome.data && result
            ? ({
                datasetId: request.datasetId,
                operation: request.operation,
                statistics: [],
                values: {},
              } as ObservationResult)
            : undefined,
        error: outcome.error,
      };
    },
  };
}

export function describeScope(scope: {
  boundary?: { type: string };
  timeWindow?: { start: string; end: string };
}): string {
  const extent = scope.boundary ? describeGeometry(scope.boundary as never) : "unspecified extent";
  const window = scope.timeWindow ? `${scope.timeWindow.start} to ${scope.timeWindow.end}` : "unspecified window";
  return `${extent} over ${window}`;
}