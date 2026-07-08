-- 詳細ページのCPU削減用: 簡略化済みコース座標の前計算カラム
-- 適用後に `npm run gpx:backfill` で既存行を埋める
ALTER TABLE courses ADD COLUMN IF NOT EXISTS geojson_simplified jsonb;
