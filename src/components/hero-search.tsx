"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { TagChip } from "@/components/tag-chip";
import { regionGroups } from "@/lib/prefectures";
import { SearchInputClearButton } from "@/components/search-input-clear-button";

type Tab = "keyword" | "pref" | "feature";
type TagCategory = "terrain" | "environment" | "scenery";

type HeroSearchProps = {
  tags: Array<{
    id: string;
    slug: string;
    name: string;
    category: TagCategory;
  }>;
  prefectureCounts: Array<{
    prefecture: string;
    count: number;
  }>;
};

const tabs: Array<{ id: Tab; shortLabel: string; label: string }> = [
  { id: "keyword", shortLabel: "キーワード", label: "キーワードからさがす" },
  { id: "pref", shortLabel: "都道府県", label: "都道府県からさがす" },
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

export function HeroSearch({ tags, prefectureCounts }: HeroSearchProps) {
  const [activeTab, setActiveTab] = useState<Tab>("keyword");
  // キャラの向き: 素材は左向きなので右向きは-scale-x-100。初期は2人とも右向き
  const [facing, setFacing] = useState<"left" | "right">("right");
  const prevTabIndexRef = useRef(0);
  const countMap = new Map(prefectureCounts.map((item) => [item.prefecture, item.count]));
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const selectTab = (tab: Tab) => {
    const nextIndex = tabs.findIndex((item) => item.id === tab);
    if (nextIndex !== prevTabIndexRef.current) {
      setFacing(nextIndex > prevTabIndexRef.current ? "right" : "left");
      prevTabIndexRef.current = nextIndex;
    }
    setActiveTab(tab);
  };

  // アクティブなタブの中央(3等分の中心)にキャラを立たせ、切替時はleftのtransitionで走って移動
  const tabCenter = `${(activeTabIndex * 2 + 1) * (100 / 6)}%`;
  const flip = facing === "right" ? " -scale-x-100" : "";

  return (
    <div className="mx-auto mt-3 max-w-4xl text-left">
      <div aria-hidden="true" className="relative h-14 sm:h-[4.5rem]">
        <img src="/characters/ran-happy.png" alt="" className={`absolute bottom-0 w-12 -translate-x-[95%] transition-[left] duration-700 ease-in-out motion-reduce:transition-none sm:w-16${flip}`} style={{ left: tabCenter }} />
        <img src="/characters/hashiro-smile.png" alt="" className={`absolute bottom-0 w-12 -translate-x-[5%] transition-[left] delay-150 duration-700 ease-in-out motion-reduce:transition-none sm:w-16${flip}`} style={{ left: tabCenter }} />
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
          id="hero-search-panel-pref"
          role="tabpanel"
          aria-labelledby="hero-search-tab-pref"
          hidden={activeTab !== "pref"}
          className="space-y-4"
        >
          {regionGroups.map((region) => {
            const availablePrefectures = region.prefectures.filter((prefecture) => countMap.has(prefecture));
            if (!availablePrefectures.length) return null;
            return (
              <section key={region.name} aria-labelledby={`hero-search-region-${region.name}`}>
                <h2 id={`hero-search-region-${region.name}`} className="mb-1.5 text-xs font-bold text-sub">{region.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {availablePrefectures.map((prefecture) => (
                    <Link key={prefecture} href={`/spots?pref=${encodeURIComponent(prefecture)}`} className="font-medium text-accent hover:underline">
                      {prefecture} ({countMap.get(prefecture)})
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
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
