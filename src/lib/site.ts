export const siteConfig = {
  name: "どこラン",
  alternateName: "dokorun",
  title: "どこラン - マラソン大会のコースマップ・GPXと完走者の体験",
  description:
    "東京マラソン・大阪マラソンなど全国のマラソン大会のコースマップ・GPX・高低図と、走った人の体験をまとめています。大会のある街の有名ランニングスポットなど、全国のランニングコースも地図つきで探せます。",
  promise: "知らない土地でも、走る場所を決めて、そのまま走り始められる。",
  question: "次はどこでランする？",
} as const;

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
