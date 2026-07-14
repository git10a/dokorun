import { describe, expect, it } from "vitest";
import { distanceBetweenKm, nearbyFallbackFilters } from "./spot-search";

describe("nearbyFallbackFilters", () => {
  it("現在地と近い順だけを残して検索条件を広げる", () => {
    expect(nearbyFallbackFilters({
      sort: "near",
      lat: 35.6812,
      lng: 139.7671,
      tags: ["no-signals"],
      distMin: 3000,
      toilet: true,
      page: 4,
    })).toEqual({ sort: "near", lat: 35.6812, lng: 139.7671, page: 1, limit: 3 });
  });

  it("現在地検索でなければフォールバックしない", () => {
    expect(nearbyFallbackFilters({ tags: ["no-signals"] })).toBeNull();
  });
});

describe("distanceBetweenKm", () => {
  it("東京駅から皇居までのおおよその距離を返す", () => {
    expect(distanceBetweenKm(35.6812, 139.7671, 35.6852, 139.7528)).toBeCloseTo(1.36, 1);
  });
});
