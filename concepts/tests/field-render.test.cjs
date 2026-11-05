const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {Resvg}=require(process.env.RESVG_MODULE||'@resvg/resvg-js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'worksheet-fields-')),probe=path.join(dir,'fields.json');
try{
 cp.execFileSync(process.execPath,[path.join(__dirname,'worksheet.test.cjs')],{env:{...process.env,LETTER_FIELD_PROBE:probe},stdio:'pipe'});
 const fields=JSON.parse(fs.readFileSync(probe,'utf8'));assert.equal(fields.length,64);
 for(const [i,field] of fields.entries()){
  const width=parseFloat(field.style['--cell-width']),height=parseFloat(field.style['--cell-height']);
  let svg=field.html.match(/<svg[\s\S]*?<\/svg>/)[0];
  const viewWidth=Number(svg.match(/viewBox="([^"]+)"/)[1].split(' ')[2]),scale=width/viewWidth;
  // resvg ignores non-scaling-stroke (10px becomes 20px at 2x in a
  // minimal probe). Emulate the browser's CSS-pixel corridor explicitly.
  svg=svg.replace('<svg ',`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `)
   .replace(/<path[^>]*stroke="var\(--ruling\)"[^>]*\/>/g,'')
   .replace(/class="corridor"/g,`fill="none" stroke="#e7f0e6" stroke-width="${field.tolerance*2/scale}" stroke-linecap="round" stroke-linejoin="round"`)
   .replace(/class="guide"/g,'fill="none" stroke="#b0c1b5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 5"');
  const rendered=new Resvg(svg).render(),pixels=rendered.pixels;let nonempty=0;
  for(let j=3;j<pixels.length;j+=4)if(pixels[j]>20){const x=((j-3)/4)%rendered.width,y=Math.floor(((j-3)/4)/rendered.width);assert(x>0&&y>0&&x<rendered.width-1&&y<rendered.height-1,'field '+i+' clips guide/outline');nonempty++}
  assert(nonempty>Math.min(100,100*(field.size/60)**2),'field '+i+' empty');
 }
 console.log('PASS: all 64 compact SVG fields rasterize without clipping at small/normal/large sizes and tolerance/bold extremes');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
