import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { LineString } from "@/lib/types";

export const courseTypeEnum = pgEnum("course_type", ["loop", "out_and_back", "one_way", "track"]);
export const surfaceEnum = pgEnum("surface", ["asphalt", "dirt", "track", "trail", "mixed"]);
export const lightingEnum = pgEnum("lighting", ["bright", "partial", "dark"]);
export const tagCategoryEnum = pgEnum("tag_category", ["terrain", "environment", "scenery"]);

export const spots = pgTable("spots", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameKana: text("name_kana").notNull(),
  prefecture: text("prefecture").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  description: text("description").notNull(),
  access: text("access"),
  hasToilet: boolean("has_toilet").notNull().default(false),
  hasWaterFountain: boolean("has_water_fountain").notNull().default(false),
  hasVendingMachine: boolean("has_vending_machine").notNull().default(false),
  hasLocker: boolean("has_locker").notNull().default(false),
  hasShower: boolean("has_shower").notNull().default(false),
  hasSentoNearby: boolean("has_sento_nearby").notNull().default(false),
  hasParking: boolean("has_parking").notNull().default(false),
  hasConvenienceStore: boolean("has_convenience_store").notNull().default(false),
  nightLighting: lightingEnum("night_lighting"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("spots_prefecture_idx").on(t.prefecture)]);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("代表コース"),
  isPrimary: boolean("is_primary").notNull().default(true),
  geojson: jsonb("geojson").$type<LineString | null>(),
  distanceM: integer("distance_m").notNull(),
  elevationGainM: integer("elevation_gain_m"),
  courseType: courseTypeEnum("course_type").notNull(),
  surface: surfaceEnum("surface").notNull(),
  signalsCount: integer("signals_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: tagCategoryEnum("category").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const spotTags = pgTable("spot_tags", {
  spotId: uuid("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("spot_tags_pk").on(t.spotId, t.tagId)]);

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  spotId: uuid("spot_id").notNull().references(() => spots.id),
  ranAt: timestamp("ran_at").notNull(),
  distanceM: integer("distance_m"),
  durationS: integer("duration_s"),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("runs_spot_idx").on(t.spotId)]);

export const hashiritai = pgTable("hashiritai", {
  userId: uuid("user_id").notNull().references(() => users.id),
  spotId: uuid("spot_id").notNull().references(() => spots.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("hashiritai_pk").on(t.userId, t.spotId)]);
