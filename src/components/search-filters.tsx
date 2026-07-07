import Link from "next/link";
import { Search, X } from "lucide-react";
import { prefectures } from "@/lib/prefectures";

type Tag = { id: string; slug: string; name: string };
type Params = Record<string, string | undefined>;

export function SearchFilters({ tags, params }: { tags: Tag[]; params: Params }) {
  const selectedTags = (params.tags ?? "").split(",").filter(Boolean);
  const active = [params.pref, params.type, params.dist, params.q, params.toilet, params.locker, params.sento, ...selectedTags].filter(Boolean);
  return (
    <form action="/spots" className="space-y-5 rounded-xl border border-line bg-paper p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <label className="relative"><span className="sr-only">キーワード</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={18} /><input name="q" defaultValue={params.q} placeholder="スポット名・市区町村" className="h-11 w-full rounded-lg border border-line pl-10 pr-3 outline-none focus:border-ink" /></label>
        <select name="pref" defaultValue={params.pref ?? ""} className="h-11 rounded-lg border border-line bg-paper px-3"><option value="">全国</option>{prefectures.map((prefecture) => <option key={prefecture}>{prefecture}</option>)}</select>
        <button className="h-11 rounded-lg bg-brand px-6 font-bold hover:bg-brand-dark">さがす</button>
      </div>
      <details open={Boolean(params.tags || params.type || params.dist || params.toilet || params.locker || params.sento)}>
        <summary className="cursor-pointer font-bold">条件を絞り込む</summary>
        <div className="mt-4 space-y-5 border-t border-line pt-4">
          <fieldset><legend className="mb-2 text-sm font-bold">タグ（複数選択はAND検索）</legend><div className="flex flex-wrap gap-2">{tags.map((tag) => <label key={tag.id} className="cursor-pointer"><input type="checkbox" name="tag" value={tag.slug} defaultChecked={selectedTags.includes(tag.slug)} className="peer sr-only" /><span className="inline-flex rounded-full bg-cream px-3 py-1.5 text-sm peer-checked:bg-brand">{tag.name}</span></label>)}</div><input type="hidden" name="tags" value={selectedTags.join(",")} className="tag-output" /></fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-bold">コース形状<select name="type" defaultValue={params.type ?? ""} className="mt-2 h-10 w-full rounded-lg border border-line bg-paper px-3 font-normal"><option value="">すべて</option><option value="loop">周回</option><option value="out_and_back">往復</option><option value="one_way">ワンウェイ</option><option value="track">トラック</option></select></label>
            <label className="text-sm font-bold">距離<select name="dist" defaultValue={params.dist ?? ""} className="mt-2 h-10 w-full rounded-lg border border-line bg-paper px-3 font-normal"><option value="">すべて</option><option value="0-3">〜3km</option><option value="3-5">3〜5km</option><option value="5-10">5〜10km</option><option value="10-">10km〜</option></select></label>
            <label className="text-sm font-bold">並び順<select name="sort" defaultValue={params.sort ?? "new"} className="mt-2 h-10 w-full rounded-lg border border-line bg-paper px-3 font-normal"><option value="new">新着順</option><option value="distance_asc">距離が短い順</option><option value="distance_desc">距離が長い順</option></select></label>
          </div>
          <fieldset><legend className="mb-2 text-sm font-bold">設備</legend><div className="flex flex-wrap gap-4 text-sm">{[["toilet", "トイレ"], ["locker", "ロッカー"], ["sento", "銭湯近く"]].map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" name={key} value="1" defaultChecked={params[key] === "1"} className="size-4 accent-[#FFD900]" />{label}</label>)}</div></fieldset>
          <div className="flex items-center justify-between"><button className="rounded-lg bg-brand px-5 py-2.5 font-bold">この条件でさがす</button>{active.length > 0 && <Link href="/spots" className="flex items-center gap-1 text-sm text-sub underline"><X size={14} />条件をクリア</Link>}</div>
        </div>
      </details>
      <script dangerouslySetInnerHTML={{ __html: `document.currentScript.closest('form').addEventListener('submit',function(){var v=[...this.querySelectorAll('input[name=tag]:checked')].map(x=>x.value).join(',');this.querySelector('input[name=tags]').value=v;this.querySelectorAll('input[name=tag]').forEach(x=>x.disabled=true)})` }} />
    </form>
  );
}
