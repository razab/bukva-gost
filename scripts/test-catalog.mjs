import fs from 'node:fs';
import path from 'node:path';
export const quick=['sliders','ink-storage','palm-guard'];
export const medium=[...quick,'worksheet','learner','tolerance-performance','worksheet-dock','offline-bundle','offline-client'];
export const areas={
 dock:['worksheet-dock'],
 sliders:['sliders','manual-tolerance','left-inset','ipad-controls','tolerance-performance'],
 ink:['ink-storage','worksheet','backup'],
 input:['palm-guard','input-policy','tablet-workspace'],
 scoring:['worksheet','manual-tolerance','feedback'],
 layout:['worksheet','left-inset','field-render'],
 composition:['worksheet','propisi-flow','short-practice'],
 lessons:['learner','short-practice','alphabet','lesson-pictures'],
 progress:['learner','progress','attempts','learner-polish'],
 backup:['backup','learner'],
 animation:['worksheet','demonstration','all-demonstrations','reveal-render','stroke-order'],
 assets:['icons','catalog-render','alphabet'],
 offline:['offline-bundle','offline-client'],
 lan:['learner-server'],
 runner:['test-runner']
};
export function catalog(root){return fs.readdirSync(path.join(root,'concepts/tests')).filter(n=>/\.test\.(?:cjs|mjs)$/.test(n)).sort().map(file=>({id:file.replace(/\.test\.[cm]js$/,''),file:path.join(root,'concepts/tests',file),timeoutMs:file.startsWith('all-demonstrations')?300000:180000}))}
export function selectTests(tests,tier){
 if(!['quick','medium','full'].includes(tier))throw Error('Unknown tier: '+tier);
 const ids=new Set(tests.map(t=>t.id));
 for(const id of medium)if(!ids.has(id))throw Error('Catalog missing '+id);
 if(quick.length/tests.length>.11||quick.length/tests.length<.08)throw Error('Quick must stay near10% (8–11% after rounding)');
 if(medium.length/tests.length>.30)throw Error('Medium exceeds30% of test files');
 if(new Set(medium).size!==medium.length||!quick.every(id=>medium.includes(id)))throw Error('Tiers must be unique and cumulative');
 return tier==='full'?[...medium.map(id=>tests.find(t=>t.id===id)),...tests.filter(t=>!medium.includes(t.id))]:(tier==='quick'?quick:medium).map(id=>tests.find(t=>t.id===id));
}
