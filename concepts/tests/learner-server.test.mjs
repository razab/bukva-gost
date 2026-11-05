import assert from 'node:assert/strict';
const origins=['http://127.0.0.1:8781','http://192.168.0.38:8781'];
for(const origin of origins){
 const root=await fetch(origin+'/'),html=await root.text();assert.equal(root.status,200);assert(html.includes('Буквы по ГОСТ'));const dev=html.match(/<dialog id="developer-panel"[\s\S]*?<\/dialog>/)[0];assert(dev.includes('id="setting-size"'));assert(dev.includes('id="picture-picker"'));assert(!/<dialog id="developer-panel"[^>]*\sopen(?:\s|>)/.test(html));
 for(const url of ['/editor','/editor.html','/editor/index.html','/previous-v1.html','/previous-before-components.html']){const r=await fetch(origin+url,{headers:{'X-Forwarded-For':'127.0.0.1'}});assert.equal(r.status,404,url)}
 assert.equal((await fetch(origin+'/components/worksheet-runtime.js')).status,200);assert.equal((await fetch(origin+'/%2e%2e%2feditor/index.html')).status,403);assert.equal((await fetch(origin+'/healthz')).status,200);
}
console.log('PASS: actual LAN/local server serves learner root/shared assets; authoring/current/archive HTML physically outside web root; editor routes unavailable even with forwarded headers; traversal/readiness checked');
