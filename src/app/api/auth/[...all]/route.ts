import { createAuth } from "@/lib/better-auth";

export async function GET(request: Request) {
  return createAuth().handler(request);
}

export async function POST(request: Request) {
  return createAuth().handler(request);
}
