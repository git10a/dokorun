import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAdmin } from "@/lib/auth";

const allowedTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const maxSizeInBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const publicBase = process.env.R2_PUBLIC_URL;
  if (!publicBase) return NextResponse.json({ error: "画像アップロードは設定されていません" }, { status: 503 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
  const extension = allowedTypes[file.type];
  if (!extension) return NextResponse.json({ error: "JPEG・PNG・WebPのみアップロードできます" }, { status: 400 });
  if (file.size > maxSizeInBytes) return NextResponse.json({ error: "10MB以下の画像を指定してください" }, { status: 400 });
  try {
    const key = `spots/${crypto.randomUUID()}.${extension}`;
    const { env } = getCloudflareContext();
    // R2は現在wrangler.jsonc未バインディング(未有効化)。有効化時はIMAGE_BUCKETがCloudflareEnvに現れる
    const bucket = (env as CloudflareEnv & { IMAGE_BUCKET: R2Bucket }).IMAGE_BUCKET;
    await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    return NextResponse.json({ url: `${publicBase.replace(/\/+$/, "")}/${key}` });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "アップロードできませんでした" }, { status: 400 }); }
}
