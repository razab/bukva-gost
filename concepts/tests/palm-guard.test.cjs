const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../components/input-policy.js'),'utf8');
function boot(){
 let time=1000;const handlers={},timers=[],root={dataset:{}};
 const ctx={Date:{now:()=>time},clearTimeout(){},setTimeout(fn){timers.push(fn);return timers.length},document:{documentElement:root,addEventListener(type,fn,options){assert.equal(options.passive,false);assert.equal(options.capture,true);(handlers[type]||=[]).push(fn)}}};vm.createContext(ctx);vm.runInContext(source,ctx);
 const fire=(type,extra={})=>{let prevented=false,stopped=false;const event={cancelable:true,pointerType:'touch',pointerId:1,isPrimary:true,width:8,height:8,detail:1,target:{closest:()=>null},preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true},...extra};for(const fn of handlers[type]||[]){fn(event);if(stopped)break}return {prevented,stopped}};
 return {ctx,root,fire,advance(ms){time+=ms;timers.forEach(fn=>fn())},run:s=>vm.runInContext(s,ctx)};
}
const touch=(id,r=4)=>({identifier:id,radiusX:r,radiusY:r,touchType:'direct'});
let app=boot(),f=app.fire;
// Idle finger starts on a writing surface: native scrolling is not cancelled,
// even for a large fingertip. Ink acceptance remains the canvas runtime's job.
const field={dataset:{}},surface={closest:()=>field};
assert(!f('pointerdown',{target:surface,width:60,height:60}).stopped);
assert(!f('touchstart',{target:surface,touches:[touch(4,30)]}).prevented);
assert(!f('touchmove',{target:surface,touches:[touch(4,30)]}).prevented);
assert.equal(app.root.dataset.penGuard,'false');
assert(!f('pointerdown',{pointerType:'pen',pointerId:8}).stopped);
assert.equal(app.root.dataset.penGuard,'true');assert(f('click',{pointerType:'touch'}).stopped);
assert(!f('pointerup',{pointerType:'pen',pointerId:8}).stopped);
app.advance(2000);assert.equal(app.root.dataset.penGuard,'true');
assert(f('pointermove').stopped);assert(f('touchmove',{touches:[touch(4)]}).stopped);
assert(f('pointerup').stopped);assert(f('touchend',{changedTouches:[touch(4)],touches:[]}).stopped);
assert.equal(app.root.dataset.penGuard,'false');assert(f('click',{pointerType:undefined}).stopped);
// A NEW deliberate contact is allowed immediately. There is no grace period
// that can capture a fresh scrolling finger indefinitely.
assert(!f('pointerdown',{pointerId:2,width:60}).stopped);
assert(!f('touchstart',{touches:[touch(5,30)]}).prevented);
assert(!f('pointerup',{pointerId:2}).stopped);assert(!f('click').stopped);
console.log('PASS canary: idle finger on canvas scrolls → pen blocks overlapping palm/actions → held palm remains blocked between strokes → palm lifts → fresh scroll works immediately, including large fingers');
for(const termination of ['pointerup','pointercancel','lostpointercapture']){app=boot();f=app.fire;f('pointerdown',{pointerType:'pen',pointerId:8});f(termination,{pointerType:'pen',pointerId:8});assert.equal(app.root.dataset.penGuard,'false');assert(!f('pointerdown').stopped)}
app=boot();f=app.fire;f('pointerover',{pointerType:'pen',target:surface});assert.equal(field.dataset.penHover,'true');assert(!f('pointerdown',{pointerId:2}).stopped);assert.equal(app.root.dataset.penGuard,'false');f('pointermove',{pointerType:'pen',pointerId:8,buttons:0});assert.equal(app.root.dataset.penGuard,'false');f('pointerout',{pointerType:'pen',target:surface});assert.equal(field.dataset.penHover,undefined);
f('pointerover',{pointerType:'pen',target:surface});f('pointerdown',{pointerType:'pen',pointerId:8,target:surface});f('pointerup',{pointerType:'pen',pointerId:8,target:surface});assert.equal(field.dataset.penHover,undefined);f('pointerup',{pointerId:2});assert(!f('pointerdown',{pointerId:3,target:surface}).stopped);
// Stop Pencil-induced native pan without swallowing Pencil PointerEvents.
f('pointerdown',{pointerType:'pen',pointerId:8});const pencil=f('touchstart',{target:surface,touches:[{identifier:8,touchType:'stylus'}]});assert(pencil.prevented);assert(!pencil.stopped);assert(!f('click',{pointerType:'pen'}).stopped);assert(!f('click',{pointerType:'mouse'}).stopped);assert(!f('click',{pointerType:undefined,detail:0}).stopped);
f('pointerdown',{pointerId:12});assert(f('click',{pointerType:'touch'}).stopped);f('pointerup',{pointerType:'pen',pointerId:8});assert(!f('click',{pointerType:undefined}).stopped);assert(f('click',{pointerType:undefined}).stopped);
app.ctx.document.hidden=true;f('visibilitychange');assert.equal(app.root.dataset.penGuard,'false');
console.log('PASS: no global hover lock or size heuristic; immediate idle scroll; pen-up/cancel/lost capture; scoped hover; Pencil native pan prevented; modern/legacy click paths, mouse/keyboard and visibility recovery');

