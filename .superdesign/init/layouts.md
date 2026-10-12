# Current layouts (2026-10-12)

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getSiteUrl, siteConfig } from "@/lib/site";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: siteConfig.name,
  title: { default: siteConfig.title, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  // OG画像は静的PNG(public/og.png)。動的生成(next/og)はWorkersの3MiB制限に収まらないため使わない
  openGraph: {
    siteName: siteConfig.name,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: siteConfig.title }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/og.png", alt: siteConfig.title }],
  },
  verification: { google: "J_vRwsGfizZ2o3YgX7tYByh-hvw8jthPcr67XKhLHVc" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Cloudflare Web Analytics。トークン未設定の環境(ローカル等)では何も出力しない
  const beaconToken = process.env.CF_BEACON_TOKEN;
  const siteUrl = getSiteUrl();
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteConfig.name,
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: siteConfig.name,
      alternateName: siteConfig.alternateName,
      description: metadata.description,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "ja-JP",
    },
  ];
  return (
    <html lang="ja" className="scroll-smooth">
      <body className={`${notoSansJp.variable} min-h-screen antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
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

```

## `src/components/header.tsx`

```tsx
import Link from "next/link";
import Image from "next/image";
import { UserMenu } from "@/components/auth/user-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="どこラン ホーム">
          <Image src="/brand/dokorun-wordmark-header.png" alt="どこラン" width={800} height={199} className="h-7 w-auto shrink-0 sm:h-8" priority />
        </Link>
        <nav aria-label="メインナビゲーション" className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-4 md:gap-6">
          <div className="flex min-w-0 items-center gap-1 sm:gap-4">
            <Link href="/races" className="whitespace-nowrap px-1 py-1 text-[11px] font-bold transition-colors hover:text-accent sm:px-2 sm:text-sm"><span className="sm:hidden">大会</span><span className="hidden sm:inline">大会をさがす</span></Link>
            <Link href="/spots" className="whitespace-nowrap px-1 py-1 text-[11px] font-bold transition-colors hover:text-accent sm:px-2 sm:text-sm"><span className="sm:hidden">スポット</span><span className="hidden sm:inline">スポットをさがす</span></Link>
          </div>
          <div className="ml-1 border-l border-line pl-2 sm:ml-0 sm:border-0 sm:pl-0">
            <UserMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}

```

## `src/components/footer.tsx`

```tsx
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5 lg:col-span-6">
            <div className="mb-4 flex items-center gap-2 text-ink">
              <Image src="/brand/dokorun-wordmark.png" alt={siteConfig.name} width={800} height={199} className="h-8 w-auto" />
              <img src="/characters/ran-happy.png" alt="" className="ml-2 h-7 w-auto -scale-x-100" />
              <img src="/characters/hashiro-smile.png" alt="" className="h-7 w-auto -scale-x-100" />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-sub">出る大会のコースを予習し、自分のレース計画を。走った経験は、次の出場者へ。</p>
          </div>

          <nav aria-label="フッターナビゲーション" className="grid grid-cols-2 gap-8 md:col-span-7 lg:col-span-6">
            <div>
              <h2 className="mb-4 border-l-2 border-brand pl-2 text-sm font-bold text-ink">探す</h2>
              <ul className="space-y-3 text-sm text-sub">
                <li><Link href="/races" className="transition-colors hover:text-accent">大会のコースを予習する</Link></li>
                <li><Link href="/areas" className="transition-colors hover:text-accent">エリアからスポットをさがす</Link></li>
                <li><Link href="/features" className="transition-colors hover:text-accent">条件からスポットをさがす</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="mb-4 border-l-2 border-brand pl-2 text-sm font-bold text-ink">サポート</h2>
              <ul className="space-y-3 text-sm text-sub">
                <li><Link href="/guide/gpx" className="transition-colors hover:text-accent">GPXの使い方</Link></li>
                <li><Link href="/about" className="transition-colors hover:text-accent">このサイトについて</Link></li>
                <li><Link href="/contact" className="transition-colors hover:text-accent">リクエスト・お問い合わせ</Link></li>
                <li><Link href="/terms" className="text-xs transition-colors hover:text-accent">利用規約</Link></li>
                <li><Link href="/privacy" className="text-xs transition-colors hover:text-accent">プライバシー</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-line pt-8 md:flex-row md:items-center">
          <p className="text-xs text-sub">© {new Date().getFullYear()} {siteConfig.name}</p>
          <Link href="/admin" className="text-xs text-sub underline underline-offset-4 transition-colors hover:text-ink">運営者向け</Link>
        </div>
      </div>
    </footer>
  );
}

```
