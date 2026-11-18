/* Native chrome uses the worksheet's actions and storage, never a second journal. */
document.body.classList.add('native-ipad');
window.NativeApp={
 frame:null,
 publish(catalog=false){
  if(!window.webkit?.messageHandlers?.nativeLesson)return;
  const work=LearnerExperience.work();
  const state={kind:'state',letter:activeLetter,preferences,variant,stylusOnly,
   canUndo:history.length>0,hasWork:work.written.length>0,writing:activePointer!==null,
   hasAnyInk:Object.values(data).some(strokes=>strokes.length>0),
   independent:LearnerExperience.independent,canNext:!!LetterCurriculum.lesson(activeLetter).next,
   count:document.querySelector('#session-count').textContent,
   backupSummary:document.querySelector('#backup-summary').textContent,
   notice:document.querySelector('#message').textContent,
   penPreview:PenAppearance.smooth(PenAppearance.preview,preferences.smoothing),
   canRestore:!document.querySelector('#restore-backup').hidden};
  if(catalog)state.lessons=LetterCurriculum.order.map(letter=>{
   const sessions=LearnerExperience.store().sessions(letter),result=LearnerExperience.completedResult(sessions);
   const tasks=LearnerExperience.attempts().tasks(letter).filter(t=>t.profile===LearnerExperience.profile(t.id));
   const weak=tasks.sort((a,b)=>a.recent.at(-1).score-b.recent.at(-1).score)[0];
   return {letter,sessions:sessions.length,score:result?.score??null,difficulty:result?LearnerExperience.difficulty(result.session.statistics?.tolerance):'',
    independentScore:sessions.at(-1)?.independentScore??null,
    repeat:weak?{id:weak.id,label:weak.label,best:weak.best,recent:weak.recent.slice(-3).map(a=>a.score)}:null};
  });
  window.webkit.messageHandlers.nativeLesson.postMessage(state);
 },
 schedule(){if(this.frame!==null)return;this.frame=requestAnimationFrame(()=>{this.frame=null;this.publish()})},
 async command(action,payload={}){
  if(activePointer!==null&&action!=='sync')return false;
  switch(action){
   case 'sync':this.publish(true);return true;
   case 'select':if(!LetterCurriculum.order.includes(payload.letter))throw Error('Неизвестная буква');build(variant,payload.letter);window.scrollTo({top:0});break;
   case 'next':document.querySelector('#next-letter').click();break;
   case 'undo':document.querySelector('#undo').click();break;
   case 'independent':document.querySelector('#try-independent').click();break;
   case 'level':LearnerExperience.setLevel(payload.level);break;
   case 'configure':configure(payload);break;
   case 'stylus':configureInput(payload.enabled);break;
   case 'style':document.querySelectorAll('.variants button')[payload.index]?.click();break;
   case 'defaults':document.querySelector('#settings-defaults').click();break;
   case 'legacy':document.querySelector('#settings-legacy').click();break;
   case 'editorClosed':compositions.delete(activeLetter);reflowPage();break;
   case 'clearAll':document.querySelector('#clear-all').click();break;
   case 'repeat':LearnerExperience.repeat(payload.letter,payload.task);break;
   case 'export':document.querySelector('#export-backup').click();break;
   case 'import':await document.querySelector('#import-backup').onchange({target:{files:[new File([payload.text],payload.name,{type:'application/json'})],value:''}});break;
   case 'restore':document.querySelector('#restore-backup').click();break;
   case 'finish':{
    document.querySelector('#finish-session').click();
    const dialog=document.querySelector('#session-result');
    if(dialog.open){const session=LearnerExperience.store().sessions(activeLetter).at(-1);
     window.webkit?.messageHandlers?.nativeLesson?.postMessage({kind:'result',letter:activeLetter,statistics:session?.statistics||LearnerExperience.statistics(LearnerExperience.work()),saved:LearnerExperience.store().lastSaveSucceeded});
     dialog.close();
    }break;
   }
   default:throw Error('Неизвестное действие');
  }
  this.publish(['select','next','finish','restore','repeat'].includes(action));return true;
 }
};
if(location.hash.startsWith('#author-')){
 document.body.classList.add('native-author');
 const letter=String.fromCodePoint(parseInt(location.hash.slice(8),16));
 if(LetterCurriculum.order.includes(letter))build(variant,letter);
 document.querySelector('#open-parent').click();document.querySelector('#open-developer').click();
 document.querySelectorAll('#developer-panel details.page-editor').forEach(e=>e.open=true);
}else{
 for(const type of ['pointerdown','pointerup','pointercancel','click','change'])document.addEventListener(type,()=>NativeApp.schedule(),true);
 NativeApp.publish(true);
}
