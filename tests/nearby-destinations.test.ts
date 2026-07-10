import { describe, expect, it } from "vitest";
import { getNearbyDestinationHighlights, getNearbyDestinations, getNearbyDestinationsForPurpose, getPrimaryNearbyDestinationRating, googleMapsPlaceUrl } from "@/lib/nearby-destinations";

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

  it("merges the first three research batches", () => {
    expect(getNearbyDestinations("nakajima-park")).toHaveLength(1);
    expect(getNearbyDestinations("mizumoto-park")).toHaveLength(2);
    expect(getNearbyDestinations("shikishima-park")).toHaveLength(2);
  });

  it("loads partial fifth and sixth batches", () => {
    expect(getNearbyDestinations("ukima-park")).toHaveLength(4);
    expect(getNearbyDestinations("rinshi-no-mori-park")).toHaveLength(3);
    expect(getNearbyDestinations("showa-kinen-park")).toHaveLength(1);
  });

  it("corrects the Showa Kinen Park place that was nested under Rinshi-no-mori", () => {
    expect(getNearbyDestinations("showa-kinen-park")[0].name).toBe("レインボウスパイス");
    expect(getNearbyDestinations("rinshi-no-mori-park").map((place) => place.name)).not.toContain("レインボウスパイス");
  });

  it("loads the partial ninth batch", () => {
    expect(getNearbyDestinations("yodogawa-nishinakajima")).toHaveLength(2);
    expect(getNearbyDestinations("hattori-ryokuchi")).toHaveLength(2);
  });

  it("loads the tenth through twelfth batches", () => {
    expect(getNearbyDestinations("shinjuku-central-park")).toHaveLength(2);
    expect(getNearbyDestinations("kokyo")).toHaveLength(2);
    expect(getNearbyDestinations("oohori")).toHaveLength(3);
    expect(getNearbyDestinations("osakajo")).toHaveLength(1);
    expect(getNearbyDestinations("meijo")).toHaveLength(3);
  });

  it("drops the far-flung Hita spa mis-linked to the Oita sports park", () => {
    expect(getNearbyDestinations("oita-sports-park-happy-road")).toEqual([]);
  });

  it("preserves unknown distances instead of inventing them", () => {
    const [place] = getNearbyDestinations("moerenuma-park");

    expect(place.distanceFromSpotM).toBeNull();
    expect(place.walkingMinutes).toBeNull();
  });

  it("builds a Google Maps search link from the official name and address", () => {
    const [place] = getNearbyDestinations("edogawa-kasenjiki-shibamata");
    const url = new URL(googleMapsPlaceUrl(place));

    expect(url.hostname).toBe("www.google.com");
    expect(url.pathname).toBe("/maps/search/");
    expect(url.searchParams.get("query")).toBe(`${place.name} ${place.address}`);
  });

  it("makes destination research searchable across spots by purpose", () => {
    const bakeries = getNearbyDestinationsForPurpose("bakery");

    expect(bakeries.length).toBeGreaterThan(0);
    expect(bakeries.every((item) => item.category === "bakery")).toBe(true);
    expect(bakeries.some((item) => item.spotSlug === "rinshi-no-mori-park")).toBe(true);
  });

  it("keeps researched ratings and factual highlights available for destination cards", () => {
    const [place] = getNearbyDestinations("rinshi-no-mori-park");
    const rating = getPrimaryNearbyDestinationRating(place);

    expect(rating).toMatchObject({ platform: "Tabelog", rating: 3.73, reviewCount: 1028 });
    expect(getNearbyDestinationHighlights(place)).toEqual(expect.arrayContaining(["百名店", "朝9時から", "テイクアウト可", "テラス席"]));
  });
});
