// Read-only: use the shipped notation renderer without booting lessons or storage.
(()=>{
 const letters=Object.keys(DrawingGlyphs).filter(c=>c===c.toLocaleUpperCase('ru')&&DrawingGlyphs[c].instruction).sort((a,b)=>a.localeCompare(b,'ru'));
 const atlas=document.querySelector('#atlas'),filter=document.querySelector('#filter'),scale=document.querySelector('#scale'),bold=document.querySelector('#bold'),mode=document.querySelector('#mode');
 const escape=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const outline=(g,expansion)=>`<path d="${g.outline}" transform="translate(30 140) scale(${100/1400} ${-100/1400})" stroke="#809e8a" stroke-width="${expansion/(100/1400)}" stroke-linejoin="round" fill="#809e8a"/>`;
 function textPreview(letter,expansion,zoom){
  const e=LetterCurriculum.lesson(letter).examples,text=e.sentences[0]||e.capitals[0]||e.combinations[0],chars=text.replaceAll(' ',''),size=zoom*.92;
  const available=Math.max(120,(atlas.clientWidth||1000)-84),sequence=LetterSequence.compose(text,DrawingGlyphs,{gap:20,bold:Number(bold.value),maxWidth:available*.85/size-24});
  const boxes=sequence.glyphs.map((g,i)=>{const b=DrawingGlyphs[chars[i]].inkBounds;return [b[0]+g.x,b[1]+g.y,b[2]+g.x,b[3]+g.y]}),left=Math.min(...boxes.map(b=>b[0]))-10,top=Math.min(...boxes.map(b=>b[1]))-10;
  const frame=[left,top,Math.max(...boxes.map(b=>b[2]))-left+10,Math.max(...boxes.map(b=>b[3]))-top+10];
  const ink=sequence.glyphs.map((g,i)=>`<g transform="translate(${g.x} ${g.y})">${outline(DrawingGlyphs[chars[i]],expansion)}</g>`).join('');
  return `<p class="copy-caption">${escape(text)}</p><div class="text-preview"><svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Текст урока ${letter}: ${escape(text)}" data-lesson-text="${letter}" viewBox="${frame.join(' ')}" width="${frame[2]*size}" height="${frame[3]*size}">${ink}</svg></div>`;
 }
 function render(){
  const expansion=(Number(bold.value)/100-1)*10,zoom=Number(scale.value);
  atlas.style.setProperty('--card-width',mode.value==='texts'?'100%':Math.ceil(280*zoom+28)+'px');
  atlas.innerHTML=letters.map(letter=>{
   if(mode.value==='texts')return `<article data-letter="${letter}"><h2>${letter} ${letter.toLowerCase()}</h2>${textPreview(letter,expansion,zoom)}</article>`;
   const forms=[letter,letter.toLowerCase()],glyphs=forms.map(c=>DrawingGlyphs[c]);
   const frame=WritingScheme.frame(glyphs.map(g=>g.demonstration),glyphs.map(g=>g.inkBounds),expansion/2);
   const diagrams=glyphs.map((g,i)=>{
    return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Порядок написания ${forms[i]}" data-character="${forms[i]}" viewBox="${frame.join(' ')}" width="${frame[2]*zoom}" height="${frame[3]*zoom}">${WritingScheme.markup(g.demonstration,outline(g,expansion))}</svg>`;
   }).join('');
   const steps=glyphs.map((g,i)=>`<h3>${forms[i]}</h3><ol>${g.instruction.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>`).join('');
   return `<article data-letter="${letter}"><h2>${forms.join(' ')}</h2><div class="pair">${diagrams}</div><details><summary>Порядок движений</summary>${steps}</details></article>`;
  }).join('');
  applyFilter();
 }
 function applyFilter(){
  const query=filter.value.toLocaleUpperCase('ru').replace(/\s/g,''),cards=[...atlas.querySelectorAll('article')];
  cards.forEach(card=>card.hidden=!!query&&!query.includes(card.dataset.letter));
  const visible=cards.filter(card=>!card.hidden).length;
  document.querySelector('#count').textContent=mode.value==='texts'?`${visible} / ${letters.length} уроков`:`${visible} / ${letters.length} пар · ${visible*2} схем`;
  document.querySelector('#empty').hidden=visible!==0;
 }
 filter.addEventListener('input',applyFilter);
 scale.addEventListener('change',render);
 bold.addEventListener('change',render);
 mode.addEventListener('change',render);
 window.addEventListener('resize',render);
 render();
})();
