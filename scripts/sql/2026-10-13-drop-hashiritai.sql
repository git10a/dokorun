-- 「走りたい」機能の廃止(2026-10-13)にともない、hashiritai テーブルと保存済みの記録を削除する。
-- アプリのコードはこのテーブルを参照しない版が100%配信になってから適用すること(旧版はまだ読むため)。
-- 適用方法: node scripts/run-sql.mjs scripts/sql/2026-10-13-drop-hashiritai.sql --remote
DROP INDEX IF EXISTS hashiritai_pk;
DROP INDEX IF EXISTS hashiritai_user_spot_unique;
DROP INDEX IF EXISTS hashiritai_spot_idx;
DROP INDEX IF EXISTS hashiritai_user_idx;
DROP TABLE IF EXISTS hashiritai;
