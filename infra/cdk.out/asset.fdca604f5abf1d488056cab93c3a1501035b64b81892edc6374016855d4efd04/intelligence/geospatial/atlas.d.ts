import { type AtlasIntelligence, type AtlasLimits, type GeospatialScope } from "./types";
export interface AtlasOptions {
    objective: string;
    scope?: GeospatialScope;
    limits?: AtlasLimits;
}
/** Stable identifier so geometry never needs to travel in workflow state. */
export declare function geometryIdFor(scope: GeospatialScope | undefined): string | null;
export declare function parseScope(context: unknown): GeospatialScope | undefined;
export declare function gatherAtlasIntelligence(options: AtlasOptions): Promise<AtlasIntelligence>;
export declare function buildAtlasGroundingContext(intelligence: AtlasIntelligence, objective: string): string;
