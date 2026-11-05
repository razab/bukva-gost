// Practice history describes attempts, never certifies that a letter is learned.
class LearningProgress {
 constructor(storage,onError=()=>{}){
  this.storage=storage;this.onError=onError;this.lastSaveSucceeded=false;
  this.key='gost-learning-progress-v1';this.state={version:1,letters:{}};this.synchronize();
 }
 static score(value){return Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):null}
 static statistics(value){
  if(value?.version!==1||!Number.isFinite(value.tolerance)||value.tolerance<.5||value.tolerance>16||!Number.isFinite(value.size)||value.size<30||value.size>160||!Number.isFinite(value.bold)||value.bold<100||value.bold>150)return null;
  const group=(v,time=false)=>{if(!v||!Number.isSafeInteger(v.count)||v.count<0||v.count>10000)return null;const out={count:v.count,score:v.count?this.score(v.score):null};if(time){out.timedCount=Number.isSafeInteger(v.timedCount)&&v.timedCount>=0&&v.timedCount<=v.count?v.timedCount:0;out.meanMs=out.timedCount&&Number.isFinite(v.meanMs)&&v.meanMs>=0&&v.meanMs<=86400000?Math.round(v.meanMs):null;if(out.meanMs===null)out.timedCount=0}return out};
  const upper=group(value.upper,true),lower=group(value.lower,true),overall=group(value.overall);if(!upper||!lower||!overall||overall.count<upper.count+lower.count)return null;
  return {version:1,tolerance:value.tolerance,size:value.size,bold:value.bold,upper,lower,overall};
 }
 read(){
  const out={version:1,letters:{}};
  try{
   const saved=JSON.parse(this.storage.getItem(this.key)||'null');
   if(saved?.version!==1||!saved.letters||typeof saved.letters!=='object')return out;
   for(const [letter,value] of Object.entries(saved.letters)){
    if(!/^[А-ЯЁ]$/.test(letter)||!Array.isArray(value?.sessions))continue;
    const sessions=value.sessions.filter(s=>s&&Number.isFinite(s.at)&&s.at>=0&&Number.isSafeInteger(s.traced)&&s.traced>=0&&Number.isSafeInteger(s.independent)&&s.independent>=0&&s.traced+s.independent>0&&typeof s.signature==='string'&&s.signature.length>0&&s.signature.length<=64).slice(-60).map(s=>({at:s.at,traced:s.traced,independent:s.independent,traceScore:LearningProgress.score(s.traceScore),independentScore:LearningProgress.score(s.independentScore),signature:s.signature,...(LearningProgress.statistics(s.statistics)?.overall.count===s.traced?{statistics:LearningProgress.statistics(s.statistics)}:{})}));
    out.letters[letter]={sessions};
   }
  }catch{}
  return out;
 }
 synchronize(){
  // Keep unsaved memory too: a quota error must not discard this tab's work.
  const durable=this.read();
  for(const letter of new Set([...Object.keys(durable.letters),...Object.keys(this.state.letters)])){
   const merged=new Map();
   for(const session of [...(durable.letters[letter]?.sessions||[]),...(this.state.letters[letter]?.sessions||[])])merged.set(session.at+':'+session.signature,session);
   this.state.letters[letter]={sessions:[...merged.values()].sort((a,b)=>a.at-b.at).slice(-60)};
  }
 }
 persist(){this.synchronize();try{this.storage.setItem(this.key,JSON.stringify(this.state));this.lastSaveSucceeded=true}catch{this.lastSaveSucceeded=false;this.onError()}}
 sessions(letter){return structuredClone(this.state.letters[letter]?.sessions||[])}
 finish(letter,{traced=0,independent=0,traceScore=null,independentScore=null,statistics=null,signature,at=Date.now()}){
  if(!/^[А-ЯЁ]$/.test(letter)||typeof signature!=='string'||!signature||signature.length>64||!Number.isSafeInteger(traced)||!Number.isSafeInteger(independent)||traced<0||independent<0||traced+independent===0||!Number.isFinite(at)||at<0)return null;
  this.synchronize();
  const sessions=this.sessions(letter);if(sessions.at(-1)?.signature===signature){this.persist();return sessions.at(-1)}
  const session={at,traced,independent,traceScore:LearningProgress.score(traceScore),independentScore:LearningProgress.score(independentScore),signature};
  const details=LearningProgress.statistics(statistics);if(details&&details.overall.count===traced)session.statistics=details;
  this.state.letters[letter]={sessions:[...sessions,session].slice(-60)};this.persist();return session;
 }
 summary(){const values=Object.values(this.state.letters);return {letters:values.filter(v=>v.sessions.length).length,sessions:values.reduce((n,v)=>n+v.sessions.length,0)}}
}
