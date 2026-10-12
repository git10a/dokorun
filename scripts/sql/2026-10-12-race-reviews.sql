-- Additive migration. Apply to the verified target DB before deploying the review UI.
CREATE TABLE IF NOT EXISTS race_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  race_slug TEXT NOT NULL,
  race_year INTEGER NOT NULL CHECK (race_year BETWEEN 1900 AND 2200),
  finish_time_s INTEGER NOT NULL CHECK (finish_time_s BETWEEN 1200 AND 86400),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1500),
  distance_km REAL CHECK (distance_km IS NULL OR distance_km BETWEEN 0 AND 42.195),
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS race_reviews_user_race_year ON race_reviews(user_id, race_slug, race_year);
CREATE INDEX IF NOT EXISTS race_reviews_public_time ON race_reviews(race_slug, is_hidden, finish_time_s, created_at);
CREATE INDEX IF NOT EXISTS race_reviews_public_recent ON race_reviews(race_slug, is_hidden, created_at, id);
CREATE TABLE IF NOT EXISTS race_review_reports (
  review_id TEXT NOT NULL REFERENCES race_reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (review_id, user_id)
);
