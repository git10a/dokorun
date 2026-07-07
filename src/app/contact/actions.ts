"use server";

import { z } from "zod";
import { getDb } from "@/db";
import { feedback } from "@/db/schema";

export type FeedbackState = { status?: "sent" | "error"; message?: string };

const schema = z.object({
  category: z.enum(["spot_request", "contact"]),
  message: z.string().trim().min(1).max(2000),
  contact: z.string().trim().max(200).optional(),
  website: z.string().optional(), // ハニーポット(人間には見えない欄)
});

export async function submitFeedback(_: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "入力内容を確認してください(本文は1〜2000文字です)" };
  if (parsed.data.website) return { status: "sent" }; // botは保存せず成功扱い
  try {
    await getDb().insert(feedback).values({ category: parsed.data.category, message: parsed.data.message, contact: parsed.data.contact || null });
  } catch {
    return { status: "error", message: "送信できませんでした。時間をおいて再度お試しください" };
  }
  return { status: "sent" };
}
