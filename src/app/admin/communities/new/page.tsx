import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSpotOptions } from "@/db/data";
import { CommunityForm } from "@/components/admin/community-form";

export const dynamic = "force-dynamic";

export default async function NewCommunityPage() {
  const spotOptions = await getSpotOptions();
  return <div className="mx-auto max-w-5xl px-4 py-10 md:px-6"><Link href="/admin/communities" className="mb-5 flex items-center gap-1 text-sm text-sub"><ChevronLeft size={16} />一覧へ戻る</Link><h1 className="mb-10 text-3xl font-bold">コミュニティを新規登録</h1><CommunityForm mode="create" spotOptions={spotOptions} /></div>;
}
