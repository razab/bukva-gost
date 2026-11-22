const {fillControlProbes}=require('./helpers/finish-probes.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const h=fs.readFileSync(path.join(__dirname,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0];
const boot=saved=>new Function('require','__dirname',h+"return boot(arguments[2],'learner');")(require,__dirname,saved);
{
 let page=boot({});
 const toggle=key=>{const control=page.nodes['parent-show-'+key];control.checked=!control.checked;control.onchange()};
 const extra=()=>page.nodes.practice.children.find(row=>row.id==='additional-practice');
 assert.equal(page.run('preferences.tolerance'),4);
 assert.equal(page.run('document.body.dataset.showSchemes'),'false');
 assert.equal(extra(),undefined);
 assert.equal(page.nodes['try-independent'].hidden,true);
 page.nodes['try-independent'].onclick();
 assert(!page.nodes.practice.children.some(row=>row.id==='independent-practice'));
 toggle('schemes');
 assert.equal(page.run('document.body.dataset.showSchemes'),'true');
 assert.equal(extra(),undefined);
 toggle('additional');
 assert(extra()&&!extra().open);
 toggle('independent');
 assert.equal(page.nodes['try-independent'].hidden,false);
 page.nodes['try-independent'].onclick();
 const id='independent-gost-b90-А';
 page.run(`data[${JSON.stringify(id)}]=[[[.5,.3],[.5,.6]]];save();refresh()`);
 toggle('independent');
 assert.equal(page.run('LearnerExperience.work().independent'),0);
 assert.equal(page.run(`data[${JSON.stringify(id)}].length`),1);
 page=boot(page.saved);
 assert.equal(page.run('document.body.dataset.showSchemes'),'true');
 assert(extra()&&!extra().open);
 assert.equal(page.nodes['try-independent'].hidden,true);
 toggle('independent');
 page.nodes['try-independent'].onclick();
 assert.equal(page.run('LearnerExperience.work().independent'),1);
 page.run("build(0,'Б')");
 assert.equal(page.nodes['try-independent'].hidden,false);
 assert(extra());
 console.log('PASS: three independent settings default off, toggle through controls, persist and restore existing independent work');
}

{
 let page=boot({'drawing-active-letter-v1':'Б'});
 const id='gost-file-b90-upper-0',finish=()=>page.nodes['finish-session'];
 const assessed=()=>page.run(`surfaces.find(s=>s.id==="${id}").assessment().score`);
 const completion=()=>page.run('LearnerExperience.completion()');
 const textId=page.run('surfaces.find(s=>s.required&&s.id.includes("sequence-v2")).id');
 const drawOffset=target=>{
  for(let dx=0;dx<=12;dx+=.1){
   page.run(`data["${id}"]=demonstrationFor(models).map(line=>line.map(([x,y])=>[(x+${dx})/150,y/180]));refresh(["${id}"])`);
   if(assessed()===target){page.run('save();refresh()');return;}
  }
  assert.fail('Could not create a real '+target+' percent assessment');
 };
 assert.equal(finish().disabled,true);
 assert.equal(page.nodes['next-letter'].attrs['aria-label'],'Следующая буква: Г');
 fillControlProbes(page,{skip:[textId]});
 assert(completion().total>6);
 assert.equal(completion().passed,completion().total-1);
 assert.equal(finish().disabled,true,'An empty text probe blocks finishing');
 fillControlProbes(page);
 drawOffset(94);
 assert.equal(finish().disabled,true,'94 is below the cutoff');
 assert(page.run('LearnerExperience.work().traceScore')>95,'The average is not the gate');
 assert.equal(page.run('LearnerExperience.finish()'),false);
 assert.equal(page.run('LearnerExperience.store().summary().sessions'),0);
 drawOffset(95);
 assert.equal(assessed(),95);
 assert.equal(finish().disabled,false);
 assert.equal(page.nodes['finish-progress'].hidden,true);
 assert.equal(page.run('LearnerExperience.finish()'),true);
 assert.equal(page.run('LearnerExperience.store().summary().sessions'),1);
 page=boot(page.saved);
 assert.equal(finish().disabled,false);
 page.run(`reset("${id}")`);
 assert.equal(finish().disabled,true);
 page.nodes.undo.onclick();
 assert.equal(finish().disabled,false);
 page.run("build(0,'Ъ')");
 assert.equal(page.nodes['next-letter'].hidden,true);
 console.log('PASS: every guided control probe must reach 95%, including text; 94/95, finish guard, reset, undo, reload and course transition');
 if(process.env.FINISH_AT_95_CANARY==='1')process.exit(0);
}
const saved={'letter-preferences-v1':JSON.stringify({size:61,bold:100,tolerance:3,rowGap:4,columnGap:12,letterGap:20,letterGapDefaultVersion:2}),'letter-worksheet-v3-0':JSON.stringify({'old-note':[[[.1,.2],[.3,.4]]]})};
let app=boot(saved),run=s=>app.run(s);assert.equal(run('learnerMode'),true);assert.equal(run('preferences.size'),52);assert.equal(JSON.parse(saved['letter-preferences-v1']).size,61);assert.equal(run('data["old-note"].length'),1);
const row=stage=>app.nodes.practice.children.find(r=>r.dataset.lessonStage===stage);
function fire(canvas,type,p){const frame=JSON.parse(canvas.attrs['data-view-box']),r=canvas.getBoundingClientRect();canvas.emit(type,[(p[0]-frame.x)/frame.width*r.width,(p[1]-frame.y)/frame.height*r.height])}
function draw(canvas,stroke){fire(canvas,'pointerdown',stroke[0]);for(const p of stroke.slice(1))fire(canvas,'pointermove',p);fire(canvas,'pointerup',stroke.at(-1))}
// The actual developer control changes only guided letters and enabled parts.
{
 const practiceRows=(root=app.nodes.practice)=>root.children.flatMap(n=>[
  ...(/^(upper|lower)-(letter|elements)$/.test(n.dataset.lessonStage)?[n]:[]),
  ...practiceRows(n)
 ]);
 const otherFields=()=>run('JSON.stringify(surfaces.map(s=>s.id).filter(id=>!/^(gost-file-b90-|element-v1-)/.test(id)))');
 const setRepeats=value=>{const select=app.nodes['setting-practiceRepeats'];select.value=String(value);select.onchange()};
 app=boot({});
 run("LearnerExperience.setOption('additional',true);LearnerExperience.setOption('independent',true)");
 run('editComposition({elements:composition.get(0).elements.slice(1).map(e=>({...e,repeats:4}))})');
 app.nodes['try-independent'].onclick();
 app.nodes['open-developer'].onclick();
 const expectedRows=practiceRows().map(r=>[r.dataset.lessonStage,r.dataset.component]);
 const expectedCounts=practiceRows().map(r=>r.children.length),originalOther=otherFields();
 const composition=app.saved['gost-learner-composition-v1-410'];
 const assertBlank=({canvas,output,button,ink})=>{
  assert.equal(run(`data[${JSON.stringify(canvas.attrs['data-surface-id'])}]?.length||0`),0);
  assert.equal(ink.innerHTML,'');
  assert.equal(output.textContent,'—');
  assert.equal(output.disabled,true);
  assert.equal(button.hidden,true);
 };
 for(const row of practiceRows())for(const cell of row.children)assertBlank(cell.parts);
 const originalCell=row('upper-letter').children[0].parts;
 for(const line of run('demonstrationFor(models)'))draw(originalCell.canvas,line);
 setRepeats(5);
 for(const r of practiceRows()){
  assert.equal(r.children.length,5);
  for(const [index,cell] of r.children.entries()){
   if(r.dataset.lessonStage==='upper-letter'&&index===0){
    assert.equal(cell.parts.output.textContent,'100%');
    assert.match(cell.parts.ink.innerHTML,/<path d="M/);
    assert.equal(cell.parts.canvas.style.opacity,'0');
   }
   else assertBlank(cell.parts);
  }
 }
 setRepeats(6);
 assert.deepEqual(practiceRows().map(r=>[r.dataset.lessonStage,r.dataset.component]),expectedRows);
 assert(practiceRows().every(r=>r.children.length===6));
 assert(app.nodes['element-picker'].children.every(r=>r.children[3].disabled));
 assert.equal(otherFields(),originalOther);
 assert.equal(row('upper-letter').children[0].parts.output.textContent,'100%');
 const lastCell=row('upper-letter').children[5].parts;
 for(const line of run('demonstrationFor(models)'))draw(lastCell.canvas,line);
 setRepeats(2);
 assert(practiceRows().every(r=>r.children.length===2));
 assert.equal(otherFields(),originalOther);
 assert.equal(row('upper-letter').children[0].parts.output.textContent,'100%');
 setRepeats(6);
 assert.equal(row('upper-letter').children[5].parts.output.textContent,'100%');
 setRepeats(0);
 assert.deepEqual(practiceRows().map(r=>r.children.length),expectedCounts);
 assert(app.nodes['element-picker'].children.some(r=>!r.children[3].disabled));
 assert.equal(app.saved['gost-learner-composition-v1-410'],composition);
 for(const boundary of [1,10]){
  setRepeats(boundary);
  assert(practiceRows().every(r=>r.children.length===boundary));
 }
 run("build(0,'О')");
 assert(practiceRows().every(r=>r.children.length===10));
 app=boot(app.saved);
 assert.equal(run('activeLetter'),'О');
 assert.equal(Number(app.nodes['setting-practiceRepeats'].value),10);
 assert(practiceRows().every(r=>r.children.length===10));
 app.nodes['settings-defaults'].onclick();
 assert(practiceRows().every(r=>r.children.length===3));
 console.log('PASS: global practice repeats on letters and parts, unchanged composition/text/independent, hidden ink returns, bounds, other lesson, reload and defaults');
 if(process.env.PRACTICE_REPEATS_CANARY==='1')process.exit(0);
 app=boot(saved);
}
{
 const retired='gost-b90-431-route-v2-0',loop='gost-b90-431-part-8';
 const oldId='element-v1-'+retired+'-0',silhouette=[[[.4,.3],[.56,.3]]];
 const savedBe={'drawing-active-letter-v1':'Б','gost-learner-ui-preferences-v1':JSON.stringify({options:{additional:true}})};
 app=boot(savedBe);
 const beKey=run('worksheetStorageKey()');
 savedBe[beKey]=JSON.stringify({[oldId]:silhouette});
 savedBe['gost-learner-composition-v1-411']=JSON.stringify({version:1,variants:{0:{
  elementsVersion:2,elements:[{component:retired,repeats:3},{component:loop,repeats:5}]
 }}});
 app=boot(savedBe);
 assert.deepEqual(JSON.parse(run('JSON.stringify(composition.get(0).elements)')),[{component:loop,repeats:5}]);
 assert.equal(row('lower-elements').dataset.component,loop);
 assert.equal(row('lower-elements').children.length,5);
 assert.equal(row('lower-letter').children.length,3);
 const extra=app.nodes.practice.children.find(e=>e.id==='additional-practice');
 assert(extra,'Additional text practice is still available');
 const parts=extra.children[1].children;
 assert(parts.some(r=>r.dataset.component==='letter-sequence'));
 assert(!parts.some(r=>r.dataset.component?.startsWith('gost-b90-431-')));
 assert.equal(run(`surfaces.some(s=>s.id===${JSON.stringify(oldId)})`),false);
 assert.deepEqual(JSON.parse(savedBe[beKey])[oldId],silhouette);
 run(`LearnerExperience.attempts().record({letter:'Б',id:${JSON.stringify(oldId)},label:'Прежний элемент',profile:LearnerExperience.profile(${JSON.stringify(oldId)}),strokes:data[${JSON.stringify(oldId)}],score:30})`);
 assert.equal(run("LearnerExperience.attempts().tasks('Б').length"),1);
 assert.equal(run("LearnerExperience.comparableAttempts('Б').length"),0);
 if(process.env.RETIRED_FRAGMENTS_CANARY==='1')process.exit(0);
 app=boot(saved);
}
let cell=row('upper-letter').children[0].parts,model=run('demonstrationFor(models)');draw(cell.canvas,model[0]);assert.equal(cell.output.dataset.band,'red');assert.equal(app.nodes['finish-session'].disabled,true);for(const line of model.slice(1))draw(cell.canvas,line);assert.equal(cell.output.textContent,'100%');assert.equal(cell.output.dataset.band,'green');
cell.output.onclick();assert.equal(cell.button.hidden,false);cell.button.onclick();assert.equal(cell.output.textContent,'—');app.nodes.undo.onclick();assert.equal(cell.output.textContent,'100%');
fillControlProbes(app);assert.equal(app.nodes['finish-session'].disabled,false);
const tracing=run('JSON.stringify(data)');run("LearnerExperience.setOption('independent',true)");app.nodes['try-independent'].onclick();let block=app.nodes.practice.children.find(r=>r.id==='independent-practice');assert(block);let independent=block.children[1].children[1].parts;assert(!independent.canvas.attrs['data-surface-id'].includes('upper-0'));assert(!block.children[1].children[1].html.includes('class="corridor"'));assert.equal(independent.output.textContent,'—');
const lower=run('demonstrationFor(lowercase)');for(const line of lower)draw(independent.canvas,line);assert.equal(independent.output.textContent,'100%');assert.equal(run('LearnerExperience.work().independent'),1);assert.equal(run('data["gost-file-b90-upper-0"].length'),run('demonstrationFor(DrawingGlyphs.А.model).length'));
app.nodes['finish-session'].onclick();assert.equal(app.nodes['session-result'].attrs.open,'');assert.equal(run('LearnerExperience.store().summary().sessions'),1);app.nodes['finish-session'].onclick();assert.equal(run('LearnerExperience.store().summary().sessions'),1);assert.equal(run('LearnerExperience.store().sessions("А")[0].independentScore'),100);app.nodes['result-next'].onclick();assert.equal(run('activeLetter'),'О');assert.equal(run('LearnerExperience.independent'),false);assert.equal(run('data["old-note"]'),undefined);
run("build(0,'А')");assert.equal(run('data["old-note"].length'),1);app=boot(saved);run=s=>app.run(s);assert.equal(run('LearnerExperience.store().summary().sessions'),1);assert.equal(run('data["gost-file-b90-upper-0"].length'),run('demonstrationFor(DrawingGlyphs.А.model).length'));assert.equal(run('data["independent-gost-b90-а"].length'),lower.length);assert.equal(run('LearnerExperience.independent'),false);
// A partial attempt survives but cannot finish the lesson.
run("build(0,'О')");cell=row('lower-letter').children[0].parts;model=run('demonstrationFor(lowercase)');draw(cell.canvas,model[0].slice(0,4));app.nodes['finish-session'].onclick();assert.equal(run('LearnerExperience.store().summary().sessions'),1);fillControlProbes(app,{replace:true});app.nodes['finish-session'].onclick();assert.equal(run('LearnerExperience.store().summary().sessions'),2);assert.equal(run('LearnerExperience.store().sessions("О").length'),1);
{
 const course=boot({});
 course.run("build(0,'У');configure({practiceRepeats:5})");
 fillControlProbes(course);
 const score=course.nodes.practice.children.find(r=>r.dataset.lessonStage==='lower-letter').children[0].parts.output;
 const id='gost-file-b90-lower-0';
 for(const percent of [93,94,95]){
  const exact=course.run(`(()=>{
   const target=surfaces.find(s=>s.id==='${id}');
   for(let dx=0;dx<14;dx+=.1){
    data['${id}']=demonstrationFor(lowercase).map(line=>line.map(([x,y])=>[(x+dx)/150,y/180]));
    refresh(['${id}']);
    if(target.assessment().score===${percent})return true;
   }
   return false;
  })()`);
  assert.equal(exact,true,percent+' must be generated by the real geometry evaluator');
  assert.equal(score.textContent,percent+'%');
  assert.equal(score.dataset.band,percent===95?'green':'red');
  assert.deepEqual(JSON.parse(course.run('JSON.stringify(LearnerExperience.completion())')),
   {passed:percent===95?14:13,total:14,ready:percent===95});
  assert.equal(course.nodes['finish-session'].disabled,percent!==95);
 }
}
console.log('PASS canary: old ink/settings preserved; red below the pass threshold after pen-up; reset/undo; separate unguided practice; partial work stays open; idempotent completion/reload/next/return; no mastery claim');
if(process.env.LEARNER_CANARY_ONLY==='1')process.exit(0);
const order=run('LetterCurriculum.order');
const retainedParts={
 'Б':['gost-b90-431-part-8'],
 'Ж':['gost-b90-416-part-3','gost-b90-436-part-2'],
 'Ё':['gost-b90-401-dots','gost-b90-451-dots'],
 'Й':['gost-b90-419-practice-v3-top-mark','gost-b90-439-route-v2-1'],
 'Э':['gost-b90-42d-part-1','gost-b90-44d-part-1']
};
for(const letter of order){run(`build(0,${JSON.stringify(letter)})`);assert.equal(app.nodes.letters.children.length,0);assert.equal(app.nodes['lesson-grid'].children.length,33);assert(app.nodes.practice.children.some(r=>r.dataset.lessonStage==='lower-elements'));assert(app.nodes.practice.children.some(r=>r.dataset.lessonStage==='upper-elements'));assert.equal(row('lower-letter').children.length,3);assert.equal(row('upper-letter').children.length,3);assert(run('LearnerExperience.layout(composition.defaults(0)).textRows.every(r=>LetterCurriculum.canUseText(activeLetter,r.text))'));assert.equal(run('data["gost-file-b90-upper-0"]?.length||0')>=0,true);
 const registered=Array.from(run('WorksheetCatalog.elements.map(p=>p.id)'));
 for(const id of retainedParts[letter]||[])assert(registered.includes(id),letter+' keeps '+id);
 assert.equal(run('surfaces.some(s=>WorksheetCatalog.isRetiredTrial(s.id))'),false,letter+' offers a retired trial');
 if(letter==='Ж')assert.equal(registered.length,2,'Ж/ж warmups retain only the central stems');
}
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),dev=html.match(/<dialog id="developer-panel"[\s\S]*?<\/dialog>/)[0];for(const id of ['picture-picker','element-picker','sequence-picker','setting-size','setting-bold','setting-leftInset','setting-rowGap','setting-columnGap','setting-letterGap','clear-all'])assert(dev.includes('id="'+id+'"'),id+' missing from developer popup');assert(!/<dialog id="developer-panel"[^>]*\sopen(?:\s|>)/.test(html));assert(dev.includes('id="setting-tolerance"'));assert(!html.includes('parent-full-guide'));assert(html.includes('Буквы по ГОСТ'));
// Corrupt history is recoverable and does not touch existing worksheet storage.
const corrupt=boot({...saved,'gost-learning-progress-v1':'{broken'});assert.equal(corrupt.run('LearnerExperience.store().summary().sessions'),0);assert.equal(corrupt.run('data["old-note"]?.length||0'),0);
console.log('PASS: all33 learner lessons, authored settings and known-letter tasks; technical controls isolated in closed developer popup; corrupted progress recovers');

let errors=0,fail=true,safe={};const progress=app.run('LearningProgress');const journal=new progress({getItem(){return null},setItem(k,v){if(fail)throw Error('full');safe[k]=v}},()=>errors++);journal.finish('А',{traced:1,signature:'same'});assert.equal(journal.lastSaveSucceeded,false);assert.equal(errors,1);fail=false;journal.finish('А',{traced:1,signature:'same'});assert.equal(journal.lastSaveSucceeded,true);assert.equal(journal.summary().sessions,1);assert(safe['gost-learning-progress-v1']);console.log('PASS: storage failure stays recoverable; retry persists without duplicate session');
// Hiding an independent field changes its visibility, not the practiced work.
app=boot({});run=s=>app.run(s);run("LearnerExperience.setOption('independent',true)");app.nodes['try-independent'].onclick();block=app.nodes.practice.children.find(r=>r.id==='independent-practice');independent=block.children[1].children[1].parts;for(const line of run('demonstrationFor(lowercase)'))draw(independent.canvas,line);assert.equal(run('LearnerExperience.work().independent'),1);app.nodes['try-independent'].onclick();assert.equal(run('LearnerExperience.work().independent'),1);assert.equal(app.nodes['finish-session'].disabled,true);fillControlProbes(app);app.nodes['finish-session'].onclick();assert.equal(run('LearnerExperience.store().sessions("А")[0].independent'),1);const hiddenReload=boot(app.saved);assert.equal(hiddenReload.run('LearnerExperience.work().independent'),1);assert.equal(hiddenReload.nodes['finish-session'].disabled,false);console.log('PASS: hidden independent work remains in completion/progress after hide and reload');

// Durations come from real accepted pen intervals, not page-open/idle time.
app=boot({});run=s=>app.run(s);run('measuredTime=0;performance.now=()=>measuredTime');
const timed=(canvas,lines,total)=>{for(const line of lines){run('measuredTime+=100000');fire(canvas,'pointerdown',line[0]);for(const p of line.slice(1))fire(canvas,'pointermove',p);app.context.measuredTime+=total/lines.length;fire(canvas,'pointerup',line.at(-1))}};
let timedUpper=row('upper-letter').children[0].parts,timedLower=row('lower-letter').children[0].parts;
timed(timedUpper.canvas,run('demonstrationFor(models)'),3300);timed(timedLower.canvas,run('demonstrationFor(lowercase)'),4200);
let stats=run('LearnerExperience.statistics(LearnerExperience.work())');assert.equal(stats.upper.meanMs,3300);assert.equal(stats.lower.meanMs,4200);assert.equal(stats.upper.score,100);assert.equal(stats.lower.score,100);
const timeBook=run('worksheetStorageKey()'),timeId=timedUpper.canvas.attrs['data-surface-id'],timedInk=run('JSON.stringify(data)');
timedUpper.output.onclick();timedUpper.button.onclick();assert.equal(run(`writingTimes.duration(${JSON.stringify(timeBook)},${JSON.stringify(timeId)},data[${JSON.stringify(timeId)}])`),null);app.nodes.undo.onclick();assert.equal(run('JSON.stringify(data)'),timedInk);assert.equal(run('LearnerExperience.statistics(LearnerExperience.work()).upper.meanMs'),3300);
fire(timedUpper.canvas,'pointerdown',run('models[0][0]'));run('measuredTime+=90000');fire(timedUpper.canvas,'pointercancel',run('models[0][0]'));assert.equal(run('LearnerExperience.statistics(LearnerExperience.work()).upper.meanMs'),3300);
timed(timedUpper.canvas,[run('models[0]')],700);assert.equal(run('LearnerExperience.statistics(LearnerExperience.work()).upper.meanMs'),4000);app.nodes.undo.onclick();assert.equal(run('LearnerExperience.statistics(LearnerExperience.work()).upper.meanMs'),3300);
let warm=app.nodes.practice.children.find(r=>r.dataset.lessonStage==='lower-elements').children[0].parts;warm.canvas.emit('pointerdown',[1,1]);warm.canvas.emit('pointerup',[2,2]);const text=app.nodes.practice.children.find(r=>r.dataset.component==='letter-sequence'),textModel=run(`LetterSequence.compose(${JSON.stringify(text.attrs['aria-label'])},sequenceSources,{gap:preferences.letterGap}).model`);timed(text.children[0].parts.canvas,textModel,5000);
run("LearnerExperience.setOption('independent',true)");app.nodes['try-independent'].onclick();block=app.nodes.practice.children.find(r=>r.id==='independent-practice');timed(block.children[1].children[1].parts.canvas,run('demonstrationFor(lowercase)'),12000);
fillControlProbes(app);
const controlCount=run('LearnerExperience.completion().total');
stats=run('LearnerExperience.statistics(LearnerExperience.work())');assert.equal(stats.overall.count,controlCount+1);assert.equal(stats.overall.score,run('LearnerExperience.work().traceScore'));assert(stats.overall.score<100);assert.equal(stats.upper.count,3);assert.equal(stats.lower.count,3);assert.equal(stats.upper.meanMs,3300);assert.equal(stats.lower.meanMs,4200);
app.nodes['finish-session'].onclick();assert(app.nodes['result-statistics'].innerHTML.includes('3,3 с'));assert(app.nodes['result-statistics'].innerHTML.includes('4,2 с'));assert(app.nodes['result-statistics'].innerHTML.includes('<dd>Обычно</dd>'));const finishedStats=run('LearnerExperience.store().sessions("А").at(-1).statistics');assert.equal(finishedStats.overall.count,controlCount+1);const finishedCount=run('LearnerExperience.store().summary().sessions');app.nodes['finish-session'].onclick();assert.equal(run('LearnerExperience.store().summary().sessions'),finishedCount);
const restoredTimes=boot(app.saved);assert.equal(restoredTimes.run('LearnerExperience.statistics(LearnerExperience.work()).upper.meanMs'),3300);assert.equal(restoredTimes.run('LearnerExperience.store().sessions("А").at(-1).statistics.lower.meanMs'),4200);
run('configure({tolerance:2})');app.nodes['finish-session'].onclick();assert(app.nodes['result-statistics'].innerHTML.includes('<dd>Идеально</dd>'));run('configure({tolerance:3.5})');app.nodes['finish-session'].onclick();assert(app.nodes['result-statistics'].innerHTML.includes('Свой допуск ±3,5 px'));assert.equal(run('LearnerExperience.store().sessions("А")[0].statistics.tolerance'),4);
// Old strokes have percentages but no fabricated zero-second duration.
const legacy=boot({'letter-worksheet-v3-0':JSON.stringify({'gost-file-b90-upper-0':run('demonstrationFor(models)').map(line=>line.map(([x,y])=>[x/150,y/180]))})});assert.equal(legacy.run('LearnerExperience.statistics(LearnerExperience.work()).upper.count'),1);assert.equal(legacy.run('LearnerExperience.statistics(LearnerExperience.work()).upper.meanMs'),null);fillControlProbes(legacy);legacy.nodes['finish-session'].onclick();assert(legacy.nodes['result-statistics'].innerHTML.includes('время —'));
console.log('PASS session summary: difficulty/manual tolerance, separate100%/3.3s and100%/4.2s, idle excluded, cancellation/reset/undo/reload, warmup/text overall included, independent excluded, historical snapshots/idempotency and unknown legacy time');

// The picker reports a completed snapshot, never the current unfinished ink.
app=boot({});run=s=>app.run(s);const tileFor=c=>app.nodes['lesson-grid'].children[run('LetterCurriculum.order').indexOf(c)],bandFor=c=>tileFor(c).children.find(n=>n.className==='lesson-rate-track');
for(const line of run('demonstrationFor(models)'))draw(row('upper-letter').children[0].parts.canvas,line);app.nodes['choose-letter'].onclick();assert.equal(bandFor('А'),undefined,'Unfinished perfect ink may not create a success bar');assert.equal(tileFor('А').children[1].textContent,'');fillControlProbes(app);app.nodes['finish-session'].onclick();assert.equal(bandFor('А').dataset.band,'green');assert.equal(tileFor('А').children[1].textContent,'100% · Обычно');
const savedSession=app.saved['gost-learning-progress-v1'];
app.nodes['level-precise'].onclick();
app.nodes['choose-letter'].onclick();
assert.equal(tileFor('А').children[1].textContent,'100% · Обычно');
app.nodes['show-progress'].onclick();
assert.match(app.nodes['progress-list'].children[0].children[1].textContent,/по контуру: 100% · Обычно/);
assert.equal(app.saved['gost-learning-progress-v1'],savedSession);
const reopened=boot(app.saved);
assert.equal(reopened.nodes['level-precise'].attrs['aria-pressed'],'true');
assert.equal(reopened.nodes['lesson-grid'].children[0].children[1].textContent,'100% · Обычно');
assert.match(reopened.nodes['progress-list'].children[0].children[1].textContent,/по контуру: 100% · Обычно/);
assert.equal(reopened.run('LearnerExperience.difficulty(4)'), 'Точнее');
assert.equal(reopened.run('LearnerExperience.difficulty(4,"standard")'), 'Обычно');
console.log('PASS: finishing at standard and switching to precise preserves the saved label and score in both views after reload');
app=boot({});run=s=>app.run(s);
run("LearnerExperience.store().finish('А',{traced:1,traceScore:95,signature:'legacy-green',at:1});LearnerExperience.store().finish('О',{traced:1,traceScore:90,signature:'threshold',at:2});LearnerExperience.store().finish('Н',{traced:1,traceScore:0,signature:'zero',at:3});LearnerExperience.store().finish('И',{traced:1,signature:'unknown',at:4});LearnerExperience.store().finish('У',{independent:1,independentScore:100,signature:'independent-only',at:5});LearnerExperience.renderOverview()");
assert.equal(bandFor('А').dataset.band,'green');assert.equal(bandFor('О').dataset.band,'green');assert.equal(bandFor('Н').dataset.band,'yellow');assert.equal(bandFor('Н').style['--lesson-rate'],'0%');for(const c of ['И','У','Т']){assert.equal(bandFor(c),undefined);assert.equal(tileFor(c).children[1].textContent,'')}
run("LearnerExperience.store().finish('А',{traced:1,traceScore:89,signature:'latest-yellow',at:6});LearnerExperience.store().finish('А',{independent:1,independentScore:100,signature:'ignored-independent',at:7});LearnerExperience.renderOverview()");assert.equal(bandFor('А').dataset.band,'yellow');assert.equal(tileFor('А').children[1].textContent,'89% · Сложность не записана');assert(tileFor('А').attrs['aria-label'].includes('89% · Сложность не записана'));assert.match(app.nodes['progress-list'].children[0].children[1].textContent,/по контуру: 89% · Сложность не записана · самостоятельно: 100%/);
run("LearnerExperience.store().finish('К',{traced:1,traceScore:10,signature:'snapshot',at:8,statistics:{version:1,tolerance:2,size:92,bold:100,upper:{count:1,score:97,meanMs:null,timedCount:0},lower:{count:0,score:null,meanMs:null,timedCount:0},overall:{count:1,score:97}}});LearnerExperience.renderOverview()");assert.equal(tileFor('К').children[1].textContent,'97% · Идеально');
const journalBefore=app.saved['gost-learning-progress-v1'];app.nodes['level-ideal'].onclick();assert.equal(tileFor('А').children[1].textContent,'89% · Сложность не записана');assert.equal(app.saved['gost-learning-progress-v1'],journalBefore,'Viewing/changing settings does not rewrite completed results');const reloadedRate=boot(app.saved);const afterTile=c=>reloadedRate.nodes['lesson-grid'].children[reloadedRate.run('LetterCurriculum.order').indexOf(c)];assert.equal(afterTile('А').children[1].textContent,'89% · Сложность не записана');assert.equal(afterTile('У').children.length,2);
console.log('PASS letter rates: unfinished hidden, finish updates,90% green boundary,89/0 yellow, latest not best, independent/unknown excluded, statistics/legacy fallback, accessible percentage, reload and profile changes preserve snapshots');
