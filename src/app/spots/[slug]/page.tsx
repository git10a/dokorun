import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicRuns, getSitemapSpots, getSpotCommunities, getSpotDetailWithNearby } from "@/db/data";
import { CourseMap } from "@/components/map/course-map";
import { DirectionsLink } from "@/components/directions-link";
import { FacilityIcons } from "@/components/facility-icons";
import { TrackView } from "@/components/track-view";
import { ShareButtons } from "@/components/share-buttons";
import { SpecPanel } from "@/components/spec-panel";
import { TrackUsagePanel } from "@/components/track-usage-panel";
import { SpotCard } from "@/components/spot-card";
import { imageTransformUrl, SpotImage } from "@/components/spot-image";
import { NearbyDestinations } from "@/components/nearby-destinations";
import { SpotCommunities } from "@/components/spot-communities";
import { RunCoursePanel } from "@/components/run-course-panel";
import { LongCourseGuide } from "@/components/long-course-guide";
import { SpotFlashMessage } from "@/components/spot-flash-message";
import { SpotRunFeed, type PublicSpotRun } from "@/components/spot-run-feed";
import { SpotCheckInActions, SpotViewerButtons } from "@/components/spot-viewer-state";
import { SpotDetailTabs, type SpotDetailTab, type SpotDetailTabItem } from "@/components/spot-detail-tabs";
import { prefectureSlug } from "@/lib/areas";
import { getNearbyDestinations } from "@/lib/nearby-destinations";
import { runPhotoUrl } from "@/lib/run-photos";
import { getSiteUrl } from "@/lib/site";
import { getCourseGuide } from "@/lib/course-guides";
import { stripPrepublishSentences } from "@/lib/public-description";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ tab?: string }>;

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
  return { title: { absolute: title }, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website", images: [ogImage] }, twitter: { card: "summary_large_image", title, description, images: [ogImage] } };
}

