-- Additive first. Do not erase content or credentials until the new application is live.
CREATE TABLE IF NOT EXISTS photo_deletions (
  key TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TRIGGER IF NOT EXISTS queue_deleted_run_photo AFTER DELETE ON run_photos BEGIN
  INSERT OR IGNORE INTO photo_deletions(key) VALUES (OLD.key);
END;
CREATE TRIGGER IF NOT EXISTS queue_replaced_run_photo AFTER UPDATE OF key ON run_photos
WHEN OLD.key != NEW.key BEGIN
  INSERT OR IGNORE INTO photo_deletions(key) VALUES (OLD.key);
END;
CREATE TABLE IF NOT EXISTS event_daily_counts (
  day TEXT NOT NULL,
  name TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY(day, name)
);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events(created_at);
CREATE TABLE IF NOT EXISTS privacy_maintenance (
  id TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
