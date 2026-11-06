// Rasterise the shipped SVG against the actual font outline, including bold150.
// A distance between label centres cannot detect these intersections.
module.exports=function({letters,negative=false}={}){
 const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{Resvg}=require(process.env.RESVG_MODULE||'@resvg/resvg-js'),root=path.resolve(__dirname,'../..'),ctx={};vm.createContext(ctx);
 for(const name of ['glyphs','writing-scheme'])vm.runInContext(fs.readFileSync(root+'/components/'+name+'.js','utf8'),ctx);
 const glyphs=vm.runInContext('DrawingGlyphs',ctx),scheme=vm.runInContext('WritingScheme',ctx),selected=letters?[...letters]:Object.keys(glyphs).filter(c=>glyphs[c].instruction),render=(body,text=false)=>new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 180" width="300" height="360">${body}</svg>`,text?{}:{font:{loadSystemFonts:false}}).render().pixels;
 const overlap=(a,b)=>{let pixels=0;for(let i=3;i<a.length;i+=4)if(a[i]>96&&b[i]>96)pixels++;return pixels};
 function inspect(c,override){
  const g=glyphs[c],saved=scheme.notes.get(g.demonstration);if(override){scheme.notes.set(g.demonstration,override);scheme.cache.delete(g.demonstration)}
  const markup=scheme.markup(g.demonstration,''),parts=[...markup.matchAll(/<g data-scheme-stroke="\d+">(.*?)<\/g>/g)].map(m=>m[1]);
  const arrows=parts.map(s=>s.replace(/<text.*?<\/text>/g,'')),numbers=parts.map(s=>s.match(/<text.*?<\/text>/)[0]),ink=render(`<path d="${g.outline}" transform="translate(30 140) scale(.07142857142857 -.07142857142857)" fill="black" stroke="black" stroke-width="70" stroke-linejoin="round"/>`),ar=arrows.map(s=>render(s)),allArrows=render(arrows.join('')),allNumbers=render(numbers.join(''),true),issues=[];
  if(overlap(ink,allArrows))issues.push('arrow/letter');if(overlap(ink,allNumbers))issues.push('number/letter');if(overlap(allArrows,allNumbers))issues.push('number/arrow');
  for(let i=0;i<ar.length;i++)for(let j=0;j<i;j++)if(overlap(ar[i],ar[j]))issues.push(`arrows ${i+1}/${j+1}`);
  if(override){scheme.notes.set(g.demonstration,saved);scheme.cache.delete(g.demonstration)}return issues;
 }
 if(negative){
  const oldE=JSON.parse(JSON.stringify(glyphs.Е.instruction.notation));oldE[3]={label:[58,62],offset:-11,range:[.08,.9]};assert(inspect('Е',oldE).includes('arrow/letter'),'must detect the reported Е overlap');
  const olde=JSON.parse(JSON.stringify(glyphs.е.instruction.notation));olde[2]={label:[61,121],offset:12,range:[.08,.92]};const failures=inspect('е',olde);assert(failures.includes('arrow/letter')&&failures.includes('number/arrow'),'must detect both reported е overlaps');
 }
 for(const c of selected)assert.deepEqual(inspect(c),[],c+' scheme collision at bold150');
 console.log(`PASS53: ${selected.length} rendered schemes have no arrow/letter, number/letter, number/arrow or arrow/arrow intersection at maximum bold${negative?'; reported Е/е defects fail the negative controls':''}`);
};
