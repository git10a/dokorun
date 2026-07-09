import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "どこラン",
  title: { default: "どこラン - 日本全国のランニングスポット", template: "%s | どこラン" },
  description: "「次はどこでランする？」に答える、日本全国のランニングスポット検索サイト。距離、信号、路面、設備から走りたい場所を探せます。",
  // OG画像は静的PNG(public/og.png)。動的生成(next/og)はWorkersの3MiB制限に収まらないため使わない
  openGraph: { siteName: "どこラン", images: ["/og.png"] },
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
