module.exports=function(){
 const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),dir=path.resolve(__dirname,'..'),root=path.resolve(dir,'../..'),h=fs.readFileSync(dir+'/worksheet.test.cjs','utf8').split('let app=boot();')[0],a=new Function('require','__dirname',h+'return boot({},"learner");')(require,dir),run=s=>a.run(s),plain=v=>JSON.parse(JSON.stringify(v));
 const beforeContext={};vm.createContext(beforeContext);vm.runInContext(fs.readFileSync(dir+'/fixtures/glyphs-build49.js','utf8'),beforeContext);const before=vm.runInContext('DrawingGlyphs',beforeContext),after=run('DrawingGlyphs'),metadata=JSON.parse(fs.readFileSync(root+'/references/isopromat-fonts/writing-instructions.json')),font=JSON.parse(fs.readFileSync(root+'/references/isopromat-fonts/demonstration-routes.json'));
 const upper={А:3,Б:3,В:3,Г:2,Д:5,Е:4,Ё:6,Ж:5,З:2,И:3,Й:4,К:3,Л:2,М:4,Н:3,О:2,П:3,Р:2,С:2,Т:2,У:2,Ф:3,Х:2,Ц:4,Ч:2,Ш:4,Щ:5,Ъ:3,Ы:3,Ь:2,Э:3,Ю:4,Я:3},lower={а:2,б:4,в:3,г:2,д:3,е:3,ё:5,ж:5,з:2,и:2,й:3,к:3,л:2,м:4,н:3,о:2,п:2,р:2,с:2,т:4,у:2,ф:3,х:2,ц:3,ч:2,ш:4,щ:5,ъ:3,ы:3,ь:2,э:3,ю:4,я:3};
 assert.equal(Object.keys(metadata).length,66);assert.equal(run('drawingGeometryRevision'),'4633c1e3');
 for(const c of Object.keys(before))for(const key of ['model','outline','revision','advance','bounds','inkBounds'])assert.deepEqual(plain(after[c][key]),plain(before[c][key]),c+' changed assessment/storage geometry');
 for(const [c,count]of Object.entries({...upper,...lower})){
  const glyph=after[c],model=glyph.demonstration;assert.equal(model.length,count,c+' source step count');assert.equal(glyph.instruction.steps.length,count);assert.deepEqual(plain(glyph.instruction),metadata[c]);assert(['direct','analogy','diacritic'].includes(glyph.instruction.basis));assert(glyph.instruction.source.includes('#page=36'));
  for(let i=0;i<model.length;i++)for(let j=0;j<model[i].length;j++){const [x,y]=font[c][i][j],p=model[i][j];assert(Math.abs(30+x/14-p[0])<1e-6&&Math.abs(140-y/14-p[1])<1e-6,c+' durable route mismatch')}
  const layout=run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`);assert.equal(layout.length,count);assert.equal(glyph.instruction.notation.length,count);
  for(let i=0;i<count;i++){assert.equal(layout[i].line,model[i]);assert.deepEqual(plain(layout[i].label),metadata[c].notation[i].label);assert.equal(layout[i].arrows.length,metadata[c].notation[i].dot?0:1);assert(layout[i].arrowLine.flat().every(Number.isFinite));assert(layout[i].label[0]>=8&&layout[i].label[0]<=142&&layout[i].label[1]>=8&&layout[i].label[1]<=172,c+' clipped label');for(let j=0;j<i;j++)assert(Math.hypot(layout[i].label[0]-layout[j].label[0],layout[i].label[1]-layout[j].label[1])>=15,c+' colliding labels');for(const arrow of layout[i].arrows)assert(arrow.point.every(Number.isFinite)&&arrow.unit.every(Number.isFinite))}
  assert.equal(run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)===WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`),true);
 }
 // Notation regression: numbers identify parallel arrows, never a shared start.
 for(const c of ['Е','Ё']){const q=run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`);assert(q[0].arrowLine.every(p=>p[0]<40));assert(q[0].label[0]<30&&q[0].label[1]>40&&q[0].label[1]<65);assert(q[1].arrowLine.every(p=>p[1]<40));assert(q[1].label[1]<30);assert(q[2].arrowLine.every(p=>p[1]>140));assert(q[3].label[1]<q[3].line[0][1]);}
 const lowerE=run('WritingScheme.layout(DrawingGlyphs.е.demonstration)');assert(lowerE[0].label[1]<60);assert(lowerE[1].label[0]>100);assert(lowerE[2].arrowLine.at(-1)[0]>lowerE[2].arrowLine[0][0]);
 const notationMarkup=run('WritingScheme.markup(DrawingGlyphs.Е.demonstration,"")');assert(!notationMarkup.includes('<circle'));assert(!notationMarkup.includes('data-leader'));assert.equal((notationMarkup.match(/data-direction-line=/g)||[]).length,4);
 const moves=c=>plain(after[c].demonstration),down=l=>l[0][1]<l.at(-1)[1];
 // Independent semantic checks from the source, rather than final paint alone.
 for(const c of ['А','И','Й']){const r=moves(c);assert(r.slice(0,2).every(down));if(c!=='А')assert(r[2][0][0]>r[2].at(-1)[0]&&down(r[2]))}
 for(const c of ['М','м']){const r=moves(c);assert(r[2][0][0]>r[2].at(-1)[0]&&down(r[2]),'М third is the right diagonal');assert(r[3][0][0]<r[3].at(-1)[0]&&down(r[3]),'М fourth is the left diagonal')}
 const E=moves('Е');assert(E[2][0][1]>E[3][0][1],'Е bottom must precede middle');const V=moves('В');assert(V[1][0][1]>V[2][0][1],'В lower bowl must precede upper');
 for(const c of ['Ф','ф'])assert(Math.abs(moves(c)[0][0][0]-moves(c)[0].at(-1)[0])<.1&&down(moves(c)[0]));
 for(const c of ['Х','х'])assert(moves(c)[0][0][0]>moves(c)[0].at(-1)[0]&&down(moves(c)[0]));
 for(const c of ['Э','э'])assert(moves(c)[2][0][0]>moves(c)[2].at(-1)[0],'Э middle runs right to left');
 for(const c of ['Ш','Щ']){const r=moves(c);assert(r[1][0][0]>r[2][0][0],'Ш/Щ right before middle')}
 for(const c of ['ш','щ']){const r=moves(c);assert(Math.abs(r[1][0][1]-r[1].at(-1)[1])<.1,'ш/щ second is baseline');assert(r[2][0][0]>r[3][0][0],'ш/щ right before middle')}
 const t=moves('т');assert(Math.abs(t[1][0][1]-t[1].at(-1)[1])<.1);assert(t[2].at(-1)[0]>t[3][0][0]&&down(t[3]));
 for(const c of ['З','з']){const r=moves(c);assert(r[0].at(-1)[0]<r[1][0][0],'З upper stroke includes leftward middle')}
 for(const c of ['У','у','Ч','ч']){const r=moves(c);assert(r[0][0][0]>r[1][0][0]&&down(r[0]),'У/Ч right part first')}
 for(const c of ['Ю','ю']){const r=moves(c);assert(r[1][0][0]===r[2][0][0]);assert(r[3][0][0]<r[3].at(-1)[0])}
 for(const c of ['Й','й']){const last=moves(c).at(-1);assert(last[0][0]<last.at(-1)[0]&&Math.abs(last[0][1]-last.at(-1)[1])<.01)}
 for(const c of ['Ё','ё'])for(const dot of moves(c).slice(-2))assert(run(`WritingScheme.at(${JSON.stringify(dot)},0).length`)<3);
 assert.notDeepEqual(moves('а')[0][0],moves('а')[0].at(-1),'а body should not retrace the right stem');
 for(const c of ['С','с','г']){const clock=run(`demoClock(DrawingGlyphs[${JSON.stringify(c)}].demonstration)`);assert.equal(clock.segments[0].end,clock.segments[1].start,'Connected directions must keep pencil visible')}
 // The shared header frame must contain both letter outlines and every number,
 // including dots/descenders and bold expansion, without changing letter data.
 for(const c of Object.keys(upper))for(const expansion of [0,2.5]){
  const pair=[after[c],after[c.toLowerCase()]],box=run(`WritingScheme.frame([DrawingGlyphs[${JSON.stringify(c)}].demonstration,DrawingGlyphs[${JSON.stringify(c.toLowerCase())}].demonstration],${JSON.stringify(pair.map(g=>g.inkBounds))},${expansion})`),[x,y,w,h]=box;assert(w>0&&h>0);
  for(const [caseIndex,g] of pair.entries()){const b=g.inkBounds;assert(b[0]-expansion>=x&&b[1]-expansion>=y&&b[2]+expansion<=x+w&&b[3]+expansion<=y+h);const parts=run(`WritingScheme.layout(DrawingGlyphs[${JSON.stringify(caseIndex?c.toLowerCase():c)}].demonstration)`);for(const p of parts){assert(p.label[0]-7>=x&&p.label[0]+7<=x+w&&p.label[1]-7>=y&&p.label[1]+7<=y+h);for(const q of p.arrowLine)assert(q[0]-4>=x&&q[0]+4<=x+w&&q[1]-4>=y&&q[1]+4<=y+h)}}
 }
 // Header instructions exist immediately without opening the modal, and the
 // pinned companion contains the same static paths for scroll.
 for(const id of ['hero-scheme-upper','dock-scheme-upper']){assert(a.nodes[id].html.includes('data-step-number="3"'));assert(a.nodes[id].attrs['aria-label'].startsWith('Порядок написания А:'))}
 for(const id of ['hero-scheme-lower','dock-scheme-lower'])assert(a.nodes[id].html.includes('data-step-number="2"'));
 assert(!a.nodes['sample-panel'].open);assert.equal(a.nodes['hero-scheme-upper'].attrs.viewBox,a.nodes['hero-scheme-lower'].attrs.viewBox);assert.equal(a.nodes['hero-scheme-upper'].attrs.viewBox,a.nodes['dock-scheme-upper'].attrs.viewBox);
 // Opening the actual dialog renders both schemes; animation cannot mutate them.
 a.nodes['open-sample'].onclick();assert(a.nodes['sample-panel'].open);const source=a.nodes['scheme-upper'].html;assert(source.includes('data-step-number="3"'));assert(a.nodes['scheme-upper'].attrs['aria-label'].includes('Левая сторона'));
 for(let i=0;i<20;i++)run(`sequenceClock().at(${i*400})`);assert.equal(a.nodes['scheme-upper'].html,source);
 const ink=run('JSON.stringify(data)'),key=run('worksheetStorageKey()');run('configure({bold:150})');assert.equal(run('JSON.stringify(data)'),ink);assert.equal(run('worksheetStorageKey()'),key);assert(a.nodes['scheme-upper'].html.includes('data-step-number="3"'));
 a.nodes['sample-panel'].close();run("build(0,'Е')");a.nodes['open-sample'].onclick();assert(a.nodes['scheme-upper'].html.includes('data-step-number="4"'));assert(a.nodes['scheme-lower'].html.includes('data-step-number="3"'));for(const prefix of ['hero-scheme-','dock-scheme-']){assert(a.nodes[prefix+'upper'].html.includes('data-step-number="4"'));assert(a.nodes[prefix+'lower'].html.includes('data-step-number="3"'))}
 console.log('PASS52: explicit parallel-arrow/number notation for66 forms; Е/е ownership/start-label regression; 66 source step counts/provenance/font round trips; static paths share demo arrays, labels in bounds/nonoverlapping, cached geometry; source-specific straight/curved/diacritic order and continuous joins; real dialog/bold/navigation; all assessment/storage geometry unchanged');
};
