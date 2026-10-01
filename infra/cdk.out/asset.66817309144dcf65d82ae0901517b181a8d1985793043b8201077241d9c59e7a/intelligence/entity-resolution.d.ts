import type { PlaceResult } from "./types";
/**
 * Entity resolution for ROCKERFELLER.
 *
 * Two businesses with similar names are not the same business. Resolution here
 * is deliberately conservative: a candidate pair only reaches MERGED when a
 * strong identifier matches. Everything else is reported as a distinct entity
 * or as needing review, never silently collapsed.
 */
export interface EntityCandidate {
    name: string;
    domain?: string;
    placeId?: string;
    address?: string;
    website?: string;
    latitude?: number;
    longitude?: number;
}
export interface EntityResolution {
    key: string;
    candidate: EntityCandidate;
    matches: string[];
    /** Identifiers that agreed. An empty list means the record stands alone. */
    corroboration: string[];
    status: "CONFIRMED" | "DISTINCT" | "NEEDS_REVIEW";
    confidence: number;
}
export declare function normalizeName(name: string): string;
export declare function resolveEntities(candidates: EntityCandidate[]): EntityResolution[];
export declare function candidateFromPlace(place: PlaceResult): EntityCandidate;
