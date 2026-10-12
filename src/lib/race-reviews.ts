import { z } from "zod";
import { jstYear } from "./jst";
import { raceDateKey } from "./race-date";
import type { RaceDef } from "./races";
import { formatDuration } from "./format";

export const raceReviewPrompt = "来年この大会を走るランナーへ、あなたが伝えておきたいことは？";
export const reviewPageSize = 20;

export type RaceReview = {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  raceYear: number;
  finishTimeS: number;
  body: string;
  distanceKm: number | null;
  createdAt: string;
};
export type RaceReviewPage = { reviews: RaceReview[]; nextOffset: number | null; available: boolean };
export type OwnRaceReview = Pick<RaceReview, "id" | "raceYear" | "finishTimeS" | "body" | "distanceKm"> & {
  raceSlug: string;
  isHidden: boolean;
};

export function raceDistanceKm(race: Pick<RaceDef, "distanceLabel">) {
  return race.distanceLabel.includes("フル") ? 42.195 : 21.0975;
}

export function parseFinishTime(value: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(value.trim());
  if (!match) return null;
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
  return seconds >= 1200 && seconds <= 86400 ? seconds : null;
}

export function formatFinishTime(seconds: number) {
  return formatDuration(seconds, true);
}

export function raceReviewSchema(race: RaceDef, now = new Date()) {
  const year = jstYear(now);
  return z.object({
    raceYear: z.number().int().min(1900).max(year),
    finishTimeS: z.number().int().min(1200).max(86400),
    body: z.string().trim().min(1).max(1500),
    distanceKm: z.number().min(0).max(raceDistanceKm(race)).nullable(),
  }).strict().refine((value) => {
    const dateKey = raceDateKey(race);
    if (!dateKey || value.raceYear !== Number(dateKey.slice(0, 4))) return true;
    return now >= new Date(`${dateKey}T00:00:00+09:00`);
  }, { message: "開催前の大会の体験は投稿できません", path: ["raceYear"] });
}

export function reviewQuery(search: URLSearchParams) {
  const target = search.get("target");
  const offset = search.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(offset)) return null;
  if (target !== null && (!/^\d{1,5}$/.test(target) || Number(target) < 1200 || Number(target) > 86400)) return null;
  return { target: target === null ? null : Number(target), offset: Number(offset) };
}
