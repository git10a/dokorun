import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { getDb } from ".";
import { courses, spotTags, spots, tags } from "./schema";
import { simplifyCourseGeojson } from "@/lib/course-geojson";
import type { CourseType, Lighting, LineString, Surface } from "@/lib/types";

config({ path: ".env.local" });
config();

const tagSeed = [
  ["no-signals", "信号ゼロ", "terrain"], ["flat", "フラット", "terrain"], ["hilly", "坂練向き", "terrain"],
  ["dirt-path", "土の路面", "terrain"], ["dedicated-lane", "専用レーンあり", "terrain"], ["track", "トラックあり", "terrain"],
  ["cross-country", "クロカンコース", "terrain"], ["bright-at-night", "夜も明るい", "environment"], ["shaded", "木陰が多い", "environment"],
  ["less-crowded", "混みにくい", "environment"], ["water-refill", "給水しやすい", "environment"], ["waterside", "湖畔・水辺", "scenery"],
  ["riverside", "河川敷", "scenery"], ["park", "公園", "scenery"], ["scenic", "景色が良い", "scenery"], ["cherry-blossoms", "桜の名所", "scenery"],
] as const;

function route(lat: number, lng: number, radius = 0.006): LineString {
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= 16; i += 1) {
    const angle = (Math.PI * 2 * i) / 16;
    coordinates.push([lng + Math.cos(angle) * radius, lat + Math.sin(angle) * radius * 0.65]);
  }
  return { type: "LineString", coordinates };
}

type SeedSpot = {
  slug: string; name: string; kana: string; pref: string; city: string; lat: number; lng: number; distanceM: number;
  courseType: CourseType; surface: Surface; signals: number; elevation: number; tagSlugs: string[]; lighting?: Lighting;
  description: string; access: string; facilities: Partial<Record<"hasToilet" | "hasWaterFountain" | "hasVendingMachine" | "hasLocker" | "hasSentoNearby" | "hasParking" | "hasConvenienceStore", boolean>>;
};

