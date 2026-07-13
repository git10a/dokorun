"use client";

import { useState, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { track } from "@/lib/track";

const CLIENT_ID_KEY = "dokorun:client-id";
const likedKey = (slug: string) => `dokorun:hashiritai:${slug}`;
const emptySubscribe = () => () => {};

function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function HashiritaiButton({ slug, count: initialCount, loggedIn = false, initialLiked = false }: { slug: string; count: number; loggedIn?: boolean; initialLiked?: boolean }) {
  const [count, setCount] = useState(initialCount);
  const [override, setOverride] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  // SSR時は未タップ扱い、クライアントではlocalStorageの記録を初期値にする
  const stored = useSyncExternalStore(emptySubscribe, () => {
    try {
      return localStorage.getItem(likedKey(slug)) === "1";
    } catch {
      return false;
    }
  }, () => false);
  const liked = override ?? (loggedIn ? initialLiked : stored);

  const toggle = async () => {
    if (pending) return;
    const next = !liked;
    setPending(true);
    setOverride(next);
    setCount((value) => Math.max(0, value + (next ? 1 : -1)));
    if (next) track("hashiritai", { slug });
    try {
      const response = await fetch("/api/hashiritai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, clientId: getClientId(), on: next }),
      });
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as { count: number };
      setCount(data.count);
      localStorage.setItem(likedKey(slug), next ? "1" : "0");
    } catch {
      setOverride(!next);
      setCount((value) => Math.max(0, value + (next ? -1 : 1)));
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={liked} className={`flex items-center gap-2 rounded-lg border-2 border-brand px-4 py-2.5 font-bold transition-colors ${liked ? "bg-brand" : "bg-paper"} disabled:opacity-70`}>
      <Heart size={18} fill={liked ? "currentColor" : "none"} />走りたい {count}
    </button>
  );
}
