import Link from "next/link";
import { Footprints } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-cream">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-sub md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-2 font-bold text-ink"><span className="grid size-8 place-items-center rounded-lg bg-brand"><Footprints size={18} /></span>どこラン<img src="/characters/ran-happy.png" alt="" className="ml-2 h-8 w-auto -scale-x-100" /><img src="/characters/hashiro-smile.png" alt="" className="h-8 w-auto -scale-x-100" /></div>
        <p>© {new Date().getFullYear()} どこラン</p>
        <div className="flex items-center gap-4">
          <Link href="/areas" className="underline underline-offset-4">エリア</Link>
          <Link href="/features" className="underline underline-offset-4">条件</Link>
          <Link href="/about" className="underline underline-offset-4">このサイトについて</Link>
          <Link href="/terms" className="text-xs underline underline-offset-4">利用規約</Link>
          <Link href="/privacy" className="text-xs underline underline-offset-4">プライバシー</Link>
          <Link href="/contact" className="underline underline-offset-4">リクエスト・お問い合わせ</Link>
          <Link href="/admin" className="text-xs underline underline-offset-4">運営者向け</Link>
        </div>
      </div>
    </footer>
  );
}
