import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
export async function fixtureDb() {
  const client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('drizzle/0000_init.sql','utf8'));
  await client.executeMultiple(readFileSync('drizzle/0001_charming_micromacro.sql','utf8'));
  await client.executeMultiple(readFileSync('scripts/sql/2026-10-12-race-reviews.sql','utf8'));
  await client.executeMultiple(readFileSync('scripts/sql/2026-10-12-privacy.sql','utf8'));
  await client.execute('PRAGMA foreign_keys=ON');
  return client;
}
export function d1Client(client) {
  const statement = (sql,args=[]) => ({
    sql,args,
    bind(...values) { return statement(sql,values); },
    async all() { const result=await client.execute({sql,args});return { results: result.rows }; },
    async first() { return (await client.execute({sql,args})).rows[0] ?? null; },
    async run() { return client.execute({sql,args}); },
  });
  return { prepare: statement, batch: (queries) => client.batch(queries.map(({sql,args})=>({sql,args})), 'write') };
}
export async function seedSpot(client) {
  await client.execute("INSERT INTO spots(id,slug,name,name_kana,prefecture,city,lat,lng,description,is_published) VALUES ('spot','test-course','Test','test','東京都','千代田区',35,139,'Public',1),('hidden','hidden','Hidden','hidden','東京都','千代田区',35,139,'Private draft',0)");
  await client.execute("INSERT INTO courses(id,spot_id,distance_m,course_type,surface) VALUES ('course','spot',5000,'loop','asphalt'),('hidden-course','hidden',5000,'loop','asphalt')");
}
