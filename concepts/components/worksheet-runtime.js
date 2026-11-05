const learnerMode=typeof window!=='undefined'&&window.WorksheetMode==='learner';


const names=['Тетрадь','Тёплая мастерская','Мозаика','Чертёжный лист','Альбом'];
// Each picture is an independent line exercise, unrelated to the word illustration.
const artExercises=WorksheetCatalog.pictures;
// GOST 2.304-81 type Б, upright. Exact display outlines: ASCON GOST type B Regular.
const GOST=Object.freeze({type:'Б',angle:90,h:100,c:70,d:10,baseline:140});
const rulingLevels=[GOST.baseline-GOST.h,GOST.baseline-GOST.c,GOST.baseline];
const fontScale=100/1400;
const fromFont=([x,y])=>[30+x*fontScale,140-y*fontScale];
let activeLetter='А',models=DrawingGlyphs['А'].model,lowercase=DrawingGlyphs['а'].model;
let fontOutlines=[DrawingGlyphs['А'].outline,DrawingGlyphs['а'].outline];
const sequenceSources=DrawingGlyphs;
const fontModels=models.map(line=>line.map(([x,y])=>[(x-30)/fontScale,(140-y)/fontScale]));
const oval=lowercase[0],roundedWarmup=[oval],arcWarmup=[oval];
const modelGlyph=new WeakMap(Object.values(DrawingGlyphs).flatMap(g=>[[g.model,g],...(g.demonstration?[[g.demonstration,g]]:[])]));
const demonstrationFor=model=>modelGlyph.get(model)?.demonstration||model;
for(const g of Object.values(DrawingGlyphs))PracticeElement.inkBounds.set(g.model,g.inkBounds);
WorksheetCatalog.setLetterSources(sequenceSources,activeLetter);
function fontOutline(model,extra=''){const glyph=modelGlyph.get(model);return !glyph?'':`<path d="${glyph.outline}" transform="translate(30 140) scale(${fontScale} ${-fontScale})" stroke="${(extra.match(/fill="([^"]+)"/)||[])[1]||'none'}" stroke-width="${boldExpansion()/fontScale}" stroke-linejoin="round" ${extra}/>`}
const svgNS='http://www.w3.org/2000/svg';
const path=line=>line.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ');
function guide(model=models){
 const silhouette=fontOutline(model,'fill="#789581" opacity=".22"')||model.map(line=>`<path d="${path(line)}" fill="none" stroke="#789581" stroke-width="${10+boldExpansion()}" stroke-linecap="round" stroke-linejoin="round" opacity=".22"/>`).join('');
 return model.map(line=>`<path d="${path(line)}" class="corridor"/>`).join('')+silhouette+model.map(line=>`<path d="${path(line)}" class="guide"/>`).join('');
}
const memory=new Map(),inkBaselines=new Map(),pendingInk=new Set();let variant=0,data={},surfaces=[],history=[],activePointer=null,penActive=false,cancelActiveStroke=null,animation=null;let reflowPending=false;
if(typeof WorksheetInput!=='undefined')WorksheetInput.setTouchCancellation(force=>{if(activePointer!==null&&(force||!penActive))cancelActiveStroke?.()});
const message=document.querySelector('#message');
const writingTimes=new WritingTimes(localStorage,()=>{message.textContent='Время письма остаётся в этой вкладке; сохранить его не удалось.'});
let composition;const compositions=new Map();
function editComposition(patch){if(activePointer!==null)return;composition.update(variant,patch);const oldHistory=history;build(variant);history=oldHistory;refresh()}
const worksheetBuild='2026-11-05.50';
const practiceGeometry=size=>({width:size*1.5,height:size*1.8});
const preferenceDefaults=Object.freeze({size:118,bold:100,tolerance:8,rowGap:22,columnGap:12,letterGap:20,leftInset:15,penWidth:3,smoothing:0});
const preferenceLimits={size:[30,160],bold:[100,150],tolerance:[.5,16],rowGap:[0,80],columnGap:[0,60],letterGap:[0,50],leftInset:[0,30],penWidth:[.5,8],smoothing:[0,2]};
function preferenceValue(key,value){if(key==='smoothing')return ['Без сглаживания','Мягкое','Сильнее'][value];return (key==='tolerance'?'±':'')+value+(key==='letterGap'?'% высоты заглавной':key==='leftInset'?'% строки':key==='bold'?'%':' px')}
function validPreferences(value){const out={...preferenceDefaults};if(value&&typeof value==='object')for(const key of Object.keys(out)){const n=value[key];if(typeof n==='number'&&Number.isFinite(n))out[key]=Math.max(preferenceLimits[key][0],Math.min(preferenceLimits[key][1],key==='smoothing'?Math.round(n):n))}return out}
function readPreferences(){
 try{
  const saved=JSON.parse(localStorage.getItem('letter-preferences-v1')||'null'),result=validPreferences(saved);
  // Negative values belonged to a removed nonnumeric slider position.
  // Repair legacy storage once; the live slider always means 0..50 percent.
  if(saved?.letterGap<0)result.letterGap=preferenceDefaults.letterGap;
  if(saved?.letterGapDefaultVersion!==2||saved?.letterGap<0){
   try{localStorage.setItem('letter-preferences-v1',JSON.stringify({...result,letterGapDefaultVersion:2}))}catch{}
  }
  return result;
 }catch{return {...preferenceDefaults}}
}
let preferences=learnerMode?LearnerExperience.initialPreferences():readPreferences();
// Input mode, like size and tolerance, is global across all lessons.
let stylusOnly=true;try{const saved=JSON.parse(localStorage.getItem('letter-input-preferences-v1')||'null');if(typeof saved?.stylusOnly==='boolean')stylusOnly=saved.stylusOnly}catch{}
function applyInputControls(){const control=document.querySelector(learnerMode?'#parent-stylus-only':'#setting-stylusOnly');if(control)control.checked=stylusOnly;document.body.dataset.stylusOnly=String(stylusOnly)}
function configureInput(value){if(activePointer!==null){applyInputControls();return false}stylusOnly=!!value;try{localStorage.setItem('letter-input-preferences-v1',JSON.stringify({stylusOnly}))}catch{message.textContent='Режим ввода остаётся в этой вкладке; сохранить его не удалось.'}applyInputControls();return true}
function closeConfiguration(){const panel=document.querySelector('#configuration-panel');if(panel.close)panel.close();else panel.removeAttribute('open');document.querySelector('#open-settings').setAttribute('aria-expanded','false')}
function openConfiguration(){if(activePointer!==null)return;const panel=document.querySelector('#configuration-panel');if(panel.showModal)panel.showModal();else panel.setAttribute('open','');document.querySelector('#open-settings').setAttribute('aria-expanded','true')}

