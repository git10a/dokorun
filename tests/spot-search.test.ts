import { describe, expect, it } from "vitest";
import {
  buildSpotRequestHref,
  distanceBetweenKm,
  nearbyFallbackFilters,
  normalizeSearchParams,
  searchParamsHref,
  toSearchFilters,
} from "@/lib/spot-search";

describe("spot search helpers", () => {
  it("normalizes repeated params and converts public query values to DB filters", () => {
    const params = normalizeSearchParams({
      tags: ["flat,night", "ignored"],
      dist: "5-10",
      lat: "35.68",
      lng: "139.76",
      page: "2",
    });
    expect(toSearchFilters(params)).toMatchObject({
      tags: ["flat", "night"],
      distMin: 5000,
      distMax: 10000,
      lat: 35.68,
      lng: 139.76,
      page: 2,
    });
  });

  it("rejects invalid coordinates without discarding the other filters", () => {
    expect(toSearchFilters({ pref: "東京都", lat: "999", lng: "139" })).toMatchObject({
      pref: "東京都",
      lat: undefined,
      lng: undefined,
    });
  });

  it("maps the 30-minute homepage choice to a 3–5km search", () => {
    expect(toSearchFilters({ dist: "3-5" })).toMatchObject({ distMin: 3000, distMax: 5000 });
  });

  it("builds pagination links without losing active filters", () => {
    expect(searchParamsHref("/spots", { pref: "東京都", page: "1" }, { page: "3" })).toBe(
      "/spots?pref=%E6%9D%B1%E4%BA%AC%E9%83%BD&page=3",
    );
  });

  it("preserves the useful context in an empty-result request", () => {
    const href = buildSpotRequestHref({ type: "loop", toilet: "1" }, ["フラット"]);
    const query = new URL(href, "https://dokorun.com").searchParams;
    expect(query.get("category")).toBe("spot_request");
    expect(query.get("message")).toContain("特徴: フラット");
    expect(query.get("message")).toContain("コース形状: 周回");
    expect(query.get("message")).toContain("設備: トイレあり");
  });
});

describe("nearbyFallbackFilters", () => {
  it("現在地と近い順だけを残して検索条件を広げる", () => {
    expect(
      nearbyFallbackFilters({
        sort: "near",
        lat: 35.6812,
        lng: 139.7671,
        tags: ["no-signals"],
        distMin: 3000,
        toilet: true,
        page: 4,
      }),
    ).toEqual({ sort: "near", lat: 35.6812, lng: 139.7671, page: 1, limit: 3 });
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
