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
            <Link href="/spots" className="whitespace-nowrap px-1 py-1 text-[11px] font-bold transition-colors hover:text-accent sm:px-2 sm:text-sm">スポットをさがす</Link>
            <Link href="/races" className="hidden whitespace-nowrap px-2 py-1 text-sm font-bold transition-colors hover:text-accent sm:inline">大会からさがす</Link>
          </div>
          <div className="ml-1 border-l border-line pl-2 sm:ml-0 sm:border-0 sm:pl-0">
            <UserMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}
