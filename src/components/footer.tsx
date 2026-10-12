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
              <Image src="/brand/dokorun-wordmark-header.png" alt={siteConfig.name} width={800} height={199} className="h-8 w-auto" />
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
                <li><Link href="/guide/gpx" className="transition-colors hover:text-accent">ウォッチへの取り込み方</Link></li>
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
        </div>
      </div>
    </footer>
  );
}
