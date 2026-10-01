import type { ProviderResult, ProviderStatus } from "../types";
/**
 * ATLAS geospatial contracts.
 *
 * Two rules govern everything in this file. First, a measurement that was not
 * actually retrieved is recorded as absent rather than as a number, because a
 * fabricated area or vegetation index is indistinguishable from a real one once
 * it reaches a Work Tree artifact. Second, every figure carries the provenance
 * required to reproduce it: dataset, temporal window, spatial extent,
 * resolution, method and units.
 */
export declare const ATLAS_AGENT_TYPE = "atlas";
/**
 * Geospatial evidence classes. Deliberately separate from the marketing
 * classes in ../types: a remote-sensing observation carries different
 * provenance requirements from a search result.
 */
export type GeospatialEvidenceClass = "OBSERVED_GEOSPATIAL_FACT" | "REMOTE_SENSING_OBSERVATION" | "MAP_PROVIDER_FACT" | "ROUTE_FACT" | "TEMPORAL_OBSERVATION" | "SPATIAL_STATISTIC" | "DERIVED_GEOSPATIAL_SIGNAL" | "MODEL_PREDICTION" | "AGENT_HYPOTHESIS" | "UNKNOWN_UNVERIFIED";
export interface GeospatialEvidence {
    id: string;
    classification: GeospatialEvidenceClass;
    source: string;
    observation: string;
    dataset?: string;
    /** Acquisition or observation time, when the source reports one. */
    timestamp?: string;
    resolution?: string;
    operation?: string;
    confidence?: string;
    geometry?: GeometryRef;
    /** True when the value could not be obtained. Never carries a number. */
    unavailable?: boolean;
    retrievedAt: string;
}
export type GeometryType = "POINT" | "MULTIPOINT" | "LINESTRING" | "MULTILINESTRING" | "POLYGON" | "MULTIPOLYGON" | "BOUNDING_BOX" | "REGION";
/** GeoJSON-shaped geometry. Standard representation, not an invented format. */
export interface Geometry {
    type: GeometryType;
    /** [lng, lat] for Point, arrays of the same for the other types. */
    coordinates: number | number[] | number[][] | number[][][];
}
export interface GeometryRef {
    type: GeometryType;
    /** Stable identifier so large payloads never travel through Step Functions. */
    geometryId: string;
    /** Human-readable description retained when the payload is elided. */
    summary: string;
}
export interface TemporalWindow {
    start: string;
    end: string;
}
/**
 * The spatial and temporal scope of an ATLAS task. Carried by reference
 * (geometryId) rather than as raw geometry wherever possible so that Step
 * Functions state stays small.
 */
export interface GeospatialScope {
    region?: string;
    boundary?: Geometry;
    points?: Geometry[];
    timeWindow?: TemporalWindow;
    spatialResolution?: string;
    temporalResolution?: string;
}
export interface DatasetDescriptor {
    id: string;
    name: string;
    description?: string;
    /** Temporal availability as reported by the provider. */
    startDate?: string;
    endDate?: string;
    resolution?: string;
    assetCount?: number;
}
export interface ObservationRequest {
    datasetId: string;
    scope: GeospatialScope;
    /** Bounded operation name, for example a zonal reduction. */
    operation: string;
    parameters?: Record<string, string | number | boolean>;
}
/**
 * A statistic is only meaningful with its provenance attached. A bare number
 * is rejected by construction because the type has no way to express one.
 */
export interface SpatialStatistic {
    name: string;
    value: number;
    units: string;
    method: string;
    dataset?: string;
    timeWindow?: TemporalWindow;
    spatialExtent?: string;
    resolution?: string;
    limitations?: string;
}
export interface EarthObservationProvider {
    readonly name: string;
    /** Discovers datasets matching a capability need. Never a hardcoded list. */
    discoverDatasets(capability: string, options?: {
        limit?: number;
    }): Promise<ProviderResult<DatasetDescriptor[]>>;
    /** Describes one dataset so its real availability can be verified. */
    describeDataset(datasetId: string): Promise<ProviderResult<DatasetDescriptor>>;
    /** Runs one bounded observation or reduction over a scope. */
    observe(request: ObservationRequest): Promise<ProviderResult<ObservationResult>>;
}
export interface ObservationResult {
    datasetId: string;
    operation: string;
    geometryRef?: GeometryRef;
    statistics: SpatialStatistic[];
    /** Values returned by the provider. Empty when nothing was retrieved. */
    values: Record<string, number>;
    timeWindow?: TemporalWindow;
    resolution?: string;
}
export interface AtlasLimits {
    maxDatasets: number;
    maxProviderCalls: number;
    maxAnalyses: number;
    maxTemporalRangeDays: number;
    maxOperationRetries: number;
    maxSpatialExtentDegrees: number;
}
export interface AtlasIntelligence {
    evidence: GeospatialEvidence[];
    datasetsConsidered: DatasetDescriptor[];
    datasetsUnavailable: string[];
    statistics: SpatialStatistic[];
    providers: Array<{
        name: string;
        status: ProviderStatus;
        operation: string;
        latencyMs: number;
    }>;
    unavailableCapabilities: string[];
    retrievedAt: string;
}
/**
 * Guardrails from the ATLAS directive. These bound cost and blast radius; they
 * are enforced in code rather than left as guidance.
 */
export declare const DEFAULT_ATLAS_LIMITS: AtlasLimits;
export declare function geometryKey(geometry: Geometry): string;
export declare function describeGeometry(geometry: Geometry | undefined): string;
/**
 * Rough bounding extent in degrees, used only to refuse a scope that is far
 * too large for a bounded single-task analysis.
 */
export declare function geometryExtentDegrees(geometry: Geometry): number;
