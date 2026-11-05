// Read-only companion. Copies the real canvas; never accepts or grades ink.
const WorksheetDock={
 ready:false,selected:null,windowBox:null,pending:null,compact:false,letter:null,lastY:0,zoom:2,providers:new WeakMap(),
 // Keep the entire input frame visible. Pen position never changes the camera.
 viewBox(frame,scale,pane){
  const zoom=Math.min(this.zoom,Math.max(1,pane.width-16)/(frame.width*scale),Math.max(1,pane.height-16)/(frame.height*scale));
  const width=pane.width/(scale*zoom),height=pane.height/(scale*zoom);
  return {x:frame.x+(frame.width-width)/2,y:frame.y+(frame.height-height)/2,width,height,zoom};
 },
 track(canvas,feedback){this.providers.set(canvas,feedback)},
 copyRect(frame,view,source,target){
  const x=Math.max(frame.x,view.x),y=Math.max(frame.y,view.y),right=Math.min(frame.x+frame.width,view.x+view.width),bottom=Math.min(frame.y+frame.height,view.y+view.height);if(right<=x||bottom<=y)return null;
  return [(x-frame.x)*source.width/frame.width,(y-frame.y)*source.height/frame.height,(right-x)*source.width/frame.width,(bottom-y)*source.height/frame.height,(x-view.x)*target.width/view.width,(y-view.y)*target.height/view.height,(right-x)*target.width/view.width,(bottom-y)*target.height/view.height];
 },
 mount({isWriting=()=>false}={}){
  if(this.ready)return true;if(typeof window==='undefined'||typeof window.addEventListener!=='function')return false;const $=id=>document.querySelector('#'+id);
  this.hero=$('worksheet-hero');this.bar=$('writing-dock');this.visual=$('hero-visual');this.inline=$('inline-loupe');this.dockLive=$('dock-loupe');this.dockPicture=$('dock-illustration');this.toolbar=document.querySelector('.appbar');this.heroDemo=$('hero-demo');this.dockDemo=$('dock-demo-region');
  if(!this.hero||!this.bar||!this.visual||!this.toolbar)return false;this.isWriting=isWriting;this.ready=true;this.lastY=window.scrollY;
  this.views=[{node:this.inline,guide:$('inline-loupe-guide'),ruling:$('inline-loupe-ruling'),ink:$('inline-loupe-ink'),feedback:$('inline-loupe-feedback')},{node:this.dockLive,guide:$('dock-loupe-guide'),ruling:$('dock-loupe-ruling'),ink:$('dock-loupe-ink'),feedback:$('dock-loupe-feedback')}];
  window.addEventListener('scroll',()=>this.update(true),{passive:true});window.addEventListener('resize',()=>this.update(),{passive:true});this.observer=new ResizeObserver(()=>this.update());this.observer.observe(this.toolbar);this.observer.observe(this.visual);this.observer.observe(this.dockLive);this.update();return true;
 },
 update(fromScroll=false){
  if(!this.ready)return;const y=window.scrollY,toolbar=this.toolbar.getBoundingClientRect(),wanted=y>8&&this.hero.getBoundingClientRect().top<toolbar.bottom-4;document.body.style.setProperty('--toolbar-height',`${toolbar.bottom}px`);
  const returning=fromScroll&&this.lastY>8&&y<=4;if(this.isWriting()){if(returning)this.returnToPicture=true;this.lastY=y;return}if(returning||this.returnToPicture){this.clear();this.returnToPicture=false}this.lastY=y;this.compact=wanted;this.bar.hidden=!wanted;this.hero.dataset.compact=String(wanted);this.showView();this.schedule();
 },
 showView(){const active=!!this.selected;for(const region of [this.heroDemo,this.dockDemo])region.dataset.view=active?'writing':'demo';this.inline.hidden=!active;this.dockLive.hidden=!active;this.dockPicture.hidden=false},
 onBuild(letter){
  if(!this.ready)return;if(this.letter!==letter)this.clear();this.letter=letter;const image=document.querySelector('#reference'),copy=document.querySelector('#dock-reference');copy.src=image.src;copy.alt=image.alt;document.querySelector('#dock-word').innerHTML=document.querySelector('#reference-word').innerHTML;document.querySelector('#dock-art-guide').innerHTML=document.querySelector('#art-guide').innerHTML;
  if(this.selected){const id=this.selected.dataset.surfaceId,canvas=[...document.querySelectorAll('#practice canvas[data-surface-id]')].find(c=>c.dataset.surfaceId===id);if(canvas)this.bind(canvas);else this.clear()}this.update();
 },
 clear(){this.selected=null;this.windowBox=null;if(this.ready)this.showView()},
 bind(canvas){
  const changed=this.selected!==canvas;this.selected=canvas;if(changed)this.windowBox=null;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return false;this.frame=JSON.parse(canvas.dataset.viewBox);this.scale=rect.width/this.frame.width;this.frameKey=canvas.dataset.viewBox;
  const sourceGuide=canvas.parentElement.querySelector('svg');for(const view of this.views)view.guide.innerHTML=sourceGuide?.innerHTML||'';for(const view of this.views){view.node.dataset.sourceId=canvas.dataset.surfaceId;view.node.setAttribute('aria-label','Текущая проба: '+canvas.getAttribute('aria-label'))}this.showView();return true;
 },
 select(canvas){if(!this.ready||!canvas.dataset.viewBox||canvas.dataset.surfaceId.startsWith('art'))return;this.bind(canvas);this.schedule()},
 mirror(canvas,rect){if(!this.ready)return;if(this.selected===canvas){if(rect&&!rect.width&&!this.isWriting()){this.clear();return}if(!rect||rect.width)this.schedule();}else if(canvas.id==='art-canvas'&&this.compact)this.schedule()},
 release(){if(this.ready)this.update()},
 schedule(){if(this.pending===null)this.pending=requestAnimationFrame(()=>{this.pending=null;this.paint()})},
 paint(){
  if(!this.ready)return;
  if(this.compact){const source=document.querySelector('#art-canvas'),target=document.querySelector('#dock-art-ink'),rect=target.getBoundingClientRect();if(rect.width&&rect.height){target.width=Math.round(rect.width*(devicePixelRatio||1));target.height=Math.round(rect.height*(devicePixelRatio||1));const ctx=target.getContext('2d');ctx.clearRect(0,0,target.width,target.height);ctx.drawImage(source,0,0,target.width,target.height)}}
  if(!this.selected)return;
  if(!this.selected.isConnected)return;if(this.frameKey!==this.selected.dataset.viewBox&&!this.bind(this.selected))return;const view=this.views[this.compact?1:0],rect=view.node.getBoundingClientRect();if(!rect.width||!rect.height||!this.frame)return;
  const box=this.viewBox(this.frame,this.scale,rect);this.windowBox=box;view.node.style.setProperty('--loupe-zoom',box.zoom);const key=`${box.x} ${box.y} ${box.width} ${box.height}`;
  if(view.guide.getAttribute('viewBox')!==key){view.guide.setAttribute('viewBox',key);view.ruling.setAttribute('viewBox',key);view.feedback.setAttribute('viewBox',key);const levels=JSON.parse(this.selected.dataset.rulingLevels||'[]');view.ruling.innerHTML=levels.map(y=>`<path d="M${box.x} ${y}H${box.x+box.width}" stroke="var(--ruling)" stroke-width="${1/this.scale}"/>`).join('')}
  const feedback=this.providers.get(this.selected)?.()||'';if(view.feedback.innerHTML!==feedback)view.feedback.innerHTML=feedback;
  const target=view.ink,w=Math.max(1,Math.round(rect.width*(devicePixelRatio||1))),h=Math.max(1,Math.round(rect.height*(devicePixelRatio||1)));if(target.width!==w)target.width=w;if(target.height!==h)target.height=h;const ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);const copy=this.copyRect(this.frame,box,this.selected,target);if(copy)ctx.drawImage(this.selected,...copy);
 }
};
