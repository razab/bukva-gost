const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync(require('node:path').join(__dirname,'../components/worksheet-runtime.js'),'utf8');
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.handlers={};this.textContent='';this.disabled=false;this.style={setProperty(k,v){this[k]=v}}}
 getAttribute(k){return this.attrs[k]} setAttribute(k,v){this.attrs[k]=v} removeAttribute(k){delete this.attrs[k]} append(...xs){this.children.push(...xs)} replaceChildren(){this.children=[]} get innerHTML(){return this.html||''} set innerHTML(s){this.html=s;this.children=[];if(s.includes('class="writing"')){this.parts={canvas:new Element('canvas'),'.writing':new Element(),output:new Element('output'),button:new Element('button')}}}
 get open(){return Object.hasOwn(this.attrs,'open')} set open(v){if(v)this.attrs.open='';else delete this.attrs.open} showModal(){this.attrs.open=''} close(){delete this.attrs.open} querySelector(s){if(s==='[data-close]')return this.closeControl||=new Element('button');if(this.parts&&this.parts[s])return this.parts[s];if(this.parts&&s==='.score')return this.parts.output;if(this.parts&&s==='.correction-layer')return this.parts.correction||=new Element();if(this.parts&&s==='.reset')return this.parts.button;if(s.startsWith('[data-line=')||s==='#pencil'||s==='[data-font-ink]')return new Element();return null}
 querySelectorAll(selector){if(selector==='[data-demo-region]')return [...(this.html||'').matchAll(/data-demo-region="(\d+)" data-reveal-at="([^"]+)"/g)].map(m=>{const n=new Element();n.dataset.demoRegion=m[1];n.dataset.revealAt=m[2];return n});return []}
 addEventListener(k,f){(this.handlers[k]||=[]).push(f)} removeEventListener(k,f){this.handlers[k]=this.handlers[k].filter(x=>x!==f)} setPointerCapture(){} getBoundingClientRect(){const frame=this.attrs['data-view-box']?JSON.parse(this.attrs['data-view-box']):null,scale=Number(this.attrs['data-scale'])||1;return {left:0,top:0,width:frame?frame.width*scale:150,height:frame?frame.height*scale:180,...this.rect}} getContext(){return this.context||=( {setTransform(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})}
 emit(k,p){for(const f of this.handlers[k]||[])f({pointerId:1,button:0,pointerType:'mouse',clientX:p[0],clientY:p[1],preventDefault(){}})}
}
function boot(saved={},mode='editor'){const tasks=new Map();let taskSerial=0;const nodes={};for(const id of ['composition-legacy','developer-panel','open-developer','close-developer','settings-legacy','level-easy','level-standard','level-precise','level-ideal','level-impossible','setting-penWidth','value-penWidth','setting-smoothing','value-smoothing','pen-preview-path','level-current','level-summary','export-backup','import-backup','restore-backup','backup-summary','open-sample','sample-panel','sample-upper','sample-lower','scheme-upper','scheme-lower','hero-scheme-upper','hero-scheme-lower','dock-scheme-upper','dock-scheme-lower','parent-full-guide','choose-letter','show-progress','open-parent','lesson-picker','progress-panel','parent-panel','session-result','parent-stylus-only','finish-session','result-continue','next-letter','result-next','try-independent','session-count','result-summary','result-statistics','result-statistics-note','result-title','lesson-grid','progress-list','progress-summary','configuration-panel','open-settings','close-settings','setting-stylusOnly','letters','letter-title','reference','reference-word','setting-letterGap','value-letterGap','sequence-picker','lesson-default','picture-default','picture-picker','element-picker','setting-rowGap','value-rowGap','setting-leftInset','value-leftInset','setting-columnGap','value-columnGap','setting-size','value-size','setting-bold','value-bold','setting-tolerance','value-tolerance','settings-defaults','message','practice','undo','demo','demo-lower','play','clear-all','art-guide','art-canvas','art-reset'])nodes[id]=new Element();nodes.variants=new Element();const document={body:new Element(),querySelector(s){return nodes[s==='.variants'?'variants':s.slice(1)]},querySelectorAll(s){return s==='.letters button'?nodes.letters.children:nodes.variants.children},createElement:()=>new Element()};const context={document,setTimeout(fn){const id=++taskSerial;tasks.set(id,fn);return id},clearTimeout(id){tasks.delete(id)},structuredClone,console,Math,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}},devicePixelRatio:1,localStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v,removeItem:k=>delete saved[k]}};if(mode==='learner')context.window={WorksheetMode:'learner',scrollY:0,scrollTo(){}};vm.createContext(context);for(const name of ['worksheet-dock','pen-appearance','glyphs','writing-scheme','catalog','letter-references','picture-exercise','row-ruling','practice-element','curriculum','lesson-pictures','letter-sequence','lesson-migration','page-composition','trace-feedback','feedback-jobs','practice-attempts','writing-times','learning-progress','local-backup','learner-experience','developer-panel'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../components',name+'.js'),'utf8'),context);vm.runInContext(script,context);return {context,nodes,saved,flushFeedback(){for(let turns=0;tasks.size;turns++){if(turns>100000)throw Error('Unbounded feedback task loop');const [id,fn]=tasks.entries().next().value;tasks.delete(id);fn()}},pendingFeedback:()=>tasks.size,run:s=>vm.runInContext(s,context)}}
function stageRow(app,stage){return app.nodes.practice.children.find(r=>r.dataset.lessonStage===stage)}
function componentRow(app,id){return app.nodes.practice.children.find(r=>r.dataset.component===id)}
function textRow(app,id='primary'){return app.nodes.practice.children.find(r=>r.dataset.textRowId===id)}
let app=boot();const run=s=>app.run(s);function first(){return stageRow(app,'upper-letter').children[0].parts}function drawScreen(canvas,points){canvas.emit('pointerdown',points[0]);for(const p of points.slice(1))canvas.emit('pointermove',p);canvas.emit('pointerup',points.at(-1))}function draw(canvas,points){const frame=canvas.attrs['data-view-box']?JSON.parse(canvas.attrs['data-view-box']):null,r=canvas.getBoundingClientRect();drawScreen(canvas,frame?points.map(([x,y])=>[(x-frame.x)/frame.width*r.width+r.left,(y-frame.y)/frame.height*r.height+r.top]):points)}
assert.equal(run('surfaces.length'),36);draw(first().canvas,run('models[0]'));assert.notEqual(first().output.textContent,'100%');draw(first().canvas,run('models[1]'));assert.equal(first().output.textContent,'100%');assert.equal(first().button.disabled,false);assert.equal(first().button.hidden,true);first().output.onclick();assert.equal(first().button.hidden,false);first().output.onclick();assert.equal(first().button.hidden,true);
const second=stageRow(app,'upper-letter').children[1].parts;draw(second.canvas,run('models[0]'));first().button.onclick();assert.equal(first().output.textContent,'—');assert.notEqual(second.output.textContent,'—');assert.equal(run('data["gost-file-b90-upper-0"].length'),0);app.nodes.undo.onclick();assert.equal(first().output.textContent,'100%');app.nodes['clear-all'].onclick();assert.equal(first().output.textContent,'—');app.nodes.undo.onclick();assert.equal(first().output.textContent,'100%');
const saved=app.saved;app=boot(saved);assert.equal(first().output.textContent,'100%');run('build(1)');run('build(0)');assert.equal(first().output.textContent,'100%');assert.equal(app.nodes['art-canvas'].handlers.pointerdown.length,1);
first().button.onclick();draw(first().canvas,[...run('models[0]')].reverse());draw(first().canvas,run('models[1]'));assert.equal(first().output.textContent,'100%');
for(let i=0;i<5;i++){run(`build(${i})`);assert(run('surfaces.length')>=10)}
const c=first().canvas;c.emit('pointerdown',[40,135]);c.emit('pointermove',[75,45]);c.emit('pointercancel',[75,45]);assert.equal(run('activePointer'),null);assert.equal(run('data["gost-file-b90-upper-0"]?.length||0'),0);
const warm=componentRow(app,'gost-b90-A-bar').children[0].parts;draw(warm.canvas,run('WorksheetCatalog.elements[0].model[0]'));assert.equal(warm.output.textContent,'100%');
// Lowercase uses its own model, reset and persistent record.
run('build(0)');const lower=stageRow(app,'lower-letter').children[0].parts;
const lowerModel=run('lowercase');draw(lower.canvas,lowerModel[0]);assert.notEqual(lower.output.textContent,'100%');draw(lower.canvas,lowerModel[1]);assert.equal(lower.output.textContent,'100%');
assert.equal(run('data["gost-file-b90-lower-0"].length'),2);const reopened=boot(app.saved);assert.equal(stageRow(reopened,'lower-letter').children[0].parts.output.textContent,'100%');assert(stageRow(reopened,'lower-letter').children[0].html.includes('Буква а'));assert.notEqual(run('evaluate(data["gost-file-b90-lower-0"],models).score'),100);lower.output.onclick();assert.equal(lower.button.hidden,false);lower.button.onclick();assert.equal(lower.output.textContent,'—');
draw(lower.canvas,[...lowerModel[0]].reverse());draw(lower.canvas,lowerModel[1]);assert.equal(lower.output.textContent,'100%');
for(let i=0;i<5;i++){const check=boot();check.run(`build(${i})`);assert(stageRow(check,'lower-letter').children[0].html.includes('Буква а'))}
const clock=run('demoClock(lowercase)');assert(clock.at(clock.segments[0].end+1).pen);assert.equal(clock.segments[0].end,clock.segments[1].start);assert(clock.at(clock.segments[1].start+1).pen);
const joined=run('demoClock([[[0,1],[1,0]],[[1,0],[2,1]]])');assert.equal(joined.segments[0].end,joined.segments[1].start);assert(joined.at(joined.segments[1].start).pen);
console.log('PASS: incomplete/full/reverse scoring; geometric scoring independent of direction; isolated resets; undo; reset-all without dialog; reload; five layouts; listener cleanup; cancelled input; lowercase model/reset/reload; curved animation and joined motion');
if(process.env.LETTER_MODEL_PROBE)fs.writeFileSync(process.env.LETTER_MODEL_PROBE,JSON.stringify(run('({upper:models,lower:lowercase})')));

assert.equal(run('names[2]'),'Мозаика');assert.equal(new Set(run('artExercises.map(a=>a.id)')).size,40);
for(let i=0;i<5;i++){run(`build(${i})`);const selected=run(`WorksheetCatalog.pictures.find(p=>p.id===composition.get(${i}).picture)`);assert(app.nodes['art-guide'].html.includes(selected.trace));assert(app.nodes['art-canvas'].attrs['aria-label'].includes(selected.name))}
// The shared loop has exactly half a second between forms, with no overlap.
const sequence=run('sequenceClock()');
assert.equal(sequence.lowerStart-sequence.upperEnd,500);
let phase=sequence.at(0);assert(phase.upper.pen);assert.equal(phase.lower.pen,null);assert(phase.lower.progress.every(p=>p===0));
for(const elapsed of [sequence.upperEnd,sequence.lowerStart-1]){phase=sequence.at(elapsed);assert(phase.upper.progress.every(p=>p===1));assert.equal(phase.upper.pen,null);assert.equal(phase.lower.pen,null);assert(phase.lower.progress.every(p=>p===0))}
phase=sequence.at(sequence.lowerStart+1);assert.equal(phase.upper.pen,null);assert(phase.lower.pen);assert(phase.lower.progress[0]>0);
phase=sequence.at(sequence.lowerEnd);assert(phase.upper.progress.every(p=>p===1));assert(phase.lower.progress.every(p=>p===1));assert.equal(phase.lower.pen,null);
phase=sequence.at(sequence.duration);assert(phase.upper.pen);assert(phase.lower.progress.every(p=>p===0));
assert(!script.includes("querySelector('#play')"));assert(!fs.readFileSync(require('node:path').join(__dirname,'../../editor/index.html'),'utf8').includes('id="play"'));
run('build(0)');const animationBefore=run('animation');first().canvas.emit('pointerdown',[40,135]);assert.equal(run('animation'),animationBefore);first().canvas.emit('pointercancel',[40,135]);
console.log('PASS: uppercase -> exact 500 ms pause -> lowercase -> repeat; no play control; writing leaves animation running');

assert.equal(run('fontOutlines.length'),2);assert(run('fontOutline(lowercase)').includes(run('fontOutlines[1]')));assert.equal(run('fontScale*1400'),100);

if(process.env.LETTER_REVEAL_PROBE){const payload=run(`({upper:[0,.2,.5,.8,.99,1].map(p=>revealMarkup(models,'upper',[p,p===1?1:0])),lower:[0,.2,.5,.8,.99,1].map(p=>revealMarkup(lowercase,'lower',[p,p===1?1:0])),joins:[0,.01,.25,.5,.75,1].map(p=>revealMarkup(models,'join',[1,p])),expected:[fontOutline(models,'fill="#347356"'),fontOutline(lowercase,'fill="#347356"')],last:[revealMarkup(models,'last',[1,.999]),revealMarkup(lowercase,'last',[1,.999])]})`);fs.writeFileSync(process.env.LETTER_REVEAL_PROBE,JSON.stringify(payload))}
// Settings preserve normalized drawings and chronological undo history.
run('build(0)');first().button.onclick();draw(first().canvas,run('models[0]'));draw(first().canvas,run('models[1]'));
const draftBefore=run('JSON.stringify(data)'),historyBefore=run('history.length');
assert.equal(run('configure({size:160,bold:150,tolerance:12})'),true);
assert.equal(run('JSON.stringify(data)'),draftBefore);assert.equal(run('history.length'),historyBefore);
assert.equal(app.nodes['setting-size'].value,160);assert.equal(app.nodes['value-bold'].textContent,'150%');
const settingsReopen=boot(app.saved);assert.equal(settingsReopen.run('preferences.size'),160);assert.equal(settingsReopen.run('preferences.bold'),150);assert.equal(settingsReopen.run('preferences.tolerance'),12);assert.equal(stageRow(settingsReopen,'upper-letter').children[0].parts.output.textContent,'100%');
const strict=run('evaluate(models.map(s=>s.map(([x,y])=>[(x+6)/150,y/180])),models,3).score'),lenient=run('evaluate(models.map(s=>s.map(([x,y])=>[(x+6)/150,y/180])),models,12).score');assert(lenient>strict);
assert.equal(run('validPreferences({size:999,bold:0,tolerance:NaN}).size'),160);assert.equal(run('validPreferences({size:999,bold:0,tolerance:NaN}).bold'),100);assert.equal(run('validPreferences({size:999,bold:0,tolerance:NaN}).tolerance'),8);
app.nodes['settings-defaults'].onclick();assert.equal(run('preferences.size'),118);assert.equal(run('preferences.bold'),100);assert.equal(run('preferences.tolerance'),8);assert.equal(run('JSON.stringify(data)'),draftBefore);
console.log('PASS: size/bold/tolerance settings persist; drawings and undo retained; tolerance changes score; defaults and invalid values');
if(process.env.LETTER_REVEAL_PROBE){const payload=JSON.parse(fs.readFileSync(process.env.LETTER_REVEAL_PROBE,'utf8'));const thick=run(`(()=>{const before=preferences;preferences={...preferences,bold:150};const out={frames:[models,lowercase].map(m=>revealMarkup(m,'bold',[1,1])),expected:[models,lowercase].map(m=>fontOutline(m,'fill="#347356"')),last:[models,lowercase].map(m=>revealMarkup(m,'bold-last',[1,.999]))};preferences=before;return out})()`);payload.thick=thick;fs.writeFileSync(process.env.LETTER_REVEAL_PROBE,JSON.stringify(payload))}

// Reproduce a previously drawn reverse diagonal: tolerance must regrade it,
// using its real CSS pixel width rather than a fixed model-space distance.
app=boot();run('configure({size:80,tolerance:2})');
function diagonal(){return componentRow(app,'gost-b90-A-rise').children[0].parts}
function actualSize(scale){const frame=JSON.parse(diagonal().canvas.attrs['data-view-box']);diagonal().canvas.rect={width:frame.width*scale,height:frame.height*scale};run('refresh()')}
actualSize(.8);const f=JSON.parse(diagonal().canvas.attrs['data-view-box']);drawScreen(diagonal().canvas,run('WorksheetCatalog.elements[1].model[0]').slice().reverse().map(([x,y])=>[(x-f.x)*.8+6,(y-f.y)*.8]));
const narrowScore=Number(diagonal().output.textContent.replace('%','')),storedLine=run('JSON.stringify(data["element-v1-gost-b90-A-rise-0"])');
run('configure({tolerance:16})');actualSize(.8);const widerScore=Number(diagonal().output.textContent.replace('%',''));assert(widerScore>narrowScore);assert.equal(run('JSON.stringify(data["element-v1-gost-b90-A-rise-0"])'),storedLine);
const normalized=run('JSON.stringify(data)');run('configure({size:160,bold:150})');actualSize(1.6);assert.equal(run('JSON.stringify(data)'),normalized);assert(Math.abs(diagonal().canvas.context.lineWidth*1.6-3)<1e-9);
assert.equal(diagonal().canvas.getBoundingClientRect().width,JSON.parse(diagonal().canvas.attrs['data-view-box']).width*1.6);assert(componentRow(app,'gost-b90-A-rise').children[0].html.includes('stroke-width="15"'));
assert.equal(run('evaluate([[[105/150,40/180],[45/150,130/180]]],[[[45,130],[105,40]]],2).score'),100);
const page=fs.readFileSync(require('node:path').join(__dirname,'../../editor/index.html'),'utf8');assert(!page.includes('var(--cell-width,177px)*.64'));assert(!page.includes('max(100px,calc(var(--cell-width'));
console.log('PASS: saved reverse diagonal regrades with tolerance; physical px conversion; resizing preserves normalized ink; bold affects warm-up guide while pen keeps its own CSS width');

for(const size of [60,80,118,160]){const geom=run(`practiceGeometry(${size})`);assert.equal(geom.width,size*1.5);assert.equal(geom.height,size*1.8)}
for(let i=0;i<5;i++){run(`build(${i})`);assert(componentRow(app,'gost-b90-A-bar').children.every(c=>c.html.includes('data-assessment="geometry"')));assert(stageRow(app,'upper-letter').children.every(c=>c.html.includes('data-assessment="geometry"')));assert(stageRow(app,'lower-letter').children.every(c=>c.html.includes('data-assessment="geometry"')))}
for(const model of [[[[75,40],[75,130]]],[[[40,85],[110,85]]],[[[45,130],[105,40]]],[[[45,40],[105,130]]]]){const source=JSON.stringify(model),forward=run(`evaluate(${source}.map(s=>s.map(([x,y])=>[x/150,y/180])),${source},8).score`),reverse=run(`evaluate(${source}.map(s=>[...s].reverse().map(([x,y])=>[x/150,y/180])),${source},8).score`);assert.equal(forward,100);assert.equal(reverse,forward)}
console.log('PASS: explicit shared dimensions from 60 to 160; all warm-ups geometry-only in five variants; vertical/horizontal/both diagonals score equally in either direction');
// Component canary: choose -> draw -> switch -> reload -> restore; vary repetitions.
app=boot();draw(app.nodes['art-canvas'],[[30,40],[70,90]]);const oldArt=run('JSON.stringify(data["art-kite"])');
app.nodes['picture-picker'].children[1].onclick();assert.equal(run('composition.get(0).picture'),'art-house');assert.equal(run('data["art-house"]?.length||0'),0);draw(app.nodes['art-canvas'],[[60,70],[110,120]]);
app.nodes['picture-picker'].children[0].onclick();assert.equal(run('JSON.stringify(data["art-kite"])'),oldArt);
let count=app.nodes['element-picker'].children[0].children[3];count.value=5;count.onchange();assert.equal(componentRow(app,'gost-b90-A-bar').children.length,5);
draw(componentRow(app,'gost-b90-A-bar').children[4].parts.canvas,run('WorksheetCatalog.elements[0].model[0]'));assert.equal(run('data["element-v1-gost-b90-A-bar-4"].length'),1);
count=app.nodes['element-picker'].children[0].children[3];count.value=3;count.onchange();assert.equal(componentRow(app,'gost-b90-A-bar').children.length,3);assert.equal(run('data["element-v1-gost-b90-A-bar-4"].length'),1);
count=app.nodes['element-picker'].children[0].children[3];count.value=5;count.onchange();assert.equal(componentRow(app,'gost-b90-A-bar').children[4].parts.output.textContent,'100%');
const restoredComposition=boot(app.saved);assert.equal(restoredComposition.run('composition.get(0).picture'),'art-kite');assert.equal(componentRow(restoredComposition,'gost-b90-A-bar').children.length,5);assert.equal(componentRow(restoredComposition,'gost-b90-A-bar').children[4].parts.output.textContent,'100%');
assert.equal(run('composition.validate({elementsVersion:2,picture:"unknown",elements:[{component:"gost-b90-A-bar",repeats:999},{component:"gost-b90-A-bar",repeats:3},{component:"unknown",repeats:4}]},0).elements.length'),1);
assert.equal(run('composition.validate({elementsVersion:2,elements:[]},0).elements.length'),0);
console.log('PASS: component selection, isolated picture drawings, 3/4/5 repetitions, hidden trial restoration, composition reload and invalid IDs');
if(process.env.LETTER_CATALOG_PROBE)fs.writeFileSync(process.env.LETTER_CATALOG_PROBE,JSON.stringify(run('WorksheetCatalog.pictures.map(p=>({id:p.id,name:p.name,svg:WorksheetCatalog.renderPicture(p),fixed:p.fixed,trace:p.trace,completionFraction:p.completionFraction}))')));
// Exercise all gallery choices through their actual click handlers.
app=boot();for(let i=0;i<40;i++){app.nodes['picture-picker'].children[i].onclick();const id=run(`WorksheetCatalog.pictures[${i}].id`);assert.equal(run('composition.get(0).picture'),id);draw(app.nodes['art-canvas'],[[25+i,30],[70,90]]);assert.equal(run(`data[${JSON.stringify(id)}].length`),1);assert.equal(app.nodes['art-canvas'].handlers.pointerdown.length,1)}
const allPictures=boot(app.saved);assert.equal(allPictures.run('composition.get(0).picture'),'art-snowflake');assert.equal(allPictures.run('Object.keys(data).filter(k=>k.startsWith("art-")).length'),40);
app.nodes['picture-picker'].children[0].onclick();app.nodes['art-reset'].onclick();assert.equal(run('data["art-kite"].length'),0);assert.equal(run('data["art-snowflake"].length'),1);
const enabled=app.nodes['element-picker'].children[0].children[0];enabled.checked=false;enabled.onchange();assert.equal(run('composition.get(0).elements.some(e=>e.component==="gost-b90-A-bar")'),false);assert.equal(app.nodes.practice.children.find(r=>r.dataset.lessonStage==='upper-elements').dataset.component,'gost-b90-A-rise');
const reenable=app.nodes['element-picker'].children[0].children[0];reenable.checked=true;reenable.onchange();assert.equal(run('composition.get(0).elements.some(e=>e.component==="gost-b90-A-bar")'),true);
console.log('PASS: all 40 gallery choices, isolated/resettable artwork, reload of selection and 40 drawings, enable/disable element blocks');
// A sequence is one writing surface with real font advances and shared grading.
app=boot();run("composition.update(0,{textRows:[{id:'primary',text:'ААА',repeats:3,enabled:true}],nextTextRowId:1});build(0)");function sequenceCell(){return textRow(app,'primary').children[0].parts}
assert.equal(textRow(app,'primary').dataset.component,'letter-sequence');assert.equal(textRow(app,'primary').children.length,3);
const sequenceSpec=run("LetterSequence.compose('ААА',sequenceSources,{gap:20})");assert(Math.abs(sequenceSpec.width-330.2857142857)<1e-8);assert.equal(sequenceSpec.model.length,6);
sequenceCell().canvas.rect={width:330,height:180};run('refresh()');for(const line of sequenceSpec.model.slice(0,4))draw(sequenceCell().canvas,line);assert(Number(sequenceCell().output.textContent.replace('%',''))<90);for(const line of sequenceSpec.model.slice(4))draw(sequenceCell().canvas,line);assert.equal(sequenceCell().output.textContent,'100%');
const sequenceId='sequence-v2-gap20-b100-410-410-410-0';assert.equal(run(`data[${JSON.stringify(sequenceId)}].length`),6);const sequenceReopen=boot(app.saved);assert.equal(textRow(sequenceReopen,'primary').children[0].parts.output.textContent,'100%');
const seqText=app.nodes['sequence-picker'].children[0].children[2];seqText.value='ааа';seqText.onchange();assert.equal(run('composition.get(0).sequence.text'),'ааа');assert.equal(sequenceCell().output.textContent,'—');const seqCount=app.nodes['sequence-picker'].children[0].children[3];seqCount.value=2;seqCount.onchange();assert.equal(textRow(app,'primary').children.length,2);
app.nodes['sequence-picker'].children[0].children[2].value='ААА';app.nodes['sequence-picker'].children[0].children[2].onchange();assert.equal(sequenceCell().output.textContent,'100%');sequenceCell().button.onclick();assert.equal(run(`data[${JSON.stringify(sequenceId)}].length`),0);
sequenceCell().canvas.rect={width:330,height:180};for(let i=0;i<sequenceSpec.model.length;i++){const line=sequenceSpec.model[i];if(i%2===0){draw(sequenceCell().canvas,line.slice(0,2));draw(sequenceCell().canvas,line.slice(1))}else draw(sequenceCell().canvas,line)}assert.equal(sequenceCell().output.textContent,'100%');
assert.throws(()=>run("LetterSequence.compose('МАМА',{'А':{model:models,advance:90}})"));
console.log('PASS: ААА in one surface; incomplete vs full score; three split-side letters; per-text drafts; lowercase selection; 2/3 repeats; reload and reset');
if(process.env.LETTER_SEQUENCE_PROBE)fs.writeFileSync(process.env.LETTER_SEQUENCE_PROBE,textRow(app,'primary').children[0].html);

// The action anchor belongs to the first glyph, not the complete text box.
app=boot();
function checkFirstGlyphAnchor(id,text){
 const cell=textRow(app,id).children[0],frame=JSON.parse(cell.parts.canvas.attrs['data-view-box']),glyph=run(`DrawingGlyphs[${JSON.stringify(text[0])}]`),center=(glyph.inkBounds[0]+glyph.inkBounds[2])/2,scale=run('preferences.size/100'),x=parseFloat(cell.style['--score-x']);
 assert(Math.abs(x-(center-frame.x)*scale)<1e-8,'Percentage must remain under first visible glyph');
 assert(x<frame.width*scale/2,'Text percentage must not stay in the middle of the entire block');return cell;
}
run("composition.update(0,{textRows:[{id:'primary',text:'ААА',repeats:2,enabled:true}]});build(0)");
let anchorCell=checkFirstGlyphAnchor('primary','ААА');draw(anchorCell.parts.canvas,run("LetterSequence.compose('ААА',sequenceSources,{gap:20}).model[0]"));const anchorInk=run('JSON.stringify(data)'),anchorUndo=run('history.length');
for(const tolerance of [16,.5,8]){run(`configure({tolerance:${tolerance}})`);assert.equal(checkFirstGlyphAnchor('primary','ААА'),anchorCell,'Tolerance-only reframe keeps the same cell/listeners');assert.equal(run('JSON.stringify(data)'),anchorInk);assert.equal(run('history.length'),anchorUndo)}
for(const size of [30,92,160]){run(`configure({size:${size},bold:150})`);checkFirstGlyphAnchor('primary','ААА')}
run("composition.update(0,{textRows:[{id:'primary',text:'АААААААААААААААААААААААА',repeats:1,enabled:true}]});build(0)");anchorCell=checkFirstGlyphAnchor('primary','ААА');assert(JSON.parse(anchorCell.parts.canvas.attrs['data-view-box']).height>180,'Canary must actually wrap');
run("composition.update(0,{textRows:[{id:'primary',text:'А',repeats:1,enabled:true}]});build(0)");assert.equal(textRow(app,'primary').children[0].style['--score-x'],undefined,'Single-glyph control keeps its existing centered placement');
run("build(0,'М');composition.update(0,{textRows:[{id:'primary',text:'МАМА',repeats:1,enabled:true}]});build(0)");checkFirstGlyphAnchor('primary','МАМА');
console.log('PASS first-glyph controls: repeated letters, word, real wrap, size/bold and tolerance reframe; raw ink/undo unchanged; single glyph centered');

app=boot();draw(first().canvas,run('models[0]'));const gapDrawing=run('JSON.stringify(data)'),gapHistory=run('history.length'),gapGeometry=run('JSON.stringify(practiceGeometry(preferences.size))');
app.nodes['setting-rowGap'].oninput({target:{value:'48'}});app.nodes['setting-columnGap'].oninput({target:{value:'24'}});
assert.equal(run('preferences.rowGap'),48);assert.equal(run('preferences.columnGap'),24);assert.equal(app.nodes['value-rowGap'].textContent,'48 px');assert.equal(app.nodes['value-columnGap'].textContent,'24 px');assert.equal(run('JSON.stringify(data)'),gapDrawing);assert.equal(run('history.length'),gapHistory);assert.equal(run('JSON.stringify(practiceGeometry(preferences.size))'),gapGeometry);
const gapsReopen=boot(app.saved);assert.equal(gapsReopen.run('preferences.rowGap'),48);assert.equal(gapsReopen.run('preferences.columnGap'),24);
run('configure({rowGap:0,columnGap:0})');assert.equal(run('preferences.rowGap'),0);assert.equal(run('preferences.columnGap'),0);assert.equal(run('validPreferences({rowGap:999,columnGap:-10}).rowGap'),80);assert.equal(run('validPreferences({rowGap:999,columnGap:-10}).columnGap'),0);
app.nodes['settings-defaults'].onclick();assert.equal(run('preferences.rowGap'),22);assert.equal(run('preferences.columnGap'),12);assert.equal(run('JSON.stringify(data)'),gapDrawing);
console.log('PASS: gap slider handlers, persistence, zero and bounded values, default reset; writing data, geometry and undo unchanged');

// Relevant parts must be literal slices of the active font routes, never generic shapes.
app=boot();
assert.deepEqual(Array.from(run("WorksheetCatalog.elementsFor(['А']).map(d=>d.id)")),['gost-b90-A-bar','gost-b90-A-rise','gost-b90-A-fall']);
assert.deepEqual(Array.from(run("WorksheetCatalog.elementsFor(['а']).map(d=>d.id)")),['gost-b90-a-body','gost-b90-a-stem']);
assert.equal(run("WorksheetCatalog.elementsFor(['Б']).length"),0);
for(const def of run('WorksheetCatalog.elements')){
 const source=run(def.letters[0]==='А'?'models':'lowercase')[def.sourceStroke];
 assert.deepEqual(JSON.parse(JSON.stringify(def.model[0])),JSON.parse(JSON.stringify(def.sourceRange?source.slice(...def.sourceRange):source)));
 const json=JSON.stringify(def.model);assert.equal(run(`evaluate(${json}.map(s=>s.map(([x,y])=>[x/150,y/180])),${json},8).score`),100);
}
assert.equal(run('WorksheetCatalog.elements[3].model[0][0][0]'),run('WorksheetCatalog.elements[3].model[0].at(-1)[0]'));
const oldComposition=JSON.stringify({version:1,variants:{0:{picture:'art-house',elements:[{component:'vertical',repeats:5},{component:'diagonal-right',repeats:3},{component:'oval',repeats:4}],sequence:null}}});
const legacyInk=JSON.stringify({'warmup-0':[[[.5,.2],[.5,.7]]],'element-v1-oval-0':[[[.6,.4],[.5,.5]]]});
const migrated=boot({'letter-page-composition-v1':oldComposition,'letter-worksheet-v3-0':legacyInk});
assert.deepEqual(Array.from(migrated.run('composition.get(0).elements.map(e=>e.component)')),['gost-b90-A-rise','gost-b90-a-body','gost-b90-a-stem']);
assert.equal(migrated.run('composition.get(0).elements[0].repeats'),3);assert.equal(migrated.run('data["warmup-0"].length'),1);assert.equal(migrated.run('data["element-v1-oval-0"].length'),1);
assert.equal(migrated.run('data["element-v1-gost-b90-a-body-0"]?.length||0'),0);
assert.equal(run('composition.validate({elementsVersion:2,elements:[{component:"oval",repeats:4},{component:"vertical",repeats:4}]},0).elements.length'),0);
assert.equal(run('composition.validate({elements:[]},0).elements.length'),0);
const bodyCheck=app.nodes['element-picker'].children[3].children[0];bodyCheck.checked=false;bodyCheck.onchange();
assert.equal(run('composition.get(0).elements.some(e=>e.component==="gost-b90-a-body")'),false);
assert.equal(boot(app.saved).run('composition.get(0).elements.some(e=>e.component==="gost-b90-a-body")'),false);
console.log('PASS: five literal letter parts, per-letter filtering, exact-trace grading, legacy migration, archived ink isolation and persistent exclusions');

// Same form, arbitrary stroke segmentation/direction/order: one shared rule.
app=boot();
for(const text of ['ААА','ааа','АаА','Ааа']){
 const spec=run(`LetterSequence.compose(${JSON.stringify(text)},{'А':{model:models,advance:90},'а':{model:lowercase,advance:70}})`);
 const normalize=ss=>ss.map(s=>s.map(([x,y])=>[x/spec.width,y/spec.height]));
 const score=ss=>run(`evaluate(${JSON.stringify(normalize(ss))},${JSON.stringify(spec.model)},8,${JSON.stringify({width:spec.width,height:spec.height})}).score`);
 assert.equal(score(spec.model),100);assert.equal(score([...spec.model].reverse().map(s=>[...s].reverse())),100);
 const split=spec.model.flatMap(s=>s.slice(1).map((p,i)=>[s[i],p]));assert.equal(score(split.reverse()),100);
}
const unfamiliar=[[[25,35],[25,135]],[[25,35],[110,35]],[[25,85],[95,85]]];
assert.equal(run(`evaluate(${JSON.stringify(unfamiliar.map(s=>s.slice().reverse().map(([x,y])=>[x/150,y/180])))},${JSON.stringify(unfamiliar)},8).score`),100);
const triples=run("LetterSequence.compose('ААА',{'А':{model:models,advance:90}})");
assert(run(`evaluate([[[0,${135/180}],[1,${135/180}]]],${JSON.stringify(triples.model)},8,{width:330,height:180}).score`)<10);
// Continuous crossbar crosses empty spaces too; score must not be 100%.
assert(run(`evaluate([[[${54/330},${110/180}],[${277/330},${110/180}]]],${JSON.stringify(triples.model)},8,{width:330,height:180}).score`)<50);
console.log('PASS: upper/lower/mixed sequences invariant under stroke reversal, order and arbitrary splitting; unfamiliar model; off-shape continuous lines remain low');

// Crop only presentation. Retain legacy domain, glyph scale, ink and tolerance.
const originalStroke=run('models.map(s=>s.map(([x,y])=>[x/150,y/180]))');
const existing=boot({'letter-worksheet-v3-0':JSON.stringify({'gost-file-b90-upper-0':originalStroke})});
assert.equal(stageRow(existing,'upper-letter').children[0].parts.output.textContent,'100%');
const oldStored=existing.run('JSON.stringify(data)');existing.run('configure({size:60,bold:150,tolerance:16})');assert.equal(existing.run('JSON.stringify(data)'),oldStored);assert.equal(stageRow(existing,'upper-letter').children[0].parts.output.textContent,'100%');
for(const size of [30,60,118,160])for(const tolerance of [2,8,16])for(const bold of [100,150]){
 run(`configure({size:${size},tolerance:${tolerance},bold:${bold}})`);
 const specs=run(`[{model:models},{model:lowercase},...WorksheetCatalog.elements.map(d=>({model:d.model})),LetterSequence.compose('ААА',{'А':{model:models,advance:90}})].map(s=>({frame:PracticeElement.frame(s.model,preferences),points:s.model.flat()}))`);
 for(const {frame,points} of specs){
  const padding=Math.max(tolerance/(size/100),5*bold/100);
  assert(frame.width*size/100>=48-1e-9);assert(frame.height*size/100>=44-1e-9);
  for(const [x,y] of points){assert(x-frame.x>=padding);assert(frame.x+frame.width-x>=padding);assert(y-frame.y>=padding);assert(frame.y+frame.height-y>=padding)}
 }
}
app=boot();const upperCell=stageRow(app,'upper-letter').children[0],lowerCell=stageRow(app,'lower-letter').children[0];
assert(parseFloat(upperCell.style['--cell-width'])<110);assert(parseFloat(upperCell.style['--cell-height'])<150);assert(parseFloat(lowerCell.style['--cell-height'])<110);
// Pointer mapping must still store the old 150x180 domain, exactly.
for(const line of run('models'))draw(first().canvas,line);const actualNormalized=run('data["gost-file-b90-upper-0"]');
for(let i=0;i<originalStroke.length;i++)for(let j=0;j<originalStroke[i].length;j++)for(let k=0;k<2;k++)assert(Math.abs(actualNormalized[i][j][k]-originalStroke[i][j][k])<1e-12);
assert.equal(first().output.textContent,'100%');
console.log('PASS: compact bounds at 72 size/tolerance/bold combinations; touch dimensions; viewport pointer mapping; exact old coordinates and saved drawing restoration');
if(process.env.LETTER_FIELD_PROBE){
 const fields=[];
 for(const prefs of [{size:60,bold:150,tolerance:16},{size:118,bold:100,tolerance:8},{size:160,bold:150,tolerance:2},{size:60,bold:150,tolerance:16,letterGap:0},{size:118,bold:100,tolerance:8,letterGap:20},{size:160,bold:150,tolerance:16,letterGap:50},{size:30,bold:100,tolerance:2,letterGap:20},{size:30,bold:150,tolerance:16,letterGap:50}]){
  run(`configure(${JSON.stringify(prefs)})`);
  for(const row of app.nodes.practice.children.filter(r=>!r.dataset.textRowId||r.dataset.textRowId==='primary'))for(const cell of row.children.slice(0,1))fields.push({html:cell.html,style:cell.style,tolerance:prefs.tolerance,size:prefs.size});
 }
 fs.writeFileSync(process.env.LETTER_FIELD_PROBE,JSON.stringify(fields));
}

// Narrow drawing areas are independent of reset control width.
app=boot();
const widths=run('WorksheetCatalog.elements.map(d=>PracticeElement.frame(d.model,preferences).width*preferences.size/100)');
assert(widths[4]<55);assert(widths[3]<75);
assert(parseFloat(stageRow(app,'upper-letter').children[0].style['--cell-width'])<92);
assert(parseFloat(stageRow(app,'lower-letter').children[0].style['--cell-width'])<81);
const letterHeight=run('PracticeElement.frame(models,preferences).height*preferences.size/100');assert(Math.abs(letterHeight-132.82)<.1);
const foot=first().output;draw(first().canvas,run('models[0]'));const boundsBefore=first().canvas.getBoundingClientRect();foot.onclick();assert.equal(first().button.hidden,false);assert.deepEqual(first().canvas.getBoundingClientRect(),boundsBefore);
console.log('PASS: horizontal bounds tightened; narrow stem below 55px; reset popover leaves field dimensions unchanged');

// User-visible spacing is the clear gap between real glyph outlines, in % of h.
app=boot({});assert.equal(run('preferences.letterGap'),20);assert.equal(app.nodes['value-letterGap'].textContent,'20% высоты заглавной');
for(const text of ['ААА','ааа','АаА','Ааа'])for(const gap of [0,10,20,50])for(const bold of [100,150]){
 const spec=run(`LetterSequence.compose(${JSON.stringify(text)},sequenceSources,{gap:${gap},bold:${bold}})`);
 for(let i=1;i<spec.glyphs.length;i++){
  const prev=run(`sequenceSources[${JSON.stringify(text[i-1])}].bounds`),next=run(`sequenceSources[${JSON.stringify(text[i])}].bounds`);
  const visibleGap=spec.glyphs[i].x+next[0]-(spec.glyphs[i-1].x+prev[1])-(bold/100-1)*10;
  assert(Math.abs(visibleGap-gap)<1e-9);
 }
 const source=JSON.stringify(spec.model),actual=JSON.stringify(spec.model.map(s=>s.map(([x,y])=>[x/spec.width,y/spec.height])));
 assert.equal(run(`evaluate(${actual},${source},8,{width:${spec.width},height:180}).score`),100);
}
// End-to-end canary: numeric endpoints -> draw -> change -> restore -> reload.
app=boot();run("composition.update(0,{textRows:[{id:'primary',text:'ААА',repeats:3,enabled:true}],nextTextRowId:1});build(0)");app.nodes['setting-letterGap'].oninput({target:{value:'0'}});
const zeroSpec=run("LetterSequence.compose('ААА',sequenceSources,{gap:0})");for(const line of zeroSpec.model)draw(sequenceCell().canvas,line);
const zeroDraft=run('JSON.stringify(data["sequence-v2-gap0-b100-410-410-410-0"])'),singleWidth=stageRow(app,'upper-letter').children[0].style['--cell-width'];
app.nodes['setting-letterGap'].oninput({target:{value:'20'}});assert.equal(sequenceCell().output.textContent,'—');
const spaced=run("LetterSequence.compose('ААА',sequenceSources,{gap:20})");for(const line of spaced.model)draw(sequenceCell().canvas,line);assert.equal(sequenceCell().output.textContent,'100%');
app.nodes['setting-letterGap'].oninput({target:{value:'50'}});assert.equal(sequenceCell().output.textContent,'—');assert.equal(stageRow(app,'upper-letter').children[0].style['--cell-width'],singleWidth);
app.nodes['setting-letterGap'].oninput({target:{value:'20'}});assert.equal(sequenceCell().output.textContent,'100%');
const reopenedGap=boot(app.saved);assert.equal(reopenedGap.run('preferences.letterGap'),20);assert.equal(textRow(reopenedGap,'primary').children[0].parts.output.textContent,'100%');
app.nodes['setting-letterGap'].oninput({target:{value:'0'}});assert.equal(sequenceCell().output.textContent,'100%');assert.equal(run('JSON.stringify(data["sequence-v2-gap0-b100-410-410-410-0"])'),zeroDraft);
for(let value=50;value>=0;value--){app.nodes['setting-letterGap'].oninput({target:{value:String(value)}});assert.equal(run('preferences.letterGap'),value);assert.equal(app.nodes['value-letterGap'].textContent,value+'% высоты заглавной')}
assert.equal(boot(app.saved).run('preferences.letterGap'),0);
assert.equal(run('validPreferences({letterGap:999}).letterGap'),50);assert.equal(run('validPreferences({letterGap:-999}).letterGap'),0);
const gapHtml=fs.readFileSync(require('node:path').join(__dirname,'../../editor/index.html'),'utf8');assert(gapHtml.includes('id="setting-letterGap" type="range" min="0" max="50"'));assert(gapHtml.includes('option value="20" label="По умолчанию"'));assert(gapHtml.includes('id="letter-gap-default">20% · по умолчанию'));
app.nodes['settings-defaults'].onclick();assert.equal(run('preferences.letterGap'),20);
console.log('PASS: monotonic 50-to-0 slider, persistent 0%, visible 20% default tick, per-gap draft restoration and default reset');

for(const legacy of [{size:80},{size:80,letterGap:-1},{size:80,letterGap:-1,letterGapDefaultVersion:1},{size:80,letterGap:0},{size:80,letterGap:35}]){
 const oldInk=JSON.stringify({'sequence-v1-410-410-410-0':[[[.2,.3],[.3,.4]]]}),saved={'letter-preferences-v1':JSON.stringify(legacy),'letter-worksheet-v3-0':oldInk};
 const upgraded=boot(saved),expected=legacy.letterGap>=0?legacy.letterGap:20;
 assert.equal(upgraded.run('preferences.letterGap'),expected);assert.equal(upgraded.run('preferences.size'),80);assert.equal(saved['letter-worksheet-v3-0'],oldInk);
 assert.equal(JSON.parse(saved['letter-preferences-v1']).letterGapDefaultVersion,2);assert.equal(boot(saved).run('preferences.letterGap'),expected);
 upgraded.nodes['setting-letterGap'].oninput({target:{value:'0'}});assert.equal(boot(saved).run('preferences.letterGap'),0);
 upgraded.nodes['settings-defaults'].onclick();assert.equal(upgraded.run('preferences.letterGap'),20);assert.equal(boot(saved).run('preferences.letterGap'),20);
}
assert.equal(boot({}).run('preferences.letterGap'),20);
console.log('PASS: GOST 20% default for new and old settings; one-time upgrade of implicit font spacing; numeric/custom choices, old ink and numeric endpoints preserved');

// Editable rows: real editor handlers, isolation, reload and disabled/deleted ink.
app=boot();run("composition.update(0,{textRows:[{id:'primary',text:'ААА',repeats:3,enabled:true}],nextTextRowId:1});build(0)");app.nodes['setting-size'].oninput({target:{value:'30'}});assert.equal(run('preferences.size'),30);assert.equal(app.nodes['value-size'].textContent,'30 px');assert.equal(boot(app.saved).run('preferences.size'),30);
assert.equal(run('validPreferences({size:0}).size'),30);
function editorRow(id){return app.nodes['sequence-picker'].children.find(r=>r.dataset.textRowId===id)}
function textSurface(id){return app.nodes.practice.children.find(r=>r.dataset.textRowId===id)?.children[0].parts}
app.nodes['sequence-picker'].children.find(n=>n.className==='add-text-row').onclick();assert.equal(run('composition.get(0).textRows.length'),2);assert.equal(run('composition.get(0).textRows[1].id'),'row-1');
let input=editorRow('row-1').children[2];input.value='Aa AA';input.onkeydown({key:'Enter',preventDefault(){}});
assert.equal(run('composition.get(0).textRows[1].text'),'Аа АА');assert.equal(editorRow('row-1').children[2].value,'Аа АА');
const rowSpec=run("LetterSequence.compose('Аа АА',sequenceSources,{gap:preferences.letterGap,bold:preferences.bold})");for(const line of rowSpec.model)draw(textSurface('row-1').canvas,line);assert.equal(textSurface('row-1').output.textContent,'100%');
const rowDraft=run('JSON.stringify(data)'),rowId='text-row-1-sequence-v2-gap20-b100-410-430-20-410-410-0';assert.equal(run(`data[${JSON.stringify(rowId)}].length`),8);
input=editorRow('row-1').children[2];input.value='МАМА';input.onchange();assert.equal(input.attrs['aria-invalid'],'true');assert(editorRow('row-1').children[5].textContent.includes('введённые буквы'));assert.equal(run('composition.get(0).textRows[1].text'),'Аа АА');assert.equal(run('JSON.stringify(data)'),rowDraft);
input.value='Аа АА';input.onchange();
const repeatsControl=editorRow('row-1').children[3];repeatsControl.value=5;repeatsControl.onchange();assert.equal(app.nodes.practice.children.find(r=>r.dataset.textRowId==='row-1').children.length,5);
const rowReload=boot(app.saved);assert.equal(rowReload.run('composition.get(0).textRows[1].repeats'),5);assert.equal(rowReload.nodes.practice.children.find(r=>r.dataset.textRowId==='row-1').children[0].parts.output.textContent,'100%');
let check=editorRow('row-1').children[0];check.checked=false;check.onchange();assert.equal(textSurface('row-1'),undefined);assert.equal(editorRow('row-1').children[2].disabled,true);
check=editorRow('row-1').children[0];check.checked=true;check.onchange();assert.equal(textSurface('row-1').output.textContent,'100%');
editorRow('row-1').children[4].onclick();assert.equal(run('composition.get(0).textRows.length'),1);assert.equal(run(`data[${JSON.stringify(rowId)}].length`),8);
app.nodes['sequence-picker'].children.find(n=>n.className==='add-text-row').onclick();assert.equal(run('composition.get(0).textRows[1].id'),'row-2');assert.equal(textSurface('row-2').output.textContent,'—');
// Two identical texts on different rows must have independent writing surfaces.
editorRow('row-2').children[2].value='ААА';editorRow('row-2').children[2].onchange();const duplicateSpec=run("LetterSequence.compose('ААА',sequenceSources,{gap:20})");for(const line of duplicateSpec.model)draw(textSurface('row-2').canvas,line);assert.equal(textSurface('row-2').output.textContent,'100%');assert.equal(textSurface('primary').output.textContent,'—');
assert.equal(run("LetterSequence.normalizeText(' аа   АА ')"),'аа АА');assert.equal(run("LetterSequence.normalizeText('а'.repeat(120))").length,120);assert.equal(run("LetterSequence.normalizeText('а'.repeat(121))"),null);assert.equal(run("LetterSequence.normalizeText('   ')"),null);
const disabledOld=boot({'letter-page-composition-v1':JSON.stringify({version:1,variants:{0:{elementsVersion:2,elements:[],sequence:null}}})});assert.equal(disabledOld.run('composition.get(0).textRows[0].enabled'),false);
assert.equal(run('composition.validate({textRows:[]},0).textRows.length'),0);
assert.equal(run('composition.validate({textRows:[{id:"primary",text:"АА",repeats:2},{id:"primary",text:"аа",repeats:3},{id:"bad",text:"АА",repeats:2}]},0).textRows.length'),1);
for(const bold of [100,150]){const spec=run(`LetterSequence.compose('Аа АА',sequenceSources,{gap:20,bold:${bold}})`),left=run('sequenceSources["а"].bounds[1]'),right=run('sequenceSources["А"].bounds[0]');assert(Math.abs(spec.glyphs[2].x+right-spec.glyphs[1].x-left-(bold/100-1)*10-60)<1e-9)}
console.log('PASS: minimum 30px; add/edit text rows, Latin A normalization, real spaces, invalid text feedback, 1–5 repeats, duplicate isolation, disable/restore, delete without ink loss and migration');

// Row-wide horizontal guides follow nominal font levels and actual wrapped layout.
app=boot();assert.deepEqual(Array.from(run('rulingLevels')),[40,70,140]);
const sourceEntries=[{rect:{top:112,width:80,height:120},frame:{y:30,height:120},levels:[40,70,140]},{rect:{top:112,width:80,height:120},frame:{y:30,height:120},levels:[40,70,140]},{rect:{top:300,width:80,height:120},frame:{y:30,height:120},levels:[40,70,140]}];
assert.deepEqual(Array.from(run(`RowRuling.positions({top:100,height:400},${JSON.stringify(sourceEntries)})`)),[22,52,122,210,240,310]);
const noInkBefore=run('JSON.stringify(data)'),row=stageRow(app,'upper-letter');row.rect={left:20,top:100,width:900,height:500};
row.children.forEach((cell,i)=>{cell.parts['.writing'].rect={left:20+i*100,top:100+(i>=3?240:0),width:parseFloat(cell.style['--cell-width']),height:parseFloat(cell.style['--cell-height'])}});
app.context.measuredRow=row;run('RowRuling.update(measuredRow)');assert.equal((row.style['--row-ruling-lines'].match(/linear-gradient/g)||[]).length,6);assert(!row.style['--row-ruling-lines'].includes('rotate'));assert.equal(run('JSON.stringify(data)'),noInkBefore);
for(const size of [30,60,118,160]){
 const frame=run(`PracticeElement.frame(models,{...preferences,size:${size}})`),scale=size/100;
 const levels=run(`RowRuling.levels(${JSON.stringify(frame)},rulingLevels)`);
 const positions=run(`RowRuling.positions({top:0,height:1000},[{rect:{top:0,width:${frame.width*scale},height:${frame.height*scale}},frame:${JSON.stringify(frame)},levels:${JSON.stringify(levels)}}])`);
 assert.equal(positions.length,3);assert(Math.abs(positions[2]-positions[0]-size)<1e-9);assert(Math.abs(positions[1]-positions[0]-size*.3)<1e-9);
}
assert.deepEqual(Array.from(run('RowRuling.levels({y:90,height:40,minY:110,maxY:110},rulingLevels)')),[110]);
run('build(1)');assert.equal(run('RowRuling.states.has(measuredRow)'),false);
console.log('PASS: nominal horizontal guides at cap/x-height/baseline; full-row layer, deduplicated wrapped positions, scale 30–160, unchanged ink and observer cleanup');

// Exercise actual resize -> queued frame -> updated row layer, then teardown.
app=boot();app.context.rulingFrames=[];app.context.rulingObservers=[];app.context.rulingCancelled=[];
run(`requestAnimationFrame=fn=>{rulingFrames.push(fn);return rulingFrames.length};cancelAnimationFrame=id=>rulingCancelled.push(id);ResizeObserver=class{constructor(fn){this.callback=fn;rulingObservers.push(this)}observe(){}unobserve(){}disconnect(){this.disconnected=true}};
 const probeRow=document.createElement('div'),probeWriting=document.createElement('div');probeRow.rect={top:100,height:400,width:900};probeWriting.rect={top:112,height:120,width:80};
 const releaseProbe=RowRuling.attach(probeRow,probeWriting,{y:30,height:120,minY:40,maxY:140},[40,70,140]);`);
assert.equal(run('rulingFrames.length'),1);run('rulingFrames[0]()');assert(run('probeRow.style["--row-ruling-lines"]')?.includes('21.5px'));
run('probeWriting.rect.top=200;rulingObservers[0].callback();rulingFrames[1]()');assert(run('probeRow.style["--row-ruling-lines"]')?.includes('109.5px'));
run('rulingObservers[0].callback();releaseProbe()');assert.equal(run('rulingObservers[0].disconnected'),true);assert.equal(run('RowRuling.states.has(probeRow)'),false);assert.equal(run('rulingCancelled.length'),1);
console.log('PASS: resize delivery schedules and updates horizontal guides; teardown disconnects observer and cancels pending frame');


// Book-style progression is separate from glyph availability and alphabetical order.
app=boot();const studyOrder=Array.from(run('LetterCurriculum.order'));
assert.equal(studyOrder.length,33);assert.equal(new Set(studyOrder).size,33);assert.deepEqual([...studyOrder].sort(),[...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'].sort());assert.deepEqual(studyOrder.slice(0,7),[...'АОИУЫНТ']);
assert.equal(run("LetterCurriculum.lesson('А').next"),'О');assert.equal(run("LetterCurriculum.lesson('Ъ').next"),null);
assert.equal(run("LetterCurriculum.canUseText('А','ААА')"),true);assert.equal(run("LetterCurriculum.canUseText('А','ау')"),false);assert.equal(run("LetterCurriculum.canUseText('У','ау')"),true);
assert.equal(run("LetterCurriculum.canUseText('Ы','мама')"),false);assert.equal(run("LetterCurriculum.canUseText('М','мама')"),true);assert.equal(run("LetterCurriculum.canUseText('М','рама')"),true);assert.equal(run("LetterCurriculum.canUseText('Р','Мама мыла раму.')"),false);
assert.equal(run("LetterSequence.normalizeText('Мама',{lesson:'А',supported:'АаМм'})"),null);assert.equal(run("LetterSequence.normalizeText('Мама',{lesson:'М',supported:'АаМм'})"),'Мама');assert.equal(run("LetterSequence.normalizeText('Мама',{lesson:'М',supported:'Аа'})"),null);
for(const letter of studyOrder){const lesson=run(`LetterCurriculum.lesson(${JSON.stringify(letter)})`);for(const texts of Object.values(lesson.examples))for(const text of texts)assert.equal(run(`LetterCurriculum.canUseText(${JSON.stringify(letter)},${JSON.stringify(text)})`),true)}
app.nodes['sequence-picker'].children.find(n=>n.className==='add-text-row').onclick();assert.equal(run('composition.get(0).textRows.at(-1).text'),'аа');
console.log('PASS: 33-letter study order; known-letter-only combinations/words/sentences; glyph availability remains separate; current A lesson and new-row practice use curriculum data');
