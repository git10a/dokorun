-- 東京湾の朝焼けを楽しめる2コースと、公式に朝日の名所として確認できる2コースを追加する。
-- 若洲: https://www.tptc.co.jp/park/03_07/point
-- 豊洲: https://toyosugururi.jp/about/
-- 皆生: https://www.yonago-navi.jp/mb/onsen/summary/
-- 観音崎: https://www.pref.kanagawa.jp/documents/70409/01_bosyu_09-2.pdf
INSERT OR IGNORE INTO spot_tags (spot_id, tag_id)
SELECT spots.id, tags.id
FROM spots
CROSS JOIN tags
WHERE tags.slug = 'sunrise-view'
  AND spots.slug IN (
    'wangan-ariake-kasai',
    'toyosu-gururi-park',
    'kaike-onsen-coast',
    'mabori-kaigan-umikaze'
  );
