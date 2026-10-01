"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ATLAS_LIMITS = exports.ATLAS_AGENT_TYPE = void 0;
exports.geometryKey = geometryKey;
exports.describeGeometry = describeGeometry;
exports.geometryExtentDegrees = geometryExtentDegrees;
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
exports.ATLAS_AGENT_TYPE = "atlas";
/**
 * Guardrails from the ATLAS directive. These bound cost and blast radius; they
 * are enforced in code rather than left as guidance.
 */
exports.DEFAULT_ATLAS_LIMITS = {
    maxDatasets: 5,
    maxProviderCalls: 12,
    maxAnalyses: 4,
    maxTemporalRangeDays: 3650,
    maxOperationRetries: 2,
    maxSpatialExtentDegrees: 10,
};
function geometryKey(geometry) {
    return JSON.stringify(geometry);
}
function describeGeometry(geometry) {
    if (!geometry)
        return "unspecified extent";
    const countCoordinates = (value) => {
        if (!Array.isArray(value))
            return 0;
        return value.reduce((total, entry) => total + (Array.isArray(entry) ? countCoordinates(entry) : 1), 0);
    };
    return `${geometry.type} with ${countCoordinates(geometry.coordinates)} coordinate(s)`;
}
/**
 * Rough bounding extent in degrees, used only to refuse a scope that is far
 * too large for a bounded single-task analysis.
 */
function geometryExtentDegrees(geometry) {
    const lats = [];
    const lngs = [];
    const walk = (value, depth) => {
        if (!Array.isArray(value))
            return;
        if (depth === 0 && typeof value[0] === "number" && typeof value[1] === "number") {
            lngs.push(value[0]);
            lats.push(value[1]);
            return;
        }
        value.forEach((entry) => walk(entry, depth - 1));
    };
    if (typeof geometry.coordinates === "number")
        return 0;
    const depth = geometry.type === "POINT" ? 1 : geometry.type === "LINESTRING" || geometry.type === "MULTIPOINT" ? 1 : 2;
    walk(geometry.coordinates, depth);
    if (!lats.length || !lngs.length)
        return Number.POSITIVE_INFINITY;
    return Math.max(...lats) - Math.min(...lats) + (Math.max(...lngs) - Math.min(...lngs));
}
