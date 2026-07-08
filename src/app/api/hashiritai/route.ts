import { NextResponse } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { hashiritai, spots } from "@/db/schema";
import { getUser } from "@/lib/user";

const bodySchema = z.object({
  slug: z.string().min(1).max(120),
  clientId: z.string().uuid(),
  on: z.boolean(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { slug, clientId, on } = parsed.data;
  const [db, user] = [getDb(), await getUser()];
  const spot = await db.select({ id: spots.id }).from(spots).where(and(eq(spots.slug, slug), eq(spots.isPublished, true))).limit(1);
  if (!spot[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user) {
    if (on) {
      await db.delete(hashiritai).where(and(eq(hashiritai.clientId, clientId), eq(hashiritai.spotId, spot[0].id), isNull(hashiritai.userId)));
      await db.insert(hashiritai).values({ clientId, userId: user.id, spotId: spot[0].id }).onConflictDoNothing();
    } else {
      await db.delete(hashiritai).where(and(eq(hashiritai.userId, user.id), eq(hashiritai.spotId, spot[0].id)));
    }
  } else if (on) {
    await db.insert(hashiritai).values({ clientId, spotId: spot[0].id }).onConflictDoNothing();
  } else {
    await db.delete(hashiritai).where(and(eq(hashiritai.clientId, clientId), eq(hashiritai.spotId, spot[0].id)));
  }
  const total = await db.select({ count: count() }).from(hashiritai).where(eq(hashiritai.spotId, spot[0].id));
  return NextResponse.json({ count: total[0]?.count ?? 0 });
}
