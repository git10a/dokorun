import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { sessionCookieName, verifySessionToken } from "@/lib/auth";

// Cloudflare Workers(@opennextjs/cloudflare)はNode.jsランタイムのproxy.tsに未対応のため、
// edgeランタイムで動くmiddleware.tsを使う(Next 16では非推奨だが動作する)。
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/me")) {
    if (getSessionCookie(request, { cookiePrefix: "dokorun" })) return NextResponse.next();
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackURL", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const valid = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);
  if (valid) return NextResponse.next();
  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/me/:path*", "/admin/:path*", "/api/gpx/:path*", "/api/upload/:path*"] };
