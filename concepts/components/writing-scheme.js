// Static writing instructions. Routes are the same ordered arrays as the demo.
const WritingScheme={
 cache:new WeakMap(),
 distance(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])},
 at(line,fraction){const lengths=line.slice(1).map((p,i)=>this.distance(p,line[i])),total=lengths.reduce((a,b)=>a+b,0);let travel=total*Math.max(0,Math.min(1,fraction));for(let i=0;i<lengths.length;i++){if(travel<=lengths[i]||i===lengths.length-1){const a=line[i],b=line[i+1],t=lengths[i]?travel/lengths[i]:0;return {point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],unit:lengths[i]?[(b[0]-a[0])/lengths[i],(b[1]-a[1])/lengths[i]]:[0,1],length:total}}travel-=lengths[i]}return {point:line[0],unit:[0,1],length:0}},
 layout(model){
  if(this.cache.has(model))return this.cache.get(model);
  const samples=model.flatMap(line=>{const count=Math.max(2,Math.ceil(this.at(line,0).length/3));return Array.from({length:count},(_,i)=>this.at(line,i/(count-1)).point)}),labels=[];
  for(const line of model){const start=line[0],{unit}=this.at(line,.01),n=[-unit[1],unit[0]],candidates=[];
   for(const radius of [16,21,27])for(const v of [n,n.map(x=>-x),unit.map(x=>-x),[-1,0],[1,0],[0,-1],[0,1]])candidates.push([start[0]+v[0]*radius,start[1]+v[1]*radius]);
   const cost=p=>{const border=Math.max(0,9-p[0],p[0]-141,9-p[1],p[1]-171),ink=Math.min(...samples.map(q=>this.distance(p,q))),spacing=Math.min(100,...labels.map(q=>this.distance(p,q)));return border*10000+Math.max(0,17-spacing)*1000+Math.max(0,14-ink)*100+this.distance(p,start)};
   let best=candidates[0];for(const p of candidates)if(cost(p)<cost(best)-.01)best=p;labels.push(best);
  }
  const result=model.map((line,i)=>{const {length}=this.at(line,0),fractions=length<6?[]:length>140?[.35,.75]:[.65];return {line,label:labels[i],arrows:fractions.map(t=>this.at(line,t))}});this.cache.set(model,result);return result;
 },
 markup(model,outline){
  const path=line=>line.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' '),n=v=>Number(v.toFixed(3));
  const strokes=this.layout(model).map((s,i)=>{
   const arrows=s.arrows.map(({point:p,unit:u})=>{const q=[p[0]-u[0]*6,p[1]-u[1]*6],v=[-u[1]*3,u[0]*3];return `<path data-scheme-arrow="${i}" d="M${n(p[0])} ${n(p[1])}L${n(q[0]+v[0])} ${n(q[1]+v[1])}L${n(q[0]-v[0])} ${n(q[1]-v[1])}Z" fill="#315e48"/>`}).join('');
   return `<path data-scheme-stroke="${i}" d="${path(s.line)}" fill="none" stroke="#315e48" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>${arrows}`;
  }).join('');
  const labels=this.layout(model).map((s,i)=>{const [x,y]=s.label,p=s.line[0];return `<path d="M${n(x)} ${n(y)}L${n(p[0])} ${n(p[1])}" fill="none" stroke="#90a89a" stroke-width=".7"/><circle data-step-number="${i+1}" cx="${n(x)}" cy="${n(y)}" r="7" fill="#fffefa" stroke="#315e48" stroke-width=".8"/><text x="${n(x)}" y="${n(y+.3)}" text-anchor="middle" dominant-baseline="central" fill="#244c38" font-family="system-ui,sans-serif" font-weight="650" font-size="10">${i+1}</text>`}).join('');
  return outline+strokes+labels;
 }
};
