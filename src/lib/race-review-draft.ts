import { z } from "zod";

const draftSchema = z.object({
  version: z.literal(1),
  savedAt: z.number().finite(),
  ownerId: z.string().max(200).nullable(),
  editing: z.boolean(),
  raceYear: z.string().max(4),
  finishTime: z.string().max(16),
  distanceKm: z.string().max(32),
  body: z.string().max(1500),
}).strict();

export type RaceReviewDraft = z.infer<typeof draftSchema>;
export type RaceReviewDraftFields = Pick<RaceReviewDraft, "raceYear" | "finishTime" | "distanceKm" | "body" | "editing">;
const key = (slug: string) => `dokorun:race-review-draft:${slug}`;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// OAuth往復のためだけに同じタブへ保管する。本文をURL・計測・サーバーへ送らない。
export function saveRaceReviewDraft(slug: string, fields: RaceReviewDraftFields, ownerId: string | null) {
  try {
    const draft = draftSchema.parse({ ...fields, version: 1, savedAt: Date.now(), ownerId });
    sessionStorage.setItem(key(slug), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function readRaceReviewDraft(slug: string, userId: string | null): RaceReviewDraft | null {
  try {
    const value = sessionStorage.getItem(key(slug));
    if (!value) return null;
    const parsed = draftSchema.safeParse(JSON.parse(value));
    if (
      !parsed.success ||
      Date.now() - parsed.data.savedAt > MAX_AGE_MS ||
      parsed.data.savedAt > Date.now() ||
      (parsed.data.ownerId !== null && parsed.data.ownerId !== userId)
    ) {
      clearRaceReviewDraft(slug);
      return null;
    }
    return parsed.data;
  } catch {
    clearRaceReviewDraft(slug);
    return null;
  }
}

export function clearRaceReviewDraft(slug: string) {
  try {
    sessionStorage.removeItem(key(slug));
  } catch {
    // ストレージ無効時にも入力・投稿を妨げない。
  }
}
