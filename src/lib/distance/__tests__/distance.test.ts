import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  haversineKm,
  arePointsNearlyIdentical,
  calculateRouteDistance,
  createHaversineProvider,
} from "../index";

describe("haversineKm", () => {
  it("returns ~0 for identical points", () => {
    const p = { latitude: 17.385, longitude: 78.4867 };
    assert.equal(haversineKm(p, p), 0);
  });

  it("computes a sensible distance across Hyderabad landmarks", () => {
    // Approx Charminar → Hitech City (~15–18 km straight line)
    const charminar = { latitude: 17.3616, longitude: 78.4747 };
    const hitech = { latitude: 17.4483, longitude: 78.3915 };
    const km = haversineKm(charminar, hitech);
    assert.ok(km > 12 && km < 22, `expected ~15km, got ${km}`);
  });
});

describe("arePointsNearlyIdentical", () => {
  it("treats very close points as identical", () => {
    const a = { latitude: 17.385, longitude: 78.4867 };
    const b = { latitude: 17.3850001, longitude: 78.4867001 };
    assert.equal(arePointsNearlyIdentical(a, b), true);
  });

  it("does not treat distant points as identical", () => {
    const a = { latitude: 17.385, longitude: 78.4867 };
    const b = { latitude: 17.4, longitude: 78.5 };
    assert.equal(arePointsNearlyIdentical(a, b), false);
  });
});

describe("calculateRouteDistance", () => {
  it("orders by timestamp, not insertion order", async () => {
    const provider = createHaversineProvider();
    const p1 = { latitude: 17.36, longitude: 78.47, capturedAt: "2026-03-01T09:00:00.000Z" };
    const p2 = { latitude: 17.38, longitude: 78.48, capturedAt: "2026-03-01T10:00:00.000Z" };
    const p3 = { latitude: 17.4, longitude: 78.49, capturedAt: "2026-03-01T11:00:00.000Z" };

    // Insert out of order
    const result = await calculateRouteDistance([p3, p1, p2], provider);
    const ordered = await calculateRouteDistance([p1, p2, p3], provider);

    assert.equal(result.totalKm, ordered.totalKm);
    assert.equal(result.segmentsKm.length, 2);
  });

  it("returns 0 for a single point", async () => {
    const result = await calculateRouteDistance(
      [{ latitude: 17.36, longitude: 78.47, capturedAt: new Date() }],
      createHaversineProvider()
    );
    assert.equal(result.totalKm, 0);
  });

  it("zeroes near-duplicate consecutive points", async () => {
    const a = { latitude: 17.385, longitude: 78.4867, capturedAt: "2026-03-01T09:00:00.000Z" };
    const b = {
      latitude: 17.38500005,
      longitude: 78.48670005,
      capturedAt: "2026-03-01T09:05:00.000Z",
    };
    const result = await calculateRouteDistance([a, b], createHaversineProvider());
    assert.equal(result.totalKm, 0);
  });
});
