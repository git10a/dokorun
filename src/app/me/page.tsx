import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await requireUser("/me");
  let handle = user.handle;
  if (!handle) {
    const rows = await getDb().select({ handle: users.handle }).from(users).where(eq(users.id, user.id)).limit(1);
    handle = rows[0]?.handle;
  }
  if (!handle) throw new Error("handle is required");
  redirect(`/u/${handle}`);
}