function boldExpansion(){return (preferences.bold/100-1)*10}
function updatePenControls(){document.body.style.setProperty('--ink-width',`${preferences.penWidth}px`);for(const key of ['penWidth','smoothing']){const control=document.querySelector('#setting-'+key),output=document.querySelector('#value-'+key);if(control)control.value=preferences[key];if(output)output.textContent=preferenceValue(key,preferences[key])}document.querySelector('#pen-preview-path')?.setAttribute('d',path(PenAppearance.smooth(PenAppearance.preview,preferences.smoothing)))}
function applyPreferenceControls(){updatePenControls();const geometry=practiceGeometry(preferences.size);document.body.style.setProperty('--cell-width',`${geometry.width}px`);document.body.style.setProperty('--cell-height',`${geometry.height}px`);document.body.style.setProperty('--corridor-width',`${preferences.tolerance*2}px`);document.body.style.setProperty('--practice-row-gap',`${preferences.rowGap}px`);document.body.style.setProperty('--practice-column-gap',`${preferences.columnGap}px`);document.body.style.setProperty('--practice-left-inset',`${preferences.leftInset}%`);if(learnerMode)DeveloperPanel.sync();else for(const key of Object.keys(preferences)){const control=document.querySelector('#setting-'+key),output=document.querySelector('#value-'+key);if(control)control.value=preferences[key];if(output)output.textContent=preferenceValue(key,preferences[key])}}
let tolerancePreviewPending=false;
function previewTolerance(value){if(activePointer!==null){applyPreferenceControls();return false}preferences={...preferences,tolerance:validPreferences({tolerance:value}).tolerance};tolerancePreviewPending=true;document.body.style.setProperty('--corridor-width',`${preferences.tolerance*2}px`);const control=document.querySelector('#setting-tolerance'),output=document.querySelector('#value-tolerance');if(control)control.value=preferences.tolerance;if(output)output.textContent=preferenceValue('tolerance',preferences.tolerance);if(learnerMode)LearnerExperience.syncLevels();return true}
function commitTolerance(value){if(!tolerancePreviewPending&&value===preferences.tolerance)return true;return configure({tolerance:value})}
const penPreviewPending=new Set();let penPaintFrame=null;
function repaintPen(){for(const surface of surfaces)if(data[surface.id]?.length)surface.render({assess:false})}
function previewPen(key,value){if(activePointer!==null){applyPreferenceControls();return false}preferences={...preferences,[key]:validPreferences({[key]:value})[key]};penPreviewPending.add(key);updatePenControls();if(penPaintFrame===null)penPaintFrame=requestAnimationFrame(()=>{penPaintFrame=null;repaintPen()});return true}
function commitPen(key,value){if(!penPreviewPending.has(key)&&value===preferences[key])return true;return configure({[key]:value})}
function bindPreferenceControl(key,control){const pen=['penWidth','smoothing'].includes(key);control.oninput=event=>key==='tolerance'?previewTolerance(Number(event.target.value)):pen?previewPen(key,Number(event.target.value)):configure({[key]:Number(event.target.value)});if(key==='tolerance'||pen){const commit=value=>pen?commitPen(key,value):commitTolerance(value);control.onchange=event=>commit(Number(event.target.value));control.onblur=()=>commit(Number(control.value))}}

function configure(patch,{persist=true}={}){if(activePointer!==null){applyPreferenceControls();return false}const keys=Object.keys(patch),penOnly=keys.length>0&&keys.every(k=>['penWidth','smoothing'].includes(k)),toleranceOnly=keys.length===1&&Object.hasOwn(patch,'tolerance');if(penPaintFrame!==null){cancelAnimationFrame(penPaintFrame);penPaintFrame=null}penPreviewPending.clear();preferences=validPreferences({...preferences,...patch});tolerancePreviewPending=false;try{if(persist){if(learnerMode)DeveloperPanel.persist(preferences);else localStorage.setItem('letter-preferences-v1',JSON.stringify({...preferences,letterGapDefaultVersion:2}))}}catch{message.textContent='Настройки остаются в этой вкладке; сохранить их не удалось.'}applyPreferenceControls();if(penOnly){repaintPen();return true}if(toleranceOnly&&!surfaces.some(s=>s.needsLayout?.(preferences))){for(const surface of surfaces)if(surface.reframe){surface.reframe(preferences);surface.closeReset()}for(const surface of surfaces)if(surface.reframe)surface.render();if(learnerMode)LearnerExperience.refresh();return true}const oldHistory=history;build(variant);history=oldHistory;refresh();return true}

