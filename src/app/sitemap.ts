import type { MetadataRoute } from "next";
import { getSitemapSpots } from "@/db/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const fixedPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/spots`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];
  const spotPages: MetadataRoute.Sitemap = (await getSitemapSpots()).map((spot) => ({
    url: `${baseUrl}/spots/${spot.slug}`,
    lastModified: spot.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...fixedPages, ...spotPages];
}
