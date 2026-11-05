importScripts('./precache-manifest.js');
const CACHE='gost-letters-'+self.GOST_PRECACHE.version;
const base=new URL('./',self.location.href),index=new URL('index.html',base).href;
const urls=new Set(self.GOST_PRECACHE.files.map(file=>new URL(file.path,base).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(self.GOST_PRECACHE.files.map(file=>new Request(new URL(file.path,base),{cache:'reload',integrity:'sha256-'+file.sha256})))})()));
// A waiting update never interrupts writing. Only the parent settings action
// requests immediate activation; otherwise it activates when old tabs close.
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('gost-letters-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==base.origin)return;
 const navigation=event.request.mode==='navigate'&&(url.pathname===base.pathname||url.pathname===new URL(index).pathname);
 const key=navigation?index:url.href;if(!navigation&&!urls.has(key))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(key);if(hit)return hit;try{return await fetch(event.request)}catch{return new Response('Ресурс не сохранён. Откройте приложение при подключении к сети.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}})());
});
