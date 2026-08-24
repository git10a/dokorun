import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getStationCountByPrefecture } from "@/lib/station-prefecture-counts";

type StationRecord = { prefecture: string };

describe("station prefecture counts", () => {
  it("matches the generated station data", () => {
    const stations = JSON.parse(
      readFileSync(path.join(process.cwd(), "data", "stations", "stations.json"), "utf8"),
    ) as StationRecord[];
    const actual = new Map<string, number>();
    for (const station of stations) {
      actual.set(station.prefecture, (actual.get(station.prefecture) ?? 0) + 1);
    }

    for (const [prefecture, count] of actual) {
      expect(getStationCountByPrefecture(prefecture)).toBe(count);
    }
    expect(getStationCountByPrefecture("未掲載県")).toBe(0);
  });
});
