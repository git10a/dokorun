import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { hashiritai } from "@/db/schema";
import { getUser } from "@/lib/user";

const bodySchema = z.object({ clientId: z.string().uuid() });

export async function POST(request: Request) {
  const [parsed, user] = await Promise.all([bodySchema.safeParseAsync(await request.json().catch(() => null)), getUser()]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const db = getDb();
  const anonymous = await db.select({ spotId: hashiritai.spotId }).from(hashiritai)
    .where(and(eq(hashiritai.clientId, parsed.data.clientId), isNull(hashiritai.userId)));
  let merged = 0;
  for (const row of anonymous) {
    const existing = await db.select({ spotId: hashiritai.spotId }).from(hashiritai)
      .where(and(eq(hashiritai.userId, user.id), eq(hashiritai.spotId, row.spotId))).limit(1);
    if (existing[0]) {
      await db.delete(hashiritai).where(and(eq(hashiritai.clientId, parsed.data.clientId), eq(hashiritai.spotId, row.spotId), isNull(hashiritai.userId)));
    } else {
      try {
        await db.update(hashiritai).set({ userId: user.id }).where(and(eq(hashiritai.clientId, parsed.data.clientId), eq(hashiritai.spotId, row.spotId), isNull(hashiritai.userId)));
        merged += 1;
      } catch {
        await db.delete(hashiritai).where(and(eq(hashiritai.clientId, parsed.data.clientId), eq(hashiritai.spotId, row.spotId), isNull(hashiritai.userId)));
      }
    }
  }
  return NextResponse.json({ merged });
}

