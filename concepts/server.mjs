import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8781);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/healthz'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({app:'drawing-letters',ok:true}));return}
  const parts=decodeURIComponent(url.pathname).split('/');
  if(parts.some(p=>p==='..'||p.startsWith('.'))){res.writeHead(403);res.end();return}
  const target=path.resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
  const actual=await fs.realpath(target);
  if(!actual.startsWith(root+path.sep)||!types[path.extname(actual)]){res.writeHead(403);res.end();return}
  const data=await fs.readFile(actual);res.setHeader('Content-Type',types[path.extname(actual)]);res.writeHead(200);res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found')}
});
server.listen(port,'0.0.0.0',()=>console.log(`Чертёжные буквы · Wi-Fi · порт ${port}\nОстановка: Ctrl+C`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
