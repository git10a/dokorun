import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { z } from "zod";
import { prefectureBounds, prefectures } from "@/lib/prefectures";

const tagSlugs = new Set([
  "no-signals", "flat", "hilly", "dirt-path", "dedicated-lane", "trail", "track", "cross-country",
  "bright-at-night", "shaded", "less-crowded", "water-refill", "waterside", "riverside",
  "park", "scenic", "cherry-blossoms",
]);
const spotSchema = z.object({
  slug: z.string(), prefecture: z.string(), lat: z.number(), lng: z.number(), description: z.string(),
  access: z.string().nullable().optional(), tags: z.array(z.string()), course: z.object({ distanceM: z.number() }),
}).passthrough();
type Spot = z.infer<typeof spotSchema>;
type Issue = { file: string; slug: string; message: string };

function readSpots(filePath: string, errors: Issue[]): Spot[] {
  let json: unknown;
  try { json = JSON.parse(readFileSync(filePath, "utf8")); }
  catch (error) {
    errors.push({ file: filePath, slug: "-", message: `JSONを読み込めません: ${error instanceof Error ? error.message : error}` });
    return [];
  }
  if (!Array.isArray(json)) {
    errors.push({ file: filePath, slug: "-", message: "ルート要素は配列にしてください" });
    return [];
  }
  return json.flatMap((value, index) => {
    const parsed = spotSchema.safeParse(value);
    if (parsed.success) return [parsed.data];
    for (const issue of parsed.error.issues) errors.push({ file: filePath, slug: `#${index + 1}`, message: `[${issue.path.join(".")}] ${issue.message}` });
    return [];
  });
}

function validateSpot(file: string, spot: Spot, errors: Issue[], warnings: Issue[]) {
  const addError = (message: string) => errors.push({ file, slug: spot.slug, message });
  const addWarning = (message: string) => warnings.push({ file, slug: spot.slug, message });
  if (!/^[a-z0-9-]+$/.test(spot.slug)) addError("slugは小文字英数字とハイフンのみ使用できます");
  if (!prefectures.includes(spot.prefecture as (typeof prefectures)[number])) addError(`未知の都道府県です: ${spot.prefecture}`);
  if (spot.lat < 20 || spot.lat > 46 || spot.lng < 122 || spot.lng > 154) addError(`座標が日本国内の範囲外です: ${spot.lat}, ${spot.lng}`);
  else {
    const bounds = prefectureBounds[spot.prefecture as keyof typeof prefectureBounds];
    if (bounds && (spot.lat < bounds.minLat || spot.lat > bounds.maxLat || spot.lng < bounds.minLng || spot.lng > bounds.maxLng)) addError(`座標が${spot.prefecture}の大まかな範囲外です: ${spot.lat}, ${spot.lng}`);
  }
  for (const tag of spot.tags) if (!tagSlugs.has(tag)) addError(`タグマスタにないslugです: ${tag}`);
  if (spot.course.distanceM < 200 || spot.course.distanceM > 100_000) addError(`course.distanceMは200〜100000mにしてください: ${spot.course.distanceM}`);
  const descriptionLength = spot.description.trim().length;
  if (descriptionLength === 0) addError("descriptionが空です");
  else if (descriptionLength < 50) addWarning(`descriptionが短すぎます: ${descriptionLength}文字`);
  else if (descriptionLength > 800) addWarning(`descriptionが長すぎます: ${descriptionLength}文字`);
  const accessLength = spot.access?.trim().length ?? 0;
  if (accessLength === 0) addWarning("accessが空です");
  else if (accessLength < 10) addWarning(`accessが短すぎます: ${accessLength}文字`);
}

function printIssues(title: string, issues: Issue[]) {
  console.log(`\n${title}: ${issues.length}件`);
  for (const issue of issues) console.log(`  ${issue.file.replace(`${process.cwd()}/`, "")} [${issue.slug}] ${issue.message}`);
}

const inputPaths = process.argv.slice(2).filter((arg) => !arg.startsWith("--")).map((file) => resolve(file));
if (!inputPaths.length) {
  console.error("使い方: npm run validate:spots -- data/spots.json [data/spots-2.json ...]");
  process.exit(1);
}
const errors: Issue[] = [];
const warnings: Issue[] = [];
const entries = inputPaths.flatMap((file) => readSpots(file, errors).map((spot) => ({ file, spot })));
for (const { file, spot } of entries) validateSpot(file, spot, errors, warnings);

const duplicateReadErrors: Issue[] = [];
const directories = new Set(inputPaths.map(dirname));
const relatedFiles = [...directories].flatMap((directory) => readdirSync(directory).filter((name) => extname(name) === ".json").map((name) => join(directory, name)));
const occurrences = new Map<string, string[]>();
for (const file of relatedFiles) for (const spot of readSpots(file, duplicateReadErrors)) occurrences.set(spot.slug, [...(occurrences.get(spot.slug) ?? []), file]);
const duplicates = [...occurrences.entries()].filter(([, files]) => files.length > 1).sort(([a], [b]) => a.localeCompare(b));

printIssues("エラー(投入不可)", errors);
printIssues("警告(要目視)", warnings);
console.log(`\nslug重複(情報): ${duplicates.length}件`);
for (const [slug, files] of duplicates) console.log(`  ${slug}: ${files.map((file) => file.replace(`${process.cwd()}/`, "")).join(", ")}`);
console.log(`\n検証対象 ${entries.length}件 / エラー ${errors.length}件 / 警告 ${warnings.length}件`);
process.exitCode = errors.length ? 1 : 0;
