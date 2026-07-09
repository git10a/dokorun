import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { NearMeButton } from "@/components/near-me-button";
import { SearchFilters } from "@/components/search-filters";
import { SortSelect } from "@/components/sort-select";
import { SpotCard } from "@/components/spot-card";
import { SpotsMapShell } from "@/components/map/spots-map-shell";
import { getSearchTags, searchSpots } from "@/db/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ランニングスポットをさがす", description: "都道府県、距離、コース形状、タグ、設備から日本全国のランニングスポットを検索できます。" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const courseTypeRequestLabels: Record<string, string> = {
  loop: "周回",
  out_and_back: "往復",
  one_way: "ワンウェイ",
  track: "トラック",
};

const distanceRequestLabels: Record<string, string> = {
  "0-3": "〜3km",
  "3-5": "3〜5km",
  "5-10": "5〜10km",
  "10-": "10km〜",
};

export default async function SpotsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) as Record<string, string | undefined>;
  const distance = params.dist?.split("-");
  const distMin = distance?.[0] ? Number(distance[0]) * 1000 : undefined;
  const distMax = distance?.[1] ? Number(distance[1]) * 1000 : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const validGeo = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const filters = {
    pref: params.pref, tags: params.tags?.split(",").filter(Boolean), type: params.type, distMin, distMax, q: params.q,
    toilet: params.toilet === "1", locker: params.locker === "1", sento: params.sento === "1", sort: params.sort, page,
    lat: validGeo ? lat : undefined, lng: validGeo ? lng : undefined,
  };
  const [allTags, result] = await Promise.all([getSearchTags(), searchSpots(filters)]);
  const pages = Math.ceil(result.total / 20);
  const selectedTagNames = allTags.filter((tag) => filters.tags?.includes(tag.slug)).map((tag) => tag.name);
  const requestConditions: string[] = [];
  if (params.q) requestConditions.push(`キーワード: ${params.q}`);
  if (params.pref) requestConditions.push(`都道府県: ${params.pref}`);
  if (selectedTagNames.length) requestConditions.push(`特徴: ${selectedTagNames.join("、")}`);
  if (params.type) requestConditions.push(`コース形状: ${courseTypeRequestLabels[params.type] ?? params.type}`);
  if (params.dist) requestConditions.push(`距離: ${distanceRequestLabels[params.dist] ?? params.dist}`);
  if (params.toilet === "1") requestConditions.push("設備: トイレあり");
  if (params.locker === "1") requestConditions.push("設備: ロッカーあり");
  if (params.sento === "1") requestConditions.push("設備: 銭湯・サウナが近い");
  const requestLines = ["検索で条件に合うスポットが見つかりませんでした。掲載候補をリクエストします。", "", "探していた条件:"];
  requestLines.push(...(requestConditions.length ? requestConditions : ["未指定"]));
  requestLines.push("", "具体的には:", "例: 明治神宮外苑1周コース など", "");
  const requestParams = new URLSearchParams({ category: "spot_request", message: requestLines.join("\n") });
  const requestHref = `/contact?${requestParams}`;
  const pageHref = (target: number) => { const next = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))); next.set("page", String(target)); return `/spots?${next}`; };
  const mapParams = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  mapParams.delete("page");
  mapParams.delete("sort");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">ランニングスポットをさがす</h1>
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <div className="min-w-0 space-y-6">
          <SearchFilters tags={allTags} params={params} />
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold"><span className="text-2xl">{result.total}</span>件のスポット</p><div className="flex flex-wrap items-center gap-2"><NearMeButton /><SortSelect /></div></div>
          {result.spots.length ? <div className="space-y-4">{result.spots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div> : <div className="rounded-xl border border-line bg-cream px-5 py-12 text-center sm:px-8"><img src="/characters/ran-surprised.png" alt="びっくりした顔のラン" className="mx-auto mb-5 w-28" /><p className="text-lg font-bold">条件に合うスポットが見つかりませんでした</p><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-sub">探している場所がまだ載っていないかもしれません。地元のコースや気になる公園があれば、掲載リクエストで教えてください。</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href={requestHref} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 font-bold hover:bg-brand-dark"><MessageCircleQuestion size={18} />掲載をリクエスト</Link><Link href="/spots" className="inline-flex items-center justify-center rounded-lg border border-line bg-paper px-5 py-3 font-bold hover:bg-paper/70">条件をクリア</Link></div></div>}
          {pages > 1 && <nav aria-label="ページネーション" className="flex justify-center gap-2 pt-4">{Array.from({ length: pages }, (_, index) => index + 1).map((value) => <Link key={value} href={pageHref(value)} aria-current={page === value ? "page" : undefined} className={`grid size-10 place-items-center rounded-lg border font-bold ${page === value ? "border-brand bg-brand" : "border-line bg-paper"}`}>{value}</Link>)}</nav>}
        </div>
        <SpotsMapShell mapDataUrl={`/api/spots/map${mapParams.size ? `?${mapParams}` : ""}`} />
      </div>
    </div>
  );
}
