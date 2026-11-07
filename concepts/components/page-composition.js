class PageComposition{
 constructor({letter='А',key=null,onSaveError=()=>{}}={}){this.letter=letter;this.key=key||(letter==='А'?'letter-page-composition-v1':'letter-page-composition-v2-'+letter.codePointAt(0).toString(16));this.onSaveError=onSaveError;this.state={};this.canMigrate=true;try{const raw=localStorage.getItem(this.key),parsed=JSON.parse(raw||'{}');if(parsed?.version===1&&parsed.variants&&typeof parsed.variants==='object'){
  if(Object.values(parsed.variants).some(v=>v?.lessonPlanVersion!==LetterCurriculum.planVersion))try{const modern=Object.values(parsed.variants).some(v=>v?.lessonPlanVersion>=2),archive=this.key+(modern?'-before-lesson-plan-'+LetterCurriculum.planVersion:'-before-propisi-2019');if(!localStorage.getItem(archive))localStorage.setItem(archive,raw)}catch{this.canMigrate=false;this.onSaveError()}
  for(let i=0;i<5;i++)if(parsed.variants[i])this.state[i]=this.validate(parsed.variants[i],i)
 }}catch{} }
 defaults(index){const examples=LetterCurriculum.lesson(this.letter).examples,textRows=[],used=new Set();
  const add=(text,repeats,stage)=>{if(!this.normalizeText(text)||used.has(text))return;used.add(text);textRows.push({id:textRows.length?'row-'+textRows.length:'primary',text,repeats,enabled:true,stage,deferred:false})};
  add(LetterCurriculum.firstPractice(this.letter),3,'lower-practice');
  examples.words.slice(0,2).forEach(text=>add(text,2,'lower-practice'));
  examples.capitals.slice(0,2).forEach(text=>add(text,1,'upper-practice'));
  examples.sentences.slice(0,1).forEach(text=>add(text,1,'consolidation'));
  examples.review.slice(0,1).forEach(text=>add(text,1,'review'));
  return {lessonPlanVersion:LetterCurriculum.planVersion,textRowsCustomized:false,picture:LessonPictures.forLesson(this.letter,index),pictureSelection:'lesson-default',picturePolicyVersion:LessonPictures.version,elementsVersion:2,sequence:{text:textRows[0].text,repeats:3},textRows,nextTextRowId:textRows.length,elements:WorksheetCatalog.elementsFor().map(d=>({component:d.id,repeats:4}))}}

 validate(value,index){
  // v1 offered unrelated shapes. Migrate matching parts, retain deselections,
  // and add the two new lowercase parts. Old ink keeps its old storage IDs.
  if(value?.elementsVersion!==2&&Array.isArray(value?.elements)){
   const aliases={horizontal:'gost-b90-A-bar','diagonal-right':'gost-b90-A-rise','diagonal-left':'gost-b90-A-fall'};
   const elements=value.elements.filter(e=>aliases[e?.component]).map(e=>({...e,component:aliases[e.component]}));
   if(value.elements.length)elements.push({component:'gost-b90-a-body',repeats:4},{component:'gost-b90-a-stem',repeats:4});
   value={...value,elementsVersion:2,elements};
  }
  // Merge old fragment selections into their complete route. Keep exclusions
  // when every fragment was disabled, and retain old ink under the old IDs.
  if(Array.isArray(value?.elements))value={...value,elements:value.elements.map(e=>{
   const merged=WorksheetCatalog.elementsFor().find(d=>d.legacyIds?.includes(e?.component));
   return merged?{...e,component:merged.id}:e;
  })};
  const defaults=this.defaults(index),knownPictures=new Set(WorksheetCatalog.pictures.map(p=>p.id)),knownElements=new Set(WorksheetCatalog.elementsFor().map(p=>p.id));const seen=new Set();const elements=Array.isArray(value?.elements)?value.elements.filter(e=>e&&knownElements.has(e.component)&&!seen.has(e.component)&&seen.add(e.component)).map(e=>({component:e.component,repeats:[3,4,5].includes(e.repeats)?e.repeats:4})):defaults.elements;const rowIds=new Set();
  // Old builds used the style index as their automatic picture for every letter.
  // Preserve explicit nondefault choices; version all future manual choices.
  const legacyDefault=WorksheetCatalog.pictures[index]?.id;
  const customPicture=knownPictures.has(value?.picture)&&(value.pictureSelection==='custom'||(!value.pictureSelection&&value.picture!==legacyDefault));
  let textRowsCustomized=value?.textRowsCustomized===true;
  let rawRows;
  if(Array.isArray(value?.textRows)){
   const migrateDefault=this.canMigrate!==false&&value.textRowsCustomized!==true&&value.lessonPlanVersion!==LetterCurriculum.planVersion&&LessonMigration.isPreviousDefault(this.letter,value.textRows,{version:value.lessonPlanVersion,defaults:defaults.textRows});
   rawRows=migrateDefault?defaults.textRows:value.textRows;
   if(value.lessonPlanVersion!==LetterCurriculum.planVersion)textRowsCustomized=!migrateDefault;
  }else if(value&&Object.hasOwn(value,'sequence')){rawRows=[{id:'primary',text:value.sequence?.text||LetterCurriculum.firstPractice(this.letter),repeats:value.sequence?.repeats||3,enabled:value.sequence!==null}];textRowsCustomized=true}
  else rawRows=defaults.textRows;
  const textRows=rawRows.slice(0,12).filter(r=>r&&typeof r.id==='string'&&/^(primary|row-[1-9][0-9]{0,8})$/.test(r.id)&&!rowIds.has(r.id)&&rowIds.add(r.id)&&this.storedText(r.text)).map(r=>{
   const text=this.storedText(r.text),row={id:r.id,text,repeats:[1,2,3,4,5].includes(r.repeats)?r.repeats:1,enabled:r.enabled!==false,stage:r.stage};
   return {...row,stage:LetterCurriculum.textStage(row),deferred:!this.normalizeText(text)};
  });
  const first=textRows[0],sequence=first?.enabled&&!first.deferred?{text:first.text,repeats:first.repeats}:null;
  const nextTextRowId=Math.max(Number.isSafeInteger(value?.nextTextRowId)&&value.nextTextRowId>0&&value.nextTextRowId<1000000000?value.nextTextRowId:1,1,...textRows.map(r=>r.id.startsWith('row-')?Number(r.id.slice(4))+1:1));
  return {lessonPlanVersion:LetterCurriculum.planVersion,textRowsCustomized,elementsVersion:2,sequence,textRows,nextTextRowId,picture:customPicture?value.picture:defaults.picture,pictureSelection:customPicture?'custom':'lesson-default',picturePolicyVersion:LessonPictures.version,elements}}

 storedText(text){if(typeof text!=='string')return null;const value=text.replace(/A/g,'А').replace(/a/g,'а').replace(/\s+/g,' ').trim();return value.length>0&&value.length<=LetterSequence.maxTextLength&&[...value].every(c=>c===' '||DrawingGlyphs[c])?value:null}
 normalizeText(text){return LetterSequence.normalizeText(text,{lesson:this.letter,supported:Object.keys(DrawingGlyphs).join('')})}
 get(index){return structuredClone(this.state[index]||this.defaults(index))}
 update(index,patch){const previous=this.get(index);
  if((Object.hasOwn(patch,'textRows')||Object.hasOwn(patch,'sequence'))&&!Object.hasOwn(patch,'textRowsCustomized'))patch={...patch,textRowsCustomized:true};
  if(Object.hasOwn(patch,'picture')&&!Object.hasOwn(patch,'pictureSelection'))patch={...patch,pictureSelection:'custom'};
  if(Object.hasOwn(patch,'sequence')&&!Object.hasOwn(patch,'textRows')){const rows=previous.textRows.map(r=>({...r}));if(rows.length)rows[0]={...rows[0],...(patch.sequence||{}),enabled:!!patch.sequence};else if(patch.sequence)rows.push({id:'primary',...patch.sequence,enabled:true});patch={...patch,textRows:rows}}
  this.state[index]=this.validate({...previous,...patch},index);try{localStorage.setItem(this.key,JSON.stringify({version:1,variants:this.state}))}catch{this.onSaveError()}return this.get(index)}
 renderEditor({pictureRoot,elementRoot,sequenceRoot,layout,onChange}){
  const signature=JSON.stringify(layout);if(this.editorSignature===signature&&this.pictureRoot===pictureRoot&&this.elementRoot===elementRoot)return;this.editorSignature=signature;this.pictureRoot=pictureRoot;this.elementRoot=elementRoot;pictureRoot.replaceChildren();elementRoot.replaceChildren();sequenceRoot.replaceChildren();
  const lessonButton=document.querySelector('#lesson-default');lessonButton.disabled=!layout.textRowsCustomized;lessonButton.onclick=()=>onChange({textRows:this.defaults(0).textRows,textRowsCustomized:false,nextTextRowId:Math.max(layout.nextTextRowId,this.defaults(0).nextTextRowId)});
  const defaultButton=document.querySelector('#picture-default');defaultButton.disabled=layout.pictureSelection==='lesson-default';defaultButton.onclick=()=>onChange({pictureSelection:'lesson-default'});
  for(const picture of WorksheetCatalog.pictures){const button=document.createElement('button');button.type='button';button.className='picture-choice';button.setAttribute('aria-label',picture.name);button.setAttribute('aria-pressed',String(picture.id===layout.picture));button.innerHTML=`<svg viewBox="0 0 200 200" aria-hidden="true">${WorksheetCatalog.renderPicture(picture)}</svg><span>${picture.name}</span>`;button.onclick=()=>onChange({picture:picture.id});pictureRoot.append(button)}
  for(const [index,rowData] of layout.textRows.entries()){
   const row=document.createElement('div');row.className='element-option text-row-option';row.dataset.textRowId=rowData.id;
   const enabled=document.createElement('input');enabled.type='checkbox';enabled.id='enable-text-'+rowData.id;enabled.checked=rowData.enabled;
   const label=document.createElement('label');label.htmlFor=enabled.id;label.textContent='Строка '+(index+1);
   const text=document.createElement('input');text.type='text';text.maxLength=LetterSequence.maxTextLength;text.value=rowData.text;text.disabled=!rowData.enabled;text.setAttribute('aria-label','Текст строки '+(index+1));text.setAttribute('autocapitalize','off');text.setAttribute('autocomplete','off');text.setAttribute('spellcheck','false');
   const repeats=document.createElement('select');repeats.setAttribute('aria-label','Повторы строки '+(index+1));for(const n of [1,2,3,4,5]){const option=document.createElement('option');option.value=n;option.textContent=n+' '+(n===1?'раз':n===5?'раз':'раза');repeats.append(option)}repeats.value=rowData.repeats;repeats.disabled=!rowData.enabled;
   const remove=document.createElement('button');remove.type='button';remove.textContent='Удалить';remove.setAttribute('aria-label','Удалить строку '+(index+1));
   const error=document.createElement('span');error.className='text-row-error';error.setAttribute('role','status');if(rowData.deferred){error.textContent='Есть ещё не введённые буквы. Строка сохранена в редакторе.';text.setAttribute('aria-invalid','true')}
   const patchRow=patch=>onChange({textRows:layout.textRows.map(r=>r.id===rowData.id?{...r,...patch}:r)});
   enabled.onchange=()=>patchRow({enabled:enabled.checked});repeats.onchange=()=>patchRow({repeats:Number(repeats.value)});
   const commit=()=>{const normalized=this.normalizeText(text.value);if(!normalized){error.textContent='Используйте уже введённые буквы; до '+LetterSequence.maxTextLength+' символов.';text.setAttribute('aria-invalid','true');return}text.removeAttribute('aria-invalid');error.textContent='';patchRow({text:normalized})};
   text.onchange=commit;text.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commit()}};
   remove.onclick=()=>onChange({textRows:layout.textRows.filter(r=>r.id!==rowData.id)});
   for(const control of [enabled,label,text,repeats,remove,error])row.append(control);sequenceRoot.append(row);
  }
  const add=document.createElement('button');add.type='button';add.className='add-text-row';add.textContent='Добавить строку';add.disabled=layout.textRows.length>=12;add.onclick=()=>onChange({textRows:[...layout.textRows,{id:'row-'+layout.nextTextRowId,text:LetterCurriculum.firstPractice(this.letter),repeats:1,enabled:true}],nextTextRowId:layout.nextTextRowId+1});sequenceRoot.append(add);const hint=document.createElement('small');hint.className='text-row-hint';hint.textContent='Введены: '+LetterCurriculum.knownLetters(this.letter).join(' ')+' · до '+LetterSequence.maxTextLength+' символов.';sequenceRoot.append(hint);

  for(const definition of WorksheetCatalog.elementsFor()){const block=layout.elements.find(e=>e.component===definition.id),row=document.createElement('div');row.className='element-option';const check=document.createElement('input');check.type='checkbox';check.id='enable-'+definition.id;check.checked=!!block;const preview=document.createElement('span');const path=line=>line.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ');preview.innerHTML=`<svg viewBox="0 0 150 180" aria-hidden="true">${definition.model.map(line=>`<path d="${path(line)}" fill="none" stroke="#789581" stroke-width="8" stroke-linecap="round"/>`).join('')}</svg>`;const label=document.createElement('label');label.htmlFor=check.id;label.textContent=definition.name;const count=document.createElement('select');count.setAttribute('aria-label',`Количество проб: ${definition.name}`);for(const n of [3,4,5]){const option=document.createElement('option');option.value=n;option.textContent=String(n);count.append(option)}count.value=block?.repeats||4;count.disabled=!block;
   check.onchange=()=>{const elements=layout.elements.filter(e=>e.component!==definition.id);if(check.checked)elements.push({component:definition.id,repeats:Number(count.value)});onChange({elements})};count.onchange=()=>onChange({elements:layout.elements.map(e=>e.component===definition.id?{...e,repeats:Number(count.value)}:e)});row.append(check);row.append(preview);row.append(label);row.append(count);elementRoot.append(row)
  }
 }
}
