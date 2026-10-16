import { describe, expect, it } from "vitest";
import { relatedRaces } from "@/lib/related-races";
import { raceBySlug } from "@/lib/races";

const yokohama = raceBySlug.get("yokohama-marathon")!;
const tokyo = raceBySlug.get("tokyo-marathon")!;
const mito = raceBySlug.get("mito-komon-marathon")!;
const fukuoka = raceBySlug.get("fukuoka-marathon")!;
const samePrefecture = { ...yokohama, slug: "another-kanagawa-race", name: "神奈川の別大会" };

describe("related races", () => {
  it("prioritizes the same prefecture, preserving schedule order within the region", () => {
    expect(relatedRaces(yokohama, [fukuoka, tokyo, yokohama, mito, samePrefecture])).toEqual([
      samePrefecture,
      tokyo,
      mito,
    ]);
    expect(relatedRaces(yokohama, [fukuoka, tokyo, yokohama, mito, samePrefecture], 2)).toEqual([
      samePrefecture,
      tokyo,
    ]);
  });
  it("does not fill an empty region with unrelated races or the current page", () => {
    expect(relatedRaces(yokohama, [yokohama, fukuoka])).toEqual([]);
    expect(relatedRaces(yokohama, [tokyo], 0)).toEqual([]);
  });
});
