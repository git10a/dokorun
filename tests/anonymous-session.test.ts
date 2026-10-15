import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const sessionUrl = "https://dokorun.com/api/auth/get-session";

describe("anonymous get-session", () => {
  it("answers null without reaching Better Auth when no session cookie is sent", async () => {
    const response = await middleware(new NextRequest(sessionUrl));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toBeNull();
  });

  it("passes signed-in requests through to Better Auth", async () => {
    for (const name of ["dokorun.session_token", "__Secure-dokorun.session_token"]) {
      const response = await middleware(new NextRequest(sessionUrl, { headers: { cookie: `${name}=token` } }));
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("does not answer other auth endpoints", async () => {
    const response = await middleware(
      new NextRequest("https://dokorun.com/api/auth/sign-in/social", { method: "POST" }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
