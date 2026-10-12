import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Download, ExternalLink, Flag, MapPin } from "lucide-react";
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
    return spot ? [{ spot, reason: item.reason }] : [];
  });
  const courseMeta = raceCourseMeta[slug];
  const schedule = splitRacesBySchedule();
  const otherRaces = [...schedule.upcoming, ...schedule.finished].filter((item) => item.slug !== race.slug);
  const dateKey = raceDateKey(race);
  // 当日の会場まわり: 参考コースの発着点の周辺をGoogleマップで検索する(独自の施設データは持たない)
  const mapSearch = (query: string, point: number[]) => `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${point[0]},${point[1]},16z`;
  const start = courseMeta?.start;
  const finish = courseMeta?.finish;
  const finishDiffers = Boolean(start && finish && Math.hypot(start[0] - finish[0], start[1] - finish[1]) > 0.003);
  const raceDayLinks = start ? [
    { kind: "start", label: finishDiffers ? "スタート地点" : "発着点", href: `https://www.google.com/maps/search/?api=1&query=${start[0]},${start[1]}` },
    ...(finishDiffers && finish ? [{ kind: "finish", label: "ゴール地点", href: `https://www.google.com/maps/search/?api=1&query=${finish[0]},${finish[1]}` }] : []),
    { kind: "convenience", label: "コンビニ", href: mapSearch("コンビニ", start) },
    { kind: "toilet", label: "トイレ", href: mapSearch("トイレ", start) },
    { kind: "locker", label: "ロッカー", href: mapSearch("コインロッカー", start) },
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
      name: `${race.name}の試走・前日ランにおすすめのコース`,
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
      <div className="mt-3 space-y-1.5 text-sm">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1"><CalendarDays size={16} className="shrink-0 text-sub" aria-label="開催日" /><span className="font-bold">{race.timing}</span>{dateKey && <RaceCountdown dateKey={dateKey} serverTodayKey={jstTodayKey()} />}</p>
        <p className="flex items-start gap-2 text-sub"><Flag size={16} className="mt-0.5 shrink-0" aria-label="種目・発着" /><span>{race.distanceLabel}・{race.startFinish}<a href={race.officialUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 whitespace-nowrap font-bold text-accent hover:underline">公式サイト<ExternalLink size={13} /></a></span></p>
      </div>
      <nav aria-label="この大会の情報" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 text-sm font-bold [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        <a href="#course-map" className="shrink-0 rounded-full bg-brand px-4 py-2">コースマップ</a>
        {courseMeta && <a href="#gpx" className="shrink-0 rounded-full border border-line px-4 py-2 hover:bg-cream">GPX</a>}
        <a href="#pace" className="shrink-0 rounded-full border border-line px-4 py-2 hover:bg-cream">ペース表</a>
        <a href="#reviews" className="shrink-0 rounded-full border border-line px-4 py-2 hover:bg-cream">走った人の体験</a>
        {raceDayLinks.length > 0 && <a href="#race-day" className="shrink-0 rounded-full border border-line px-4 py-2 hover:bg-cream">当日の会場まわり</a>}
        {spotItems.length > 0 && <a href="#nearby" className="shrink-0 rounded-full border border-line px-4 py-2 hover:bg-cream">前日ラン</a>}
      </nav>
      <RaceExperience slug={slug} name={race.name} distanceLabel={race.distanceLabel} maxKm={raceDistanceKm(race)} hasCourse={Boolean(courseMeta)} initialReviews={initialReviews} courseInfo={
        <aside id="gpx" className="scroll-mt-24 rounded-2xl border border-line bg-cream p-5">
          <h3 className="font-bold">GPXをダウンロード</h3>
          {courseMeta ? <>
            <MemberGpxLink href={`/race-gpx/${slug}.gpx`} callbackURL={`/races/${slug}`} fileName={`${slug}.gpx`} slug={slug} meta={{ source: "race", courseYear: courseMeta.courseYear ? String(courseMeta.courseYear) : "unverified" }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold transition hover:bg-brand-dark"><Download size={17} />GPXをダウンロード（無料）</MemberGpxLink>
            <p className="mt-2 text-xs text-sub">ダウンロードにはログインが必要です。</p>
            <details className="group mt-3 text-sm">
              <summary className="cursor-pointer list-none font-bold text-accent [&::-webkit-details-marker]:hidden">時計でペース計画を作るには<span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span></summary>
              <ol className="mt-2 space-y-1.5">
                <li className="flex gap-2"><span className="font-black">1</span><span>Garmin Connect・COROSなどに取り込む（<Link href="/guide/gpx" className="font-bold text-accent underline underline-offset-4">取り込み方</Link>）</span></li>
                <li className="flex gap-2"><span className="font-black">2</span><span>GarminのPaceProなどで目標タイムを設定すると、起伏に合わせた1kmごとの目標ラップを作れます</span></li>
              </ol>
            </details>
            <a href="#pace" className="mt-2 block text-sm font-bold text-accent">時計がなくても、ペース表を作れます ↓</a>
            <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-sub"><span className="font-bold text-ink">{courseMeta.source === "gps" ? "ランナーの実走GPS" : "公式コース図をもとに独自作成"}・約{(courseMeta.distanceM / 1000).toFixed(1)}km・{courseMeta.courseYear ? `${courseMeta.courseYear}年コース` : "対象年は未確認"}{courseMeta.checkedAt ? `（${courseMeta.checkedAt}確認）` : ""}</span><br />主催者の公式GPXではありません。正式な距離・経路・交通規制は<a href={courseMeta.sourceUrl ?? race.officialUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline underline-offset-2">公式情報</a>をご確認ください。</p>
          </> : <p className="mt-3 text-sm leading-6 text-sub">コースデータは準備中です。最新のコースは<a href={race.officialUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline underline-offset-2">公式サイト</a>でご確認ください。</p>}
        </aside>
      } />
      {raceDayLinks.length > 0 && <section id="race-day" className="mt-12 scroll-mt-24">
        <h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">当日の会場まわり</h2>
        <p className="mt-3 text-sm leading-6 text-sub">スタート前の仮設トイレは混みがち。近くのコンビニや駅のトイレ、ロッカーの場所を先に見ておくと安心です。手荷物預かり（クローク）は大会の案内で確認を。</p>
        <ul className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          {raceDayLinks.map((item) => <li key={item.label}><TrackedLink event="race_day_link" meta={{ race: slug, kind: item.kind }} href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3 py-3 text-sm font-bold hover:bg-cream"><span className="flex items-center gap-2"><MapPin size={16} className="shrink-0 text-sub" />{item.label}</span><ExternalLink size={14} className="shrink-0 text-sub" /></TrackedLink></li>)}
        </ul>
        <p className="mt-2 text-xs text-sub">Googleマップが開きます。コンビニ・トイレ・ロッカーは参考コースの{finishDiffers ? "スタート地点" : "発着点"}周辺を表示します。</p>
      </section>}
      {spotItems.length > 0 && <section id="nearby" className="mt-12 scroll-mt-24">
      <h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">前日ラン・試走におすすめのスポット</h2>
      <p className="mt-3 text-sm leading-6 text-sub">{race.lead}</p>
      <div className="mt-5 space-y-6">
        {spotItems.map((item) => (
          <section key={item.spot.slug}>
            <p className="mb-2 text-sm leading-6">{item.reason}</p>
            <SpotCard spot={item.spot} />
          </section>
        ))}
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
        </div>
      </section>
    </div>
  );
}
