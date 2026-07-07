import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNearbySpots, getSpotBySlug } from "@/db/data";
import { CourseMap } from "@/components/map/course-map";
import { DirectionsLink } from "@/components/directions-link";
import { FacilityIcons } from "@/components/facility-icons";
import { TrackView } from "@/components/track-view";
import { HashiritaiButton } from "@/components/hashiritai-button";
import { ShareButtons } from "@/components/share-buttons";
import { SpecPanel } from "@/components/spec-panel";
import { SpotCard } from "@/components/spot-card";
import { imageTransformUrl, SpotImage } from "@/components/spot-image";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const spot = await getSpotBySlug(slug);
  if (!spot) return { title: "スポットが見つかりません" };
  const feature = spot.tags.find((tag) => tag.slug === "no-signals")?.name ?? spot.tags[0]?.name;
  const description = `1周${(spot.distanceM / 1000).toFixed(1)}km${feature ? `・${feature}` : ""}${spot.nightLighting === "bright" ? "・夜も明るい" : ""}。${spot.description.slice(0, 90)}`;
  const title = `${spot.name}のランニングコース - ドコラン`;
  return { title: { absolute: title }, description, openGraph: { title, description, images: spot.photos[0]?.url ? [imageTransformUrl(spot.photos[0].url, 1200)] : ["/og.png"] } };
}

export default async function SpotDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const spot = await getSpotBySlug(slug);
  if (!spot) notFound();
  const nearby = await getNearbySpots(spot.prefecture, spot.id);
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: spot.name,
    url: `${baseUrl}/spots/${spot.slug}`,
    description: spot.description,
    address: { "@type": "PostalAddress", addressRegion: spot.prefecture, addressLocality: spot.city, addressCountry: "JP" },
    geo: { "@type": "GeoCoordinates", latitude: spot.lat, longitude: spot.lng },
    image: spot.photos.map((photo) => photo.url),
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "コース距離", value: `${(spot.distanceM / 1000).toFixed(1)}km` },
      { "@type": "LocationFeatureSpecification", name: "トイレ", value: spot.hasToilet },
      { "@type": "LocationFeatureSpecification", name: "ロッカー", value: spot.hasLocker },
      { "@type": "LocationFeatureSpecification", name: "シャワー", value: spot.hasShower },
    ],
  };
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <TrackView name="spot_view" meta={{ slug: spot.slug }} />
      <header><p className="text-sm text-sub">{spot.prefecture} {spot.city}</p><h1 className="mt-2 text-3xl font-black sm:text-5xl">{spot.name}</h1><p className="mt-1 text-sm text-sub">{spot.nameKana}</p><div className="mt-4 flex flex-wrap gap-2">{spot.tags.map((tag) => <span key={tag.slug} className="rounded-full bg-cream px-3 py-1.5 text-sm">{tag.name}</span>)}</div></header>
      <div className="flex flex-wrap items-center gap-3"><HashiritaiButton slug={spot.slug} count={spot.hashiritaiCount} /><div className="rounded-lg bg-cream px-4 py-3 text-sm font-bold">走リ活 {spot.runsCount}</div><ShareButtons url={`${baseUrl}/spots/${spot.slug}`} text={`${spot.name}のランニングコース - ドコラン`} /></div>
      {spot.photos.length > 0 && <section aria-label="写真" className="flex snap-x gap-4 overflow-x-auto pb-2">{spot.photos.map((photo, index) => <figure key={photo.id} className="w-[85%] shrink-0 snap-center sm:w-[60%]"><SpotImage src={photo.url} alt={photo.caption ?? `${spot.name}の写真`} width={1280} height={720} sizes="(min-width: 640px) 60vw, 85vw" priority={index === 0} className="aspect-video w-full rounded-2xl object-cover" />{photo.caption && <figcaption className="mt-2 text-sm text-sub">{photo.caption}</figcaption>}</figure>)}</section>}
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">代表コース</h2><CourseMap lat={spot.lat} lng={spot.lng} geojson={spot.geojson} name={spot.name} /><DirectionsLink lat={spot.lat} lng={spot.lng} name={spot.name} slug={spot.slug} /></section>
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">コーススペック</h2><SpecPanel distanceM={spot.distanceM} elevationGainM={spot.elevationGainM} signalsCount={spot.signalsCount} courseType={spot.courseType} surface={spot.surface} lighting={spot.nightLighting} /></section>
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">設備</h2><FacilityIcons spot={spot} /></section>
      <section className="space-y-7"><div><h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">このスポットについて</h2><p className="whitespace-pre-line leading-8">{spot.description}</p></div>{spot.access && <div><h3 className="mb-3 font-bold">場所・アクセス</h3><p className="leading-7 text-sub">{spot.access}</p></div>}</section>
      <section className="rounded-2xl bg-cream px-5 py-9"><h2 className="mb-4 text-xl font-bold">走リ活</h2><p className="text-sub">まだ走リ活はありません。投稿機能は準備中です 🏃</p></section>
      {nearby.length > 0 && <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">近くのスポット</h2><div className="grid gap-5 lg:grid-cols-2">{nearby.map((item) => <SpotCard key={item.id} spot={item} />)}</div></section>}
    </div>
  );
}
