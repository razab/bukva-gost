module.exports=function({boot,canary=false}){
 const fs=require('fs'),path=require('path'),assert=require('assert/strict');
 const baseline=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../references/curriculum-build55.json'))).lessons;
 function oldRows(letter){
  const e=baseline[letter],rows=[],used=new Set(),add=(text,repeats,stage)=>{if(used.has(text))return;used.add(text);rows.push({id:rows.length?'row-'+rows.length:'primary',text,repeats,enabled:true,stage,deferred:false})};
  add(e.combinations[0]||letter.toLowerCase().repeat(3),3,'lower-practice');e.words.slice(0,2).forEach(t=>add(t,2,'lower-practice'));e.capitals.slice(0,2).forEach(t=>add(t,1,'upper-practice'));e.sentences.slice(0,1).forEach(t=>add(t,1,'consolidation'));e.review.slice(0,1).forEach(t=>add(t,1,'review'));return rows;
 }
 const results=[];
 for(const letter of canary?['А','К']:Object.keys(baseline)){
  let a=boot();a.run(`build(0,${JSON.stringify(letter)})`);
  const key=a.run('composition.key'),previous={...a.run('composition.defaults(0)'),lessonPlanVersion:2,textRows:oldRows(letter),textRowsCustomized:false,elements:[],picture:'art-house',pictureSelection:'custom'};
  const raw=JSON.stringify({version:1,variants:{0:previous}}),saved={[key]:raw,'drawing-active-letter-v1':letter};
  a=boot(saved);assert.equal(a.run('composition.get(0).textRowsCustomized'),false,letter+' recognised default');
  assert.equal(saved[key+'-before-lesson-plan-3'],raw,letter+' exact archived source');
  assert.equal(a.run('composition.get(0).elements.length'),0);assert.equal(a.run('composition.get(0).picture'),'art-house');
  const text=a.run('composition.get(0).textRows.find(r=>r.stage==="consolidation")?.text');
  assert.equal(text,a.run('LetterCurriculum.lesson(activeLetter).examples.sentences[0]'),letter);
  if(letter==='К')assert(text.length>24&&text.split('.').filter(t=>t.trim()).length>=2,'К must contain real connected text');
  a.run("data['gost-file-b90-upper-0']=[[[.2,.3],[.4,.5]]];save();composition.update(0,{picture:'art-house'})");
  const ink=a.run('JSON.stringify(data)'),rows=a.run('JSON.stringify(composition.get(0).textRows)');a=boot(saved);
  assert.equal(a.run('JSON.stringify(data)'),ink);assert.equal(a.run('JSON.stringify(composition.get(0).textRows)'),rows);assert.equal(saved[key+'-before-lesson-plan-3'],raw);
  // An explicit manual flag, modified repeats or a disabled row must not migrate.
  for(const mutate of [p=>p.textRowsCustomized=true,p=>p.textRows[0].repeats=5,p=>p.textRows[0].enabled=false]){
   const custom=structuredClone(previous);mutate(custom);const s={[key]:JSON.stringify({version:1,variants:{0:custom}}),'drawing-active-letter-v1':letter},b=boot(s);
   assert.equal(JSON.stringify(b.run('composition.get(0).textRows.map(r=>({id:r.id,text:r.text,repeats:r.repeats,enabled:r.enabled}))')),JSON.stringify(custom.textRows.map(({id,text,repeats,enabled})=>({id,text,repeats,enabled}))),letter+' preserve authored rows');
  }
  // The learner has its own shorter plan and storage key; test that real path too.
  let learner=boot({},'learner');learner.run(`build(0,${JSON.stringify(letter)})`);
  const learnerKey=learner.run('composition.key'),learnerOld=learner.run(`LearnerExperience.layout(${JSON.stringify(previous)},${JSON.stringify(letter)})`),learnerRaw=JSON.stringify({version:1,variants:{0:learnerOld}}),learnerSaved={[learnerKey]:learnerRaw,'drawing-active-letter-v1':letter};
  learner=boot(learnerSaved,'learner');assert.equal(learner.run('composition.get(0).textRowsCustomized'),false,letter+' learner exact default');assert.equal(learner.run('composition.get(0).textRows.find(r=>r.stage==="consolidation")?.text'),text);assert.equal(learnerSaved[learnerKey+'-before-lesson-plan-3'],learnerRaw);
  results.push({letter,archive:'exact',custom:'preserved',rawInk:'preserved',reload:'stable',text});
 }
 let a=boot();a.run("build(0,'К')");
 assert.equal(a.run('LetterSequence.maxTextLength'),120);
 assert.equal(a.run("LetterSequence.normalizeText('к'.repeat(120),{lesson:'К'})").length,120);
 assert.equal(a.run("LetterSequence.normalizeText('к'.repeat(121),{lesson:'К'})"),null);
 assert.equal(a.run("composition.storedText('к'.repeat(120))").length,120);assert.equal(a.run("composition.storedText('к'.repeat(121))"),null);
 assert.throws(()=>a.run("LetterSequence.compose('к'.repeat(121),sequenceSources)"),/Invalid sequence text/);
 for(const width of [180,400,850]){
  const spec=a.run(`LetterSequence.compose(LetterCurriculum.lesson('К').examples.sentences[0],sequenceSources,{gap:20,bold:150,maxWidth:${width}})`);
  assert.equal(spec.glyphs.length,spec.text.replace(/ /g,'').length);assert(spec.breaks.length>0);assert(spec.glyphs.some(g=>g.y>0));
 }
 const previous={...a.run('composition.defaults(0)'),lessonPlanVersion:2,textRows:oldRows('К'),textRowsCustomized:false};
 a.context.localStorage.setItem=(key)=>{if(key.includes('-before-lesson-plan-'))throw Error('quota')};
 a.context.localStorage.getItem=key=>key==='quota-plan'?JSON.stringify({version:1,variants:{0:previous}}):null;
 a.run("var archiveErrors=0;var quotaPlan=new PageComposition({letter:'К',key:'quota-plan',onSaveError:()=>archiveErrors++})");
 assert.equal(a.run('archiveErrors'),1);assert.equal(a.run("quotaPlan.get(0).textRows.find(r=>r.stage==='consolidation').text"),baseline.К.sentences[0],'do not migrate without archive');
 const long=boot({},'learner');long.nodes.practice.clientWidth=240;long.context.devicePixelRatio=3;
 long.run("build(0,'К');composition.update(0,{textRows:[{id:'primary',text:'К'.repeat(120),repeats:1,enabled:true}]});configure({size:160,bold:150});build(0,'К')");
 const id=long.run('surfaces.find(s=>s.id?.includes("sequence")).id');assert(id.length>500&&id.length<=1536,'real long-text identifier must fit bounded storage validators');
 long.run(`data[${JSON.stringify(id)}]=[[[.2,.3],[.4,.5]]];save()`);
 assert.equal(long.run('LocalBackup.parse(JSON.stringify({format:LocalBackup.format,version:1,entries:{[worksheetStorageKey()]:JSON.stringify(data)}})).fields'),1);
 long.run(`var longAttempts=new PracticeAttempts(localStorage);longAttempts.record({letter:'К',id:${JSON.stringify(id)},label:'К'.repeat(120),profile:'trace',strokes:data[${JSON.stringify(id)}],score:18})`);assert.equal(long.run("longAttempts.tasks('К').length"),1);
 const walk=n=>[n,...n.children.flatMap(walk)],canvas=walk(long.nodes.practice).find(n=>n.parts?.canvas?.attrs['data-surface-id']===id).parts.canvas;
 assert(canvas.width*canvas.height<=4194304&&Math.max(canvas.width,canvas.height)<=8192,'long fields must have a bounded backing bitmap');
 assert.throws(()=>long.run("LocalBackup.validateInk({['x'.repeat(1537)]:[[[.2,.3]]]})"),/Некорректные/);
 if(!canary){
  const reference=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../references/propisi-2019-content.json'))),review=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../references/qa/course-2026-11-07.json')));
  assert.equal(review.rows.length,33);
  for(const group of reference.lesson_groups){
   const text=a.run(`LetterCurriculum.lesson(${JSON.stringify(group.letter)}).examples.sentences[0]`),record=review.rows.find(r=>r.letter===group.letter);
   assert.deepEqual(record.pages,group.page_ids);assert.equal(record.copyText,text||null);
   if(group.features.includes('connected-text')||'ТКС'.includes(group.letter))assert(text.split(/[.!?]/).filter(t=>t.trim()).length>=2,group.letter+' reference requires connected copying');
   if(text)assert(a.run(`LetterCurriculum.canUseText(${JSON.stringify(group.letter)},${JSON.stringify(text)})`),group.letter+' future letters');
  }
 }
 if(process.env.COURSE_CANARY_REPORT)fs.writeFileSync(process.env.COURSE_CANARY_REPORT,JSON.stringify({status:'PASS',results,limit:120,quota:'preserve old rows'},null,2));
 console.log(`PASS: course ${canary?'А/К canary':results.length+'-lesson migration'}; exact archives, manual flags/repeats/exclusions, raw ink/reload; bounded connected text/wrap; archive failure preserves old plan`);
};
