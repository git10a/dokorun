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

type OpenGraph = NonNullable<import("next").Metadata["openGraph"]>;

export const defaultOgImage = { url: "/og.png", width: 1200, height: 630, alt: siteConfig.title };

// Next の metadata は openGraph をページ単位で丸ごと上書きする。
// 既定の siteName・画像が子ページで落ちないよう、openGraph は必ずここを通す
export function openGraph(og: OpenGraph = {}): OpenGraph {
  return { siteName: siteConfig.name, locale: "ja_JP", type: "website", images: [defaultOgImage], ...og };
}

// title/description/canonical/openGraph をまとめて組み立てる。title は layout のテンプレートで「| どこラン」が付く
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }) {
  const canonical = `${getSiteUrl()}${path}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: openGraph({ title, description, url: canonical }),
  } satisfies import("next").Metadata;
}
