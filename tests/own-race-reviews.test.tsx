import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getUserRaceReviews: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/db/race-reviews", () => ({ getUserRaceReviews: mocks.getUserRaceReviews }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import Page, { metadata } from "@/app/me/race-reviews/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "session-owner" });
  mocks.getUserRaceReviews.mockResolvedValue({ available: true, reviews: [], hasMore: false });
});

describe("private race review page", () => {
  it("authenticates before reading any data and keeps the requested page on return", async () => {
    mocks.requireUser.mockRejectedValue(new Error("login redirect"));
    await expect(Page({ searchParams: Promise.resolve({ page: "2" }) })).rejects.toThrow("login redirect");
    expect(mocks.requireUser).toHaveBeenCalledWith("/me/race-reviews?page=2");
    expect(mocks.getUserRaceReviews).not.toHaveBeenCalled();
  });
  it("uses the server session owner and exposes navigation to older posts", async () => {
    mocks.getUserRaceReviews.mockResolvedValue({ available: true, hasMore: true, reviews: [{
      id: "review-id", raceSlug: "tokyo-marathon", raceYear: 2025, finishTimeS: 13500,
      body: '<script>alert("x")</script> 自分の体験', distanceKm: 30, isHidden: true,
    }] });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ page: "2", userId: "other-user" } as { page: string }) }));
    expect(mocks.getUserRaceReviews).toHaveBeenCalledWith("session-owner", 20);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("x")');
    expect(html).toContain("運営により公開停止中");
    expect(html).toContain('/me/race-reviews?page=1');
    expect(html).toContain('/me/race-reviews?page=3');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
  it("shows storage failure separately from a first-time empty state", async () => {
    mocks.getUserRaceReviews.mockResolvedValue({ available: false, reviews: [], hasMore: false });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("大会の体験はまだ投稿していません");
  });
  it.each(["-2", "1.5", "Infinity", "1000000", "0"])("bounds the page input %s", async (page) => {
    await Page({ searchParams: Promise.resolve({ page }) });
    expect(mocks.getUserRaceReviews).toHaveBeenCalledWith("session-owner", 0);
  });
});
