"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginButton({ callbackURL, configured }: { callbackURL: string; configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const login = async () => {
    if (!configured) {
      setMessage("Googleログインの環境変数がまだ設定されていません");
      return;
    }
    setPending(true);
    const result = await authClient.signIn.social({ provider: "google", callbackURL });
    if (result.error) {
      setMessage("ログインを開始できませんでした。時間をおいて再度お試しください");
      setPending(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={login} disabled={pending} className="w-full rounded-lg bg-brand px-5 py-3.5 font-bold disabled:opacity-60">
        {pending ? "Googleへ移動中…" : "Googleで会員登録・ログイン"}
      </button>
      {message && <p role="alert" className="mt-3 text-sm font-bold text-danger">{message}</p>}
    </div>
  );
}
