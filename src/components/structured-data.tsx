import { getSiteUrl } from "@/lib/site";

// JSON-LD を埋め込む。"</script>" で抜けられないよう < をエスケープする
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(items: Crumb[]) {
  const baseUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path === "/" ? baseUrl : `${baseUrl}${item.path}`,
    })),
  };
}

// スポット一覧ページ用の ItemList
export function spotItemListJsonLd(name: string, spots: { name: string; slug: string }[]) {
  const baseUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: spots.length,
    itemListElement: spots.map((spot, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: spot.name,
      url: `${baseUrl}/spots/${spot.slug}`,
    })),
  };
}
