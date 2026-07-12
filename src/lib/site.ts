export const siteConfig = {
  name: "どこラン",
  alternateName: "dokorun",
  title: "どこラン - 知らない土地でも走れるランニングコースが見つかる",
  description:
    "「次はどこでランする？」に答えるランニングコース検索サイト。旅先・出張先・大会遠征でも、コース地図と距離・信号・トイレ情報つきで、今すぐ走れる場所が見つかります。",
  promise: "知らない土地でも、走る場所を決めて、そのまま走り始められる。",
  question: "次はどこでランする？",
} as const;

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
