import { SpotImage } from "./spot-image";
import { SpotVisual } from "./spot-visual";
import type { SpotSummary } from "@/lib/types";

type Props = {
  spot: Pick<SpotSummary, "slug" | "name" | "photoUrl" | "hasCourse" | "distanceM" | "courseType" | "tags">;
  sizes: string;
  photoHeight: number; // 写真の縦横比(幅640に対する高さ)
};

// カードのサムネイル。写真 → 生成済みコース地図 → コース形状のイラスト の順にあるものを使う
export function SpotThumbnail({ spot, sizes, photoHeight }: Props) {
  if (spot.photoUrl) {
    return <SpotImage src={spot.photoUrl} alt={`${spot.name}の写真`} width={640} height={photoHeight} sizes={sizes} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />;
  }
  if (spot.hasCourse) {
    // コース地図は生成済みの固定サイズwebpで、変換を挟まず直接配信する
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/course-maps/${spot.slug}.webp`} alt={`${spot.name}のコース地図`} width={512} height={512} loading="lazy" decoding="async" className="h-full w-full object-cover" />;
  }
  return <SpotVisual slug={spot.slug} distanceM={spot.distanceM} courseType={spot.courseType} tags={spot.tags} className="h-full w-full" />;
}
