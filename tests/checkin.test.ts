import { describe, expect, it } from "vitest";
import { jstDateInputValue, jstDayBounds, jstNoon } from "@/lib/jst";

describe("チェックインの日付境界", () => {
  it("JST 0:00直前は同じJST日の範囲を返す", () => {
    const bounds = jstDayBounds(new Date("2026-07-07T14:59:59.000Z"));
    expect(bounds.start.toISOString()).toBe("2026-07-06T15:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-07T15:00:00.000Z");
  });

  it("JST 0:00以降は翌日の範囲と正午を返す", () => {
    const now = new Date("2026-07-07T15:00:00.000Z");
    const bounds = jstDayBounds(now);
    expect(bounds.start.toISOString()).toBe("2026-07-07T15:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-08T15:00:00.000Z");
    expect(jstNoon(now).toISOString()).toBe("2026-07-08T03:00:00.000Z");
  });

  it("編集フォーム用の日付をJST基準で返す", () => {
    expect(jstDateInputValue("2026-07-07T15:00:00.000Z")).toBe("2026-07-08");
    expect(jstDateInputValue(new Date("2026-07-07T14:59:59.000Z"))).toBe("2026-07-07");
  });
});
