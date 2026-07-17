import { describe, expect, it } from "vitest";
import { stripPrepublishSentences } from "./public-description";

describe("stripPrepublishSentences", () => {
  it("removes internal prepublish notes from public copy", () => {
    expect(stripPrepublishSentences("湖畔を一周できます。掲載時は現地写真を取得すると再検証しやすくなります。景色も楽しめます。"))
      .toBe("湖畔を一周できます。景色も楽しめます。");
  });

  it("keeps ordinary descriptions unchanged", () => {
    expect(stripPrepublishSentences("湖畔を一周できます。景色も楽しめます。"))
      .toBe("湖畔を一周できます。景色も楽しめます。");
  });
});
