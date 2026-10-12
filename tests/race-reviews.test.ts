import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { raceBySlug } from "@/lib/races";
import { formatFinishTime, parseFinishTime, raceReviewSchema, reviewQuery } from "@/lib/race-reviews";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUser: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/user", () => ({ getUser: mocks.getUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { GET, POST } from "@/app/api/races/[slug]/reviews/route";
import { getRaceReviews } from "@/db/race-reviews";

const slug = "itabashi-city-marathon";
const context = { params: Promise.resolve({ slug }) };
const valid = { raceYear: 2025, finishTimeS: 13500, body: "折り返してから風を強く感じました。", distanceKm: 22 };
const request = (body: unknown, origin = "https://dokorun.com") => new Request(`https://dokorun.com/api/races/${slug}/reviews`, {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});

describe("race review input", () => {
  it("parses actual finish times and rejects malformed values", () => {
    expect(parseFinishTime("3:45")).toBe(13500);
    expect(parseFinishTime("3:45:09")).toBe(13509);
    expect(formatFinishTime(13509)).toBe("3:45:09");
    for (const bad of ["", "3.45", "3:60:00", "99:00:00", "0:00:00", "3:1", "3:45:99"]) expect(parseFinishTime(bad), bad).toBeNull();
  });
  it("rejects future race results, out-of-course locations, and injected ownership", () => {
    const now = new Date("2026-10-12T00:00:00+09:00");
    const validator = raceReviewSchema(raceBySlug.get("yokohama-marathon")!, now);
    expect(validator.safeParse(valid).success).toBe(true);
    for (const bad of [{ ...valid, raceYear: 2026 }, { ...valid, raceYear: 2027 }, { ...valid, distanceKm: 43 }, { ...valid, userId: "other" }, { ...valid, body: "  " }]) expect(validator.safeParse(bad).success).toBe(false);
    expect(raceReviewSchema(raceBySlug.get("suwako-marathon")!, now).safeParse(valid).success).toBe(false);
  });
  it("bounds query inputs without interpreting empty/malformed values as zero", () => {
    expect(reviewQuery(new URLSearchParams())).toEqual({ target: null, offset: 0 });
    for (const bad of ["target=", "offset=-1", "offset=1.5", "target=NaN", "target=999999"]) expect(reviewQuery(new URLSearchParams(bad))).toBeNull();
  });
});

describe("race review persistence and authorization", () => {
  let client: Client;
  beforeEach(async () => {
    vi.clearAllMocks();
    client = createClient({ url: ":memory:" });
    await client.execute("PRAGMA foreign_keys = ON");
    await client.execute("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, handle TEXT)");
    await client.executeMultiple(readFileSync("scripts/sql/2026-10-12-race-reviews.sql", "utf8"));
    await client.execute("INSERT INTO users VALUES ('runner-a', 'Runner A', 'runner-a'), ('runner-b', 'Runner B', 'runner-b')");
    mocks.getDb.mockReturnValue(drizzle(client, { schema }));
    mocks.getUser.mockResolvedValue({ id: "runner-a" });
  });
  afterEach(() => client.close());

  it("requires both same-origin and a server-verified session", async () => {
    expect((await POST(request(valid, "https://evil.example"), context)).status).toBe(403);
    mocks.getUser.mockResolvedValue(null);
    expect((await POST(request(valid), context)).status).toBe(401);
    expect((await getRaceReviews(slug)).reviews).toHaveLength(0);
  });
  it("saves once per runner/race/year, updates only their own data, and preserves moderation", async () => {
    expect((await POST(request(valid), context)).status).toBe(200);
    expect((await POST(request({ ...valid, body: "更新しました" }), context)).status).toBe(200);
    let page = await getRaceReviews(slug);
    expect(page.reviews).toHaveLength(1);
    expect(page.reviews[0].body).toBe("更新しました");
    const id = page.reviews[0].id;
    mocks.getUser.mockResolvedValue({ id: "runner-b" });
    expect((await POST(request({ action: "delete", id }), context)).status).toBe(404);
    expect((await POST(request(valid), context)).status).toBe(200);
    expect((await getRaceReviews(slug)).reviews).toHaveLength(2);
    await client.execute({ sql: "UPDATE race_reviews SET is_hidden = 1 WHERE id = ?", args: [id] });
    mocks.getUser.mockResolvedValue({ id: "runner-a" });
    await POST(request({ ...valid, body: "編集しても非公開のまま" }), context);
    page = await getRaceReviews(slug);
    expect(page.reviews.map((review) => review.userId)).toEqual(["runner-b"]);
    expect((await POST(request({ action: "delete", id }), context)).status).toBe(200);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/races/${slug}`);
  });
  it("filters on actual finish time, includes both boundaries, and paginates", async () => {
    for (let i = 0; i < 24; i++) {
      await POST(request({ ...valid, raceYear: 2000 + i, finishTimeS: i === 0 ? 12599 : i === 1 ? 12600 : i === 2 ? 14400 : 13500 }), context);
    }
    const page = await getRaceReviews(slug, 13500);
    expect(page.reviews).toHaveLength(20);
    expect(page.nextOffset).toBe(20);
    const next = await getRaceReviews(slug, 13500, 20);
    expect(next.reviews).toHaveLength(3);
    expect(next.nextOffset).toBeNull();
    expect([...page.reviews, ...next.reviews].some((review) => review.finishTimeS === 12599)).toBe(false);
    expect((await getRaceReviews("tokyo-marathon")).reviews).toHaveLength(0);
  });
  it("deduplicates reports, rejects cross-race mutations and removes reports with a review", async () => {
    await POST(request(valid), context);
    const { id } = (await getRaceReviews(slug)).reviews[0];
    mocks.getUser.mockResolvedValue({ id: "runner-b" });
    for (let i = 0; i < 2; i++) expect((await POST(request({ action: "report", id, reason: "個人情報が含まれる" }), context)).status).toBe(200);
    expect((await client.execute("SELECT * FROM race_review_reports")).rows).toHaveLength(1);
    expect((await POST(request({ action: "report", id, reason: "報告" }), { params: Promise.resolve({ slug: "tokyo-marathon" }) })).status).toBe(404);
    mocks.getUser.mockResolvedValue({ id: "runner-a" });
    await POST(request({ action: "delete", id }), context);
    expect((await client.execute("SELECT * FROM race_review_reports")).rows).toHaveLength(0);
  });
  it("distinguishes unavailable storage from an empty review list", async () => {
    await client.execute("DROP TABLE race_review_reports");
    await client.execute("DROP TABLE race_reviews");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await getRaceReviews(slug)).available).toBe(false);
    expect((await GET(new Request(`https://dokorun.com/api/races/${slug}/reviews`), context)).status).toBe(503);
    log.mockRestore();
  });
});
