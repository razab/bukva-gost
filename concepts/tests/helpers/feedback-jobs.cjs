const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
module.exports=function checkFeedbackJobs(){
 const dir=path.resolve(__dirname,'../../components'),jobs=fs.readFileSync(dir+'/feedback-jobs.js','utf8'),feedback=fs.readFileSync(dir+'/trace-feedback.js','utf8'),workerSource=fs.readFileSync(dir+'/feedback-worker.js','utf8');
 function boot(withWorker=false){
  const tasks=new Map(),workers=[];let serial=0,time=0;
  class FakeWorker{constructor(url){assert.equal(url,'https://qa.local/app/components/feedback-worker.js?v=53');this.messages=[];workers.push(this)}postMessage(message){this.messages.push(structuredClone(message))}terminate(){this.stopped=true}}
  const ctx={URL,document:{currentScript:{src:'https://qa.local/app/components/feedback-jobs.js?v=53'},baseURI:'https://qa.local/app/'},performance:{now:()=>time+=.2},setTimeout(fn){const id=++serial;tasks.set(id,fn);return id},clearTimeout(id){tasks.delete(id)}};if(withWorker)ctx.Worker=FakeWorker;
  vm.createContext(ctx);vm.runInContext(feedback,ctx);vm.runInContext(jobs,ctx);
  const next=()=>{const entry=tasks.entries().next().value;if(!entry)return false;tasks.delete(entry[0]);entry[1]();return true},flush=()=>{for(let i=0;next();i++)assert(i<20000,'Feedback fallback did not yield/finish')};
  return {ctx,workers,tasks,next,flush,job:vm.runInContext('FeedbackJobs',ctx),feedback:vm.runInContext('TraceFeedback',ctx)};
 }
 const payload={strokes:[[[.2,.2],[.2,.8]]],model:[[[20,20],[20,120]]],width:150,height:180,tolerance:2};
 let app=boot(true),calls=[];const cancel=app.job.request(payload,'all',r=>calls.push(r));assert.equal(app.workers.length,0);cancel();app.flush();assert.equal(app.workers.length,0);assert.equal(calls.length,0,'Cancelled before dispatch may not run geometry');
 const cancelActive=app.job.request(payload,'all',r=>calls.push(r));app.next();assert.equal(app.workers.length,1);const w=app.workers[0],first=w.messages[0];cancelActive();
 for(let i=0;i<100;i++){const drop=app.job.request(payload,'outside',r=>calls.push(r));drop()}
 app.job.request(payload,'outside',r=>calls.push(r));app.flush();assert.equal(w.messages.length,1,'Only one job may be in flight');w.onmessage({data:{id:first.id,markup:'STALE'}});app.flush();assert.equal(calls.length,0);assert.equal(w.messages.length,2,'Cancelled queued work must not be sent');w.onmessage({data:{id:first.id,markup:'STALE'}});assert.equal(calls.length,0);w.onmessage({data:{id:w.messages[1].id,markup:'LATEST'}});app.flush();assert.deepEqual(calls,['LATEST']);assert.equal(app.job.engine,'worker');
 // Worker failure uses bounded cooperative work, not a synchronous fallback.
 calls=[];app.job.request(payload,'all',r=>calls.push(r));app.flush();let prevented=false;w.onerror({preventDefault(){prevented=true}});assert(prevented&&w.stopped);assert.equal(calls.length,0);app.flush();assert(calls[0].includes('extra-ink')&&calls[0].includes('missing-ink'));assert.equal(app.job.engine,'cooperative');
 app=boot();calls=[];const large={...payload,strokes:[Array.from({length:2000},(_,i)=>[(i%79)/80,(Math.sin(i)+1)/2])],model:[Array.from({length:500},(_,i)=>[20+i/5,50+Math.cos(i/9)*10])]};
 const drop=app.job.request(large,'all',r=>calls.push(r));app.next();app.next();assert(app.tasks.size,'Large work must yield across tasks');assert.equal(calls.length,0);drop();app.flush();assert.equal(calls.length,0,'Cancelled fallback result must not arrive');
 for(const mode of ['all','outside']){app=boot();let result;app.job.request(payload,mode,r=>result=r);assert.equal(result,undefined);app.flush();const expected=mode==='all'?app.feedback.markup(app.feedback.analyze(payload.strokes,payload.model,payload)):app.feedback.markup({missing:[],extra:app.feedback.outside(payload.strokes,payload.model,payload)});assert.equal(result,expected)}
 // Run the actual worker entry point, including its offline-versioned import.
 const emitted=[],wc={self:{postMessage:r=>emitted.push(r)},importScripts:url=>assert.equal(url,'trace-feedback.js?v=53')};vm.createContext(wc);vm.runInContext(feedback,wc);vm.runInContext(workerSource,wc);wc.self.onmessage({data:{id:73,mode:'all',payload}});assert.equal(emitted[0].id,73);assert(emitted[0].markup.includes('missing-ink'));
 console.log('PASS feedback jobs: deferred dispatch, cancelled queued/in-flight results, bounded queue, worker entry point, yielding/cancellable fallback and exact legacy geometry');
};
