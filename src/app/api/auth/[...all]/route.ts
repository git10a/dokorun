import { createAuth } from "@/lib/better-auth";

export async function GET(request: Request) {
  const auth = createAuth();
  return auth.handler(request);
}

export async function POST(request: Request) {
  const auth = createAuth();
  return auth.handler(request);
}
