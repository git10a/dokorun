import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth/login-button";
import { isGoogleAuthConfigured } from "@/lib/better-auth";
import { getUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackURL?: string }> }) {
  const [{ callbackURL }, user] = await Promise.all([searchParams, getUser()]);
  const destination = callbackURL?.startsWith("/") && !callbackURL.startsWith("//") ? callbackURL : "/me";
  if (user) redirect(destination);
  return (
    <div className="mx-auto max-w-md px-4 py-16 md:py-24">
      <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold text-sub">DOKORUN ACCOUNT</p>
        <h1 className="mt-2 text-3xl font-black">ログイン</h1>
        <p className="mt-4 leading-7 text-sub">旅先や大会遠征で走りたいコースを保存し、別の端末からもすぐ確認できます。走った記録を残すこともできます。</p>
        <div className="mt-8"><LoginButton callbackURL={destination} configured={isGoogleAuthConfigured} /></div>
        <p className="mt-6 text-xs leading-6 text-sub">ログインすると、<Link href="/terms" className="underline">利用規約</Link>と<Link href="/privacy" className="underline">プライバシーポリシー</Link>に同意したものとみなされます。</p>
      </div>
    </div>
  );
}
