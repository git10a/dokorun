"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const changeSort = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "new") next.delete("sort");
    else next.set("sort", value);
    next.delete("page");
    const query = next.toString();
    router.push(query ? `/spots?${query}` : "/spots");
  };

  return (
    <select aria-label="並び順" value={searchParams.get("sort") ?? "new"} onChange={(event) => changeSort(event.target.value)} className="h-10 rounded-lg border border-line bg-paper px-3 text-sm">
      <option value="new">新着順</option>
      <option value="distance_asc">距離が短い順</option>
      <option value="distance_desc">距離が長い順</option>
    </select>
  );
}
