export function track(name: string, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, path: window.location.pathname, meta });
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // 計測失敗はユーザー体験に影響させない
  }
}
