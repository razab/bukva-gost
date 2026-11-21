// Teaching direction is separate from font geometry and permits pen lifts.
const StrokeDirection={
 routes:new WeakMap(),geometry:new WeakMap(),cache:new WeakMap(),warmups:new Map(),warmupCues:new WeakMap(),cell:12,
 register(model,teaching=model,complete=false){this.routes.set(model,teaching);if(complete)this.geometry.set(model,teaching)},
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
  const {grid}=this.prepare(model),radius=tolerance+2/scale,ambiguity=Math.max(.8,Math.min(4,tolerance*scale/2))/scale,minReverse=4/scale;
  const actual=TraceFeedback.sample(strokes.map(line=>line.map(([x,y])=>[x*width,y*height])),2/scale,1536);
  let checked=0,backwards=0;
  for(const line of actual){
   let run=0;const flush=()=>{if(run>=minReverse)backwards+=run;run=0};
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
    checked+=length;if(reverse)run+=length;else flush();
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
