import { regionGroups } from "./prefectures";
import type { RaceDef } from "./races";

// 同じ都道府県を優先し、同じ地方までの大会を紹介する。
// 各グループ内は呼び出し元の開催順を保ち、無関係な地域で件数を埋めない。
export function relatedRaces(race: RaceDef, scheduledRaces: RaceDef[], limit = 6): RaceDef[] {
  const region = regionGroups.find((group) => (group.prefectures as readonly string[]).includes(race.prefecture));
  const candidates = scheduledRaces.filter((item) => item.slug !== race.slug);
  const samePrefecture = candidates.filter((item) => item.prefecture === race.prefecture);
  const sameRegion = candidates.filter(
    (item) => item.prefecture !== race.prefecture && region?.prefectures.some((name) => name === item.prefecture),
  );
  return [...samePrefecture, ...sameRegion].slice(0, Math.max(0, limit));
}
