"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/me/actions";
import { jstYear } from "@/lib/jst";

const inputClass = "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5";

export function ProfileForm({ user }: { user: { name: string; handle: string; bio: string | null; instagram?: string | null; xHandle?: string | null; strava?: string | null; runningSinceYear?: number | null } }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const currentYear = jstYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, index) => currentYear - index);
  return (
    <form action={action} className="mt-6 space-y-5 rounded-xl border border-line bg-paper p-5">
      <div><label htmlFor="profile-name" className="font-bold">表示名</label><input id="profile-name" name="name" required maxLength={50} defaultValue={user.name} className={inputClass} />{state.errors?.name?.map((error) => <p key={error} className="mt-1 text-sm text-danger">{error}</p>)}</div>
      <div><label htmlFor="profile-handle" className="font-bold">ハンドル</label><p className="mt-1 text-xs text-sub">半角英数字とハイフン、3〜30文字</p><input id="profile-handle" name="handle" required minLength={3} maxLength={30} defaultValue={user.handle} className={inputClass} />{state.errors?.handle?.map((error) => <p key={error} className="mt-1 text-sm text-danger">{error}</p>)}</div>
      <div><label htmlFor="profile-bio" className="font-bold">自己紹介</label><textarea id="profile-bio" name="bio" maxLength={300} rows={4} defaultValue={user.bio ?? ""} className={inputClass} />{state.errors?.bio?.map((error) => <p key={error} className="mt-1 text-sm text-danger">{error}</p>)}</div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label htmlFor="profile-instagram" className="font-bold">Instagram</label><input id="profile-instagram" name="instagram" maxLength={120} placeholder="ユーザー名またはURL" defaultValue={user.instagram ?? ""} className={inputClass} />{state.errors?.instagram?.map((error) => <p key={error} className="mt-1 text-sm text-danger">{error}</p>)}</div>
        <div><label htmlFor="profile-x" className="font-bold">X</label><input id="profile-x" name="xHandle" maxLength={120} placeholder="ユーザー名またはURL" defaultValue={user.xHandle ?? ""} className={inputClass} />{state.errors?.xHandle?.map((error) => <p key={error} className="mt-1 text-sm text-danger">{error}</p>)}</div>
        <div><label htmlFor="profile-strava" className="font-bold">Strava</label><input id="profile-strava" name="strava" maxLength={120} placeholder="IDまたはURL" defaultValue={user.strava ?? ""} className={inputClass} />{state.errors?.strava?.map((error) => <p key={error} className="mt-1 text-sm text-danger">{error}</p>)}</div>
      </div>
      <div>
        <label htmlFor="profile-running-since" className="font-bold">走り始めた年</label>
        <select id="profile-running-since" name="runningSinceYear" defaultValue={user.runningSinceYear ?? ""} className={inputClass}>
          <option value="">未設定</option>
          {years.map((year) => <option key={year} value={year}>{year}年</option>)}
        </select>
        {state.errors?.runningSinceYear?.map((error) => <p key={error} className="mt-1 text-sm text-danger">{error}</p>)}
      </div>
      {state.message && <p role="status" className={`rounded-lg px-4 py-3 text-sm font-bold ${state.status === "saved" ? "bg-cream" : "bg-danger/10 text-danger"}`}>{state.message}</p>}
      <button disabled={pending} className="rounded-lg bg-brand px-5 py-3 font-bold disabled:opacity-60">{pending ? "保存中…" : "保存する"}</button>
    </form>
  );
}
