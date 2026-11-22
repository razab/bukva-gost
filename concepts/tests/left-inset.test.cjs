const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const h=fs.readFileSync(path.join(__dirname,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0];
const boot=saved=>new Function('require','__dirname',h+"return boot(arguments[2],'learner');")(require,__dirname,saved||{});
function draw(canvas,line){const f=JSON.parse(canvas.attrs['data-view-box']),r=canvas.getBoundingClientRect(),p=line.map(([x,y])=>[(x-f.x)/f.width*r.width,(y-f.y)/f.height*r.height]);canvas.emit('pointerdown',p[0]);for(const v of p.slice(1))canvas.emit('pointermove',v);canvas.emit('pointerup',p.at(-1))}
const upper=app=>app.nodes.practice.children.find(r=>r.dataset.lessonStage==='upper-letter').children[0].parts;
let app=boot();assert.equal(app.run('preferences.leftInset'),15);assert.equal(app.nodes['value-leftInset'].textContent,'15% строки');
for(const line of app.run('demonstrationFor(models)'))draw(upper(app).canvas,line);assert.equal(upper(app).output.textContent,'100%');const ink=app.run('JSON.stringify(data)'),history=app.run('history.length');
app.nodes['setting-leftInset'].oninput({target:{value:'20'}});assert.equal(app.run('preferences.leftInset'),20);assert.equal(app.run('document.body.style["--practice-left-inset"]'),'20%');assert.equal(app.run('JSON.stringify(data)'),ink);assert.equal(app.run('history.length'),history);assert.equal(upper(app).output.textContent,'100%');
app.run("build(0,'О')");assert.equal(app.run('preferences.leftInset'),20);app=boot(app.saved);assert.equal(app.run('preferences.leftInset'),20);app.run("build(0,'А')");assert.equal(app.run('JSON.stringify(data)'),ink);assert.equal(upper(app).output.textContent,'100%');
console.log('PASS canary: 15% default → real20% control → draw retained at100% → another letter → reload; global percentage and undo history retained');
{
 const page=boot();
 const text=page.run("LetterCurriculum.lesson('Б').examples.sentences[0]");
 let previousWraps=0;
 for(const width of [1170,810,366]){
  page.nodes.practice.clientWidth=width;
  page.run("build(0,'Б')");
  const row=page.nodes.practice.children.find(r=>r.attrs['aria-label']===text);
  const field=row.children[0],canvas=field.parts.canvas;
  const reserve=Math.min(110,width*.1);
  assert.equal(row.style['padding-right'],reserve+'px');
  assert(parseFloat(field.style['--cell-width'])<=width*.85-reserve+1,'Text enters the hand area at '+width);
  assert.equal(Number(canvas.attrs['data-scale']),.52);
  const levels=JSON.parse(canvas.attrs['data-ruling-levels']);
  assert(levels.length>=previousWraps);
  previousWraps=levels.length;
  assert.equal(page.nodes.practice.children.find(r=>r.dataset.lessonStage==='upper-letter').style['padding-right'],undefined);
 }
 console.log('PASS: reserved right area in the real Б sentence row at landscape, portrait and narrow widths');
}
if(process.env.LEFT_INSET_CANARY_ONLY==='1')process.exit(0);
for(const [input,want] of [[0,0],[10,10],[20,20],[30,30],[-5,0],[90,30],[NaN,15]]){app.run(`configure({leftInset:${Number.isNaN(input)?'NaN':input}})`);assert.equal(app.run('preferences.leftInset'),want)}
// At an exact width boundary, narrowing content must wrap instead of scaling.
app=boot();const text=app.run("LetterCurriculum.lesson('М').examples.sentences[0]"),sequence=app.run(`LetterSequence.compose(${JSON.stringify(text)},sequenceSources,{gap:20,bold:100})`),sources=app.run('sequenceSources'),characters=text.replace(/ /g,'');
const span=Math.max(...sequence.glyphs.map((g,i)=>g.x+sources[characters[i]].bounds[1]))-Math.min(...sequence.glyphs.map((g,i)=>g.x+sources[characters[i]].bounds[0]));const fit=span*app.run('preferences.size/100')+32;app.nodes.practice.clientWidth=fit+Math.min(110,fit/9);app.run("build(0,'М');configure({leftInset:0})");
const sentence=()=>app.nodes.practice.children.find(r=>r.attrs['aria-label']===text).children[0].parts;
const firstId=sentence().canvas.attrs['data-surface-id'],frame=sentence().canvas.attrs['data-view-box'];assert(!firstId.includes('-wrap'));
for(const line of app.run(`StrokeDirection.route(LetterSequence.compose(${JSON.stringify(text)},sequenceSources,{gap:20,bold:100}).model)`))draw(sentence().canvas,line);assert.equal(sentence().output.textContent,'100%');const stored=app.run(`JSON.stringify(data[${JSON.stringify(firstId)}])`);
app.run('configure({leftInset:20})');const wrappedId=sentence().canvas.attrs['data-surface-id'];assert(wrappedId.includes('-wrap'));assert.equal(app.run(`JSON.stringify(data[${JSON.stringify(firstId)}])`),stored);assert.equal(app.run('preferences.size'),52);assert.equal(app.run('preferences.bold'),100);
app.run('configure({leftInset:0})');assert.equal(sentence().canvas.attrs['data-surface-id'],firstId);assert.equal(sentence().canvas.attrs['data-view-box'],frame);assert.equal(sentence().output.textContent,'100%');
app.run('configure({leftInset:20})');const keys=Object.keys(app.saved),adapter={length:keys.length,key:i=>keys[i],getItem:k=>app.saved[k]??null};const exported=app.run('LocalBackup').parse(app.run('LocalBackup').export(adapter));assert.equal(boot({...exported.entries}).run('preferences.leftInset'),20);
const old=JSON.stringify({size:70,bold:110,tolerance:6,rowGap:20,columnGap:10,letterGap:20});const legacy=boot({'letter-preferences-v1':old,'gost-developer-preferences-v1':JSON.stringify({size:70})});assert.equal(legacy.run('preferences.leftInset'),15);assert.equal(legacy.saved['letter-preferences-v1'],old);assert.equal(legacy.run('preferences.size'),70);
console.log('PASS: monotonic0–30%, bounds/invalid defaults; width-sensitive text wrapping; old word ink restored on previous layout; unchanged size/bold/frame; backup and legacy preferences preserved');
