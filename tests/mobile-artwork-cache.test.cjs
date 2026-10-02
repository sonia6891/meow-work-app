const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const assets=vm.runInNewContext(sw.match(/const STATIC_ASSETS=(\[[^\n]+\]);/)[1]);
const current=[...new Set([...html.matchAll(/(?:src|srcset)="(\.\/assets\/[^" ]+\?v=269)"/g)].map(m=>m[1]))];
assert.equal(current.length,5,'All five current phone artwork files must be referenced');
let total=0;
for(const url of current){
 assert.ok(assets.includes(url),'Artwork must be available offline: '+url);
 const bytes=fs.statSync(url.split('?')[0]).size;
 assert.ok(bytes<500000,'Phone artwork must stay under 500 KB: '+url);
 total+=bytes;
}
assert.ok(total<1200000,'Total phone artwork must stay under 1.2 MB');
const release=html.match(/const APP_RELEASE_VERSION='(\d+)'/)[1];
assert.ok(html.includes("register('./sw.js?v='+APP_RELEASE_VERSION"));
assert.ok(sw.includes('meow-work-pwa-v'+release));
assert.ok(JSON.parse(fs.readFileSync('manifest.webmanifest','utf8')).start_url.endsWith('?v='+release));
assert.ok(html.includes("textContent='版本資訊・v'+APP_RELEASE_VERSION"));
console.log('PASS five mobile artwork files exist, are precached, and total '+total+' bytes');
