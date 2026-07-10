import Link from "next/link";
import { getStampBook } from "@/db/data";
import { requireUser } from "@/lib/user";
import { SpotStamp } from "@/components/spot-stamp";
import { STAMP_SLUGS, STAMP_TIERS, nextStampTier, stampTier } from "@/lib/stamps";

export const dynamic = "force-dynamic";

export const metadata = { title: "スタンプ帳 - どこラン" };

export default async function MyStampsPage() {
  const user = await requireUser("/me/stamps");
  const rows = await getStampBook(user.id, STAMP_SLUGS);
  // STAMP_SLUGSの並び順(=知名度順)で表示する
  const items = STAMP_SLUGS.map((slug) => rows.find((row) => row.slug === slug)).filter((row) => row != null);
  const collected = items.filter((item) => item.runCount > 0).length;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-sub">MY PAGE</p>
          <h1 className="mt-1 text-3xl font-black">スタンプ帳</h1>
        </div>
        <Link href="/me" className="text-sm font-bold text-accent">マイページへ</Link>
      </div>
      <p className="mt-3 text-sm text-sub">
        スポットで「走ったよ 🏃」を記録するとスタンプがもらえます。同じスポットを走り込むとインクの色が育ちます(
        {STAMP_TIERS.map((tier) => `${tier.minRuns}回で${tier.label}色`).join("、")})。
      </p>
      <p className="mt-5 rounded-lg bg-cream px-4 py-3 text-sm font-bold">集めたスタンプ: {collected} / {items.length}</p>
      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3">
        {items.map((item) => {
          const tier = stampTier(item.runCount);
          const next = nextStampTier(item.runCount);
          return (
            <Link key={item.slug} href={`/spots/${item.slug}`} className="rounded-xl border border-line bg-paper p-4 text-center transition hover:border-brand">
              <SpotStamp slug={item.slug} runCount={item.runCount} className="mx-auto size-28 sm:size-32" />
              <p className="mt-3 font-bold leading-tight">{item.name}</p>
              <p className="mt-1 text-xs text-sub">{item.prefecture}</p>
              <p className="mt-2 text-sm">
                {tier ? (
                  <>
                    <span className="font-bold">{item.runCount}回走破・{tier.label}色</span>
                    {next && <span className="block text-xs text-sub">あと{next.minRuns - item.runCount}回で{next.label}色</span>}
                  </>
                ) : (
                  <span className="text-sub">未取得</span>
                )}
              </p>
            </Link>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-sub">スタンプのあるスポットは順次追加していきます。</p>
    </div>
  );
}
