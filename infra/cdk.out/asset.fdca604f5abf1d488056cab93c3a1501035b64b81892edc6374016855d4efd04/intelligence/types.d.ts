/**
 * Evidence and provider contracts for ROCKERFELLER marketing intelligence.
 *
 * The central rule of this module is that an inferred signal is never recorded
 * as an observation. Every finding carries an explicit classification, and
 * every provider call reports its own availability so that an unavailable
 * capability is visible as unavailable rather than silently absent.
 */
/**
 * How much of a finding is actually supported.
 *
 * OBSERVED_FACT              retrieved directly from a provider response
 * PUBLICLY_EXPRESSED_INTENT  a public statement of want, read from published text
 * MARKET_SIGNAL              an aggregate pattern, never an individual
 * GEOGRAPHIC_SIGNAL          a location property, never a person's intent
 * DERIVED_SIGNAL              computed by this system from other findings
 * AGENT_HYPOTHESIS           the model's reasoning, explicitly unproven
 * UNKNOWN_UNVERIFIED         recorded as a gap, with no value invented
 */
export type EvidenceClass = "OBSERVED_FACT" | "PUBLICLY_EXPRESSED_INTENT" | "MARKET_SIGNAL" | "GEOGRAPHIC_SIGNAL" | "DERIVED_SIGNAL" | "AGENT_HYPOTHESIS" | "UNKNOWN_UNVERIFIED";
/**
 * Provider lifecycle. NOT_REQUIRED exists so an optional capability such as
 * Earth Engine can be skipped without being recorded as a failure.
 */
export type ProviderStatus = "AVAILABLE" | "UNAVAILABLE" | "UNAUTHORIZED" | "FAILED" | "NOT_REQUIRED";
export interface ProviderResult<T> {
    provider: string;
    operation: string;
    status: ProviderStatus;
    latencyMs: number;
    data?: T;
    error?: string;
}
export interface Evidence {
    id: string;
    classification: EvidenceClass;
    source: string;
    observation: string;
    /** Set when the value could not be obtained. Never a placeholder number. */
    unavailable?: boolean;
    retrievedAt: string;
}
export interface SearchResultItem {
    title: string;
    link: string;
    snippet?: string;
    rank?: number;
}
export interface PlaceResult {
    placeId: string;
    name: string;
    address?: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    primaryType?: string;
    types?: string[];
    website?: string;
}
export interface GeocodeResult {
    formattedAddress: string;
    latitude: number;
    longitude: number;
    placeId?: string;
}
export interface TrendsSignal {
    term: string;
    geo?: string;
    /** Aggregate interest only. Never attributable to an individual. */
    aggregateInterest?: number;
    timeframe?: string;
    rising?: boolean;
}
export interface SearchProvider {
    readonly name: string;
    search(query: string, options?: {
        limit?: number;
        geo?: string;
    }): Promise<ProviderResult<SearchResultItem[]>>;
}
export interface PlacesProvider {
    readonly name: string;
    searchPlaces(textQuery: string, options?: {
        limit?: number;
    }): Promise<ProviderResult<PlaceResult[]>>;
    placeDetails(placeId: string, options?: {
        fields?: string[];
    }): Promise<ProviderResult<PlaceResult>>;
}
export interface GeocodingProvider {
    readonly name: string;
    geocode(address: string): Promise<ProviderResult<GeocodeResult>>;
}
export interface TrendsProvider {
    readonly name: string;
    interest(terms: string[], options?: {
        geo?: string;
        timeframe?: string;
    }): Promise<ProviderResult<TrendsSignal[]>>;
}
/**
 * Optional geospatial context. It never establishes individual intent, and it
 * carries no notion of plan, billing or quota.
 */
export interface EarthEngineProvider {
    readonly name: string;
    status(): Promise<ProviderResult<{
        available: boolean;
    }>>;
}
export interface MarketingIntelligence {
    evidence: Evidence[];
    providers: Array<{
        name: string;
        status: ProviderStatus;
        operation: string;
        latencyMs: number;
    }>;
    unavailableCapabilities: string[];
    retrievedAt: string;
}
export declare const EVIDENCE_CLASS_LABELS: Record<EvidenceClass, string>;
