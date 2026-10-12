import { describe, expect, it } from "vitest";
// @ts-expect-error -- 運用スクリプト(.mjs)を直接テストする
import { selectRetiredBuilds } from "../scripts/cache-retention.mjs";

type Group = { buildId: string; prefix: string; retire: boolean };
const select = selectRetiredBuilds as (objects: unknown[], activeBuildIds: string[], now: number) => Group[];

const now = Date.parse("2026-09-08T00:00:00Z");
const id = (n: number) => `build${String(n).padStart(16, "0")}`;
const object = (n: number, ageDays: number) => ({
  key: `incremental-cache/${id(n)}/${"a".repeat(64)}.cache`,
  last_modified: new Date(now - ageDays * 86400000).toISOString(),
  size: 100,
});

describe("R2 incremental cache retention", () => {
  it("protects an old active build and the newest three rollback candidates", () => {
    const groups = select([object(1, 100), object(2, 90), object(3, 80), object(4, 70), object(5, 60)], [id(1)], now);
    expect(groups.filter((group) => group.retire).map((group) => group.buildId)).toEqual([id(2)]);
    expect(groups.every((group) => group.prefix.endsWith("/"))).toBe(true);
  });

  it("a recent write protects an otherwise retired build", () => {
    const objects = [object(1, 100), object(2, 90), object(2, 1), object(3, 80), object(4, 70), object(5, 60)];
    expect(select(objects, [id(1)], now).filter((group) => group.retire)).toHaveLength(0);
  });

  it("unknown layouts and missing active build fail closed", () => {
    expect(() => select([{ ...object(1, 100), key: "images/user-photo.jpg" }], [id(1)], now)).toThrow();
    expect(() => select([object(1, 100)], [], now)).toThrow();
    expect(() => select([object(1, 100)], [id(2)], now)).toThrow();
  });
});
