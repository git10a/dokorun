-- PBに任意の大会名を保存できるようにする。
-- 適用方法: node scripts/run-sql.mjs scripts/sql/2026-07-08-user-pbs-competition-name.sql

alter table user_pbs add column if not exists competition_name text;
