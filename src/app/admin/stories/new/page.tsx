import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ArticleForm } from "@/components/admin/article-form";
import { requireAdminPage } from "@/lib/auth";
import { racesByCalendar } from "@/lib/races";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function NewStoryPage() {
  await requireAdminPage();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <Link href="/admin/stories" className="mb-5 flex items-center gap-1 text-sm text-sub">
        <ChevronLeft size={16} />
        一覧へ戻る
      </Link>
      <h1 className="mb-3 text-3xl font-bold">記事を書く</h1>
      <p className="mb-10 text-sm text-sub">一度保存すると、社外の方に見せるための共有プレビューURLが発行されます。</p>
      <ArticleForm
        raceOptions={racesByCalendar.map((race) => ({ slug: race.slug, name: race.name }))}
        siteHost={new URL(getSiteUrl()).host}
      />
    </div>
  );
}
