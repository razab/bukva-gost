// Horizontal worksheet guides are presentation only; never part of assessment.
const RowRuling={
 states:new WeakMap(),
 levels(frame,nominal){
  const visible=nominal.filter(y=>y>=frame.y&&y<=frame.y+frame.height);
  return visible.length?visible:[...new Set([frame.minY,frame.maxY])];
 },
 positions(rowRect,entries){
  const positions=[];
  for(const {rect,frame,levels} of entries){
   if(!rect.width||!rect.height)continue;
   for(const level of levels){
    const y=rect.top-rowRect.top+(level-frame.y)/frame.height*rect.height;
    if(y>=0&&y<=rowRect.height&&!positions.some(p=>Math.abs(p-y)<.5))positions.push(y);
   }
  }
  return positions.sort((a,b)=>a-b);
 },
 update(row){
  const state=this.states.get(row);if(!state)return;
  const rect=row.getBoundingClientRect();
  const positions=this.positions(rect,[...state.entries.values()].map(entry=>({...entry,rect:entry.writing.getBoundingClientRect()})));
  // Each gradient is one full-width horizontal line at its measured row Y.
  const background=positions.map(y=>`linear-gradient(to bottom,transparent ${Math.max(0,y-.5)}px,var(--ruling) ${Math.max(0,y-.5)}px,var(--ruling) ${y+.5}px,transparent ${y+.5}px)`).join(',')||'none';
  row.style.setProperty('--row-ruling-lines',background);
 },
 reframe(row,writing,frame,nominal){const state=this.states.get(row);if(!state)return;state.entries.set(writing,{writing,frame,levels:this.levels(frame,nominal)});state.schedule()},
 attach(row,writing,frame,nominal){
  let state=this.states.get(row);
  if(!state){
   state={entries:new Map(),pending:null};
   state.schedule=()=>{if(state.pending===null)state.pending=requestAnimationFrame(()=>{state.pending=null;this.update(row)})};
   state.observer=new ResizeObserver(state.schedule);state.observer.observe(row);this.states.set(row,state);
  }
  state.entries.set(writing,{writing,frame,levels:this.levels(frame,nominal)});
  state.observer.observe(writing);state.schedule();
  return ()=>{
   state.observer.unobserve?.(writing);state.entries.delete(writing);
   if(!state.entries.size){state.observer.disconnect();if(state.pending!==null)cancelAnimationFrame(state.pending);this.states.delete(row)}
  };
 }
};