export default async function SpotDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const detail = await getSpotDetail(slug);
  if (!detail) notFound();
  const { spot, nearby } = detail;
  const [publicRuns, spotCommunities] = await Promise.all([
    getPublicRuns(spot.id, 10),
    getSpotCommunities(spot.id),
  ]);
  const initialRuns: PublicSpotRun[] = publicRuns.map((run) => ({
    id: run.id,
    ranAt: run.ranAt.toISOString(),
    userName: run.userName,
    userHandle: run.userHandle,
    // カスタムavatar URLには内部userIdが入るため、共有ISR HTMLでは外部画像だけを使う。
    // クライアント更新後はprivate/no-store APIから正式なavatar URLを受け取る。
    userImageUrl: run.userCustomAvatarAt ? null : run.userImage,
    comment: run.comment,
    photoUrl: run.photoKey ? runPhotoUrl(run.photoKey) : null,
    canEdit: false,
  }));
  const destinations = getNearbyDestinations(spot.slug);
  const courseGuide = await getCourseGuide(spot.slug);
  const guideHeroPhoto = courseGuide?.checkpoints.find((checkpoint) => checkpoint.id === courseGuide.heroCheckpointId)?.photo
    ?? courseGuide?.checkpoints.find((checkpoint) => checkpoint.photo)?.photo;
  const publicSpotDescription = stripPrepublishSentences(spot.description);
  const activeTab: SpotDetailTab = tab === "logs" || tab === "communities" ? tab : "course";
  const detailTabs: SpotDetailTabItem[] = [
    { id: "course", label: "コース情報", href: `/spots/${spot.slug}` },
    { id: "logs", label: "ランログ", count: spot.runsCount, href: `/spots/${spot.slug}?tab=logs` },
    { id: "communities", label: "コミュニティ", count: spotCommunities.length, href: `/spots/${spot.slug}?tab=communities` },
  ];
  const baseUrl = getSiteUrl();
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: baseUrl },
      { "@type": "ListItem", position: 2, name: spot.prefecture, item: `${baseUrl}/areas/${prefectureSlug(spot.prefecture)}` },
      { "@type": "ListItem", position: 3, name: spot.name, item: `${baseUrl}/spots/${spot.slug}` },
    ],
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: spot.name,
    url: `${baseUrl}/spots/${spot.slug}`,
    description: publicSpotDescription,
    address: { "@type": "PostalAddress", addressRegion: spot.prefecture, addressLocality: spot.city, addressCountry: "JP" },
    geo: { "@type": "GeoCoordinates", latitude: spot.lat, longitude: spot.lng },
    image: [...spot.photos.map((photo) => photo.url), ...(courseGuide?.checkpoints.flatMap((checkpoint) => checkpoint.photo ? [checkpoint.photo.url] : []) ?? [])],
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "コース距離", value: `${(spot.distanceM / 1000).toFixed(1)}km` },
      { "@type": "LocationFeatureSpecification", name: "トイレ", value: spot.hasToilet },
      { "@type": "LocationFeatureSpecification", name: "ロッカー", value: spot.hasLocker },
      { "@type": "LocationFeatureSpecification", name: "ランステ", value: spot.hasShower},
    ],
  };
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbData, structuredData]).replace(/</g, "\\u003c") }} />
      <TrackView name="spot_view" meta={{ slug: spot.slug }} />
      <SpotDetailTabs tabs={detailTabs} activeTab={activeTab} className="sticky top-16 z-40 -mx-4 -mt-8 flex overflow-x-auto bg-paper/95 backdrop-blur sm:hidden" />
      <SpotFlashMessage placement="info" />
      {guideHeroPhoto ? <header className="relative -mx-4 -mt-8 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-2xl">
        <SpotImage src={guideHeroPhoto.url} alt={guideHeroPhoto.alt} width={1280} height={720} sizes="(min-width: 768px) 1024px, 100vw" priority unoptimized className="aspect-video min-h-[270px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-paper sm:p-8"><p className="text-sm font-bold">{spot.prefecture} {spot.city}</p><h1 className="mt-2 text-3xl font-black sm:text-5xl">{spot.name}</h1><p className="mt-1 text-xs text-paper/80">{spot.nameKana}</p></div>
        <Link href={`/spots/${spot.slug}/edit`} className="absolute right-3 top-3 rounded-lg bg-paper/90 px-3 py-1.5 text-xs font-bold text-ink backdrop-blur">✏️ 情報修正</Link>
      </header> : <header><div className="flex items-start justify-between gap-3"><p className="text-sm text-sub"><Link href={`/areas/${prefectureSlug(spot.prefecture)}`} className="hover:underline">{spot.prefecture}</Link> {spot.city}</p><Link href={`/spots/${spot.slug}/edit`} className="shrink-0 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-bold text-sub hover:bg-cream">✏️ 情報修正</Link></div><h1 className="mt-2 text-3xl font-black sm:text-5xl">{spot.name}</h1><p className="mt-1 text-sm text-sub">{spot.nameKana}</p><div className="mt-4 flex flex-wrap gap-2">{spot.tags.map((tag) => <span key={tag.slug} className="rounded-full bg-cream px-3 py-1.5 text-sm">{tag.name}</span>)}</div></header>}
      <div className="flex flex-wrap items-center gap-3"><SpotViewerButtons spotId={spot.id} slug={spot.slug} count={spot.hashiritaiCount} /><ShareButtons url={`${baseUrl}/spots/${spot.slug}`} text={`${spot.name}のランニングコース - どこラン`} /></div>
      <SpotDetailTabs tabs={detailTabs} activeTab={activeTab} className="sticky top-16 z-40 hidden overflow-x-auto bg-paper/95 backdrop-blur sm:flex" />
      {activeTab === "course" && <>
        <header><p className="text-xs font-bold text-sub">コース情報</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">コースを知る</h2><p className="mt-2 text-sm text-sub">ルート、起伏、見どころを確認</p></header>
        {spot.photos.length > 0 && <section aria-label="写真" className="flex snap-x gap-4 overflow-x-auto pb-2">{spot.photos.map((photo, index) => <figure key={photo.id} className="w-[85%] shrink-0 snap-center sm:w-[60%]"><SpotImage src={photo.url} alt={photo.caption ?? `${spot.name}の写真`} width={1280} height={720} sizes="(min-width: 640px) 60vw, 85vw" priority={index === 0} className="aspect-video w-full rounded-2xl object-cover" />{photo.caption && <figcaption className="mt-2 text-sm text-sub">{photo.caption}</figcaption>}</figure>)}</section>}
        {courseGuide && spot.geojson ? <LongCourseGuide guide={courseGuide} geojson={spot.geojson} courseType={spot.courseType} surface={spot.surface} /> : <>
          <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">代表コース</h2><CourseMap lat={spot.lat} lng={spot.lng} geojson={spot.geojson} name={spot.name} /><DirectionsLink lat={spot.lat} lng={spot.lng} name={spot.name} slug={spot.slug} /></section>
          <RunCoursePanel slug={spot.slug} lat={spot.lat} lng={spot.lng} distanceM={spot.distanceM} courseType={spot.courseType} surface={spot.surface} access={spot.access} canDownloadGpx={Boolean(spot.geojson)} />
          <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">コーススペック</h2><SpecPanel distanceM={spot.distanceM} elevationGainM={spot.elevationGainM} signalsCount={spot.signalsCount} courseType={spot.courseType} surface={spot.surface} lighting={spot.nightLighting} /></section>
        </>}
        <section className="-mx-4 space-y-8 bg-cream px-4 py-8 sm:mx-0 sm:rounded-2xl sm:px-7">
          <header><p className="text-xs font-bold text-sub">走る前に</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">走る前に確認</h2><p className="mt-2 text-sm text-sub">使える設備と、現地までのアクセス</p></header>
          {spot.trackUsage && <div><h3 className="mb-5 text-lg font-bold sm:text-xl">トラック利用情報</h3><TrackUsagePanel usage={spot.trackUsage} /></div>}
          <div><h3 className="mb-5 text-lg font-bold sm:text-xl">設備</h3><FacilityIcons spot={spot} /></div>
          {spot.access && <div className="rounded-xl bg-paper p-5"><h3 className="mb-3 text-lg font-bold sm:text-xl">場所・アクセス</h3><p className="leading-7 text-sub">{spot.access}</p></div>}
        </section>
        {destinations.length > 0 && <div className="-mx-4 bg-brand/10 px-4 py-8 sm:mx-0 sm:rounded-2xl sm:px-7"><NearbyDestinations places={destinations} /></div>}
        {nearby.length > 0 && <section><div className="mb-5"><p className="text-xs font-bold text-sub">次に走るなら</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">近くのランニングスポット</h2><p className="mt-2 text-sm text-sub">この場所の近くにある別のコース</p></div><div className="grid gap-5 lg:grid-cols-2">{nearby.map((item) => <SpotCard key={item.id} spot={item} />)}</div></section>}
      </>}
      {activeTab === "logs" && <section id="dokolog" className="scroll-mt-32 rounded-2xl bg-cream px-5 py-8 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">みんなのランログ</h2><p className="mt-1 text-sm text-sub">このスポットで走った記録</p></div><SpotCheckInActions spotId={spot.id} slug={spot.slug} /></div>
        <SpotFlashMessage placement="run" />
        <SpotRunFeed slug={spot.slug} spotName={spot.name} initialRuns={initialRuns} totalCount={spot.runsCount} tabbed />
      </section>
      }
      {activeTab === "communities" && (spotCommunities.length > 0
        ? <SpotCommunities communities={spotCommunities} />
        : <section id="communities" className="rounded-2xl border border-line bg-cream px-5 py-8 sm:px-7"><h2 className="text-xl font-bold">ここで走ってるコミュニティ</h2><p className="mt-2 leading-7 text-sub">まだ登録されているコミュニティはありません。</p><Link href="/contact" className="mt-5 inline-flex rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-bold hover:bg-brand">この場所のコミュニティを掲載する</Link></section>)}
      {nearby.length > 0 && activeTab !== "course" && <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">近くのスポット</h2><div className="grid gap-5 lg:grid-cols-2">{nearby.map((item) => <SpotCard key={item.id} spot={item} />)}</div></section>}
    </div>
  );
}
