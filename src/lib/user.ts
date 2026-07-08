import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuth } from "@/lib/better-auth";

export async function getUser() {
  const session = await createAuth().api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser(callbackURL = "/me") {
  const user = await getUser();
  if (!user) redirect(`/login?callbackURL=${encodeURIComponent(callbackURL)}`);
  return user;
}
