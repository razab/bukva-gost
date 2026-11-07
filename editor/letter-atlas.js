// Read-only: use the shipped notation renderer without booting lessons or storage.
(()=>{
 const letters=Object.keys(DrawingGlyphs).filter(c=>c===c.toLocaleUpperCase('ru')&&DrawingGlyphs[c].instruction).sort((a,b)=>a.localeCompare(b,'ru'));
 const atlas=document.querySelector('#atlas'),filter=document.querySelector('#filter'),scale=document.querySelector('#scale'),bold=document.querySelector('#bold');
 const escape=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){
  const expansion=(Number(bold.value)/100-1)*10,zoom=Number(scale.value);
  atlas.style.setProperty('--card-width',Math.ceil(280*zoom+28)+'px');
  atlas.innerHTML=letters.map(letter=>{
   const forms=[letter,letter.toLowerCase()],glyphs=forms.map(c=>DrawingGlyphs[c]);
   const frame=WritingScheme.frame(glyphs.map(g=>g.demonstration),glyphs.map(g=>g.inkBounds),expansion/2);
   const diagrams=glyphs.map((g,i)=>{
    const outline=`<path d="${g.outline}" transform="translate(30 140) scale(${100/1400} ${-100/1400})" stroke="#809e8a" stroke-width="${expansion/(100/1400)}" stroke-linejoin="round" fill="#809e8a"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Порядок написания ${forms[i]}" data-character="${forms[i]}" viewBox="${frame.join(' ')}" width="${frame[2]*zoom}" height="${frame[3]*zoom}">${WritingScheme.markup(g.demonstration,outline)}</svg>`;
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
  document.querySelector('#count').textContent=`${visible} / ${letters.length} пар · ${visible*2} схем`;
  document.querySelector('#empty').hidden=visible!==0;
 }
 filter.addEventListener('input',applyFilter);
 scale.addEventListener('change',render);
 bold.addEventListener('change',render);
 render();
})();