const seedSpots: SeedSpot[] = [
  { slug: "kokyo", name: "皇居", kana: "こうきょ", pref: "東京都", city: "千代田区", lat: 35.6825, lng: 139.7521, distanceM: 5000, courseType: "loop", surface: "asphalt", signals: 0, elevation: 30, tagSlugs: ["no-signals", "bright-at-night", "scenic"], lighting: "bright", access: "東京メトロ竹橋駅・半蔵門駅などから徒歩すぐ。周辺にランニングステーション多数。", description: "日本で最もよく知られたランニングコースのひとつ。信号のない約5kmの周回路で、都心にありながら石垣や緑、季節の景色を楽しめます。ランナーは反時計回りで走るのが暗黙のルール。竹橋から半蔵門にかけての上りがほどよい刺激になり、初心者の一周からペース走まで幅広く使えます。", facilities: { hasToilet: true, hasWaterFountain: true, hasLocker: true, hasSentoNearby: true } },
  { slug: "komazawa", name: "駒沢オリンピック公園", kana: "こまざわおりんぴっくこうえん", pref: "東京都", city: "世田谷区", lat: 35.6254, lng: 139.6610, distanceM: 2140, courseType: "loop", surface: "asphalt", signals: 0, elevation: 0, tagSlugs: ["no-signals", "flat", "dedicated-lane"], lighting: "partial", access: "東急田園都市線 駒沢大学駅から徒歩約15分。", description: "公園内に1周2.14kmのジョギングコースが整備された、走りやすさ抜群の定番スポットです。100mごとの距離表示があり、ペースを細かく確認しながら練習できます。信号がなく高低差もほぼないため、初心者のジョギングからテンポ走まで対応。園内にはトイレや給水設備、自動販売機もそろっています。", facilities: { hasToilet: true, hasWaterFountain: true, hasVendingMachine: true } },
  { slug: "yoyogi", name: "代々木公園", kana: "よよぎこうえん", pref: "東京都", city: "渋谷区", lat: 35.6717, lng: 139.6949, distanceM: 1800, courseType: "loop", surface: "asphalt", signals: 0, elevation: 10, tagSlugs: ["park", "shaded", "water-refill"], lighting: "partial", access: "JR原宿駅、東京メトロ代々木公園駅から徒歩約3分。", description: "都心とは思えない豊かな木々に囲まれた公園コースです。中央広場の周囲をつなぐと約1.8kmで、木陰が多いため暑い時期の朝ランにも向いています。信号を気にせず、自分の体調に合わせて距離を調整しやすいのも魅力。隣接する織田フィールドと組み合わせれば、トラック練習の前後にも使えます。", facilities: { hasToilet: true, hasWaterFountain: true, hasVendingMachine: true } },
  { slug: "arakawa", name: "荒川河川敷（赤羽）", kana: "あらかわかせんじき あかばね", pref: "東京都", city: "北区", lat: 35.7794, lng: 139.7196, distanceM: 10000, courseType: "out_and_back", surface: "asphalt", signals: 0, elevation: 0, tagSlugs: ["riverside", "no-signals", "flat"], lighting: "dark", access: "JR赤羽駅から徒歩約20分、または東京メトロ赤羽岩淵駅から徒歩約15分。", description: "広い空と川沿いの景色を楽しみながら、信号なしで長く走れる河川敷コースです。ほぼフラットな舗装路が続き、折り返し位置を変えるだけで距離を自在に設定できます。ロング走や一定ペースの練習に好相性。風の影響を受けやすく、夜は暗い区間が多いため、天候と時間帯を確認して明るいうちに走るのがおすすめです。", facilities: { hasToilet: true, hasVendingMachine: true, hasConvenienceStore: true } },
  { slug: "senbako", name: "千波湖", kana: "せんばこ", pref: "茨城県", city: "水戸市", lat: 36.3719, lng: 140.4587, distanceM: 3000, courseType: "loop", surface: "mixed", signals: 0, elevation: 0, tagSlugs: ["waterside", "flat", "no-signals", "scenic"], lighting: "partial", access: "JR水戸駅南口から徒歩約15分。湖畔に無料駐車場あり。", description: "水戸市中心部にある千波湖をぐるりと巡る、1周ちょうど約3kmの湖畔コースです。高低差がほぼなく信号もないため、距離を数えやすく初心者にも安心。黒鳥や白鳥を眺めながら開放的に走れます。隣接する偕楽園方面へ足を延ばせば、坂や緑を加えたコースにもアレンジできます。", facilities: { hasToilet: true, hasWaterFountain: true, hasVendingMachine: true, hasParking: true } },
  { slug: "oohori", name: "大濠公園", kana: "おおほりこうえん", pref: "福岡県", city: "福岡市中央区", lat: 33.5862, lng: 130.3785, distanceM: 2000, courseType: "loop", surface: "asphalt", signals: 0, elevation: 0, tagSlugs: ["waterside", "flat", "dedicated-lane", "bright-at-night"], lighting: "bright", access: "福岡市地下鉄 大濠公園駅から徒歩約3分。", description: "福岡ランナーの聖地として親しまれる、水辺の1周約2kmコースです。走行部分には足にやさしいゴム舗装が使われ、歩行者や自転車とレーンが分かれているため快適。距離表示もわかりやすく、日々のジョグからスピード練習まで使えます。夜も比較的明るく、仕事帰りのランにも便利です。", facilities: { hasToilet: true, hasWaterFountain: true, hasVendingMachine: true } },
  { slug: "osakajo", name: "大阪城公園", kana: "おおさかじょうこうえん", pref: "大阪府", city: "大阪市中央区", lat: 34.6873, lng: 135.5262, distanceM: 3500, courseType: "loop", surface: "asphalt", signals: 0, elevation: 20, tagSlugs: ["park", "scenic", "cherry-blossoms"], lighting: "partial", access: "JR大阪城公園駅・森ノ宮駅、地下鉄谷町四丁目駅などからアクセス可能。", description: "大阪城の天守閣や石垣を眺めながら走れる、観光気分も味わえる都市型コースです。外周をつなぐと約3.5kmで、園内の道を組み合わせて距離を調整できます。適度な起伏があり、単調になりにくいのも魅力。春は桜の名所としてにぎわうため、混雑を避けるなら早朝のランがおすすめです。", facilities: { hasToilet: true, hasVendingMachine: true, hasLocker: true } },
  { slug: "meijo", name: "名城公園", kana: "めいじょうこうえん", pref: "愛知県", city: "名古屋市北区", lat: 35.1900, lng: 136.9019, distanceM: 1300, courseType: "loop", surface: "asphalt", signals: 0, elevation: 0, tagSlugs: ["park", "flat", "bright-at-night"], lighting: "bright", access: "名古屋市営地下鉄 名城公園駅から徒歩約3分。", description: "名古屋城の北側に広がる公園に整備された、1周約1.3kmのランニングコースです。「トンボリング」の愛称で親しまれ、フラットで距離を重ねやすいのが特徴。木々や芝生の景色を楽しみながら走れ、夜も比較的明るいため日常の練習に便利です。短い周回を生かしたペース走にも向いています。", facilities: { hasToilet: true, hasWaterFountain: true } },
];

async function seed() {
  const db = getDb();
  for (const [sortOrder, [slug, name, category]] of tagSeed.entries()) {
    await db.insert(tags).values({ slug, name, category, sortOrder }).onConflictDoUpdate({ target: tags.slug, set: { name, category, sortOrder } });
  }
  const allTags = await db.select().from(tags);
  for (const item of seedSpots) {
    const [spot] = await db.insert(spots).values({
      slug: item.slug, name: item.name, nameKana: item.kana, prefecture: item.pref, city: item.city,
      lat: item.lat, lng: item.lng, description: item.description, access: item.access,
      nightLighting: item.lighting ?? null, ...item.facilities,
    }).onConflictDoUpdate({ target: spots.slug, set: {
      name: item.name, nameKana: item.kana, prefecture: item.pref, city: item.city, lat: item.lat, lng: item.lng,
      description: item.description, access: item.access, nightLighting: item.lighting ?? null, ...item.facilities, updatedAt: new Date(),
    } }).returning({ id: spots.id });
    await db.delete(courses).where(eq(courses.spotId, spot.id));
    await db.delete(spotTags).where(eq(spotTags.spotId, spot.id));
    const geojson = route(item.lat, item.lng, Math.min(0.012, item.distanceM / 700000));
    await db.insert(courses).values({ spotId: spot.id, geojson, geojsonSimplified: simplifyCourseGeojson(geojson), distanceM: item.distanceM, elevationGainM: item.elevation, courseType: item.courseType, surface: item.surface, signalsCount: item.signals });
    const selected = allTags.filter((tag) => item.tagSlugs.includes(tag.slug));
    if (selected.length) await db.insert(spotTags).values(selected.map((tag) => ({ spotId: spot.id, tagId: tag.id })));
  }
  console.log(`Seeded ${tagSeed.length} tags and ${seedSpots.length} spots.`);
}

seed().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
