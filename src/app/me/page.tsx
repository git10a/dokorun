import Link from "next/link";
import { BookOpen, Eye, Heart, Star } from "lucide-react";
import { getProfileUser, getRunActivity, getUserPbs } from "@/db/data";
import { AvatarPicker } from "@/components/auth/avatar-picker";
import { PbForm } from "@/components/auth/pb-form";
import { ProfileForm } from "@/components/auth/profile-form";
import { RunCheckinButton } from "@/components/run-checkin-button";
import { RunGrass } from "@/components/run-grass";
import { requireUser } from "@/lib/user";
import { jstDayFromOffset } from "@/lib/jst";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await requireUser("/me");
  if (!user.handle) throw new Error("handle is required");
  const [profile, pbs, activity] = await Promise.all([
    getProfileUser(user.handle),
    getUserPbs(user.id),
    getRunActivity(user.id),
  ]);
  const profileUser = profile ?? { ...user, instagram: null, xHandle: null, strava: null, runningSinceYear: null };
  const activeDays = new Set(activity.map((day) => day.day));
  const today = jstDayFromOffset(0);
  const yesterday = jstDayFromOffset(-1);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <p className="text-sm font-bold text-sub">MY PAGE</p><h1 className="mt-1 text-3xl font-black">マイページ</h1>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link href="/me/hashiritai" className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><Heart className="text-danger" />走りたいスポット</Link>
        <Link href="/me/favorites" className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><Star className="text-brand-dark" />お気に入りコース</Link>
        <Link href="/me/logs" className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><BookOpen className="text-accent" />走った記録・ドコログ</Link>
        <Link href={`/u/${profileUser.handle}`} className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><Eye className="text-sub" />公開プロフィールを見る</Link>
      </div>
      <section className="mt-10"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold">今日の記録</h2><div className="mt-5 flex flex-wrap gap-3"><RunCheckinButton checked={activeDays.has(today)} /><RunCheckinButton offset={-1} checked={activeDays.has(yesterday)} /></div></section>
      <section className="mt-10"><RunGrass activity={activity} /></section>
      <section className="mt-10"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold">プロフィール</h2><AvatarPicker user={{ image: profileUser.image, avatarKey: profileUser.avatarKey }} /><ProfileForm user={{ name: profileUser.name, handle: profileUser.handle ?? "", bio: profileUser.bio ?? null, instagram: profileUser.instagram, xHandle: profileUser.xHandle, strava: profileUser.strava, runningSinceYear: profileUser.runningSinceYear }} /></section>
      <section className="mt-10"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold">自己ベスト</h2><PbForm pbs={pbs} /></section>
    </div>
  );
}
