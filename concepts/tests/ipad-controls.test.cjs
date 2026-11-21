const fs=require('fs'),path=require('path'),assert=require('assert/strict');const h=fs.readFileSync(path.join(__dirname,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0],boot=new Function('require','__dirname',h+'return boot;')(require,__dirname),old='{"size":61,"bold":110,"tolerance":3,"rowGap":4,"columnGap":12,"letterGap":20}',saved={'letter-preferences-v1':old},app=boot(saved,'learner'),run=s=>app.run(s);function cell(stage='upper-letter'){return app.nodes.practice.children.find(r=>r.dataset.lessonStage===stage).children[0].parts}function draw(points){const canvas=cell().canvas,frame=JSON.parse(canvas.attrs['data-view-box']),r=canvas.getBoundingClientRect(),s=points.map(([x,y])=>[(x-frame.x)/frame.width*r.width,(y-frame.y)/frame.height*r.height]);canvas.emit('pointerdown',s[0]);for(const p of s.slice(1))canvas.emit('pointermove',p);canvas.emit('pointerup',s.at(-1))}
function scale(stage){
 const canvas=cell(stage).canvas;
 return canvas.getBoundingClientRect().height/JSON.parse(canvas.attrs['data-view-box']).height;
}
assert.equal(run('preferences.size'),52);
for(const line of run('models'))draw(line.map(([x,y])=>[x+13,y]));
const ink=run('JSON.stringify(data)');
for(const [level,size,tolerance] of [['precise',36,4],['standard',52,8],['easy',73,12]]){
 app.nodes['level-'+level].onclick();
 assert.equal(run('preferences.size'),size);
 assert.equal(run('preferences.tolerance'),tolerance);
 for(const stage of ['upper-letter','lower-letter'])assert(Math.abs(scale(stage)-size/100)<0.015,stage+' '+level);
 assert.equal(app.nodes['level-'+level].attrs['aria-pressed'],'true');
 assert(app.nodes['level-summary'].textContent.includes('Высота заглавной: '+size+' px.'));
}
assert.equal(run('preferences.bold'),100);assert.equal(run('JSON.stringify(data)'),ink);
run("build(variant,'О')");assert.equal(run('preferences.size'),73);
assert.equal(boot(saved,'learner').run('preferences.size'),73);
run("build(variant,'А')");assert.equal(run('JSON.stringify(data)'),ink);
app.nodes['open-developer'].onclick();assert.equal(app.nodes['developer-panel'].attrs.open,'');assert.equal(app.nodes['picture-picker'].children.length,40);assert(app.nodes['element-picker'].children.length>0);for(const [key,value] of Object.entries({size:135,bold:145,tolerance:5,rowGap:40,columnGap:30,letterGap:35})){const control=app.nodes['setting-'+key];control.oninput({target:{value}});if(key==='tolerance')control.onchange({target:{value}})}assert.equal(run('preferences.size'),135);assert.equal(run('preferences.bold'),145);assert.equal(run('preferences.tolerance'),5);assert.equal(app.nodes['level-easy'].attrs['aria-pressed'],'false');assert.equal(saved['letter-preferences-v1'],old);assert.equal(run('JSON.stringify(data)'),ink);app.nodes['close-developer'].onclick();assert.equal(run('DeveloperPanel.visible'),false);const reloaded=boot(saved,'learner');assert.equal(reloaded.run('preferences.size'),135);assert.equal(reloaded.run('preferences.tolerance'),5);assert.equal(reloaded.run('preferences.rowGap'),40);assert.equal(reloaded.run('preferences.letterGap'),35);
app.nodes['open-developer'].onclick();app.nodes['picture-picker'].children[1].onclick();assert.equal(run('composition.get(variant).picture'),'art-house');const element=app.nodes['element-picker'].children[0].children[0];element.checked=false;element.onchange();const removed=run('composition.get(variant).elements.length');const add=app.nodes['sequence-picker'].children.find(n=>n.className==='add-text-row');const rows=run('composition.get(variant).textRows.length');add.onclick();assert.equal(run('composition.get(variant).textRows.length'),rows+1);const again=boot(saved,'learner');assert.equal(again.run('composition.get(variant).elements.length'),removed);assert.equal(again.run('composition.get(variant).picture'),'art-house');assert.equal(again.run('composition.get(variant).textRows.length'),rows+1);assert.equal(again.run('JSON.stringify(data)'),ink);app.nodes['settings-legacy'].onclick();assert.equal(run('preferences.size'),61);assert.equal(saved['letter-preferences-v1'],old);app.nodes['level-standard'].onclick();assert.equal(run('preferences.tolerance'),8);assert.equal(run('preferences.size'),52);assert.equal(boot(saved,'learner').run('preferences.tolerance'),8);
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../components/learner.css'),'utf8');assert(!html.includes('>Готово</button>'));assert(/<footer[\s\S]*id="finish-session"/.test(html));assert(!/id="finish-session"[^>]*class="primary"/.test(html));assert(/id="undo"[^>]*><svg/.test(html));assert(/id="open-parent"[^>]*><svg/.test(html));assert(!css.includes('.writing:focus-within{outline:2px'));console.log('PASS: live/reloaded/global difficulty with all three actual letter sizes and unchanged bold/ink; six developer settings and old settings preserved; real picture/part/text editing persists; neutral completion in footer, vector icons and no active frame');

const backup=run('LocalBackup'),keys=Object.keys(saved),adapter={length:keys.length,key:i=>keys[i],getItem:k=>saved[k]??null},copy=backup.parse(backup.export(adapter)),imported=boot({...copy.entries},'learner');assert.equal(imported.run('preferences.size'),52);assert.equal(imported.run('preferences.tolerance'),8);assert.equal(imported.run('composition.get(variant).picture'),'art-house');assert.equal(imported.run('composition.get(variant).elements.length'),removed);assert.equal(imported.run('composition.get(variant).textRows.length'),rows+1);console.log('PASS: developer profile and custom page survive a real backup-file round trip to a fresh browser store');
app.nodes['developer-build']=new app.nodes.message.constructor();run('DeveloperPanel.sync()');assert.equal(app.nodes['developer-build'].textContent,'Разработка · '+run('worksheetBuild'));assert(html.includes('id="developer-build"'));console.log('PASS: developer version comes from the running build, without a stale hardcoded release');

const devKey='gost-developer-preferences-v1',levelKey='gost-learner-ui-preferences-v1';
const existing={[levelKey]: JSON.stringify({level:'precise'}),[devKey]:JSON.stringify({size:92,bold:105})};
const upgraded=boot(existing,'learner');
assert.equal(upgraded.run('preferences.size'),36);
assert.equal(upgraded.run('preferences.bold'),105);
upgraded.run('configure({size:92}); configure({smoothing:2})');
assert.equal(boot(existing,'learner').run('preferences.size'),92);
upgraded.nodes['level-easy'].onclick();
upgraded.nodes['level-ideal'].onclick();
const technical=boot(existing,'learner');
assert.equal(technical.run('preferences.size'),73);
assert.equal(technical.run('preferences.bold'),105);
assert.equal(technical.run('preferences.tolerance'),2);
technical.nodes['settings-defaults'].onclick();
assert.equal(technical.run('preferences.size'),73);
assert.equal(technical.run('preferences.tolerance'),12);
console.log('PASS: inherited old size replaced; manual 92 and other overrides preserved on reload; technical tolerance leaves the selected size; developer reset returns to the active level');
