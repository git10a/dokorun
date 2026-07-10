import Link from "next/link";
import { Footprints } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 font-bold tracking-tight sm:gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand sm:size-9"><Footprints size={20} /></span>
          <span className="whitespace-nowrap text-[11px] sm:text-lg">どこラン</span>
        </Link>
        <nav aria-label="メインナビゲーション" className="flex shrink-0 items-center gap-2 text-[10px] font-bold sm:gap-5 sm:text-sm">
          <Link href="/spots" className="hidden transition-colors hover:text-accent sm:inline">スポットをさがす</Link>
          <Link href="/destinations" className="hidden transition-colors hover:text-accent md:inline">走る理由からさがす</Link>
          <Link href="/about" className="hidden transition-colors hover:text-accent sm:inline">このサイトについて</Link>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
