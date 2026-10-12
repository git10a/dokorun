import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { raceReviews, raceReviewReports, users } from "@/db/schema";
import { requireAdmin, requireAdminPage } from "@/lib/auth";
import { formatFinishTime } from "@/lib/race-reviews";
import { raceBySlug } from "@/lib/races";

export const dynamic = "force-dynamic";
export const metadata = { title: "大会レビュー管理", robots: { index: false, follow: false } };

async function moderate(form: FormData) {
  "use server";
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const hidden = form.get("hidden");
  if (!/^[0-9a-f-]{36}$/.test(id) || (hidden !== "1" && hidden !== "0")) throw new Error("入力を確認してください");
  const [review] = await getDb()
    .update(raceReviews)
    .set({ isHidden: hidden === "1", updatedAt: new Date() })
    .where(eq(raceReviews.id, id))
    .returning({ slug: raceReviews.raceSlug });
  if (review) revalidatePath(`/races/${review.slug}`);
  revalidatePath("/admin/race-reviews");
}

// 外側の列はテーブル名つきで直書きする(drizzle が JOIN 有無で修飾を変えるため)
const reportsCount = sql<number>`(select count(*) from "race_review_reports" rr where rr."review_id" = "race_reviews"."id")`;

export default async function AdminRaceReviews() {
  await requireAdminPage();
  const db = getDb();
  const items = await db
    .select({ review: raceReviews, name: users.name, reports: reportsCount })
    .from(raceReviews)
    .innerJoin(users, eq(users.id, raceReviews.userId))
    .orderBy(desc(reportsCount), desc(raceReviews.createdAt))
    .limit(100);
  const reports = await db.select().from(raceReviewReports).orderBy(desc(raceReviewReports.createdAt)).limit(200);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/admin" className="text-sm text-accent underline">
        管理画面へ
      </Link>
      <h1 className="mt-5 text-2xl font-bold">大会レビュー管理</h1>
      <p className="mt-2 text-sm text-sub">通報の多い順・新しい順に最大100件。通報理由は直近200件を表示します。</p>
      <div className="mt-6 space-y-4">
        {items.map(({ review, name, reports: count }) => (
          <article key={review.id} className="rounded-xl border border-line p-5">
            <p className="font-bold">
              {raceBySlug.get(review.raceSlug)?.name ?? review.raceSlug} · {review.raceYear}年 · {name}
            </p>
            <p className="mt-1 text-sm">
              {formatFinishTime(review.finishTimeS)} · {review.isHidden ? "非公開" : "公開"} · 通報 {count}件
            </p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm">{review.body}</p>
            {reports
              .filter((report) => report.reviewId === review.id)
              .map((report) => (
                <p key={report.userId} className="mt-2 break-words text-sm text-danger">
                  通報：{report.reason}
                </p>
              ))}
            <form action={moderate} className="mt-4">
              <input type="hidden" name="id" value={review.id} />
              <input type="hidden" name="hidden" value={review.isHidden ? "0" : "1"} />
              <button className="rounded-lg border border-line px-4 py-2 text-sm font-bold">
                {review.isHidden ? "再公開する" : "非公開にする"}
              </button>
            </form>
          </article>
        ))}
        {!items.length && <p>投稿はまだありません。</p>}
      </div>
    </div>
  );
}
