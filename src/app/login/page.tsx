import Link from "next/link";
import Image from "next/image";
import { Download, MessageSquareText, Bookmark } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth/login-button";
import { isGoogleAuthConfigured } from "@/lib/better-auth";
import { getUser } from "@/lib/user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "会員登録・ログイン", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackURL?: string }> }) {
  const [{ callbackURL }, user] = await Promise.all([searchParams, getUser()]);
  const destination = callbackURL?.startsWith("/") && !callbackURL.startsWith("//") ? callbackURL : "/me";
  if (user) redirect(destination);
  return (
    <div className="mx-auto max-w-lg px-4 pt-10 sm:pt-16">
      <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
        <div className="px-6 pb-8 pt-8 sm:px-10 sm:pt-10">
          <div className="text-center">
            <Image src="/brand/dokorun-wordmark-header.png" alt="どこラン" width={800} height={199} className="mx-auto h-8 w-auto" priority />
            <h1 className="mt-6 text-2xl font-bold tracking-tight">会員登録・ログイン</h1>
            <p className="mt-3 text-sm leading-6 text-sub">いつものGoogleアカウントで、<br />どこランをはじめよう。</p>
          </div>
          <div className="mt-7"><LoginButton callbackURL={destination} configured={isGoogleAuthConfigured} /></div>
          <p className="mt-3 text-center text-xs leading-5 text-sub">登録は無料。登録済みの方もこちらから。</p>
          <p className="mt-6 text-xs leading-6 text-sub">続けると、<Link href="/terms" className="underline underline-offset-4 hover:text-ink">利用規約</Link>と<Link href="/privacy" className="underline underline-offset-4 hover:text-ink">プライバシーポリシー</Link>に同意したものとみなされます。</p>
        </div>
        <div className="border-t border-line bg-cream/60 px-6 py-6 sm:px-10">
          <h2 className="text-xs font-bold text-sub">無料登録でできること</h2>
          <ul className="mt-4 space-y-4">
            <li className="flex items-start gap-3"><Download size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="text-sm font-bold">大会のコースをウォッチに取り込む</p><p className="mt-1 text-xs leading-5 text-sub">対応機種で使えるコースデータ（GPX形式）をダウンロードできます。</p></div></li>
            <li className="flex items-start gap-3"><MessageSquareText size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="text-sm font-bold">走った大会の体験を残す</p><p className="mt-1 text-xs leading-5 text-sub">あなたの経験を、次に走るランナーへ。</p></div></li>
            <li className="flex items-start gap-3"><Bookmark size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="text-sm font-bold">気になるスポットを保存</p><p className="mt-1 text-xs leading-5 text-sub">「走りたい」「おすすめ」や、走った記録をまとめて。</p></div></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-6 text-sub">コースマップ・高低図・ペース表・完走者の体験は、<br className="hidden sm:block" />登録なしで使えます。</p>
      <div className="mt-3 text-center"><Link href="/races" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 hover:text-accent">大会をさがす</Link></div>
    </div>
  );
}
