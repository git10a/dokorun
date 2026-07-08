# Layouts

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";
const notoSansJp = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp", display: "swap" });
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"), applicationName: "どこラン", title: { default: "どこラン - 日本全国のランニングスポット", template: "%s | どこラン" }, description: "「今日、どこ走る？」に答える、日本全国のランニングスポット検索サイト。距離、信号、路面、設備から走りたい場所を探せます。", openGraph: { siteName: "どこラン" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja"><body className={`${notoSansJp.variable} min-h-screen antialiased`}><Header /><main>{children}</main><Footer /></body></html>; }
```

## `src/components/header.tsx`

```tsx
import Link from "next/link";
import { Footprints } from "lucide-react";
export function Header() { return <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 md:px-6"><Link href="/" className="flex shrink-0 items-center gap-1.5 font-bold tracking-tight sm:gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand sm:size-9"><Footprints size={20} /></span><span className="whitespace-nowrap text-[11px] sm:text-lg">どこラン</span></Link><nav aria-label="メインナビゲーション" className="flex shrink-0 items-center gap-2 text-[10px] font-bold sm:gap-6 sm:text-sm"><Link href="/spots" className="transition-colors hover:text-accent">スポットをさがす</Link><Link href="/about" className="transition-colors hover:text-accent">このサイトについて</Link></nav></div></header>; }
```

## `src/components/footer.tsx`

```tsx
import Link from "next/link";
import { Footprints } from "lucide-react";
export function Footer() { return <footer className="mt-20 border-t border-line bg-cream"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-sub md:flex-row md:items-center md:justify-between md:px-6"><div className="flex items-center gap-2 font-bold text-ink"><span className="grid size-8 place-items-center rounded-lg bg-brand"><Footprints size={18} /></span>どこラン</div><p>© {new Date().getFullYear()} どこラン</p><Link href="/admin" className="text-xs underline underline-offset-4">運営者向け</Link></div></footer>; }
```
