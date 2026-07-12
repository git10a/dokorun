import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Download, ExternalLink, Flag, MapPin, Route } from "lucide-react";
import { getSpotSummariesBySlugs } from "@/db/data";
import { RaceCourseMap } from "@/components/map/race-course-map";
import { SpotCard } from "@/components/spot-card";
import { TrackView } from "@/components/track-view";
import { racesByCalendar, raceBySlug } from "@/lib/races";
import raceCourses from "@/lib/race-courses.json";

type RaceCourseMeta = { distanceM: number; elevationGainM: number | null; source: "gps" | "map" };
const raceCourseMeta = raceCourses as Record<string, RaceCourseMeta | undefined>;

// スポット情報の更新反映が最大1時間遅れるのみ。検索エンジン向けの静的な面なのでISR化
export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

// generateMetadataと本体で同一リクエスト内のフェッチを共有する
const getSpots = cache(getSpotSummariesBySlugs);

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race) return { title: "ページが見つかりません" };
  const title = `${race.name}の試走・前日ランにおすすめのコース`;
  return { title, description: race.description, alternates: { canonical: `${baseUrl()}/races/${slug}` }, openGraph: { title, description: race.description } };
}

export default async function RacePage({ params }: { params: Params }) {
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race) notFound();
  const summaries = await getSpots(race.spots.map((item) => item.slug));
  const summaryBySlug = new Map(summaries.map((spot) => [spot.slug, spot]));
  // 非公開化などでDBから消えたスポットは黙って落とし、定義順を保って表示する
  const spotItems = race.spots.flatMap((item) => {
    const spot = summaryBySlug.get(item.slug);
    return spot ? [{ spot, reason: item.reason }] : [];
  });
  if (!spotItems.length) notFound();
  const courseMeta = raceCourseMeta[slug];
  const otherRaces = racesByCalendar.filter((item) => item.slug !== race.slug);
  const title = `${race.name}の試走・前日ランにおすすめのコース`;
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
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      numberOfItems: spotItems.length,
      itemListElement: spotItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.spot.name,
        url: `${baseUrl()}/spots/${item.spot.slug}`,
      })),
    },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <TrackView name="race_view" meta={{ race: slug }} />
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub">
        <Link href="/" className="hover:underline">ホーム</Link> / <Link href="/races" className="hover:underline">大会からさがす</Link> / {race.name}
      </nav>
      <h1 className="text-2xl font-bold sm:text-3xl">🏁 {title}</h1>
      <p className="mt-3 leading-7 text-sub">{race.lead}</p>
      <dl className="mt-5 grid gap-3 rounded-xl border border-line bg-cream p-5 text-sm sm:grid-cols-3">
        <div><dt className="flex items-center gap-1.5 font-bold text-sub"><CalendarDays size={16} className="text-brand-dark" />開催時期</dt><dd className="mt-1">{race.timing}</dd></div>
        <div><dt className="flex items-center gap-1.5 font-bold text-sub"><Route size={16} className="text-brand-dark" />種目</dt><dd className="mt-1">{race.distanceLabel}</dd></div>
        <div><dt className="flex items-center gap-1.5 font-bold text-sub"><Flag size={16} className="text-brand-dark" />発着</dt><dd className="mt-1">{race.startFinish}</dd></div>
      </dl>
      <a href={race.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline">
        {race.name}公式サイトを開く <ExternalLink size={15} />
      </a>
      {courseMeta && (
        <section className="mt-10">
          <h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">大会コース{courseMeta.source === "map" && "(参考)"}</h2>
          <RaceCourseMap slug={slug} name={race.name} />
          <a href={`/race-gpx/${slug}.gpx`} download={`${slug}.gpx`} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-5 py-3 font-bold transition hover:bg-cream">
            <Download size={18} /> 大会コースのGPXをダウンロード
          </a>
          <p className="mt-3 text-xs leading-5 text-sub">
            {courseMeta.source === "gps"
              ? `大会当日にこのコースを走ったランナーの実走GPSデータをもとに描いています(約${(courseMeta.distanceM / 1000).toFixed(1)}km)。`
              : `大会公式のコース図をもとに作成した参考図です(約${(courseMeta.distanceM / 1000).toFixed(1)}km)。`}
            コースは年により変更される場合があります。最新の正式なコース・交通規制は<a href={race.officialUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline underline-offset-2">大会公式サイト</a>をご確認ください。
          </p>
        </section>
      )}
      <h2 className="mt-12 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">試走・前日ランにおすすめのスポット</h2>
      <div className="mt-6 space-y-8">
        {spotItems.map((item) => (
          <section key={item.spot.slug}>
            <p className="mb-3 flex items-start gap-1.5 leading-7"><MapPin size={18} className="mt-1 shrink-0 text-brand-dark" />{item.reason}</p>
            <SpotCard spot={item.spot} />
          </section>
        ))}
      </div>
      <section className="mt-14">
        <h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold">ほかの大会からさがす</h2>
        <div className="flex flex-wrap gap-2.5">
          {otherRaces.map((item) => (
            <Link key={item.slug} href={`/races/${item.slug}`} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream">
              🏁 {item.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
