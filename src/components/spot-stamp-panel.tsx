import Link from "next/link";
import { SpotStamp } from "@/components/spot-stamp";
import { nextStampTier, stampTier } from "@/lib/stamps";

type SpotStampPanelProps = {
  slug: string;
  runCount: number;
  loggedIn: boolean;
};

// スポット詳細のランログ欄に出すスタンプカード。走った回数でインク色が育つ
export function SpotStampPanel({ slug, runCount, loggedIn }: SpotStampPanelProps) {
  const tier = stampTier(runCount);
  const next = nextStampTier(runCount);
  return (
    <div className="mt-6 flex items-center gap-4 rounded-xl border border-line bg-paper p-4">
      <SpotStamp slug={slug} runCount={runCount} className="size-24 sm:size-28" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-sub">SPOT STAMP</p>
        {tier ? (
          <p className="mt-1 font-bold">
            {runCount}回走破・{tier.label}色スタンプ
          </p>
        ) : (
          <p className="mt-1 font-bold">スタンプ未取得</p>
        )}
        <p className="mt-1 text-sm text-sub">
          {!tier
            ? loggedIn
              ? "「走ったよ 🏃」を記録するとスタンプがもらえます"
              : "ログインして「走ったよ 🏃」を記録するとスタンプがもらえます"
            : next
              ? `あと${next.minRuns - runCount}回走ると${next.label}色に育ちます`
              : "最高位の金色スタンプです 🏅"}
        </p>
        {loggedIn && (
          <Link href="/me/stamps" className="mt-2 inline-block text-sm font-bold text-accent">
            スタンプ帳を見る →
          </Link>
        )}
      </div>
    </div>
  );
}
