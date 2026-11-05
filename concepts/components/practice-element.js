const PracticeElement={
 inkBounds:new WeakMap(),
 anchors(model,{size}){
  const all=model.flat(),result=[],distance=Math.max(7,7/(size/100));const add=p=>{if(p&&result.length<8&&!result.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<distance))result.push(p)};
  for(const line of model){add(line[0]);add(line.at(-1))}
  for(const axis of [0,1])for(const edge of [Math.min(...all.map(p=>p[axis])),Math.max(...all.map(p=>p[axis]))]){const candidates=all.filter(p=>Math.abs(p[axis]-edge)<.6),middle=candidates.reduce((n,p)=>n+p[1-axis],0)/candidates.length;add(candidates.reduce((best,p)=>Math.abs(p[1-axis]-middle)<Math.abs(best[1-axis]-middle)?p:best,candidates[0]))}
  for(const line of model)for(let i=1;i<line.length-1;i++){let a=i-1,b=i+1;while(a>0&&Math.hypot(line[i][0]-line[a][0],line[i][1]-line[a][1])<12)a--;while(b<line.length-1&&Math.hypot(line[b][0]-line[i][0],line[b][1]-line[i][1])<12)b++;const u=[line[i][0]-line[a][0],line[i][1]-line[a][1]],v=[line[b][0]-line[i][0],line[b][1]-line[i][1]],length=Math.hypot(...u)*Math.hypot(...v);if(length&&(u[0]*v[0]+u[1]*v[1])/length<.5)add(line[i])}return result;
 },
 anchorMarkup(model,preferences){return this.anchors(model,preferences).map(([x,y])=>`<circle class="reference-anchor" cx="${x}" cy="${y}" r="${1.8/(preferences.size/100)}" fill="#527b61"/>`).join('')},
 key(component,index){
  return `element-v1-${component}-${index}`;
 },
 mount({root,definition,repeats,addCell}){
  if(!definition||![3,4,5].includes(repeats))throw new Error('Invalid practice component');
  const row=document.createElement('div');row.className='row warmup';row.setAttribute('aria-label',definition.name);row.dataset.component=definition.id;
  for(let i=0;i<repeats;i++)addCell(row,this.key(definition.id,i),definition.model,`${definition.name}, проба ${i+1}`);
  root.append(row);return row;
 },
 // Crop the viewport, never resize/rewrite the model or persisted coordinates.
 frame(model,{size,tolerance,bold}){
  const points=model.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=size/100;
  const padding=Math.max(10,5*bold/100+4,tolerance/scale+4,4/scale+2);
  const horizontalPadding=Math.max(5*bold/100,tolerance/scale,4/scale)+2/scale;
  const width=Math.max(maxX-minX+2*horizontalPadding,48/scale),height=Math.max(maxY-minY+2*padding,44/scale);
  let x=(minX+maxX-width)/2,y=(minY+maxY-height)/2,w=width,h=height;const ink=this.inkBounds.get(model);if(ink){const extra=(bold/100-1)*5+2/scale,x2=Math.max(x+w,ink[2]+extra),y2=Math.max(y+h,ink[3]+extra);x=Math.min(x,ink[0]-extra);y=Math.min(y,ink[1]-extra);w=x2-x;h=y2-y}return {x,y,width:w,height:h,minY,maxY};
 },
 createCell({row,id,model,label,guide,setupSurface,preferences,rulingLevels=[],width=150,height=180,scoreX=null}){
  const frame=this.frame(model,preferences),scale=preferences.size/100,cell=document.createElement('section');cell.className='cell';
  cell.style.setProperty('--cell-width',`${frame.width*scale}px`);cell.style.setProperty('--cell-height',`${frame.height*scale}px`);
  const positionScore=()=>{if(Number.isFinite(scoreX))cell.style.setProperty('--score-x',`${(scoreX-frame.x)*scale}px`)};positionScore();
  if(typeof LearnerExperience!=='undefined'&&typeof learnerMode!=='undefined'&&learnerMode&&LearnerExperience.guideProfile(id)==='reduced')cell.className+=' reduced-guide';
  cell.innerHTML=`<div class="writing" data-assessment="geometry"><svg viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" aria-hidden="true">${guide(model)}</svg><svg class="correction-layer" viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" aria-hidden="true"></svg><canvas tabindex="-1" aria-label="${label}"></canvas></div><div class="cell-foot"><button type="button" class="score" aria-expanded="false" aria-label="Сходство, открыть сброс">—</button><button type="button" class="reset" hidden aria-label="Сбросить эту пробу" title="Сбросить эту пробу">↺</button></div>`;
  const canvas=cell.querySelector('canvas');
  canvas.setAttribute('data-view-box',JSON.stringify(frame));canvas.setAttribute('data-scale',String(scale));canvas.setAttribute('data-domain',JSON.stringify({width,height}));canvas.setAttribute('data-ruling-levels',JSON.stringify(rulingLevels));
  row.append(cell);
  const releaseRuling=RowRuling.attach(row,cell.querySelector('.writing'),frame,rulingLevels);
  const surface=setupSurface(canvas,id,width,height,cell.querySelector('.score'),cell.querySelector('.reset'),model,frame,cell.querySelector('.correction-layer'));
  return {element:cell,surface:{...surface,reframe(nextPreferences){
   // Preserve canvas, listeners, model, ink coordinates and animation. Only
   // the viewport padding changes when the tolerance is committed.
   Object.assign(frame,PracticeElement.frame(model,nextPreferences));positionScore();
   cell.style.setProperty('--cell-width',`${frame.width*scale}px`);cell.style.setProperty('--cell-height',`${frame.height*scale}px`);
   const viewBox=`${frame.x} ${frame.y} ${frame.width} ${frame.height}`;
   for(const svg of cell.querySelectorAll('.writing > svg'))svg.setAttribute('viewBox',viewBox);
   canvas.setAttribute('data-view-box',JSON.stringify(frame));
   RowRuling.reframe(row,cell.querySelector('.writing'),frame,rulingLevels);
  },destroy(){releaseRuling();surface.destroy()}}};
 }
};
