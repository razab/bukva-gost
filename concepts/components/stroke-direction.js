// Teaching direction is separate from font geometry and permits pen lifts.
const StrokeDirection={
 routes:new WeakMap(),alternatives:new WeakMap(),geometry:new WeakMap(),cache:new WeakMap(),warmups:new Map(),warmupCues:new WeakMap(),joinedPaths:new WeakMap(),singleContactWarmups:new WeakSet(),cell:12,
 register(model,teaching=model,complete=false,alternative){this.routes.set(model,teaching);if(complete)this.geometry.set(model,teaching);if(alternative)this.alternatives.set(model,alternative)},
 registerJoinedPaths(model,paths){
  if(!paths.length||this.joinedPaths.has(model))return;
  this.joinedPaths.set(model,paths.map(({path,retrace=false})=>{
   const [sample]=TraceFeedback.sample([path],8);
   return {
    model:[path],
    start:path[0],end:path.at(-1),retrace,
    checkpoints:[.25,.5,.75].map(fraction=>sample[Math.floor((sample.length-1)*fraction)])
   };
  }));
 },
 endIndex(line,{start,end,checkpoints},radius){
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  if(line.length<5||distance(line[0],start)>radius)return -1;
  let i=1;
  for(const target of [...checkpoints,end]){
   while(i<line.length&&distance(line[i],target)>radius)i++;
   if(i===line.length)return -1;
   i++;
  }
  // Cut at the closest pass to the end, before any continuation down the stem.
  let closest=i-1;
  while(i<line.length&&distance(line[i],end)<=radius){
   if(distance(line[i],end)<distance(line[closest],end))closest=i;
   i++;
  }
  return closest;
 },
 registerWarmup({id,model,teachingRoute,directionRoute,sourceKind},glyphModel){
  const whole=model.length===glyphModel.length&&model.every((line,index)=>line===glyphModel[index]);
  const taught=teachingRoute||(sourceKind==='demonstration'?model:null);
  if(!this.warmups.has(id)){
   const route=whole?this.route(glyphModel):directionRoute||taught||model.map(line=>{
    // Straight fragments can come from an earlier skeleton with opposite orientation.
    const direction=this.assess([line.map(([x,y])=>[x/150,y/180])],glyphModel,{forWarmup:true});
    return direction.ratio<.2?[...line].reverse():line;
   });
   const cue=(taught||route).map((stroke,index)=>{
    const [points]=TraceFeedback.sample([stroke],4,32);
    if(points.length<3)return '';
    const [x,y]=points[2],before=points[1],after=points[3]||points[2];
    const length=Math.hypot(after[0]-before[0],after[1]-before[1]);
    if(length<1)return '';
    const dx=(after[0]-before[0])/length,dy=(after[1]-before[1])/length;
    return `<path class="warmup-arrow" data-warmup-stroke="${index}" d="M${x-5*dx-3*dy} ${y-5*dy+3*dx} L${x} ${y} L${x-5*dx+3*dy} ${y-5*dy-3*dx}"/>`;
   }).join('');
   this.warmups.set(id,{route,cue});
  }
  const {route,cue}=this.warmups.get(id);
  this.register(model,route,whole,whole?this.alternatives.get(glyphModel):undefined);
  const parentPaths=this.joinedPaths.get(glyphModel);
  if(whole&&parentPaths)this.joinedPaths.set(model,parentPaths);
  if(teachingRoute&&model.length===1){
   // Allow the former continuous shape only as a complete directed sequence.
   const inherited=parentPaths?.find(prefix=>prefix.model[0]===model[0]);
   this.registerJoinedPaths(model,[{path:model[0],retrace:inherited?.retrace}]);
   if(!inherited)this.singleContactWarmups.add(model);
  }
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
  if(this.joinedPaths.has(model)){
   const current=this.assessRoute(actual,model,options);
   if(!current.backwards)return current;
  }
  let checked=0,backwards=0,flagged=false,retraceLength=0;
  for(const line of actual){
   const current=this.assessRoute([line],model,options);
   const previous=current.backwards?this.assessRoute([line],alternative,options):null;
   const result=previous?.checked&&!previous.backwards?previous:current;
   checked+=result.checked;
   backwards+=result.checked*(1-result.ratio);
   flagged||=result.backwards;
   retraceLength+=result.retraceLength||0;
  }
  return {backwards:flagged,ratio:checked?Math.max(0,1-backwards/checked):1,checked,retraceLength};
 },
 assessRoute(actual,model,options){
  const {tolerance,scale}=options;
  const standard=this.measure(actual,model,options);
  const paths=this.joinedPaths.get(model);
  if(!standard.backwards||!paths)return standard;

  // A completed directed prefix licenses its connected climb.
  // Further motion still uses the standard direction of the stem.
  let checkedPrefix=0,retraceLength=0;
  const continuations=[],mergeLifts=!this.singleContactWarmups.has(model);
  for(const line of actual){
   if(!line.length)continue;
   const last=continuations.at(-1)?.at(-1);
   if(mergeLifts&&last&&Math.hypot(last[0]-line[0][0],last[1]-line[0][1])<=1/scale)continuations.at(-1).push(...line);
   else continuations.push([...line]);
  }
  const joinRadius=Math.min(16,tolerance+2/scale);
  const remainder=continuations.map(line=>{
   for(const prefix of paths){
    const end=this.endIndex(line,prefix,joinRadius);
    if(end<1)continue;
    const result=this.measure([line.slice(0,end+1)],prefix.model,options);
    if(result.backwards||!result.checked)continue;
    checkedPrefix+=result.checked;
    const remaining=line.slice(end);
    if(prefix.retrace)retraceLength+=this.tracedReturn(remaining,prefix,joinRadius);
    return remaining;
   }
   return line;
  });
  if(!checkedPrefix)return standard;
  const rest=this.measure(remainder,model,options),checked=checkedPrefix+rest.checked;
  return {backwards:rest.backwards,ratio:(checkedPrefix+rest.checked*rest.ratio)/checked,checked,retraceLength};
 },
 tracedReturn(line,{end,model:[path]},radius){
  const bottom=path.at(-2),dx=bottom[0]-end[0],dy=bottom[1]-end[1],length=Math.hypot(dx,dy);
  let covered=0;
  for(const [x,y] of line.slice(1)){
   const ax=x-end[0],ay=y-end[1];
   if(Math.abs(ax*dy-ay*dx)>radius*length)break;
   covered=Math.max(covered,(ax*dx+ay*dy)/length);
   if(covered>=length)return length;
  }
  return covered;
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
 apply(geometry,direction){
  if(geometry.empty)return geometry;
  const score=direction.backwards?Math.min(89,Math.round(geometry.score*direction.ratio)):geometry.score;
  return {...geometry,shapeScore:geometry.score,direction,score};
 }
};
