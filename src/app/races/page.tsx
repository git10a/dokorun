import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { racesByCalendar } from "@/lib/races";

// 静的定義のみで完結するページだが、他の面と同じくISRに揃える
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "大会からランニングコースをさがす(試走・前日ラン)",
  description: "東京マラソン、大阪マラソンなど全国の主要マラソン大会別に、試走・前日ラン・当日アップに使えるランニングコースをまとめています。遠征ランナーの調整にどうぞ。",
  alternates: { canonical: "/races" },
  openGraph: { url: "/races" },
};

export default function RacesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub"><Link href="/" className="hover:underline">ホーム</Link> / 大会からさがす</nav>
      <h1 className="mb-3 text-2xl font-bold sm:text-3xl">大会からランニングコースをさがす</h1>
      <p className="mb-8 leading-7 text-sub">マラソン大会の遠征先で「試走はどこでする？」「前日の刺激はどこで入れる？」に答えるページです。大会ごとに、コースと重なる区間や発着地近くで走れるスポットをまとめています。</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {racesByCalendar.map((race) => (
          <Link key={race.slug} href={`/races/${race.slug}`} className="group rounded-xl border border-line bg-paper p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <p className="flex items-center gap-3 text-xs font-bold text-sub"><span className="inline-flex items-center gap-1"><CalendarDays size={14} className="text-brand-dark" />{race.timing}</span><span className="inline-flex items-center gap-1"><MapPin size={14} className="text-brand-dark" />{race.prefecture}</span></p>
            <h2 className="mt-3 text-lg font-bold group-hover:text-accent">{race.name}</h2>
            <p className="mt-2 text-sm leading-6 text-sub">{race.lead}</p>
            <p className="mt-3 text-sm font-bold text-brand-dark">試走・前日ランのスポット{race.spots.length}件 →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
