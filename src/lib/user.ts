import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookie } from "better-auth/cookies";
import { createAuth } from "@/lib/better-auth";

export async function getUser() {
  const requestHeaders = await headers();
  // セッションcookieが無い匿名アクセスはbetter-authの初期化・DB照会を丸ごとスキップする
  if (!getSessionCookie(requestHeaders, { cookiePrefix: "dokorun" })) return null;
  const session = await createAuth().api.getSession({ headers: requestHeaders });
  return session?.user ?? null;
}

export async function requireUser(callbackURL = "/me") {
  const user = await getUser();
  if (!user) redirect(`/login?callbackURL=${encodeURIComponent(callbackURL)}`);
  return user;
}
