const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const directory=__dirname,harness=fs.readFileSync(path.join(directory,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0];
const app=new Function('require','__dirname',harness+'return boot();')(require,directory),run=s=>app.run(s);
const order=Array.from(run('LetterCurriculum.order'));
assert.equal(app.nodes.letters.children.length,33);
for(const letter of order){
 run(`build(0,${JSON.stringify(letter)})`);assert.equal(run('activeLetter'),letter);assert.equal(run('composition.letter'),letter);
 assert.equal(run('document.title'),letter+' '+letter.toLowerCase()+' · чертёжные буквы');
 assert(run(`WorksheetCatalog.elements.every(d=>d.letters.every(c=>${JSON.stringify([letter,letter.toLowerCase()])}.includes(c)))`));
 assert(run('composition.get(0).textRows.every(r=>!!composition.normalizeText(r.text))'));
 for(const character of [letter,letter.toLowerCase()]){
  const glyph=run(`DrawingGlyphs[${JSON.stringify(character)}]`);assert(glyph.outline&&glyph.model.length&&glyph.revision);
  for(const line of glyph.model){assert(line.length>1);assert(line.every(p=>p.length===2&&p.every(Number.isFinite)))}
  const normalized=glyph.model.map(line=>line.map(([x,y])=>[x/150,y/180]));
  assert.equal(run(`evaluate(${JSON.stringify(normalized)},DrawingGlyphs[${JSON.stringify(character)}].model,8).score`),100,character+' exact trace');
  for(const prefs of [{size:30,bold:100,tolerance:2},{size:160,bold:150,tolerance:2}]){
   const frame=run(`PracticeElement.frame(DrawingGlyphs[${JSON.stringify(character)}].model,${JSON.stringify(prefs)})`),b=glyph.inkBounds,extra=(prefs.bold/100-1)*5;
   assert(b[0]-extra>=frame.x&&b[2]+extra<=frame.x+frame.width,character+' horizontal clipping');
   assert(b[1]-extra>=frame.y&&b[3]+extra<=frame.y+frame.height,character+' vertical clipping');
  }
 }
 const reference=run(`LetterReferences[${JSON.stringify(letter)}]`);assert(reference.word.toUpperCase().includes(letter));assert(fs.existsSync(path.join(directory,'..',reference.src)));
 const clock=run('sequenceClock()');assert(Math.abs(clock.lowerStart-clock.upperEnd-500)<1e-9);
}
// Skeleton corner connectors are not standalone handwriting exercises.
for(const letter of order){run(`WorksheetCatalog.setLetterSources(DrawingGlyphs,${JSON.stringify(letter)})`);assert(run(`WorksheetCatalog.elements.every(d=>d.id.endsWith('-dots')||d.model.reduce((s,l)=>s+revealLength(l),0)>=12)`),letter+' microscopic training fragment')}
run("build(0,'И')");
const merged=run("composition.validate({elementsVersion:2,elements:[{component:'gost-b90-418-part-0',repeats:5},{component:'gost-b90-418-part-1',repeats:3}],textRows:[]},0).elements");
assert.equal(merged.length,1);assert.equal(merged[0].repeats,5);assert(merged[0].component==='gost-b90-418-practice-v3-stem-left');
assert.equal(run("composition.validate({elementsVersion:2,elements:[],textRows:[]},0).elements.length"),0);
run("data['element-v1-gost-b90-418-part-0-0']=[[[.2,.2],[.3,.4]]];save();build(0,'У');build(0,'И')");assert.equal(run("data['element-v1-gost-b90-418-part-0-0'].length"),1);
console.log('PASS: no microscopic fragments in all 33 lessons; merged selections/repetitions, exclusions and archived old ink preserved');
// Independent lesson records and composition survive switching and reopening.
run("build(0,'У');data['qa-u']=[[[.2,.2],[.3,.4]]];save();composition.update(0,{picture:'art-house'});build(0,'М');data['qa-m']=[[[.4,.2],[.5,.6]]];save();build(0,'У')");
assert.equal(run('data["qa-u"].length'),1);assert.equal(run('data["qa-m"]'),undefined);assert.equal(run('composition.get(0).picture'),'art-house');
const restored=new Function('require','__dirname',harness+'return boot(arguments[2]);')(require,directory,app.saved);assert.equal(restored.run('activeLetter'),'У');assert.equal(restored.run('data["qa-u"].length'),1);
run("build(0,'А')");assert.equal(run("composition.key"),'letter-page-composition-v1');
const wrapped=run("LetterSequence.compose('Мама мыла раму.',sequenceSources,{gap:20,maxWidth:300})");assert(wrapped.breaks.length>0);assert(wrapped.height>180);assert(wrapped.glyphs.some(g=>g.y>0));
assert.equal(run("evaluate([[[.3,.3]]],[[[45,54],[45,54.2]]],8).score"),100);
for(const text of ['подъём','съезд','АААААААААААААААААААААААА','Мама мыла раму.']){
 const spec=run(`LetterSequence.compose(${JSON.stringify(text)},sequenceSources,{gap:50,bold:150,maxWidth:400})`);assert(spec.breaks.length,text+' must wrap');assert.equal(spec.glyphs.length,text.replace(/ /g,'').length);
 const source=run('sequenceSources');let i=0;const rows=new Map();for(const g of spec.glyphs){const char=text.replace(/ /g,'')[i++],b=source[char].bounds;const row=rows.get(g.y)||[];row.push([g.x+b[0],g.x+b[1]]);rows.set(g.y,row)}
 for(const bounds of rows.values())assert(Math.max(...bounds.map(b=>b[1]))-Math.min(...bounds.map(b=>b[0]))<=400.001,text+' exceeds available line width');
}
console.log('PASS: oversized words and 24-letter strings wrap without missing glyphs or exceeding the available width');

console.log('PASS: 33 lesson pairs; exact contours/routes, finite geometry, no ink clipping at 30/160, relevant parts, known-letter text, 33 local references, sequential demo, isolated/reloaded records and word wrapping');

if(process.env.RESVG_MODULE){
 const {Resvg}=require(process.env.RESVG_MODULE),glyphs=Object.keys(run('DrawingGlyphs'));
 function green(body){const rendered=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360" viewBox="0 0 150 180">${body.replaceAll('var(--accent)','#347356')}</svg>`).render(),pixels=rendered.pixels,result=new Set();for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100&&pixels[i+1]>pixels[i]*1.4&&pixels[i]<100&&pixels[i+2]<140)result.add(i/4);return result}
 for(const bold of [100,150]){
 run(`preferences={...preferences,bold:${bold}}`);
 for(const [index,character] of glyphs.entries()){
  const key=JSON.stringify(character),expected=green(run(`fontOutline(DrawingGlyphs[${key}].model,'fill="#347356"')`));assert(expected.size>0);
  let previous=0;
  for(const p of [0,.3,.7,1]){
   const painted=green(run(`revealMarkup(DrawingGlyphs[${key}].model,'qa',DrawingGlyphs[${key}].model.map(()=>${p}))`));
   assert(painted.size>=previous,character+' nonmonotonic reveal');if(!p)assert.equal(painted.size,0);
   if(p===1){const missing=[...expected].filter(n=>!painted.has(n)).length/expected.size;assert(missing<.005,character+' incomplete contour '+missing)}previous=painted.size;
  }
  const near=green(run(`revealMarkup(DrawingGlyphs[${key}].model,'near',DrawingGlyphs[${key}].model.map(()=>.999))`));const gap=[...expected].filter(n=>!near.has(n)).length/expected.size;assert(gap<.005,character+' final-frame jump '+gap);
  if(index%10===9)console.log('Rendered bold',bold,index+1,'/',glyphs.length);
 }
 }
 console.log('PASS: all '+glyphs.length+' glyphs at bold 100/150 reveal progressively, cover >99.5% of their true outline and have no final fill jump');
}
