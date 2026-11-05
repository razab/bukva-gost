const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../components/worksheet-dock.js','utf8');
class Node{
 constructor(id){this.id=id;this.dataset={};this.attrs={};this.hidden=false;this.innerHTML='';this.isConnected=true;this.width=100;this.height=100;this.rect={left:0,top:0,width:300,height:120,bottom:120};this.style={setProperty(k,v){this[k]=v}};this.calls=[]}
 getBoundingClientRect(){return this.rect}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}getContext(){return {clearRect:(...a)=>this.calls.push(['clear',...a]),drawImage:(...a)=>this.calls.push(['copy',...a])}}
}
function fixture(){
 const ids=['worksheet-hero','hero-demo','dock-demo-region','writing-dock','hero-visual','hero-illustration','inline-loupe','inline-loupe-guide','inline-loupe-ruling','inline-loupe-ink','inline-loupe-feedback','dock-loupe','dock-loupe-guide','dock-loupe-ruling','dock-loupe-ink','dock-loupe-feedback','dock-illustration','reference','dock-reference','reference-word','art-guide','dock-art-guide','dock-word','art-canvas','dock-art-ink'];const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id)])),toolbar=new Node('toolbar'),body=new Node('body'),events={},frames=new Map();let next=1,writing=false;
 toolbar.rect={bottom:65};nodes['worksheet-hero'].rect.top=88;nodes.reference.src='watermelon.png';nodes.reference.alt='Арбуз';nodes['reference-word'].innerHTML='арбуз';nodes['art-guide'].innerHTML='<path d="M0 0L50 50"/>';
 const canvas=new Node('student'),original=new Node('guide');canvas.dataset={surfaceId:'independent-gost-b90-А',viewBox:JSON.stringify({x:10,y:20,width:80,height:120}),rulingLevels:'[40,70,140]'};canvas.rect={left:100,top:300,width:80,height:120,bottom:420};canvas.width=160;canvas.height=240;canvas.attrs['aria-label']='Самостоятельно: А';original.innerHTML='<circle class="reference-anchor" cx="50" cy="40"/>';canvas.parentElement={querySelector:()=>original};let canvases=[canvas];
 const document={body,querySelector:s=>s==='.appbar'?toolbar:nodes[s.slice(1)],querySelectorAll:()=>canvases},window={scrollY:0,addEventListener(name,fn,options){assert(options.passive);events[name]=fn}},ctx={document,window,devicePixelRatio:2,ResizeObserver:class{constructor(fn){this.fn=fn}observe(){}},requestAnimationFrame(fn){const id=next++;frames.set(id,fn);return id}};
 vm.createContext(ctx);vm.runInContext(source,ctx);const dock=vm.runInContext('WorksheetDock',ctx);assert(dock.mount({isWriting:()=>writing}));assert(dock.mount());
 return {dock,nodes,canvas,original,frames,events,window,body,setWriting:v=>writing=v,replace:c=>canvases=[c],flush(){for(let pass=0;frames.size;pass++){assert(pass<10,'Mirror must not own an endless animation loop');const batch=[...frames.values()];frames.clear();batch.forEach(f=>f())}},scroll(y){window.scrollY=y;nodes['worksheet-hero'].rect.top=88-y;events.scroll()}};
}
let f=fixture(),d=f.dock;f.flush();const sourceBefore=JSON.stringify(f.canvas.dataset),top=f.canvas.rect.top;
d.onBuild('А');d.select(f.canvas);for(let i=0;i<100;i++)d.mirror(f.canvas);assert.equal(f.frames.size,1);f.flush();
assert.equal(f.nodes['hero-demo'].dataset.view,'writing');assert.equal(f.nodes['dock-demo-region'].dataset.view,'writing');assert.equal(f.nodes['dock-illustration'].hidden,false);assert.equal(f.canvas.rect.top,top);assert(f.nodes['inline-loupe-guide'].innerHTML.includes('reference-anchor'));assert(!f.nodes['inline-loupe-guide'].innerHTML.includes('corridor'));assert(f.nodes['inline-loupe-ink'].calls.some(c=>c[0]==='copy'&&c[1]===f.canvas));assert.equal(f.canvas.calls.length,0,'Mirror may not repaint its source');assert.equal(JSON.stringify(f.canvas.dataset),sourceBefore);
f.setWriting(true);f.scroll(350);assert.equal(d.compact,false,'Scroll presentation must stay frozen under the pen');f.setWriting(false);d.release();f.flush();assert(d.compact);assert(!f.nodes['writing-dock'].hidden);assert(d.selected===f.canvas);assert(f.nodes['dock-loupe-ink'].calls.some(c=>c[0]==='copy'));d.release();assert(d.selected===f.canvas,'Pen-up must retain the same trial');
f.setWriting(true);f.scroll(0);assert(d.selected);f.setWriting(false);d.release();f.flush();assert.equal(d.selected,null);assert(f.nodes['writing-dock'].hidden);assert.equal(f.nodes['hero-demo'].dataset.view,'demo');
f.scroll(350);f.flush();assert(f.nodes['dock-art-ink'].calls.some(c=>c[0]==='copy'&&c[1]===f.nodes['art-canvas']));
// A selected letter must not freeze the separate illustration's ink copy.
d.select(f.canvas);f.flush();const artCopies=f.nodes['dock-art-ink'].calls.filter(c=>c[0]==='copy').length;
d.mirror(f.nodes['art-canvas']);assert.equal(f.frames.size,1);f.flush();
assert(f.nodes['dock-art-ink'].calls.filter(c=>c[0]==='copy').length>artCopies);
assert.equal(d.selected,f.canvas);assert(f.nodes['dock-art-ink'].calls.at(-1).includes(f.nodes['art-canvas']));
d.clear();
console.log('PASS canary: source drawing stays put → one mirror frame per burst → only source hints copied → pen-up retains trial → frozen scroll transition releases safely → return top restores picture; source canvas/data never modified');

