import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "@/lib/turnstile";

describe("verifyTurnstileToken", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts a successful response with the expected action and hostname", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, action: "contact", hostname: "dokorun.com" }))));
    await expect(verifyTurnstileToken({ token: "valid", secretKey: "secret", expectedAction: "contact", allowedHostnames: ["dokorun.com"] })).resolves.toBe(true);
  });

  it("rejects failed, mismatched, or missing tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, action: "login", hostname: "example.com" })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(verifyTurnstileToken({ token: "", secretKey: "secret" })).resolves.toBe(false);
    await expect(verifyTurnstileToken({ token: "valid", secretKey: "secret", expectedAction: "contact" })).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
