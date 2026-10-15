import { cache } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CircleHelp, Download, Info, MapPin } from "lucide-react";
import { getSpotSummariesBySlugs } from "@/db/data";
import { MemberGpxLink } from "@/components/member-gpx-link";
import { RaceExperience } from "@/components/race-experience";
import { getRaceAtmosphere } from "@/lib/race-atmosphere";
import { SpotCard } from "@/components/spot-card";
import { TrackView } from "@/components/track-view";
import { racesByCalendar, raceBySlug, type RaceDef } from "@/lib/races";
import { RaceCountdown } from "@/components/race-countdown";
import { jstTodayKey } from "@/lib/race-date";
import { raceDateKey, splitRacesBySchedule } from "@/lib/race-schedule";
import { raceCourseMeta, racePageTitle, racePageDescription, type RaceCourseMeta } from "@/lib/race-page";
import { raceDistanceKm } from "@/lib/race-reviews";
import { getRaceReviews } from "@/db/race-reviews";
import { Breadcrumb } from "@/components/breadcrumb";
import { breadcrumbJsonLd, JsonLd, spotItemListJsonLd } from "@/components/structured-data";
import { getPublishedStories, raceStories } from "@/lib/race-stories";
import { RaceStoryCard } from "@/components/race-story";
import { SectionHeading } from "@/components/section-heading";
import { raceEditorial } from "@/lib/course-editorial";

// 時間ベースの再生成はしない(理由は spots/[slug]/page.tsx)。
// レビューの承認・非表示はrevalidatePathで反映し、スポット情報の更新は次の配信で反映する
export const revalidate = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return racesByCalendar.map((race) => ({ slug: race.slug }));
}

// generateMetadataと本体で同一リクエスト内のフェッチを共有する
const getSpots = cache(getSpotSummariesBySlugs);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race) return { title: "ページが見つかりません" };
  const title = racePageTitle(race);
  const description = racePageDescription(race);
  return pageMetadata({ title, description, path: `/races/${slug}` });
}

export default async function RacePage({ params }: { params: Params }) {
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race) notFound();
  const [summaries, initialReviews] = await Promise.all([
    getSpots(race.spots.map((item) => item.slug)),
    getRaceReviews(slug),
  ]);
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
  const title = racePageTitle(race);
  const structuredData = [
    breadcrumbJsonLd([
      { name: "ホーム", path: "/" },
      { name: "大会からさがす", path: "/races" },
      { name: title, path: `/races/${slug}` },
    ]),
    ...(spotItems.length
      ? [
          spotItemListJsonLd(
            `${race.name}の近くの有名ランニングスポット`,
            spotItems.map((item) => item.spot),
          ),
        ]
      : []),
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <JsonLd data={structuredData} />
      <TrackView name="race_view" meta={{ race: slug }} />
      <Breadcrumb
        items={[{ name: "ホーム", href: "/" }, { name: "大会からさがす", href: "/races" }, { name: race.name }]}
      />
      <h1 className="text-2xl font-bold sm:text-3xl">{race.name}のコースマップ</h1>
      <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-sub">
        <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{race.prefecture} {race.city}</span>
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <CalendarDays size={16} className="shrink-0 text-sub" aria-label="開催日" />
        <span className="font-bold">{race.timing}</span>
        {dateKey && <RaceCountdown dateKey={dateKey} serverTodayKey={jstTodayKey()} />}
      </p>
      {getPublishedStories(slug).map((story) => (
        <RaceStoryCard key={story.slug} story={story} />
      ))}
      {process.env.NODE_ENV === "development" &&
        raceStories
          .filter((story) => story.raceSlug === slug && story.isSample)
          .map((story) => <RaceStoryCard key={story.slug} story={story} preview />)}
      <RaceExperience
        slug={slug}
        name={race.name}
        distanceLabel={race.distanceLabel}
        maxKm={raceDistanceKm(race)}
        hasCourse={Boolean(courseMeta)}
        initialReviews={initialReviews}
        atmosphere={getRaceAtmosphere(slug, courseMeta?.courseYear)}
        editorial={raceEditorial[slug]}
        mapOverlay={courseMeta && <RaceGpxActions slug={slug} courseMeta={courseMeta} />}
        courseNote={<RaceCourseNote race={race} courseMeta={courseMeta} />}
      />
      {spotItems.length > 0 && (
        <section id="nearby" className="mt-12 scroll-mt-24">
          <SectionHeading>近くの有名ランニングスポット</SectionHeading>
          <div className="mt-5 grid snap-x snap-proximity auto-cols-[280px] grid-flow-col gap-5 overflow-x-auto p-1 pb-3 lg:grid-flow-row lg:grid-cols-3">
            {spotItems.map((item) => (
              <SpotCard key={item.spot.slug} spot={item.spot} compact />
            ))}
          </div>
        </section>
      )}
      <section className="mt-14">
        <SectionHeading className="mb-4">ほかの大会</SectionHeading>
        <div className="flex flex-wrap gap-2.5">
          {otherRaces.map((item) => (
            <Link
              key={item.slug}
              href={`/races/${item.slug}`}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream"
            >
              {item.name}
            </Link>
          ))}
          <Link href="/races" className="px-2 py-2 text-sm font-bold text-accent hover:underline">
            すべての大会 →
          </Link>
        </div>
      </section>
    </div>
  );
}

