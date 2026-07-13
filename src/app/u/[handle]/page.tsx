/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileUser, getPublicRunsByUser, getStampBook, getUserFavorites, getUserPbs } from "@/db/data";
import { ProfileEditPanel } from "@/components/auth/profile-edit-panel";
import { SocialLinks } from "@/components/social-links";
import { SpotCard } from "@/components/spot-card";
import { SpotStamp } from "@/components/spot-stamp";
import { STAMP_SLUGS, stampTier } from "@/lib/stamps";
import { avatarUrl } from "@/lib/avatars";
import { jstMonth, jstYear } from "@/lib/jst";
import { formatDuration, formatPace, PB_EVENTS } from "@/lib/pb";
import { getUser } from "@/lib/user";

export const dynamic = "force-dynamic";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  const user = await getProfileUser(handle);
  if (!user) return { title: "プロフィールが見つかりません", robots: { index: false } };
  return { title: `${user.name}さんのプロフィール | どこラン`, robots: { index: false } };
}

const runDateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });

function runnerYears(year: number | null, month: number | null) {
  if (!year) return null;
  if (!month) return jstYear() - year + 1;
  const months = (jstYear() - year) * 12 + (jstMonth() - month);
  return Math.floor(Math.max(months, 0) / 12) + 1;
}

function PbSummary({ pbs }: { pbs: { event: string; timeS: number; competitionName: string | null }[] }) {
  const map = new Map(pbs.map((pb) => [pb.event, pb]));
  const rows = PB_EVENTS.map((event) => ({ ...event, pb: map.get(event.key) })).filter((event) => event.pb);
  if (!rows.length) {
    return (
      <div className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm">
        <span className="font-bold">自己ベスト</span>
        <span className="ml-3 text-sub">未登録</span>
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm">
      <p className="font-bold">自己ベスト</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {rows.map((row) => {
          const pb = row.pb!;
          return (
            <span key={row.key} className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-paper px-3 py-1">
              <span className="shrink-0 font-bold">{row.label}</span>
              <span className="shrink-0">{formatDuration(pb.timeS)}</span>
              <span className="shrink-0 text-xs text-sub">{formatPace(pb.timeS, row.meters)}</span>
              {pb.competitionName && (
                <span className="min-w-0 truncate border-l border-line pl-2 text-xs text-sub" title={pb.competitionName}>
                  {pb.competitionName}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default async function PublicProfilePage({ params }: { params: Params }) {
  const { handle } = await params;
  const [user, viewer] = await Promise.all([getProfileUser(handle), getUser()]);
  if (!user) notFound();
  const isOwner = viewer?.id === user.id;
  const [pbs, favorites, runs, stampRows] = await Promise.all([
    getUserPbs(user.id),
    getUserFavorites(user.id),
    getPublicRunsByUser(user.id, 10),
    // スタンプは非公開ランの回数も含むため本人にのみ表示する
    isOwner ? getStampBook(user.id, STAMP_SLUGS) : Promise.resolve([]),
  ]);
  const stamps = STAMP_SLUGS.map((slug) => stampRows.find((row) => row.slug === slug)).filter((row) => row != null);
  const image = avatarUrl(user);
  const years = runnerYears(user.runningSinceYear, user.runningSinceMonth);
  const sinceLabel = user.runningSinceYear ? `${user.runningSinceYear}年${user.runningSinceMonth ? `${user.runningSinceMonth}月` : ""}〜` : null;
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
          <PbSummary pbs={pbs} />
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
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="border-l-4 border-brand pl-3 text-xl font-bold">スタンプ帳</h2>
            <Link href="/me/stamps" className="text-sm font-bold text-accent">くわしく見る →</Link>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {stamps.map((stamp) => {
              const tier = stampTier(stamp.runCount);
              return (
                <Link key={stamp.slug} href={`/spots/${stamp.slug}`} className="rounded-xl border border-line bg-paper p-3 text-center transition hover:border-brand">
                  <SpotStamp slug={stamp.slug} runCount={stamp.runCount} className="mx-auto size-16 sm:size-20" />
                  <p className="mt-2 truncate text-xs font-bold">{stamp.name}</p>
                  <p className="mt-0.5 text-xs text-sub">{tier ? `${stamp.runCount}回・${tier.label}色` : "未取得"}</p>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-sub">スポットで「走ったよ 🏃」を記録するとスタンプがもらえます。走り込むと色が育ちます(スタンプ帳はあなたにだけ表示されています)</p>
        </section>
      )}
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold">おすすめ</h2>{favorites.length ? <div className="grid gap-5 md:grid-cols-2">{favorites.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div> : <p className="text-sub">おすすめはまだ登録されていません</p>}</section>
      <section><h2 className="mb-5 border-l-4 border-brand pl-3 text-xl font-bold">公開ログ</h2><div className="space-y-4">{runs.map((run) => <article key={run.id} className="rounded-xl border border-line bg-paper p-4"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/spots/${run.spotSlug}`} className="font-bold text-accent">{run.spotName}</Link><p className="text-xs text-sub">{runDateFormat.format(run.ranAt)}</p></div>{run.comment ? <p className="mt-3 whitespace-pre-line leading-7">{run.comment}</p> : <p className="mt-3 text-sm text-sub">走ったよ 🏃</p>}</article>)}</div>{!runs.length && <p className="text-sub">公開ログはまだありません</p>}</section>
    </div>
  );
}
