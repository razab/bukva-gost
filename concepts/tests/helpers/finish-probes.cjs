// Seed genuine taught paths for mounted control fields. Existing attempts and durations stay intact.
function fillControlProbes(app,{replace=false,skip=[]}={}){
 const required=new Set(app.run('surfaces.filter(s=>s.required).map(s=>s.id)'));
 const ink={};
 for(const row of app.nodes.practice.children){
  for(const cell of row.children){
   const canvas=cell.parts?.canvas,id=canvas?.attrs['data-surface-id'];
   if(!required.has(id)||skip.includes(id)||!replace&&app.run(`!!data[${JSON.stringify(id)}]?.length`))continue;
   const {width,height}=JSON.parse(canvas.attrs['data-domain']);
   let route;
   if(row.dataset.lessonStage.endsWith('-letter')){
    route=app.run(row.dataset.lessonStage==='upper-letter'?'demonstrationFor(models)':'demonstrationFor(lowercase)');
   }else{
    const text=row.attrs['aria-label'],breaks=id.match(/-wrap([0-9_]+)$/)?.[1].split('_').map(Number)||[];
    route=[0,...breaks].flatMap((start,index)=>{
     const line=text.slice(start,breaks[index]??text.length).trim();
     const paths=app.run(`StrokeDirection.route(LetterSequence.compose(${JSON.stringify(line)},sequenceSources,{gap:preferences.letterGap,bold:preferences.bold}).model)`);
     return paths.map(stroke=>stroke.map(([x,y])=>[x,y+index*170]));
    });
   }
   ink[id]=route.map(stroke=>stroke.map(([x,y])=>[x/width,y/height]));
  }
 }
 app.run(`Object.assign(data,${JSON.stringify(ink)});save();refresh()`);
}
module.exports={fillControlProbes};
