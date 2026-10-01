import type { GeocodeResult, PlaceResult, SearchResultItem, TrendsSignal } from "./types";
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
export declare function createSearchProvider(providerName: string, resolveCredential: CredentialResolver): {
    name: string;
    search(query: string, options?: {
        limit?: number;
        geo?: string;
    }): Promise<{
        provider: string;
        operation: string;
        status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
        latencyMs: number;
        data: SearchResultItem[] | undefined;
        error: string | undefined;
    }>;
};
export declare function createPlacesProvider(providerName: string, resolveCredential: CredentialResolver): {
    name: string;
    searchPlaces(textQuery: string, options?: {
        limit?: number;
    }): Promise<{
        provider: string;
        operation: string;
        status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
        latencyMs: number;
        data: PlaceResult[] | undefined;
        error: string | undefined;
    }>;
    placeDetails(placeId: string, options?: {
        fields?: string[];
    }): Promise<{
        provider: string;
        operation: string;
        status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
        latencyMs: number;
        data: PlaceResult | undefined;
        error: string | undefined;
    }>;
};
export declare function createGeocodingProvider(providerName: string, resolveCredential: CredentialResolver): {
    name: string;
    geocode(address: string): Promise<{
        provider: string;
        operation: string;
        status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
        latencyMs: number;
        data: GeocodeResult | undefined;
        error: string | undefined;
    }>;
};
export declare function createTrendsProvider(providerName: string, resolveCredential: CredentialResolver): {
    name: string;
    interest(terms: string[], options?: {
        geo?: string;
        timeframe?: string;
    }): Promise<{
        provider: string;
        operation: string;
        status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
        latencyMs: number;
        data: TrendsSignal[] | undefined;
        error: string | undefined;
    }>;
};
/**
 * Earth Engine is optional geospatial context and is never required for normal
 * operation. Only availability is modelled: there is deliberately no billing,
 * plan or quota concept anywhere in this provider.
 */
export declare function createEarthEngineProvider(providerName: string, resolveCredential: CredentialResolver): {
    name: string;
    status(): Promise<{
        provider: string;
        operation: string;
        status: "NOT_REQUIRED";
        latencyMs: number;
        data: {
            available: boolean;
        };
    } | {
        provider: string;
        operation: string;
        status: "AVAILABLE";
        latencyMs: number;
        data: {
            available: boolean;
        };
    }>;
};
