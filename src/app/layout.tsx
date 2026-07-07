import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "ドコラン",
  title: { default: "ドコラン - 日本全国のランニングスポット", template: "%s | ドコラン" },
  description: "「今日、どこ走る？」に答える、日本全国のランニングスポット検索サイト。距離、信号、路面、設備から走りたい場所を探せます。",
  openGraph: { siteName: "ドコラン" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body className={`${notoSansJp.variable} min-h-screen antialiased`}><Header /><main>{children}</main><Footer /></body></html>;
}
