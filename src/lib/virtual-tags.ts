// DB の tags テーブルにない「仮想タグ」。距離やスポットの一覧から機械的に付ける
export const longRunTag = { id: "virtual-long-run", slug: "long-run", name: "ロングラン", category: "terrain", sortOrder: 6 } as const;
export const longRunDistanceM = 10000;
export const castleRunTag = { id: "virtual-castle-run", slug: "castle-run", name: "お城ラン", category: "scenery", sortOrder: 16 } as const;
export const virtualTagSlugs: readonly string[] = [longRunTag.slug, castleRunTag.slug];

// 城が主目的・主要経由地になっているコースだけを対象にする。
// 名前に「城」が含まれるだけの公園（城北中央公園など）は含めない。
export const castleRunSpotSlugs = [
  "akashi-park",
  "dogo-matsuyama-castle",
  "fukuyama-castle-loop",
  "fukui-castle-loop",
  "hamamatsu-castle-park",
  "hikone-castle-loop",
  "himeji-castle-loop",
  "hirosaki-park-loop",
  "hiroshima-castle-loop",
  "imabari-castle-port",
  "inuyama-castle-kisogawa",
  "kanazawa-castle-loop",
  "katsuyama-park-murasaki-river",
  "kochi-castle-loop",
  "kumamoto-castle-loop",
  "matsue-castle-loop",
  "matsumoto-castle-loop",
  "meijo",
  "morioka-city-jog",
  "marugame-castle-loop",
  "nijo-castle-loop",
  "okayama-castle-korakuen",
  "osakajo",
  "saga-castle-moat",
  "shiroyama-park-horinouchi",
  "sunpu-castle-park",
  "shuri-castle-loop",
  "takaoka-castle-park",
  "takada-castle-park",
  "tokushima-central-park",
  "toyama-castle-park",
  "tsurugajo-loop",
  "ueda-castle-park",
  "wakayama-castle-park",
  "yamagata-city-loop",
  "yokote-park",
] as const;

const castleRunSpotSet = new Set<string>(castleRunSpotSlugs);

type Tag = { slug: string; name: string };

// DB のタグに、該当する仮想タグを後ろに足す(重複はしない)
export function withVirtualTags(tags: Tag[], spot: { slug: string; distanceM: number }): Tag[] {
  const result = [...tags];
  const add = (tag: Tag) => { if (!result.some((item) => item.slug === tag.slug)) result.push({ slug: tag.slug, name: tag.name }); };
  if (spot.distanceM >= longRunDistanceM) add(longRunTag);
  if (castleRunSpotSet.has(spot.slug)) add(castleRunTag);
  return result;
}
