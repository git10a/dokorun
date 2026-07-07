-- 匿名ハシリタイ(clientId基準)への作り替えと、feedback / events テーブルの追加。
-- hashiritai は書き込み経路が存在しなかったため空テーブル前提で作り直す。
-- drizzle-kit push が user_id -> client_id を対話で確認しようとするため手書きSQLで適用する。
-- 適用方法: node scripts/run-sql.mjs scripts/sql/2026-07-08-hashiritai-feedback-events.sql

drop table if exists hashiritai;
create table hashiritai (
  client_id text not null,
  spot_id uuid not null references spots(id) on delete cascade,
  created_at timestamp not null default now()
);
create unique index hashiritai_pk on hashiritai (client_id, spot_id);
create index hashiritai_spot_idx on hashiritai (spot_id);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  message text not null,
  contact text,
  created_at timestamp not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text,
  meta jsonb,
  created_at timestamp not null default now()
);
create index if not exists events_name_idx on events (name, created_at);
