// Source-backed K/k teaching order; contour and assessment remain independent.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),root=path.resolve(__dirname,'../..');
const load=file=>{const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(file,'utf8'),c);return vm.runInContext('DrawingGlyphs',c)};
const before=load(root+'/concepts/tests/fixtures/glyphs-build28.js'),after=load(root+'/concepts/components/glyphs.js');
for(const c of Object.keys(before))for(const key of ['model','outline','revision','bounds','inkBounds'])if(!['И','Й'].includes(c)||!['model','revision'].includes(key))assert.deepEqual(JSON.parse(JSON.stringify(after[c][key])),JSON.parse(JSON.stringify(before[c][key])),c+' '+key+' changed');
for(const c of ['К','к']){
 const routes=after[c].demonstration;assert.equal(routes.length,3);const [stem,upper,lower]=routes;
 assert(Math.abs(stem[0][0]-stem.at(-1)[0])<2&&stem[0][1]<stem.at(-1)[1]);
 assert(upper[0][0]>upper.at(-1)[0]+30&&upper[0][1]<upper.at(-1)[1]);
 assert(Math.abs(upper.at(-1)[0]-stem[0][0])<2,'Upper arm must reach stem before lower leg');
 assert(lower[0][0]>stem[0][0]+10&&lower.at(-1)[0]>lower[0][0]+15&&lower.at(-1)[1]>lower[0][1]+25);
 for(const line of [upper,lower])for(let i=1;i<line.length;i++)assert(line[i][1]>=line[i-1][1]-.1,'Arm unexpectedly reverses upward');
}
for(const c of ['О','о']){
 const [left,right]=after[c].demonstration;assert.equal(after[c].demonstration.length,2);assert.deepEqual([...left[0]],[...right[0]]);assert.deepEqual([...left.at(-1)],[...right.at(-1)]);
 const x=left[0][0];assert(left.every(p=>p[0]<=x+.001)&&right.every(p=>p[0]>=x-.001));
 for(const line of [left,right]){assert(line.at(-1)[1]-line[0][1]>50);for(let i=1;i<line.length;i++)assert(line[i][1]>=line[i-1][1]-.2,'O half must descend')}
}
for(const c of Object.keys(before).filter(c=>!['К','к','О','о','е','Й'].includes(c)))assert.deepEqual(JSON.parse(JSON.stringify(before[c].demonstration||null)),JSON.parse(JSON.stringify(after[c].demonstration||null)),c+' unrelated teaching order changed');
console.log('PASS: K/k stem → complete upper arm reaching stem → lower leg; O/o separate descending halves; all66 contours unchanged; only reviewed И/Й assessment/storage geometry revised; all other teaching orders preserved');

// Build47: a reviewed warm-up comes from the clean teaching route, not noisy
// raster junctions. Three е movements partition existing edges exactly.
const dir=__dirname,harness=fs.readFileSync(path.join(dir,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0];
const boot=saved=>new Function('require','__dirname',harness+'return boot(arguments[2],"learner");')(require,dir,saved),app=boot(),run=s=>app.run(s),plain=v=>JSON.parse(JSON.stringify(v));
run("build(0,'И')");
const parts=plain(run("WorksheetCatalog.elements.filter(p=>p.letters.includes('И'))"));assert.equal(parts.length,3);
for(const [i,part] of parts.entries()){
 assert.equal(part.model[0].length,2);assert.deepEqual(part.model[0],plain(after.И.demonstration[0].slice(i,i+2)));
 assert(part.legacyIds.includes('gost-b90-418-route-v2-'+i));
 const sourceId='gost-b90-418-route-v2-'+i,migrated=plain(run(`composition.validate({elementsVersion:2,elements:[{component:${JSON.stringify(sourceId)},repeats:5}],textRows:[]},0).elements`));
 assert.deepEqual(migrated,[{component:part.id,repeats:5}]);
 assert.equal(run(`evaluate(${JSON.stringify(part.model.map(l=>l.map(([x,y])=>[x/150,y/180])))},WorksheetCatalog.elements.find(p=>p.id===${JSON.stringify(part.id)}).model,1).score`),100);
}
for(const part of [parts[0],parts[2]])assert.equal(part.model[0][0][0],part.model[0][1][0],'I stem bends');
assert(run("LearnerExperience.core(composition.get(0)).elements.has('gost-b90-418-practice-v3-stem-left')"),'Core warm-up should keep the vertical');
assert.equal(run("composition.validate({elementsVersion:2,elements:[],textRows:[]},0).elements.length"),0);
run("data['element-v1-gost-b90-418-route-v2-0-0']=[[[.2,.3],[.2,.7]]];save()");const reopened=boot(app.saved);assert.equal(reopened.run("data['element-v1-gost-b90-418-route-v2-0-0'].length"),1);assert.equal(reopened.run("data['element-v1-gost-b90-418-practice-v3-stem-left-0']"),undefined);
const raw=plain(after.е.model[0]),routes=plain(after.е.demonstration);assert.deepEqual(routes,[raw.slice(10),raw.slice(1,11).reverse(),raw.slice(0,2)]);
const edges=lines=>lines.flatMap(line=>line.slice(1).map((p,i)=>[line[i],p].map(q=>JSON.stringify(q)).sort().join('|'))).sort();assert.deepEqual(edges(routes),edges([raw]));
assert.equal(run(`evaluate(${JSON.stringify(routes.map(l=>l.map(([x,y])=>[x/150,y/180])))},DrawingGlyphs.е.model,1).score`),100);
const clock=run('demoClock(DrawingGlyphs.е.demonstration,{startDelay:0,endDelay:0})');assert.equal(clock.segments.length,3);
for(let i=1;i<3;i++){assert.equal(clock.segments[i].start-clock.segments[i-1].end,420);assert.equal(clock.at(clock.segments[i-1].end+100,false).pen,null)}
for(const segment of clock.segments){const p=clock.at((segment.start+segment.end)/2,false).pen;assert(p?.every(Number.isFinite))}
const prior=load(root+'/concepts/tests/fixtures/glyphs-build46.js');
for(const c of Object.keys(prior))for(const key of ['model','outline','revision','bounds','inkBounds','advance'])if(!['И','Й'].includes(c)||!['model','revision'].includes(key))assert.deepEqual(plain(after[c][key]),plain(prior[c][key]),c+' changed '+key);
for(const c of Object.keys(prior).filter(c=>!['е','Й'].includes(c)))assert.deepEqual(plain(after[c].demonstration||null),plain(prior[c].demonstration||null));
console.log('PASS: И three exact clean teaching segments, straight vertical core, legacy selection/exclusion/ink migration and reload; е source-backed three strokes use every original edge once; real lifts, geometric score100; all unrelated assessment/storage geometry unchanged');
