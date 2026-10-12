import { revalidatePath, updateTag } from "next/cache";

// スポットの掲載内容(名前・設備・コース・公開状態)が変わったときに古くなるページをまとめて更新する。
// server action からのみ呼べる(updateTag の制約)
export function revalidateSpotCatalog(slug?: string) {
  updateTag("public-catalog");
  revalidatePath("/areas", "layout");
  revalidatePath("/features", "layout");
  revalidatePath("/races", "layout");
  revalidatePath("/stations", "layout");
  revalidatePath("/");
  revalidatePath("/spots");
  if (slug) revalidatePath(`/spots/${slug}`);
}
