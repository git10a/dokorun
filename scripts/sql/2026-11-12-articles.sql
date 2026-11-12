-- Additive migration. Apply to the target DB before deploying the article CMS (/admin/stories, /stories/{slug}).
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  race_slug TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT NOT NULL,
  speakers TEXT,
  author TEXT NOT NULL DEFAULT 'どこラン編集部',
  cover_image_url TEXT,
  seo_title TEXT,
  description TEXT NOT NULL,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at INTEGER,
  preview_token TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS articles_slug ON articles(slug);
CREATE UNIQUE INDEX IF NOT EXISTS articles_preview_token ON articles(preview_token);
CREATE INDEX IF NOT EXISTS articles_race_status ON articles(race_slug, status, published_at);
