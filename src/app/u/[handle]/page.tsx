/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Heart, Star } from "lucide-react";
import { getProfileUser, getPublicRunsByUser, getRunActivity, getUserFavorites, getUserPbs } from "@/db/data";
import { ProfileEditPanel } from "@/components/auth/profile-edit-panel";
import { RunCheckinButton } from "@/components/run-checkin-button";
import { RunGrass } from "@/components/run-grass";
import { SocialLinks } from "@/components/social-links";
import { SpotCard } from "@/components/spot-card";
import { avatarUrl } from "@/lib/avatars";
import { jstDayFromOffset, jstMonth, jstYear } from "@/lib/jst";
import { formatDuration, formatPace, PB_EVENTS } from "@/lib/pb";
import { getUser } from "@/lib/user";

export const dynamic = "force-dynamic";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  const user = await getProfileUser(handle);
  if (!user) return { title: "プロフィールが見つかりません", robots: { index: false } };
  return { title: `${user.name}さんのプロフィール | ドコラン`, robots: { index: false } };
}

const runDateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });

function runnerYears(year: number | null, month: number | null) {
  if (!year) return null;
  if (!month) return jstYear() - year + 1;
  const months = (jstYear() - year) * 12 + (jstMonth() - month);
  return Math.floor(Math.max(months, 0) / 12) + 1;
}

function PbTable({ pbs }: { pbs: { event: string; timeS: number }[] }) {
  const map = new Map(pbs.map((pb) => [pb.event, pb.timeS]));
  const rows = PB_EVENTS.map((event) => ({ ...event, timeS: map.get(event.key) })).filter((event) => event.timeS);
  if (!rows.length) return <p className="text-sub">自己ベストはまだ登録されていません</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <tbody>{rows.map((row) => <tr key={row.key} className="border-b border-line last:border-0"><th className="bg-cream px-4 py-3 text-left font-bold">{row.label}</th><td className="px-4 py-3 font-bold">{formatDuration(row.timeS!)}</td><td className="px-4 py-3 text-sub">{formatPace(row.timeS!, row.meters)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default async function PublicProfilePage({ params }: { params: Params }) {
  const { handle } = await params;
  const [user, viewer] = await Promise.all([getProfileUser(handle), getUser()]);
  if (!user) notFound();
  const isOwner = viewer?.id === user.id;
  const [pbs, activity, favorites, runs] = await Promise.all([
    getUserPbs(user.id),
    getRunActivity(user.id),
    getUserFavorites(user.id),
    getPublicRunsByUser(user.id, 10),
  ]);
  const image = avatarUrl(user);
  const years = runnerYears(user.runningSinceYear, user.runningSinceMonth);
  const sinceLabel = user.runningSinceYear ? `${user.runningSinceYear}年${user.runningSinceMonth ? `${user.runningSinceMonth}月` : ""}〜` : null;
  const activeDays = new Set(activity.map((day) => day.day));
  const today = jstDayFromOffset(0);
  const yesterday = jstDayFromOffset(-1);
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-cream">
          {image ? <img src={image} alt="" width={96} height={96} referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <span className="text-3xl font-black">走</span>}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-sub">@{user.handle}</p>
          <h1 className="mt-1 text-3xl font-black">{user.name}</h1>
          {user.bio && <p className="mt-3 whitespace-pre-line leading-7">{user.bio}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <SocialLinks links={{ instagram: user.instagram, xHandle: user.xHandle, strava: user.strava }} />
            {years && (
              <span className="flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-sm font-bold">
                ランナー歴 {years}年目
                {sinceLabel && <span className="font-normal text-sub">{sinceLabel}</span>}
              </span>
            )}
          </div>
          {isOwner && (
            <ProfileEditPanel
              avatarUser={{ id: user.id, image: user.image, customAvatarAt: user.customAvatarAt }}
              profileUser={{
                name: user.name,
                handle: user.handle,
                bio: user.bio,
                instagram: user.instagram,
                xHandle: user.xHandle,
                strava: user.strava,
                runningSinceYear: user.runningSinceYear,
                runningSinceMonth: user.runningSinceMonth,
              }}
              pbs={pbs}
            />
          )}
        </div>
      </header>
      {isOwner && (
        <section>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/me/hashiritai" className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><Heart className="text-danger" />走りたいスポット</Link>
            <Link href="/me/favorites" className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><Star className="text-brand-dark" />お気に入りコース</Link>
            <Link href="/me/logs" className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><BookOpen className="text-accent" />走った記録・ドコログ</Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <RunCheckinButton checked={activeDays.has(today)} />
            <RunCheckinButton offset={-1} checked={activeDays.has(yesterday)} />
          </div>
        </section>
      )}
      <section><RunGrass activity={activity} /></section>
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold">自己ベスト</h2><PbTable pbs={pbs} /></section>
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold">好きなコース</h2>{favorites.length ? <div className="grid gap-5 md:grid-cols-2">{favorites.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div> : <p className="text-sub">好きなコースはまだ登録されていません</p>}</section>
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold">公開ドコログ</h2><div className="space-y-4">{runs.map((run) => <article key={run.id} className="rounded-xl border border-line bg-paper p-4"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/spots/${run.spotSlug}`} className="font-bold text-accent">{run.spotName}</Link><p className="text-xs text-sub">{runDateFormat.format(run.ranAt)}{run.courseName ? ` ・ ${run.courseName}` : ""}</p></div><p className="mt-3 text-sm font-bold">{run.distanceM ? `${(run.distanceM / 1000).toFixed(2)}km` : "距離未入力"}{run.durationS ? ` ・ ${Math.round(run.durationS / 60)}分` : ""}</p>{run.comment && <p className="mt-3 whitespace-pre-line leading-7">{run.comment}</p>}</article>)}</div>{!runs.length && <p className="text-sub">公開ドコログはまだありません</p>}</section>
    </div>
  );
}
