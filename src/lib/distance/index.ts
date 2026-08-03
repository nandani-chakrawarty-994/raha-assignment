import type { GeoPoint } from "@/lib/types";

export interface RoutePoint extends GeoPoint {
  capturedAt: Date | string;
}

export interface DistanceResult {
  totalKm: number;
  segmentsKm: number[];
  provider: "openrouteservice" | "haversine";
}

const EARTH_RADIUS_KM = 6371;
/** Treat points closer than this (metres) as identical — zero segment distance */
const DUPLICATE_THRESHOLD_METERS = 15;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Straight-line distance between two lat/lng points (Haversine). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function arePointsNearlyIdentical(a: GeoPoint, b: GeoPoint): boolean {
  return haversineKm(a, b) * 1000 < DUPLICATE_THRESHOLD_METERS;
}

function roundKm(km: number): number {
  return Math.round(km * 100) / 100;
}

function orderByTimestamp(points: RoutePoint[]): RoutePoint[] {
  return [...points].sort(
    (x, y) => new Date(x.capturedAt).getTime() - new Date(y.capturedAt).getTime()
  );
}

async function openRouteServiceSegmentKm(a: GeoPoint, b: GeoPoint, apiKey: string): Promise<number | null> {
  if (arePointsNearlyIdentical(a, b)) return 0;

  const url =
    "https://api.openrouteservice.org/v2/directions/driving-car";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [a.longitude, a.latitude],
          [b.longitude, b.latitude],
        ],
      }),
      // Avoid hanging the day close forever
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const meters = data?.routes?.[0]?.summary?.distance;
    if (typeof meters !== "number") return null;
    return meters / 1000;
  } catch {
    return null;
  }
}

/**
 * Distance provider interface — swap implementations without touching callers.
 */
export interface DistanceProvider {
  name: "openrouteservice" | "haversine";
  segmentKm(a: GeoPoint, b: GeoPoint): Promise<number>;
}

export function createHaversineProvider(): DistanceProvider {
  return {
    name: "haversine",
    async segmentKm(a, b) {
      if (arePointsNearlyIdentical(a, b)) return 0;
      return haversineKm(a, b);
    },
  };
}

export function createOpenRouteServiceProvider(apiKey: string): DistanceProvider {
  const fallback = createHaversineProvider();
  return {
    name: "openrouteservice",
    async segmentKm(a, b) {
      const road = await openRouteServiceSegmentKm(a, b, apiKey);
      if (road === null) {
        return fallback.segmentKm(a, b);
      }
      return road;
    },
  };
}

/** Resolve provider from env. Prefer road distance when a key is present. */
export function getDistanceProvider(): DistanceProvider {
  const key = process.env.OPENROUTESERVICE_API_KEY?.trim();
  if (key) {
    return createOpenRouteServiceProvider(key);
  }
  return createHaversineProvider();
}

/**
 * Sum consecutive segment distances for an ordered route.
 * Points are always sorted by timestamp before calculation.
 */
export async function calculateRouteDistance(
  points: RoutePoint[],
  provider: DistanceProvider = getDistanceProvider()
): Promise<DistanceResult> {
  const ordered = orderByTimestamp(points);
  const segmentsKm: number[] = [];

  if (ordered.length < 2) {
    return { totalKm: 0, segmentsKm: [], provider: provider.name };
  }

  for (let i = 1; i < ordered.length; i++) {
    const km = await provider.segmentKm(ordered[i - 1], ordered[i]);
    segmentsKm.push(roundKm(km));
  }

  const totalKm = roundKm(segmentsKm.reduce((sum, s) => sum + s, 0));
  return { totalKm, segmentsKm, provider: provider.name };
}
