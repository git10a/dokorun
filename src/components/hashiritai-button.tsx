"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { setHashiritai } from "@/lib/hashiritai-client";
import { track } from "@/lib/track";

export function HashiritaiButton({
  slug,
  count: initialCount,
  loggedIn = false,
  initialLiked = false,
}: {
  slug: string;
  count: number;
  loggedIn?: boolean;
  initialLiked?: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [override, setOverride] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const liked = override ?? initialLiked;

  const toggle = async () => {
    if (pending) return;
    if (!loggedIn) {
      window.location.href = `/login?callbackURL=${encodeURIComponent(`/spots/${slug}`)}`;
      return;
    }
    const next = !liked;
    setPending(true);
    setOverride(next);
    setCount((value) => Math.max(0, value + (next ? 1 : -1)));
    if (next) track("hashiritai", { slug });
    try {
      setCount(await setHashiritai(slug, next));
    } catch {
      setOverride(!next);
      setCount((value) => Math.max(0, value + (next ? -1 : 1)));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      title={loggedIn ? undefined : "会員登録・ログインすると保存できます"}
      className={`flex items-center gap-2 rounded-lg border-2 border-brand px-3 py-2 text-sm font-bold transition-colors ${liked ? "bg-brand" : "bg-paper"} disabled:opacity-70`}
    >
      <Heart size={16} fill={liked ? "currentColor" : "none"} />
      走りたい {count}
    </button>
  );
}
