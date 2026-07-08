"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { RunCheckinButton } from "@/components/run-checkin-button";
import { avatarUrl } from "@/lib/avatars";
import { authClient } from "@/lib/auth-client";

const CLIENT_ID_KEY = "dokorun:client-id";

export function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    const clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) return;
    fetch("/api/hashiritai/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    }).catch(() => undefined);
  }, [session?.user]);

  if (isPending) return <span className="h-9 w-14 animate-pulse rounded-lg bg-cream" aria-hidden />;
  if (!session?.user) return <Link href="/login" className="rounded-lg border border-line px-3 py-2 text-xs font-bold sm:text-sm">ログイン</Link>;
  const image = avatarUrl(session.user as { avatarKey?: string | null; image?: string | null });

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="grid size-9 place-items-center overflow-hidden rounded-full border border-line bg-cream" title={session.user.name}>
        {image ? <img src={image} alt="" width={36} height={36} referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound size={18} />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-line bg-paper p-2 text-sm shadow-lg">
          <p className="truncate px-3 py-2 font-bold">{session.user.name}</p>
          <Link href="/me" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-cream">マイページ</Link>
          <RunCheckinButton compact />
          <button type="button" onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-cream"><LogOut size={16} />ログアウト</button>
        </div>
      )}
    </div>
  );
}
