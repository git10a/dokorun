/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { AlertTriangle, Download, ExternalLink, Search, Smartphone, Watch } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = pageMetadata({
  title: "コースをウォッチ・アプリに取り込む方法",
  description: "どこランでダウンロードしたコースデータをGarmin Connect、COROS、Suunto、Strava、Polar Flowへ取り込む方法を説明します。",
  path: "/guide/gpx",
});

const apps = [
  {
    name: "Garmin Connect",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/cf/19/fa/cf19fa7d-ad84-1af9-299a-f35c17c04529/AppIcon-0-0-1x_U007ephone-0-1-0-0-85-220.png/512x512bb.jpg",
    note: "スマホだけで取り込めます。PCのGarmin Connect Webからインポートする方法もあります。",
    steps: [
      "ダウンロードしたファイルをスマホの「ファイル」や「ダウンロード」から開きます。",
      "共有先・開くアプリとしてGarmin Connectを選び、コースタイプを選択します。",
      "コース名を確認して保存し、Garmin Connectから「デバイスに送信」して同期します。",
    ],
    href: "https://support.garmin.com/en-GB/?faq=wKuZXCaZRP4mWPX5aRz5h5",
  },
  {
    name: "COROS",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/77/07/cb/7707cbb2-d765-9264-91a1-2ed285dc2fba/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg",
    note: "コースの取り込みに対応するモデルで利用できます。",
    steps: [
      "スマホに保存したファイルを「ファイル」やダウンロード一覧から開きます。",
      "開くアプリとしてCOROSを選び、「Save Route（ルートを保存）」を押します。",
      "保存後にルートを対応ウォッチへ同期し、ウォッチのナビゲーションから選びます。",
    ],
    href: "https://support.coros.com/hc/en-us/articles/360040243352-Troubleshooting-GPX-Route-Imports-for-Breadcrumb-Navigation",
  },
  {
    name: "Suunto",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/a3/1f/92/a31f923a-2d77-69a8-5bd6-fd392f2f2a60/SuuntoAppIcon-0-0-1x_U007emarketing-0-8-0-0-sRGB-0-0-85-220.png/512x512bb.jpg",
    note: "iPhone・AndroidともSuuntoアプリのマップから取り込めます。",
    steps: [
      "Suuntoアプリでマップ画面を開き、「＋」を押します。",
      "「Import route (.gpx)／GPXルートをインポート」を選び、保存したファイルを開きます。",
      "必要なら名前などを編集してライブラリへ保存し、Suuntoウォッチと同期します。",
    ],
    href: "https://www.suunto.com/en-us/Support/faq-articles/suunto-app/what-files-can-i-import-to-the-suunto-app/",
  },
  {
    name: "Strava",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a0/04/a8/a004a8c4-9251-ad2f-82f2-2214434cad3b/AppIcon-Primary-0-0-1x_U007ephone-0-1-0-0-sRGB-85-220.png/512x512bb.jpg",
    note: "Stravaウェブサイトのルート作成画面から取り込みます。アクティビティのアップロードとは別です。",
    steps: [
      "PCなどのブラウザでStravaにログインし、「Dashboard」→「My Routes」を開きます。",
      "「Create New Route」を選び、ルート作成画面のアップロードボタンから保存したファイルを指定します。",
      "必要ならウェイポイントを調整して保存し、Stravaの保存済みルートから確認します。",
    ],
    href: "https://support.strava.com/en-us/articles/15402061-uploading-route-files",
  },
  {
    name: "Polar Flow",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c6/5a/a8/c65aa844-f1bd-cc98-3ca0-74db8cf94f19/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg",
    note: "コースの取り込みに対応するPolar製品で利用できます。取り込みはPolar Flow Webで行います。",
    steps: [
      "ブラウザでPolar Flowにログインし、右上の「Favorites（お気に入り）」を開きます。",
      "「Import route」を選び、保存したファイルをドラッグ＆ドロップするかファイルを指定します。",
      "コース名などを設定してインポートし、Polar Flowから対応ウォッチへ同期します。",
    ],
    href: "https://support.polar.com/en/how-to-import-route?category=polar_flow_app_and_web_service&product_id=69053",
  },
] as const;

