import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { LineString, TrackUsage } from "@/lib/types";

// D1(SQLite)にはenum型がないため、text({enum})でアプリ層の型を担保する
export const courseTypes = ["loop", "out_and_back", "one_way", "track"] as const;
export const surfaces = ["asphalt", "dirt", "track", "trail", "mixed"] as const;
export const lightings = ["bright", "partial", "dark"] as const;
export const tagCategories = ["terrain", "environment", "scenery"] as const;
export const runVisibilities = ["public", "private"] as const;

// 共通ヘルパ: UUID主キーとUNIXミリ秒タイムスタンプ
// (drizzleのtimestamp_msモード。DBデフォルトは秒精度だがアプリ経由の挿入はms)
const uuidPk = (name: string) => text(name).primaryKey().$defaultFn(() => crypto.randomUUID());
const timestampMs = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdNow = (name: string) => timestampMs(name).notNull().default(sql`(unixepoch() * 1000)`);
const bool = (name: string) => integer(name, { mode: "boolean" });

export const spots = sqliteTable("spots", {
  id: uuidPk("id"),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameKana: text("name_kana").notNull(),
  prefecture: text("prefecture").notNull(),
  city: text("city").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  description: text("description").notNull(),
  access: text("access"),
  hasToilet: bool("has_toilet").notNull().default(false),
  hasWaterFountain: bool("has_water_fountain").notNull().default(false),
  hasVendingMachine: bool("has_vending_machine").notNull().default(false),
  hasLocker: bool("has_locker").notNull().default(false),
  hasShower: bool("has_shower").notNull().default(false),
  hasSentoNearby: bool("has_sento_nearby").notNull().default(false),
  hasParking: bool("has_parking").notNull().default(false),
  hasConvenienceStore: bool("has_convenience_store").notNull().default(false),
  nightLighting: text("night_lighting", { enum: lightings }),
  trackUsage: text("track_usage", { mode: "json" }).$type<TrackUsage | null>(),
  isPublished: bool("is_published").notNull().default(true),
  createdAt: createdNow("created_at"),
  updatedAt: createdNow("updated_at"),
}, (t) => [index("spots_prefecture_idx").on(t.prefecture)]);

