const fs=require('fs'),path=require('path'),assert=require('assert/strict');const harness=fs.readFileSync(path.join(__dirname,'worksheet.test.cjs'),'utf8').split('let app=boot();')[0],app=new Function('require','__dirname',harness+'return boot();')(require,__dirname),run=s=>app.run(s);
const {Resvg}=require(process.env.RESVG_MODULE||'@resvg/resvg-js');
function green(body){const image=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="450" height="540" viewBox="0 0 150 180">${body.replaceAll('var(--accent)','#347356')}</svg>`).render(),pixels=image.pixels,out=new Set();for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100&&pixels[i+1]>pixels[i]*1.4&&pixels[i]<100&&pixels[i+2]<140)out.add(i/4);return out}
const known={'Я':'de86bc54b095','я':'10b2ce35b6bd'};let frames='';
for(const [index,char]of ['Я','я'].entries()){
 const key=JSON.stringify(char),glyph=run(`DrawingGlyphs[${key}]`),model=glyph.demonstration;assert.equal(glyph.revision,known[char],'assessment route revision changed');assert.equal(model.length,3);assert.equal(model[0].length,2);assert.equal(model[0][0][0],model[0][1][0]);assert(model[0][1][1]>model[0][0][1]);
 assert(model[2][1][0]<model[2][0][0]&&model[2][1][1]>model[2][0][1],'leg must descend left without a hook');
 for(const bold of [100,150]){
  run(`preferences={...preferences,bold:${bold}}`);const expected=green(run(`fontOutline(DrawingGlyphs[${key}].model,'fill="#347356"')`));
  const steps=[[0,0,0],[.5,0,0],[1,.5,0],[1,1,.5],[1,1,1]],painted=[];
  for(const [step,progress]of steps.entries()){
   const markup=run(`revealMarkup(DrawingGlyphs[${key}].demonstration,'demo-check',${JSON.stringify(progress)})`);painted.push(green(markup));
   if(bold===100)frames+=`<g transform="translate(${step*160} ${index*190})"><rect x="0" y="0" width="155" height="180" rx="8" fill="#fffefa"/>${markup.replaceAll('demo-check',`check-${index}-${step}`).replaceAll('var(--accent)','#347356')}</g>`;
  }
  assert.equal(painted[0].size,0);for(let i=1;i<painted.length;i++)assert(painted[i].size>painted[i-1].size);
  const missing=[...expected].filter(p=>!painted.at(-1).has(p)).length/expected.size;assert(missing<.005,char+' missing contour '+missing);
  const near=green(run(`revealMarkup(DrawingGlyphs[${key}].demonstration,'near',[1,1,.999])`));assert([...painted.at(-1)].filter(p=>!near.has(p)).length/expected.size<.005,'final jump');
 }
}
run("build(0,'Я')");const clock=run('sequenceClock()');assert.equal(clock.upperEnd,run('demoClock(DrawingGlyphs.Я.demonstration,{startDelay:0,endDelay:0}).duration'));assert(Math.abs(clock.lowerStart-clock.upperEnd-500)<1e-9);
const first=run('sequenceClock().at(0).upper.pen');assert.equal(first[0],95);assert.equal(first[1],45);
if(process.env.DEMONSTRATION_PREVIEW)fs.writeFileSync(process.env.DEMONSTRATION_PREVIEW,new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="570" viewBox="0 0 800 380"><rect width="800" height="380" fill="#edf1ec"/>${frames}</svg>`).render().asPng());
console.log('PASS: Я/я begin with descending right stems, then bowls and straight legs; 500ms pair pause; exact full contours and progressive reveal at bold100/150; no final jump; assessment/storage geometry unchanged');
