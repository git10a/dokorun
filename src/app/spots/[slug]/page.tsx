import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSitemapSpots, getSpotCommunities, getSpotDetailWithNearby } from "@/db/data";
import { CourseMap } from "@/components/map/course-map";
import { FacilityIcons } from "@/components/facility-icons";
import { TrackView } from "@/components/track-view";
import { ShareButtons } from "@/components/share-buttons";
import { SpecPanel } from "@/components/spec-panel";
import { TrackUsagePanel } from "@/components/track-usage-panel";
import { SpotCard } from "@/components/spot-card";
import { imageTransformUrl, SpotImage } from "@/components/spot-image";
import { NearbyDestinations } from "@/components/nearby-destinations";
import { NearbyRaces } from "@/components/nearby-races";
import { racesNearSpot } from "@/lib/nearby-races";
import { SpotCommunities } from "@/components/spot-communities";
import { RunCoursePanel } from "@/components/run-course-panel";
import { LongCourseGuide } from "@/components/long-course-guide";
import { SpotFlashMessage } from "@/components/spot-flash-message";
import { SpotRunFeed } from "@/components/spot-run-feed";
import { SpotCheckInActions, SpotViewerButtons } from "@/components/spot-viewer-state";
import { SpotDetailTabs, SpotDetailPanel, type SpotDetailTabItem } from "@/components/spot-detail-tabs";
import { prefectureSlug } from "@/lib/areas";
import { getNearbyDestinations } from "@/lib/nearby-destinations";
import { getSiteUrl, openGraph } from "@/lib/site";
import { getCourseGuide } from "@/lib/course-guides";
import { stripPrepublishSentences } from "@/lib/public-description";
import { breadcrumbJsonLd, JsonLd } from "@/components/structured-data";
import { SectionHeading } from "@/components/section-heading";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const publishedSpots = await getSitemapSpots();
  return publishedSpots.map(({ slug }) => ({ slug }));
}

