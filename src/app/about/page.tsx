import type { Metadata } from "next";
import { Database, MapPinned, Sparkles } from "lucide-react";

export const metadata: Metadata = { title: "このサイトについて", description: "ドコランは、日本全国のランニングスポットを距離や設備から探せるデータベースです。" };

export default function AboutPage() {
  return <div className="mx-auto max-w-3xl px-4 py-12 md:px-6"><p className="font-bold text-brand-dark">ABOUT</p><h1 className="mt-2 text-3xl font-black sm:text-5xl">今日のランニングを、<br />もっと選びやすく。</h1><div className="mt-10 space-y-6 leading-8"><p>ドコランは、日本中のランニングスポットを集めるWebサービスです。「今日、どこ走る？」と思ったとき、距離や高低差、信号、路面、夜の明るさ、設備から、自分に合う場所をすぐに見つけられます。</p><p>ランニングコースは無限に作れます。でも、走りに行く目的地はそれほど多くありません。そこで私たちは、公園や湖、河川敷といった「スポット」を主役にし、その場所を代表するコースの情報を整理しています。</p></div><div className="mt-12 grid gap-4 sm:grid-cols-3">{[[MapPinned, "スポットが主役", "目的地ごとに情報をひとつのページへ集約。"], [Database, "構造化された情報", "信号や路面、設備で迷わず比較。"], [Sparkles, "少しずつ全国へ", "運営が確認したスポットを順次掲載。"]].map(([Icon, title, text]) => { const Component = Icon as typeof MapPinned; return <div key={String(title)} className="rounded-xl border border-line bg-cream p-5"><Component className="mb-4" /><h2 className="font-bold">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-sub">{String(text)}</p></div>; })}</div><div className="mt-12 rounded-2xl bg-brand p-6 sm:p-8"><h2 className="text-xl font-bold">スポット掲載について</h2><p className="mt-3 leading-7">スポット掲載のリクエストは準備中です。お問い合わせ先も近日中にご案内します。</p></div></div>;
}
