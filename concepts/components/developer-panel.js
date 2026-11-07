// Explicit author tools for the current Wi-Fi prototype, separate from practice.
class LearnerComposition extends PageComposition {
 constructor(options){super({...options,key:'gost-learner-composition-v1-'+options.letter.codePointAt(0).toString(16)})}
 defaults(index){return LearnerExperience.layout(super.defaults(index),this.letter)}
 validate(value,index){
  // Migrate only an exact old automatic text set. Preserve explicit author rows,
  // part exclusions, picture choices, and the original composition as an archive.
  const old=LearnerExperience.legacyLayout(super.defaults(index));
  if(this.canMigrate!==false&&value?.textRowsCustomized===false&&JSON.stringify(value.textRows)===JSON.stringify(old.textRows)){
   try{const raw=localStorage.getItem(this.key),archive=this.key+'-before-short-practice-v2';if(raw&&!localStorage.getItem(archive))localStorage.setItem(archive,raw)}catch{this.onSaveError()}
   const next=this.defaults(index);value={...value,textRows:next.textRows,sequence:next.sequence,nextTextRowId:Math.max(value.nextTextRowId||1,next.nextTextRowId)};
  }
  return super.validate(value,index);
 }
}
const DeveloperPanel={
 key:'gost-developer-preferences-v1',visible:false,
 preferences(base){try{const saved=JSON.parse(localStorage.getItem(this.key)||'null');return validPreferences({...base,...Object.fromEntries(Object.keys(base).filter(k=>typeof saved?.[k]==='number'&&Number.isFinite(saved[k])).map(k=>[k,saved[k]]))})}catch{return {...base}}},
 persist(value){try{localStorage.setItem(this.key,JSON.stringify(value))}catch{message.textContent='Настройки остаются в этой вкладке.'}},
 removeTolerance(){try{const saved=JSON.parse(localStorage.getItem(this.key)||'{}');delete saved.tolerance;localStorage.setItem(this.key,JSON.stringify(saved))}catch{message.textContent='Уровень остаётся в этой вкладке.'}},
 initialVariant(){try{const value=JSON.parse(localStorage.getItem('gost-developer-style-v1')||'0');return Number.isInteger(value)&&value>=0&&value<5?value:0}catch{return 0}},
 initialize(){
  const $=id=>document.querySelector('#'+id);
  $('open-developer').onclick=()=>{if(activePointer!==null)return;$('parent-panel').close();this.visible=true;this.sync();this.render();$('developer-panel').showModal()};
  $('close-developer').onclick=()=>{this.visible=false;$('developer-panel').close()};$('developer-panel').addEventListener('close',()=>{this.visible=false});
  for(const key of Object.keys(preferenceDefaults))bindPreferenceControl(key,$('setting-'+key));
  names.forEach((name,index)=>{const button=document.createElement('button');button.type='button';button.textContent=name;button.onclick=()=>{if(activePointer!==null)return;try{localStorage.setItem('gost-developer-style-v1',JSON.stringify(index))}catch{}build(index)};document.querySelector('.variants').append(button)});
  $('settings-defaults').onclick=()=>{if(activePointer!==null)return;try{localStorage.removeItem(this.key)}catch{}configure({...LearnerExperience.preferences,tolerance:LearnerExperience.levels[LearnerExperience.level].tolerance},{persist:false})};
  $('settings-legacy').onclick=()=>{if(activePointer!==null)return;try{const old=JSON.parse(localStorage.getItem('letter-preferences-v1')||'null');if(old&&typeof old==='object')configure(validPreferences(old));else message.textContent='Прежних технических настроек здесь нет.'}catch{message.textContent='Не удалось прочитать прежние настройки.'}};
  $('composition-legacy').onclick=()=>{if(activePointer!==null)return;const old=new PageComposition({letter:activeLetter});editComposition(old.get(variant))};
  $('clear-all').onclick=()=>{if(activePointer!==null||!Object.values(data).some(s=>s.length))return;snapshot();data={};save();refresh()};this.sync()
 },
 sync(){const badge=document.querySelector('#developer-build');if(badge)badge.textContent='Разработка · '+worksheetBuild;document.querySelectorAll('.variants button').forEach((button,index)=>button.setAttribute('aria-pressed',String(index===variant)));try{const key=activeLetter==='А'?'letter-page-composition-v1':'letter-page-composition-v2-'+activeLetter.codePointAt(0).toString(16),button=document.querySelector('#composition-legacy');if(button)button.disabled=localStorage.getItem(key)===null}catch{}for(const key of Object.keys(preferenceDefaults)){const control=document.querySelector('#setting-'+key),output=document.querySelector('#value-'+key);if(control)control.value=preferences[key];if(output)output.textContent=preferenceValue(key,preferences[key])}LearnerExperience.syncLevels()},
 render(){composition.renderEditor({pictureRoot:document.querySelector('#picture-picker'),elementRoot:document.querySelector('#element-picker'),sequenceRoot:document.querySelector('#sequence-picker'),layout:composition.get(variant),onChange:editComposition})}
};
