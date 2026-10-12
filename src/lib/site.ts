export const siteConfig = {
  name: "どこラン",
  alternateName: "dokorun",
  title: "どこラン - マラソン大会のコースマップと完走者の体験",
  description:
    "マラソン大会のコースを予習して、自分のレース計画を。コースマップ・高低図・ペース表と、目標タイムに近い完走者の体験を大会ごとにまとめています。大会の街で走れるランニングスポットも紹介。",
  promise: "出る大会のコースと走った人の経験を知り、自分のレース計画を準備できる。",
  question: "次に走る大会は？",
  tagline: ["コースを知れば、ペースが変わる。", "ペースが変われば、タイムが縮む。", "タイムが縮めば、ゴールで笑える。"],
} as const;

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