// Every input frame fits, including long text, tiny viewports and large letters.
// Coordinates supplied for old camera calls are intentionally irrelevant.
for(const frame of [{x:0,y:0,width:1000,height:1000},{x:30,y:40,width:70,height:120},{x:-20,y:10,width:800,height:140}])for(const scale of [.3,.92,1.6])for(const pane of [{width:180,height:150},{width:750,height:102},{width:320,height:200}]){
 const a=d.viewBox(frame,scale,pane,{x:frame.x,y:frame.y}),b=d.viewBox(frame,scale,pane,{x:frame.x+frame.width,y:frame.y+frame.height},a);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));assert(a.zoom>0&&a.zoom<=2);assert(a.x<=frame.x&&a.y<=frame.y);assert(a.x+a.width>=frame.x+frame.width-1e-8&&a.y+a.height>=frame.y+frame.height-1e-8);
 const copy=d.copyRect(frame,a,{width:100,height:200},{width:600,height:300});assert.deepEqual(Array.from(copy).slice(0,4),[0,0,100,200]);assert(copy[4]>=0&&copy[5]>=0&&copy[4]+copy[6]<=600+1e-8&&copy[5]+copy[7]<=300+1e-8);
}
let errors='<path class="extra-ink" d="M30 40L35 45"/>';d.track(f.canvas,()=>errors);d.select(f.canvas);f.flush();assert.equal(f.nodes['dock-loupe-feedback'].innerHTML,errors);assert.equal(f.nodes['dock-loupe-feedback'].attrs.viewBox,f.nodes['dock-loupe-guide'].attrs.viewBox);
errors+='<path class="missing-ink" d="M50 70L70 90"/>';d.mirror(f.canvas);f.flush();assert.equal(f.nodes['dock-loupe-feedback'].innerHTML,errors);errors='';d.mirror(f.canvas);f.flush();assert.equal(f.nodes['dock-loupe-feedback'].innerHTML,'');
assert.deepEqual(Array.from(d.copyRect({x:0,y:0,width:100,height:100},{x:-25,y:-25,width:150,height:150},{width:200,height:200},{width:300,height:300})),[0,0,200,200,50,50,200,200]);assert.equal(d.copyRect({x:0,y:0,width:10,height:10},{x:20,y:20,width:5,height:5},{width:10,height:10},{width:10,height:10}),null);
d.select(f.canvas,{x:50,y:80});f.flush();f.canvas.dataset.viewBox=JSON.stringify({x:0,y:10,width:100,height:140});d.mirror(f.canvas,{width:100});f.flush();assert.equal(d.frame.width,100);const replacement=new Node('replacement');Object.assign(replacement,{dataset:{...f.canvas.dataset},rect:f.canvas.rect,parentElement:f.canvas.parentElement});f.replace(replacement);d.onBuild('А');f.flush();assert(d.selected===replacement);d.onBuild('О');f.flush();assert.equal(d.selected,null);assert.equal(f.nodes['dock-reference'].src,'watermelon.png');replacement.isConnected=false;d.select(replacement,{x:30,y:30});f.flush();d.clear();
console.log('PASS: whole frame fits with zero pen-follow movement; full bitmap bounds; live error SVG and explicit missing feedback; preferences/rebuild rebind; letter change clears old ink; disconnected canvas and resize safe');

