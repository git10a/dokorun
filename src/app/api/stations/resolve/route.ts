import { NextResponse } from "next/server";
import { parseStationQuery, summarizeStationRecords, type StationRecord } from "@/lib/station-search";

type HeartRailsResponse = { response?: { station?: StationRecord[]; error?: string } };

export async function GET(request: Request) {
  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const { name, prefecture } = parseStationQuery(rawQuery);
  if (name.length < 1 || name.length > 30) return NextResponse.json({ error: "駅名を入力してください。" }, { status: 400 });

  const params = new URLSearchParams({ method: "getStations", name });
  if (prefecture) params.set("prefecture", prefecture);
  try {
    const response = await fetch(`https://express.heartrails.com/api/json?${params}`, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`station api: ${response.status}`);
    const data = await response.json() as HeartRailsResponse;
    const result = summarizeStationRecords(data.response?.station ?? [], prefecture);
    if (result.status === "not_found") return NextResponse.json({ error: "駅が見つかりませんでした。駅名を確認してください。" }, { status: 404 });
    if (result.status === "ambiguous") {
      return NextResponse.json({ error: `同じ駅名が複数あります。都道府県も入力してください（${result.prefectures.join("・")}）。` }, { status: 409 });
    }
    return NextResponse.json(result.station, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "駅を調べられませんでした。時間をおいてもう一度お試しください。" }, { status: 502 });
  }
}
