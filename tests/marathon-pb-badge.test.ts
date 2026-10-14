import { describe, expect, it } from "vitest";
import { marathonPbBadge } from "@/lib/pb";

describe("profile full marathon achievement", () => {
  it("uses strictly less than each threshold, including the exact four-hour boundary", () => {
    expect(marathonPbBadge(14399)).toBe("サブ4");
    expect(marathonPbBadge(14400)).toBe("サブ4.5");
    expect(marathonPbBadge(10799)).toBe("サブ3");
    expect(marathonPbBadge(10800)).toBe("サブ3.5");
    expect(marathonPbBadge(21600)).toBe("フル 6:00:00");
  });
  it.each([null, undefined, 0, -1, NaN, Infinity, 4000, 72001, 14399.5])(
    "does not invent a badge for absent or invalid PB %s",
    (value) => {
      expect(marathonPbBadge(value)).toBeNull();
    },
  );
});
