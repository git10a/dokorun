"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setHashiritai } from "@/lib/hashiritai-client";

export function HashiritaiRemoveButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const remove = async () => {
    setPending(true);
    try {
      await setHashiritai(slug, false);
      router.refresh();
    } catch {
      // 通信失敗でもボタンが押せないまま固まらないよう戻す
      setPending(false);
    }
  };
  return (
    <button
      type="button"
      disabled={pending}
      onClick={remove}
      className="rounded-lg border border-line px-4 py-2 text-sm font-bold disabled:opacity-60"
    >
      {pending ? "解除中…" : "解除する"}
    </button>
  );
}
