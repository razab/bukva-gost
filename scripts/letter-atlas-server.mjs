import http from 'node:http';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Serve only the atlas resources, never a directory or the lesson origin.
const files=new Map([
 ['/', ['../editor/letter-atlas.html','text/html; charset=utf-8']],
 ['/letter-atlas.js',['../editor/letter-atlas.js','text/javascript; charset=utf-8']],
 ['/concepts/components/glyphs.js',['../concepts/components/glyphs.js','text/javascript; charset=utf-8']],
 ['/concepts/components/writing-scheme.js',['../concepts/components/writing-scheme.js','text/javascript; charset=utf-8']],
 ['/concepts/components/curriculum.js',['../concepts/components/curriculum.js','text/javascript; charset=utf-8']],
 ['/concepts/components/letter-sequence.js',['../concepts/components/letter-sequence.js','text/javascript; charset=utf-8']]
]);
export function createAtlasServer(){
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!/^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host||'')){res.writeHead(403);res.end();return}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  let pathname;
  try{pathname=new URL(req.url,'http://localhost').pathname}catch{res.writeHead(400);res.end();return}
  if(pathname==='/healthz'){res.setHeader('Content-Type','application/json');res.end(req.method==='HEAD'?undefined:JSON.stringify({app:'gost-letter-atlas',ok:true}));return}
  const file=files.get(pathname);
  if(!file){res.writeHead(404);res.end('Not found');return}
  try{const data=await fs.readFile(new URL(file[0],import.meta.url));res.setHeader('Content-Type',file[1]);res.end(req.method==='HEAD'?undefined:data)}
  catch{res.writeHead(500);res.end('Atlas resource unavailable')}
 });
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const server=createAtlasServer();
 server.listen(8782,'127.0.0.1',()=>console.log('Атлас схем · только на этом Mac · http://127.0.0.1:8782/'));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
