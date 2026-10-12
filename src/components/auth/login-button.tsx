"use client";

import { useState } from "react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";

export function LoginButton({ callbackURL, configured }: { callbackURL: string; configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const login = async () => {
    if (!configured) {
      setMessage("現在Googleログインをご利用いただけません。時間をおいて再度お試しください。");
      return;
    }
    setMessage("");
    setPending(true);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL });
      if (!result.error) return;
    } catch {
      // 通信エラーでもボタンを再び操作できるようにする。
    }
    setMessage("ログインを開始できませんでした。時間をおいて再度お試しください");
    setPending(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={login}
        disabled={pending}
        aria-busy={pending}
        className="relative flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-[#747775] bg-white px-3 py-3 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
      >
        {/* Google公式配布のGロゴ。色・縦横比を変更しない。 */}
        <Image src="/brand/google-g.png" alt="" width={20} height={20.4} className="h-5 w-auto shrink-0" unoptimized />
        <span aria-live="polite">{pending ? "Googleへ移動中…" : "Googleで続ける"}</span>
      </button>
      {message && (
        <p role="alert" className="mt-3 text-sm font-bold text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
