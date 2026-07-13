import { describe, expect, it } from "vitest";
import { featureBySlug, features } from "@/lib/features";

describe("features", () => {
  it("朝ラン特集を日の出向けの内容で公開する", () => {
    const feature = featureBySlug.get("morning-run");

    expect(feature).toMatchObject({
      name: "朝ラン",
      emoji: "🌅",
      title: "日の出がきれいな朝ランコース",
    });
    expect(feature?.description).toContain("日の出");
    expect(features[0]?.slug).toBe("morning-run");
  });
});
