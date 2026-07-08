"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, useTransition } from "react";
import { AVATAR_KEYS, avatarUrl } from "@/lib/avatars";
import { authClient } from "@/lib/auth-client";

type AvatarUser = { avatarKey?: string | null; image?: string | null };
type UpdateUserClient = { updateUser: (data: { avatarKey: string | null }) => Promise<unknown> };

export function AvatarPicker({ user }: { user: AvatarUser }) {
  const [avatarKey, setAvatarKey] = useState(user.avatarKey ?? null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const currentUrl = useMemo(() => avatarUrl({ ...user, avatarKey }), [avatarKey, user]);

  const choose = (key: string | null) => {
    setMessage("");
    startTransition(async () => {
      try {
        await (authClient as unknown as UpdateUserClient).updateUser({ avatarKey: key });
        setAvatarKey(key);
        setMessage("アバターを更新しました");
      } catch {
        setMessage("更新できませんでした");
      }
    });
  };

  return (
    <section className="mt-6 rounded-xl border border-line bg-paper p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-cream">
          {currentUrl ? <img src={currentUrl} alt="" width={64} height={64} referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <span className="text-xl font-black">走</span>}
        </span>
        <div>
          <h3 className="font-bold">アバター</h3>
          <p className="mt-1 text-sm text-sub">ドコラン内で表示するアイコンを選べます</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {AVATAR_KEYS.map((key) => (
          <button key={key} type="button" onClick={() => choose(key)} disabled={pending} aria-pressed={avatarKey === key} className={`aspect-square overflow-hidden rounded-xl border p-1 transition-colors ${avatarKey === key ? "border-ink bg-brand" : "border-line bg-cream hover:bg-brand/35"}`}>
            <img src={`/avatars/${key}.svg`} alt="" width={72} height={72} className="h-full w-full rounded-lg" />
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => choose(null)} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm font-bold hover:bg-cream disabled:opacity-60">Googleの画像に戻す</button>
        {message && <p role="status" className="text-sm font-bold text-sub">{message}</p>}
      </div>
    </section>
  );
}
