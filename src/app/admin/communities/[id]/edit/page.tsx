import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAdminCommunity, getSpotOptions } from "@/db/data";
import { CommunityForm } from "@/components/admin/community-form";

export const dynamic = "force-dynamic";

export default async function EditCommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [community, spotOptions] = await Promise.all([getAdminCommunity(id), getSpotOptions()]);
  if (!community) notFound();
  return <div className="mx-auto max-w-5xl px-4 py-10 md:px-6"><Link href="/admin/communities" className="mb-5 flex items-center gap-1 text-sm text-sub"><ChevronLeft size={16} />一覧へ戻る</Link><h1 className="mb-10 text-3xl font-bold">コミュニティを編集</h1><CommunityForm mode="edit" spotOptions={spotOptions} initial={community} /></div>;
}
