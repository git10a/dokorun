import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { parseGpx } from "@/lib/gpx";

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".gpx") || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "10MB以下のGPXファイルを選択してください" }, { status: 400 });
  try { return NextResponse.json(parseGpx(await file.text())); }
  catch { return NextResponse.json({ error: "GPXファイルを解析できませんでした" }, { status: 400 }); }
}
