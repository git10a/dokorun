import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { NearMeButton } from "@/components/near-me-button";
import { SearchFilters } from "@/components/search-filters";
import { SortSelect } from "@/components/sort-select";
import { SpotCard } from "@/components/spot-card";
import { SpotsMapShell } from "@/components/map/spots-map-shell";
import { TrackView } from "@/components/track-view";
import { getSearchTags, searchSpots } from "@/db/data";
import { buildSpotRequestHref, distanceBetweenKm, nearbyFallbackFilters, normalizeSearchParams, searchParamsHref, toSearchFilters } from "@/lib/spot-search";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const raw = await searchParams;
  const params = normalizeSearchParams(raw);
  const page = Math.max(1, Number(params.page) || 1);
  const nonPaginationParams = Object.keys(params).filter((key) => key !== "page" && params[key]);
  const canonical = page > 1 && nonPaginationParams.length === 0 ? `/spots?page=${page}` : "/spots";
  const title = page > 1 && nonPaginationParams.length === 0 ? `ランニングスポットをさがす (${page}ページ目)` : "ランニングスポットをさがす";
  const description = "都道府県、距離、コース形状、タグ、設備から日本全国のランニングスポットを検索できます。";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    robots: nonPaginationParams.length > 0 ? { index: false, follow: true } : undefined,
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SpotsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = normalizeSearchParams(raw);
  const filters = toSearchFilters(params);
  const page = filters.page ?? 1;
  const [allTags, result] = await Promise.all([getSearchTags(), searchSpots(filters)]);
  const fallbackFilters = result.total === 0 ? nearbyFallbackFilters(filters) : null;
  const fallback = fallbackFilters ? await searchSpots(fallbackFilters) : null;
  const pages = Math.ceil(result.total / 20);
  const selectedTagNames = allTags.filter((tag) => filters.tags?.includes(tag.slug)).map((tag) => tag.name);
  const requestHref = buildSpotRequestHref(params, selectedTagNames);
  const pageHref = (target: number) => searchParamsHref("/spots", params, { page: String(target) });
  const mapParams = fallback?.spots.length
    ? new URLSearchParams()
    : new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  mapParams.delete("page");
  mapParams.delete("sort");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <TrackView name="search_results" meta={{ total: result.total, page, hasQuery: Boolean(params.q), pref: params.pref, tags: params.tags, type: params.type, dist: params.dist, sort: params.sort }} />
      {fallback?.spots.length ? <TrackView name="search_fallback" meta={{ pref: params.pref, tags: params.tags, type: params.type, dist: params.dist, toilet: params.toilet, locker: params.locker, sento: params.sento, fallbackArea: `${fallback.spots[0].prefecture} ${fallback.spots[0].city}`, fallbackCount: fallback.spots.length }} /> : null}
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">{params.popular === "1" ? "定番・走りたいスポット" : "ランニングスポットをさがす"}</h1>
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <div className="min-w-0 space-y-6">
          <SearchFilters tags={allTags} params={params} />
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold"><span className="text-2xl">{result.total}</span>件のスポット</p><div className="flex flex-wrap items-center gap-2"><NearMeButton /><SortSelect /></div></div>
          {result.spots.length ? <div className="space-y-4">{result.spots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div> : fallback?.spots.length && filters.lat !== undefined && filters.lng !== undefined ? <div className="space-y-6"><div className="rounded-xl border border-line bg-cream px-5 py-5 text-center sm:px-8"><p className="font-bold">条件に合うスポットは見つかりませんでした</p><p className="mt-2 text-sm leading-7 text-sub">条件を広げて、現在地に近いスポットを表示しています</p></div><section className="space-y-4"><h2 className="border-l-4 border-brand pl-3 text-lg font-bold">現在地に近い候補</h2>{fallback.spots.map((spot) => { const awayKm = distanceBetweenKm(filters.lat!, filters.lng!, spot.lat, spot.lng); return <div key={spot.id} className="space-y-2"><p className="text-sm font-bold text-sub">現在地から約{awayKm < 10 ? awayKm.toFixed(1) : Math.round(awayKm)}km</p><SpotCard spot={spot} /></div>; })}</section><div className="rounded-xl border border-line px-5 py-5 text-center"><p className="text-sm text-sub">近くに載っていないコースがあれば教えてください</p><Link href={requestHref} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-ink bg-paper px-5 py-2.5 text-sm font-bold hover:bg-cream"><MessageCircleQuestion size={18} />掲載をリクエスト</Link></div></div> : <div className="rounded-xl border border-line bg-cream px-5 py-12 text-center sm:px-8"><img src="/characters/ran-surprised.png" alt="びっくりした顔のラン" className="mx-auto mb-5 w-28" /><p className="text-lg font-bold">条件に合うスポットが見つかりませんでした</p><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-sub">探している場所がまだ載っていないかもしれません。地元のコースや気になる公園があれば、掲載リクエストで教えてください。</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href={requestHref} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 font-bold hover:bg-brand-dark"><MessageCircleQuestion size={18} />掲載をリクエスト</Link><Link href="/spots" className="inline-flex items-center justify-center rounded-lg border border-line bg-paper px-5 py-3 font-bold hover:bg-paper/70">条件をクリア</Link></div></div>}
          {pages > 1 && <nav aria-label="ページネーション" className="flex justify-center gap-2 pt-4">{Array.from({ length: pages }, (_, index) => index + 1).map((value) => <Link key={value} href={pageHref(value)} aria-current={page === value ? "page" : undefined} className={`grid size-10 place-items-center rounded-lg border font-bold ${page === value ? "border-brand bg-brand" : "border-line bg-paper"}`}>{value}</Link>)}</nav>}
        </div>
        <SpotsMapShell mapDataUrl={`/api/spots/map${mapParams.size ? `?${mapParams}` : ""}`} />
      </div>
    </div>
  );
}
