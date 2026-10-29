import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { getPrefectureCounts, getSitemapSpots } from "@/db/data";
import { prefectureSlug } from "@/lib/areas";
import { features } from "@/lib/features";
import { races } from "@/lib/races";
import { getStationLines, getStations } from "@/lib/stations";
import { getPublishedStories } from "@/lib/race-stories";
import { editorialLastModified, raceEditorial, spotEditorial, stationEditorial } from "@/lib/course-editorial";

// クローラーアクセスのたびにD1を引かないよう静的に生成する。新スポットは次の配信で反映する
export const revalidate = false;

const rebrandingUpdatedAt = new Date("2026-10-12T00:00:00+09:00");
const searchContentUpdatedAt = new Date("2026-10-16T00:00:00+09:00");
const contentUpdatedAt = new Date("2026-07-12T00:00:00+09:00");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const fixedPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: searchContentUpdatedAt, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/spots`, lastModified: contentUpdatedAt, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/areas`, lastModified: contentUpdatedAt, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/stations`, lastModified: contentUpdatedAt, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/stations/lines`, lastModified: contentUpdatedAt, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/features`, lastModified: contentUpdatedAt, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/races`, lastModified: searchContentUpdatedAt, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/guide/gpx`, lastModified: rebrandingUpdatedAt, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: rebrandingUpdatedAt, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: rebrandingUpdatedAt, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: rebrandingUpdatedAt, changeFrequency: "yearly", priority: 0.2 },
  ];
  const [spotRows, prefectureCounts] = await Promise.all([getSitemapSpots(), getPrefectureCounts()]);
  const spotPages: MetadataRoute.Sitemap = spotRows.map((spot) => ({
    url: `${baseUrl}/spots/${spot.slug}`,
    lastModified: editorialLastModified(spotEditorial[spot.slug], spot.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  // スポットが存在する都道府県のみ載せる(0件エリアは404になるため)
  const areaPages: MetadataRoute.Sitemap = prefectureCounts.map(({ prefecture }) => ({
    url: `${baseUrl}/areas/${prefectureSlug(prefecture)}`,
    lastModified: searchContentUpdatedAt,
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
    lastModified: editorialLastModified(raceEditorial[race.slug], searchContentUpdatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const stationPages: MetadataRoute.Sitemap = getStations().map((station) => ({
    url: `${baseUrl}/stations/${station.slug}`,
    lastModified: editorialLastModified(stationEditorial[station.slug]),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const stationLinePages: MetadataRoute.Sitemap = getStationLines().map((line) => ({
    url: `${baseUrl}/stations/lines/${line.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const storyPages: MetadataRoute.Sitemap = getPublishedStories().map((story) => ({
    url: `${baseUrl}/stories/${story.slug}`,
    lastModified: story.publishedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [
    ...fixedPages,
    ...areaPages,
    ...featurePages,
    ...racePages,
    ...stationPages,
    ...stationLinePages,
    ...spotPages,
    ...storyPages,
  ];
}
