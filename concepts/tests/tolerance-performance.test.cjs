const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const h=fs.readFileSync(path.join(__dirname,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0];
const boot=saved=>new Function('require','__dirname',h+"return boot(arguments[2],'learner');")(require,__dirname,saved||{});
function draw(canvas,line){const f=JSON.parse(canvas.attrs['data-view-box']),r=canvas.getBoundingClientRect(),points=line.map(([x,y])=>[(x-f.x)/f.width*r.width,(y-f.y)/f.height*r.height]);canvas.emit('pointerdown',points[0]);for(const p of points.slice(1))canvas.emit('pointermove',p);canvas.emit('pointerup',points.at(-1))}
let app=boot();const upper=()=>app.nodes.practice.children.find(r=>r.dataset.lessonStage==='upper-letter').children[0].parts;
assert.equal(app.nodes['level-current'].textContent,'Выбрано: Обычно · ±8 px');
for(const line of app.run('models'))draw(upper().canvas,line);
const canvas=upper().canvas,rows=[...app.nodes.practice.children],ink=app.run('JSON.stringify(data)'),history=app.run('history.length'),oldFrame=canvas.attrs['data-view-box'],demo=app.nodes.demo.html;
let writes=0,paints=0;const write=app.context.localStorage.setItem;app.context.localStorage.setItem=(...args)=>{writes++;write(...args)};canvas.context.setTransform=()=>paints++;
app.run("stopDemo=()=>{throw Error('Tolerance must not restart the demonstration')}");
for(let i=0;i<100;i++)app.nodes['setting-tolerance'].oninput({target:{value:String(.5+(i%32)*.5)}});
app.nodes['setting-tolerance'].oninput({target:{value:'16'}});
assert.equal(writes,0);assert.equal(paints,0);assert.deepEqual(app.nodes.practice.children,rows);assert.equal(upper().canvas,canvas);assert.equal(canvas.attrs['data-view-box'],oldFrame);assert.equal(app.nodes.demo.html,demo);assert.equal(app.nodes['value-tolerance'].textContent,'±16 px');assert.equal(app.nodes['level-current'].dataset.kind,'custom');assert.equal(upper().output.textContent,'100%');
app.nodes['setting-tolerance'].onchange({target:{value:'16'}});
assert.equal(writes,1);assert.equal(paints,1);assert.equal(upper().canvas,canvas);assert.notEqual(canvas.attrs['data-view-box'],oldFrame);assert.equal(upper().output.textContent,'100%');assert.equal(app.run('JSON.stringify(data)'),ink);assert.equal(app.run('history.length'),history);assert.equal(app.nodes.demo.html,demo);
app.nodes['setting-tolerance'].onblur();assert.equal(writes,1);assert.equal(paints,1);
assert.equal(boot(app.saved).run('preferences.tolerance'),16);
console.log('PASS canary:101 inputs → zero canvas paints/storage writes/DOM replacement/demo restart; release → one paint and one preference save; frames update in place; ink/undo/reload preserved; duplicate blur is no-op');
for(const [key,label,value] of [['easy','Легче',12],['standard','Обычно',8],['precise','Точнее',4],['ideal','Идеально',2],['impossible','Невозможно',1]]){app.nodes['level-'+key].onclick();assert.equal(app.nodes['level-current'].textContent,`Выбрано: ${label} · ±${value} px`);for(const other of ['easy','standard','precise','ideal','impossible'])assert.equal(app.nodes['level-'+other].attrs['aria-pressed'],String(key===other));assert.equal(upper().canvas,canvas)}
app.nodes['setting-tolerance'].oninput({target:{value:'1.5'}});assert.equal(app.nodes['level-current'].textContent,'Выбрано: Свой допуск · ±1.5 px');for(const key of ['easy','standard','precise','ideal','impossible'])assert.equal(app.nodes['level-'+key].attrs['aria-pressed'],'false');app.nodes['setting-tolerance'].onblur();assert.equal(boot(app.saved).run('preferences.tolerance'),1.5);

// Actual wrap boundary: preview keeps the current layout; release alone may
// recompose a text that no longer fits. Old wrap-specific ink must survive.
app=boot();const text=app.run("LetterCurriculum.lesson('М').examples.sentences[0]"),spec=app.run(`LetterSequence.compose(${JSON.stringify(text)},sequenceSources,{gap:20,bold:100})`),bounds=app.run("sequenceSources"),letters=text.replace(/ /g,'');
const span=Math.max(...spec.glyphs.map((g,i)=>g.x+bounds[letters[i]].bounds[1]))-Math.min(...spec.glyphs.map((g,i)=>g.x+bounds[letters[i]].bounds[0]));app.nodes.practice.clientWidth=(span*.92+20)/.85;app.run("configure({tolerance:.5});build(0,'М')");
const sentence=()=>app.nodes.practice.children.find(r=>r.attrs['aria-label']===text).children[0].parts;
const old=sentence().canvas,id=old.attrs['data-surface-id'];assert(!id.includes('-wrap'));for(const line of spec.model)draw(old,line);const stored=app.run(`JSON.stringify(data[${JSON.stringify(id)}])`);
app.nodes['setting-tolerance'].oninput({target:{value:'16'}});assert.equal(sentence().canvas,old);app.nodes['setting-tolerance'].onchange({target:{value:'16'}});assert(sentence().canvas.attrs['data-surface-id'].includes('-wrap'));assert.equal(app.run(`JSON.stringify(data[${JSON.stringify(id)}])`),stored);
app.run('configure({tolerance:.5})');assert.equal(sentence().canvas.attrs['data-surface-id'],id);assert.equal(sentence().output.textContent,'100%');
console.log('PASS: clear preset/custom selection; preset commit preserves canvas; keyboard/blur persistence; real wrap boundary only recomposes on commit and restores old ink when returning');
