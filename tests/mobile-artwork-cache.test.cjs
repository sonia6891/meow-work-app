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
assert.match(html,/sw\.js\?v=272/);
assert.match(sw,/meow-work-pwa-v272/);
console.log('PASS five mobile artwork files exist, are precached, and total '+total+' bytes');
