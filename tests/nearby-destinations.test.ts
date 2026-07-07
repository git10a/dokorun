import { describe, expect, it } from "vitest";
import { getNearbyDestinations, googleMapsPlaceUrl } from "@/lib/nearby-destinations";

describe("nearby destinations", () => {
  it("returns the researched places for a listed spot", () => {
    const places = getNearbyDestinations("shikishima-park");

    expect(places).toHaveLength(2);
    expect(places.map((place) => place.name)).toEqual([
      "SHIKISHIMA COFFEE FACTORY",
      "敷島公園ばら園",
    ]);
  });

  it("keeps spots with no accepted candidates empty", () => {
    expect(getNearbyDestinations("saiko-doman-green-park")).toEqual([]);
  });

  it("builds a Google Maps search link from the official name and address", () => {
    const [place] = getNearbyDestinations("edogawa-kasenjiki-shibamata");
    const url = new URL(googleMapsPlaceUrl(place));

    expect(url.hostname).toBe("www.google.com");
    expect(url.pathname).toBe("/maps/search/");
    expect(url.searchParams.get("query")).toBe(`${place.name} ${place.address}`);
  });
});
