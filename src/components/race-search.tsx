"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { track } from "@/lib/track";

type RaceOption = { slug: string; name: string; prefecture: string; date: string };

// 「大会名＋コース/GPX」で来る出場者向けの入口。掲載大会は数十件なのでクライアントで絞り込む
export function RaceSearch({ races }: { races: RaceOption[] }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const normalized = query.trim().replace(/\s+/g, "");
  const matches = normalized
    ? races
        .filter((race) =>
          `${race.name}${race.prefecture}`.replace(/\s+/g, "").toLowerCase().includes(normalized.toLowerCase()),
        )
        .slice(0, 6)
    : [];
  const requestHref = `/contact?${new URLSearchParams({ category: "spot_request", message: `掲載してほしい大会：${query.trim()}\n\n大会の公式サイト（わかれば）：\n` })}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!normalized) return;
    track("race_search", { hit: matches.length > 0 });
    router.push(matches[0] ? `/races/${matches[0].slug}` : requestHref);
  };

  return (
    <form onSubmit={submit} role="search" className="relative text-left">
      <label htmlFor={`${listId}-input`} className="sr-only">
        出る大会の名前
      </label>
      <div className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-paper p-2 shadow-lg">
        <Search size={20} className="ml-2 shrink-0 text-sub" aria-hidden="true" />
        <input
          id={`${listId}-input`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="大会名（例：横浜、福岡）"
          autoComplete="off"
          aria-controls={listId}
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        <button className="h-11 shrink-0 rounded-xl bg-ink px-4 text-sm font-bold text-white hover:bg-ink/85">
          さがす
        </button>
      </div>
      {normalized && (
        <div
          id={listId}
          className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line bg-paper shadow-xl"
        >
          {matches.length > 0 ? (
            <ul>
              {matches.map((race) => (
                <li key={race.slug}>
                  <Link
                    href={`/races/${race.slug}`}
                    onClick={() => track("race_search", { hit: true })}
                    className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-cream"
                  >
                    <span>
                      <span className="block font-bold">{race.name}</span>
                      <span className="text-xs text-sub">
                        {race.date}・{race.prefecture}
                      </span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-sub" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-4 text-sm">
              <p className="font-bold">「{query.trim()}」はまだ掲載していません</p>
              <Link
                href={requestHref}
                className="mt-2 inline-flex items-center gap-1 font-bold text-accent underline underline-offset-4"
              >
                この大会の掲載をリクエストする
              </Link>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
