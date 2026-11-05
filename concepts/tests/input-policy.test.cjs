const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),source=fs.readFileSync(root+'/components/input-policy.js','utf8');
function boot(){const handlers={};vm.runInNewContext(source,{document:{addEventListener(type,fn,options){assert.equal(options.passive,false);assert.equal(options.capture,true);(handlers[type]||=[]).push(fn)}}});return (type,extra={})=>{let stopped=false;const event={cancelable:true,preventDefault(){stopped=true},...extra};for(const fn of handlers[type]||[])fn(event);return stopped}}
// Canary and reload: no persistent settings or ink are read/written by policy.
for(let pass=0;pass<2;pass++){
 const fire=boot();
 for(const type of ['gesturestart','gesturechange','gestureend','selectstart','dragstart','contextmenu','dblclick'])assert(fire(type),type);
 for(const type of ['touchstart','touchmove']){assert(!fire(type,{touches:[{}]}));assert(fire(type,{touches:[{},{}]}));assert(fire(type,{touches:[{},{},{}]}));fire('touchend',{changedTouches:[{}]})}
 assert(!fire('wheel'));assert(fire('wheel',{ctrlKey:true}));assert(fire('wheel',{metaKey:true}));
 for(const key of ['+','=','-','0']){assert(fire('keydown',{key,ctrlKey:true}));assert(fire('keydown',{key,metaKey:true}));assert(!fire('keydown',{key}))}
 for(const key of ['Tab','ArrowDown','a','Backspace'])assert(!fire('keydown',{key}));
 assert(!fire('gesturechange',{cancelable:false}));
}
for(const file of [root+'/index.html',path.join(root,'../editor/index.html')]){
 const html=fs.readFileSync(file,'utf8');assert(html.includes('minimum-scale=1,maximum-scale=1,user-scalable=no'));assert(html.includes('components/input-policy.js'));assert(html.indexOf('components/input-policy.js')<html.indexOf('components/worksheet-runtime.js'));
}
const css=fs.readFileSync(root+'/components/worksheet.css','utf8');assert(css.includes('html{touch-action:pan-y;'));assert(css.includes('*,*::before,*::after{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}'));assert(css.includes('.writing,.writing canvas,.art-surface,.art-surface canvas{touch-action:none}'));
console.log('PASS: pinch/Safari gestures, double tap, native selection/drag/callout and zoom shortcuts blocked; vertical single-finger scrolling, normal wheel and editing keys retained; reload and both entry points covered');
