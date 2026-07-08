import { describe, expect, it } from "vitest";
import { normalizeInstagram, normalizeStrava, normalizeXHandle, socialUrl } from "@/lib/social";

describe("social profile helpers", () => {
  it("normalizes instagram handles", () => {
    expect(normalizeInstagram("@runner.jp")).toBe("runner.jp");
    expect(normalizeInstagram("https://www.instagram.com/runner.jp/")).toBe("runner.jp");
    expect(normalizeInstagram("bad/name")).toBeNull();
  });

  it("normalizes x handles", () => {
    expect(normalizeXHandle("@dokorun")).toBe("dokorun");
    expect(normalizeXHandle("https://twitter.com/dokorun")).toBe("dokorun");
    expect(normalizeXHandle("too-long-handle-name")).toBeNull();
  });

  it("normalizes strava athlete IDs and vanity names", () => {
    expect(normalizeStrava("https://www.strava.com/athletes/12345")).toBe("12345");
    expect(normalizeStrava("morning-runner")).toBe("morning-runner");
    expect(normalizeStrava("bad/name")).toBeNull();
  });

  it("builds public social URLs", () => {
    expect(socialUrl("instagram", "runner")).toBe("https://www.instagram.com/runner");
    expect(socialUrl("x", "runner")).toBe("https://x.com/runner");
    expect(socialUrl("strava", "runner")).toBe("https://www.strava.com/athletes/runner");
  });
});
