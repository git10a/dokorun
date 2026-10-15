import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublishedSpotIdBySlug = vi.fn();
const getUserSpotState = vi.fn();
const getUser = vi.fn();

vi.mock("@/db/data", () => ({ getPublishedSpotIdBySlug, getUserSpotState }));
vi.mock("@/lib/user", () => ({ getUser }));

const { GET } = await import("@/app/api/spots/[slug]/viewer-state/route");

const url = "https://dokorun.com/api/spots/inokashira/viewer-state";
const params = (slug = "inokashira") => ({ params: Promise.resolve({ slug }) });
const signedIn = { headers: { cookie: "__Secure-dokorun.session_token=token" } };

describe("spot viewer-state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("answers logged-out without touching D1 when no session cookie is sent", async () => {
    const response = await GET(new Request(url), params());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ loggedIn: false, isFavorite: false, todayRunId: null });
    expect(getPublishedSpotIdBySlug).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("returns the viewer's state when signed in", async () => {
    getPublishedSpotIdBySlug.mockResolvedValue("spot-1");
    getUser.mockResolvedValue({ id: "user-1" });
    getUserSpotState.mockResolvedValue({ isFavorite: true, todayRunId: "run-1" });
    const response = await GET(new Request(url, signedIn), params());
    expect(await response.json()).toEqual({ loggedIn: true, isFavorite: true, todayRunId: "run-1" });
    expect(getUserSpotState).toHaveBeenCalledWith("spot-1", "user-1");
  });

  it("treats an expired session cookie as logged out", async () => {
    getPublishedSpotIdBySlug.mockResolvedValue("spot-1");
    getUser.mockResolvedValue(null);
    const response = await GET(new Request(url, signedIn), params());
    expect(await response.json()).toEqual({ loggedIn: false, isFavorite: false, todayRunId: null });
    expect(getUserSpotState).not.toHaveBeenCalled();
  });

  it("keeps 404 for unknown spots when signed in", async () => {
    getPublishedSpotIdBySlug.mockResolvedValue(null);
    getUser.mockResolvedValue({ id: "user-1" });
    const response = await GET(new Request(url, signedIn), params("missing"));
    expect(response.status).toBe(404);
  });
});
