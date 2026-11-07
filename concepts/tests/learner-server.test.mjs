import assert from 'node:assert/strict';
const origins=['http://127.0.0.1:8781','http://192.168.0.38:8781'];
for(const origin of origins){
 const root=await fetch(origin+'/'),html=await root.text();assert.equal(root.status,200);assert(html.includes('Буквы по ГОСТ'));const dev=html.match(/<dialog id="developer-panel"[\s\S]*?<\/dialog>/)[0];assert(dev.includes('id="setting-size"'));assert(dev.includes('id="picture-picker"'));assert(!/<dialog id="developer-panel"[^>]*\sopen(?:\s|>)/.test(html));
 for(const url of ['/editor','/editor.html','/editor/index.html','/previous-v1.html','/previous-before-components.html']){const r=await fetch(origin+url,{headers:{'X-Forwarded-For':'127.0.0.1'}});assert.equal(r.status,404,url)}
 assert.equal((await fetch(origin+'/components/worksheet-runtime.js')).status,200);assert.equal((await fetch(origin+'/%2e%2e%2feditor/index.html')).status,403);assert.equal((await fetch(origin+'/healthz')).status,200);
}
console.log('PASS: actual LAN/local server serves learner root/shared assets; authoring/current/archive HTML physically outside web root; editor routes unavailable even with forwarded headers; traversal/readiness checked');

// Local-only atlas has an explicit resource allowlist, never a project web root.
const {createAtlasServer}=await import('../../scripts/letter-atlas-server.mjs');
const {default:http}=await import('node:http');
const atlas=createAtlasServer();await new Promise(resolve=>atlas.listen(0,'127.0.0.1',resolve));
try{
 const origin='http://127.0.0.1:'+atlas.address().port;
 for(const route of ['/','/letter-atlas.js','/concepts/components/glyphs.js','/concepts/components/writing-scheme.js'])assert.equal((await fetch(origin+route)).status,200,route);
 assert.deepEqual(await (await fetch(origin+'/healthz')).json(),{app:'gost-letter-atlas',ok:true});
 for(const route of ['/AGENTS.md','/openspec/config.yaml','/.git/config','/editor/index.html','/concepts/index.html','/%2e%2e/README.md'])assert.equal((await fetch(origin+route)).status,404,route);
 assert.equal((await fetch(origin,{method:'POST'})).status,405);
 assert.equal((await fetch(origin,{method:'HEAD'})).status,200);
 // Fetch normalises Host; use raw HTTP to exercise the actual request boundary.
 const status=await new Promise((resolve,reject)=>http.get(origin,{headers:{Host:'example.com'}},res=>{res.resume();resolve(res.statusCode)}).on('error',reject));
 assert.equal(status,403);
 console.log('PASS: atlas allowlist/readiness/HEAD; project files, writes and foreign Host rejected');
}finally{await new Promise(resolve=>atlas.close(resolve))}
