import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileUserById, getUserPbs } from "@/db/data";
import { AvatarUploader } from "@/components/auth/avatar-uploader";
import { PbForm } from "@/components/auth/pb-form";
import { ProfileForm } from "@/components/auth/profile-form";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "プロフィールを編集 | どこラン", robots: { index: false } };

export default async function ProfileEditPage() {
  const sessionUser = await requireUser("/me/profile");
  const [user, pbs] = await Promise.all([getProfileUserById(sessionUser.id), getUserPbs(sessionUser.id)]);
  if (!user) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <Link href={`/u/${user.handle}`} className="text-sm font-bold text-accent">← プロフィールへ戻る</Link>
      <p className="mt-7 text-sm font-bold text-sub">MY PAGE</p>
      <h1 className="mt-1 text-3xl font-black">プロフィールを編集</h1>
      <AvatarUploader user={{ id: user.id, image: user.image, customAvatarAt: user.customAvatarAt }} />
      <section className="mt-10">
        <h2 className="border-l-4 border-brand pl-3 text-xl font-bold">基本情報</h2>
        <ProfileForm user={{
          name: user.name,
          handle: user.handle,
          bio: user.bio,
          instagram: user.instagram,
          xHandle: user.xHandle,
          strava: user.strava,
          runningSinceYear: user.runningSinceYear,
          runningSinceMonth: user.runningSinceMonth,
        }} />
      </section>
      <section className="mt-10">
        <h2 className="border-l-4 border-brand pl-3 text-xl font-bold">自己ベスト</h2>
        <PbForm pbs={pbs} />
      </section>
    </div>
  );
}
