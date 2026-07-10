import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "どこラン",
  title: { default: "どこラン - 知らない土地でも走れるランニングコースが見つかる", template: "%s | どこラン" },
  description: "「次はどこでランする？」に答えるランニングコース検索サイト。旅先・出張先・大会遠征でも、コース地図と距離・信号・トイレ情報つきで、今すぐ走れる場所が見つかります。",
  // OG画像は静的PNG(public/og.png)。動的生成(next/og)はWorkersの3MiB制限に収まらないため使わない
  openGraph: {
    siteName: "どこラン",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "どこラン - 知らない土地でも走れるランニングコースが見つかる" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/og.png", alt: "どこラン - 知らない土地でも走れるランニングコースが見つかる" }],
  },
  verification: { google: "J_vRwsGfizZ2o3YgX7tYByh-hvw8jthPcr67XKhLHVc" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Cloudflare Web Analytics。トークン未設定の環境(ローカル等)では何も出力しない
  const beaconToken = process.env.CF_BEACON_TOKEN;
  return (
    <html lang="ja" className="scroll-smooth">
      <body className={`${notoSansJp.variable} min-h-screen antialiased`}>
        <Header />
        <main>{children}</main>
        <Footer />
        {beaconToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: beaconToken })}
          />
        )}
      </body>
    </html>
  );
}
