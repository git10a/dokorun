import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { sessionCookieName, verifySessionToken } from "@/lib/auth";

// Cloudflare Workers(@opennextjs/cloudflare)はNode.jsランタイムのproxy.tsに未対応のため、
// edgeランタイムで動くmiddleware.tsを使う(Next 16では非推奨だが動作する)。
export async function middleware(request: NextRequest) {
  // www.dokorun.comがcustom_domainとしてdokorun.comと並行稼働しており、
  // リダイレクトがないと同一コンテンツが2ホストで見えてGSCの重複判定を招くため301で正規化する
  if (request.nextUrl.hostname === "www.dokorun.com") {
    const canonical = new URL(request.url);
    canonical.hostname = "dokorun.com";
    return NextResponse.redirect(canonical, 301);
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/me")) {
    if (getSessionCookie(request, { cookiePrefix: "dokorun" })) return NextResponse.next();
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackURL", pathname);
    return NextResponse.redirect(login);
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/upload")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const valid = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);
    if (valid) return NextResponse.next();
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