export const courses = sqliteTable("courses", {
  id: uuidPk("id"),
  spotId: text("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("代表コース"),
  isPrimary: bool("is_primary").notNull().default(true),
  geojson: text("geojson", { mode: "json" }).$type<LineString | null>(),
  geojsonSimplified: text("geojson_simplified", { mode: "json" }).$type<LineString | null>(),
  distanceM: integer("distance_m").notNull(),
  elevationGainM: integer("elevation_gain_m"),
  courseType: text("course_type", { enum: courseTypes }).notNull(),
  surface: text("surface", { enum: surfaces }).notNull(),
  signalsCount: integer("signals_count"),
  createdAt: createdNow("created_at"),
});

export const tags = sqliteTable("tags", {
  id: uuidPk("id"),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category", { enum: tagCategories }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const spotTags = sqliteTable("spot_tags", {
  spotId: text("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("spot_tags_pk").on(t.spotId, t.tagId)]);

export const photos = sqliteTable("photos", {
  id: uuidPk("id"),
  spotId: text("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const users = sqliteTable("users", {
  id: uuidPk("id"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: bool("email_verified").notNull().default(false),
  image: text("image"),
  handle: text("handle").notNull().unique(),
  bio: text("bio"),
  customAvatarAt: timestampMs("custom_avatar_at"),
  instagram: text("instagram"),
  xHandle: text("x_handle"),
  strava: text("strava"),
  runningSinceYear: integer("running_since_year"),
  runningSinceMonth: integer("running_since_month"),
  createdAt: createdNow("created_at"),
  updatedAt: createdNow("updated_at"),
});

export const userAvatars = sqliteTable("user_avatars", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  contentType: text("content_type").notNull(),
  updatedAt: createdNow("updated_at"),
});

export const userPbs = sqliteTable("user_pbs", {
  id: uuidPk("id"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  timeS: integer("time_s").notNull(),
  competitionName: text("competition_name"),
  createdAt: createdNow("created_at"),
  updatedAt: createdNow("updated_at"),
}, (t) => [uniqueIndex("user_pbs_user_event_unique").on(t.userId, t.event)]);

export const favoriteSpots = sqliteTable("favorite_spots", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  spotId: text("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  createdAt: createdNow("created_at"),
}, (t) => [
  uniqueIndex("favorite_spots_pk").on(t.userId, t.spotId),
  index("favorite_spots_spot_idx").on(t.spotId),
]);

export const runDays = sqliteTable("run_days", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  day: text("day").notNull(), // YYYY-MM-DD (JST基準の日付文字列)
  source: text("source").notNull().default("checkin"),
  createdAt: createdNow("created_at"),
}, (t) => [uniqueIndex("run_days_pk").on(t.userId, t.day)]);

export const sessions = sqliteTable("sessions", {
  id: uuidPk("id"),
  expiresAt: timestampMs("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdNow("created_at"),
  updatedAt: createdNow("updated_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const accounts = sqliteTable("accounts", {
  id: uuidPk("id"),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestampMs("access_token_expires_at"),
  refreshTokenExpiresAt: timestampMs("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdNow("created_at"),
  updatedAt: createdNow("updated_at"),
}, (t) => [index("accounts_user_idx").on(t.userId)]);

export const verifications = sqliteTable("verifications", {
  id: uuidPk("id"),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestampMs("expires_at").notNull(),
  createdAt: timestampMs("created_at").default(sql`(unixepoch() * 1000)`),
  updatedAt: timestampMs("updated_at").default(sql`(unixepoch() * 1000)`),
}, (t) => [index("verifications_identifier_idx").on(t.identifier)]);

export const runs = sqliteTable("runs", {
  id: uuidPk("id"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  spotId: text("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  ranAt: timestampMs("ran_at").notNull(),
  distanceM: integer("distance_m"),
  durationS: integer("duration_s"),
  comment: text("comment"),
  visibility: text("visibility", { enum: runVisibilities }).notNull().default("public"),
  createdAt: createdNow("created_at"),
  updatedAt: createdNow("updated_at"),
}, (t) => [
  index("runs_spot_idx").on(t.spotId),
  index("runs_user_idx").on(t.userId),
  // sqlite-coreのindexは.desc()未対応。昇順indexでも降順スキャンに使われる
  index("runs_ran_at_idx").on(t.ranAt),
]);

// ランログの写真はスポット写真と分け、将来的な複数枚対応もできるようにする。
// 現在のUIは1投稿1枚なので run_id をユニークにしている。
export const runPhotos = sqliteTable("run_photos", {
  id: uuidPk("id"),
  runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  createdAt: createdNow("created_at"),
}, (t) => [uniqueIndex("run_photos_run_unique").on(t.runId)]);

// ログイン不要のハシリタイ。clientId はブラウザごとに localStorage で発行する匿名ID
export const hashiritai = sqliteTable("hashiritai", {
  clientId: text("client_id").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  spotId: text("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  createdAt: createdNow("created_at"),
}, (t) => [
  uniqueIndex("hashiritai_pk").on(t.clientId, t.spotId),
  uniqueIndex("hashiritai_user_spot_unique").on(t.userId, t.spotId).where(sql`${t.userId} is not null`),
  index("hashiritai_spot_idx").on(t.spotId),
  index("hashiritai_user_idx").on(t.userId),
]);

// この場所で活動しているランニングコミュニティ。プロフィールは薄く保ち、鮮度は外部リンク先に委ねる
export const communities = sqliteTable("communities", {
  id: uuidPk("id"),
  name: text("name").notNull(),
  description: text("description").notNull(),
  schedule: text("schedule"),
  instagram: text("instagram"),
  xHandle: text("x_handle"),
  strava: text("strava"), // Stravaクラブのslug(個人のathletesではなくclubs)
  website: text("website"),
  logoUrl: text("logo_url"), // R2(/api/upload)にアップロードしたロゴの公開URL
  isPublished: bool("is_published").notNull().default(true),
  createdAt: createdNow("created_at"),
  updatedAt: createdNow("updated_at"),
});

export const spotCommunities = sqliteTable("spot_communities", {
  spotId: text("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
}, (t) => [
  uniqueIndex("spot_communities_pk").on(t.spotId, t.communityId),
  index("spot_communities_community_idx").on(t.communityId),
]);

export const feedback = sqliteTable("feedback", {
  id: uuidPk("id"),
  category: text("category").notNull(), // "spot_request" | "contact"
  message: text("message").notNull(),
  contact: text("contact"),
  createdAt: createdNow("created_at"),
});

export const events = sqliteTable("events", {
  id: uuidPk("id"),
  name: text("name").notNull(),
  path: text("path"),
  meta: text("meta", { mode: "json" }).$type<Record<string, unknown> | null>(),
  createdAt: createdNow("created_at"),
}, (t) => [index("events_name_idx").on(t.name, t.createdAt)]);
