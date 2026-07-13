import Link from "next/link";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { events, hashiritai, spots } from "@/db/schema";

export const dynamic = "force-dynamic";

const eventLabels: Record<string, string> = {
  spot_view: "詳細閲覧",
  search: "検索実行",
  search_results: "検索結果表示",
  hashiritai: "ハシリタイ",
  share: "シェア",
  directions: "行き方クリック",
  route_start: "スタート地点へ",
  gpx_download: "GPX取得",
  course_guide_view: "コースガイド表示",
  start_point_select: "スタート地点選択",
  start_recommendation: "おすすめ始点判定",
  sort_near: "近い順ソート",
  feedback: "フォーム送信",
};

export default async function AdminStatsPage() {
  const db = getDb();
  // force-dynamicページなのでレンダー時点の現在時刻で集計してよい
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const externalTraffic = sql`coalesce(json_extract(${events.meta}, '$.internal'), 0) = 0`;
  // created_atはUNIXミリ秒なので、JSTオフセット(+9h)を足してから日付文字列にする
  const day = sql<string>`strftime('%Y-%m-%d', (${events.createdAt} + 32400000) / 1000, 'unixepoch')`;
  const [daily, topViews, topHashiritai, visitorSummary] = await Promise.all([
    db.select({ day, name: events.name, count: count() }).from(events)
      .where(and(gte(events.createdAt, since), externalTraffic)).groupBy(day, events.name),
    db.select({ slug: sql<string>`json_extract(${events.meta}, '$.slug')`, count: count() }).from(events)
      .where(and(eq(events.name, "spot_view"), gte(events.createdAt, since), externalTraffic))
      .groupBy(sql`json_extract(${events.meta}, '$.slug')`).orderBy(desc(count())).limit(10),
    db.select({ name: spots.name, slug: spots.slug, count: count() }).from(hashiritai)
      .innerJoin(spots, eq(spots.id, hashiritai.spotId))
      .groupBy(spots.id).orderBy(desc(count())).limit(10),
    db.select({
      visitors: sql<number>`count(distinct json_extract(${events.meta}, '$.visitorId'))`,
      sessions: sql<number>`count(distinct json_extract(${events.meta}, '$.sessionId'))`,
    }).from(events).where(and(
      gte(events.createdAt, since),
      externalTraffic,
      inArray(events.name, ["spot_view", "search_results", "route_start", "gpx_download"]),
    )),
  ]);
  const days = [...new Set(daily.map((row) => row.day))].sort().reverse();
  const names = Object.keys(eventLabels).filter((name) => daily.some((row) => row.name === name));
  const cell = new Map(daily.map((row) => [`${row.day}:${row.name}`, row.count]));
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-bold text-sub">ADMIN</p><h1 className="text-3xl font-bold">統計(直近14日)</h1></div>
        <Link href="/admin" className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold">スポット管理へ</Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-cream p-4"><p className="text-sm text-sub">ユニーク利用者</p><p className="mt-1 text-3xl font-black">{visitorSummary[0]?.visitors ?? 0}</p></div>
        <div className="rounded-xl border border-line bg-cream p-4"><p className="text-sm text-sub">セッション</p><p className="mt-1 text-3xl font-black">{visitorSummary[0]?.sessions ?? 0}</p></div>
      </div>
      <p className="mt-3 text-xs leading-6 text-sub">内部トラフィックは集計から除外します。運営端末では<Link href="/spots?dokorun_internal=1" className="mx-1 font-bold text-accent underline">内部トラフィックに設定</Link>してください。解除は<Link href="/spots?dokorun_internal=0" className="mx-1 font-bold text-accent underline">こちら</Link>。</p>
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold">日別イベント数</h2>
        {days.length ? (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-cream"><tr><th className="p-3">日付</th>{names.map((name) => <th key={name} className="p-3">{eventLabels[name]}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {days.map((value) => <tr key={value}><td className="p-3 font-bold">{value.slice(5)}</td>{names.map((name) => <td key={name} className="p-3">{cell.get(`${value}:${name}`) ?? 0}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="rounded-xl border border-line bg-cream p-10 text-center text-sub">まだイベントがありません</p>}
      </section>
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-bold">よく見られたスポット</h2>
          <ol className="space-y-2 text-sm">{topViews.map((row) => <li key={row.slug} className="flex justify-between gap-3 rounded-lg border border-line bg-paper px-4 py-2.5"><Link href={`/spots/${row.slug}`} className="font-bold underline underline-offset-4">{row.slug}</Link><span>{row.count}</span></li>)}{!topViews.length && <li className="text-sub">まだデータがありません</li>}</ol>
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">ハシリタイ累計</h2>
          <ol className="space-y-2 text-sm">{topHashiritai.map((row) => <li key={row.slug} className="flex justify-between gap-3 rounded-lg border border-line bg-paper px-4 py-2.5"><Link href={`/spots/${row.slug}`} className="font-bold underline underline-offset-4">{row.name}</Link><span>{row.count}</span></li>)}{!topHashiritai.length && <li className="text-sub">まだデータがありません</li>}</ol>
        </section>
      </div>
    </div>
  );
}
