// Keep the worksheet at its calibrated CSS-pixel scale. Safari's native
// gesture events need cancellation in addition to touch-action/viewport.
const WorksheetInput = (() => {
 const cancel = event => { if (event.cancelable) event.preventDefault(); };
 const reject = event => { cancel(event); event.stopImmediatePropagation?.(); };
 const options = {capture:true,passive:false};
 // A rejected contact stays rejected until lift-off, including across pen-up.
 // Size cannot reliably distinguish a finger from a palm. Idle fingers scroll;
 // only contacts overlapping actual pen writing (or multi-touch) are rejected.
 const pens=new Set(),contacts=new Map(),liveTouches=new Set(),blockedTouches=new Set();
 let compatUntil=0,cancelTouch=()=>{},legacyRelease=0;
 const now=()=>Date.now(),nearPen=()=>pens.size>0;
 const surface=target=>target?.closest?.('.writing,.art-surface,.writing-dock,.live-loupe');
 const sync=()=>{const root=document.documentElement;if(!root)return;const value=String(nearPen()||blockedTouches.size>0||[...contacts.values()].some(c=>c.blocked));if(root.dataset.penGuard!==value)root.dataset.penGuard=value};
 function penSeen(){markContacts()}
 function rememberRejected(){compatUntil=now()+1000}
 function markContacts(){for(const c of contacts.values())c.blocked=true;for(const id of liveTouches)blockedTouches.add(id);cancelTouch();sync()}
 document.addEventListener('pointerdown',event=>{
  if(event.pointerType==='pen'){pens.add(event.pointerId);penSeen();return}
  if(event.pointerType!=='touch')return;
  legacyRelease=0;
  const blocked=contacts.get(event.pointerId)?.blocked||nearPen()||event.isPrimary===false;
  if(!blocked&&!blockedTouches.size&&![...contacts.values()].some(c=>c.blocked))compatUntil=0;
  contacts.set(event.pointerId,{blocked});if(blocked){rememberRejected();reject(event)}sync();
 },options);
 document.addEventListener('pointermove',event=>{
  if(event.pointerType==='pen'){if(pens.has(event.pointerId))penSeen();return}
  if(event.pointerType!=='touch')return;
  const contact=contacts.get(event.pointerId);
  if(contact&&nearPen()){contact.blocked=true;cancelTouch()}
  if(contact?.blocked){rememberRejected();reject(event)}sync();
 },options);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,event=>{
  if(event.pointerType==='pen'||pens.has(event.pointerId)){pens.delete(event.pointerId);const field=surface(event.target);if(field)delete field.dataset.penHover;if(type==='pointerup')legacyRelease=now()+500;penSeen();return}
  if(event.pointerType==='mouse'&&type==='pointerup'){legacyRelease=now()+500;return}
  const contact=contacts.get(event.pointerId);contacts.delete(event.pointerId);
  if(contact?.blocked){rememberRejected();reject(event)}sync();
 },options);
 // Scope hover protection to the field under the Pencil. Hovering must not
 // disable scrolling throughout the document.
 document.addEventListener('pointerover',event=>{if(event.pointerType==='pen'){const field=surface(event.target);if(field)field.dataset.penHover='true'}},options);
 document.addEventListener('pointerout',event=>{if(event.pointerType==='pen'){const field=surface(event.target);if(field&&field!==surface(event.relatedTarget))delete field.dataset.penHover}},options);
 // Pointer cancellation alone cannot stop native viewport panning. Safari's
 // non-passive Touch Events and a pre-existing touch-action lock cover that.
 for(const type of ['touchstart','touchmove'])document.addEventListener(type,event=>{
  const fingers=[...event.touches].filter(t=>t.touchType!=='stylus');
  for(const touch of fingers)liveTouches.add(touch.identifier);
  if(fingers.length)legacyRelease=0;
  for(const touch of fingers)if(nearPen()||fingers.length>1)blockedTouches.add(touch.identifier);
  // Pencil Touch Events must not start native pan on an idle-scrollable canvas.
  if([...event.touches].some(t=>t.touchType==='stylus'&&surface(t.target||event.target)))cancel(event);
  if(fingers.some(t=>blockedTouches.has(t.identifier))){cancelTouch();rememberRejected();reject(event)}sync();
 },options);
 for(const type of ['touchend','touchcancel'])document.addEventListener(type,event=>{
  let blocked=false;for(const touch of event.changedTouches||[]){liveTouches.delete(touch.identifier);if(blockedTouches.delete(touch.identifier))blocked=true}
  if(event.touches?.length===0){contacts.clear();liveTouches.clear();blockedTouches.clear()}
  if(blocked){rememberRejected();reject(event)}sync();
 },options);
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)return;
  pens.clear();contacts.clear();liveTouches.clear();blockedTouches.clear();legacyRelease=0;
  for(const field of document.querySelectorAll?.('[data-pen-hover]')||[])delete field.dataset.penHover;
  cancelTouch(true);sync();
 },options);
 document.addEventListener('click',event=>{
  if(event.pointerType==='pen'||event.detail===0)return;
  // Older WebKit also sends Pencil clicks as MouseEvent. Allow the click
  // immediately following a pen/mouse release when no finger intervened.
  if(!event.pointerType&&now()<legacyRelease){legacyRelease=0;return}
  // Recent WebKit exposes pointerType; older compatibility clicks do not.
  const touch=event.pointerType==='touch'||event.sourceCapabilities?.firesTouchEvents;
  const legacy=!event.pointerType&&(nearPen()||now()<compatUntil);
  if((touch&&(nearPen()||now()<compatUntil))||legacy)reject(event);
 },options);
 for (const type of ['gesturestart','gesturechange','gestureend',
                     'selectstart','dragstart','contextmenu','dblclick']) {
  document.addEventListener(type,cancel,options);
 }
 document.addEventListener('wheel',event => {
  if (event.ctrlKey || event.metaKey) cancel(event);
 },options);
 document.addEventListener('keydown',event => {
  if ((event.ctrlKey || event.metaKey) &&
      ['+','=','-','0','NumpadAdd','NumpadSubtract','Numpad0'].includes(event.key)) cancel(event);
 },options);
 // Act on the accepted release, without waiting for WebKit's later click.
 // Preserve click-only/keyboard activation and consume each pointer's click
 // once, including late clicks after a second button was already tapped.
 const actions=new WeakMap();
 function bindAction(node,action){
  actions.get(node)?.();let armed=null,disposed=false;const pending=[],listeners=[];
  const usable=()=>!disposed&&!node.disabled&&!node.hidden&&node.isConnected!==false;
  const listen=(type,fn)=>{node.addEventListener(type,fn);listeners.push([type,fn])};
  const moved=e=>armed&&Math.hypot(e.clientX-armed.x,e.clientY-armed.y)>10;
  listen('pointerdown',e=>{
   armed=null;if(!usable()||e.defaultPrevented||e.button>0||e.isPrimary===false)return;
   armed={id:e.pointerId,x:e.clientX,y:e.clientY};pending.push(armed);if(pending.length>32)pending.shift();
  });
  listen('pointermove',e=>{if(armed?.id===e.pointerId&&moved(e))armed=null});
  for(const type of ['pointercancel','lostpointercapture','pointerleave'])listen(type,e=>{if(armed?.id===e.pointerId)armed=null});
  listen('pointerup',e=>{
   if(!armed||armed.id!==e.pointerId)return;const travel=moved(e);armed=null;if(travel||!usable()||e.defaultPrevented)return;
   const r=node.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.left+r.width||e.clientY<r.top||e.clientY>r.top+r.height)return;
   action(e);
  });
  const click=e=>{if(e&&e.detail!==0&&pending.length){pending.shift();e.preventDefault?.();return}if(usable())action(e)};
  node.onclick=click;
  const dispose=()=>{disposed=true;armed=null;pending.length=0;for(const [type,fn]of listeners)node.removeEventListener(type,fn);if(node.onclick===click)node.onclick=null;if(actions.get(node)===dispose)actions.delete(node)};
  actions.set(node,dispose);return dispose;
 }
 return {bindAction,setTouchCancellation(callback){cancelTouch=callback}};
})();
