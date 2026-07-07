import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { events } from "@/db/schema";

const bodySchema = z.object({
  name: z.string().regex(/^[a-z0-9_]{1,40}$/),
  path: z.string().max(300).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

// 計測エンドポイント。失敗してもクライアントに影響させないため常に204を返す
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (parsed.success) {
    const meta = parsed.data.meta && JSON.stringify(parsed.data.meta).length <= 1000 ? parsed.data.meta : null;
    try {
      await getDb().insert(events).values({ name: parsed.data.name, path: parsed.data.path ?? null, meta });
    } catch {
      // 書き込み失敗は握りつぶす
    }
  }
  return new NextResponse(null, { status: 204 });
}
