import assert from 'node:assert/strict';
const version=process.argv[2];
const headers=version?{'Cloudflare-Workers-Version-Overrides':`dokorun="${version}"`}:{};
async function request(path){return fetch(`https://dokorun.com${path}`,{headers,redirect:'manual',signal:AbortSignal.timeout(20000)});}
for(let pass=0;pass<2;pass++){
 const health=await(await request('/api/health')).json();assert.equal(health.ok,true);if(version)assert.equal(health.version.id,version);console.log(`health ${health.version.id}`);
 const near=await request('/spots?sort=near');assert.equal(near.status,200);assert.ok((await near.text()).includes('現在地を取得する'));
 const policy=await request('/privacy');assert.equal(policy.status,200);assert.ok((await policy.text()).includes('保存期間と削除'));
 const missing=await request('/api/run-photos/runs/12345678-1234-1234-1234-123456789012/12345678-1234-1234-1234-123456789012.webp');assert.equal(missing.status,404);assert.ok(missing.headers.get('cache-control')?.includes('no-store'));
 const legacyLocation=await request('/spots?sort=near&lat=0&lng=0');assert.ok([307,308].includes(legacyLocation.status));assert.equal(legacyLocation.headers.get('location'),'/spots?sort=near');
 const session=await request('/api/auth/get-session');assert.equal(session.status,200);assert.equal(await session.json(),null);
}
console.log('Privacy smoke passed (version, location URL stripping, photo denial, session, policy)');
