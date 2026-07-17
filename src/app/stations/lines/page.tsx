import type { Metadata } from "next";
import Link from "next/link";
import { getStationLines } from "@/lib/stations";

export const metadata: Metadata = {
  title: "路線からランニングスポットを探す",
  description: "鉄道路線を選び、始点から終点まで各駅の近くにあるランニングスポットを順番に探せます。",
  alternates: { canonical: "/stations/lines" },
};

export default function StationLinesPage() {
  const groups = Map.groupBy(getStationLines(), (line) => line.prefectures[0] ?? "その他");
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub"><Link href="/" className="hover:underline">ホーム</Link> / <Link href="/stations" className="hover:underline">駅から探す</Link> / 路線から探す</nav>
      <h1 className="text-3xl font-black sm:text-4xl">路線からランニングスポットを探す</h1>
      <p className="mt-3 max-w-2xl leading-7 text-sub">路線を開くと、始点から終点までの駅と、各駅の近くで走れるスポットを順番に見られます。</p>
      <div className="mt-10 space-y-5">
        {[...groups].map(([prefecture, lines]) => (
          <details key={prefecture} className="rounded-xl border border-line bg-paper" open={prefecture === "東京都"}>
            <summary className="cursor-pointer px-5 py-4 text-lg font-bold">{prefecture} <span className="ml-1 text-sm font-normal text-sub">{lines.length}路線</span></summary>
            <div className="grid gap-3 border-t border-line px-5 py-5 sm:grid-cols-2">
              {lines.map((line) => (
                <Link key={line.slug} href={`/stations/lines/${line.slug}`} className="rounded-lg border border-line px-4 py-3 hover:bg-cream">
                  <span className="font-bold">{line.name}</span>
                  <span className="ml-2 text-xs text-sub">{line.stations.length}駅</span>
                </Link>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
