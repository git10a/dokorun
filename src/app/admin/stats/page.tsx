import Link from "next/link";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { events, hashiritai, spots } from "@/db/schema";

export const dynamic = "force-dynamic";

const eventLabels: Record<string, string> = {
  spot_view: "詳細閲覧",
  search: "検索実行",
  hashiritai: "ハシリタイ",
  share: "シェア",
  directions: "行き方クリック",
  sort_near: "近い順ソート",
  feedback: "フォーム送信",
};

export default async function AdminStatsPage() {
  const db = getDb();
  // force-dynamicページなのでレンダー時点の現在時刻で集計してよい
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  // created_atはUNIXミリ秒なので、JSTオフセット(+9h)を足してから日付文字列にする
  const day = sql<string>`strftime('%Y-%m-%d', (${events.createdAt} + 32400000) / 1000, 'unixepoch')`;
  const [daily, topViews, topHashiritai] = await Promise.all([
    db.select({ day, name: events.name, count: count() }).from(events)
      .where(gte(events.createdAt, since)).groupBy(day, events.name),
    db.select({ slug: sql<string>`json_extract(${events.meta}, '$.slug')`, count: count() }).from(events)
      .where(and(eq(events.name, "spot_view"), gte(events.createdAt, since)))
      .groupBy(sql`json_extract(${events.meta}, '$.slug')`).orderBy(desc(count())).limit(10),
    db.select({ name: spots.name, slug: spots.slug, count: count() }).from(hashiritai)
      .innerJoin(spots, eq(spots.id, hashiritai.spotId))
      .groupBy(spots.id).orderBy(desc(count())).limit(10),
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
