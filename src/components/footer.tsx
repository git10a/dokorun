import Link from "next/link";
import { Footprints } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-cream">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-sub md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-2 font-bold text-ink"><span className="grid size-8 place-items-center rounded-lg bg-brand"><Footprints size={18} /></span>ドコラン</div>
        <p>© {new Date().getFullYear()} ドコラン</p>
        <div className="flex items-center gap-4">
          <Link href="/contact" className="underline underline-offset-4">リクエスト・お問い合わせ</Link>
          <Link href="/admin" className="text-xs underline underline-offset-4">運営者向け</Link>
        </div>
      </div>
    </footer>
  );
}
