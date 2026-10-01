"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeName = normalizeName;
exports.resolveEntities = resolveEntities;
exports.candidateFromPlace = candidateFromPlace;
function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\b(inc|ltd|llc|limited|corp|corporation|co|company|group|holdings)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function normalizeDomain(domainOrUrl) {
    if (!domainOrUrl)
        return null;
    const trimmed = domainOrUrl.trim().toLowerCase();
    if (!trimmed)
        return null;
    const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const host = new URL(withProtocol).hostname.replace(/^www\./, "");
        return host || null;
    }
    catch {
        return null;
    }
}
function distanceKm(a, b) {
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
        return null;
    }
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
/**
 * A strong identifier is one that cannot plausibly collide: a place ID, an
 * exact domain, or a coordinate pair within roughly 100 metres.
 */
function strongAgreement(a, b) {
    const agreements = [];
    if (a.placeId && b.placeId && a.placeId === b.placeId) {
        agreements.push("placeId");
    }
    const domainA = normalizeDomain(a.domain || a.website);
    const domainB = normalizeDomain(b.domain || b.website);
    if (domainA && domainB && domainA === domainB) {
        agreements.push("domain");
    }
    const distance = distanceKm(a, b);
    if (distance !== null && distance <= 0.1) {
        agreements.push("coordinates");
    }
    return agreements;
}
function resolveEntities(candidates) {
    const resolutions = [];
    for (const candidate of candidates) {
        const key = normalizeName(candidate.name) || candidate.placeId || candidate.domain || candidate.name;
        const corroboration = [];
        const matches = [];
        for (const other of resolutions) {
            const nameSimilar = normalizeName(other.candidate.name) === normalizeName(candidate.name);
            const agreements = strongAgreement(other.candidate, candidate);
            if (agreements.length > 0) {
                matches.push(other.key);
                corroboration.push(...agreements);
                continue;
            }
            // Same name but no strong identifier is exactly the ambiguous case that
            // must not be merged. It is flagged for review instead.
            if (nameSimilar) {
                matches.push(other.key);
                corroboration.push("name-only");
            }
        }
        const hasStrong = corroboration.some((value) => value !== "name-only");
        resolutions.push({
            key,
            candidate,
            matches,
            corroboration,
            status: !matches.length ? "DISTINCT" : hasStrong ? "CONFIRMED" : "NEEDS_REVIEW",
            confidence: hasStrong ? Math.min(0.6 + corroboration.length * 0.15, 0.99) : matches.length ? 0.35 : 1,
        });
    }
    return resolutions;
}
function candidateFromPlace(place) {
    return {
        name: place.name,
        placeId: place.placeId,
        address: place.address,
        website: place.website,
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
    };
}
