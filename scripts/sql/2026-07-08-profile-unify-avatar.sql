-- プロフィール統合・アバターアップロード化用のスキーマ変更。
-- avatarKey (プリセットアバター) を廃止し、user_avatars テーブル + customAvatarAt に置き換える。
-- drizzle-kit push はカラム追加+削除を同時に行うとrename対話プロンプトで非対話シェルが失敗するため、
-- 追加(このファイル)→削除(2026-07-08-drop-avatar-key.sql)の2段階で手書きSQL適用する。
-- 適用方法: node scripts/run-sql.mjs scripts/sql/2026-07-08-profile-unify-avatar.sql

alter table users add column if not exists custom_avatar_at timestamp;
alter table users add column if not exists running_since_month integer;

create table if not exists user_avatars (
  user_id uuid primary key references users(id) on delete cascade,
  data text not null,
  content_type text not null,
  updated_at timestamp not null default now()
);
