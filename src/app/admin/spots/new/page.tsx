import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTags } from "@/db/data";
import { SpotForm } from "@/components/admin/spot-form";

export const dynamic = "force-dynamic";

export default async function NewSpotPage() {
  const tags = await getTags();
  return <div className="mx-auto max-w-5xl px-4 py-10 md:px-6"><Link href="/admin" className="mb-5 flex items-center gap-1 text-sm text-sub"><ChevronLeft size={16} />一覧へ戻る</Link><h1 className="mb-10 text-3xl font-bold">スポットを新規登録</h1><SpotForm mode="create" tags={tags} uploadEnabled={Boolean(process.env.R2_PUBLIC_URL)} /></div>;
}
