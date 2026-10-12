import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRetiredBuilds } from './cache-retention.mjs';
const now = Date.parse('2026-09-08T00:00:00Z');
const id = n => `build${String(n).padStart(16,'0')}`;
const object = (n, age) => ({ key: `incremental-cache/${id(n)}/${'a'.repeat(64)}.cache`, last_modified: new Date(now-age*86400000).toISOString(), size: 100 });
test('protects an old active build and the newest three rollback candidates', () => {
 const groups=selectRetiredBuilds([object(1,100),object(2,90),object(3,80),object(4,70),object(5,60)], [id(1)],now);
 assert.deepEqual(groups.filter(g=>g.retire).map(g=>g.buildId),[id(2)]);
 assert.ok(groups.every(g=>g.prefix.endsWith('/')));
});
test('a recent write protects an otherwise retired build', () => {
 const objects=[object(1,100),object(2,90),object(2,1),object(3,80),object(4,70),object(5,60)];
 assert.equal(selectRetiredBuilds(objects,[id(1)],now).filter(g=>g.retire).length,0);
});
test('unknown layouts and missing active build fail closed', () => {
 assert.throws(()=>selectRetiredBuilds([{...object(1,100),key:'images/user-photo.jpg'}],[id(1)],now));
 assert.throws(()=>selectRetiredBuilds([object(1,100)],[],now));
 assert.throws(()=>selectRetiredBuilds([object(1,100)],[id(2)],now));
});
