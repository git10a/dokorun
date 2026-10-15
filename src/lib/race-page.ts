import type { RaceDef } from "./races";
import manifest from "./race-courses.json";
import { raceEditorial } from "./course-editorial";

// start/finishは参考コースの始点・終点 [lat, lng]
export type RaceCourseMeta = {
  distanceM: number;
  elevationGainM: number | null;
  source: "gps" | "map";
  courseYear?: number;
  checkedAt?: string;
  sourceUrl?: string;
  notice?: string;
  start?: number[];
  finish?: number[];
};
export const raceCourseMeta = manifest as Record<string, RaceCourseMeta | undefined>;
export const racePageTitle = (race: RaceDef) => `${race.name}のコースマップ・高低図`;
// 大会ページの説明は、コースの予習とレース計画の価値に統一する。
export const racePageDescription = (race: RaceDef) =>
  `${race.name}（${race.distanceLabel}・${race.startFinish}）のコースマップ・高低図。${raceEditorial[race.slug]?.intro ?? "目標タイムから坂を考えたペース表も作れます。走った人の体験や、近くの有名ランニングスポットも紹介。"}`;
