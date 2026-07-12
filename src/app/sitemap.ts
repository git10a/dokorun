import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { getPrefectureCounts, getSitemapSpots } from "@/db/data";
import { prefectureSlug } from "@/lib/areas";
import { features } from "@/lib/features";
import { races } from "@/lib/races";

// クローラーアクセスのたびのD1クエリを1日1回に抑える。新スポットの反映は最大1日遅れる
export const revalidate = 86400;

const contentUpdatedAt = new Date("2026-07-12T00:00:00+09:00");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const fixedPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: contentUpdatedAt, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/spots`, lastModified: contentUpdatedAt, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/areas`, lastModified: contentUpdatedAt, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/features`, lastModified: contentUpdatedAt, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/races`, lastModified: contentUpdatedAt, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/guide/gpx`, lastModified: contentUpdatedAt, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: contentUpdatedAt, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
  const [spotRows, prefectureCounts] = await Promise.all([getSitemapSpots(), getPrefectureCounts()]);
  const spotPages: MetadataRoute.Sitemap = spotRows.map((spot) => ({
    url: `${baseUrl}/spots/${spot.slug}`,
    lastModified: spot.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  // スポットが存在する都道府県のみ載せる(0件エリアは404になるため)
  const areaPages: MetadataRoute.Sitemap = prefectureCounts.map(({ prefecture }) => ({
    url: `${baseUrl}/areas/${prefectureSlug(prefecture)}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const featurePages: MetadataRoute.Sitemap = features.map((feature) => ({
    url: `${baseUrl}/features/${feature.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const racePages: MetadataRoute.Sitemap = races.map((race) => ({
    url: `${baseUrl}/races/${race.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  return [...fixedPages, ...areaPages, ...featurePages, ...racePages, ...spotPages];
}
