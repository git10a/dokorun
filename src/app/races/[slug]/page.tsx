import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Download, MapPin } from "lucide-react";
import { getSpotSummariesBySlugs } from "@/db/data";
import { MemberGpxLink } from "@/components/member-gpx-link";
import { RaceExperience } from "@/components/race-experience";
import { TrackedLink } from "@/components/tracked-link";
import { SpotCard } from "@/components/spot-card";
import { TrackView } from "@/components/track-view";
import { racesByCalendar, raceBySlug } from "@/lib/races";
import { RaceCountdown } from "@/components/race-countdown";
import { jstTodayKey } from "@/lib/race-date";
import { raceDateKey, splitRacesBySchedule } from "@/lib/race-schedule";
import { raceCourseMeta, racePageTitle, racePageDescription } from "@/lib/race-page";
import { raceDistanceKm } from "@/lib/race-reviews";
import { getRaceReviews } from "@/db/race-reviews";

// スポット情報の更新反映が最大1時間遅れるのみ。検索エンジン向けの静的な面なのでISR化
export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return racesByCalendar.map((race) => ({ slug: race.slug }));
}

// generateMetadataと本体で同一リクエスト内のフェッチを共有する
const getSpots = cache(getSpotSummariesBySlugs);

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race) return { title: "ページが見つかりません" };
  const title = racePageTitle(race);
  const description = racePageDescription(race);
  const canonical = `${baseUrl()}/races/${slug}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical } };
}

export default async function RacePage({ params }: { params: Params }) {
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race) notFound();
  const [summaries, initialReviews] = await Promise.all([getSpots(race.spots.map((item) => item.slug)), getRaceReviews(slug)]);
  const summaryBySlug = new Map(summaries.map((spot) => [spot.slug, spot]));
  // 非公開化などでDBから消えたスポットは黙って落とし、定義順を保って表示する
  const spotItems = race.spots.flatMap((item) => {
    const spot = summaryBySlug.get(item.slug);
    return spot ? [{ spot }] : [];
  });
  const courseMeta = raceCourseMeta[slug];
  const schedule = splitRacesBySchedule();
  // 全大会を並べると長いので、開催が近い順に数件だけ見せて残りは一覧へ
  const otherRaces = [...schedule.upcoming, ...schedule.finished].filter((item) => item.slug !== race.slug).slice(0, 6);
  const dateKey = raceDateKey(race);
  // 発着点はGoogleマップで開けるようにする(独自の施設データは持たない)
  const start = courseMeta?.start;
  const finish = courseMeta?.finish;
  const finishDiffers = Boolean(start && finish && Math.hypot(start[0] - finish[0], start[1] - finish[1]) > 0.003);
  const raceDayLinks = start ? [
    { kind: "start", label: finishDiffers ? "スタート地点" : "発着点", href: `https://www.google.com/maps/search/?api=1&query=${start[0]},${start[1]}` },
    ...(finishDiffers && finish ? [{ kind: "finish", label: "ゴール地点", href: `https://www.google.com/maps/search/?api=1&query=${finish[0]},${finish[1]}` }] : []),
  ] : [];
  const title = racePageTitle(race);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: baseUrl() },
        { "@type": "ListItem", position: 2, name: "大会からさがす", item: `${baseUrl()}/races` },
        { "@type": "ListItem", position: 3, name: title, item: `${baseUrl()}/races/${slug}` },
      ],
    },
    ...(spotItems.length ? [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${race.name}の近くの有名ランニングスポット`,
      numberOfItems: spotItems.length,
      itemListElement: spotItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.spot.name,
        url: `${baseUrl()}/spots/${item.spot.slug}`,
      })),
    }] : []),
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <TrackView name="race_view" meta={{ race: slug }} />
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub">
        <Link href="/" className="hover:underline">ホーム</Link> / <Link href="/races" className="hover:underline">大会からさがす</Link> / {race.name}
      </nav>
      <h1 className="text-2xl font-bold sm:text-3xl">{race.name}のコースマップ・GPX</h1>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><CalendarDays size={16} className="shrink-0 text-sub" aria-label="開催日" /><span className="font-bold">{race.timing}</span>{dateKey && <RaceCountdown dateKey={dateKey} serverTodayKey={jstTodayKey()} />}</p>
      <RaceExperience slug={slug} name={race.name} distanceLabel={race.distanceLabel} maxKm={raceDistanceKm(race)} hasCourse={Boolean(courseMeta)} initialReviews={initialReviews}
        mapOverlay={courseMeta && <MemberGpxLink href={`/race-gpx/${slug}.gpx`} callbackURL={`/races/${slug}`} fileName={`${slug}.gpx`} slug={slug} meta={{ source: "race", courseYear: courseMeta.courseYear ? String(courseMeta.courseYear) : "unverified" }} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-bold shadow-md transition hover:bg-brand-dark"><Download size={16} />GPXをダウンロード</MemberGpxLink>}
        courseNote={courseMeta ? <div id="gpx" className="mt-2 scroll-mt-24 space-y-1.5 text-xs leading-5 text-sub">
          <p>{courseMeta.source === "gps" ? "ランナーの実走GPS" : "公式コース図をもとに独自作成"}・約{(courseMeta.distanceM / 1000).toFixed(1)}km・{courseMeta.courseYear ? `${courseMeta.courseYear}年コース` : "対象年は未確認"}{courseMeta.checkedAt ? `（${courseMeta.checkedAt}確認）` : ""}。主催者の公式GPXではありません。正式な距離・経路は<a href={courseMeta.sourceUrl ?? race.officialUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline underline-offset-2">公式情報</a>で。GPXは無料（ログインが必要）。</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {raceDayLinks.map((item) => <TrackedLink key={item.kind} event="race_day_link" meta={{ race: slug, kind: item.kind }} href={item.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-accent hover:underline"><MapPin size={13} />{item.label}をGoogleマップで見る</TrackedLink>)}
            <Link href="/guide/gpx" className="font-bold text-accent hover:underline">GPXを時計に入れるには</Link>
          </p>
        </div> : <p className="rounded-xl bg-cream p-6 text-sm">コースデータは準備中です。最新のコースは<a href={race.officialUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline underline-offset-2">公式サイト</a>でご確認ください。</p>} />
      {spotItems.length > 0 && <section id="nearby" className="mt-12 scroll-mt-24">
      <h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">近くの有名ランニングスポット</h2>
      <div className="mt-5 space-y-4">
        {spotItems.map((item) => <SpotCard key={item.spot.slug} spot={item.spot} />)}
      </div>
      </section>}
      <section className="mt-14">
        <h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold">ほかの大会</h2>
        <div className="flex flex-wrap gap-2.5">
          {otherRaces.map((item) => (
            <Link key={item.slug} href={`/races/${item.slug}`} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream">
              {item.name}
            </Link>
          ))}
          <Link href="/races" className="px-2 py-2 text-sm font-bold text-accent hover:underline">すべての大会 →</Link>
        </div>
      </section>
    </div>
  );
}
