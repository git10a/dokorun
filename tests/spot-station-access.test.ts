import { describe, expect, it } from "vitest";
import stations from "../data/stations/stations.json";

// A route correction must change station access without deleting useful indexed pages.
describe("station access after spot route corrections", () => {
  it("retains established station pages with a reachable running spot", () => {
    const retained = [
      "kitakogane",
      "inage",
      "shinkemigawa",
      "monoi",
      "itahashimotomachi",
      "tabata",
      "supo-tsusenta",
      "tsudanuma",
      "midoridai",
      "itabashikuyakushomae",
      "higashijuujou",
      "minamikashiwa",
      "anagawa-chiba",
      "honhasunuma",
      "tsuga",
    ];
    for (const slug of retained) {
      const station = stations.find((item) => item.slug === slug);
      expect(station, slug).toBeDefined();
      expect((station?.nearbySpots.length ?? 0) + (station?.oneStationSpots.length ?? 0), slug).toBeGreaterThan(0);
    }
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
