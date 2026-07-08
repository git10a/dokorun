import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { userAvatars } from "@/db/schema";

const userIdSchema = z.string().uuid();

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return new NextResponse(null, { status: 404 });
  const rows = await getDb().select({ data: userAvatars.data, contentType: userAvatars.contentType })
    .from(userAvatars).where(eq(userAvatars.userId, parsed.data)).limit(1);
  const row = rows[0];
  if (!row) return new NextResponse(null, { status: 404 });
  const cacheControl = new URL(request.url).searchParams.has("v")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300";
  const bytes = Buffer.from(row.data, "base64");
  return new NextResponse(bytes, { headers: { "Content-Type": row.contentType, "Cache-Control": cacheControl } });
}
