import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { feedback } from "@/db/schema";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = { spot_request: "掲載リクエスト", contact: "お問い合わせ" };
const formatDate = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" });

export default async function AdminFeedbackPage() {
  const items = await getDb().select().from(feedback).orderBy(desc(feedback.createdAt)).limit(200);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-bold text-sub">ADMIN</p><h1 className="text-3xl font-bold">リクエスト・お問い合わせ</h1></div>
        <Link href="/admin" className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold">スポット管理へ</Link>
      </div>
      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-line bg-paper p-5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-cream px-3 py-1 font-bold">{categoryLabels[item.category] ?? item.category}</span>
              <time className="text-sub">{formatDate.format(item.createdAt)}</time>
              {item.contact && <span className="text-sub">連絡先: {item.contact}</span>}
            </div>
            <p className="mt-3 whitespace-pre-line leading-7">{item.message}</p>
          </article>
        ))}
        {!items.length && <p className="rounded-xl border border-line bg-cream p-10 text-center text-sub">まだ届いていません</p>}
      </div>
    </div>
  );
}
