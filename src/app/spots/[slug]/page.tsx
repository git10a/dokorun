/* eslint-disable @next/next/no-img-element */
import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicRuns, getSpotCommunities, getSpotDetailWithNearby, getUserSpotState } from "@/db/data";
import { CourseMap } from "@/components/map/course-map";
import { CheckInButton } from "@/components/checkin-button";
import { DirectionsLink } from "@/components/directions-link";
import { FacilityIcons } from "@/components/facility-icons";
import { TrackView } from "@/components/track-view";
import { HashiritaiButton } from "@/components/hashiritai-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButtons } from "@/components/share-buttons";
import { SpecPanel } from "@/components/spec-panel";
import { TrackUsagePanel } from "@/components/track-usage-panel";
import { SpotCard } from "@/components/spot-card";
import { imageTransformUrl, SpotImage } from "@/components/spot-image";
import { NearbyDestinations } from "@/components/nearby-destinations";
import { SpotCommunities } from "@/components/spot-communities";
import { prefectureSlug } from "@/lib/areas";
import { getNearbyDestinations } from "@/lib/nearby-destinations";
import { avatarUrl } from "@/lib/avatars";
import { getUser } from "@/lib/user";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

// generateMetadataと本体は同一リクエスト内で実行されるため、cache()で1回のフェッチを共有する
const getSpotDetail = cache(getSpotDetailWithNearby);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const spot = (await getSpotDetail(slug))?.spot;
  if (!spot) return { title: "スポットが見つかりません" };
  const feature = spot.tags.find((tag) => tag.slug === "no-signals")?.name ?? spot.tags[0]?.name;
  const description = `1周${(spot.distanceM / 1000).toFixed(1)}km${feature ? `・${feature}` : ""}${spot.nightLighting === "bright" ? "・夜も明るい" : ""}。${spot.description.slice(0, 90)}`;
  const title = `${spot.name}のランニングコース - どこラン`;
  // コース地図OGP(scripts/generate-og-images.tsで生成)を最優先。地図がなければ写真、それもなければ共通OGP
  const ogImage = spot.hasCourse
    ? { url: `/og/spots/${spot.slug}.jpg`, width: 1200, height: 630 }
    : spot.photos[0]?.url
      ? imageTransformUrl(spot.photos[0].url, 1200)
      : "/og.png";
  return { title: { absolute: title }, description, openGraph: { title, description, images: [ogImage] }, twitter: { card: "summary_large_image" } };
}

const runDateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });
const uuidPattern = /^[0-9a-f-]{36}$/i;

