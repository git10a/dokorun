import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPinned, Gauge, MessageSquare } from "lucide-react";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "このサイトについて",
  description: `どこランは、マラソン大会のコースを予習できるサイトです。${siteConfig.promise}`,
  alternates: { canonical: "/about" },
  openGraph: { url: "/about" },
};

const steps = [
  { Icon: MapPinned, title: "出る大会のコースを知る", text: "コースマップと高低図で、坂や折り返しの位置を確認。コースを対応するウォッチに取り込んで持ち出せます。" },
  { Icon: Gauge, title: "自分のペースを考える", text: "目標タイムからペース表を作り、近いタイムで完走した人の体験を読む。本番でどう走るかを準備できます。" },
  { Icon: MessageSquare, title: "次に走る人へ経験を残す", text: "きつかった坂、ペースを上げられた場所。走ってわかったことを、開催年と完走タイムを添えて共有できます。" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <p className="font-bold text-brand-dark">ABOUT</p>
      <h1 className="mt-2 text-3xl font-black sm:text-5xl">コースを知って、<br />ゴールで笑おう。</h1>
      <div className="mt-8 space-y-5 leading-8">
        <p>どこランは、マラソン大会のコースを予習できるサイトです。出場する大会が決まったら、コースの形や坂、走った人の経験を確認して、自分のレース計画を準備できます。</p>
        <p className="font-bold">{siteConfig.tagline.map((line) => <span key={line} className="block">{line}</span>)}</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {steps.map(({ Icon, title, text }) => <div key={title} className="rounded-xl border border-line bg-cream p-5"><Icon className="mb-4" aria-hidden="true" /><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-sub">{text}</p></div>)}
      </div>
      <Link href="/races" className="mt-7 inline-flex rounded-lg bg-brand px-6 py-3 font-bold hover:bg-brand-dark">出る大会のコースをさがす</Link>
      <p className="mt-4 text-sm leading-7 text-sub">コースマップ・高低図・ペース表と体験の閲覧は、登録なしで使えます。コースデータのダウンロードと体験の投稿には、無料の会員登録が必要です。<Link href="/guide/gpx" className="text-accent underline underline-offset-4">ウォッチへの取り込み方はこちら</Link>。</p>
      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-xl font-bold">大会の街でも走りたいときに</h2>
        <p className="mt-3 leading-8">大会の近くにある公園やランニングコースも紹介しています。遠征先で少し走りたいときは、距離・スタート地点・設備を確認して、行き先を選べます。</p>
        <Link href="/spots" className="mt-4 inline-block text-sm font-bold text-accent underline underline-offset-4">全国のランニングスポットをさがす</Link>
      </section>
      <section className="mt-12 rounded-2xl border border-line bg-cream p-6 sm:p-8">
        <h2 className="text-xl font-bold">どこランのふたり</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {[
            ["/characters/hashiro-happy.png", "ハシロー", "走るのが大好きな男の子。次の大会のコースが気になって、今日も地図を広げています。"],
            ["/characters/ran-smile.png", "ラン", "どこまでも軽やかに走る女の子。走って見つけたことを、次に走る人へ伝えます。"],
          ].map(([src, name, text]) => <div key={name} className="flex items-center gap-5"><Image src={src} alt={name} width={96} height={120} className="h-auto w-24 shrink-0" /><div><h3 className="font-bold">{name}</h3><p className="mt-1 text-sm leading-6 text-sub">{text}</p></div></div>)}
        </div>
      </section>
      <section className="mt-12 rounded-2xl bg-brand p-6 sm:p-8">
        <h2 className="text-xl font-bold">出る大会が載っていないときは</h2>
        <p className="mt-3 leading-7">コースを掲載してほしい大会を教えてください。コース変更や情報の間違い、周辺スポットの掲載についても受け付けています。</p>
        <Link href="/contact" className="mt-5 inline-block rounded-lg bg-paper px-5 py-2.5 font-bold">リクエスト・お問い合わせ</Link>
      </section>
    </div>
  );
}
