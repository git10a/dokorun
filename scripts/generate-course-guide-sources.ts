import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { haversine } from "../src/lib/gpx";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { stripPrepublishSentences } from "../src/lib/public-description";

type CoverageEntry = {
  slug: string;
  name: string;
  description: string;
  access: string;
  course_type: "loop" | "out_and_back" | "one_way" | "track";
  surface: "asphalt" | "dirt" | "trail" | "mixed" | "track";
  issues: string[];
};
type Station = { name: string; prefecture: string; x: number; y: number; distance: string };
type Photo = { title: string; description: string; url: string; sourceUrl: string; credit: string; license: string; searchQuery?: string };
type ResearchSample = { fraction: number; point: { lat: number; lng: number }; stations: Station[] };
type Research = { slug: string; samples: ResearchSample[] };
type QualitySample = { fraction: number; viablePhoto: boolean; bestPhoto: { photo: Photo; score: number } | null };
type QualityEntry = { slug: string; samples: QualitySample[] };

const coverage = JSON.parse(readFileSync(resolve("data/course-guides/coverage.json"), "utf8")) as { entries: CoverageEntry[] };
const quality = JSON.parse(readFileSync(resolve("data/course-guides/research/quality.json"), "utf8")) as { entries: QualityEntry[] };
const qualityBySlug = new Map(quality.entries.map((entry) => [entry.slug, entry]));
const requested = new Set(process.argv.slice(2));
const curated = new Set(["kamakura-issyu-trail", "teganuma-loop", "yamanote-loop"]);
const surfaceLabels = { asphalt: "舗装路", dirt: "未舗装路", trail: "トレイル", mixed: "舗装・未舗装", track: "トラック" };

function distanceM(station: Station | undefined) {
  return Number(station?.distance.replace(/[^0-9]/g, "")) || Number.POSITIVE_INFINITY;
}

function stationStart(sample: ResearchSample, index: number, routeMode: "loop" | "forward" | "reverse", fallbackName: string) {
  const station = sample.stations[0];
  const stationIsUseful = station && distanceM(station) <= 3_000;
  return {
    id: `start-${index + 1}`,
    name: stationIsUseful ? `${station.name}駅側` : fallbackName,
    badge: stationIsUseful ? "電車でアクセス" : "コース起点",
    destinationLat: stationIsUseful ? Number(station.y) : sample.point.lat,
    destinationLng: stationIsUseful ? Number(station.x) : sample.point.lng,
    routeAnchorLat: sample.point.lat,
    routeAnchorLng: sample.point.lng,
    routeMode,
    accessText: stationIsUseful ? `${station.name}駅からコースまで約${station.distance}` : "登録されているコース起点へ移動",
    facilitiesText: "設備欄と現地案内を出発前に確認してください",
    firstSection: routeMode === "reverse" ? "GPXの終点側から逆向きに走ります。" : "地図とGPXで最初の分岐を確認してから走り始めます。",
  };
}

function startsFor(entry: CoverageEntry, samples: ResearchSample[]) {
  if (entry.course_type === "one_way") return [
    stationStart(samples[0], 0, "forward", "コース始点"),
    stationStart(samples.at(-1)!, 1, "reverse", "コース終点側"),
  ];
  if (entry.course_type === "out_and_back") return [stationStart(samples[0], 0, "forward", "往復コース起点")];
  if (entry.issues.includes("loop_not_closed")) return [stationStart(samples[0], 0, "forward", "登録コース始点")];
  const chosen: ResearchSample[] = [];
  const stationNames = new Set<string>();
  for (const sample of samples) {
    const station = sample.stations[0];
    if (!station || distanceM(station) > 2_500 || stationNames.has(`${station.prefecture}:${station.name}`)) continue;
    chosen.push(sample);
    stationNames.add(`${station.prefecture}:${station.name}`);
    if (chosen.length === 4) break;
  }
  if (!chosen.length) chosen.push(samples[0]);
  return chosen.map((sample, index) => stationStart(sample, index, "loop", "周回コース起点"));
}

function checkpointName(index: number, count: number) {
  if (index === 0) return "スタート周辺";
  if (index === count - 1) return "終盤区間";
  if (index === Math.floor(count / 2)) return "中盤区間";
  return index < count / 2 ? "序盤区間" : "後半区間";
}