export default async function SpotDetailPage({ params, searchParams }: { params: Params; searchParams: Promise<{ logs?: string; posted?: string; run?: string }> }) {
  const [{ slug }, query, user] = await Promise.all([params, searchParams, getUser()]);
  const detail = await getSpotDetail(slug);
  if (!detail) notFound();
  const { spot, nearby } = detail;
  const safeRunId = query.run && uuidPattern.test(query.run) ? query.run : null;
  const [publicRuns, userState, spotCommunities] = await Promise.all([
    getPublicRuns(spot.id, query.logs === "all" ? 100 : 10),
    user ? getUserSpotState(spot.id, user.id) : null,
    getSpotCommunities(spot.id),
  ]);
  const initialLiked = userState?.isHashiritai ?? false;
  const initialFavorite = userState?.isFavorite ?? false;
  const todayRunId = userState?.todayRunId ?? null;
  const destinations = getNearbyDestinations(spot.slug);
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
    description: spot.description,
    address: { "@type": "PostalAddress", addressRegion: spot.prefecture, addressLocality: spot.city, addressCountry: "JP" },
    geo: { "@type": "GeoCoordinates", latitude: spot.lat, longitude: spot.lng },
    image: spot.photos.map((photo) => photo.url),
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
      {query.posted === "info" && <p className="rounded-lg bg-cream px-4 py-3 text-sm font-bold">スポット情報を修正しました。ご協力ありがとうございます ✏️</p>}
      <header><div className="flex items-start justify-between gap-3"><p className="text-sm text-sub"><Link href={`/areas/${prefectureSlug(spot.prefecture)}`} className="hover:underline">{spot.prefecture}</Link> {spot.city}</p><Link href={`/spots/${spot.slug}/edit`} className="shrink-0 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-bold text-sub hover:bg-cream">✏️ 情報修正</Link></div><h1 className="mt-2 text-3xl font-black sm:text-5xl">{spot.name}</h1><p className="mt-1 text-sm text-sub">{spot.nameKana}</p><div className="mt-4 flex flex-wrap gap-2">{spot.tags.map((tag) => <span key={tag.slug} className="rounded-full bg-cream px-3 py-1.5 text-sm">{tag.name}</span>)}</div></header>
      <div className="flex flex-wrap items-center gap-3"><HashiritaiButton slug={spot.slug} count={spot.hashiritaiCount} loggedIn={Boolean(user)} initialLiked={initialLiked} /><FavoriteButton spotId={spot.id} slug={spot.slug} loggedIn={Boolean(user)} initialFavorite={initialFavorite} /><a href="#dokolog" className="flex items-center gap-1.5 rounded-lg border border-line bg-cream px-4 py-3 text-sm font-bold transition hover:bg-brand/20">🏃 ランログ {spot.runsCount}件 <span aria-hidden className="text-xs text-sub">↓</span></a><ShareButtons url={`${baseUrl}/spots/${spot.slug}`} text={`${spot.name}のランニングコース - どこラン`} /></div>
      {spot.photos.length > 0 && <section aria-label="写真" className="flex snap-x gap-4 overflow-x-auto pb-2">{spot.photos.map((photo, index) => <figure key={photo.id} className="w-[85%] shrink-0 snap-center sm:w-[60%]"><SpotImage src={photo.url} alt={photo.caption ?? `${spot.name}の写真`} width={1280} height={720} sizes="(min-width: 640px) 60vw, 85vw" priority={index === 0} className="aspect-video w-full rounded-2xl object-cover" />{photo.caption && <figcaption className="mt-2 text-sm text-sub">{photo.caption}</figcaption>}</figure>)}</section>}
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">代表コース</h2><CourseMap lat={spot.lat} lng={spot.lng} geojson={spot.geojson} name={spot.name} /><DirectionsLink lat={spot.lat} lng={spot.lng} name={spot.name} slug={spot.slug} /></section>
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">コーススペック</h2><SpecPanel distanceM={spot.distanceM} elevationGainM={spot.elevationGainM} signalsCount={spot.signalsCount} courseType={spot.courseType} surface={spot.surface} lighting={spot.nightLighting} /></section>
      {spot.trackUsage && <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">トラック利用情報</h2><TrackUsagePanel usage={spot.trackUsage} /></section>}
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">設備</h2><FacilityIcons spot={spot} /></section>
      <section className="space-y-7"><div><h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">このスポットについて</h2><p className="whitespace-pre-line leading-8">{spot.description}</p></div>{spot.access && <div><h3 className="mb-3 font-bold">場所・アクセス</h3><p className="leading-7 text-sub">{spot.access}</p></div>}</section>
      <SpotCommunities communities={spotCommunities} />
      <NearbyDestinations places={destinations} />
      <section id="dokolog" className="scroll-mt-20 rounded-2xl bg-cream px-5 py-8 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">みんなのランログ</h2><p className="mt-1 text-sm text-sub">このスポットで走った記録</p></div><div className="flex flex-wrap items-center gap-3"><CheckInButton spotId={spot.id} spotSlug={spot.slug} loggedIn={Boolean(user)} todayRunId={todayRunId} /><Link href={user ? `/spots/${spot.slug}/log/new` : `/login?callbackURL=${encodeURIComponent(`/spots/${spot.slug}/log/new`)}`} className="rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-bold">ひとことつきで投稿</Link></div></div>        {query.posted === "1" && <p className="mt-5 rounded-lg bg-paper px-4 py-3 text-sm font-bold">ランログを投稿しました</p>}
        {query.posted === "checkin" && <p className="mt-5 rounded-lg bg-paper px-4 py-3 text-sm font-bold">走ったよを記録しました 🏃 {safeRunId && <Link href={`/me/logs/${safeRunId}/edit?returnTo=spot`} className="underline">ひとことを追加する</Link>}</p>}
        {query.posted === "updated" && <p className="mt-5 rounded-lg bg-paper px-4 py-3 text-sm font-bold">ランログを更新しました</p>}
        <div className="mt-6 space-y-4">{publicRuns.map((run) => {
          const userImage = avatarUrl({ id: run.userId, image: run.userImage, customAvatarAt: run.userCustomAvatarAt });
          return <article key={run.id} className="rounded-xl border border-line bg-paper p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3">{userImage ? <img src={userImage} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full object-cover" /> : <span className="grid size-9 place-items-center rounded-full bg-brand font-bold">{run.userName.slice(0, 1)}</span>}<div><Link href={`/u/${run.userHandle}`} className="font-bold hover:text-accent">{run.userName}</Link><p className="text-xs text-sub">{runDateFormat.format(run.ranAt)}</p></div></div>{user?.id === run.userId && <Link href={`/me/logs/${run.id}/edit?returnTo=spot`} className="text-sm font-bold text-accent">編集</Link>}</div>{run.comment ? <p className="mt-3 whitespace-pre-line leading-7">{run.comment}</p> : <p className="mt-3 text-sm text-sub">走ったよ 🏃</p>}</article>;
        })}</div>
        {!publicRuns.length && <p className="mt-6 text-sub">まだランログはありません。最初の記録を残してみませんか 🏃</p>}
        {query.logs !== "all" && spot.runsCount > 10 && <Link href={`/spots/${spot.slug}?logs=all#dokolog`} className="mt-5 inline-block font-bold text-accent">もっと見る</Link>}
      </section>
      {nearby.length > 0 && <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">近くのスポット</h2><div className="grid gap-5 lg:grid-cols-2">{nearby.map((item) => <SpotCard key={item.id} spot={item} />)}</div></section>}
    </div>
  );
}
