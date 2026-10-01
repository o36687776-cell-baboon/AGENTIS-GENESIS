import { type CredentialResolver, type GoogleCredentials } from "./google-providers";
import { type EntityResolution } from "./entity-resolution";
import type { MarketingIntelligence } from "./types";
/**
 * ROCKERFELLER's intelligence pass.
 *
 * Cost ordering is deliberate and matches the Genesis execution discipline:
 * cheap discovery runs first, enrichment targets only what discovery found,
 * corroboration checks the strongest candidates, and the expensive analysis is
 * left to Bedrock with the evidence already assembled. Identical queries are
 * never repeated within a single pass.
 */
export declare const ROCKERFELLER_AGENT_TYPE = "rockefeller";
/**
 * Reads the Google marketing credential from Secrets Manager. The credential is
 * never logged, never returned to a prompt, and never written to an artifact.
 * An absent secret yields null, which makes every provider report UNAVAILABLE.
 */
export declare function resolveGoogleCredential(): Promise<GoogleCredentials | null>;
export declare function resetGoogleCredentialCache(): void;
export declare function buildProviders(resolveCredential: CredentialResolver): {
    search: {
        name: string;
        search(query: string, options?: {
            limit?: number;
            geo?: string;
        }): Promise<{
            provider: string;
            operation: string;
            status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
            latencyMs: number;
            data: import("./types").SearchResultItem[] | undefined;
            error: string | undefined;
        }>;
    };
    places: {
        name: string;
        searchPlaces(textQuery: string, options?: {
            limit?: number;
        }): Promise<{
            provider: string;
            operation: string;
            status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
            latencyMs: number;
            data: import("./types").PlaceResult[] | undefined;
            error: string | undefined;
        }>;
        placeDetails(placeId: string, options?: {
            fields?: string[];
        }): Promise<{
            provider: string;
            operation: string;
            status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
            latencyMs: number;
            data: import("./types").PlaceResult | undefined;
            error: string | undefined;
        }>;
    };
    geocoding: {
        name: string;
        geocode(address: string): Promise<{
            provider: string;
            operation: string;
            status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
            latencyMs: number;
            data: import("./types").GeocodeResult | undefined;
            error: string | undefined;
        }>;
    };
    trends: {
        name: string;
        interest(terms: string[], options?: {
            geo?: string;
            timeframe?: string;
        }): Promise<{
            provider: string;
            operation: string;
            status: "FAILED" | "UNAUTHORIZED" | "AVAILABLE";
            latencyMs: number;
            data: import("./types").TrendsSignal[] | undefined;
            error: string | undefined;
        }>;
    };
    earthEngine: {
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
};
export interface RockefellerOptions {
    objective: string;
    /** Optional narrowing such as a country, used for geographic context. */
    geo?: string;
    /** Bounded so a single task cannot fan out into unbounded provider calls. */
    maxEnrichments?: number;
}
export interface RockefellerResult {
    intelligence: MarketingIntelligence;
    entities: EntityResolution[];
    /** Compact block handed to Bedrock as grounding context. */
    context: string;
}
/**
 * Derives search queries from the objective once. Repeated identical searches
 * are never issued, which keeps both cost and quota pressure bounded.
 */
export declare function buildQueries(objective: string): string[];
export declare function gatherMarketingIntelligence(options: RockefellerOptions): Promise<RockefellerResult>;
export declare function buildGroundingContext(intelligence: MarketingIntelligence, entities: EntityResolution[], objective: string): string;
