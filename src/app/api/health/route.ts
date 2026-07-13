import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

function versionMetadata() {
  try {
    return getCloudflareContext().env.CF_VERSION_METADATA;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const startedAt = Date.now();
  const version = versionMetadata();
  try {
    await getDb().run(sql`SELECT 1`);
    return NextResponse.json({
      ok: true,
      database: "ok",
      version: version ? { id: version.id, tag: version.tag } : null,
      durationMs: Date.now() - startedAt,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(JSON.stringify({
      event: "health_check_failed",
      versionId: version?.id,
      versionTag: version?.tag,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    }));
    return NextResponse.json({
      ok: false,
      database: "error",
      version: version ? { id: version.id, tag: version.tag } : null,
      durationMs: Date.now() - startedAt,
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
