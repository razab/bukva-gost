// Local geometric feedback. It never changes the assessment or stroke order.
const TraceFeedback={
 sample(lines,step=2,budget=900){
  const lengths=lines.map(line=>line.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-line[i][0],p[1]-line[i][1]),0)),total=lengths.reduce((a,b)=>a+b,0);step=Math.max(step,total/Math.max(1,budget-lines.length));
  return lines.map((line,i)=>{if(!line.length)return [];const out=[line[0]],length=lengths[i];let travel=step,sofar=0;for(let j=1;j<line.length;j++){const a=line[j-1],b=line[j],distance=Math.hypot(b[0]-a[0],b[1]-a[1]);while(distance&&travel<=sofar+distance){const t=(travel-sofar)/distance;out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);travel+=step}sofar+=distance}if(length)out.push(line.at(-1));return out})
 },
 distance(point,lines){let best=Infinity;for(const line of lines){if(line.length===1)best=Math.min(best,Math.hypot(point[0]-line[0][0],point[1]-line[0][1]));for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length)):0;best=Math.min(best,Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy))}}return best},
 groups(lines,other,tolerance){const groups=[];for(const line of lines){let current=[];const finish=()=>{if(current.length){groups.push(current);current=[]}};for(const point of line){if(this.distance(point,other)>tolerance)current.push(point);else finish()}finish()}return groups},
 outside(strokes,model,{width=150,height=180,tolerance=8}={}){
  return this.groups(this.sample(strokes.map(line=>line.map(([x,y])=>[x*width,y*height]))),model,tolerance)
 },
 analyze(strokes,model,{width=150,height=180,tolerance=8}={}){
  const actual=this.sample(strokes.map(line=>line.map(([x,y])=>[x*width,y*height]))),expected=this.sample(model);
  if(!actual.some(line=>line.length))return {missing:[],extra:[]};
  return {missing:this.groups(expected,actual,tolerance),extra:this.groups(actual,expected,tolerance)}
 },
 // Yield within the expensive segment scan so fallback slices stay bounded.
 *groupSteps(lines,other,tolerance){
  const groups=[],limit=tolerance*tolerance;let operations=0;
  for(const line of lines){let current=[];const flush=()=>{if(current.length){groups.push(current);current=[]}};
   for(const p of line){let inside=false;
    search:for(const route of other){
     if(route.length===1){const dx=p[0]-route[0][0],dy=p[1]-route[0][1];inside=dx*dx+dy*dy<=limit;if(++operations%256===0)yield;if(inside)break}
     for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,x=p[0]-a[0]-t*dx,y=p[1]-a[1]-t*dy;inside=x*x+y*y<=limit;if(++operations%256===0)yield;if(inside)break search}
    }
    if(inside)flush();else current.push(p);
   }flush();
  }return groups;
 },
 *steps({strokes,model,width=150,height=180,tolerance=8},mode='all'){
  const actual=this.sample(strokes.map(line=>line.map(([x,y])=>[x*width,y*height])));if(!actual.some(line=>line.length))return '';
  const expected=mode==='all'?this.sample(model):model,extra=yield* this.groupSteps(actual,expected,tolerance),missing=mode==='all'?yield* this.groupSteps(expected,actual,tolerance):[];
  return this.markup({missing,extra});
 },
 markup(feedback){const path=line=>line.map((p,i)=>(i?'L':'M')+p.map(n=>Number(n.toFixed(3))).join(' ')).join(' ')+(line.length===1?' l.001 0':'');return [...feedback.missing.map(line=>`<path class="missing-ink" d="${path(line)}"/>`),...feedback.extra.map(line=>`<path class="extra-ink" d="${path(line)}"/>`)].join('')}
};