const h=fs.readFileSync(path.join(__dirname,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0],boot=()=>new Function('require','__dirname',h+"return boot({},'learner');")(require,__dirname);
const app=boot();
for(const size of [30,92,160])for(const letter of app.run('LetterCurriculum.order'))for(const char of [letter,letter.toLowerCase()]){
 const model=app.run(`DrawingGlyphs[${JSON.stringify(char)}].model`),points=app.run(`PracticeElement.anchors(DrawingGlyphs[${JSON.stringify(char)}].model,{size:${size}})`);assert(points.length>0&&points.length<=8,char);for(const point of points)assert(model.flat().some(p=>p[0]===point[0]&&p[1]===point[1]),char+' invented anchor');
}
for(const size of [30,92,160]){app.run(`configure({size:${size},bold:150,tolerance:.5});LearnerExperience.independent=true;reflowPage()`);for(const row of app.nodes.practice.children.find(r=>r.id==='independent-practice').children.slice(1)){const example=row.children[0],cell=row.children[1];assert.equal(example.style['--example-width'],cell.style['--cell-width']);assert.equal(example.style['--example-height'],cell.style['--cell-height']);assert.equal(example.attrs['data-example-frame'],cell.parts.canvas.attrs['data-view-box']);assert(cell.html.includes('reference-anchor'));assert(!cell.html.includes('class="corridor"'))}app.run('configure({tolerance:16})');for(const row of app.nodes.practice.children.find(r=>r.id==='independent-practice').children.slice(1))assert.equal(row.children[0].attrs['data-example-frame'],row.children[1].parts.canvas.attrs['data-view-box'])}
assert.equal(app.run("LearnerExperience.guideProfile('independent-gost-b90-А')"),'anchors');
console.log('PASS: all66 forms ×3sizes have≤8 actual-route anchors; example and input share exact scale/viewports; tolerance reframe stays aligned; independent fields contain no contour');

const hooked=boot(),plain=boot(),events=[];hooked.context.capture=(type,canvas,p)=>events.push({type,id:canvas?.attrs['data-surface-id'],p});hooked.run("WorksheetDock.select=(c,p)=>capture('select',c,p);WorksheetDock.mirror=c=>capture('mirror',c);WorksheetDock.release=()=>capture('release')");
function draw(app){const c=app.nodes.practice.children.find(r=>r.dataset.lessonStage==='upper-letter').children[0].parts.canvas,frame=JSON.parse(c.attrs['data-view-box']),rect=c.getBoundingClientRect();for(const line of app.run('models')){const p=line.map(([x,y])=>[(x-frame.x)/frame.width*rect.width,(y-frame.y)/frame.height*rect.height]);c.emit('pointerdown',p[0]);for(const q of p.slice(1))c.emit('pointermove',q);c.emit('pointerup',p.at(-1))}}
draw(hooked);draw(plain);assert.equal(hooked.run('JSON.stringify(data)'),plain.run('JSON.stringify(data)'));assert.equal(hooked.run('history.length'),plain.run('history.length'));for(const type of ['select','mirror','release'])assert(events.some(e=>e.type===type));
console.log('PASS integration: real canvas lifecycle notifies mirror; no extra strokes, score rules or undo changes');

// Automatic feedback colors only actual outside ink, including independent
// fields. Explicit percentage feedback mirrors the same missing/extra SVG.
const live=boot();live.run('LearnerExperience.independent=true;reflowPage()');const row=live.nodes.practice.children.find(r=>r.id==='independent-practice').children[1],parts=row.children[1].parts,c=parts.canvas;live.context.probeCanvas=c;
const frame2=JSON.parse(c.attrs['data-view-box']),rect2=c.getBoundingClientRect(),x=(frame2.x+frame2.width*.96-frame2.x)*rect2.width/frame2.width;
c.emit('pointerdown',[x,rect2.height*.2]);c.emit('pointermove',[x,rect2.height*.8]);c.emit('pointerup',[x,rect2.height*.8]);
const markup=()=>{live.run('WorksheetDock.providers.get(probeCanvas)()');live.flushFeedback();return live.run('WorksheetDock.providers.get(probeCanvas)()')},raw=live.run('JSON.stringify(data)'),undo=live.run('history.length');assert(markup().includes('extra-ink'));assert(!markup().includes('missing-ink'));live.run('feedbackCalls=0;const feedbackSteps=TraceFeedback.steps;TraceFeedback.steps=function(...args){feedbackCalls++;return feedbackSteps.apply(this,args)}');for(let i=0;i<100;i++)markup();assert.equal(live.run('feedbackCalls'),0,'Unchanged mirror frames must reuse feedback');
parts.output.onclick();assert(markup().includes('missing-ink')&&markup().includes('extra-ink'));const beforeTolerance=markup();live.run('configure({tolerance:2})');assert.notEqual(markup(),beforeTolerance);assert(!markup().includes('missing-ink'));parts.output.onclick();assert.equal(markup(),parts.correction.html);assert(markup().includes('missing-ink'));live.run('configure({tolerance:8})');assert(!markup().includes('missing-ink'));assert.equal(live.run('JSON.stringify(data)'),raw);assert.equal(live.run('history.length'),undo);parts.output.onclick();parts.button.onclick();assert.equal(markup(),'');live.nodes.undo.onclick();assert(markup().includes('extra-ink'));
console.log('PASS: real independent trial shows outside errors without automatic contour leak; percentage mirrors full feedback; repeated paints cached; ink/history/reset/undo preserved');

// Pixel check: all four field corners remain inside the mirror, and actual
// outside ink paints red above blue ink. This is SVG QA, not browser layout QA.
const {Resvg}=require('@resvg/resvg-js');
for(const pane of [{width:180,height:150},{width:750,height:102}]){
 const frame={x:20,y:30,width:150,height:180},box=d.viewBox(frame,.92,pane),vb=`${box.x} ${box.y} ${box.width} ${box.height}`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${pane.width}" height="${pane.height}" viewBox="${vb}"><path d="M20 30H170V210H20Z" fill="none" stroke="#347356" stroke-width="2"/><path d="M40 60L90 150" fill="none" stroke="#335e99" stroke-width="5"/><path d="M40 60L90 150" fill="none" stroke="#b66255" stroke-width="5"/></svg>`,pixels=new Resvg(svg).render().pixels;let red=0,minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
 for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100){const x=(i/4)%pane.width,y=Math.floor(i/4/pane.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(pixels[i]>140&&pixels[i+1]<115&&pixels[i+2]<110)red++}assert(red>10);assert(minX>0&&minY>0&&maxX<pane.width-1&&maxY<pane.height-1);
}
console.log('PASS pixels: complete field boundary inside both mirror aspect ratios; red feedback visible above blue ink');

require('./helpers/feedback-jobs.cjs')();
// A worker result already in flight cannot resurrect feedback after reset.
const race=boot();race.context.URL=URL;race.context.document.baseURI='https://qa.local/';const workers=[];race.context.Worker=class{constructor(){workers.push(this);this.sent=[]}postMessage(v){this.sent.push(structuredClone(v))}terminate(){}};
const target=race.nodes.practice.children.find(r=>r.dataset.lessonStage==='upper-letter').children[0].parts;const fc=JSON.parse(target.canvas.attrs['data-view-box']),rr=target.canvas.getBoundingClientRect();const xy=([x,y])=>[(x-fc.x)*rr.width/fc.width,(y-fc.y)*rr.height/fc.height];target.canvas.emit('pointerdown',xy([45,135]));target.canvas.emit('pointermove',xy([75,44]));target.canvas.emit('pointerup',xy([75,44]));const beforeRace=race.run('JSON.stringify(data)');
target.output.onclick();race.flushFeedback();assert.equal(workers.length,1);assert.equal(workers[0].sent.length,1);const late=workers[0].sent[0];target.button.onclick();const targetId=target.canvas.attrs['data-surface-id'];assert.equal(race.run(`data[${JSON.stringify(targetId)}].length`),0);workers[0].onmessage({data:{id:late.id,markup:'<path class="missing-ink"/>'}});race.flushFeedback();assert.equal(target.correction.html,'');assert.equal(target.output.textContent,'—');race.nodes.undo.onclick();assert.equal(race.run('JSON.stringify(data)'),beforeRace);
target.output.onclick();race.flushFeedback();const navigateLate=workers[0].sent.at(-1);race.run('build(0,"О")');workers[0].onmessage({data:{id:navigateLate.id,markup:'<path class="extra-ink"/>'}});race.flushFeedback();assert.equal(target.correction.html,'');
console.log('PASS runtime race: immediate reset and navigation reject in-flight worker feedback; undo restores original ink');
