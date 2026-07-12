import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Download, ExternalLink, Route, Search, Smartphone, Watch } from "lucide-react";

export const metadata: Metadata = {
  title: "GPXの使い方・アプリへの取り込み方法",
  description: "どこランでダウンロードしたGPXをGarmin Connect、COROS、Suunto、Strava、Polar Flowへ取り込む方法を説明します。",
  alternates: { canonical: "/guide/gpx" },
  openGraph: { url: "/guide/gpx" },
};

const apps = [
  {
    name: "Garmin Connect",
    note: "スマホだけで取り込めます。PCのGarmin Connect Webからインポートする方法もあります。",
    steps: [
      "ダウンロードしたGPXをスマホの「ファイル」や「ダウンロード」から開きます。",
      "共有先・開くアプリとしてGarmin Connectを選び、コースタイプを選択します。",
      "コース名を確認して保存し、Garmin Connectから「デバイスに送信」して同期します。",
    ],
    href: "https://support.garmin.com/en-GB/?faq=wKuZXCaZRP4mWPX5aRz5h5",
  },
  {
    name: "COROS",
    note: "GPXルート対応モデルで利用できます。",
    steps: [
      "スマホに保存したGPXを「ファイル」やダウンロード一覧から開きます。",
      "開くアプリとしてCOROSを選び、「Save Route（ルートを保存）」を押します。",
      "保存後にルートを対応ウォッチへ同期し、ウォッチのナビゲーションから選びます。",
    ],
    href: "https://support.coros.com/hc/en-us/articles/360040243352-Troubleshooting-GPX-Route-Imports-for-Breadcrumb-Navigation",
  },
  {
    name: "Suunto",
    note: "iPhone・AndroidともSuuntoアプリのマップから取り込めます。",
    steps: [
      "Suuntoアプリでマップ画面を開き、「＋」を押します。",
      "「Import route (.gpx)／GPXルートをインポート」を選び、保存したGPXを開きます。",
      "必要なら名前などを編集してライブラリへ保存し、Suuntoウォッチと同期します。",
    ],
    href: "https://www.suunto.com/en-us/Support/faq-articles/suunto-app/what-files-can-i-import-to-the-suunto-app/",
  },
  {
    name: "Strava",
    note: "Stravaウェブサイトのルート作成画面から取り込みます。アクティビティのアップロードとは別です。",
    steps: [
      "PCなどのブラウザでStravaにログインし、「Dashboard」→「My Routes」を開きます。",
      "「Create New Route」を選び、ルート作成画面のアップロードボタンからGPXを指定します。",
      "必要ならウェイポイントを調整して保存し、Stravaの保存済みルートから確認します。",
    ],
    href: "https://support.strava.com/en-us/articles/15402061-uploading-route-files",
  },
  {
    name: "Polar Flow",
    note: "GPXルートに対応するPolar製品で利用できます。取り込みはPolar Flow Webで行います。",
    steps: [
      "ブラウザでPolar Flowにログインし、右上の「Favorites（お気に入り）」を開きます。",
      "「Import route」を選び、GPXをドラッグ＆ドロップするかファイルを指定します。",
      "コース名などを設定してインポートし、Polar Flowから対応ウォッチへ同期します。",
    ],
    href: "https://support.polar.com/en/how-to-import-route?category=polar_flow_app_and_web_service&product_id=69053",
  },
] as const;

export default function GpxGuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <header>
        <p className="font-bold text-brand-dark">GPX GUIDE</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">GPXの使い方・<br className="sm:hidden" />アプリへの取り込み方法</h1>
        <p className="mt-5 text-base leading-8 text-sub">GPXは、これから走るコースの形を保存した「地図上の線」のデータです。走った記録ではありません。対応するスマートウォッチや地図アプリへ取り込むと、ルート確認やナビに使えます。</p>
      </header>

      <section className="mt-12">
        <h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">まずは共通の3ステップ</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            [Download, "1", "ダウンロード", "スポット詳細からGPXファイルをスマホやPCへ保存します。"],
            [Smartphone, "2", "アプリへ取り込む", "保存したファイルを、下記の対応アプリで開きます。"],
            [Watch, "3", "同期して使う", "ルートを保存し、必要ならウォッチへ同期してナビを始めます。"],
          ].map(([Icon, number, title, text]) => {
            const Component = Icon as typeof Download;
            return <div key={String(number)} className="rounded-xl border border-line bg-cream p-5"><span className="grid size-10 place-items-center rounded-full bg-brand font-black">{String(number)}</span><Component className="mt-5" size={22} /><h3 className="mt-2 font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-sub">{String(text)}</p></div>;
          })}
        </div>
        <div className="mt-5 rounded-xl border border-line p-5 text-sm leading-7 text-sub"><p><strong className="text-ink">iPhone：</strong>ダウンロード後、「ファイル」アプリのダウンロードフォルダからGPXを開き、共有ボタンで対応アプリを選びます。</p><p className="mt-2"><strong className="text-ink">Android：</strong>通知または「Files」「マイファイル」などのダウンロード一覧からGPXを開き、対応アプリを選びます。</p></div>
      </section>

      <section className="mt-14">
        <h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">アプリ別の取り込み方</h2>
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {apps.map((app) => <section key={app.name} className="p-5 sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-brand/30"><Route size={20} /></span><h3 className="text-lg font-bold sm:text-xl">{app.name}</h3></div>
            <p className="mt-3 text-sm leading-6 text-sub">{app.note}</p>
            <ol className="mt-5 space-y-3 text-sm leading-7">
              {app.steps.map((step, index) => <li key={step} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-cream text-xs font-bold">{index + 1}</span><span>{step}</span></li>)}
            </ol>
            <a href={app.href} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-accent underline decoration-brand decoration-2 underline-offset-4">{app.name}の公式ヘルプ <ExternalLink size={14} /></a>
          </section>)}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border-2 border-brand bg-cream p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle size={20} />使う前に確認してください</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-sub">
          <li>・アプリのメニュー名や対応機種は、アップデートによって変わる場合があります。</li>
          <li>・どこランのGPXにはコースの線が入りますが、地図画像や現地の工事・通行止め情報は入りません。</li>
          <li>・ルート上でも、現地の標識、歩行者、交通規制、安全状況を最優先してください。</li>
          <li>・取り込み後は、スタート地点とルートの向きが意図どおりか確認してから使ってください。</li>
        </ul>
        <p className="mt-4 text-xs text-sub">手順確認日：2026年7月12日</p>
      </section>

      <div className="mt-14 border-t border-line pt-10 text-center">
        <p className="text-sm text-sub">走るコースを探して、詳細ページからGPXをダウンロードできます。</p>
        <Link href="/spots" className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-7 py-3 font-bold hover:bg-brand-dark"><Search size={18} />スポットをさがす</Link>
      </div>
    </article>
  );
}
