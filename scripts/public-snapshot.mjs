// Only explicitly public catalog fields may leave production for a build.
export const publicTables = {
  spots:
    "id slug name name_kana prefecture city lat lng description access has_toilet has_water_fountain has_vending_machine has_locker has_shower has_sento_nearby has_parking has_convenience_store night_lighting track_usage is_published created_at updated_at",
  courses:
    "id spot_id name is_primary geojson geojson_simplified distance_m elevation_gain_m course_type surface signals_count created_at",
  tags: "id slug name category sort_order",
  spot_tags: "spot_id tag_id",
  photos: "id spot_id url caption sort_order",
  communities:
    "id name description schedule instagram x_handle strava website logo_url is_published created_at updated_at",
  spot_communities: "spot_id community_id",
};
export function publicQuery(table, offset = 0) {
  if (!Object.hasOwn(publicTables, table) || !Number.isSafeInteger(offset) || offset < 0)
    throw new Error("Invalid public export");
  const fields = publicTables[table]
    .split(" ")
    .map((column) => `${table}.${column}`)
    .join(", ");
  const publishedSpot = "spot_id IN (SELECT id FROM spots WHERE is_published = 1)";
  const condition =
    table === "spots" || table === "communities"
      ? "is_published = 1"
      : table === "tags"
        ? "1 = 1"
        : table === "spot_communities"
          ? `${publishedSpot} AND community_id IN (SELECT id FROM communities WHERE is_published = 1)`
          : publishedSpot;
  return `SELECT ${fields} FROM ${table} WHERE ${condition} ORDER BY ${table === "spot_tags" ? "spot_id, tag_id" : table === "spot_communities" ? "spot_id, community_id" : "id"} LIMIT 200 OFFSET ${offset}`;
}
export async function fillPublicSnapshot(client, query) {
  // Table/index DDL contains no row values. User tables remain empty, allowing SSR schema checks.
  const schema = await query(
    "SELECT sql FROM sqlite_master WHERE type IN ('table', 'index') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END",
  );
  await client.execute("PRAGMA foreign_keys=OFF");
  for (const row of schema) await client.execute(row.sql);
  for (const [table, fieldList] of Object.entries(publicTables)) {
    const fields = fieldList.split(" ");
    for (let offset = 0; ; offset += 200) {
      const rows = await query(publicQuery(table, offset));
      if (rows.length)
        await client.batch(
          rows.map((row) => ({
            sql: `INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
            args: fields.map((field) => row[field] ?? null),
          })),
          "write",
        );
      if (rows.length < 200) break;
    }
  }
  return Number((await client.execute("SELECT count(*) AS n FROM spots")).rows[0].n);
}