// Version the entire registry: text can contain glyphs from earlier lessons.
const drawingGeometryRevision=Object.values(DrawingGlyphs).map(g=>g.revision).join('').split('').reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261).toString(16);
function worksheetStorageKey(){return activeLetter==='А'?'letter-worksheet-v3-'+variant:'letter-worksheet-gost-'+activeLetter.codePointAt(0).toString(16)+'-'+drawingGeometryRevision+'-'+variant}
function readInk(key){try{const v=JSON.parse(localStorage.getItem(key)||'{}'),out={};for(const [id,ss] of Object.entries(v||{}))if(Array.isArray(ss))out[id]=ss.filter(stroke=>Array.isArray(stroke)&&stroke.length&&stroke.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<10)));return out}catch{return null}}
function mergeInk(base,local,remote){const out=structuredClone(remote);for(const id of new Set([...Object.keys(base),...Object.keys(local)]))if(JSON.stringify(local[id])!==JSON.stringify(base[id])){if(Object.hasOwn(local,id))out[id]=structuredClone(local[id]);else delete out[id]}return out}
// Carry unchanged fields from the newest available pre-correction book.
// Keep the source book intact; an existing destination (even {}) always wins.
function migrateContourInk(key){
 if(activeLetter==='А'||drawingGeometryRevision!=='4633c1e3'||pendingInk.has(key))return;
 const candidates=[{from:'bf2986c8',changed:['Й']},{from:'1f0081e5',changed:['И','Й']}];let migration,previousKey;
 try{
  if(localStorage.getItem(key)!==null)return;
  for(const entry of candidates){const source='letter-worksheet-gost-'+activeLetter.codePointAt(0).toString(16)+'-'+entry.from+'-'+variant;if(localStorage.getItem(source)!==null){migration=entry;previousKey=source;break}}
 }catch{return}
 if(!migration)return;const previous=readInk(previousKey);if(previous===null)return;
 const codes=new RegExp('(?:^|-)('+migration.changed.map(c=>c.codePointAt(0).toString(16)).join('|')+')(?:-|$)');
 const changed=id=>(migration.changed.includes(activeLetter)&&id.startsWith('gost-file-b90-upper-'))||migration.changed.some(c=>id==='independent-gost-b90-'+c)||(id.includes('sequence-v2-')&&codes.test(id));
 const carried=Object.fromEntries(Object.entries(previous).filter(([id])=>!changed(id)));
 try{if(localStorage.getItem(key)!==null)return;localStorage.setItem(key,JSON.stringify(carried))}
 catch{inkBaselines.set(key,{});memory.set(key,structuredClone(carried));pendingInk.add(key);message.textContent='Перенос проб остаётся в этой вкладке; исходная работа сохранена.'}
 const ids=Object.keys(carried).filter(id=>WritingTimes.eligible(id)&&writingTimes.duration(previousKey,id,carried[id])!==null);
 writingTimes.restore(key,ids,writingTimes.snapshot(previousKey,ids));writingTimes.commit();
}
function load(){
 writingTimes.synchronize();migrateContourInk(worksheetStorageKey());
 const key=worksheetStorageKey(),remote=readInk(key);
 if(remote===null){message.textContent='Сохранение недоступно. Рисунок остаётся в этой вкладке.';return structuredClone(memory.get(key)||{})}
 const restored=pendingInk.has(key)?mergeInk(inkBaselines.get(key)||{},memory.get(key)||{},remote):remote;
 inkBaselines.set(key,structuredClone(remote));memory.set(key,structuredClone(restored));return restored;
}
function save(){
 const key=worksheetStorageKey(),before=data,base=inkBaselines.get(key)||{},remote=readInk(key),current=remote===null?base:remote;
 data=mergeInk(base,data,current);inkBaselines.set(key,structuredClone(current));memory.set(key,structuredClone(data));
 try{localStorage.setItem(key,JSON.stringify(data));inkBaselines.set(key,structuredClone(data));pendingInk.delete(key)}catch{pendingInk.add(key);message.textContent='Не удалось сохранить рисунок. Он остаётся в этой вкладке.'}
 writingTimes.commit();
 // Paint only fields changed by a peer; do not re-evaluate the whole page on
 // every pen lift. Same-field simultaneous edits intentionally use last edit.
 for(const surface of surfaces)if(surface.id&&JSON.stringify(before[surface.id])!==JSON.stringify(data[surface.id]))surface.render();
}
function snapshot(id){const ids=id?[id]:Object.keys(data);history.push({timing:writingTimes.snapshot(worksheetStorageKey(),ids),before:id?(Object.hasOwn(data,id)?{[id]:structuredClone(data[id])}:{}):structuredClone(data),ids:id?[id]:Object.keys(data)});if(history.length>20)history.shift();document.querySelector('#undo').disabled=false}
function undo(){if(activePointer!==null||!history.length)return;const change=history.pop();for(const id of change.ids){if(Object.hasOwn(change.before,id))data[id]=structuredClone(change.before[id]);else delete data[id]}writingTimes.restore(worksheetStorageKey(),change.ids,change.timing||{});save();refresh(change.ids)}
function refresh(ids=null){const changed=ids&&new Set(ids);surfaces.filter(s=>!changed||changed.has(s.id)).forEach(s=>s.render());document.querySelector('#undo').disabled=!history.length;if(learnerMode)LearnerExperience.refresh()}
function reset(id){if(activePointer!==null||!data[id]?.length)return;snapshot(id);data[id]=[];writingTimes.set(worksheetStorageKey(),id,null);save();refresh([id])}
function bindSurfaceAction(button,action){if(typeof WorksheetInput!=='undefined')return WorksheetInput.bindAction(button,action);button.onclick=action;return ()=>{if(button.onclick===action)button.onclick=null}}
function setupSurface(canvas,id,width,height,scoreNode,resetButton,model=models,viewport={x:0,y:0,width,height},correction=null){
 let draft=null,startPoint=null,pointer=null,strokeStarted=null,renderFrame=null,lastAssessment={empty:true,score:0},cssWidth=viewport.width*preferences.size/100,feedbackCache=null,manualJob=null,manualResult=null,manualVersion=0,destroyed=false;
 canvas.setAttribute('data-surface-id',id);
 const ctx=canvas.getContext('2d'),listeners=[],unbindActions=[];const listen=(type,fn)=>{canvas.addEventListener(type,fn);listeners.push([type,fn])};
 function render(options={}){const rect=canvas.getBoundingClientRect(),ratio=devicePixelRatio||1;cssWidth=rect.width||viewport.width*preferences.size/100;canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));ctx.setTransform(canvas.width/viewport.width,0,0,canvas.height/viewport.height,-viewport.x*canvas.width/viewport.width,-viewport.y*canvas.height/viewport.height);ctx.lineWidth=preferences.penWidth*viewport.width/(rect.width||viewport.width*preferences.size/100);ctx.strokeStyle='#335e99';ctx.lineCap='round';ctx.lineJoin='round';for(const raw of [...(data[id]||[]),...(draft?[draft]:[])]){const s=PenAppearance.smooth(raw,preferences.smoothing,raw!==draft);if(!s.length)continue;ctx.beginPath();ctx.moveTo(s[0][0]*width,s[0][1]*height);for(const p of s.slice(1))ctx.lineTo(p[0]*width,p[1]*height);if(s.length===1)ctx.lineTo(s[0][0]*width+.001,s[0][1]*height);ctx.stroke()}if(scoreNode&&options.assess!==false){const cssWidth=rect.width||viewport.width*preferences.size/100,result=evaluate([...(data[id]||[]),...(draft?[draft]:[])],model,preferences.tolerance*viewport.width/Math.max(1,cssWidth),{width,height});lastAssessment=result;scoreNode.textContent=result.empty?'—':result.score+'%';const pending=learnerMode&&(draft!==null||(result.coverage||0)<.9);scoreNode.dataset.band=result.empty?'empty':pending?'pending':result.score>=90?'green':result.score>=80?'orange':'red';scoreNode.setAttribute('aria-label',result.empty?'Проба пуста':`Сходство ${result.score} процентов. Показать сброс пробы`)}if(correction&&scoreNode?.getAttribute('aria-expanded')==='true'&&options.assess!==false)requestCorrection();resetButton.disabled=!(data[id]?.length);if(scoreNode){scoreNode.disabled=!(data[id]?.length);if(scoreNode.disabled)closeReset()}if(learnerMode&&typeof WorksheetDock!=='undefined')WorksheetDock.mirror(canvas,rect)}
 function queueRender(){if(renderFrame===null)renderFrame=requestAnimationFrame(()=>{renderFrame=null;render()})}
 function feedbackState(){const ink=data[id]||null;return {ink,length:ink?.length||0,draft,draftLength:draft?.length||0,tolerance:preferences.tolerance*viewport.width/Math.max(1,cssWidth)}}
 function sameFeedback(a,b){return a&&b&&a.ink===b.ink&&a.length===b.length&&a.draft===b.draft&&a.draftLength===b.draftLength&&a.tolerance===b.tolerance}
 function mirrorFeedback(){if(learnerMode&&typeof WorksheetDock!=='undefined')WorksheetDock.mirror(canvas)}
 function requestCorrection(){
  if(!learnerMode||!correction)return;const key=feedbackState();
  if(sameFeedback(manualResult,key)){if(correction.innerHTML!==manualResult.markup)correction.innerHTML=manualResult.markup;mirrorFeedback();return}
  if(sameFeedback(manualJob,key))return;manualJob?.cancel();const version=++manualVersion;
  manualJob={...key,cancel:FeedbackJobs.request({strokes:key.ink||[],model,width,height,tolerance:key.tolerance},'all',markup=>{
   if(destroyed||version!==manualVersion||scoreNode.getAttribute('aria-expanded')!=='true'||!sameFeedback(key,feedbackState()))return;
   manualJob=null;manualResult={...key,markup};correction.innerHTML=markup;mirrorFeedback();
  })};
 }
 function closeReset(){manualVersion++;manualJob?.cancel();manualJob=null;feedbackCache?.cancel?.();feedbackCache=null;if(correction)correction.innerHTML='';if(scoreNode){resetButton.hidden=true;scoreNode.setAttribute('aria-expanded','false')}mirrorFeedback()}
 if(scoreNode){closeReset();unbindActions.push(bindSurfaceAction(scoreNode,()=>{const show=resetButton.hidden;surfaces.forEach(s=>s.closeReset());resetButton.hidden=!show;scoreNode.setAttribute('aria-expanded',String(show));if(show)requestCorrection();if(learnerMode&&typeof WorksheetDock!=='undefined')WorksheetDock.select(canvas)}))}
 // Read-only paint reads a cache; geometry is computed asynchronously.
 if(learnerMode&&typeof WorksheetDock!=='undefined')WorksheetDock.track(canvas,()=>{
  if(correction?.innerHTML)return correction.innerHTML;
  const key=feedbackState();if(sameFeedback(feedbackCache,key))return feedbackCache.markup;
  const carry=feedbackCache&&feedbackCache.tolerance===key.tolerance&&feedbackCache.ink===key.ink&&key.length>=feedbackCache.length?feedbackCache.markup:'';
  feedbackCache?.cancel?.();const target={...key,markup:carry};feedbackCache=target;if(!key.length&&!key.draftLength)return '';
  target.cancel=FeedbackJobs.request({strokes:[...(key.ink||[]),...(key.draft?[key.draft]:[])],model,width,height,tolerance:key.tolerance},'outside',markup=>{
   if(destroyed||feedbackCache!==target||!sameFeedback(key,feedbackState()))return;target.markup=markup;target.cancel=null;mirrorFeedback();
  });return target.markup;
 });
 const point=e=>{const r=canvas.getBoundingClientRect();return [(viewport.x+(e.clientX-r.left)/r.width*viewport.width)/width,(viewport.y+(e.clientY-r.top)/r.height*viewport.height)/height]};
 listen('pointerdown',e=>{
  if(e.button>0||(e.pointerType==='touch'&&(stylusOnly||e.isPrimary===false)))return;
  // A touch that arrived first must not block the stylus. Discard only its
  // unfinished draft; committed strokes and undo history remain intact.
  if(e.pointerType==='pen'&&activePointer!==null&&!penActive)cancelActiveStroke?.();
  if(activePointer!==null)return;surfaces.forEach(s=>s.closeReset());activePointer=e.pointerId;pointer=e.pointerId;penActive=e.pointerType==='pen';cancelActiveStroke=()=>finish({pointerId:pointer},true);e.preventDefault();canvas.focus?.({preventScroll:true});canvas.setPointerCapture(pointer);startPoint=point(e);draft=[startPoint];strokeStarted=performance.now();if(learnerMode&&typeof WorksheetDock!=='undefined')WorksheetDock.select(canvas);render()
 });
 listen('pointermove',e=>{if(e.pointerId!==pointer||!draft)return;const coalesced=e.getCoalescedEvents?.(),batch=coalesced?.length?coalesced:[e];for(const sample of batch){const p=point(sample);if(Math.hypot(p[0]-draft.at(-1)[0],p[1]-draft.at(-1)[1])>.0005)draft.push(p)}queueRender();});
 function finish(e,cancel=false){if(e.pointerId!==pointer)return;if(!cancel&&draft?.length){if(Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)){const end=point(e);if(Math.hypot(end[0]-draft.at(-1)[0],end[1]-draft.at(-1)[1])>.0005)draft.push(end)};snapshot(id);writingTimes.append(worksheetStorageKey(),id,data[id]||[],[...(data[id]||[]),draft],Math.max(0,performance.now()-strokeStarted));(data[id]||=[]).push(draft)}draft=null;strokeStarted=null;pointer=null;activePointer=null;penActive=false;cancelActiveStroke=null;render();save();if(learnerMode)LearnerExperience.refresh();if(typeof WorksheetDock!=='undefined')WorksheetDock.release();if(reflowPending){reflowPending=false;requestAnimationFrame(reflowPage)}}
 listen('pointerup',e=>finish(e));listen('pointercancel',e=>finish(e,true));listen('lostpointercapture',e=>finish(e,true));
 unbindActions.push(bindSurfaceAction(resetButton,()=>{reset(id);if(scoreNode)scoreNode.focus?.();closeReset()}));const observer=new ResizeObserver(render);observer.observe(canvas);return {id,label:canvas.getAttribute?.('aria-label')||id,assessment:()=>lastAssessment,render,closeReset,destroy(){destroyed=true;for(const unbind of unbindActions)unbind();manualVersion++;manualJob?.cancel();feedbackCache?.cancel?.();if(renderFrame!==null)cancelAnimationFrame(renderFrame);observer.disconnect();for(const [type,fn] of listeners)canvas.removeEventListener(type,fn)}};
}
function build(index,letter=activeLetter){if(activePointer!==null)return;stopDemo();surfaces.forEach(s=>s.destroy());surfaces=[];const changed=activeLetter!==letter;if(learnerMode&&changed)LearnerExperience.independent=false;activeLetter=letter;models=sequenceSources[letter].model;lowercase=sequenceSources[letter.toLowerCase()].model;fontOutlines=[sequenceSources[letter].outline,sequenceSources[letter.toLowerCase()].outline];WorksheetCatalog.setLetterSources(sequenceSources,letter);
 if(!compositions.has(letter))compositions.set(letter,new (learnerMode?LearnerComposition:PageComposition)({letter,onSaveError:()=>{message.textContent='Состав страницы остаётся в этой вкладке; сохранить его не удалось.'}}));composition=compositions.get(letter);if(changed)composition.editorSignature=null;
 variant=index;history=[];data=load();
 document.title=letter+' '+letter.toLowerCase()+' · чертёжные буквы';document.querySelector('#demo').setAttribute('aria-label','Показ написания '+letter);document.querySelector('#demo-lower').setAttribute('aria-label','Показ написания '+letter.toLowerCase());
 document.querySelectorAll('.letters button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.letter===letter));
 try{localStorage.setItem('drawing-active-letter-v1',letter)}catch{}
 const reference=LetterReferences[letter];document.querySelector('#reference').src=reference.src;document.querySelector('#reference').alt=reference.word;document.querySelector('#reference-word').innerHTML=[...reference.word].map(c=>c.toUpperCase()===letter?'<b>'+c+'</b>':c).join('');
 if(changed){[...document.querySelectorAll('.letters button')].find(b=>b.dataset.letter===letter)?.scrollIntoView?.({block:'nearest',inline:'center'});if(typeof window!=='undefined')window.scrollTo({top:0})}
 document.body.dataset.variant=index;document.querySelectorAll('.variants button').forEach((b,i)=>b.setAttribute('aria-pressed',i===index));const root=document.querySelector('#practice');root.replaceChildren();const rows=2,columns=learnerMode?3:5;
 const layout=composition.get(index);
 const core=learnerMode?LearnerExperience.core(layout):null,additional=learnerMode?LearnerExperience.additional():null;
 if(!learnerMode||DeveloperPanel.visible)composition.renderEditor({pictureRoot:document.querySelector('#picture-picker'),elementRoot:document.querySelector('#element-picker'),sequenceRoot:document.querySelector('#sequence-picker'),layout,onChange:editComposition});
 const addCell=(row,id,model,label)=>{const cell=PracticeElement.createCell({row,id,model,label,guide:learnerMode&&id.startsWith('independent-')?model=>PracticeElement.anchorMarkup(model,preferences):guide,setupSurface,preferences,rulingLevels});surfaces.push(cell.surface);return cell};
 const mountElements=(character,stage)=>{for(const block of layout.elements){const def=WorksheetCatalog.elements.find(d=>d.id===block.component);if(def.letters.includes(character)){const optional=learnerMode&&!core.elements.has(block.component),start=surfaces.length,row=PracticeElement.mount({root:optional?additional.root:root,definition:def,repeats:block.repeats,addCell});row.dataset.lessonStage=stage;for(const surface of surfaces.slice(start))surface.additional=optional}}};
 const mountLetters=(character,model,stage,prefix)=>{const row=document.createElement('div');row.className='row';row.dataset.lessonStage=stage;for(let c=0;c<columns;c++)addCell(row,`gost-file-b90-${prefix}-${c}`,model,`Буква ${character}, проба ${c+1}`);root.append(row)};
 const mountTexts=stage=>{for(const configuration of layout.textRows)if(configuration.enabled&&!configuration.deferred&&configuration.stage===stage){const optional=learnerMode&&!core.texts.has(configuration.id);surfaces.push(...LetterSequence.mount({root:optional?additional.root:root,availableWidth:root.clientWidth,configuration,sources:sequenceSources,guide,fontOutline,setupSurface,preferences,rulingLevels}).map(surface=>({...surface,additional:optional})))}};
 mountElements(activeLetter.toLowerCase(),'lower-elements');
 mountLetters(activeLetter.toLowerCase(),lowercase,'lower-letter','lower');
 mountTexts('lower-practice');
 mountElements(activeLetter,'upper-elements');
 mountLetters(activeLetter,models,'upper-letter','upper');
 mountTexts('upper-practice');mountTexts('consolidation');mountTexts('review');
 if(additional?.root.children.length)root.append(additional.container);
 if(learnerMode)LearnerExperience.mountIndependent(root,addCell);
 surfaces.push(PictureExercise.mount({definition:WorksheetCatalog.pictures.find(d=>d.id===layout.picture),svg:document.querySelector('#art-guide'),canvas:document.querySelector('#art-canvas'),resetButton:document.querySelector('#art-reset'),setupSurface}));refresh();playDemo();if(learnerMode)LearnerExperience.mounted(changed);if(typeof WorksheetDock!=='undefined')WorksheetDock.onBuild(letter)
}
function stopDemo(){if(animation!==null)cancelAnimationFrame(animation);animation=null}
function demoClock(model,{speed=84,startDelay=400,liftDelay=420,endDelay=1000}={}){
 let time=startDelay;
 const segments=model.map((points,i)=>{const distances=[0];for(let j=1;j<points.length;j++)distances.push(distances.at(-1)+Math.hypot(points[j][0]-points[j-1][0],points[j][1]-points[j-1][1]));const length=distances.at(-1),start=time,end=start+Math.max(120,length/speed*1000);const next=model[i+1]?.[0],last=points.at(-1);time=end+(next&&Math.hypot(last[0]-next[0],last[1]-next[1])>.01?liftDelay:0);return {points,distances,length,start,end}});
 const duration=time+endDelay;
 return {segments,duration,at(elapsed,loop=true){const t=loop?Math.max(0,elapsed)%duration:Math.max(0,Math.min(duration,elapsed)),progress=segments.map(s=>Math.max(0,Math.min(1,(t-s.start)/(s.end-s.start))));let pen=null;const index=segments.findIndex(s=>t<s.end);if(index>=0){const s=segments[index];if(t<s.start){if(!index)pen=s.points[0]}else{const travel=s.length*progress[index];let j=1;while(j<s.distances.length-1&&s.distances[j]<travel)j++;const a=s.points[j-1],b=s.points[j],q=(travel-s.distances[j-1])/(s.distances[j]-s.distances[j-1]||1);pen=[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q]}}return {progress,pen}}}
}
// Both forms share one timeline: upper -> 500 ms -> lower -> end hold -> repeat.
function sequenceClock(upperModel=demonstrationFor(models),lowerModel=demonstrationFor(lowercase)){
 const upper=demoClock(upperModel,{startDelay:0,endDelay:0}),lower=demoClock(lowerModel,{startDelay:0,endDelay:0});
 const upperEnd=upper.duration,lowerStart=upperEnd+500,lowerEnd=lowerStart+lower.duration,duration=lowerEnd+1000;
 const empty=model=>({progress:model.map(()=>0),pen:null}),complete=model=>({progress:model.map(()=>1),pen:null});
 return {upperEnd,lowerStart,lowerEnd,duration,at(elapsed){const t=Math.max(0,elapsed)%duration;return {upper:t<upperEnd?upper.at(t,false):complete(upperModel),lower:t<lowerStart?empty(lowerModel):t<lowerEnd?lower.at(t-lowerStart,false):complete(lowerModel)}}};
}
// Mask and pen use worksheet coordinates. The font transform stays inside the masked group.
// Keep the mask for every frame, including completion: no final "fill everything" shortcut.
const revealLength=line=>line.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-line[i][0],p[1]-line[i][1]),0);
// A wide brush reveals future branches at joins. Assign outline regions to
// the nearest sample of the ordered route, retaining a continuous stroke core.
// Activate a region when the pen enters its half-step boundary, including endpoints.
const revealRegionsCache=new WeakMap();
function revealRegions(model){
 if(revealRegionsCache.has(model))return revealRegionsCache.get(model);
 const sites=[];
 model.forEach((line,stroke)=>{const length=revealLength(line),count=Math.ceil(length),distances=[0];for(let j=1;j<line.length;j++)distances.push(distances.at(-1)+Math.hypot(line[j][0]-line[j-1][0],line[j][1]-line[j-1][1]));let segment=1;for(let k=0;k<=count;k++){const travel=length*k/count;while(segment<line.length-1&&distances[segment]<travel)segment++;const a=line[segment-1],b=line[segment],t=(travel-distances[segment-1])/(distances[segment]-distances[segment-1]||1),point={x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,stroke,progress:Math.max(0,(k-.5)/count)};if(!sites.some(q=>Math.hypot(q.x-point.x,q.y-point.y)<.025))sites.push(point)}});
 function clip(poly,nx,ny,limit){const out=[];for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],da=a[0]*nx+a[1]*ny-limit,db=b[0]*nx+b[1]*ny-limit;if(da<=0)out.push(a);if(da*db<0){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}return out}
 const regions=sites.map(site=>{let poly=[[0,0],[150,0],[150,180],[0,180]];const others=sites.filter(q=>q!==site).sort((a,b)=>(a.x-site.x)**2+(a.y-site.y)**2-(b.x-site.x)**2-(b.y-site.y)**2);for(const q of others){poly=clip(poly,q.x-site.x,q.y-site.y,(q.x*q.x+q.y*q.y-site.x*site.x-site.y*site.y)/2);if(!poly.length)break}return {...site,d:path(poly)+'Z'}});
 revealRegionsCache.set(model,regions);return regions;
}
function revealMarkup(model,maskId,progress=model.map(()=>0)){
 const regions=revealRegions(model).map(r=>`<path data-demo-region="${r.stroke}" data-reveal-at="${r.progress}" d="${r.d}" fill="white" stroke="white" stroke-width=".12" opacity="${progress[r.stroke]>0&&progress[r.stroke]>=r.progress?1:0}"/>`).join('');
 return fontOutline(model,'fill="#c7d4c8"')+`<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="150" height="180">${regions}${model.map((line,i)=>`<path data-line="${i}" d="${path(line)}" fill="none" stroke="white" stroke-width="${10+boldExpansion()}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${revealLength(line)}" stroke-dashoffset="${revealLength(line)*(1-progress[i])}" opacity="${progress[i]>0?1:0}"/>`).join('')}</mask></defs><g mask="url(#${maskId})">`+fontOutline(model,'fill="var(--accent)"')+'</g>';
}
function renderWritingSchemes(){
 if(!learnerMode||!document.querySelector('#sample-panel')?.open)return;
 for(const [suffix,character] of [['upper',activeLetter],['lower',activeLetter.toLowerCase()]]){
  const glyph=DrawingGlyphs[character],model=demonstrationFor(glyph.model),svg=document.querySelector('#scheme-'+suffix);
  svg.innerHTML=WritingScheme.markup(model,fontOutline(model,'fill="#dbe5dc"'));
  svg.setAttribute('aria-label','Порядок написания '+character+': '+(glyph.instruction?.steps||model.map((_,i)=>'Движение '+(i+1))).map((step,i)=>(i+1)+'. '+step).join('; '));
 }
}
function playDemo(){stopDemo();renderWritingSchemes();const demos=[['#demo',demonstrationFor(models)],['#demo-lower',demonstrationFor(lowercase)],...(learnerMode&&typeof WorksheetDock!=='undefined'&&WorksheetDock.ready?[['#dock-demo-upper',demonstrationFor(models)],['#dock-demo-lower',demonstrationFor(lowercase)]]:[]),...(learnerMode&&document.querySelector('#sample-panel')?.open?[['#sample-upper',demonstrationFor(models)],['#sample-lower',demonstrationFor(lowercase)]]:[])].map(([selector,model])=>{const svg=document.querySelector(selector);const maskId='font-mask-'+selector.slice(1);svg.innerHTML=revealMarkup(model,maskId)+`<g id="pencil"><circle r="7" fill="#fff9e6" stroke="#b88b3f"/><g transform="rotate(30)"><path d="M-4 -10V-37Q0 -42 4 -37V-10L0 0Z" fill="#e7b24f" stroke="#936b34" stroke-width="1"/><path d="M-4 -10H4L0 0Z" fill="#fff0c9"/><path d="M-1.5 -4L0 0L1.5 -4" fill="#354b3c"/></g></g>`;return {selector,lines:model.map((line,i)=>({node:svg.querySelector(`[data-line="${i}"]`),length:revealLength(line)})),pencil:svg.querySelector('#pencil'),regions:[...svg.querySelectorAll('[data-demo-region]')].map(node=>({node,stroke:Number(node.dataset.demoRegion),at:Number(node.dataset.revealAt),visible:null}))}});
 const start=performance.now(),clock=sequenceClock();function tick(now){const pair=clock.at(now-start);demos.forEach(({selector,lines,pencil,regions},index)=>{if(selector.startsWith('#dock-')&&(document.querySelector('#writing-dock').hidden||WorksheetDock.selected))return;if((selector==='#demo'||selector==='#demo-lower')&&typeof WorksheetDock!=='undefined'&&(WorksheetDock.compact||WorksheetDock.selected))return;const state=index%2===0?pair.upper:pair.lower;for(const r of regions){const visible=state.progress[r.stroke]>0&&state.progress[r.stroke]>=r.at;if(visible!==r.visible){r.node.setAttribute('opacity',visible?'1':'0');r.visible=visible}}lines.forEach(({node,length},i)=>{node.setAttribute('stroke-dashoffset',length*(1-state.progress[i]));node.setAttribute('opacity',state.progress[i]>0?'1':'0')});pencil.setAttribute('visibility',state.pen?'visible':'hidden');if(state.pen)pencil.setAttribute('transform',`translate(${state.pen[0]} ${state.pen[1]})`)});animation=requestAnimationFrame(tick)}tick(start)
}
// Geometric tracing similarity, not OCR or a calibrated handwriting grade.
// Sample physical strokes independently: lifting the pen never fills the gap.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pathLength=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);
const clamp=value=>Math.max(0,Math.min(1,value));
function samples(strokes,budget=768){
 const lengths=strokes.map(pathLength),total=lengths.reduce((a,b)=>a+b,0),step=Math.max(1,total/Math.max(1,budget-strokes.length));
 const result=[];
 for(let k=0;k<strokes.length;k++){
  const points=strokes[k];if(!points.length)continue;
  result.push(points[0]);let carry=step;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],length=distance(a,b);
   if(!length)continue;
   for(let at=carry;at<=length;at+=step){const t=at/length;result.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
   carry=((carry-length)%step+step)%step;if(carry<1e-8)carry=step;
  }
  if(lengths[k]>0)result.push(points.at(-1));
 }
 return {points:result,length:total};
}
function nearest(points,other){return points.map(p=>other.reduce((best,q)=>Math.min(best,distance(p,q)),Infinity));}
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
function measureStrokeQuality(actualStrokes,expectedStrokes,{tolerance=4.5}={}){
 const actual=samples(actualStrokes),expected=samples(expectedStrokes);
 if(!actual.points.length||!expected.points.length)return {score:0,coverage:0,precision:0,lengthRatio:0,error:0};
 const missing=nearest(expected.points,actual.points),extra=nearest(actual.points,expected.points);
 const coverage=mean(missing.map(d=>d<=tolerance?1:0)),precision=mean(extra.map(d=>d<=tolerance?1:0));
 const completeness=coverage+precision?2*coverage*precision/(coverage+precision):0;
 const fidelity=Math.sqrt(mean(missing.map(d=>Math.exp(-(Math.max(0,d-.7)**2)/(2*tolerance**2))))*mean(extra.map(d=>Math.exp(-(Math.max(0,d-.7)**2)/(2*tolerance**2)))));
 const ratio=expected.length?actual.length/expected.length:0;
 const enoughInk=expected.length<3?1:clamp(ratio/.9),excessInk=ratio>1.35?clamp(1.35/ratio):1;
 return {score:Math.round(100*completeness*fidelity*enoughInk*excessInk),coverage,precision,lengthRatio:ratio,error:(mean(missing)+mean(extra))/2};
}


