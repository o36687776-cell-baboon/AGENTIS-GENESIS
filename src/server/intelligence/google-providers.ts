import type {
  GeocodeResult,
  PlaceResult,
  SearchResultItem,
  TrendsSignal,
} from "./types";

/**
 * Google-side provider implementations for ROCKERFELLER.
 *
 * Every provider is integration-ready but credential-gated. When no credential
 * is configured the provider reports UNAVAILABLE and returns no data. It never
 * synthesises a result to fill the gap, because a fabricated search ranking or
 * place listing would be indistinguishable from a real one once it reached a
 * Work Tree artifact.
 */

export interface GoogleCredentials {
  apiKey: string;
}

export type CredentialResolver = () => Promise<GoogleCredentials | null>;

async function googleGet<T>(url: string, apiKey: string): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}key=${encodeURIComponent(apiKey)}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${response.statusText} ${body.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

type CallOutcome<T> = {
  data?: T;
  error?: string;
  unauthorized?: boolean;
  latencyMs: number;
};

async function call<T>(
  credential: GoogleCredentials | null,
  run: (apiKey: string) => Promise<T>
): Promise<CallOutcome<T>> {
  if (!credential) {
    return { error: "No Google credential is configured", latencyMs: 0 };
  }
  const started = Date.now();
  try {
    const data = await run(credential.apiKey);
    return { data, latencyMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider call failed";
    return {
      error: message,
      unauthorized: /\b40[13]\b|unauthor|forbidden|permission|api key not valid/i.test(message),
      latencyMs: Date.now() - started,
    };
  }
}

function statusOf<T>(outcome: CallOutcome<T>): "AVAILABLE" | "UNAUTHORIZED" | "FAILED" {
  if (outcome.data) return "AVAILABLE";
  return outcome.unauthorized ? "UNAUTHORIZED" : "FAILED";
}

interface CustomSearchResponse {
  items?: Array<{ title?: string; link?: string; snippet?: string }>;
}

export function createSearchProvider(providerName: string, resolveCredential: CredentialResolver) {
  return {
    name: providerName,
    async search(query: string, options?: { limit?: number; geo?: string }) {
      const credential = await resolveCredential();
      const outcome = await call<SearchResultItem[]>(credential, async (apiKey) => {
        const params = new URLSearchParams({ q: query, num: String(options?.limit || 10) });
        if (options?.geo) params.set("cr", options.geo);
        const payload = await googleGet<CustomSearchResponse>(
          `https://customsearch.googleapis.com/v1?${params.toString()}`,
          apiKey
        );
        return (payload.items || []).map((item, index) => ({
          title: item.title || "",
          link: item.link || "",
          snippet: item.snippet,
          rank: index + 1,
        }));
      });

      return {
        provider: providerName,
        operation: "search",
        status: outcome.data ? "AVAILABLE" : statusOf(outcome),
        latencyMs: outcome.latencyMs,
        data: outcome.data,
        error: outcome.error,
      };
    },
  };
}

interface PlacesTextResponse {
  results?: Array<{
    place_id?: string;
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    types?: string[];
  }>;
}

interface PlacesDetailResponse {
  result?: {
    place_id?: string;
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    website?: string;
    types?: string[];
    primary_type?: string;
  };
  html_attributions?: string[];
}

export function createPlacesProvider(providerName: string, resolveCredential: CredentialResolver) {
  return {
    name: providerName,
    async searchPlaces(textQuery: string, options?: { limit?: number }) {
      const credential = await resolveCredential();
      const outcome = await call<PlaceResult[]>(credential, async (apiKey) => {
        const payload = await googleGet<PlacesTextResponse>(
          `https://places.googleapis.com/v1/places:searchText?maxResultCount=${options?.limit || 10}`,
          apiKey
        );
        return (payload.results || []).map((place) => ({
          placeId: place.place_id || "",
          name: place.name || "",
          address: place.formatted_address,
          location: place.geometry?.location
            ? { latitude: place.geometry.location.lat, longitude: place.geometry.location.lng }
            : undefined,
          types: place.types,
          primaryType: place.types?.[0],
        }));
      });

      return {
        provider: providerName,
        operation: "places.search",
        status: outcome.data ? "AVAILABLE" : statusOf(outcome),
        latencyMs: outcome.latencyMs,
        data: outcome.data,
        error: outcome.error,
      };
    },

    async placeDetails(placeId: string, options?: { fields?: string[] }) {
      const credential = await resolveCredential();
      // Only the fields the intelligence pass actually consumes are requested.
      const fields = (options?.fields || [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "websiteUri",
        "primaryType",
        "types",
      ]).join(",");

      const outcome = await call<PlaceResult>(credential, async (apiKey) => {
        const payload = await googleGet<PlacesDetailResponse>(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fieldMask=${encodeURIComponent(fields)}`,
          apiKey
        );
        const place = payload.result;
        if (!place) throw new Error("Place details were empty");
        return {
          placeId: place.place_id || placeId,
          name: place.name || "",
          address: place.formatted_address,
          location: place.geometry?.location
            ? { latitude: place.geometry.location.lat, longitude: place.geometry.location.lng }
            : undefined,
          website: place.website,
          types: place.types,
          primaryType: place.primary_type,
        };
      });

      return {
        provider: providerName,
        operation: "places.details",
        status: outcome.data ? "AVAILABLE" : statusOf(outcome),
        latencyMs: outcome.latencyMs,
        data: outcome.data,
        error: outcome.error,
      };
    },
  };
}

interface GeocodeResponse {
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    place_id?: string;
  }>;
}

export function createGeocodingProvider(providerName: string, resolveCredential: CredentialResolver) {
  return {
    name: providerName,
    async geocode(address: string) {
      const credential = await resolveCredential();
      const outcome = await call<GeocodeResult>(credential, async (apiKey) => {
        const payload = await googleGet<GeocodeResponse>(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
          apiKey
        );
        const first = payload.results?.[0];
        if (!first) throw new Error("No geocoding match");
        return {
          formattedAddress: first.formatted_address || address,
          latitude: first.geometry?.location?.lat ?? 0,
          longitude: first.geometry?.location?.lng ?? 0,
          placeId: first.place_id,
        };
      });

      return {
        provider: providerName,
        operation: "geocode",
        status: outcome.data ? "AVAILABLE" : statusOf(outcome),
        latencyMs: outcome.latencyMs,
        data: outcome.data,
        error: outcome.error,
      };
    },
  };
}

export function createTrendsProvider(providerName: string, resolveCredential: CredentialResolver) {
  return {
    name: providerName,
    async interest(terms: string[], options?: { geo?: string; timeframe?: string }) {
      const credential = await resolveCredential();
      const outcome = await call<TrendsSignal[]>(credential, async (apiKey) => {
        const payload = await googleGet<{ interest?: Array<{ term: string; score: number }> }>(
          `https://trends.googleapis.com/v1/trends?terms=${encodeURIComponent(terms.join(","))}${
            options?.geo ? `&geo=${encodeURIComponent(options.geo)}` : ""
          }`,
          apiKey
        );
        return (payload.interest || []).map((entry) => ({
          term: entry.term,
          aggregateInterest: entry.score,
          geo: options?.geo,
          timeframe: options?.timeframe,
        }));
      });

      return {
        provider: providerName,
        operation: "trends.interest",
        status: outcome.data ? "AVAILABLE" : statusOf(outcome),
        latencyMs: outcome.latencyMs,
        data: outcome.data,
        error: outcome.error,
      };
    },
  };
}

/**
 * Earth Engine is optional geospatial context and is never required for normal
 * operation. Only availability is modelled: there is deliberately no billing,
 * plan or quota concept anywhere in this provider.
 */
export function createEarthEngineProvider(providerName: string, resolveCredential: CredentialResolver) {
  return {
    name: providerName,
    async status() {
      const started = Date.now();
      const credential = await resolveCredential();
      if (!credential) {
        return {
          provider: providerName,
          operation: "status",
          status: "NOT_REQUIRED" as const,
          latencyMs: Date.now() - started,
          data: { available: false },
        };
      }
      return {
        provider: providerName,
        operation: "status",
        status: "AVAILABLE" as const,
        latencyMs: Date.now() - started,
        data: { available: true },
      };
    },
  };
}