// Teaching direction is separate from font geometry and permits pen lifts.
const StrokeDirection={
 routes:new WeakMap(),alternatives:new WeakMap(),geometry:new WeakMap(),cache:new WeakMap(),warmups:new Map(),warmupCues:new WeakMap(),joinedLoops:new WeakMap(),cell:12,
 register(model,teaching=model,complete=false,alternative){this.routes.set(model,teaching);if(complete)this.geometry.set(model,teaching);if(alternative)this.alternatives.set(model,alternative)},
 registerJoinedLoops(model,loops){
  if(!loops.length)return;
  this.joinedLoops.set(model,loops.map(loop=>{
   const [sample]=TraceFeedback.sample([loop],8);
   return {
    model:[loop],
    start:loop[0],
    checkpoints:[.25,.5,.75].map(fraction=>sample[Math.floor((sample.length-1)*fraction)])
   };
  }));
 },
 closeIndex(line,{start,checkpoints},radius){
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  if(line.length<5||distance(line[0],start)>radius)return -1;
  let i=1;
  for(const target of [...checkpoints,start]){
   while(i<line.length&&distance(line[i],target)>radius)i++;
   if(i===line.length)return -1;
   i++;
  }
  // The pen may continue immediately down the stem. Cut at the closest return.
  let closest=i-1;
  while(i<line.length&&distance(line[i],start)<=radius){
   if(distance(line[i],start)<distance(line[closest],start))closest=i;
   i++;
  }
  return closest;
 },
 registerWarmup({id,model},glyphModel){
  const whole=model.length===glyphModel.length&&model.every((line,index)=>line===glyphModel[index]);
  if(!this.warmups.has(id)){
   const route=whole?this.route(glyphModel):model.map(line=>{
    // Keep authored cues independent from the threshold for grading handwriting.
    const direction=this.assess([line.map(([x,y])=>[x/150,y/180])],glyphModel,{forWarmup:true});
    return direction.ratio<.2?[...line].reverse():line;
   });
   const cue=TraceFeedback.sample(route,8,32).map(line=>{
    if(line.length<3)return '';
    const [x,y]=line[1],[endX,endY]=line[2],length=Math.hypot(endX-x,endY-y);
    if(length<1)return '';
    const dx=(endX-x)/length,dy=(endY-y)/length;
    return `<path class="warmup-arrow" d="M${x-5*dx-3*dy} ${y-5*dy+3*dx} L${x} ${y} L${x-5*dx+3*dy} ${y-5*dy-3*dx}"/>`;
   }).join('');
   this.warmups.set(id,{route,cue});
  }
  const {route,cue}=this.warmups.get(id);
  this.register(model,route,whole,whole?this.alternatives.get(glyphModel):undefined);
  this.warmupCues.set(model,cue);
 },
 route(model){return this.routes.get(model)||model},
 prepare(model){
  const teaching=this.route(model);if(this.cache.has(teaching))return this.cache.get(teaching);
  const grid=new Map();
  for(const [index,line] of TraceFeedback.sample(teaching,3,2048).entries()){
   const stroke=teaching[index];
   const strokeLength=stroke.slice(1).reduce((sum,[x,y],i)=>sum+Math.hypot(x-stroke[i][0],y-stroke[i][1]),0);
   for(let i=1;i<line.length;i++){
    const [ax,ay]=line[i-1],[bx,by]=line[i],dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);if(length<.1)continue;
    const segment={ax,ay,dx,dy,length,square:length*length,strokeLength};
    for(let x=Math.floor(Math.min(ax,bx)/this.cell);x<=Math.floor(Math.max(ax,bx)/this.cell);x++)for(let y=Math.floor(Math.min(ay,by)/this.cell);y<=Math.floor(Math.max(ay,by)/this.cell);y++){
     const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(segment);
    }
   }
  }
  this.cache.set(teaching,grid);return grid;
 },
 assess(strokes,model,{width=150,height=180,tolerance=8,scale=1,forWarmup=false}={}){
  const actual=TraceFeedback.sample(strokes.map(line=>line.map(([x,y])=>[x*width,y*height])),2/scale,1536);
  const options={tolerance,scale,forWarmup};
  const alternative=this.alternatives.get(model);
  if(!alternative||forWarmup)return this.assessRoute(actual,model,options);
  if(this.joinedLoops.has(model)){
   const current=this.assessRoute(actual,model,options);
   if(!current.backwards)return current;
  }
  let checked=0,backwards=0,flagged=false;
  for(const line of actual){
   const current=this.assessRoute([line],model,options);
   const previous=current.backwards?this.assessRoute([line],alternative,options):null;
   const result=previous?.checked&&!previous.backwards?previous:current;
   checked+=result.checked;
   backwards+=result.checked*(1-result.ratio);
   flagged||=result.backwards;
  }
  return {backwards:flagged,ratio:checked?Math.max(0,1-backwards/checked):1,checked};
 },
 assessRoute(actual,model,options){
  const {tolerance,scale}=options;
  const standard=this.measure(actual,model,options);
  const loops=this.joinedLoops.get(model);
  if(!standard.backwards||!loops)return standard;

  // Only a completed, correctly directed loop licenses the upward return.
  // Any following motion is still graded against the descending stem.
  let checkedLoop=0;
  const continuations=[];
  for(const line of actual){
   if(!line.length)continue;
   const last=continuations.at(-1)?.at(-1);
   if(last&&Math.hypot(last[0]-line[0][0],last[1]-line[0][1])<=1/scale)continuations.at(-1).push(...line);
   else continuations.push([...line]);
  }
  const remainder=continuations.map(line=>{
   for(const loop of loops){
    const close=this.closeIndex(line,loop,Math.min(16,tolerance+2/scale));
    if(close<1)continue;
    const result=this.measure([line.slice(0,close+1)],loop.model,options);
    if(result.backwards||!result.checked)continue;
    checkedLoop+=result.checked;
    return line.slice(close);
   }
   return line;
  });
  if(!checkedLoop)return standard;
  const rest=this.measure(remainder,model,options),checked=checkedLoop+rest.checked;
  return {backwards:rest.backwards,ratio:(checkedLoop+rest.checked*rest.ratio)/checked,checked};
 },
 measure(actual,model,{tolerance,scale,forWarmup}){
  const grid=this.prepare(model),radius=tolerance+2/scale,ambiguity=Math.max(.8,Math.min(4,tolerance*scale/2))/scale,minReverse=(forWarmup?6:10)/scale, reverseShare=forWarmup?0:.05;
  let checked=0,backwards=0;
  for(const line of actual){
   let run=0,start,threshold,substantial=false;
   const flush=()=>{if(substantial)backwards+=run;run=0;substantial=false};
   for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.1)continue;
    const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,candidates=new Set();
    for(let cx=Math.floor((x-radius)/this.cell);cx<=Math.floor((x+radius)/this.cell);cx++)for(let cy=Math.floor((y-radius)/this.cell);cy<=Math.floor((y+radius)/this.cell);cy++)for(const s of grid.get(cx+','+cy)||[])candidates.add(s);
    let nearest=Infinity;const nearby=[];
    for(const s of candidates){const t=Math.max(0,Math.min(1,((x-s.ax)*s.dx+(y-s.ay)*s.dy)/s.square)),distance=Math.hypot(x-s.ax-t*s.dx,y-s.ay-t*s.dy);if(distance>radius)continue;nearest=Math.min(nearest,distance);nearby.push({distance,strokeLength:s.strokeLength,dot:(dx*s.dx+dy*s.dy)/(length*s.length)})}
    let forward=false,reverse=null;
    for(const p of nearby)if(p.distance<=nearest+ambiguity){
     if(p.dot>.45)forward=true;
     if(p.dot<-.45&&(!reverse||p.distance<reverse.distance))reverse=p;
    }
    // At joins/intersections both directions may be equally close.
    if(forward===Boolean(reverse)){flush();continue}
    checked+=length;
    if(reverse){
     if(!run){
      start=a;
      // A whole short stroke can be shorter than the usual screen threshold.
      const floor=forWarmup?minReverse:Math.min(minReverse,Math.max(4/scale,reverse.strokeLength*.9));
      threshold=Math.max(floor,reverseShare*reverse.strokeLength);
     }
     run+=length;
     substantial||=Math.hypot(b[0]-start[0],b[1]-start[1])>=threshold;
    }else flush();
   }flush();
  }
  return {backwards:backwards>0,ratio:checked?Math.max(0,1-backwards/checked):1,checked};
 },
 apply(geometry,strokes,model,options){
  if(geometry.empty)return geometry;
  const direction=this.assess(strokes,model,options),score=direction.backwards?Math.min(89,Math.round(geometry.score*direction.ratio)):geometry.score;
  return {...geometry,shapeScore:geometry.score,direction,score};
 }
};
