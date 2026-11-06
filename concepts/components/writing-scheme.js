// PDF-style notation: a number belongs to its parallel direction arrow.
// Reviewed placements never relocate a number towards another stroke's start.
const WritingScheme={
 cache:new WeakMap(),
 notes:new WeakMap(Object.values(DrawingGlyphs).filter(g=>g.instruction?.notation).map(g=>[g.demonstration,g.instruction.notation])),
 distance(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])},
 at(line,fraction){const lengths=line.slice(1).map((p,i)=>this.distance(p,line[i])),total=lengths.reduce((a,b)=>a+b,0);let travel=total*Math.max(0,Math.min(1,fraction));for(let i=0;i<lengths.length;i++){if(travel<=lengths[i]||i===lengths.length-1){const a=line[i],b=line[i+1],t=lengths[i]?travel/lengths[i]:0;return {point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],unit:lengths[i]?[(b[0]-a[0])/lengths[i],(b[1]-a[1])/lengths[i]]:[0,1],length:total}}travel-=lengths[i]}return {point:line[0],unit:[0,1],length:0}},
 parallel(line,note){
  if(note.dot)return [];
  const [start,end]=note.range,length=this.at(line,0).length,count=Math.max(2,Math.ceil(length*(end-start)/3)),epsilon=Math.min(.04,3/(length||1));
  return Array.from({length:count+1},(_,i)=>{const t=start+(end-start)*i/count,p=this.at(line,t).point,a=this.at(line,t-epsilon).point,b=this.at(line,t+epsilon).point,d=this.distance(a,b)||1,u=[(b[0]-a[0])/d,(b[1]-a[1])/d];return [p[0]-u[1]*note.offset,p[1]+u[0]*note.offset]});
 },
 layout(model){
  if(this.cache.has(model))return this.cache.get(model);
  const notes=this.notes.get(model);if(!notes||notes.length!==model.length)throw new Error('Missing reviewed scheme notation');
  const result=model.map((line,i)=>{const note=notes[i],arrowLine=this.parallel(line,note);return {line,label:note.label,arrowLine,arrows:arrowLine.length?[this.at(arrowLine,1)]:[]}});this.cache.set(model,result);return result;
 },
 frame(models,inkBounds,expansion=0){
  const boxes=inkBounds.map(b=>[b[0]-expansion,b[1]-expansion,b[2]+expansion,b[3]+expansion]);
  for(const model of models)for(const step of this.layout(model)){const [x,y]=step.label;boxes.push([x-8,y-8,x+8,y+8]);for(const p of step.arrowLine)boxes.push([p[0]-4,p[1]-4,p[0]+4,p[1]+4])}
  const x=Math.min(...boxes.map(b=>b[0]))-3,y=Math.min(...boxes.map(b=>b[1]))-3;return [x,y,Math.max(...boxes.map(b=>b[2]))+3-x,Math.max(...boxes.map(b=>b[3]))+3-y];
 },
 markup(model,outline){
  const n=v=>Number(v.toFixed(3)),path=line=>line.map((p,i)=>(i?'L':'M')+n(p[0])+' '+n(p[1])).join(' ');
  return outline+this.layout(model).map((s,i)=>{const arrows=s.arrows.map(({point:p,unit:u})=>{const q=[p[0]-u[0]*5.5,p[1]-u[1]*5.5],v=[-u[1]*2.6,u[0]*2.6];return `<path data-scheme-arrow="${i}" d="M${n(p[0])} ${n(p[1])}L${n(q[0]+v[0])} ${n(q[1]+v[1])}L${n(q[0]-v[0])} ${n(q[1]-v[1])}Z" fill="#244c38"/>`}).join('');const [x,y]=s.label;return `<g data-scheme-stroke="${i}">${s.arrowLine.length?`<path data-direction-line="${i}" d="${path(s.arrowLine)}" fill="none" stroke="#244c38" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`:''}${arrows}<text data-step-number="${i+1}" x="${n(x)}" y="${n(y)}" text-anchor="middle" dominant-baseline="central" fill="#193f2b" font-family="system-ui,sans-serif" font-weight="600" font-size="12">${i+1}</text></g>`}).join('');
 }
};
