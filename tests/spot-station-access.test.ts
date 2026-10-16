import { describe, expect, it } from "vitest";
import stations from "../data/stations/stations.json";
import publishedSlugs from "../data/stations/published-slugs.json";

// A route correction must change station access without deleting useful indexed pages.
describe("station access after spot route corrections", () => {
  it("retains established station pages with a reachable running spot", () => {
    for (const slug of publishedSlugs) {
      const station = stations.find((item) => item.slug === slug);
      expect(station, slug).toBeDefined();
      expect((station?.nearbySpots.length ?? 0) + (station?.oneStationSpots.length ?? 0), slug).toBeGreaterThan(0);
    }
  });
  it.each(["suzuka", "suzukashi", "yanagi"])("keeps %s with the corrected distant sports-park start", (slug) => {
    const station = stations.find((item) => item.slug === slug);
    expect(station).toBeDefined();
    expect(station!.nearbySpots[0].slug).toBe("sports-garden-suzuka");
    expect(station!.nearbySpots[0].distanceM).toBeGreaterThan(5_000);
  });
  it.each(["kozan", "tottoridaigakumae"])("keeps %s access truthful after the lake start moves", (slug) => {
    const station = stations.find((item) => item.slug === slug);
    const spot = station?.nearbySpots.find((item) => item.slug === "koyamaike-park");
    expect(spot).toBeDefined();
    expect(spot!.distanceM).toBeGreaterThan(2_000);
    expect(spot!.distanceM).toBeLessThan(5_000);
    expect(spot!.walkMinutes).toBe(Math.ceil(spot!.distanceM / 80));
  });
  it.each([
    ["aoba-no-mori-park", "chibadera"],
    ["21st-century-forest-park", "tokiwadaira"],
    ["arakawa", "akabaneiwabuchi"],
  ])("links %s to its corrected nearby station", (spotSlug, stationSlug) => {
    const station = stations.find((item) => item.slug === stationSlug);
    const spot = station?.nearbySpots.find((item) => item.slug === spotSlug);
    expect(spot).toBeDefined();
    expect(spot!.distanceM).toBeLessThan(1_000);
  });
});
