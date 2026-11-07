import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {catalog,selectTests,areas,quick,medium} from './test-catalog.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const atomic=async(file,value)=>{await fs.writeFile(file+'.tmp',JSON.stringify(value,null,2)+'\n');await fs.rename(file+'.tmp',file)};
export async function fingerprint(files){const h=crypto.createHash('sha256');for(const file of [...files].sort()){h.update(file);h.update(await fs.readFile(file))}return h.digest('hex')}
export function childRun(file,args,{cwd,env,log,timeoutMs=180000,abortSignal}={}){
 return new Promise(resolve=>{const started=performance.now(),stream=fsSync.createWriteStream(log),child=spawn(file,args,{cwd,env,stdio:['ignore','pipe','pipe']});let timedOut=false,interrupted=false,error=null,killTimer;
  child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
  const stop=()=>{child.kill('SIGTERM');killTimer=setTimeout(()=>child.kill('SIGKILL'),1000);killTimer.unref()};
  const interrupt=()=>{interrupted=true;stop()};process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);abortSignal?.addEventListener('abort',interrupt,{once:true});if(abortSignal?.aborted)interrupt();
  const timer=setTimeout(()=>{timedOut=true;stop()},timeoutMs);
  child.on('error',e=>{error=e.message;stream.write(e.stack+'\n')});
  child.on('close',(code,signal)=>{clearTimeout(timer);clearTimeout(killTimer);process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);abortSignal?.removeEventListener('abort',interrupt);stream.end(()=>resolve({status:code===0&&!error&&!timedOut&&!interrupted?'passed':interrupted?'interrupted':'failed',code,signal,timedOut,interrupted,error,durationMs:Math.round(performance.now()-started)}))});
 });
}
export async function executeSuite({tests,tier,dir,signature,env=process.env,preload=null,resume=false,quiet=false,timeoutMs,abortSignal}){
 await fs.mkdir(dir,{recursive:true});const stateFile=path.join(dir,'state.json');let state;
 if(resume){state=JSON.parse(await fs.readFile(stateFile,'utf8'));if(state.signature!==signature||state.tier!==tier||JSON.stringify(state.testIds)!==JSON.stringify(tests.map(t=>t.id)))throw Error('Sources/tier changed: start a new report; old passes cannot be reused')}
 else{if(fsSync.existsSync(stateFile))throw Error('Report already exists; use --resume or a new directory');state={schema:1,tier,signature,testIds:tests.map(t=>t.id),startedAt:new Date().toISOString(),results:{}};await atomic(stateFile,state)}
 delete state.interrupted;
 for(const test of tests){
  if(state.results[test.id]?.status==='passed'){if(!quiet)console.log('REUSE '+test.id);continue}
  const target=path.join(dir,'tests',test.id);await fs.mkdir(target,{recursive:true});await fs.rm(path.join(target,'v8'),{recursive:true,force:true});
  state.results[test.id]={status:'running',startedAt:new Date().toISOString()};await atomic(stateFile,state);
  const result=await childRun(process.execPath,[...(preload?['--require',preload]:[]),test.file],{cwd:root,env:{...env,...(preload?{NODE_V8_COVERAGE:path.join(target,'v8')}:{})},log:path.join(target,'test.log'),timeoutMs:timeoutMs??test.timeoutMs,abortSignal});
  state.results[test.id]={...result,log:path.join('tests',test.id,'test.log')};await atomic(stateFile,state);
  if(!quiet)console.log(`${result.status==='passed'?'PASS':'FAIL'} ${test.id} ${(result.durationMs/1000).toFixed(2)}s`);
  if(result.interrupted){state.interrupted=true;break}
 }
 state.finishedAt=new Date().toISOString();state.passed=tests.every(t=>state.results[t.id]?.status==='passed');await atomic(stateFile,state);return state;
}
async function coverageReport(dir,state,tier,sourceDir=dir){
 const raw=path.join(dir,'v8');await fs.rm(raw,{recursive:true,force:true});await fs.mkdir(raw,{recursive:true});
 for(const [id,result] of Object.entries(state.results))if(result.status==='passed'){
  const from=path.join(sourceDir,'tests',id,'v8');for(const file of await fs.readdir(from).catch(()=>[]))if(file.endsWith('.json'))await fs.copyFile(path.join(from,file),path.join(raw,file));
 }
 const result=await childRun(process.execPath,[path.join(root,'node_modules/c8/bin/c8.js'),'report','--all','--src','concepts','--include','concepts/components/*.js','--include','concepts/sw.js','--reporter','json-summary','--reporter','text-summary','--temp-directory',raw,'--reports-dir',path.join(dir,'coverage')],{cwd:root,env:{...process.env,NODE_V8_COVERAGE:''},log:path.join(dir,'coverage.log'),timeoutMs:60000});
 if(result.status!=='passed')throw Error('Coverage failed; inspect '+path.join(dir,'coverage.log'));
 const summary=JSON.parse(await fs.readFile(path.join(dir,'coverage/coverage-summary.json'),'utf8'));
 const expected=fsSync.readdirSync(path.join(root,'concepts/components')).filter(n=>n.endsWith('.js')).map(n=>path.join(root,'concepts/components',n)).concat(path.join(root,'concepts/sw.js'));
 for(const file of expected)if(!summary[file])throw Error('Coverage silently omitted production source: '+file);
 if(!summary.total?.lines.total||!summary.total?.functions.total)throw Error('Coverage is empty; VM scripts were not attributed to source files');
 const threshold=tier==='quick'?null:70,passes=threshold===null||['lines','functions','branches'].every(k=>summary.total[k].pct>=threshold);
 return {scope:'All concepts/components/*.js plus concepts/sw.js; tests, harness, server and dependencies excluded',metric:'c8/V8 lines, functions and branches; each must reach70% for medium/full',threshold,passed:passes,total:summary.total};
}
export async function main(argv=process.argv.slice(2)){
 const started=performance.now(),positional=[];for(let i=0;i<argv.length;i++){if(['--report-dir','--resume'].includes(argv[i])){i++;if(!argv[i]||argv[i].startsWith('--'))throw Error('Directory argument missing')}else if(['quick','medium','full'].includes(argv[i]))positional.push(argv[i]);else if(!['--list','--help'].includes(argv[i]))throw Error('Unknown argument: '+argv[i])}if(positional.length>1)throw Error('Choose one tier');
 if(argv.includes('--help')){console.log('node scripts/test.mjs quick|medium|full [--report-dir DIR]\nnode scripts/test.mjs [tier] --resume DIR\nnode scripts/test.mjs --list');return}
 const tests=catalog(root);if(argv.includes('--list')){for(const tier of ['quick','medium','full']){const selected=selectTests(tests,tier);console.log(`${tier}: ${selected.length}/${tests.length} files (${(100*selected.length/tests.length).toFixed(1)}%)\n  ${selected.map(t=>t.id).join(', ')}`)}return}
 const option=name=>{const i=argv.indexOf(name);if(i<0)return null;if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error(name+' needs a directory');return path.resolve(argv[i+1])};
 const resumeDir=option('--resume'),tier=positional[0]||(resumeDir?JSON.parse(await fs.readFile(path.join(resumeDir,'state.json'),'utf8')).tier:'quick'),selected=selectTests(tests,tier),dir=resumeDir||option('--report-dir')||path.join(root,'reports/test-runs',new Date().toISOString().replace(/[:.]/g,'-')+'-'+tier+'-'+process.pid);
 if(!fsSync.existsSync(path.join(root,'node_modules/c8/bin/c8.js')))throw Error('Install test dependencies first: npm ci');
 if(tier==='full'&&!fsSync.existsSync(path.join(root,'node_modules/@resvg/resvg-js/package.json'))&&!process.env.RESVG_MODULE)throw Error('Full rendering checks require npm ci');
 // No canary-only environment can silently shrink a named tier.
 const env={...process.env};for(const key of Object.keys(env))if(/CANARY|_ONLY$|^LETTER_.*_PROBE$/.test(key))delete env[key];
 await fs.mkdir(dir,{recursive:true});let prepare=null;if(tier!=='quick'){prepare=await childRun(process.execPath,[path.join(root,'scripts/build-offline.mjs')],{cwd:root,env,log:path.join(dir,'prepare.log'),timeoutMs:60000});await atomic(path.join(dir,'prepare.json'),prepare);if(prepare.status!=='passed')throw Error('Offline preparation failed; inspect '+path.join(dir,'prepare.log'))}
 const walk=async d=>(await Promise.all((await fs.readdir(d,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]))).flat();
 const files=[...await walk(path.join(root,'concepts')),...await walk(path.join(root,'.agents/skills/apple-preflight')),...await walk(path.join(root,'.agents/skills/app-store-review')),...['editor/index.html','scripts/test.mjs','scripts/test-catalog.mjs','scripts/test-coverage-preload.cjs','scripts/build-offline.mjs','scripts/offline-html.mjs','scripts/apple-preflight.mjs','scripts/internal-package.mjs','scripts/zip-internal.py','references/isopromat-fonts/SOURCE.json','package.json','package-lock.json'].map(n=>path.join(root,n))];
 const signature=await fingerprint(files);console.log(`${tier}: ${selected.length}/${tests.length} files; report ${dir}`);
 const state=await executeSuite({tests:selected,tier,dir,signature,env,preload:path.join(root,'scripts/test-coverage-preload.cjs'),resume:!!resumeDir});
 const coverage=await coverageReport(dir,state,tier),featureAreas=Object.fromEntries(Object.entries(areas).map(([area,ids])=>[area,ids.filter(id=>state.results[id]?.status==='passed')])),subsets={};
 // Full validates the medium budget/gate from the same executions. No tests
 // are repeated merely to obtain reports for the smaller tiers.
 if(tier==='full')for(const subset of ['quick','medium']){const picked=selectTests(tests,subset),results=Object.fromEntries(picked.filter(t=>state.results[t.id]).map(t=>[t.id,state.results[t.id]])),subdir=path.join(dir,'subsets',subset);await fs.mkdir(subdir,{recursive:true});const subcoverage=await coverageReport(subdir,{results},subset,dir);subsets[subset]={tier:subset,sourceRun:dir,files:{selected:picked.length,total:tests.length,percent:100*picked.length/tests.length},testsPassed:picked.every(t=>results[t.id]?.status==='passed'),coverage:subcoverage,durationMs:Object.values(results).reduce((n,r)=>n+(r.durationMs||0),0)};await atomic(path.join(subdir,'summary.json'),subsets[subset])}
 const report={schema:1,tier,files:{selected:selected.length,total:tests.length,percent:100*selected.length/tests.length},signature,node:process.version,platform:os.platform(),testsPassed:state.passed,interrupted:!!state.interrupted,prepare,coverage,subsets,featureAreas,manualChecks:['Native iPad/Pencil palm rejection, native gestures and visual layout require a device/browser check; no automated tier certifies these.'],durationMs:Object.values(state.results).reduce((n,r)=>n+(r.durationMs||0),0),wallTimeMs:Math.round(performance.now()-started),results:state.results};
 await atomic(path.join(dir,'summary.json'),report);await fs.writeFile(path.join(dir,'summary.txt'),`${tier}: ${state.passed?'tests passed':'TEST FAILURES'}\n${selected.length}/${tests.length} test files\nCoverage lines ${coverage.total.lines.pct}%, functions ${coverage.total.functions.pct}%, branches ${coverage.total.branches.pct}%\nCoverage gate: ${coverage.passed?'PASS':'FAIL'}\nDuration ${(report.durationMs/1000).toFixed(2)}s\nJSON: summary.json\n`);
 console.log(await fs.readFile(path.join(dir,'summary.txt'),'utf8'));if(subsets.medium)console.log('Medium subset coverage: '+(subsets.medium.coverage.passed?'PASS':'FAIL'));if(state.interrupted)process.exitCode=130;else if(!state.passed||!coverage.passed||Object.values(subsets).some(s=>!s.testsPassed||!s.coverage.passed))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1});
