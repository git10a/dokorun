import type { Metadata } from "next";
import Link from "next/link";
import { prefectureSlug } from "@/lib/areas";
import { getStations } from "@/lib/stations";

export const metadata: Metadata = {
  title: "駅から探すランニングスポット",
  description: "駅ごとの近くのランニングスポットと、同じ路線で3駅以内のひと駅ラン候補を探せます。",
  alternates: { canonical: "/stations" },
};

export default function StationsPage() {
  const groups = Map.groupBy(getStations(), (station) => station.prefecture);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub"><Link href="/" className="hover:underline">ホーム</Link> / 駅から探す</nav>
      <h1 className="text-3xl font-black sm:text-4xl">駅からランニングスポットを探す</h1>
      <p className="mt-3 max-w-2xl leading-7 text-sub">駅の近くで走れる場所と、同じ路線で少し足を伸ばして走れる場所をまとめました。</p>
      <Link href="/stations/lines" className="mt-8 block rounded-2xl border border-line bg-cream px-6 py-5 transition hover:border-brand">
        <p className="text-lg font-bold">路線から探す →</p>
        <p className="mt-1 text-sm text-sub">始点から終点まで、各駅のランニングスポットを順番に見る</p>
      </Link>
      <h2 className="mt-12 border-l-4 border-brand pl-3 text-xl font-bold">駅名から探す</h2>
      <div className="mt-10 space-y-5">
        {[...groups].map(([prefecture, stations]) => (
          <details key={prefecture} className="rounded-xl border border-line bg-paper" open={prefecture === "東京都"}>
            <summary className="cursor-pointer px-5 py-4 text-lg font-bold">{prefecture} <span className="ml-1 text-sm font-normal text-sub">{stations.length}駅</span></summary>
            <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-line px-5 py-5">
              {stations.map((station) => <Link key={station.slug} href={`/stations/${station.slug}`} className="text-accent hover:underline">{station.name}駅</Link>)}
              <Link href={`/areas/${prefectureSlug(prefecture)}`} className="w-full pt-2 text-sm font-bold text-sub hover:underline">{prefecture}のエリアページへ →</Link>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
