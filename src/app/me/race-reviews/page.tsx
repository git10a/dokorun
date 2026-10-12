import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/user";
import { getUserRaceReviews } from "@/db/race-reviews";
import { raceBySlug } from "@/lib/races";
import { raceDistanceKm, reviewPageSize } from "@/lib/race-reviews";
import { OwnRaceReviewCard } from "@/components/own-race-review-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "投稿した大会の体験", robots: { index: false, follow: false } };

export default async function MyRaceReviewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = /^\d{1,5}$/.test(params.page ?? "") ? Math.max(1, Number(params.page)) : 1;
  const user = await requireUser(`/me/race-reviews${page > 1 ? `?page=${page}` : ""}`);
  const result = await getUserRaceReviews(user.id, (page - 1) * reviewPageSize);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <Link href="/me" className="text-sm font-bold text-accent">
        マイページへ
      </Link>
      <h1 className="mt-4 text-2xl font-black sm:text-3xl">投稿した大会の体験</h1>
      <p className="mt-3 text-sm leading-7 text-sub">
        次に走る人へ残した経験を、ここから見返したり編集したりできます。この一覧はあなたにだけ表示されます。
      </p>
      {!result.available ? (
        <div role="alert" className="mt-8 rounded-xl border border-line p-6">
          <p>現在、体験を読み込めません。時間をおいて再度お試しください。</p>
          <Link href={`/me/race-reviews?page=${page}`} className="mt-3 inline-block font-bold text-accent underline">
            もう一度読み込む
          </Link>
        </div>
      ) : result.reviews.length ? (
        <div className="mt-8 space-y-5">
          {result.reviews.map((review) => {
            const race = raceBySlug.get(review.raceSlug);
            return (
              <OwnRaceReviewCard
                key={review.id}
                review={review}
                race={race ? { name: race.name, distanceLabel: race.distanceLabel, maxKm: raceDistanceKm(race) } : null}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl bg-cream p-6 sm:p-8">
          <h2 className="font-bold">
            {page > 1 ? "このページには投稿がありません" : "大会の体験はまだ投稿していません"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-sub">
            走った大会のページで、きつかった坂やペースを上げられた場所など、覚えていることを残してみませんか。
          </p>
          <Link href="/races" className="mt-5 inline-flex rounded-lg bg-brand px-5 py-3 text-sm font-bold">
            走った大会をさがす
          </Link>
        </div>
      )}
      {result.available && (
        <nav aria-label="体験一覧のページ送り" className="mt-8 flex items-center justify-between text-sm font-bold">
          {page > 1 ? (
            <Link href={`/me/race-reviews?page=${page - 1}`} className="rounded-lg border border-line px-4 py-3">
              前のページ
            </Link>
          ) : (
            <span />
          )}
          {result.hasMore && (
            <Link href={`/me/race-reviews?page=${page + 1}`} className="rounded-lg border border-line px-4 py-3">
              次のページ
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
