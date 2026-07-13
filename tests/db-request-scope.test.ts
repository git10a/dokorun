import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  binding: { request: "A" } as { request: string },
  drizzleD1: vi.fn((binding: { request: string }) => ({ binding })),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { DB: mocks.binding } }),
}));

vi.mock("drizzle-orm/d1", () => ({ drizzle: mocks.drizzleD1 }));

describe("getDb request scoping", () => {
  beforeEach(() => {
    mocks.binding = { request: "A" };
    mocks.drizzleD1.mockClear();
  });

  it("does not reuse a D1-backed client across requests", async () => {
    const { getDb } = await import("@/db");

    const bindingA = mocks.binding;
    const dbA = getDb() as unknown as { binding: { request: string } };

    mocks.binding = { request: "B" };
    const bindingB = mocks.binding;
    const dbB = getDb() as unknown as { binding: { request: string } };

    expect(dbA.binding).toBe(bindingA);
    expect(dbB.binding).toBe(bindingB);
    expect(dbB.binding).not.toBe(bindingA);
    expect(mocks.drizzleD1).toHaveBeenNthCalledWith(1, bindingA, expect.any(Object));
    expect(mocks.drizzleD1).toHaveBeenNthCalledWith(2, bindingB, expect.any(Object));
  });
});
