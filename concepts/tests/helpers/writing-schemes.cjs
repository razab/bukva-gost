module.exports=function(){
 const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),dir=path.resolve(__dirname,'..'),root=path.resolve(dir,'../..'),h=fs.readFileSync(dir+'/worksheet.test.cjs','utf8').split('let app=boot();')[0],a=new Function('require','__dirname',h+'return boot({"gost-learner-ui-preferences-v1":JSON.stringify({options:{schemes:true}})},"learner");')(require,dir),run=s=>a.run(s),plain=v=>JSON.parse(JSON.stringify(v));
 const beforeContext={};vm.createContext(beforeContext);vm.runInContext(fs.readFileSync(dir+'/fixtures/glyphs-build49.js','utf8'),beforeContext);const before=vm.runInContext('DrawingGlyphs',beforeContext),after=run('DrawingGlyphs'),metadata=JSON.parse(fs.readFileSync(root+'/references/isopromat-fonts/writing-instructions.json')),font=JSON.parse(fs.readFileSync(root+'/references/isopromat-fonts/demonstration-routes.json'));
 const upper={А:3,Б:3,В:3,Г:2,Д:4,Е:3,Ё:5,Ж:3,З:2,И:3,Й:4,К:3,Л:2,М:4,Н:3,О:1,П:2,Р:2,С:1,Т:2,У:2,Ф:3,Х:2,Ц:2,Ч:2,Ш:3,Щ:3,Ъ:2,Ы:3,Ь:2,Э:2,Ю:4,Я:3},lower={а:1,б:1,в:3,г:1,д:2,е:3,ё:5,ж:3,з:2,и:1,й:2,к:3,л:2,м:4,н:3,о:1,п:2,р:2,с:1,т:3,у:2,ф:3,х:2,ц:2,ч:2,ш:3,щ:3,ъ:2,ы:3,ь:2,э:2,ю:4,я:3};
 assert.equal(Object.keys(metadata).length,66);assert.equal(run('drawingGeometryRevision'),'4633c1e3');
 for(const c of Object.keys(before))for(const key of ['model','outline','revision','advance','bounds','inkBounds'])assert.deepEqual(plain(after[c][key]),plain(before[c][key]),c+' changed assessment/storage geometry');
 for(const [c,count]of Object.entries({...upper,...lower})){
  const glyph=after[c],model=glyph.demonstration;assert.equal(model.length,count,c+' source step count');assert.equal(glyph.instruction.steps.length,count);assert.deepEqual(plain(glyph.instruction),metadata[c]);assert(['direct','analogy','diacritic'].includes(glyph.instruction.basis));assert(glyph.instruction.source.includes('#page=36'));
  for(let i=0;i<model.length;i++)for(let j=0;j<model[i].length;j++){const [x,y]=font[c][i][j],p=model[i][j];assert(Math.abs(30+x/14-p[0])<1e-6&&Math.abs(140-y/14-p[1])<1e-6,c+' durable route mismatch')}
  const layout=run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`);assert.equal(layout.length,count);assert.equal(glyph.instruction.notation.length,count);
  for(let i=0;i<count;i++){assert.equal(layout[i].line,model[i]);assert.deepEqual(plain(layout[i].label),metadata[c].notation[i].label);assert.equal(layout[i].arrows.length,metadata[c].notation[i].dot?0:metadata[c].notation[i].continuation?2:1);assert(layout[i].arrowLine.flat().every(Number.isFinite));assert(layout[i].label[0]>=8&&layout[i].label[0]<=142&&layout[i].label[1]>=8&&layout[i].label[1]<=172,c+' clipped label');for(let j=0;j<i;j++)assert(Math.hypot(layout[i].label[0]-layout[j].label[0],layout[i].label[1]-layout[j].label[1])>=15,c+' colliding labels');for(const arrow of layout[i].arrows)assert(arrow.point.every(Number.isFinite)&&arrow.unit.every(Number.isFinite))}
  assert.equal(run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)===WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`),true);
 }
 // Association is separate from collision clearance: a number can sit in the
 // wrong bowl without touching anything. Curved paths are sampled every3 units;
 // allow2 units only when neighbouring arrow ends meet.
 const associationErrors=parts=>parts.flatMap((p,i)=>{if(!p.arrowLine.length)return [];const distance=q=>Math.hypot(p.label[0]-q[0],p.label[1]-q[1]),own=Math.min(...p.arrowLine.map(distance)),other=Math.min(...parts.flatMap((q,j)=>i===j?[]:q.arrowLine.map(distance)));return distance(p.arrowLine[0])>30||own>other+2?[i+1]:[]});
 for(const c of Object.keys({...upper,...lower}))assert.equal(associationErrors(run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`)).length,0,c+' misleading number/arrow association');
 const bigV=run('WritingScheme.layout(DrawingGlyphs.В.demonstration)');assert(bigV[1].label[0]>after.В.inkBounds[2]+8&&bigV[1].label[1]>=85&&bigV[1].label[1]<=112,'В2 belongs outside the lower bowl');
 const oldBigV=bigV.map((p,i)=>({...p,label:i===1?[63,64]:p.label}));assert(associationErrors(oldBigV).includes(2),'must reject the reported В2 placement in the upper bowl');
 // К2/к2 must sit above the upper branch, rather than in the gap below it.
 for(const c of ['К','к']){const parts=run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`),[a,b]=parts[1].line,above=p=>p[1]+8<a[1]+(p[0]-a[0])*(b[1]-a[1])/(b[0]-a[0]);assert(parts[1].arrowLine.every(above),c+' second arrow must be above the upper branch');const former=run(`WritingScheme.parallel(DrawingGlyphs[${JSON.stringify(c)}].demonstration[1],{...DrawingGlyphs[${JSON.stringify(c)}].instruction.notation[1],offset:-12})`);assert(!former.every(above),'must reject former below-branch placement')}
 // Notation regression: numbers identify parallel arrows, never a shared start.
 for(const c of ['Е','Ё']){const q=run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`);assert(q[0].arrowLine[0][0]<40&&q[0].arrowLine.at(-1)[1]>140);assert(q[0].label[0]<30&&q[0].label[1]>40&&q[0].label[1]<65);assert(q[1].arrowLine.every(p=>p[1]<40));assert(q[1].label[1]<30);assert(q[0].line.at(-1)[0]>q[0].line[0][0]);assert(q[2].label[1]<q[2].line[0][1]);}
 const upperPe=run('WritingScheme.layout(DrawingGlyphs.П.demonstration)');
 assert(upperPe[1].arrowLine[0][1]<40&&upperPe[1].arrows[0].unit[1]>.9,'П arrow follows the right corner down');
 const lowerE=run('WritingScheme.layout(DrawingGlyphs.е.demonstration)');assert(lowerE[0].label[0]<30&&lowerE[0].label[1]>75&&lowerE[0].label[1]<95);assert(lowerE[1].label[0]>100);assert(lowerE[2].arrowLine.at(-1)[0]>lowerE[2].arrowLine[0][0]);
 const notationMarkup=run('WritingScheme.markup(DrawingGlyphs.Е.demonstration,"")');assert(!notationMarkup.includes('<circle'));assert(!notationMarkup.includes('data-leader'));assert.equal((notationMarkup.match(/data-direction-line=/g)||[]).length,3);
 const moves=c=>plain(after[c].demonstration),down=l=>l[0][1]<l.at(-1)[1];
 // Independent semantic checks from the source, rather than final paint alone.
 for(const c of ['А','И','Й']){const r=moves(c);assert(r.slice(0,2).every(down));if(c!=='А')assert(r[2][0][0]>r[2].at(-1)[0]&&down(r[2]))}
 for(const c of ['М','м']){const r=moves(c);assert(r[2][0][0]>r[2].at(-1)[0]&&down(r[2]),'М third is the right diagonal');assert(r[3][0][0]<r[3].at(-1)[0]&&down(r[3]),'М fourth is the left diagonal')}
 const E=moves('Е');assert(E[0].at(-1)[1]>E[2][0][1],'Е bottom must precede middle');const V=moves('В');assert(V[1][0][1]>V[2][0][1],'В lower bowl must precede upper');
 for(const c of ['Ф','ф'])assert(Math.abs(moves(c)[0][0][0]-moves(c)[0].at(-1)[0])<.1&&down(moves(c)[0]));
 for(const c of ['Х','х'])assert(moves(c)[0][0][0]>moves(c)[0].at(-1)[0]&&down(moves(c)[0]));
 for(const c of ['Э','э'])assert(moves(c)[1][0][0]<moves(c)[1].at(-1)[0],'Э middle runs left to right, as in the source');
 for(const c of ['Ш','Щ']){const r=moves(c);assert(r[1][0][0]>r[2][0][0],'Ш/Щ right before middle')}
 for(const c of ['ш','щ']){const r=moves(c);assert(r[0].at(-1)[0]>r[0][0][0]&&down(r[0]),'ш/щ first includes baseline');assert(r[1][0][0]>r[2][0][0],'ш/щ right before middle')}
 const t=moves('т');assert(down(t[1])&&t[1].at(-1)[0]>t[2][0][0]&&down(t[2]));
 for(const c of ['З','з']){const r=moves(c);assert(r[0].at(-1)[0]<r[1][0][0],'З upper stroke includes leftward middle')}
 for(const c of ['У','у','Ч','ч']){const r=moves(c);assert(r[0][0][0]>r[1][0][0]&&down(r[0]),'У/Ч right part first')}
 for(const c of ['Ю','ю']){const r=moves(c);assert(r[1][0][0]===r[2][0][0]);assert(r[3][0][0]<r[3].at(-1)[0])}
 for(const c of ['Й','й']){const last=moves(c).at(-1);assert(last[0][0]<last.at(-1)[0]&&Math.abs(last[0][1]-last.at(-1)[1])<.01)}
 for(const c of ['Ё','ё'])for(const dot of moves(c).slice(-2))assert(run(`WritingScheme.at(${JSON.stringify(dot)},0).length`)<3);
 assert(moves('а')[0].at(-1)[1]>moves('а')[0][0][1],'а continues down the right stem');
 for(const c of ['и','й']){
  const [body]=moves(c),last=body.at(-1),turn=body.at(-2);
  assert(last[0]===turn[0]&&last[1]>turn[1]+50,'The right stem returns down after the climb');
  assert(body[0][0]<turn[0]-30&&body[0][1]===turn[1],'Left-to-right upright body');
  const [scheme]=run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`);
  const [up,back]=scheme.arrows;
  assert(up.unit[1]<-.9&&back.unit[1]>.9,'One number, with arrows for the climb and the return');
  const clock=run(`demoClock(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`),segment=clock.segments[0];
  const turnAt=segment.start+(segment.end-segment.start)*segment.distances.at(-2)/segment.length;
  const positions=[turnAt-24,turnAt,turnAt+24].map(t=>clock.at(t,false).pen);
  assert(positions.every(Boolean)&&positions[0][1]>positions[1][1]&&positions[2][1]>positions[1][1],'The pencil stays in contact at the turn');
 }
 for(const c of ['а','С','с','г','О','о']){const clock=run(`demoClock(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`);assert.equal(clock.segments.length,1);assert(clock.at((clock.segments[0].start+clock.segments[0].end)/2,false).pen,'Connected directions keep pencil visible')}
 // The shared header frame must contain both letter outlines and every number,
 // including dots/descenders and bold expansion, without changing letter data.
 for(const c of Object.keys(upper))for(const expansion of [0,2.5]){
  const pair=[after[c],after[c.toLowerCase()]],box=run(`WritingScheme.frame([DrawingGlyphs[${JSON.stringify(c)}].demonstration,DrawingGlyphs[${JSON.stringify(c.toLowerCase())}].demonstration],${JSON.stringify(pair.map(g=>g.inkBounds))},${expansion})`),[x,y,w,h]=box;assert(w>0&&h>0);
  for(const [caseIndex,g] of pair.entries()){const b=g.inkBounds;assert(b[0]-expansion>=x&&b[1]-expansion>=y&&b[2]+expansion<=x+w&&b[3]+expansion<=y+h);const parts=run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(caseIndex?c.toLowerCase():c)}].demonstration)`);for(const p of parts){assert(p.label[0]-7>=x&&p.label[0]+7<=x+w&&p.label[1]-7>=y&&p.label[1]+7<=y+h);for(const q of p.arrowLines.flat())assert(q[0]-4>=x&&q[0]+4<=x+w&&q[1]-4>=y&&q[1]+4<=y+h)}}
 }
 // Header instructions exist immediately without opening the modal, and the
 // pinned companion contains the same static paths for scroll.
 for(const id of ['hero-scheme-upper','dock-scheme-upper']){assert(a.nodes[id].html.includes('data-step-number="3"'));assert(a.nodes[id].attrs['aria-label'].startsWith('Порядок написания А:'))}
 for(const id of ['hero-scheme-lower','dock-scheme-lower'])assert.equal((a.nodes[id].html.match(/data-step-number=/g)||[]).length,1);
 assert(!a.nodes['sample-panel'].open);assert.equal(a.nodes['hero-scheme-upper'].attrs.viewBox,a.nodes['hero-scheme-lower'].attrs.viewBox);assert.equal(a.nodes['hero-scheme-upper'].attrs.viewBox,a.nodes['dock-scheme-upper'].attrs.viewBox);
 // Opening the actual dialog renders both schemes; animation cannot mutate them.
 a.nodes['open-sample'].onclick();assert(a.nodes['sample-panel'].open);const source=a.nodes['scheme-upper'].html;assert(source.includes('data-step-number="3"'));assert(a.nodes['scheme-upper'].attrs['aria-label'].includes('Левая сторона'));
 for(let i=0;i<20;i++)run(`sequenceClock().at(${i*400})`);assert.equal(a.nodes['scheme-upper'].html,source);
 const ink=run('JSON.stringify(data)'),key=run('worksheetStorageKey()');run('configure({bold:150})');assert.equal(run('JSON.stringify(data)'),ink);assert.equal(run('worksheetStorageKey()'),key);assert(a.nodes['scheme-upper'].html.includes('data-step-number="3"'));
 a.nodes['sample-panel'].close();run("build(0,'Е')");a.nodes['open-sample'].onclick();assert(a.nodes['scheme-upper'].html.includes('data-step-number="3"'));assert(a.nodes['scheme-lower'].html.includes('data-step-number="3"'));for(const prefix of ['hero-scheme-','dock-scheme-']){assert(a.nodes[prefix+'upper'].html.includes('data-step-number="3"'));assert(a.nodes[prefix+'lower'].html.includes('data-step-number="3"'))}
 require('./letter-atlas.cjs')();
 require('./writing-scheme-clearance.cjs')({letters:'аБбЕеЁёВдвФЖжийКкОоПЭэ',negative:true});
 console.log('PASS55:К/к second arrow above branch with rejected former side; arrow/number associations including rejected old В2;  explicit parallel-arrow/number notation for66 forms; Е/е ownership/start-label regression; 66 source step counts/provenance/font round trips; static paths share demo arrays, labels in bounds/nonoverlapping, cached geometry; source-specific straight/curved/diacritic order and continuous joins; real dialog/bold/navigation; all assessment/storage geometry unchanged');
};
