import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getPrefectureCounts } from "@/db/data";
import { prefectureSlug } from "@/lib/areas";
import { regionGroups } from "@/lib/prefectures";
import { features } from "@/lib/features";
import { Breadcrumb } from "@/components/breadcrumb";
import { SectionHeading } from "@/components/section-heading";

// 件数表示のみが変化するページ。反映が最大1時間遅れるだけなのでISR化
export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({
  title: "都道府県からランニングコースをさがす",
  description:
    "日本全国のランニングコース・スポットを都道府県別にまとめています。コースマップ・距離・信号の数・設備情報つき。",
  path: "/areas",
});

export default async function AreasPage() {
  const counts = await getPrefectureCounts();
  const countMap = new Map(counts.map((item) => [item.prefecture, item.count]));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "エリアからさがす" }]} />
      <h1 className="mb-3 text-2xl font-bold sm:text-3xl">都道府県からランニングコースをさがす</h1>
      <p className="mb-8 leading-7 text-sub">
        日本全国のランニングスポットを都道府県別にまとめています。エリアを選ぶと、コースマップ・距離・設備情報つきの一覧が見られます。
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {regionGroups.map((region) => {
          const available = region.prefectures.filter((prefecture) => countMap.has(prefecture));
          return available.length ? (
            <div key={region.name} className="rounded-xl border border-line bg-cream p-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <MapPin size={18} className="text-brand-dark" />
                {region.name}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {available.map((prefecture) => (
                  <Link
                    key={prefecture}
                    href={`/areas/${prefectureSlug(prefecture)}`}
                    className="text-accent hover:underline"
                  >
                    {prefecture} ({countMap.get(prefecture)})
                  </Link>
                ))}
              </div>
            </div>
          ) : null;
        })}
      </div>
      <section className="mt-12">
        <SectionHeading className="mb-4">条件からさがす</SectionHeading>
        <div className="flex flex-wrap gap-2.5">
          {features.map((feature) => (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream"
            >
              {feature.emoji} {feature.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
