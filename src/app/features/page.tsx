import type { Metadata } from "next";
import Link from "next/link";
import { getFeatureCounts } from "@/db/data";
import { features } from "@/lib/features";

// 件数表示のみが変化するページ。反映が最大1時間遅れるだけなのでISR化
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "条件からランニングコースをさがす",
  description: "朝ラン・夜ラン向き、信号なし、ロング走向き、トラック開放など、こだわり条件別に日本全国のランニングコースをまとめています。",
  alternates: { canonical: "/features" },
  openGraph: { url: "/features" },
};

export default async function FeaturesPage() {
  const counts = await getFeatureCounts();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub"><Link href="/" className="hover:underline">ホーム</Link> / 条件からさがす</nav>
      <h1 className="mb-3 text-2xl font-bold sm:text-3xl">条件からランニングコースをさがす</h1>
      <p className="mb-8 leading-7 text-sub">「日の出がきれいな朝ラン」「夜でも走れる場所」「信号なしでロング走できる場所」など、ランナーのこだわり条件別にスポットをまとめています。</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {features.map((feature) => (
          <Link key={feature.slug} href={`/features/${feature.slug}`} className="group rounded-xl border border-line bg-paper p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-3xl">{feature.emoji}</p>
            <h2 className="mt-3 text-lg font-bold group-hover:text-accent">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-sub">{feature.lead}</p>
            <p className="mt-3 text-sm font-bold text-brand-dark">{counts[feature.slug] ?? 0}件のスポット →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
