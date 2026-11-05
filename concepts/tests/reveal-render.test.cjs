// Render the actual SVG reveal from the page, without a browser or user storage.
// Usage: RESVG_MODULE=/path/to/@resvg/resvg-js node tests/reveal-render.test.cjs
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {Resvg}=require(process.env.RESVG_MODULE||'@resvg/resvg-js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gost-reveal-')),probe=path.join(dir,'frames.json');
try{
 cp.execFileSync(process.execPath,[path.join(__dirname,'worksheet.test.cjs')],{env:{...process.env,LETTER_REVEAL_PROBE:probe},stdio:'pipe'});
 const samples=JSON.parse(fs.readFileSync(probe,'utf8'));
 function render(body){return new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 150 180"><rect width="150" height="180" fill="#fffefa"/>${body.replaceAll('var(--accent)','#347356')}</svg>`).render()}
 function green(image){const p=image.pixels,set=new Set();for(let i=0;i<p.length;i+=4)if(p[i+1]>p[i]*1.4&&p[i]<100&&p[i+2]<140)set.add(i/4);return set}
 for(const [name,index]of [['upper',0],['lower',1]]){
  const reference=green(render(samples.expected[index])),frames=samples[name].map(s=>green(render(s)));
  assert.equal(frames[0].size,0);for(let i=1;i<frames.length;i++)assert(frames[i].size>frames[i-1].size,`${name}: not progressively revealed`);
  const completed=frames.at(-1),missing=[...reference].filter(p=>!completed.has(p)).length/reference.size;assert(missing<.005,`${name}: missing ${(missing*100).toFixed(2)}% at completion`);
  const nearly=green(render(samples.last[index])),jump=[...completed].filter(p=>!nearly.has(p)).length/reference.size;assert(jump<.005,`${name}: final-frame jump`);
 }
 for(let i=0;i<2;i++){const ref=green(render(samples.thick.expected[i])),done=green(render(samples.thick.frames[i])),almost=green(render(samples.thick.last[i]));const missing=[...ref].filter(p=>!done.has(p)).length/ref.size,jump=[...done].filter(p=>!almost.has(p)).length/ref.size;assert(missing<.005,'bold contour incomplete');assert(jump<.005,'bold final fill jump')}
 const joins=samples.joins.map(s=>green(render(s)));
 for(let i=1;i<joins.length;i++){const removed=[...joins[i-1]].filter(p=>!joins[i].has(p));assert.equal(removed.length,0,'crossbar removed previously painted side pixels')}
 const at=(set,x,y)=>set.has(Math.floor(y*4)*600+Math.floor(x*4));
 for(const frame of joins){assert(at(frame,54,109.8),'left join broken');assert(at(frame,96.9,109.8),'right join broken')}
 assert(!at(joins[0],75,109.8),'crossbar prematurely revealed');assert(at(joins.at(-1),75,109.8),'crossbar not completed');
 console.log('PASS: joins stay continuous; later strokes never erase prior ink; crossbar appears in order');
 console.log('PASS: rendered ink grows in intermediate frames; >99.5% contour covered; no final-frame fill jump');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
