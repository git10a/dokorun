import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCourseGuide } from "../src/lib/course-guides";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(() => ({
    env: {
      ASSETS: {
        fetch: async () =>
          new Response(
            JSON.stringify({
              slug: "aoba-no-mori-park",
              distanceM: 1736,
              checkpoints: [],
              startPoints: [],
              warnings: [],
            }),
          ),
      },
    },
  })),
}));

describe("course guide sources", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
  it("uses corrected checkout data even when a stale Cloudflare assets binding is available", async () => {
    const expected = JSON.parse(readFileSync("public/course-guides/aoba-no-mori-park.json", "utf8"));
    const guide = await getCourseGuide("aoba-no-mori-park");
    expect(guide?.distanceM).toBe(expected.distanceM);
    expect(guide?.startPoints[0].name).toBe("西口側の園路");
    expect(getCloudflareContext).not.toHaveBeenCalled();
  });
  it("loads guides from the asset binding in the deployed Worker runtime", async () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    const guide = await getCourseGuide("aoba-no-mori-park");
    expect(getCloudflareContext).toHaveBeenCalledOnce();
    expect(guide?.distanceM).toBe(1736);
  });
});
