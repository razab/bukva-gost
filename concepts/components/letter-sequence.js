const LetterSequence={
 normalizeText(text,{lesson='А',supported=Object.keys(DrawingGlyphs).join('')}={}){if(typeof text!=='string')return null;const value=text.replace(/A/g,'А').replace(/a/g,'а').replace(/\s+/g,' ').trim();return value.length>0&&value.length<=24&&[...value].every(c=>c===' '||supported.includes(c))&&LetterCurriculum.canUseText(lesson,value)?value:null},
 compose(text,sources,{gap=null,bold=100,maxWidth=Infinity,lineAdvance=170}={}){
  if(typeof text!=='string'||!text.trim().length||text.length>24)throw new Error('Invalid sequence text');
  if(gap!==null&&(!Number.isFinite(gap)||gap<0||gap>50))throw new Error('Invalid letter gap');
  let cursor=0,lastOrigin=0,previous=null,wordBreak=false,lineY=0,maxOrigin=0,firstLeft=null;const model=[],glyphs=[],breaks=[];
  for(let at=0;at<text.length;at++){
   const character=text[at];if(character===' '){wordBreak=true;continue}const source=sources[character];if(!source)throw new Error('No glyph model for '+character);
   if(gap!==null){
    if(!source.bounds||source.bounds.length!==2||!source.bounds.every(Number.isFinite))throw new Error('Missing glyph bounds');
    if(previous)cursor=lastOrigin+previous.bounds[1]-source.bounds[0]+(wordBreak?60:gap)+(bold/100-1)*10;
    if(previous&&wordBreak&&Number.isFinite(maxWidth)){
     const word=text.slice(at).split(' ')[0],wordSpec=this.compose(word,sources,{gap,bold}),right=Math.max(...wordSpec.glyphs.map((g,i)=>g.x+sources[word[i]].bounds[1]));
     if(cursor+right-(firstLeft??source.bounds[0])>maxWidth){lineY+=lineAdvance;cursor=0;previous=null;firstLeft=null;breaks.push(at)}
    }
    // Keep fitting words together; if one word itself cannot fit at the chosen
    // size/gap, continue its letters on the next line without changing scale.
    if(previous&&Number.isFinite(maxWidth)&&cursor+source.bounds[1]-(firstLeft??source.bounds[0])>maxWidth){lineY+=lineAdvance;cursor=0;previous=null;firstLeft=null;breaks.push(at)}
   }else if(wordBreak&&previous)cursor+=60;
   wordBreak=false;lastOrigin=cursor;maxOrigin=Math.max(maxOrigin,cursor);firstLeft??=source.bounds?.[0]||0;
   glyphs.push({model:source.model,x:cursor,y:lineY});for(const line of source.model)model.push(line.map(([x,y])=>[x+cursor,y+lineY]));cursor+=source.advance;previous=source;
  }
  return {text,model,glyphs,breaks,width:maxOrigin+150,height:180+lineY};

 },
 mount({root,availableWidth=root.clientWidth,configuration,sources,guide,fontOutline,setupSurface,preferences,rulingLevels}){
  if(!configuration)return [];
  const gap=preferences.letterGap;
  const contentWidth=(availableWidth||936)*(1-(preferences.leftInset||0)/100);
  const fitWidth=p=>contentWidth/(p.size/100)-2*Math.max(5*p.bold/100,p.tolerance/(p.size/100),4/(p.size/100))-4/(p.size/100);
  const maxWidth=fitWidth(preferences);
  const sequence=this.compose(configuration.text,sources,{gap,bold:preferences.bold,maxWidth}),row=document.createElement('div'),surfaces=[];row.className='row sequence-row';row.dataset.component='letter-sequence';row.dataset.textRowId=configuration.id||'primary';row.dataset.lessonStage=configuration.stage||LetterCurriculum.textStage(configuration);row.setAttribute('aria-label',configuration.text);
  const ink=sequence.glyphs.map((g,i)=>{const source=sources[configuration.text.replace(/ /g,'')[i]],b=source.inkBounds;return b?[b[0]+g.x,b[1]+g.y,b[2]+g.x,b[3]+g.y]:null}).filter(Boolean);if(ink.length)PracticeElement.inkBounds.set(sequence.model,[Math.min(...ink.map(b=>b[0])),Math.min(...ink.map(b=>b[1])),Math.max(...ink.map(b=>b[2])),Math.max(...ink.map(b=>b[3]))]);
  const sequenceGuide=()=>sequence.model.map(line=>`<path d="${line.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')}" class="corridor"/>`).join('')+sequence.glyphs.map(g=>`<g transform="translate(${g.x} ${g.y||0})">${fontOutline(g.model,'fill="#789581" opacity=".22"')}</g>`).join('')+sequence.model.map(line=>`<path d="${line.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')}" class="guide"/>`).join('');
  const levels=[...new Set(sequence.glyphs.map(g=>g.y||0))].flatMap(y=>(rulingLevels||[]).map(level=>level+y));
  const code=Array.from(configuration.text).map(c=>c.codePointAt(0).toString(16)).join('-');
  let checkedTolerance=null,wrapChanged=false;
  const needsLayout=p=>{if(checkedTolerance!==p.tolerance){checkedTolerance=p.tolerance;wrapChanged=JSON.stringify(LetterSequence.compose(configuration.text,sources,{gap,bold:p.bold,maxWidth:fitWidth(p)}).breaks)!==JSON.stringify(sequence.breaks)}return wrapChanged};
  // Keep controls below the first visible glyph, never the middle of a word.
  const first=sequence.glyphs[0],firstInk=PracticeElement.inkBounds.get(first.model),firstXs=first.model.flat().map(p=>p[0]);
  const scoreX=sequence.glyphs.length>1?first.x+(firstInk?(firstInk[0]+firstInk[2])/2:(Math.min(...firstXs)+Math.max(...firstXs))/2):null;
  for(let i=0;i<configuration.repeats;i++){
   const cell=PracticeElement.createCell({row,id:`${configuration.id&&configuration.id!=='primary'?'text-'+configuration.id+'-':''}sequence-v2-gap${gap}-b${preferences.bold}-${code}-${i}${sequence.breaks.length?'-wrap'+sequence.breaks.join('_'):''}`,model:sequence.model,label:`${configuration.text}, проба ${i+1}`,guide:sequenceGuide,setupSurface,preferences,rulingLevels:levels,width:sequence.width,height:sequence.height,scoreX});
   surfaces.push({...cell.surface,needsLayout});
  }
  root.append(row);return surfaces;
 }
};
