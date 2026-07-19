"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type SpotDetailTab = "course" | "logs" | "communities";
export type SpotDetailTabItem = { id: SpotDetailTab; label: string; count?: number; href: string };

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

export function SpotDetailTabs({ tabs, activeTab, className }: { tabs: SpotDetailTabItem[]; activeTab: SpotDetailTab; className: string }) {
  const pathname = usePathname();
  const queryTab = useSearchParams().get("tab") ?? "course";

  useEffect(() => {
    // 「走ったよ」CTAなどアンカー付き遷移はタブ切替後にアンカー位置まで送る
    const anchor = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
    if (anchor) anchor.scrollIntoView({ behavior: "instant", block: "start" });
    else scrollToTop();
  }, [pathname, queryTab]);

  return <nav aria-label="スポット詳細" className={className}>
    {tabs.map((detailTab) => {
      const isActive = activeTab === detailTab.id;
      return <Link key={detailTab.id} href={detailTab.href} scroll={false} onClick={scrollToTop} aria-current={isActive ? "page" : undefined} className={`relative flex min-w-max flex-1 items-center justify-center gap-1.5 px-4 py-4 text-sm font-bold transition-colors ${isActive ? "text-ink" : "text-sub hover:text-ink"}`}>
        {detailTab.label}
        {detailTab.count !== undefined && <span className="rounded bg-cream px-1.5 py-0.5 text-[11px] font-bold text-sub">{detailTab.count}</span>}
        {isActive && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-brand" />}
      </Link>;
    })}
  </nav>;
}
