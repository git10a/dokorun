import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { runPhotos, runs } from "@/db/schema";
import { getUser } from "@/lib/user";
import { photoBuckets } from "@/lib/run-photo-storage";
import { runPhotoKeyPattern } from "@/lib/run-photos";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
const missing = () => new Response(null, { status: 404, headers });

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!runPhotoKeyPattern.test(key)) return missing();
  const [photo] = await getDb().select({ ownerId: runs.userId, visibility: runs.visibility })
    .from(runPhotos).innerJoin(runs, eq(runPhotos.runId, runs.id)).where(eq(runPhotos.key, key)).limit(1);
  if (!photo) return missing();
  if (photo.visibility !== "public" && (await getUser())?.id !== photo.ownerId) return missing();
  const buckets = photoBuckets();
  // Auth is checked before either store is read. Legacy fallback is only for migration.
  const object = await buckets.PRIVATE_IMAGE_BUCKET.get(key) ?? await buckets.IMAGE_BUCKET.get(key);
  if (!object) return missing();
  return new Response(object.body, { headers: { ...headers, "Content-Type": "image/webp" } });
}
