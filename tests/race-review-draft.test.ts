import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRaceReviewDraft, readRaceReviewDraft, saveRaceReviewDraft } from "@/lib/race-review-draft";

const fields = {
  raceYear: "2026", finishTime: "3:45:00", distanceKm: "30.5",
  body: "30kmの坂について。\n次に走る方へ。", editing: false,
};
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-13T01:00:00Z"));
  vi.stubGlobal("sessionStorage", {
    setItem: (key: string, value: string) => storage.set(key, value),
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => storage.delete(key),
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("review drafts across login", () => {
  it("preserves every guest field when returning as a signed-in user", () => {
    expect(saveRaceReviewDraft("iwaki", fields, null)).toBe(true);
    expect(readRaceReviewDraft("iwaki", "user-a")).toMatchObject(fields);
    expect(readRaceReviewDraft("other-race", "user-a")).toBeNull();
    clearRaceReviewDraft("iwaki");
    expect(readRaceReviewDraft("iwaki", "user-a")).toBeNull();
  });
  it("restores an edit only to its owner", () => {
    saveRaceReviewDraft("iwaki", { ...fields, editing: true }, "user-a");
    expect(readRaceReviewDraft("iwaki", "user-a")?.editing).toBe(true);
    expect(readRaceReviewDraft("iwaki", "user-b")).toBeNull();
    expect(storage.size).toBe(0);
  });
  it("removes drafts older than 24 hours", () => {
    saveRaceReviewDraft("iwaki", fields, null);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(readRaceReviewDraft("iwaki", null)).toBeNull();
    expect(storage.size).toBe(0);
  });
  it.each(["not json", '{"version":1}', '{"version":2,"body":"private"}'])("discards invalid data: %s", (value) => {
    storage.set("dokorun:race-review-draft:iwaki", value);
    expect(readRaceReviewDraft("iwaki", null)).toBeNull();
    expect(storage.size).toBe(0);
  });
  it("reports unavailable storage so the form can stay open", () => {
    vi.stubGlobal("sessionStorage", {
      setItem: () => { throw new Error("blocked"); },
      getItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    });
    expect(saveRaceReviewDraft("iwaki", fields, null)).toBe(false);
    expect(readRaceReviewDraft("iwaki", null)).toBeNull();
    expect(() => clearRaceReviewDraft("iwaki")).not.toThrow();
  });
});
