import { getCloudflareContext } from "@opennextjs/cloudflare";

export function photoBuckets() {
  const { env } = getCloudflareContext();
  return env as CloudflareEnv & { PRIVATE_IMAGE_BUCKET: R2Bucket; IMAGE_BUCKET: R2Bucket };
}

export async function storeRunPhoto(file: FormDataEntryValue | null, runId: string) {
  if (!(file instanceof File) || !file.size) return null;
  if (file.type !== "image/webp" || file.size > 2 * 1024 * 1024) throw new Error("写真を処理できませんでした");
  const key = `runs/${runId}/${crypto.randomUUID()}.webp`;
  await photoBuckets().PRIVATE_IMAGE_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: "image/webp", cacheControl: "private, no-store" },
  });
  return key;
}

export async function removeUnattachedRunPhoto(key: string | null) {
  if (key) await photoBuckets().PRIVATE_IMAGE_BUCKET.delete(key);
}