for (const entry of coverage.entries) {
  if (curated.has(entry.slug) || (requested.size && !requested.has(entry.slug))) continue;
  const researchPath = resolve("data/course-guides/research", `${entry.slug}.json`);
  const qualityEntry = qualityBySlug.get(entry.slug);
  if (!existsSync(researchPath) || !qualityEntry) continue;
  const research = JSON.parse(readFileSync(researchPath, "utf8")) as Research;
  const routePoints = parseGpxPoints(readFileSync(resolve("data/gpx", `${entry.slug}.gpx`), "utf8"));
  research.samples = research.samples.map((sample) => ({
    ...sample,
    point: routePoints.reduce((closest, point) => haversine(point, sample.point) < haversine(closest, sample.point) ? point : closest, routePoints[0]),
  }));
  const qualitySamples = new Map(qualityEntry.samples.map((sample) => [sample.fraction, sample]));
  const checkpoints = research.samples.map((sample, index) => {
    const qualitySample = qualitySamples.get(sample.fraction);
    const candidate = qualitySample?.viablePhoto ? qualitySample.bestPhoto?.photo : null;
    return {
      id: `section-${index + 1}`,
      name: checkpointName(index, research.samples.length),
      anchorLat: sample.point.lat,
      anchorLng: sample.point.lng,
      description: candidate
        ? candidate.searchQuery
          ? `${entry.name}を示す出典付きの参考写真です。区間の正確な位置写真ではありません。写真の説明: ${candidate.description.slice(0, 120)}`
          : `${checkpointName(index, research.samples.length)}の走路近隣で撮影された写真です。写真の説明: ${candidate.description.slice(0, 140)}`
        : `${checkpointName(index, research.samples.length)}です。写真候補は位置・内容・ライセンスの条件を満たさなかったため、地図と高低図で路面の変化を確認してください。`,
      surfaceLabel: surfaceLabels[entry.surface],
      caution: entry.surface === "trail" ? "天候と足元を確認" : "歩行者と交差点を優先",
      ...(candidate ? { photo: {
        url: candidate.url,
        alt: `${entry.name}の${checkpointName(index, research.samples.length)}付近`,
        caption: candidate.searchQuery ? `${entry.name}の参考写真（区間位置とは一致しない場合があります）` : `${entry.name}の走路近隣で撮影された風景`,
        credit: candidate.credit,
        license: candidate.license,
        sourceUrl: candidate.sourceUrl,
      } } : {}),
    };
  });
  const hero = checkpoints.find((checkpoint) => "photo" in checkpoint) ?? checkpoints[0];
  const natureCourse = entry.surface === "trail" || entry.surface === "dirt" || entry.surface === "mixed";
  const source = {
    slug: entry.slug,
    heroCheckpointId: hero.id,
    checkpointsTitle: "コースの雰囲気",
    intro: stripPrepublishSentences(entry.description),
    warnings: [
      {
        title: natureCourse ? "天候と現地の通行情報を確認してください" : "一般利用者と交通ルールを優先してください",
        body: natureCourse
          ? "自然路は天候や季節で路面・通行状況が変わります。最新の警報、現地の規制、日没時刻を確認し、無理のない装備と計画で利用してください。"
          : "ランニング専用路ではない区間を含む場合があります。信号を守り、歩道・公園・河川敷では歩行者を優先し、混雑時は歩いて通過してください。",
        url: natureCourse ? "https://www.env.go.jp/nature/nationalparks/pick-up/long-trail/beginner/" : "https://www.npa.go.jp/bureau/traffic/koutsuuannzennjyouhou.html",
        linkLabel: natureCourse ? "環境省の自然歩道初心者ガイド" : "警察庁の交通安全情報",
      },
      ...(entry.issues.includes("loop_not_closed") ? [{
        title: "登録GPXの始点と終点が離れています",
        body: "周回表記ですが、現在の登録GPXは始点まで戻り切らない形です。ダウンロードしたGPXの終点から始点までの移動経路は、現地の通行案内を確認してください。",
        url: "https://dokorun.com/guide/gpx",
        linkLabel: "GPXの使い方と注意点",
      }] : []),
      {
        title: "コースデータは出発前にも確認してください",
        body: `アクセス情報: ${entry.access} 工事や災害、施設の営業時間などは変わるため、現地案内を優先してください。`,
        url: "https://dokorun.com/guide/gpx",
        linkLabel: "どこランのGPX利用ガイド",
      },
    ],
    startPoints: startsFor(entry, research.samples),
    checkpoints,
    dataProvenance: {
      stations: "HeartRails Express",
      photos: "Wikimedia Commons geotagged media",
      status: qualityEntry.samples.every((sample) => sample.viablePhoto) ? "automated_review_passed" : "partial_photo_coverage",
    },
  };
  writeFileSync(resolve("data/course-guides", `${entry.slug}.json`), `${JSON.stringify(source, null, 2)}\n`);
  console.log(`${entry.slug}: 始点${source.startPoints.length}・区間${checkpoints.length}・写真${checkpoints.filter((checkpoint) => "photo" in checkpoint).length}`);
}
