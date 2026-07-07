import type { Metadata } from "next";
import Link from "next/link";
import { SearchFilters } from "@/components/search-filters";
import { SortSelect } from "@/components/sort-select";
import { SpotCard } from "@/components/spot-card";
import { SpotsMapShell } from "@/components/map/spots-map-shell";
import { getTags, searchSpots, searchSpotsForMap } from "@/db/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ランニングスポットをさがす", description: "都道府県、距離、コース形状、タグ、設備から日本全国のランニングスポットを検索できます。" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SpotsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) as Record<string, string | undefined>;
  const distance = params.dist?.split("-");
  const distMin = distance?.[0] ? Number(distance[0]) * 1000 : undefined;
  const distMax = distance?.[1] ? Number(distance[1]) * 1000 : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = {
    pref: params.pref, tags: params.tags?.split(",").filter(Boolean), type: params.type, distMin, distMax, q: params.q,
    toilet: params.toilet === "1", locker: params.locker === "1", sento: params.sento === "1", sort: params.sort, page,
  };
  const [allTags, result, mapSpots] = await Promise.all([getTags(), searchSpots(filters), searchSpotsForMap(filters)]);
  const pages = Math.ceil(result.total / 20);
  const pageHref = (target: number) => { const next = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))); next.set("page", String(target)); return `/spots?${next}`; };
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">ランニングスポットをさがす</h1>
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <div className="min-w-0 space-y-6">
          <SearchFilters tags={allTags} params={params} />
          <div className="flex items-center justify-between gap-4"><p className="font-bold"><span className="text-2xl">{result.total}</span>件のスポット</p><SortSelect /></div>
          {result.spots.length ? <div className="space-y-4">{result.spots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div> : <div className="rounded-xl border border-line bg-cream px-5 py-16 text-center"><p className="font-bold">条件に合うスポットが見つかりませんでした</p><Link href="/spots" className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 font-bold">条件をクリア</Link></div>}
          {pages > 1 && <nav aria-label="ページネーション" className="flex justify-center gap-2 pt-4">{Array.from({ length: pages }, (_, index) => index + 1).map((value) => <Link key={value} href={pageHref(value)} aria-current={page === value ? "page" : undefined} className={`grid size-10 place-items-center rounded-lg border font-bold ${page === value ? "border-brand bg-brand" : "border-line bg-paper"}`}>{value}</Link>)}</nav>}
        </div>
        <SpotsMapShell spots={mapSpots} />
      </div>
    </div>
  );
}