export default function GpxGuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <header>
        <p className="font-bold text-brand-dark">使い方ガイド</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">コースをウォッチ・<br className="sm:hidden" />アプリに取り込む</h1>
        <p className="mt-5 text-base leading-8 text-sub">大会やスポットのコースを、対応するスマートウォッチや地図アプリで確認できます。ダウンロードするのは、走る道の形を保存したコースデータ（GPX形式）。走った記録ではなく、これから走るルートの確認やナビに使うファイルです。</p>
      </header>

      <section className="mt-12">
        <SectionHeading>まずは共通の3ステップ</SectionHeading>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            [Download, "1", "ダウンロード", "大会ページで対象年・出典を確認し、「コースをダウンロード」からログインして、ファイルをスマホやPCへ保存します。"],
            [Smartphone, "2", "アプリへ取り込む", "保存したファイルを、下記の対応アプリで開きます。"],
            [Watch, "3", "同期して使う", "ルートを保存してウォッチへ同期し、出る大会のコースを確認します。"],
          ].map(([Icon, number, title, text]) => {
            const Component = Icon as typeof Download;
            return <div key={String(number)} className="rounded-xl border border-line bg-cream p-5"><span className="grid size-10 place-items-center rounded-full bg-brand font-black">{String(number)}</span><Component className="mt-5" size={22} /><h3 className="mt-2 font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-sub">{String(text)}</p></div>;
          })}
        </div>
        <div className="mt-5 rounded-xl border border-line p-5 text-sm leading-7 text-sub"><p><strong className="text-ink">iPhone：</strong>ダウンロード後、「ファイル」アプリのダウンロードフォルダから保存したファイルを開き、共有ボタンで対応アプリを選びます。</p><p className="mt-2"><strong className="text-ink">Android：</strong>通知または「Files」「マイファイル」などのダウンロード一覧から保存したファイルを開き、対応アプリを選びます。</p></div>
      </section>

      <section className="mt-10 rounded-xl bg-cream p-5 text-sm leading-7">
        <h2 className="font-bold">ウォッチを使わない方へ</h2>
        <p className="mt-2 text-sub">大会ページでは、目標タイムから1km・5kmごとのペース表を作り、コピー・印刷できます。ペース表の利用に会員登録は必要ありません。</p>
      </section>

      <section className="mt-14">
        <SectionHeading>アプリ別の取り込み方</SectionHeading>
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {apps.map((app) => <section key={app.name} className="p-5 sm:p-7">
            <div className="flex items-center gap-3"><img src={app.iconUrl} alt={`${app.name}のアプリアイコン`} width={40} height={40} className="size-10 shrink-0 rounded-lg" /><h3 className="text-lg font-bold sm:text-xl">{app.name}</h3></div>
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
          <li>・大会コースには大会当日だけ走れる区間もあります。試走する場合は、平時の通行可否を確認してください。</li>
          <li>・アプリのメニュー名や対応機種は、アップデートによって変わる場合があります。</li>
          <li>・どこランのコースデータにはコースの線が入りますが、地図画像や現地の工事・通行止め情報は入りません。</li>
          <li>・ルート上でも、現地の標識、歩行者、交通規制、安全状況を最優先してください。</li>
          <li>・取り込み後は、スタート地点とルートの向きが意図どおりか確認してから使ってください。</li>
        </ul>
        <p className="mt-4 text-xs text-sub">手順確認日：2026年7月12日</p>
      </section>

      <div className="mt-14 border-t border-line pt-10 text-center">
        <p className="text-sm text-sub">出る大会のコースを確認し、ウォッチへの取り込みやペース表で本番の準備を進めましょう。</p>
        <Link href="/races" className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-7 py-3 font-bold hover:bg-brand-dark"><Search size={18} />大会のコースをさがす</Link>
      </div>
    </article>
  );
}
