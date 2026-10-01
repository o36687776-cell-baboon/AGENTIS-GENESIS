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

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|ltd|llc|limited|corp|corporation|co|company|group|holdings)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDomain(domainOrUrl: string | undefined): string | null {
  if (!domainOrUrl) return null;
  const trimmed = domainOrUrl.trim().toLowerCase();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const host = new URL(withProtocol).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function distanceKm(a: EntityCandidate, b: EntityCandidate): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null;
  }
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * A strong identifier is one that cannot plausibly collide: a place ID, an
 * exact domain, or a coordinate pair within roughly 100 metres.
 */
function strongAgreement(a: EntityCandidate, b: EntityCandidate): string[] {
  const agreements: string[] = [];

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

export function resolveEntities(candidates: EntityCandidate[]): EntityResolution[] {
  const resolutions: EntityResolution[] = [];

  for (const candidate of candidates) {
    const key = normalizeName(candidate.name) || candidate.placeId || candidate.domain || candidate.name;
    const corroboration: string[] = [];
    const matches: string[] = [];

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

export function candidateFromPlace(place: PlaceResult): EntityCandidate {
  return {
    name: place.name,
    placeId: place.placeId,
    address: place.address,
    website: place.website,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
  };
}