import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import { ProfileForm } from "@/components/auth/profile-form";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await requireUser("/me");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <p className="text-sm font-bold text-sub">MY PAGE</p><h1 className="mt-1 text-3xl font-black">マイページ</h1>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link href="/me/hashiritai" className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><Heart className="text-danger" />走りたいスポット</Link>
        <Link href="/me/logs" className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold hover:bg-cream"><BookOpen className="text-accent" />走った記録・ドコログ</Link>
      </div>
      <section className="mt-10"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold">プロフィール</h2><ProfileForm user={{ name: user.name, handle: user.handle ?? "", bio: user.bio ?? null }} /></section>
    </div>
  );
}