// 地図の左上に重ねる操作。GPXの取得と、ウォッチへの取り込み方の案内
function RaceGpxActions({ slug, courseMeta }: { slug: string; courseMeta: RaceCourseMeta }) {
  return (
    <div className="flex items-center gap-2">
      <MemberGpxLink
        href={`/race-gpx/${slug}.gpx`}
        callbackURL={`/races/${slug}`}
        fileName={`${slug}.gpx`}
        slug={slug}
        meta={{
          source: "race",
          courseYear: courseMeta.courseYear ? String(courseMeta.courseYear) : "unverified",
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-bold shadow-md transition hover:bg-brand-dark"
      >
        <Download size={16} />
        コースをダウンロード
      </MemberGpxLink>
      <Link
        href="/guide/gpx"
        title="ウォッチへの取り込み方"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-paper/95 text-sub shadow-sm hover:text-ink"
      >
        <CircleHelp size={18} aria-hidden="true" />
        <span className="sr-only">ウォッチへの取り込み方</span>
      </Link>
    </div>
  );
}

// 地図の直下に置く作成元・対象年の注記。コースがない大会では公式サイトへ案内する
function RaceCourseNote({ race, courseMeta }: { race: RaceDef; courseMeta: RaceCourseMeta | undefined }) {
  if (!courseMeta)
    return (
      <p className="rounded-xl bg-cream p-6 text-sm">
        コースデータは準備中です。最新のコースは
        <a
          href={race.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-accent underline underline-offset-2"
        >
          公式サイト
        </a>
        でご確認ください。
      </p>
    );
  return (
    <div id="gpx" className="mt-2 scroll-mt-24 space-y-1.5 text-xs leading-5 text-sub">
      {courseMeta.notice && (
        <p className="font-bold text-ink">
          {courseMeta.notice}{" "}
          <a
            href={race.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            大会公式サイト
          </a>
        </p>
      )}
      {/* 出典と注意書きは1行に畳み、気になる人だけ開いて読めるようにする */}
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
          <span>
            {courseMeta.source === "gps" ? "ランナーの実走GPS" : "公式コース図から独自作成"}・約
            {(courseMeta.distanceM / 1000).toFixed(1)}km・
            {courseMeta.courseYear ? `${courseMeta.courseYear}年コース` : "対象年は未確認"}
          </span>
          <Info size={13} className="shrink-0" aria-label="データについて詳しく" />
        </summary>
        <p className="mt-1">
          {courseMeta.checkedAt ? `${courseMeta.checkedAt}に確認。` : ""}
          主催者が配布するコースデータではありません。正式な距離・経路は
          <a
            href={courseMeta.sourceUrl ?? race.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-accent underline underline-offset-2"
          >
            公式情報
          </a>
          で。ダウンロードは無料（ログインが必要）。
        </p>
      </details>
    </div>
  );
}
