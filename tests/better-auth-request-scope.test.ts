import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbA: { request: "A" },
  dbB: { request: "B" },
  getDb: vi.fn(),
  betterAuth: vi.fn((config: unknown) => ({ config, handler: vi.fn() })),
  drizzleAdapter: vi.fn((db: unknown, options: unknown) => ({ db, options })),
}));

vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("better-auth", () => ({ betterAuth: mocks.betterAuth }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: mocks.drizzleAdapter }));

describe("Better Auth request scoping", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getDb.mockReset();
    mocks.betterAuth.mockClear();
    mocks.drizzleAdapter.mockClear();
  });

  it("does not initialize auth while the runtime module is imported", async () => {
    await import("@/lib/better-auth");

    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.betterAuth).not.toHaveBeenCalled();
  });

  it("builds auth with the current request database", async () => {
    mocks.getDb.mockReturnValueOnce(mocks.dbA).mockReturnValueOnce(mocks.dbB);
    const { createAuth } = await import("@/lib/better-auth");

    const authA = createAuth();
    const authB = createAuth();

    expect(authA).not.toBe(authB);
    expect(mocks.drizzleAdapter).toHaveBeenNthCalledWith(1, mocks.dbA, expect.any(Object));
    expect(mocks.drizzleAdapter).toHaveBeenNthCalledWith(2, mocks.dbB, expect.any(Object));
    expect(mocks.betterAuth).toHaveBeenCalledTimes(2);
  });
});
