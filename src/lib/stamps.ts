// スポットスタンプ: 「走ったよ」(runs)の回数で判子のインク色が育つコレクション要素。
// 画像は public/stamps/<slug>.png のマスクPNG(黒+アルファ)1枚だけを持ち、
// 色は CSS mask + background で塗る(scripts/make-stamp-mask.mjs で生成)。
// 新しいスポットのスタンプを追加したら STAMP_SLUGS に slug を足す。

// 一時停止中。再開時は true に戻す。
export const STAMP_BOOK_ENABLED = false;

export const STAMP_SLUGS = [
  "kokyo",
  "osakajo",
  "yoyogi",
  "komazawa",
  "oohori",
  "meijo",
  "arakawa",
  "senbako",
  "rainbow-bridge-odaiba",
  "kinuta-park-cross-country",
  "yamanote-loop",
  "meiji-jingu-gaien-loop",
  "showa-kinen-park",
  "ueno-onshi-park",
  "inokashira-park",
  "sumidagawa-terrace-sumida",
  "tamagawa-ryokuchi-marathon",
  "takao-inariyama-loop",
  "shonan-kaigan-cycling-road",
  "rinko-park",
  "kyoto-gyoen",
  "kamogawa-sanjo-demachiyanagi",
  "nagai-park",
  "heijo-palace-park",
  "nakajima-park",
  "hirosaki-park-loop",
  "lake-yamanaka-loop",
  "suwako-loop",
  "dogo-matsuyama-castle",
  "izumo-taisha-run",
] as const;

export function hasStamp(slug: string): boolean {
  return (STAMP_SLUGS as readonly string[]).includes(slug);
}

export function stampImageUrl(slug: string): string {
  return `/stamps/${slug}.png`;
}

export type StampTier = {
  key: "sumi" | "shu" | "kin";
  label: string;
  minRuns: number;
  // CSSのbackgroundに入る値(単色 or グラデーション)
  ink: string;
};

// 地味な墨色スタート → 10回で朱色 → 50回で金色
export const STAMP_TIERS: StampTier[] = [
  { key: "sumi", label: "墨", minRuns: 1, ink: "#5f666e" },
  { key: "shu", label: "朱", minRuns: 10, ink: "#d63d23" },
  { key: "kin", label: "金", minRuns: 50, ink: "linear-gradient(135deg, #c9a227 0%, #eed77a 45%, #a67c00 100%)" },
];

// 未取得(0回)時のインク色。うっすら影だけ見せる
export const STAMP_INK_LOCKED = "#c9c4b6";

export function stampTier(runCount: number): StampTier | null {
  let current: StampTier | null = null;
  for (const tier of STAMP_TIERS) {
    if (runCount >= tier.minRuns) current = tier;
  }
  return current;
}

export function nextStampTier(runCount: number): StampTier | null {
  return STAMP_TIERS.find((tier) => runCount < tier.minRuns) ?? null;
}
