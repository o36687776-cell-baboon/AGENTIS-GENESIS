import type { CredentialResolver } from "../google-providers";
import { type EarthObservationProvider } from "./types";
export declare function createEarthObservationProvider(providerName: string, resolveCredential: CredentialResolver, limits?: import("./types").AtlasLimits): EarthObservationProvider;
export declare function describeScope(scope: {
    boundary?: {
        type: string;
    };
    timeWindow?: {
        start: string;
        end: string;
    };
}): string;
