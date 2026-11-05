const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {Resvg}=require(process.env.RESVG_MODULE||'@resvg/resvg-js');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'worksheet-catalog-')),probe=path.join(dir,'catalog.json');
try{
 let catalog;
 if(process.env.LETTER_PICTURE_INPUT){
  const vm=require('node:vm'),context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../components/catalog.js'),'utf8'),context);const render=vm.runInContext('WorksheetCatalog.renderPicture',context);
  catalog=JSON.parse(fs.readFileSync(process.env.LETTER_PICTURE_INPUT,'utf8')).map(p=>({...p,svg:render(p)}));
 }else{cp.execFileSync(process.execPath,[path.join(__dirname,'worksheet.test.cjs')],{env:{...process.env,LETTER_CATALOG_PROBE:probe},stdio:'pipe'});catalog=JSON.parse(fs.readFileSync(probe,'utf8'))}
 const expected=process.env.LETTER_PICTURE_INPUT?2:40;assert.equal(catalog.length,expected);assert.equal(new Set(catalog.map(d=>d.id)).size,expected);
 const plans=JSON.parse(fs.readFileSync(process.env.LETTER_PICTURE_PLAN||path.join(__dirname,'../../references/picture-stroke-plan.json'),'utf8'));
 const points=d=>Array.from(d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g),m=>[Number(m[1]),Number(m[2])]);
 const pointDistance=(p,a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y||1)));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y)};
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
 const connected=(a,b)=>{for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++){
  const p=a[i-1],q=a[i],r=b[j-1],s=b[j],u=[q[0]-p[0],q[1]-p[1]],v=[s[0]-r[0],s[1]-r[1]],w=[r[0]-p[0],r[1]-p[1]],den=cross(u,v);
  if(den&&cross(w,v)/den>=0&&cross(w,v)/den<=1&&cross(w,u)/den>=0&&cross(w,u)/den<=1)return true;
  if(Math.min(pointDistance(p,r,s),pointDistance(q,r,s),pointDistance(r,p,q),pointDistance(s,p,q))<=1.51)return true;
 }return false};
 for(const item of catalog){
  const plan=plans.find(p=>p.id===item.id);assert(plan,item.id+' missing stroke plan');
  assert.equal(item.fixed,plan.units.filter((_,i)=>plan.ready.includes(i)).join(' '),item.id+' partial ready stroke');
  assert.equal(item.trace,plan.units.filter((_,i)=>!plan.ready.includes(i)).join(' '),item.id+' partial unfinished stroke');
  const ready=plan.ready.map(i=>points(plan.units[i])),seen=new Set([0]);assert(ready.length>0,item.id+' no ready part');let changed=true;
  while(changed){changed=false;for(let i=0;i<ready.length;i++)if(!seen.has(i)&&[...seen].some(j=>connected(ready[i],ready[j]))){seen.add(i);changed=true}}
  assert.equal(seen.size,ready.length,item.id+' scattered ready strokes');
 }
 const length=d=>{let total=0,previous=null;for(const match of d.matchAll(/([ML])(-?[\d.]+) (-?[\d.]+)/g)){const point=[Number(match[2]),Number(match[3])];if(match[1]==='L'&&previous)total+=Math.hypot(point[0]-previous[0],point[1]-previous[1]);previous=point}return total};
 const raster=d=>new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 200 200"><path d="${d}" fill="none" stroke="black" stroke-width=".5"/></svg>`).render().pixels;
 for(const item of catalog){
  const ratio=length(item.trace)/(length(item.trace)+length(item.fixed));assert(ratio>=.7,item.id+' less than 70% to complete');assert(Math.abs(ratio-item.completionFraction)<.00001,item.id+' ratio mismatch');
  // Measure actual geometric coverage too: repeated/overlapping contours must
  // not inflate the nominal percentage of unfinished line length.
  const full=raster(item.fixed+' '+item.trace),fixed=raster(item.fixed);let whole=0,ready=0;
  for(let i=3;i<full.length;i+=4){whole+=full[i]/255;ready+=fixed[i]/255}
  assert(1-ready/whole>=.7,item.id+' less than 70% distinct contour left');
 }
 for(const item of catalog){assert(item.svg.includes('stroke-dasharray'));const image=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">${item.svg}</svg>`).render(),px=image.pixels;let count=0,bbox=[200,200,0,0];for(let j=0;j<px.length;j+=4)if(px[j+3]>40){const x=(j/4)%200,y=Math.floor(j/4/200);bbox=[Math.min(bbox[0],x),Math.min(bbox[1],y),Math.max(bbox[2],x),Math.max(bbox[3],y)];count++}assert(count>300,item.id+' empty');assert(bbox[0]>3&&bbox[1]>3&&bbox[2]<197&&bbox[3]<197,item.id+' clipped')}
 console.log('PASS: '+catalog.length+' pictures; whole ready/unfinished strokes; one connected ready part; at least 70% distinct contour unfinished; all SVGs render inside frames');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
