import { getDb } from "@/db";
import { events } from "@/db/schema";
import { analyticsEventNames, analyticsPath, sanitizeAnalyticsMeta } from "@/lib/analytics-privacy";

export async function POST(request: Request) {
  // Only bounded, explicitly selected fields are persisted. Never store arbitrary metadata.
  const reader = request.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (!reader) return new Response(null, { status: 204 });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return new Response(null, { status: 204 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (body && analyticsEventNames.has(body.name)) {
      await getDb().insert(events).values({ name: body.name, path: analyticsPath(body.path), meta: sanitizeAnalyticsMeta(body.meta) });
    }
  } catch { /* Metrics must not affect the primary action. Do not log submitted data. */ }
  return new Response(null, { status: 204 });
}
