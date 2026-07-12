import Link from "next/link";
import { Footprints } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5 lg:col-span-6">
            <div className="mb-4 flex items-center gap-2 font-bold text-ink">
              <span className="grid size-8 place-items-center rounded-lg bg-brand"><Footprints size={18} /></span>
              <span className="text-lg">{siteConfig.name}</span>
              <img src="/characters/ran-happy.png" alt="" className="ml-2 h-7 w-auto -scale-x-100" />
              <img src="/characters/hashiro-smile.png" alt="" className="h-7 w-auto -scale-x-100" />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-sub">「{siteConfig.question}」に答えるランニングコース検索。日本全国の走りやすい代表コースを、地図と走るための情報つきで紹介しています。</p>
          </div>

          <nav aria-label="フッターナビゲーション" className="grid grid-cols-2 gap-8 md:col-span-7 lg:col-span-6">
            <div>
              <h2 className="mb-4 border-l-2 border-brand pl-2 text-sm font-bold text-ink">探す</h2>
              <ul className="space-y-3 text-sm text-sub">
                <li><Link href="/areas" className="transition-colors hover:text-accent">エリアから</Link></li>
                <li><Link href="/features" className="transition-colors hover:text-accent">条件から</Link></li>
                <li><Link href="/races" className="transition-colors hover:text-accent">大会から</Link></li>
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