// generateMetadataと本体は同一リクエスト内で実行されるため、cache()で1回のフェッチを共有する
const getSpotDetail = cache(getSpotDetailWithNearby);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const spot = (await getSpotDetail(slug))?.spot;
  if (!spot) return { title: "スポットが見つかりません" };
  const feature = spot.tags.find((tag) => tag.slug === "no-signals")?.name ?? spot.tags[0]?.name;
  const publicSpotDescription = stripPrepublishSentences(spot.description);
  const description = `1周${(spot.distanceM / 1000).toFixed(1)}km${feature ? `・${feature}` : ""}${spot.nightLighting === "bright" ? "・夜も明るい" : ""}。${publicSpotDescription.slice(0, 90)}`;
  const title = `${spot.name}のランニングコース - どこラン`;
  const canonical = `/spots/${spot.slug}`;
  // コース地図OGP(scripts/generate-og-images.tsで生成)を最優先。地図がなければ写真、それもなければ共通OGP
  const ogImage = spot.hasCourse
    ? { url: `/og/spots/${spot.slug}.jpg`, width: 1200, height: 630 }
    : spot.photos[0]?.url
      ? imageTransformUrl(spot.photos[0].url, 1200)
      : "/og.png";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: openGraph({ title, description, url: canonical, images: [ogImage] }),
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function SpotDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getSpotDetail(slug);
  if (!detail) notFound();
  const { spot, nearby } = detail;
  const spotCommunities = await getSpotCommunities(spot.id);
  const destinations = getNearbyDestinations(spot.slug);
  const nearbyRaces = racesNearSpot(spot);
  const courseGuide = await getCourseGuide(spot.slug);
  const guideHeroPhoto =
    courseGuide?.checkpoints.find((checkpoint) => checkpoint.id === courseGuide.heroCheckpointId)?.photo ??
    courseGuide?.checkpoints.find((checkpoint) => checkpoint.photo)?.photo;
  const publicSpotDescription = stripPrepublishSentences(spot.description);
  const detailTabs: SpotDetailTabItem[] = [
    { id: "course", label: "コース情報", href: `/spots/${spot.slug}` },
    { id: "logs", label: "ランログ", count: spot.runsCount, href: `/spots/${spot.slug}?tab=logs` },
    {
      id: "communities",
      label: "コミュニティ",
      count: spotCommunities.length,
      href: `/spots/${spot.slug}?tab=communities`,
    },
  ];
  const baseUrl = getSiteUrl();
  const breadcrumbData = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: spot.prefecture, path: `/areas/${prefectureSlug(spot.prefecture)}` },
    { name: spot.name, path: `/spots/${spot.slug}` },
  ]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: spot.name,
    url: `${baseUrl}/spots/${spot.slug}`,
    description: publicSpotDescription,
    address: {
      "@type": "PostalAddress",
      addressRegion: spot.prefecture,
      addressLocality: spot.city,
      addressCountry: "JP",
    },
    geo: { "@type": "GeoCoordinates", latitude: spot.lat, longitude: spot.lng },
    image: [
      ...spot.photos.map((photo) => photo.url),
      ...(courseGuide?.checkpoints.flatMap((checkpoint) => (checkpoint.photo ? [checkpoint.photo.url] : [])) ?? []),
    ],
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "コース距離", value: `${(spot.distanceM / 1000).toFixed(1)}km` },
      { "@type": "LocationFeatureSpecification", name: "トイレ", value: spot.hasToilet },
      { "@type": "LocationFeatureSpecification", name: "ロッカー", value: spot.hasLocker },
      { "@type": "LocationFeatureSpecification", name: "ランステ", value: spot.hasShower },
    ],
  };
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 md:px-6">
      <JsonLd data={[breadcrumbData, structuredData]} />
      <TrackView name="spot_view" meta={{ slug: spot.slug }} />
      <SpotDetailTabs
        tabs={detailTabs}
        className="sticky top-16 z-40 -mx-4 -mt-8 flex overflow-x-auto bg-paper/95 backdrop-blur sm:hidden"
      />
      <SpotFlashMessage placement="info" />
      {guideHeroPhoto ? (
        <header className="relative -mx-4 -mt-8 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-2xl">
          <SpotImage
            src={guideHeroPhoto.url}
            alt={guideHeroPhoto.alt}
            width={1280}
            height={720}
            sizes="(min-width: 768px) 1024px, 100vw"
            priority
            unoptimized
            className="aspect-video min-h-[270px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-paper sm:p-8">
            <p className="text-sm font-bold">
              {spot.prefecture} {spot.city}
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">{spot.name}</h1>
            <p className="mt-1 text-xs text-paper/80">{spot.nameKana}</p>
          </div>
        </header>
      ) : (
        <header>
          <p className="text-sm text-sub">
            <Link href={`/areas/${prefectureSlug(spot.prefecture)}`} className="hover:underline">
              {spot.prefecture}
            </Link>{" "}
            {spot.city}
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">{spot.name}</h1>
          <p className="mt-1 text-sm text-sub">{spot.nameKana}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {spot.tags.map((tag) => (
              <span key={tag.slug} className="rounded-full bg-cream px-3 py-1.5 text-sm">
                {tag.name}
              </span>
            ))}
          </div>
        </header>
      )}
      <div className="-mt-4 flex flex-wrap items-center gap-2">
        <SpotViewerButtons spotId={spot.id} slug={spot.slug} count={spot.hashiritaiCount} />
        <ShareButtons url={`${baseUrl}/spots/${spot.slug}`} text={`${spot.name}のランニングコース - どこラン`} />
      </div>
      <SpotDetailTabs
        tabs={detailTabs}
        className="sticky top-16 z-40 hidden overflow-x-auto bg-paper/95 backdrop-blur sm:flex"
      />
      <SpotDetailPanel tab="course">
        {spot.photos.length > 0 && (
          <section aria-label="写真" className="flex snap-x gap-4 overflow-x-auto pb-2">
            {spot.photos.map((photo, index) => (
              <figure key={photo.id} className="w-[85%] shrink-0 snap-center sm:w-[60%]">
                <SpotImage
                  src={photo.url}
                  alt={photo.caption ?? `${spot.name}の写真`}
                  width={1280}
                  height={720}
                  sizes="(min-width: 640px) 60vw, 85vw"
                  priority={index === 0}
                  className="aspect-video w-full rounded-2xl object-cover"
                />
                {photo.caption && <figcaption className="mt-2 text-sm text-sub">{photo.caption}</figcaption>}
              </figure>
            ))}
          </section>
        )}
        {courseGuide && spot.geojson ? (
          <LongCourseGuide
            guide={courseGuide}
            geojson={spot.geojson}
            courseType={spot.courseType}
            surface={spot.surface}
          />
        ) : (
          <>
            <SpecPanel
              distanceM={spot.distanceM}
              elevationGainM={spot.elevationGainM}
              signalsCount={spot.signalsCount}
              courseType={spot.courseType}
              surface={spot.surface}
              lighting={spot.nightLighting}
            />
            {publicSpotDescription && <p className="max-w-3xl leading-7">{publicSpotDescription}</p>}
            <section className="space-y-4">
              <SectionHeading>コースマップ</SectionHeading>
              <CourseMap lat={spot.lat} lng={spot.lng} geojson={spot.geojson} name={spot.name} />
              <RunCoursePanel slug={spot.slug} lat={spot.lat} lng={spot.lng} canDownloadGpx={Boolean(spot.geojson)} />
            </section>
          </>
        )}
        {nearbyRaces.length > 0 && <NearbyRaces items={nearbyRaces} spotSlug={spot.slug} />}
        <section className="space-y-6">
          <SectionHeading>設備・アクセス</SectionHeading>
          {spot.trackUsage && (
            <div>
              <h3 className="mb-3 font-bold">トラック利用情報</h3>
              <TrackUsagePanel usage={spot.trackUsage} />
            </div>
          )}
          <div>
            <h3 className="mb-3 font-bold">設備</h3>
            <FacilityIcons spot={spot} />
          </div>
          {spot.access && (
            <div>
              <h3 className="mb-2 font-bold">アクセス</h3>
              <p className="text-sm leading-7 text-sub">{spot.access}</p>
            </div>
          )}
        </section>
        {destinations.length > 0 && <NearbyDestinations places={destinations} />}
        {nearby.length > 0 && (
          <section>
            <SectionHeading className="mb-4">近くのランニングスポット</SectionHeading>
            <div className="grid gap-3 lg:grid-cols-2">
              {nearby.map((item) => (
                <SpotCard key={item.id} spot={item} />
              ))}
            </div>
          </section>
        )}
        <p className="text-center text-sm text-sub">
          情報が古い・間違っている場合は
          <Link href={`/spots/${spot.slug}/edit`} className="ml-1 font-bold text-accent underline underline-offset-4">
            修正を提案
          </Link>
        </p>
      </SpotDetailPanel>
      <SpotDetailPanel tab="logs">
        <section id="dokolog" className="scroll-mt-32 rounded-2xl bg-cream px-5 py-8 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">みんなのランログ</h2>
              <p className="mt-1 text-sm text-sub">この辺で走った記録。コースぴったりじゃなくてOK</p>
            </div>
            <SpotCheckInActions spotId={spot.id} slug={spot.slug} />
          </div>
          <SpotFlashMessage placement="run" />
          <SpotRunFeed slug={spot.slug} spotName={spot.name} initialRuns={[]} totalCount={spot.runsCount} tabbed />
        </section>
      </SpotDetailPanel>
      <SpotDetailPanel tab="communities">
        {spotCommunities.length > 0 ? (
          <SpotCommunities communities={spotCommunities} />
        ) : (
          <section id="communities" className="rounded-2xl border border-line bg-cream px-5 py-8 sm:px-7">
            <h2 className="text-xl font-bold">ここで走ってるコミュニティ</h2>
            <p className="mt-2 leading-7 text-sub">まだ登録されているコミュニティはありません。</p>
            <Link
              href="/contact"
              className="mt-5 inline-flex rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-bold hover:bg-brand"
            >
              この場所のコミュニティを掲載する
            </Link>
          </section>
        )}
      </SpotDetailPanel>
      <SpotDetailPanel tab="not-course">
        {nearby.length > 0 && (
          <section>
            <SectionHeading className="mb-4">近くのランニングスポット</SectionHeading>
            <div className="grid gap-3 lg:grid-cols-2">
              {nearby.map((item) => (
                <SpotCard key={item.id} spot={item} />
              ))}
            </div>
          </section>
        )}
      </SpotDetailPanel>
    </div>
  );
}
