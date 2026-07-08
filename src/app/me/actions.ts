"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/user";

export type ProfileState = { status?: "saved" | "error"; message?: string; errors?: Record<string, string[]> };

const profileSchema = z.object({
  name: z.string().trim().min(1, "表示名を入力してください").max(50, "表示名は50文字までです"),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,29}$/, "3〜30文字の半角英数字・ハイフンで入力してください"),
  bio: z.string().trim().max(300, "自己紹介は300文字までです"),
});

export async function updateProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser("/me");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "入力内容を確認してください", errors: parsed.error.flatten().fieldErrors };
  try {
    await getDb().update(users).set({ name: parsed.data.name, handle: parsed.data.handle, bio: parsed.data.bio || null, updatedAt: new Date() }).where(eq(users.id, user.id));
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) return { status: "error", message: "このハンドルはすでに使われています" };
    return { status: "error", message: "保存できませんでした。時間をおいて再度お試しください" };
  }
  revalidatePath("/me");
  return { status: "saved", message: "プロフィールを保存しました" };
}

