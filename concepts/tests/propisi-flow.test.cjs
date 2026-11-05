const fs=require('fs'),path=require('path'),assert=require('assert/strict'),dir=__dirname,h=fs.readFileSync(path.join(dir,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0];
const boot=s=>new Function('require','__dirname',h+'return boot(arguments[2]);')(require,dir,s);
let app=boot(),run=s=>app.run(s);
const expected='АОИУЫНТКСЛПРВЕМЗДБГЬЯЧШЖЁЙХЮФЦЭЩЪ',source=JSON.parse(fs.readFileSync(path.join(dir,'../../references/propisi-2019-order.json')));
assert.equal(run('LetterCurriculum.order.join("")'),expected);assert.equal(source.order.join(''),expected);assert.equal(new Set(expected).size,33);
const original=JSON.parse(fs.readFileSync(path.join(dir,'../../references/lesson-plans-before-propisi-2019.json')));
const oldPlan={elementsVersion:2,picture:'art-kite',elements:[],textRows:original.plans['Н'],nextTextRowId:3};
const saved={'drawing-active-letter-v1':'Н','letter-page-composition-v2-41d':JSON.stringify({version:1,variants:{0:oldPlan}})};
app=boot(saved);assert.equal(run('composition.get(0).textRowsCustomized'),false);assert(run('composition.get(0).textRows.every(r=>!r.deferred)'));assert(run("composition.get(0).textRows.some(r=>r.text==='Нина')"));assert(saved['letter-page-composition-v2-41d-before-propisi-2019']);
const custom={...oldPlan,textRows:[{id:'primary',text:'Мама',repeats:2,enabled:true},{id:'row-4',text:'она',repeats:1,enabled:true}],nextTextRowId:5};saved['letter-page-composition-v2-41d']=JSON.stringify({version:1,variants:{0:custom}});app=boot(saved);
assert.equal(run('composition.get(0).textRows[0].text'),'Мама');assert.equal(run('composition.get(0).textRows[0].deferred'),true);assert(!app.nodes.practice.children.some(r=>r.dataset.textRowId==='primary'));assert(app.nodes.practice.children.some(r=>r.dataset.textRowId==='row-4'));
run("data['kept-old-writing']=[[[.2,.3],[.4,.5]]];save();composition.update(0,{picture:'art-house'});build(0,'А');build(0,'Н')");assert.equal(run('data["kept-old-writing"].length'),1);assert.equal(run('composition.get(0).textRows[0].text'),'Мама');assert.equal(run('composition.get(0).picture'),'art-house');
app=boot(saved);assert.equal(run('composition.get(0).textRows[0].deferred'),true);app.nodes['lesson-default'].onclick();assert.equal(run('composition.get(0).textRowsCustomized'),false);assert(run('composition.get(0).textRows.every(r=>!r.deferred)'));assert.equal(run('composition.get(0).picture'),'art-house');assert.equal(run('data["kept-old-writing"].length'),1);
app=boot(saved);assert.equal(run('composition.get(0).textRowsCustomized'),false);
console.log('PASS canary: exact book order; default plan migration; custom future-letter rows stay editable and out of worksheet; raw backup, drawings, picture and reload preserved; explicit lesson reset works');
if(process.env.PROPISI_CANARY_ONLY)process.exit(0);
app=boot();
for(const letter of expected){run(`build(0,${JSON.stringify(letter)})`);const lesson=run('LetterCurriculum.lesson(activeLetter)'),layout=run('composition.get(0)'),rows=app.nodes.practice.children;
 assert.equal(layout.lessonPlanVersion,2);assert(!layout.textRowsCustomized);assert(layout.textRows.every(r=>!r.deferred));
 let last=-1;for(const row of rows){const stage=row.dataset.lessonStage,index=lesson.stages.indexOf(stage);assert(index>=last,letter+' unordered '+stage);assert(index>=0);last=index}
 assert(rows.some(r=>r.dataset.lessonStage==='lower-letter'));assert(rows.some(r=>r.dataset.lessonStage==='upper-letter'));
 for(const row of layout.textRows)assert(run(`LetterCurriculum.canUseText(${JSON.stringify(letter)},${JSON.stringify(row.text)})`),letter+' future letters in '+row.text);
 const lowerRows=rows.filter(r=>r.dataset.lessonStage==='lower-elements');for(const row of lowerRows)assert(row.attrs['aria-label'].startsWith(letter.toLowerCase()+' ·'));
 for(let i=0;i<5;i++)assert(run(`composition.defaults(${i}).textRows.every(r=>!r.deferred&&!!composition.normalizeText(r.text))`));
}
run("build(0,'Н')");const n=run('composition.get(0).textRows.map(r=>r.text)');assert(n.includes('он')&&n.includes('Нина')&&n.includes('Она и он.'));
assert.equal(run("LetterCurriculum.canUseText('Р','Мама мыла раму.')"),false);assert.equal(run("LetterCurriculum.canUseText('М','Мама мыла раму.')"),true);
console.log('PASS: all33 lessons / five styles follow lowercase-elements → lowercase → combinations/words → uppercase-elements → uppercase → meaningful capital/sentence/review stages; only introduced GOST glyphs used');
