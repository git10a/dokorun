import Link from "next/link";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { nearbyDestinationPurposeFilters } from "@/lib/nearby-destinations";

type Params = Record<string, string | undefined>;

const prefectures = ["東京都", "神奈川県"] as const;

export function DestinationSearchFilters({ params }: { params: Params }) {
  const hasConditions = Boolean(params.purpose || params.pref || params.runStation === "1" || params.sento === "1" || params.sort);

  return (
    <form action="/destinations">
      <details className="group rounded-xl border border-line bg-paper p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-bold [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><SlidersHorizontal size={18} aria-hidden="true" />条件を変更</span><ChevronDown size={18} className="transition-transform group-open:rotate-180" /></summary>
        <div className="mt-4 border-t border-line pt-4">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">行きたいもの</legend>
        <div className="flex flex-wrap gap-2">
          {nearbyDestinationPurposeFilters.map((filter) => (
            <label key={filter.slug} className="cursor-pointer">
              <input type="radio" name="purpose" value={filter.slug} defaultChecked={params.purpose === filter.slug} className="peer sr-only" />
              <span className="inline-flex rounded-full bg-cream px-3 py-1.5 text-sm peer-checked:bg-brand">{filter.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-sm font-bold">エリア</legend>
          <div className="flex flex-wrap gap-2">
            {prefectures.map((prefecture) => (
              <label key={prefecture} className="cursor-pointer">
                <input type="radio" name="pref" value={prefecture} defaultChecked={params.pref === prefecture} className="peer sr-only" />
                <span className="inline-flex rounded-full bg-cream px-3 py-1.5 text-sm peer-checked:bg-brand">{prefecture.replace("都", "").replace("県", "")}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">コース条件（AND）</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="runStation" value="1" defaultChecked={params.runStation === "1"} className="size-4 accent-[#FFD900]" />ランステあり</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="sento" value="1" defaultChecked={params.sento === "1"} className="size-4 accent-[#FFD900]" />銭湯・サウナ近く</label>
          </div>
        </fieldset>
      </div>
      <label className="mt-5 block text-sm font-bold">並び順
        <select name="sort" defaultValue={params.sort ?? "recommended"} className="mt-2 h-10 w-full rounded-lg border border-line bg-paper px-3 font-normal sm:max-w-64">
          <option value="recommended">おすすめ順</option>
          <option value="rating">評価が高い順</option>
          <option value="reviews">口コミが多い順</option>
        </select>
      </label>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button className="rounded-lg bg-brand px-5 py-2.5 font-bold hover:bg-brand-dark">この条件でさがす</button>
        {hasConditions && <Link href="/destinations" className="flex items-center gap-1 text-sm text-sub underline"><X size={14} />条件をクリア</Link>}
      </div>
        </div>
      </details>
    </form>
  );
}
