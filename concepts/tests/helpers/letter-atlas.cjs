module.exports=function(){
 const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),root=path.resolve(__dirname,'../../..');
 const nodes=Object.fromEntries(['atlas','filter','scale','bold','count','empty','mode'].map(id=>[id,{value:id==='scale'?'1':id==='bold'?'100':id==='mode'?'schemes':'',clientWidth:1024,handlers:{},style:{setProperty(){}},addEventListener(type,fn){this.handlers[type]=fn}}]));
 let html='',cards=[];
 Object.defineProperty(nodes.atlas,'innerHTML',{get:()=>html,set:value=>{html=value;cards=[...value.matchAll(/<article data-letter="(.)"/g)].map(m=>({dataset:{letter:m[1]},hidden:false}))}});
 nodes.atlas.querySelectorAll=()=>cards;
 const context={structuredClone,window:{addEventListener(){}},document:{querySelector:selector=>nodes[selector.slice(1)]},localStorage:new Proxy({},{get(){throw Error('Atlas must never access lesson storage')}})};
 vm.createContext(context);
 for(const name of ['glyphs','writing-scheme','curriculum','letter-sequence'])vm.runInContext(fs.readFileSync(root+'/concepts/components/'+name+'.js','utf8'),context);
 const script=fs.readFileSync(root+'/editor/letter-atlas.js','utf8');
 const runtime=fs.readFileSync(root+'/concepts/components/worksheet-runtime.js','utf8');
 vm.runInContext(`const fontScale=100/1400;const modelGlyph=new WeakMap(Object.values(DrawingGlyphs).filter(g=>g.demonstration).map(g=>[g.demonstration,g]));let atlasBold=100;const boldExpansion=()=>(atlasBold/100-1)*10;`+runtime.match(/function fontOutline\(model,extra=''\)\{[^\n]+\}/)[0],context);
 vm.runInContext(script,context);
 assert.equal(cards.length,33);assert.equal(new Set(cards.map(c=>c.dataset.letter)).size,33);assert.equal([...html.matchAll(/data-character=/g)].length,66);
 const source=vm.runInContext('DrawingGlyphs',context),scheme=vm.runInContext('WritingScheme',context);
 for(const b of ['100','125','150'])for(const z of ['0.75','1','1.5']){
  nodes.bold.value=b;nodes.scale.value=z;nodes.bold.handlers.change();
  vm.runInContext(`atlasBold=${b}`,context);
  for(const [,character,frame,w,h,body] of html.matchAll(/data-character="(.)" viewBox="([^"]+)" width="([^"]+)" height="([^"]+)">([\s\S]*?)<\/svg>/g)){
   const g=source[character];
   // Compare with the real runtime function, not a second expected transform.
   const outline=vm.runInContext(`fontOutline(DrawingGlyphs[${JSON.stringify(character)}].demonstration,'fill="#809e8a"')`,context);
   assert.equal(body,scheme.markup(g.demonstration,outline),character+' shipped markup');
   const bounds=frame.split(' ').map(Number);assert.equal(Number(w),bounds[2]*Number(z));assert.equal(Number(h),bounds[3]*Number(z));
  }
 }
 nodes.filter.value='а ё';nodes.filter.handlers.input();assert.equal(cards.filter(c=>!c.hidden).map(c=>c.dataset.letter).join(''),'АЁ');
 nodes.filter.value='123';nodes.filter.handlers.input();assert.equal(nodes.empty.hidden,false);assert.equal(cards.filter(c=>!c.hidden).length,0);
 nodes.filter.value='';nodes.filter.handlers.input();assert.equal(nodes.count.textContent,'33 / 33 пар · 66 схем');assert.equal(nodes.empty.hidden,true);
 nodes.mode.value='texts';nodes.mode.handlers.change();assert.equal([...html.matchAll(/data-lesson-text=/g)].length,33);assert.equal(nodes.count.textContent,'33 / 33 уроков');assert(html.includes('У Ники кот. Кот тут. Ника и кот.'));
 for(const width of [375,768,1024]){nodes.atlas.clientWidth=width;nodes.mode.handlers.change();assert.equal(cards.length,33);assert(!html.includes('NaN'),'text preview coordinates must remain finite')}
 console.log('PASS: atlas has 33 pairs/66 real shared SVGs, all scale/bold options, case-insensitive filter, empty/reset states, no lesson storage');
};
