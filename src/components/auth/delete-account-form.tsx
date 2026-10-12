"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function DeleteAccountForm() {
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="text-lg font-bold">退会</h2>
      <p className="mt-3 text-sm leading-7 text-sub">
        プロフィール、走った記録、写真、お気に入り、大会の体験を削除します。元に戻すことはできません。写真ファイルは通常24時間以内に削除されます。
      </p>
      <p className="mt-2 text-xs leading-6 text-sub">
        障害復旧用バックアップには最大30日残る場合があります。別途送信したお問い合わせの削除は、お問い合わせ窓口へご連絡ください。
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!confirmed || pending) return;
          setPending(true);
          setMessage("");
          try {
            const result = await authClient.deleteUser();
            if (result.error) {
              setReauth(result.error.code === "SESSION_EXPIRED");
              setMessage(
                result.error.code === "SESSION_EXPIRED"
                  ? "安全のため、Googleで本人確認してから、もう一度削除してください。"
                  : "削除できませんでした。時間をおいて再度お試しください。",
              );
            } else {
              for (const key of [
                "dokorun:client-id",
                "dokorun:visitor-id",
                "dokorun:visitor-created",
                "dokorun:internal-traffic",
              ])
                localStorage.removeItem(key);
              sessionStorage.removeItem("dokorun:session-id");
              sessionStorage.removeItem("dokorun:near-location");
              window.location.replace("/");
            }
          } catch {
            setMessage("削除できませんでした。時間をおいて再度お試しください。");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1"
          />
          削除される内容を確認しました
        </label>
        {message && (
          <p role="status" className="text-sm text-danger">
            {message}
          </p>
        )}
        {reauth && (
          <button
            type="button"
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/me/profile" })}
            className="rounded-lg border border-line px-4 py-2 text-sm font-bold"
          >
            Googleで本人確認
          </button>
        )}
        <button
          disabled={!confirmed || pending}
          className="block rounded-lg border border-danger px-4 py-2 text-sm font-bold text-danger disabled:opacity-50"
        >
          {pending ? "削除中…" : "退会してデータを削除"}
        </button>
      </form>
    </section>
  );
}
