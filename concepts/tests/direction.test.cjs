const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=__dirname,h=fs.readFileSync(path.join(dir,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0].replace("'glyphs','writing-scheme'","'glyphs','number-glyphs','writing-scheme'");
const boot=saved=>new Function('require','__dirname',h+'return boot(arguments[2],"learner");')(require,dir,saved);
let app=boot();const plain=v=>JSON.parse(JSON.stringify(v));
function cell(){return app.nodes.practice.children.find(r=>r.dataset.lessonStage==='upper-letter').children[0].parts}
function draw(canvas,lines){const frame=JSON.parse(canvas.attrs['data-view-box']),rect=canvas.getBoundingClientRect();for(const line of lines){const points=line.map(([x,y])=>[(x-frame.x)*rect.width/frame.width,(y-frame.y)*rect.height/frame.height]);canvas.emit('pointerdown',points[0]);for(const p of points.slice(1))canvas.emit('pointermove',p);canvas.emit('pointerup',points.at(-1))}}
function clear(){cell().output.onclick();cell().button.onclick()}
for(const character of ['А','О']){
 app.run(`build(0,${JSON.stringify(character)})`);
 const routes=plain(app.run('demonstrationFor(models)'));
 draw(cell().canvas,routes);assert.equal(cell().output.textContent,'100%');clear();
 draw(cell().canvas,routes.map(line=>[...line].reverse()));assert.equal(cell().output.dataset.direction,'backward');assert(parseInt(cell().output.textContent)<90);
 assert.equal(app.nodes['next-letter'].disabled,true);assert.equal(app.nodes['finish-session'].disabled,false);
 const raw=plain(app.run('data["gost-file-b90-upper-0"]'));
 clear();assert.equal(cell().output.textContent,'—');assert.equal(app.nodes['next-letter'].disabled,false);app.nodes.undo.onclick();assert.deepEqual(plain(app.run('data["gost-file-b90-upper-0"]')),raw);assert.equal(app.nodes['next-letter'].disabled,true);
 app=boot(app.saved);assert.equal(cell().output.dataset.direction,'backward');assert(parseInt(cell().output.textContent)<90);clear();
 const split=routes.flatMap(line=>line.slice(1).map((p,i)=>[line[i],p]));draw(cell().canvas,split);assert.equal(cell().output.dataset.direction,'correct');assert(parseInt(cell().output.textContent)>=90);
}
// The same real surface handles numeric routes; no digit-specific validator.
const numeric=app.run(`(()=>{const c=PracticeElement.createCell({row:document.querySelector('#practice'),id:'number-canary-3',model:NumberGlyphs['3'].model,label:'3',guide,setupSurface,preferences});surfaces.push(c.surface);return c})()`);
draw(numeric.element.parts.canvas,plain(app.run("NumberGlyphs['3'].model")));assert.equal(numeric.element.parts.output.textContent,'100%');
numeric.element.parts.output.onclick();numeric.element.parts.button.onclick();draw(numeric.element.parts.canvas,plain(app.run("NumberGlyphs['3'].model")).map(line=>[...line].reverse()));assert.equal(numeric.element.parts.output.dataset.direction,'backward');
console.log('PASS canary: actual A/O/3 fields, correct/reverse, pen lifts, raw ink, reset/undo/reload');

const run=s=>app.run(s),glyphs=run('({...DrawingGlyphs,...NumberGlyphs})');
for(const [character,glyph] of Object.entries(glyphs)){
 const route=glyph.demonstration||glyph.model,key=JSON.stringify(character),model=`({...DrawingGlyphs,...NumberGlyphs})[${key}].model`;
 const check=lines=>run(`StrokeDirection.assess(${JSON.stringify(lines.map(l=>l.map(([x,y])=>[x/150,y/180])))},${model},{scale:.92,tolerance:8/.92})`);
 assert.equal(check(route).backwards,false,character+' correct teaching route rejected');
 assert.equal(run(`assessWriting(${JSON.stringify(route.map(l=>l.map(([x,y])=>[x/150,y/180])))},${model},8/.92).score`),100,character+' ideal demo should be ideal practice');
 const length=route.reduce((n,l)=>n+l.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-l[i][0],p[1]-l[i][1]),0),0);
 if(length>12)assert.equal(check(route.map(l=>[...l].reverse())).backwards,true,character+' reverse route accepted');
 for(let i=0;i<route.length;i++){
  const line=route[i],length=line.slice(1).reduce((n,p,j)=>n+Math.hypot(p[0]-line[j][0],p[1]-line[j][1]),0);
  if(length>=12)assert.equal(check(route.map((l,j)=>i===j?[...l].reverse():l)).backwards,true,character+' one backward stroke accepted');
 }
 for(const scale of [.3,.6,1.6])for(const tolerance of [1,16]){
  const normalized=route.map(l=>l.map(([x,y])=>[x/150,y/180]));
  assert.equal(run(`StrokeDirection.assess(${JSON.stringify(normalized)},${model},{scale:${scale},tolerance:${tolerance/scale}}).backwards`),false,character+' correct scaled');
  if(length>12)assert.equal(run(`StrokeDirection.assess(${JSON.stringify(normalized.map(l=>[...l].reverse()))},${model},{scale:${scale},tolerance:${tolerance/scale}}).backwards`),true,character+' reverse scaled');
 }
 assert.equal(check(route.map(l=>l.map(([x,y],i)=>[x+Math.sin(i)*.3,y+Math.cos(i)*.3]))).backwards,false,character+' jitter rejected');
 for(const [dx,dy] of [[-4,0],[4,0],[0,-4],[0,4]])assert.equal(check(route.map(l=>l.map(([x,y])=>[x+dx/.92,y+dy/.92]))).backwards,false,character+' in-corridor offset rejected');
}
const vertical=[[[45,40],[45,140]]],normal=vertical.map(l=>l.map(([x,y])=>[x/150,y/180]));
assert.equal(run(`StrokeDirection.assess(${JSON.stringify(normal)},${JSON.stringify(vertical)}).backwards`),false);
assert.equal(run(`StrokeDirection.assess(${JSON.stringify(normal.map(l=>[...l].reverse()))},${JSON.stringify(vertical)}).backwards`),true);
for(const text of ['ААА','СОК','её ЯЯ']){
 const composed=run(`LetterSequence.compose(${JSON.stringify(text)},DrawingGlyphs,{gap:20,maxWidth:150})`),routes=plain(run(`StrokeDirection.route(LetterSequence.compose(${JSON.stringify(text)},DrawingGlyphs,{gap:20,maxWidth:150}).model)`));
 const check=lines=>run(`(()=>{const sequence=LetterSequence.compose(${JSON.stringify(text)},DrawingGlyphs,{gap:20,maxWidth:150});return StrokeDirection.assess(${JSON.stringify(lines.map(l=>l.map(([x,y])=>[x/composed.width,y/composed.height])))},sequence.model,{width:sequence.width,height:sequence.height})})()`);
 assert.equal(check(routes).backwards,false,text+' correct');assert.equal(check(routes.map(l=>[...l].reverse())).backwards,true,text+' reverse');
}
assert.equal(run('drawingGeometryRevision'),'4633c1e3');assert(run("LearnerExperience.profile('x').includes('direction:1')"));
for(const character of run('LetterCurriculum.order')){
 run(`build(0,${JSON.stringify(character)})`);
 const parts=run('WorksheetCatalog.elements');
 for(let at=0;at<parts.length;at++){
  const result=run(`(()=>{const part=WorksheetCatalog.elements[${at}],route=StrokeDirection.route(part.model),clipped=TraceFeedback.sample(route,2).flatMap(line=>{const out=[];let current=[];for(const p of line){if(TraceFeedback.distance(p,part.model)<2)current.push(p);else{if(current.length>1)out.push(current);current=[]}}if(current.length>1)out.push(current);return out});return StrokeDirection.assess(clipped.map(l=>l.map(([x,y])=>[x/150,y/180])),part.model)})()`);
  assert.equal(result.backwards,false,character+' '+parts[at].id+' correct warmup direction');
 }
}
run("build(0,'А')");if(!cell().output.disabled)clear();
run("var checks=0,originalAssess=assessWriting;assessWriting=(...args)=>{checks++;return originalAssess(...args)}");
draw(cell().canvas,plain(run('demonstrationFor(models)')));
run("var target=surfaces.find(s=>s.id==='gost-file-b90-upper-0');target.render();checks=0;for(let i=0;i<20;i++)target.render()");assert.equal(run('checks'),0,'Unchanged ink reassessed on repaint');
run('configure({tolerance:4})');assert(run('checks')>0,'Changed tolerance must reassess');
assert.equal(cell().output.textContent,'100%');clear();app.nodes.undo.onclick();assert.equal(cell().output.textContent,'100%');
run('var fastNearest=nearest');
for(const offset of [0,.7,4,8,20]){
 const expression=`(()=>{const m=LetterSequence.compose('СОСНА',DrawingGlyphs,{gap:20}).model,expected=m.map(l=>l.map(([x,y])=>({x,y}))),actual=expected.map(l=>l.map(p=>({x:p.x+${offset},y:p.y+.3})));return measureStrokeQuality(actual,expected,{tolerance:8}).score})()`;
 const fast=run(expression);run('nearest=(points,other)=>points.map(p=>other.reduce((best,q)=>Math.min(best,Math.hypot(p.x-q.x,p.y-q.y)),Infinity))');
 assert.equal(run(expression),fast,'Nearest-distance optimization changed geometry score');run('nearest=fastNearest');
}
console.log('PASS: every glyph teaching/reverse/jitter, wrapped texts and arbitrary pen lifts; unchanged geometry and separate assessment profile');
