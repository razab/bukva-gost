// Teaching direction is separate from font geometry and permits pen lifts.
const StrokeDirection={
 routes:new WeakMap(),geometry:new WeakMap(),cache:new WeakMap(),warmups:new Map(),warmupCues:new WeakMap(),joinedLoops:new WeakMap(),cell:12,
 register(model,teaching=model,complete=false){this.routes.set(model,teaching);if(complete)this.geometry.set(model,teaching)},
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
  if(!this.warmups.has(id)){
   const route=model.map(line=>{
    // A warmup may join pieces the full letter teaches as separate motions.
    const direction=this.assess([line.map(([x,y])=>[x/150,y/180])],glyphModel);
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
  this.register(model,route);
  this.warmupCues.set(model,cue);
 },
 route(model){return this.routes.get(model)||model},
 prepare(model){
  const teaching=this.route(model);if(this.cache.has(teaching))return this.cache.get(teaching);
  const grid=new Map(),segments=[];
  for(const line of TraceFeedback.sample(teaching,3,2048))for(let i=1;i<line.length;i++){
   const [ax,ay]=line[i-1],[bx,by]=line[i],dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);if(length<.1)continue;
   const segment={ax,ay,dx,dy,length,square:length*length};segments.push(segment);
   for(let x=Math.floor(Math.min(ax,bx)/this.cell);x<=Math.floor(Math.max(ax,bx)/this.cell);x++)for(let y=Math.floor(Math.min(ay,by)/this.cell);y<=Math.floor(Math.max(ay,by)/this.cell);y++){
    const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(segment);
   }
  }
  const prepared={grid,segments};this.cache.set(teaching,prepared);return prepared;
 },
 assess(strokes,model,{width=150,height=180,tolerance=8,scale=1}={}){
  const actual=TraceFeedback.sample(strokes.map(line=>line.map(([x,y])=>[x*width,y*height])),2/scale,1536);
  const standard=this.measure(actual,model,{tolerance,scale});
  const loops=this.joinedLoops.get(model);
  if(!standard.backwards||!loops)return standard;

  // Only a completed, correctly directed loop licenses the upward return.
  // Any following motion is still graded against the descending stem.
  let checkedLoop=0;
  const remainder=actual.map(line=>{
   for(const loop of loops){
    const close=this.closeIndex(line,loop,Math.min(16,tolerance+2/scale));
    if(close<1)continue;
    const result=this.measure([line.slice(0,close+1)],loop.model,{tolerance,scale});
    if(result.backwards||!result.checked)continue;
    checkedLoop+=result.checked;
    return line.slice(close);
   }
   return line;
  });
  if(!checkedLoop)return standard;
  const rest=this.measure(remainder,model,{tolerance,scale}),checked=checkedLoop+rest.checked;
  return {backwards:rest.backwards,ratio:(checkedLoop+rest.checked*rest.ratio)/checked,checked};
 },
 measure(actual,model,{tolerance,scale}){
  const {grid}=this.prepare(model),radius=tolerance+2/scale,ambiguity=Math.max(.8,Math.min(4,tolerance*scale/2))/scale,minReverse=6/scale;
  let checked=0,backwards=0;
  for(const line of actual){
   let run=0,start,substantial=false;
   const flush=()=>{if(substantial)backwards+=run;run=0;substantial=false};
   for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.1)continue;
    const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,candidates=new Set();
    for(let cx=Math.floor((x-radius)/this.cell);cx<=Math.floor((x+radius)/this.cell);cx++)for(let cy=Math.floor((y-radius)/this.cell);cy<=Math.floor((y+radius)/this.cell);cy++)for(const s of grid.get(cx+','+cy)||[])candidates.add(s);
    let nearest=Infinity;const nearby=[];
    for(const s of candidates){const t=Math.max(0,Math.min(1,((x-s.ax)*s.dx+(y-s.ay)*s.dy)/s.square)),distance=Math.hypot(x-s.ax-t*s.dx,y-s.ay-t*s.dy);if(distance>radius)continue;nearest=Math.min(nearest,distance);nearby.push({distance,dot:(dx*s.dx+dy*s.dy)/(length*s.length)})}
    let forward=false,reverse=false;
    for(const p of nearby)if(p.distance<=nearest+ambiguity){if(p.dot>.45)forward=true;if(p.dot<-.45)reverse=true}
    // At joins/intersections both directions may be equally close.
    if(forward===reverse){flush();continue}
    checked+=length;
    if(reverse){
     if(!run)start=a;
     run+=length;
     substantial||=Math.hypot(b[0]-start[0],b[1]-start[1])>=minReverse;
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
