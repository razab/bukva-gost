const fs=require('fs'),path=require('path'),assert=require('assert/strict'),directory=__dirname;
const harness=fs.readFileSync(path.join(directory,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0];
const boot=saved=>new Function('require','__dirname',harness+'return boot(arguments[2]);')(require,directory,saved);
let app=boot(),run=s=>app.run(s);const order=Array.from(run('LetterCurriculum.order')),known=new Set(Array.from(run('WorksheetCatalog.pictures.map(p=>p.id)'))),primaries=[];
for(const letter of order){run(`build(0,${JSON.stringify(letter)})`);const policy=run(`LessonPictures.lessons[${JSON.stringify(letter)}]`);assert(policy.parts.length>10,letter+' missing rationale');assert(policy.ids.every(id=>known.has(id)),letter+' unknown picture');for(let style=0;style<5;style++){const layout=run(`composition.defaults(${style})`);assert(policy.ids.includes(layout.picture));assert.equal(layout.pictureSelection,'lesson-default')}primaries.push(policy.ids[0])}
assert(new Set(primaries).size>=24,'default pictures are not varied enough');
// Canary: legacy implicit choice -> related default -> manual old picture ->
// reload -> contextual reset, without losing old ink or custom page text.
run("build(0,'У')");const drawingKey=run('worksheetStorageKey()');const saved={'drawing-active-letter-v1':'У','letter-page-composition-v2-423':JSON.stringify({version:1,variants:{0:{elementsVersion:2,picture:'art-kite',elements:[],textRows:[{id:'primary',text:'А - у - у !',repeats:1,enabled:true}]}}}),[drawingKey]:JSON.stringify({'art-kite':[[[.1,.2],[.3,.4]]]})};
app=boot(saved);assert.equal(run('composition.get(0).picture'),'art-fish');assert.equal(run('composition.get(0).elements.length'),0);assert.equal(run('composition.get(0).textRows[0].text'),'А - у - у !');assert.equal(run('data["art-kite"].length'),1);
app.nodes['picture-picker'].children[0].onclick();assert.equal(run('composition.get(0).picture'),'art-kite');assert.equal(run('composition.get(0).pictureSelection'),'custom');assert.equal(run('data["art-kite"].length'),1);
app=boot(saved);assert.equal(run('composition.get(0).picture'),'art-kite');app.nodes['picture-default'].onclick();assert.equal(run('composition.get(0).picture'),'art-fish');assert.equal(run('composition.get(0).pictureSelection'),'lesson-default');assert.equal(run('data["art-kite"].length'),1);
app=boot(saved);assert.equal(run('composition.get(0).picture'),'art-fish');assert.equal(run('composition.get(0).textRows[0].text'),'А - у - у !');
const legacy=run("composition.validate({elementsVersion:2,picture:'art-house',elements:[]},0)");assert.equal(legacy.picture,'art-house');assert.equal(legacy.pictureSelection,'custom');
const explicit=run("composition.validate({elementsVersion:2,picture:'art-kite',pictureSelection:'custom',elements:[]},0)");assert.equal(explicit.picture,'art-kite');
run("composition.update(0,{picture:'art-cup'});composition.update(0,{textRows:[]});build(0,'Н');build(0,'У')");assert.equal(run('composition.get(0).picture'),'art-cup');
console.log('PASS: 33 contextual drawing policies / 5 styles, '+new Set(primaries).size+' primary pictures; legacy defaults migrate; manual choices, custom text, exclusions and old drawing data survive reload; contextual reset and per-lesson isolation work');
