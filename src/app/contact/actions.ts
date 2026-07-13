"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { feedback } from "@/db/schema";
import { verifyTurnstileToken } from "@/lib/turnstile";

export type FeedbackState = { status?: "sent" | "error"; message?: string };

const schema = z.object({
  category: z.enum(["spot_request", "contact"]),
  message: z.string().trim().min(1).max(2000),
  contact: z.string().trim().max(200).optional(),
  website: z.string().optional(), // ハニーポット(人間には見えない欄)
  "cf-turnstile-response": z.string().max(2048).optional(),
});

export async function submitFeedback(_: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "入力内容を確認してください(本文は1〜2000文字です)" };
  if (parsed.data.website) return { status: "sent" }; // botは保存せず成功扱い
  const secretKey = process.env.TURNSTILE_SECRET_KEY
    ?? (process.env.NODE_ENV === "production" ? "" : "1x0000000000000000000000000000000AA");
  const requestHeaders = await headers();
  const isProduction = process.env.NODE_ENV === "production";
  const verified = await verifyTurnstileToken({
    token: parsed.data["cf-turnstile-response"] ?? "",
    secretKey,
    remoteIp: requestHeaders.get("cf-connecting-ip") ?? undefined,
    expectedAction: isProduction ? "contact" : undefined,
    allowedHostnames: isProduction ? ["dokorun.com", "www.dokorun.com"] : undefined,
  });
  if (!verified) return { status: "error", message: "セキュリティ確認に失敗しました。もう一度お試しください" };
  try {
    await getDb().insert(feedback).values({ category: parsed.data.category, message: parsed.data.message, contact: parsed.data.contact || null });
  } catch {
    return { status: "error", message: "送信できませんでした。時間をおいて再度お試しください" };
  }
  return { status: "sent" };
}
