import { analyticsPath, sanitizeAnalyticsMeta } from "./analytics-privacy";
const VISITOR_ID_KEY = "dokorun:visitor-id";
const SESSION_ID_KEY = "dokorun:session-id";
const INTERNAL_TRAFFIC_KEY = "dokorun:internal-traffic";

function storedId(storage: Storage, key: string) {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}

function measurementContext() {
  try {
    const query = new URLSearchParams(window.location.search);
    const internalParam = query.get("dokorun_internal");
    if (internalParam === "1") localStorage.setItem(INTERNAL_TRAFFIC_KEY, "1");
    if (internalParam === "0") localStorage.removeItem(INTERNAL_TRAFFIC_KEY);
    const created = Number(localStorage.getItem("dokorun:visitor-created"));
    if (!created || Date.now() - created > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(VISITOR_ID_KEY);
      localStorage.setItem("dokorun:visitor-created", String(Date.now()));
    }
    const referrerHost = document.referrer ? new URL(document.referrer).hostname : undefined;
    return {
      visitorId: storedId(localStorage, VISITOR_ID_KEY),
      sessionId: storedId(sessionStorage, SESSION_ID_KEY),
      internal: localStorage.getItem(INTERNAL_TRAFFIC_KEY) === "1",
      referrerHost,
      utmSource: query.get("utm_source")?.slice(0, 80) || undefined,
      utmMedium: query.get("utm_medium")?.slice(0, 80) || undefined,
    };
  } catch {
    return {};
  }
}

export function track(name: string, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      name,
      path: analyticsPath(window.location.pathname),
      meta: sanitizeAnalyticsMeta({ ...meta, ...measurementContext() }),
    });
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 計測失敗はユーザー体験に影響させない
  }
}