function evaluate(strokes,model=models,tolerance=preferences.tolerance,{width=150,height=180}={}){
 if(!strokes.length)return {empty:true,score:0};
 const actual=strokes.map(s=>s.map(([x,y])=>({x:x*width,y:y*height}))),expected=model.map(s=>s.map(([x,y])=>({x,y})));
 // One geometric assessment for primitives, single letters and arbitrary text.
 // Pen direction, lifts, stroke order and letter-specific rules do not enter it.
 return {empty:false,...measureStrokeQuality(actual,expected,{tolerance})};
}

if(!learnerMode){
LetterCurriculum.order.filter(letter=>sequenceSources[letter]).forEach(letter=>{const b=document.createElement('button');b.textContent=letter+' '+letter.toLowerCase();b.dataset.letter=letter;b.onclick=()=>{build(variant,letter);closeConfiguration()};document.querySelector('.letters').append(b)});
names.forEach((name,i)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>build(i);document.querySelector('.variants').append(b)});
document.querySelector('#clear-all').onclick=()=>{if(activePointer!==null||!Object.values(data).some(s=>s.length))return;snapshot();writingTimes.restore(worksheetStorageKey(),Object.keys(data),{});data={};save();refresh()};document.querySelector('#undo').onclick=undo;
for(const key of Object.keys(preferenceDefaults)){const control=document.querySelector('#setting-'+key);if(control)bindPreferenceControl(key,control)}
document.querySelector('#settings-defaults').onclick=()=>{configure(preferenceDefaults);configureInput(true)};
document.querySelector('#open-settings').onclick=openConfiguration;
document.querySelector('#close-settings').onclick=closeConfiguration;
document.querySelector('#configuration-panel').addEventListener('close',()=>document.querySelector('#open-settings').setAttribute('aria-expanded','false'));
document.querySelector('#setting-stylusOnly').onchange=e=>configureInput(e.target.checked);
}
if(learnerMode)document.querySelector('#undo').onclick=undo;
applyInputControls();
applyPreferenceControls();
// Existing v1 drawings remain available in previous-v1.html under their original keys.
let initialLetter='А';try{const savedLetter=localStorage.getItem('drawing-active-letter-v1');if(LetterCurriculum.order.includes(savedLetter)&&sequenceSources[savedLetter])initialLetter=savedLetter}catch{}
if(learnerMode){LearnerExperience.readUI();if(typeof WorksheetDock!=='undefined')WorksheetDock.mount({isWriting:()=>activePointer!==null})}
build(learnerMode?DeveloperPanel.initialVariant():0,initialLetter);
function reflowPage(){const previousHistory=history;build(variant);history=previousHistory;refresh()}
let lastPracticeWidth=document.querySelector('#practice').clientWidth||0;
const practiceResize=new ResizeObserver(()=>{const width=document.querySelector('#practice').clientWidth;if(!width||Math.abs(width-lastPracticeWidth)<2)return;lastPracticeWidth=width;if(activePointer!==null)reflowPending=true;else requestAnimationFrame(reflowPage)});practiceResize.observe(document.querySelector('#practice'));
