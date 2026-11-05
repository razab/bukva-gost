const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const dir=__dirname,h=fs.readFileSync(path.join(dir,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0],app=new Function('require','__dirname',h+'return boot();')(require,dir),run=s=>app.run(s),{Resvg}=require(process.env.RESVG_MODULE||'@resvg/resvg-js');
const before={};vm.createContext(before);vm.runInContext(fs.readFileSync(path.join(dir,'fixtures/glyphs-build23.js'),'utf8'),before);
const original=vm.runInContext('DrawingGlyphs',before),chars=process.env.DEMO_CANARY?[...process.env.DEMO_CANARY]:run('LetterCurriculum.order.flatMap(c=>[c,c.toLowerCase()])');
function pixels(svg){const image=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360" viewBox="0 0 150 180">${svg.replaceAll('var(--accent)','#347356')}</svg>`).render(),p=image.pixels,out=new Set();for(let i=0;i<p.length;i+=4)if(p[i+3]>100&&p[i+1]>p[i]*1.4&&p[i]<100&&p[i+2]<140)out.add(i/4);return out}
function touches(p,ink){const x=Math.round(p[0]*2),y=Math.round(p[1]*2);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<300&&y+dy>=0&&y+dy<360&&ink.has((y+dy)*300+x+dx))return true;return false}
for(const c of chars){
 const key=JSON.stringify(c),glyph=run(`DrawingGlyphs[${key}]`);
 for(const field of ['outline','model','revision'])if(!['И','Й'].includes(c)||field==='outline')assert.deepEqual(JSON.parse(JSON.stringify(glyph[field])),JSON.parse(JSON.stringify(original[c][field])),c+' changed '+field);
 for(const bold of [100,150]){
  run(`preferences.bold=${bold}`);const reference=pixels(run(`fontOutline(DrawingGlyphs[${key}].model,'fill="#347356"')`));
  const pencil=run(`(()=>{const clock=demoClock(demonstrationFor(DrawingGlyphs[${key}].model),{startDelay:0,endDelay:0});return clock.segments.flatMap(s=>{const count=Math.max(2,Math.ceil(s.length/1.5));return Array.from({length:count+1},(_,i)=>clock.at(s.start+(s.end-s.start)*i/count-1e-7,false).pen).filter(Boolean)});})()`);
  for(const p of pencil)assert(touches(p,reference),c+' pencil outside real font outline: '+p);
  let prior=new Set();
  for(const fraction of [.2,.5,.8,.999,1]){
   const frame=run(`(()=>{const model=demonstrationFor(DrawingGlyphs[${key}].model),clock=demoClock(model,{startDelay:0,endDelay:0}),phase=clock.at(clock.segments.at(-1).end*${fraction},false);return {svg:revealMarkup(model,'test',phase.progress),pen:phase.pen}})()`),paint=pixels(frame.svg);
   assert(paint.size>=prior.size,c+' decreasing reveal');if(frame.pen)assert(touches(frame.pen,paint),c+' paint does not follow pencil');
   if(fraction===.999||fraction===1){const missing=[...reference].filter(p=>!paint.has(p)).length/reference.size;assert(missing<.012,c+' final missing '+missing)}prior=paint;
  }
 }
}
console.log('PASS:',chars.length,'reviewed demonstrations at bold100/150: pencil stays inside true glyph, paint follows tip, progressive/near/full coverage, exact contours and unrelated assessment revisions');
