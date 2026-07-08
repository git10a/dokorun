-- プリセットアバター(avatarKey)廃止の仕上げ。2026-07-08-profile-unify-avatar.sql の後に適用する。
-- 適用方法: node scripts/run-sql.mjs scripts/sql/2026-07-08-drop-avatar-key.sql

alter table users drop column if exists avatar_key;
