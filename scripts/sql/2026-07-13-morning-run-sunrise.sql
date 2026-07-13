INSERT INTO tags (id, slug, name, category, sort_order)
VALUES ('cd0ce2f1-ab98-44a9-bd22-f12e6af502ee', 'sunrise-view', '日の出がきれい', 'scenery', 95)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  category = excluded.category,
  sort_order = excluded.sort_order;

INSERT OR IGNORE INTO spot_tags (spot_id, tag_id)
SELECT spots.id, tags.id
FROM spots
CROSS JOIN tags
WHERE tags.slug = 'sunrise-view'
  AND spots.slug IN (
    'himi-amaharashi',
    'choshi-inubosaki',
    'aoshima-kisakihama',
    'otsu-kogan-nagisa-park',
    'beppu-kaigan-kamegawa',
    'amami-ayamaru',
    'teganuma-loop'
  );
