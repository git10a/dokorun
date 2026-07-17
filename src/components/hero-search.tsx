"use client";

import Link from "next/link";
import { ArrowRight, Route, Search, TrainFront } from "lucide-react";
import { useRef, useState } from "react";
import { TagChip } from "@/components/tag-chip";
import { SearchInputClearButton } from "@/components/search-input-clear-button";

type Tab = "keyword" | "station" | "feature";
type TagCategory = "terrain" | "environment" | "scenery";

type HeroSearchProps = {
  tags: Array<{
    id: string;
    slug: string;
    name: string;
    category: TagCategory;
  }>;
};

const tabs: Array<{ id: Tab; shortLabel: string; label: string }> = [
  { id: "keyword", shortLabel: "キーワード", label: "キーワードからさがす" },
  { id: "station", shortLabel: "駅・路線", label: "駅・路線からさがす" },
  { id: "feature", shortLabel: "特徴", label: "特徴からさがす" },
];

const tagCategoryLabels: Record<TagCategory, string> = {
  terrain: "コース・地形",
  environment: "走りやすさ",
  scenery: "景色・ロケーション",
};

const extraFilters = [
  { name: "トイレあり", href: "/spots?toilet=1" },
  { name: "ロッカーあり", href: "/spots?locker=1" },
  { name: "銭湯・サウナが近い", href: "/spots?sento=1" },
  { name: "周回コース", href: "/spots?type=loop" },
  { name: "トラック", href: "/spots?type=track" },
] as const;

const chipClassName = "inline-flex items-center rounded-full bg-cream px-3 py-1.5 text-sm font-medium transition-colors hover:bg-brand/45";

export function HeroSearch({ tags }: HeroSearchProps) {
  const [activeTab, setActiveTab] = useState<Tab>("keyword");
  // キャラの向き: 素材は左向きなので右向きは-scale-x-100。初期は2人とも右向き
  const [facing, setFacing] = useState<"left" | "right">("right");
  const prevTabIndexRef = useRef(0);
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const facingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectTab = (tab: Tab) => {
    const nextIndex = tabs.findIndex((item) => item.id === tab);
    const prevIndex = prevTabIndexRef.current;
    if (nextIndex !== prevIndex) {
      if (facingTimerRef.current) clearTimeout(facingTimerRef.current);
      setFacing(nextIndex > prevIndex ? "right" : "left");
      // 端のタブに着いたら内側へ向き直る(キーワード=右向き、特徴=左向き)。移動(700ms+追走150ms)の完了後に反転
      const settled = nextIndex === 0 ? "right" : nextIndex === tabs.length - 1 ? "left" : null;
      if (settled) facingTimerRef.current = setTimeout(() => setFacing(settled), 900);
      prevTabIndexRef.current = nextIndex;
    }
    setActiveTab(tab);
  };

  // アクティブなタブの中央(3等分の中心)にキャラを立たせ、切替時はleftのtransitionで走って移動
  const tabCenter = `${(activeTabIndex * 2 + 1) * (100 / 6)}%`;
  const flip = facing === "right" ? " -scale-x-100" : "";

  return (
    <div className="mx-auto mt-7 max-w-4xl text-left">
      <div aria-hidden="true" className="relative h-9 sm:h-11">
        <img src="/characters/ran-happy.png" alt="" className={`absolute bottom-0 w-9 -translate-x-[95%] transition-[left] duration-700 ease-in-out motion-reduce:transition-none sm:w-11${flip}`} style={{ left: tabCenter }} />
        <img src="/characters/hashiro-smile.png" alt="" className={`absolute bottom-0 w-9 -translate-x-[5%] transition-[left] delay-150 duration-700 ease-in-out motion-reduce:transition-none sm:w-11${flip}`} style={{ left: tabCenter }} />
      </div>
      <div className="relative">
        <div role="tablist" aria-label="スポットのさがし方" className="grid grid-cols-3 overflow-hidden rounded-xl border-2 border-ink">
          {tabs.map((tab, index) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`hero-search-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`hero-search-panel-${tab.id}`}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") selectTab(tab.id);
                }}
                className={`min-h-12 px-1 py-2 text-center text-xs font-bold transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:px-3 sm:text-sm ${index ? "border-l-2 border-ink" : ""} ${active ? "bg-ink text-white" : "bg-transparent text-ink hover:bg-paper/25"}`}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full grid grid-cols-3">
          {tabs.map((tab, index) => (
            <span key={tab.id} className="flex justify-center">
              {index === activeTabIndex ? <span className="size-0 border-x-[8px] border-t-[8px] border-x-transparent border-t-ink" /> : null}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 rounded-2xl border border-line bg-paper p-4 shadow-lg sm:p-5">
        <div
          id="hero-search-panel-keyword"
          role="tabpanel"
          aria-labelledby="hero-search-tab-keyword"
          hidden={activeTab !== "keyword"}
        >
          <form action="/spots" className="flex gap-2 sm:gap-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">キーワード</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={19} />
              <input id="hero-keyword-search" name="q" placeholder="スポット名・市区町村" className="h-12 w-full rounded-lg border border-line pl-10 pr-11 outline-none focus:border-ink" />
              <SearchInputClearButton inputId="hero-keyword-search" />
            </label>
            <button className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-4 font-bold text-white hover:bg-ink/85 sm:px-7">
              <Search size={18} />
              <span className="hidden sm:inline">さがす</span>
              <span className="sr-only sm:hidden">さがす</span>
            </button>
          </form>
        </div>

        <div
          id="hero-search-panel-station"
          role="tabpanel"
          aria-labelledby="hero-search-tab-station"
          hidden={activeTab !== "station"}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/stations" className="group flex items-center gap-3 rounded-xl border border-line bg-cream p-4 transition-colors hover:border-ink/30 hover:bg-brand/20">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper"><TrainFront size={21} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">駅名からさがす</span>
                <span className="mt-0.5 block text-xs text-sub">駅の近くで走れる場所を見る</span>
              </span>
              <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/stations/lines" className="group flex items-center gap-3 rounded-xl border border-line bg-cream p-4 transition-colors hover:border-ink/30 hover:bg-brand/20">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper"><Route size={21} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">路線からさがす</span>
                <span className="mt-0.5 block text-xs text-sub">路線沿いのスポットを順番に見る</span>
              </span>
              <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div
          id="hero-search-panel-feature"
          role="tabpanel"
          aria-labelledby="hero-search-tab-feature"
          hidden={activeTab !== "feature"}
          className="space-y-4"
        >
          {(Object.keys(tagCategoryLabels) as TagCategory[]).map((category) => {
            const categoryTags = tags.filter((tag) => tag.category === category);
            if (!categoryTags.length) return null;
            return (
              <section key={category} aria-labelledby={`hero-search-category-${category}`}>
                <h2 id={`hero-search-category-${category}`} className="mb-2 text-xs font-bold text-sub">{tagCategoryLabels[category]}</h2>
                <div className="flex flex-wrap gap-2">
                  {categoryTags.map((tag) => <TagChip key={tag.id} slug={tag.slug} name={tag.name} />)}
                </div>
              </section>
            );
          })}
          <section aria-labelledby="hero-search-category-extra">
            <h2 id="hero-search-category-extra" className="mb-2 text-xs font-bold text-sub">設備・タイプ</h2>
            <div className="flex flex-wrap gap-2">
              {extraFilters.map((filter) => <Link key={filter.href} href={filter.href} className={chipClassName}>{filter.name}</Link>)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
