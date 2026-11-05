// Preview and installed bundle report their different offline guarantees.
(async()=>{
 const status=document.querySelector('#offline-status'),button=document.querySelector('#install-update');if(!status||!button)return;
 const enabled=document.querySelector('meta[name="offline-bundle"]')?.content==='true';
 if(!enabled){status.textContent='Этот Wi-Fi-просмотр работает, пока включён Mac.';return}
 if(!isSecureContext||!('serviceWorker' in navigator)){status.textContent='Автономная установка доступна через HTTPS. Этот просмотр требует сети.';return}
 let requested=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requested)location.reload()});
 try{
  const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
  const update=()=>{if(registration.waiting&&navigator.serviceWorker.controller){button.hidden=false;status.textContent='Готово обновление. Ваши рисунки сохранятся.'}else button.hidden=true};
  button.onclick=()=>{if(typeof activePointer!=='undefined'&&activePointer!==null)return;if(typeof save==='function')save();if(typeof pendingInk!=='undefined'&&pendingInk.size){status.textContent='Сохраните копию рисунков перед обновлением: на устройстве мало места.';return}requested=true;registration.waiting?.postMessage({type:'ACTIVATE'});button.disabled=true};
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')update();if(worker.state==='redundant')status.textContent='Загрузка для работы без сети не завершена. Проверьте подключение и откройте приложение снова.'})});
  await navigator.serviceWorker.ready;status.textContent='Все буквы и рисунки сохранены для работы без сети.';document.body.dataset.offlineReady='true';update();
 }catch{status.textContent='Не удалось сохранить приложение для работы без сети. Заниматься сейчас можно; попробуйте открыть его позже при подключении.'}
})();
