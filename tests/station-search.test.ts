import { describe, expect, it } from "vitest";
import { parseStationQuery, summarizeStationRecords, type StationRecord } from "@/lib/station-search";

const record = (overrides: Partial<StationRecord> = {}): StationRecord => ({
  name: "渋谷",
  prefecture: "東京都",
  line: "JR山手線",
  x: 139.701,
  y: 35.659,
  ...overrides,
});

describe("station search", () => {
  it("駅 suffix and an optional prefecture are normalized", () => {
    expect(parseStationQuery(" 渋谷駅 ")).toEqual({ name: "渋谷", prefecture: undefined });
    expect(parseStationQuery("東京都　渋谷駅")).toEqual({ name: "渋谷", prefecture: "東京都" });
  });

  it("multiple lines at one station are averaged", () => {
    const result = summarizeStationRecords([record(), record({ line: "東急東横線", x: 139.703, y: 35.657 })]);
    expect(result).toEqual({ status: "found", station: { name: "渋谷", prefecture: "東京都", lat: 35.658, lng: 139.702 } });
  });

  it("same-name stations in different prefectures ask for clarification", () => {
    expect(summarizeStationRecords([record(), record({ prefecture: "静岡県" })])).toEqual({ status: "ambiguous", prefectures: ["東京都", "静岡県"] });
  });
});
