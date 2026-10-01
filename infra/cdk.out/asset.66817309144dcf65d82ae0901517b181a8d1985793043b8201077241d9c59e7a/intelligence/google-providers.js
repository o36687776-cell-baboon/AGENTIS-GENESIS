"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSearchProvider = createSearchProvider;
exports.createPlacesProvider = createPlacesProvider;
exports.createGeocodingProvider = createGeocodingProvider;
exports.createTrendsProvider = createTrendsProvider;
exports.createEarthEngineProvider = createEarthEngineProvider;
async function googleGet(url, apiKey) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}key=${encodeURIComponent(apiKey)}`, {
        headers: { Accept: "application/json" },
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status} ${response.statusText} ${body.slice(0, 200)}`);
    }
    return (await response.json());
}
async function call(credential, run) {
    if (!credential) {
        return { error: "No Google credential is configured", latencyMs: 0 };
    }
    const started = Date.now();
    try {
        const data = await run(credential.apiKey);
        return { data, latencyMs: Date.now() - started };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Provider call failed";
        return {
            error: message,
            unauthorized: /\b40[13]\b|unauthor|forbidden|permission|api key not valid/i.test(message),
            latencyMs: Date.now() - started,
        };
    }
}
function statusOf(outcome) {
    if (outcome.data)
        return "AVAILABLE";
    return outcome.unauthorized ? "UNAUTHORIZED" : "FAILED";
}
function createSearchProvider(providerName, resolveCredential) {
    return {
        name: providerName,
        async search(query, options) {
            const credential = await resolveCredential();
            const outcome = await call(credential, async (apiKey) => {
                const params = new URLSearchParams({ q: query, num: String(options?.limit || 10) });
                if (options?.geo)
                    params.set("cr", options.geo);
                const payload = await googleGet(`https://customsearch.googleapis.com/v1?${params.toString()}`, apiKey);
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
function createPlacesProvider(providerName, resolveCredential) {
    return {
        name: providerName,
        async searchPlaces(textQuery, options) {
            const credential = await resolveCredential();
            const outcome = await call(credential, async (apiKey) => {
                const payload = await googleGet(`https://places.googleapis.com/v1/places:searchText?maxResultCount=${options?.limit || 10}`, apiKey);
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
        async placeDetails(placeId, options) {
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
            const outcome = await call(credential, async (apiKey) => {
                const payload = await googleGet(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fieldMask=${encodeURIComponent(fields)}`, apiKey);
                const place = payload.result;
                if (!place)
                    throw new Error("Place details were empty");
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
function createGeocodingProvider(providerName, resolveCredential) {
    return {
        name: providerName,
        async geocode(address) {
            const credential = await resolveCredential();
            const outcome = await call(credential, async (apiKey) => {
                const payload = await googleGet(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}`, apiKey);
                const first = payload.results?.[0];
                if (!first)
                    throw new Error("No geocoding match");
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
function createTrendsProvider(providerName, resolveCredential) {
    return {
        name: providerName,
        async interest(terms, options) {
            const credential = await resolveCredential();
            const outcome = await call(credential, async (apiKey) => {
                const payload = await googleGet(`https://trends.googleapis.com/v1/trends?terms=${encodeURIComponent(terms.join(","))}${options?.geo ? `&geo=${encodeURIComponent(options.geo)}` : ""}`, apiKey);
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
function createEarthEngineProvider(providerName, resolveCredential) {
    return {
        name: providerName,
        async status() {
            const started = Date.now();
            const credential = await resolveCredential();
            if (!credential) {
                return {
                    provider: providerName,
                    operation: "status",
                    status: "NOT_REQUIRED",
                    latencyMs: Date.now() - started,
                    data: { available: false },
                };
            }
            return {
                provider: providerName,
                operation: "status",
                status: "AVAILABLE",
                latencyMs: Date.now() - started,
                data: { available: true },
            };
        },
    };
}
