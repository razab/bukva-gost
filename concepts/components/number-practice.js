// A supplementary sheet, not another letter course or a second drawing engine.
const NumberPractice={
 active:typeof location!=='undefined'&&location.hash==='#numbers',
 key:'letter-worksheet-numbers-v1',selected:'3',
 build(index){
  if(activePointer!==null)return;
  stopDemo();surfaces.forEach(s=>s.destroy());surfaces=[];history=[];variant=index;data=load();
  document.body.classList.add('number-practice');document.body.dataset.variant=index;
  document.title='Цифры и знаки · Буквы по ГОСТ';
  const root=document.querySelector('#practice');root.replaceChildren();
  for(const [character,glyph] of Object.entries(NumberGlyphs)){
   const group=document.createElement('div');group.className='row number-group';group.dataset.symbol=character;
   const reference=document.createElement('button');reference.type='button';reference.className='number-reference';reference.setAttribute('aria-label','Образец '+character);
   reference.onclick=()=>this.select(character);
   const frame=PracticeElement.frame(glyph.model,preferences);
   reference.innerHTML=`<svg viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" aria-hidden="true">${fontOutline(glyph.model,'fill="#347356"')}</svg>`;
   reference.style.setProperty('--reference-width',frame.width*preferences.size/100+'px');reference.style.setProperty('--reference-height',frame.height*preferences.size/100+'px');
   group.append(reference);
   for(let i=0;i<(preferences.practiceRepeats||2);i++){
    const cell=PracticeElement.createCell({row:group,id:`number-v1-${character.codePointAt(0).toString(16)}-${i}`,model:glyph.model,label:`Символ ${character}, проба ${i+1}`,guide,setupSurface,preferences,rulingLevels});
    cell.element.querySelector('canvas').addEventListener('pointerdown',()=>this.select(character),true);
    surfaces.push(cell.surface);
   }
   root.append(group);
  }
  if(learnerMode){LearnerExperience.initialize();document.querySelector('#choose-letter').textContent='← Буквы';document.querySelector('#choose-letter').onclick=()=>{location.hash='';location.reload()}}
  refresh();this.select(this.selected);
 },
 select(character){
  if(activePointer!==null||!NumberGlyphs[character])return;
  const changed=this.selected!==character;this.selected=character;
  for(const group of document.querySelectorAll('.number-group'))group.querySelector('.number-reference').setAttribute('aria-pressed',String(group.dataset.symbol===character));
  if(changed||animation===null)this.playDemo();
 },
 playDemo(){
  stopDemo();
  const glyph=NumberGlyphs[this.selected],model=glyph.model,svg=document.querySelector('#demo'),scheme=document.querySelector('#hero-scheme-upper');
  const frame=WritingScheme.frame([model],[glyph.inkBounds],boldExpansion()/2).join(' ');
  scheme.setAttribute('viewBox',frame);scheme.setAttribute('aria-label','Порядок написания '+this.selected);
  scheme.innerHTML=WritingScheme.markup(model,fontOutline(model,'fill="#809e8a"'));
  svg.setAttribute('aria-label','Показ написания '+this.selected);
  svg.innerHTML=revealMarkup(model,'number-demo-mask')+`<g id="number-pencil"><circle r="7" fill="#fff9e6" stroke="#b88b3f"/><g transform="rotate(30)"><path d="M-4 -10V-37Q0 -42 4 -37V-10L0 0Z" fill="#e7b24f" stroke="#936b34"/><path d="M-4 -10H4L0 0Z" fill="#fff0c9"/><path d="M-1.5 -4L0 0L1.5 -4" fill="#354b3c"/></g></g>`;
  const lines=model.map((line,i)=>({node:svg.querySelector(`[data-line="${i}"]`),length:revealLength(line)})),regions=[...svg.querySelectorAll('[data-demo-region]')].map(node=>({node,visible:null})),pencil=svg.querySelector('#number-pencil');
  const clock=demoClock(model),start=performance.now();
  const tick=now=>{
   const state=clock.at(now-start);
   for(const region of regions){const progress=state.progress[Number(region.node.dataset.demoRegion)],visible=progress>0&&progress>=Number(region.node.dataset.revealAt);if(visible!==region.visible){region.node.setAttribute('opacity',visible?'1':'0');region.visible=visible}}
   lines.forEach(({node,length},i)=>{node.setAttribute('stroke-dashoffset',length*(1-state.progress[i]));node.setAttribute('opacity',state.progress[i]>0?'1':'0')});
   pencil.setAttribute('visibility',state.pen?'visible':'hidden');if(state.pen)pencil.setAttribute('transform',`translate(${state.pen[0]} ${state.pen[1]})`);
   animation=requestAnimationFrame(tick);
  };tick(start);
 }
};
for(const glyph of Object.values(NumberGlyphs))WritingScheme.notes.set(glyph.model,glyph.instruction.notation);
