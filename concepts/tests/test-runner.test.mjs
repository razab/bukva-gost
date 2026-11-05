import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {executeSuite,childRun,fingerprint,root} from '../../scripts/test.mjs';
import {catalog,selectTests} from '../../scripts/test-catalog.mjs';
const all=catalog(root),q=selectTests(all,'quick'),m=selectTests(all,'medium');assert(q.length/all.length<=.11);assert(m.length/all.length<=.30);assert(q.every(t=>m.includes(t)));assert.equal(selectTests(all,'full').length,all.length);assert.throws(()=>selectTests(all,'invented'));
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'gost-runner-'));
try{
 const pass=path.join(tmp,'pass.cjs'),fail=path.join(tmp,'fail.cjs'),ready=path.join(tmp,'ready'),counter=path.join(tmp,'counter');
 await fs.writeFile(pass,"require('node:fs').appendFileSync(process.env.QA_COUNTER,'x');console.log('pass canary')");await fs.writeFile(fail,"if(!require('node:fs').existsSync(process.env.QA_READY)){console.error('expected failure');process.exit(3)}console.log('recovered')");
 const tests=[{id:'pass',file:pass},{id:'fail',file:fail}],dir=path.join(tmp,'report'),signature=await fingerprint([pass,fail]),env={...process.env,QA_COUNTER:counter,QA_READY:ready};
 let state=await executeSuite({tests,tier:'canary',dir,signature,env,quiet:true});assert.equal(state.passed,false);assert.equal(state.results.pass.status,'passed');assert.equal(state.results.fail.code,3);assert((await fs.readFile(path.join(dir,'tests/fail/test.log'),'utf8')).includes('expected failure'));assert.equal(JSON.parse(await fs.readFile(path.join(dir,'state.json'),'utf8')).results.fail.status,'failed');
 await fs.writeFile(ready,'yes');state=await executeSuite({tests,tier:'canary',dir,signature,env,resume:true,quiet:true});assert(state.passed);assert.equal(await fs.readFile(counter,'utf8'),'x','Resume must reuse earlier passes');
 await assert.rejects(executeSuite({tests,tier:'canary',dir,signature:'changed-source',resume:true,quiet:true}),/Sources\/tier changed/);
 const hang=path.join(tmp,'hang.cjs');await fs.writeFile(hang,'setInterval(()=>{},1000)');const timeout=await childRun(process.execPath,[hang],{cwd:tmp,env,log:path.join(tmp,'timeout.log'),timeoutMs:150});assert(timeout.timedOut);assert.equal(timeout.status,'failed');
 const controller=new AbortController();setTimeout(()=>controller.abort(),100);const interruptedDir=path.join(tmp,'interrupted');state=await executeSuite({tests:[{id:'hang',file:hang},{id:'later',file:pass}],tier:'canary',dir:interruptedDir,signature:'interruption',env,quiet:true,abortSignal:controller.signal});assert(state.interrupted);assert.equal(state.results.later,undefined);assert.equal(state.results.hang.status,'interrupted');
 console.log('PASS: cumulative tier quotas; real child pass/fail, durable logs/state, failed test recovery without replaying passes, stale-source rejection and owned-process timeout');
}finally{await fs.rm(tmp,{recursive:true,force:true})}