// Integrate the document capture policy with the real canvas runtime. A
// touch that started first must be cancelled without leaving activePointer
// stuck when its pointerup is stopped before reaching the canvas.
let harness=fs.readFileSync(path.join(__dirname,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0];
harness=harness.replace('const document={body:',"const document={handlers:{},documentElement:new Element(),addEventListener(k,f){(this.handlers[k]||=[]).push(f)},body:")
 .replace('const context={document,','const context={document,clock:{value:1000},timers:[],Date:{now:()=>context.clock.value},clearTimeout(){},setTimeout(fn){context.timers.push(fn);return context.timers.length},')
 .replace("['worksheet-dock','pen-appearance'","['input-policy','worksheet-dock','pen-appearance'");
const integrated=new Function('require','__dirname',harness+'return boot();')(require,__dirname);
const canvas=integrated.nodes.practice.children.find(r=>r.dataset.component==='gost-b90-A-bar').children[0].parts.canvas;
canvas.closest=()=>canvas;
function dispatch(type,extra={}){let stopped=false;const event={pointerType:'touch',pointerId:1,isPrimary:true,width:8,height:8,cancelable:true,button:0,target:canvas,clientX:20,clientY:20,preventDefault(){},stopImmediatePropagation(){stopped=true},...extra};for(const fn of integrated.context.document.handlers[type]||[]){fn(event);if(stopped)break}if(!stopped)for(const fn of canvas.handlers[type]||[])fn(event);return stopped}
assert(!dispatch('pointerdown'));assert.equal(integrated.run('activePointer'),null);dispatch('pointerup');integrated.run('configureInput(false)');dispatch('pointerdown');assert.equal(integrated.run('activePointer'),1);
dispatch('pointerdown',{pointerType:'pen',pointerId:8});assert.equal(integrated.run('activePointer'),8);assert.equal(integrated.run('history.length'),0);
assert(dispatch('pointerup',{pointerId:1}));assert.equal(integrated.run('activePointer'),8);
dispatch('pointermove',{pointerType:'pen',pointerId:8,clientX:45,clientY:35});dispatch('pointerdown',{pointerId:9});dispatch('pointerup',{pointerType:'pen',pointerId:8});assert.equal(integrated.run('activePointer'),null);assert.equal(integrated.run('history.length'),1);assert.equal(integrated.run('Object.values(data).flat().length'),1);
const saved=JSON.stringify(integrated.saved);dispatch('pointermove',{pointerId:9});dispatch('pointerup',{pointerId:9});assert.equal(JSON.stringify(integrated.saved),saved);
dispatch('pointerup',{pointerId:9});dispatch('touchend',{changedTouches:[touch(9)],touches:[]});dispatch('pointerdown',{pointerId:10});assert.equal(integrated.run('activePointer'),10);dispatch('pointercancel',{pointerId:10});assert.equal(integrated.run('activePointer'),null);assert.equal(integrated.run('history.length'),1);
dispatch('pointerdown',{pointerType:'pen',pointerId:18});assert.equal(integrated.run('activePointer'),18);integrated.context.document.hidden=true;dispatch('visibilitychange');assert.equal(integrated.run('activePointer'),null);assert.equal(integrated.run('history.length'),1);
console.log('PASS integration: document capture + real canvas; prior finger draft cancelled; palm cannot block pen or commit ink; pen saves once; intercepted touch end leaves no stuck pointer; previous ink/history retained');

// Real learner buttons must work before any browser click is delivered.
// A late click must also not erase ink restored by Undo in the meantime.
function learnerWithPolicy(){return new Function('require','__dirname',harness+"return boot({},'learner');")(require,__dirname)}
function toNode(app,node,type,extra={}){
 let stopped=false;const e={pointerType:'pen',pointerId:31,isPrimary:true,button:0,detail:1,clientX:20,clientY:20,cancelable:true,defaultPrevented:false,target:node,preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){stopped=true},...extra};
 for(const fn of app.context.document.handlers[type]||[]){fn(e);if(stopped)break}
 if(!stopped){for(const fn of [...(node.handlers[type]||[])])fn(e);if(type==='click')node.onclick?.(e)}return e;
}
function filledLearner(){const a=learnerWithPolicy(),p=a.nodes.practice.children.find(r=>r.dataset.lessonStage==='lower-letter').children[0].parts;toNode(a,p.canvas,'pointerdown');toNode(a,p.canvas,'pointermove',{clientX:40,clientY:40});toNode(a,p.canvas,'pointerup',{clientX:40,clientY:40});assert(p.output.disabled===false);return {a,p}}
for(const pointerType of ['pen','touch','mouse'])for(const gap of [0,16,100,300,600]){
 const {a,p}=filledLearner(),id=p.canvas.attrs['data-surface-id'],ink=a.run('JSON.stringify(data)');
 toNode(a,p.output,'pointerdown',{pointerType});toNode(a,p.output,'pointerup',{pointerType});
 assert.equal(p.button.hidden,false,pointerType+' must reveal reset at release, before click');
 a.context.clock.value+=gap;
 toNode(a,p.button,'pointerdown',{pointerType});toNode(a,p.button,'pointerup',{pointerType});
 assert.equal(a.run(`data[${JSON.stringify(id)}].length`),0,'Immediate second release must clear ink');assert.equal(p.output.textContent,'—');
 a.run('undo()');assert.equal(a.run('JSON.stringify(data)'),ink);
 a.context.clock.value+=600;
 for(const node of [p.output,p.button])toNode(a,node,'click',{pointerType});
 assert.equal(a.run('JSON.stringify(data)'),ink,'Delayed clicks must not erase Undo');assert.equal(p.button.hidden,true,'Delayed percentage click must not re-open reset');
}
// Delayed legacy MouseEvent clicks, keyboard and click-only fallback.
for(const legacy of [true,false]){const {a,p}=filledLearner();for(const node of [p.output,p.button]){toNode(a,node,'pointerdown');toNode(a,node,'pointerup');toNode(a,node,'click',{pointerType:legacy?undefined:'pen'})}assert.equal(p.output.textContent,'—');a.run('undo()');toNode(a,p.output,'click',{detail:0,pointerType:undefined});assert(!p.button.hidden);toNode(a,p.button,'click',{detail:0,pointerType:undefined});assert.equal(p.output.textContent,'—')}
{const {a,p}=filledLearner();toNode(a,p.output,'click',{pointerType:undefined});assert(!p.button.hidden);toNode(a,p.button,'click',{pointerType:undefined});assert.equal(p.output.textContent,'—')}
// Scrolling/cancellation/outside release must never count as a tap.
for(const cancel of ['move','pointercancel','lostpointercapture','pointerleave','outside']){const {a,p}=filledLearner();toNode(a,p.output,'pointerdown',{pointerType:'touch'});if(cancel==='move')toNode(a,p.output,'pointermove',{pointerType:'touch',clientX:45});else if(cancel!=='outside')toNode(a,p.output,cancel,{pointerType:'touch'});toNode(a,p.output,'pointerup',{pointerType:'touch',clientX:cancel==='outside'?-2:20});toNode(a,p.output,'click',{pointerType:'touch'});assert(p.button.hidden,cancel+' may not reveal reset')}
// Capture-level palm rejection must still prevent the new fast action.
{const {a,p}=filledLearner();toNode(a,p.canvas,'pointerdown',{pointerType:'pen',pointerId:90});toNode(a,p.output,'pointerdown',{pointerType:'touch',pointerId:91});toNode(a,p.output,'pointerup',{pointerType:'touch',pointerId:91});toNode(a,p.output,'click',{pointerType:'touch'});assert(p.button.hidden);toNode(a,p.canvas,'pointercancel',{pointerType:'pen',pointerId:90})}
// The same art-reset node survives rebuilds: do not accumulate handlers.
{const {a,p}=filledLearner(),old=p.output,art=a.nodes['art-reset'];for(let i=0;i<20;i++)a.run('reflowPage()');for(const [type,list]of Object.entries(art.handlers))assert(list.length<=1,'Leaked art handler '+type);for(const list of Object.values(old.handlers))assert.equal(list.length,0);assert.equal(old.onclick,null)}
console.log('PASS fast reset: real learner percent→reset on release at0/16/100/300/600ms for pen/touch/mouse; delayed modern/legacy clicks cannot repeat action or erase Undo; keyboard/click-only preserved; scrolling/palm rejected; rebuild handlers cleaned');
