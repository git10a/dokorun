import Link from "next/link";
import { notFound } from "next/navigation";
import { RunForm } from "@/components/run-form";
import { getSpotCourses, getUserRun } from "@/db/data";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function EditRunPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/me/logs/${id}/edit`);
  const run = await getUserRun(id, user.id);
  if (!run) notFound();
  const courses = await getSpotCourses(run.spotId);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(run.ranAt);
  const returnTo = query.returnTo === "spot" ? "spot" : "me";
  return <div className="mx-auto max-w-2xl px-4 py-10 md:px-6"><Link href={returnTo === "spot" ? `/spots/${run.spotSlug}#dokolog` : "/me/logs"} className="text-sm font-bold text-accent">← {returnTo === "spot" ? `${run.spotName}へ戻る` : "記録一覧へ戻る"}</Link><p className="mt-7 text-sm font-bold text-sub">ドコログ</p><h1 className="mt-1 text-3xl font-black">走った記録を編集</h1><p className="mt-3 text-sub">{run.spotName}</p><RunForm spot={{ id: run.spotId, slug: run.spotSlug, name: run.spotName }} courses={courses} initial={{ id: run.id, ranAt: date, courseId: run.courseId, distanceM: run.distanceM, durationS: run.durationS, comment: run.comment, visibility: run.visibility }} returnTo={returnTo} /></div>;
}
