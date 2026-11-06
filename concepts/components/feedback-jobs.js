// Geometry feedback never runs in a button handler or a canvas paint.
// One worker, a bounded queue, cancellable results; cooperative local fallback.
const FeedbackJobs=(()=>{
 let serial=0,timer=null,worker=null,broken=false,active=null;
 const queue=new Map(),scriptURL=document.currentScript?.src||null;
 const later=fn=>setTimeout(fn,0);
 function schedule(){if(timer===null)timer=later(()=>{timer=null;pump()})}
 function finish(job,markup){if(active!==job)return;active=null;try{if(!job.cancelled)job.done(markup)}finally{schedule()}}
 function slice(){
  const job=active;if(!job)return;if(job.cancelled){finish(job,'');return}
  const start=performance.now();let result,steps=0;
  try{do{result=job.iterator.next();if(result.done){finish(job,result.value);return}}while(++steps<32&&performance.now()-start<4)}catch{finish(job,'');return}
  later(slice);
 }
 function fallback(){if(!active)return;active.iterator=TraceFeedback.steps(active.payload,active.mode);later(slice)}
 function pump(){
  if(active)return;const job=queue.values().next().value;if(!job)return;queue.delete(job.id);active=job;
  if(!broken&&typeof Worker==='function'){
   try{
    if(!worker){worker=new Worker(new URL('feedback-worker.js?v=51',scriptURL||new URL('components/feedback-jobs.js',document.baseURI)).href);worker.onmessage=e=>{if(active?.id===e.data.id)finish(active,e.data.markup||'')};worker.onerror=e=>{e.preventDefault?.();worker.terminate();worker=null;broken=true;fallback()}}
    worker.postMessage({id:job.id,mode:job.mode,payload:job.payload});return;
   }catch{worker?.terminate();worker=null;broken=true}
  }
  fallback();
 }
 return {request(payload,mode,done){const job={id:++serial,payload,mode,done,cancelled:false};queue.set(job.id,job);schedule();return ()=>{job.cancelled=true;queue.delete(job.id)}},get engine(){return worker?'worker':'cooperative'}};
})();
