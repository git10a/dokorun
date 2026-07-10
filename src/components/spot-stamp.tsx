import type { CSSProperties } from "react";
import { STAMP_INK_LOCKED, stampImageUrl, stampTier } from "@/lib/stamps";

type SpotStampProps = {
  slug: string;
  runCount: number;
  // Tailwindのサイズクラス(例: "size-20")。マスク画像は正方形前提
  className?: string;
};

// マスクPNGにインク色を乗せて判子を描画する。色はティア(走った回数)で決まる
export function SpotStamp({ slug, runCount, className = "size-20" }: SpotStampProps) {
  const tier = stampTier(runCount);
  const ink = tier?.ink ?? STAMP_INK_LOCKED;
  const style: CSSProperties = {
    background: ink,
    maskImage: `url(${stampImageUrl(slug)})`,
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskImage: `url(${stampImageUrl(slug)})`,
    WebkitMaskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
  };
  return (
    <span
      role="img"
      aria-label={tier ? `スタンプ(${tier.label}色)` : "未取得のスタンプ"}
      className={`block shrink-0 ${tier ? "" : "opacity-50"} ${className}`}
      style={style}
    />
  );
}
