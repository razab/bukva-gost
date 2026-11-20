const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=__dirname,load=name=>fs.readFileSync(path.join(dir,'../components',name+'.js'),'utf8');
const harness=fs.readFileSync(path.join(dir,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0].replace("'glyphs','writing-scheme'","'glyphs','number-glyphs','writing-scheme'");
const app=new Function('require','__dirname',harness+'return boot();')(require,dir),run=s=>app.run(s);
vm.runInContext(load('number-practice'),app.context);
const glyphs=run('NumberGlyphs'),{Resvg}=require('@resvg/resvg-js');
assert.deepEqual(Object.keys(glyphs),[...'0123456789+−=.,:']);
assert.equal(run('drawingGeometryRevision'),'4633c1e3','Existing letter keys changed');
for(const [character,glyph] of Object.entries(glyphs)){
 assert(glyph.model.every(line=>line.length>=2&&line.every(p=>p.length===2&&p.every(Number.isFinite))),character);
 const normalized=glyph.model.map(line=>line.map(([x,y])=>[x/150,y/180]));
 for(const ink of [normalized,normalized.map(line=>[...line].reverse())])assert.equal(run(`evaluate(${JSON.stringify(ink)},NumberGlyphs[${JSON.stringify(character)}].model,1).score`),100,character);
 const svg=run(`fontOutline(NumberGlyphs[${JSON.stringify(character)}].model,'fill="#347356"')`);
 const image=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="450" height="540" viewBox="0 0 150 180">${svg}</svg>`).render(),pixels=image.pixels;
 const clock=run(`demoClock(NumberGlyphs[${JSON.stringify(character)}].model,{startDelay:0,endDelay:0})`);
 for(const segment of clock.segments)for(let i=1;i<30;i++){
  const point=clock.at(segment.start+(segment.end-segment.start)*i/30,false).pen;
  assert(point?.every(Number.isFinite),character+' invalid pencil');
  const x=Math.round(point[0]*3),y=Math.round(point[1]*3);let hit=false;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(pixels[((y+dy)*450+x+dx)*4+3]>100)hit=true;
  assert(hit,character+' pencil outside source outline: '+point);
 }
 const scheme=run(`WritingScheme.layout(NumberGlyphs[${JSON.stringify(character)}].model)`);
 assert.equal(scheme.length,glyph.model.length,character+' scheme count');
 assert(scheme.every(s=>s.label.every(Number.isFinite)),character+' label');
 const touches=([x,y])=>pixels[(Math.round(y*3)*450+Math.round(x*3))*4+3]>100;
 for(const step of scheme){
  assert(step.arrowLine.every(p=>!touches(p)),character+' arrow crosses glyph');
  for(let dx=-4;dx<=4;dx++)for(let dy=-6;dy<=6;dy++)assert(!touches([step.label[0]+dx,step.label[1]+dy]),character+' label crosses glyph');
 }
}
const Backup=run('LocalBackup'),key='letter-worksheet-numbers-v1',ink=JSON.stringify({a:[[[.2,.3],[.3,.4]]]}),existing=JSON.stringify({a:[[[.5,.6]]]}),store=values=>{
 const data=new Map(Object.entries(values));return {get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
};
const source=store({[key]:ink,'private-unrelated':'no'}),backup=Backup.parse(Backup.export(source)),target=store({[key]:existing});
assert.equal(backup.fields,1);assert.equal(Backup.plan(target,backup).stats.conflicts,1);Backup.restore(target,Backup.plan(target,backup));assert.equal(target.getItem(key),existing);
assert.equal(Backup.allowed('letter-worksheet-numbers-v1-other'),false);
console.log('PASS: exact-source symbol routes, forward/reverse shared scoring, pencil stays inside font, scheme metadata, unchanged letter geometry keys, numeric backup whitelist/conflicts');
