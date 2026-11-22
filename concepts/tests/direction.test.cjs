const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=__dirname,h=fs.readFileSync(path.join(dir,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0].replace("'glyphs','writing-scheme'","'glyphs','number-glyphs','writing-scheme'");
const boot=saved=>new Function('require','__dirname',h+'return boot(arguments[2],"learner");')(require,dir,saved);
let app=boot();const plain=v=>JSON.parse(JSON.stringify(v));
function cell(){return app.nodes.practice.children.find(r=>r.dataset.lessonStage==='upper-letter').children[0].parts}
function draw(canvas,lines){const frame=JSON.parse(canvas.attrs['data-view-box']),rect=canvas.getBoundingClientRect();for(const line of lines){const points=line.map(([x,y])=>[(x-frame.x)*rect.width/frame.width,(y-frame.y)*rect.height/frame.height]);canvas.emit('pointerdown',points[0]);for(const p of points.slice(1))canvas.emit('pointermove',p);canvas.emit('pointerup',points.at(-1))}}
function clear(parts=cell()){parts.output.onclick();parts.button.onclick()}
for(const level of ['standard','easy','precise']){
 app.nodes['level-'+level].onclick();
 const scale=app.run('preferences.size/100');
 const [left,right,bar]=plain(app.run('demonstrationFor(models)'));
 const [[x0,y],[x1]]=bar;
 for(const [name,points,backward] of [
  ['brief correction',[[x0,y],[x0+10/scale,y],[x0+2/scale,y],[x1,y]],false],
  ['reverse crossbar',[...bar].reverse(),true]
 ]){
  draw(cell().canvas,[left,right,points]);
  assert.equal(cell().output.dataset.direction,backward?'backward':'correct',level+' '+name);
  assert.equal(app.nodes['next-letter'].disabled,backward,level+' '+name);
  if(!backward)assert.equal(cell().output.textContent,'100%');
  clear();
 }
}
app.nodes['level-standard'].onclick();
const body=app.run("WorksheetCatalog.elements.find(part=>part.id==='gost-b90-a-body')");
const warmup=app.nodes.practice.children.find(row=>row.dataset.component===body.id).children[0].parts;
draw(warmup.canvas,plain(body.model));
assert.equal(warmup.output.textContent,'100%','The closed а warmup must accept its own complete route');
warmup.output.onclick();warmup.button.onclick();
draw(warmup.canvas,plain(body.model).map(line=>line.reverse()));
assert.equal(warmup.output.dataset.direction,'backward');
warmup.output.onclick();warmup.button.onclick();
const [loopA,stemA]=plain(app.run('lowercase'));
const joinedA=[...loopA,...stemA.slice(1)];
let lowerA=app.nodes.practice.children.find(row=>row.dataset.lessonStage==='lower-letter').children[0].parts;
const lowerAId='gost-file-b90-lower-0';
const lowerASave=()=>plain(app.run(`data[${JSON.stringify(lowerAId)}]`));
const clearLowerA=()=>{lowerA.output.onclick();lowerA.button.onclick()};
draw(lowerA.canvas,[joinedA]);
assert.equal(lowerA.output.textContent,'100%');
assert.equal(lowerA.output.dataset.direction,'correct');
const savedJoined=lowerASave();
app=boot(app.saved);
lowerA=app.nodes.practice.children.find(row=>row.dataset.lessonStage==='lower-letter').children[0].parts;
assert.equal(lowerA.output.textContent,'100%');
assert.deepEqual(lowerASave(),savedJoined);
clearLowerA();
for(const [name,lines,backward] of [
 ['closed then lift',[loopA,stemA],false],
 ['continue a paused loop',[loopA.slice(0,40),[...loopA.slice(39),...stemA.slice(1)]],false],
 ['trace each connected segment with lifts',joinedA.slice(1).map((point,index)=>[joinedA[index],point]),false],
 ['standalone reverse',[[...stemA].reverse()],true],
 ['reverse body then stem',[[...loopA].reverse(),stemA],true],
 ['joined followed by reverse',[joinedA,[...stemA].reverse()],true],
 ['fully reversed',[[...joinedA].reverse()],true]
]){
 draw(lowerA.canvas,lines);
 assert.equal(lowerA.output.dataset.direction,backward?'backward':'correct',name);
 if(!backward)assert.equal(lowerA.output.textContent,'100%');
 clearLowerA();
}
const mixed=app.run("LetterSequence.compose('На а',DrawingGlyphs,{gap:20,maxWidth:150})");
const mixedLines=mixed.glyphs.flatMap(glyph=>(glyph.model===app.run('lowercase')?[joinedA]:plain(app.run("demonstrationFor(DrawingGlyphs['Н'].model)"))).map(line=>line.map(([x,y])=>[(x+glyph.x)/mixed.width,(y+glyph.y)/mixed.height])));
const checkMixed=lines=>app.run(`(()=>{const sequence=LetterSequence.compose('На а',DrawingGlyphs,{gap:20,maxWidth:150});return assessWriting(${JSON.stringify(lines)},sequence.model,8,{width:sequence.width,height:sequence.height})})()`);
assert.equal(checkMixed(mixedLines).direction.backwards,false);
assert.equal(checkMixed(mixedLines).score,100);
assert.equal(checkMixed([[...mixedLines[0]].reverse(),...mixedLines.slice(1)]).direction.backwards,true);
for(const scale of [.3,.6,.92,1.6])for(const tolerance of [1,8,16]){
 for(const offset of (tolerance>=8?[-4,0,4]:[0])){
  const context={scale,tolerance:tolerance/scale};
  const sparse=plain(app.run(`TraceFeedback.sample(${JSON.stringify([joinedA])},4)[0]`));
  const trace=(reverse)=>[(reverse?[...sparse].reverse():sparse).map(([x,y])=>[(x+offset/scale)/150,y/180])];
  const check=reverse=>app.run(`StrokeDirection.assess(${JSON.stringify(trace(reverse))},lowercase,${JSON.stringify(context)})`);
  assert.equal(check(false).backwards,false,`Joined а at scale ${scale}, tolerance ${tolerance}, offset ${offset}`);
  assert.equal(check(true).backwards,true,'A reversed circuit must still fail');
 }
}
for(const letter of ['И','Й']){
 app.run(`build(0,${JSON.stringify(letter)})`);
 const lower=app.nodes.practice.children.find(row=>row.dataset.lessonStage==='lower-letter').children[0].parts;
 const [body,...accent]=plain(app.run('demonstrationFor(lowercase)'));
 const [oldLeft,oldRight]=plain(app.run('StrokeDirection.route(lowercase)'));
 const joinedUp=body.slice(0,-1);
 const wrong=[...oldRight].reverse();
 for(const [label,lines,backward] of [
  ['one contact down-up-down',[body,...accent],false],
  ['one contact ending at upper right',[joinedUp,...accent],false],
  ['previous separate contacts',[oldLeft,oldRight,...accent],false],
  ['isolated climb',[wrong],true],
  ['return on the wrong side',[[...body].reverse(),...accent],true]
 ]){
  draw(lower.canvas,lines);
  assert.equal(lower.output.dataset.direction,backward?'backward':'correct',letter+' '+label);
  if(!backward)assert.equal(lower.output.textContent,'100%',letter+' '+label);
  clear(lower);
 }
}
const bodyInText=plain(app.run(`(()=>{
 const sequence=LetterSequence.compose('Они й',DrawingGlyphs,{gap:20,maxWidth:150});
 const trace=(reversed=false)=>sequence.glyphs.flatMap(({model,x,y},i)=>{
  const lines=i===2&&reversed?[[...StrokeDirection.route(model)[1]].reverse()]:demonstrationFor(model);
  return lines.map(line=>line.map(([a,b])=>[(a+x)/sequence.width,(b+y)/sequence.height]));
 });
 const check=ink=>assessWriting(ink,sequence.model,4,{width:sequence.width,height:sequence.height});
 return [check(trace()).direction.backwards,check(trace()).score,check(trace(true)).direction.backwards];
})()`));
assert.equal(bodyInText[0],false,'joined body in wrapped text with an alternate direction glyph');
assert(bodyInText[1]>=95);
assert.equal(bodyInText[2],true,'isolated climb remains backward in text');

for(const character of ['А','О']){
 app.run(`build(0,${JSON.stringify(character)})`);
 const routes=plain(app.run('demonstrationFor(models)'));
 draw(cell().canvas,routes);assert.equal(cell().output.textContent,'100%');clear();
 draw(cell().canvas,routes.map(line=>[...line].reverse()));assert.equal(cell().output.dataset.direction,'backward');assert(parseInt(cell().output.textContent)<90);
 assert.equal(app.nodes['next-letter'].disabled,true);assert.equal(app.nodes['finish-session'].disabled,true);
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
  if(length>=12)assert.equal(check(route.map((l,j)=>i===j?[...l].reverse():l)).backwards,true,character+' single reverse policy');
 }
 for(const scale of [.3,.6,1.6])for(const tolerance of [1,16]){
  const normalized=route.map(l=>l.map(([x,y])=>[x/150,y/180]));
  assert.equal(run(`StrokeDirection.assess(${JSON.stringify(normalized)},${model},{scale:${scale},tolerance:${tolerance/scale}}).backwards`),false,character+' correct scaled');
  const longEnough=route.some(line=>line.some(([x,y])=>Math.hypot(x-line.at(-1)[0],y-line.at(-1)[1])*scale>=10));
  if(longEnough)assert.equal(run(`StrokeDirection.assess(${JSON.stringify(normalized.map(l=>[...l].reverse()))},${model},{scale:${scale},tolerance:${tolerance/scale}}).backwards`),true,character+' reverse scaled');
 }
 assert.equal(check(route.map(l=>l.map(([x,y],i)=>[x+Math.sin(i)*.3,y+Math.cos(i)*.3]))).backwards,false,character+' jitter rejected');
 for(const [dx,dy] of [[-4,0],[4,0],[0,-4],[0,4]])assert.equal(check(route.map(l=>l.map(([x,y])=>[x+dx/.92,y+dy/.92]))).backwards,false,character+' in-corridor offset rejected');
}
for(const level of ['easy','standard','precise']){
 run(`LearnerExperience.setLevel(${JSON.stringify(level)});build(0,'Э')`);
 const route=plain(run("DrawingGlyphs['э'].demonstration"));
 const surface=app.nodes.practice.children.find(row=>row.dataset.lessonStage==='lower-letter').children[0].parts;
 for(const [bar,backwards] of [[route[1],false],[[...route[1]].reverse(),true]]){
  draw(surface.canvas,[route[0],bar]);
  assert.equal(surface.output.dataset.direction,backwards?'backward':'correct',level+' lowercase Э middle bar');
  clear(surface);
 }
}
for(const text of ['Оо','Жж']){
 const result=run(`(()=>{
  const sequence=LetterSequence.compose(${JSON.stringify(text)},DrawingGlyphs);
  const options={width:sequence.width,height:sequence.height};
  const check=route=>StrokeDirection.assess(route.map(line=>line.map(([x,y])=>[x/sequence.width,y/sequence.height])),sequence.model,options);
  return [check(StrokeDirection.route(sequence.model)).backwards,check(StrokeDirection.alternatives.get(sequence.model)).backwards];
 })()`);
 assert.deepEqual(plain(result),[false,false],text+' old routes still accepted');
}
assert.equal(run(`(()=>{
 const s=LetterSequence.compose('ао',DrawingGlyphs);
 const lines=s.glyphs.flatMap(({x,y},i)=>{
  const route=DrawingGlyphs[i===0?'а':'о'].demonstration;
  const a=route[0];
  return (i===0?[a.slice(0,40),a.slice(39)]:route).map(line=>line.map(([px,py])=>[(px+x)/s.width,(py+y)/s.height]));
 });
 return StrokeDirection.assess(lines,s.model,{width:s.width,height:s.height}).backwards;
})()`),false,'resume a paused loop in a word containing a letter with an alternate route');
const vertical=[[[45,40],[45,140]]],normal=vertical.map(l=>l.map(([x,y])=>[x/150,y/180]));
assert.equal(run(`StrokeDirection.assess(${JSON.stringify(normal)},${JSON.stringify(vertical)}).backwards`),false);
assert.equal(run(`StrokeDirection.assess(${JSON.stringify(normal.map(l=>[...l].reverse()))},${JSON.stringify(vertical)}).backwards`),true);
// A long teaching stroke needs more than the screen minimum, independently of another stroke.
for(const [length,reverse,expected] of [[300,12,false],[300,18,true],[100,8,false],[100,12,true]]){
 const model=[[[45,20],[45,20+length]],[[90,20],[90,370]]];
 const ink=[[[45,20],[45,60],[45,60-reverse],[45,20+length]],model[1]];
 const check=run(`StrokeDirection.assess(${JSON.stringify(ink.map(line=>line.map(([x,y])=>[x/150,y/400])))},${JSON.stringify(model)},{width:150,height:400})`);
 assert.equal(check.backwards,expected,length+' long with '+reverse+' back');
}
for(const text of ['б','ба']){
 const result=run(`(()=>{
  const sequence=LetterSequence.compose(${JSON.stringify(text)},DrawingGlyphs);
  const options={width:sequence.width,height:sequence.height};
  const check=route=>StrokeDirection.assess(route.map(line=>line.map(([x,y])=>[x/sequence.width,y/sequence.height])),sequence.model,options);
  const current=StrokeDirection.route(sequence.model),previous=StrokeDirection.alternatives.get(sequence.model);
  return [check(current).backwards,check(previous).backwards,check(current.map(line=>[...line].reverse())).backwards];
 })()`);
 assert.deepEqual(plain(result),[false,false,true],text+' connected and earlier split form');
}
assert.equal(run(`(()=>{
 const s=LetterSequence.compose('бб',DrawingGlyphs),glyph=DrawingGlyphs.б;
 const lines=s.glyphs.flatMap(({x,y},i)=>(i===0?glyph.demonstration:glyph.instruction.alternateDirection).map(l=>l.map(([a,b])=>[(a+x)/s.width,(b+y)/s.height])));
 return StrokeDirection.assess(lines,s.model,{width:s.width,height:s.height}).backwards;
})()`),false,'connected and split б can coexist in a word');
for(const text of ['ААА','СОК','её ЯЯ']){
 const composed=run(`LetterSequence.compose(${JSON.stringify(text)},DrawingGlyphs,{gap:20,maxWidth:150})`),routes=plain(run(`StrokeDirection.route(LetterSequence.compose(${JSON.stringify(text)},DrawingGlyphs,{gap:20,maxWidth:150}).model)`));
 const check=lines=>run(`(()=>{const sequence=LetterSequence.compose(${JSON.stringify(text)},DrawingGlyphs,{gap:20,maxWidth:150});return StrokeDirection.assess(${JSON.stringify(lines.map(l=>l.map(([x,y])=>[x/composed.width,y/composed.height])))},sequence.model,{width:sequence.width,height:sequence.height})})()`);
 assert.equal(check(routes).backwards,false,text+' correct');assert.equal(check(routes.map(l=>[...l].reverse())).backwards,true,text+' reverse');
}
assert.equal(run('drawingGeometryRevision'),'4633c1e3');assert(run("LearnerExperience.profile('x').includes('direction:9')"));
// Mount every authored main and optional warmup on a single real-component fixture.
const warmupFixture=boot({});
const warmupRun=code=>warmupFixture.run(code);
let totalWarmups=0,wholeWarmups=0,authoredMatches=0;
for(const level of ['easy','standard','precise']){
 warmupRun(`LearnerExperience.setLevel('${level}')`);
 const cases=warmupRun(`(()=>{
  const root=document.createElement('section'),cases=[];
  const normalize=lines=>lines.map(line=>line.map(([x,y])=>[x/150,y/180]));
  for(const letter of LetterCurriculum.order){
   WorksheetCatalog.setLetterSources(DrawingGlyphs,letter);
   registerTeachingDirections();
   for(const part of WorksheetCatalog.elements){
    const glyph=DrawingGlyphs[part.letters[0]],model=part.model;
    const row=PracticeElement.mount({root,definition:part,repeats:1,
     addCell:(row,id,model,label)=>PracticeElement.createCell({row,id,model,label,guide,setupSurface,preferences,rulingLevels})});
    const direction=StrokeDirection.route(model);
    const shown=part.teachingRoute||(part.sourceKind==='demonstration'?model:direction);
    const whole=JSON.stringify(glyph.model)===JSON.stringify(model);
    // Infer matching strokes independently from their visible geometry.
    // Reading only the grader's route would let the Ы bug pass again.
    const strokes=glyph.demonstration.filter(line=>evaluate(normalize([line]),model,2.5).precision>=.97);
    let authored=strokes.length&&evaluate(normalize(strokes),model,2.5).coverage>=.95?strokes:null;
    if(part.id==='gost-b90-a-body'||part.id==='gost-b90-a-stem'){
     // The two paths meet at the loop closure. Their explicit model boundary
     // avoids picking up the next stroke where both fit the same corridor.
     authored=[glyph.model[part.sourceStroke]];
    }else if(!authored){
     const trimmed=TraceFeedback.sample(glyph.demonstration,1.5).flatMap(stroke=>{
      const spans=[];let span=[];
      for(const point of stroke){
       if(TraceFeedback.distance(point,model)<=2.5)span.push(point);
       else if(span.length){spans.push(span);span=[]}
      }
      if(span.length)spans.push(span);
      return spans.filter(line=>line.length>=6);
     });
     const similarity=evaluate(normalize(trimmed),model,3);
     if(similarity.coverage>=.95&&similarity.precision>=.95)authored=trimmed;
    }
    cases.push({id:part.id,cell:row.children[0],direction,shown,whole,authored,
       legacy:part.teachingRoute?model:null,matchesWhole:direction===StrokeDirection.route(glyph.model),scale:preferences.size/100});
   }
  }
  return cases;
 })()`);

 const length=points=>points.slice(1).reduce((n,[x,y],i)=>n+Math.hypot(x-points[i][0],y-points[i][1]),0);
 const directionOfArrow=(stroke,chevron)=>{
  const [a,tip,b]=chevron,[tx,ty]=tip,dx=tx-(a[0]+b[0])/2,dy=ty-(a[1]+b[1])/2;
  return stroke.slice(1).some(([x,y],i)=>{
   const [sx,sy]=stroke[i],vx=x-sx,vy=y-sy,magnitude=Math.hypot(vx,vy);
   if(!magnitude)return false;
   const u=Math.max(0,Math.min(1,((tx-sx)*vx+(ty-sy)*vy)/magnitude**2));
   return Math.hypot(tx-sx-u*vx,ty-sy-u*vy)<2.2&&(vx*dx+vy*dy)/magnitude/Math.hypot(dx,dy)>.45;
  });
 };
 for(const {id,cell,direction,shown,whole,authored,legacy,matchesWhole,scale} of cases){
  const context=`${level} ${id}`,parts=cell.parts;
  if(level==='standard'){
   totalWarmups++;
   if(whole){wholeWarmups++;assert(matchesWhole,context+' should use the whole letter route')}
   if(authored)authoredMatches++;
  }
  const check=(trace,backwards,label)=>{
   draw(parts.canvas,trace);
   assert.equal(parts.output.dataset.direction,backwards?'backward':'correct',context+' '+label);
   clear(parts);
  };
  if(id==='gost-b90-437-part-2')assert(direction[0][0][0]>direction[0].at(-1)[0],'З retains its right-to-left arrow');
  const arrows=[...cell.html.matchAll(/class="warmup-arrow" data-warmup-stroke="(\d+)" d="M([^ ]+) ([^ ]+) L([^ ]+) ([^ ]+) L([^ ]+) ([^"]+)"/g)];
  for(const [i,line] of shown.entries()){
   const arrow=arrows.find(m=>Number(m[1])===i);
   if(length(line)>=8)assert(arrow,context+' missing arrow for stroke '+i);
   if(arrow){
    const [ax,ay,tx,ty,bx,by]=arrow.slice(2).map(Number);
    assert(directionOfArrow(line,[[ax,ay],[tx,ty],[bx,by]]),context+' arrow points away from stroke '+i);
   }
  }
  check(shown,false,'follow the visible route');
  assert(authored,context+' is missing its independent reference');
  check(authored,false,'follow the matching strokes from the letter demonstration');
  if(legacy)check(legacy,false,'keep the complete previously taught contact');
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const moved=shown.map(stroke=>stroke.map(([x,y])=>[x+dx/scale,y+dy/scale]));
   check(moved,false,'a one-pixel offset must not reverse direction');
  }
  if(direction.some(line=>length(line)*scale>=10))check(direction.map(line=>[...line].reverse()),true,'reverse the route');
  if(id==='gost-b90-42b-part-0'||id==='gost-b90-44b-part-0'){
   check([shown[0],[...shown[1]].reverse()],true,'reverse only the rounding while correctly drawing the stem');
  }
 }
}
assert.equal(totalWarmups,120);
assert.equal(wholeWarmups,22);
assert.equal(authoredMatches,totalWarmups);
console.log(`PASS: ${totalWarmups} mounted warmups across three difficulty levels, ${authoredMatches} independently matched glyph routes, visible arrow directions, small offsets and reverse strokes`);
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
