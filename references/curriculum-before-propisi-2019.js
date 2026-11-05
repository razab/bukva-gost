// Study order is independent of alphabetical lookup and of GOST glyph geometry.
// Working reference: Moldova's historical 2019–2020 model, not a current mandate.
const LetterCurriculum=(()=>{
 const order=Object.freeze([...'АУОЭИЫМНЛРЕЁЯЮЬГКЗСДТВФБПЙЖШЧЩХЦЪ']);
 const stages=Object.freeze(['elements','letter','combinations','words','sentences']);
 const source=Object.freeze({
  title:'Русский язык и литература, 1–4 классы · примерное планирование 2019–2020',
  url:'https://edu.gov.md/sites/default/files/russkiy_yazyk_i_literatura_1-4_klass.pdf',
  scope:'Учебная последовательность как рабочий ориентир. Не казахстанская азбука и не порядок из ГОСТ.'
 });
 // Our short examples illustrate progression; they are not extracted exercises.
 const examples={"А":{"combinations":["ААА"],"words":[],"sentences":[]},"У":{"combinations":["ау","уа"],"words":[],"sentences":[]},"О":{"combinations":["ао","оу"],"words":[],"sentences":[]},"Э":{"combinations":["эо","аэ"],"words":[],"sentences":[]},"И":{"combinations":["аи","иа"],"words":[],"sentences":[]},"Ы":{"combinations":["ыы","аы"],"words":[],"sentences":[]},"М":{"combinations":["ма","ам","му"],"words":["мама","мы"],"sentences":[]},"Н":{"combinations":["на","но"],"words":["нам","она"],"sentences":[]},"Л":{"combinations":["ла","ал"],"words":["мыло","мыла"],"sentences":[]},"Р":{"combinations":["ра","ар"],"words":["рама","мир"],"sentences":["Мама мыла раму."]},"Е":{"combinations":["ме","ре"],"words":["ела","ели"],"sentences":["Мама ела."]},"Ё":{"combinations":["мё","рё"],"words":["мёл","орёл"],"sentences":[]},"Я":{"combinations":["мя","ля"],"words":["яма","моя"],"sentences":[]},"Ю":{"combinations":["лю","мю"],"words":["юла","мою"],"sentences":[]},"Ь":{"combinations":["ль","рь"],"words":["моль","роль"],"sentences":[]},"Г":{"combinations":["га","го"],"words":["гора","игра"],"sentences":[]},"К":{"combinations":["ка","ак"],"words":["мак","рука"],"sentences":[]},"З":{"combinations":["за","аз"],"words":["роза","зима"],"sentences":[]},"С":{"combinations":["са","ас"],"words":["сом","сыр"],"sentences":[]},"Д":{"combinations":["да","ад"],"words":["дом","дым"],"sentences":[]},"Т":{"combinations":["та","ат"],"words":["кот","торт"],"sentences":[]},"В":{"combinations":["ва","ав"],"words":["вода","сова"],"sentences":[]},"Ф":{"combinations":["фа","аф"],"words":["фара","форма"],"sentences":[]},"Б":{"combinations":["ба","аб"],"words":["боб","баран"],"sentences":[]},"П":{"combinations":["па","ап"],"words":["папа","суп"],"sentences":[]},"Й":{"combinations":["ай","ой"],"words":["мой","май"],"sentences":[]},"Ж":{"combinations":["жа","аж"],"words":["жук","нож"],"sentences":[]},"Ш":{"combinations":["ша","аш"],"words":["шар","шина"],"sentences":[]},"Ч":{"combinations":["ча","ач"],"words":["чай","мяч"],"sentences":[]},"Щ":{"combinations":["ща","щу"],"words":["щи","щука"],"sentences":[]},"Х":{"combinations":["ха","ах"],"words":["хор","хлеб"],"sentences":[]},"Ц":{"combinations":["ца","ци"],"words":["цирк","цапля"],"sentences":[]},"Ъ":{"combinations":["ъъ"],"words":["подъём","съезд"],"sentences":[]}};
 function knownLetters(letter){const index=order.indexOf(letter.toUpperCase());return index<0?[]:order.slice(0,index+1)}
 function canUseText(letter,text){
  if(typeof text!=='string'||!text.trim()||!(/^[А-ЯЁа-яё\s,.!?—-]+$/u.test(text)))return false;
  const letters=[...text.toUpperCase()].filter(c=>/[А-ЯЁ]/u.test(c)),known=knownLetters(letter);
  return letters.length>0&&letters.every(c=>known.includes(c));
 }
 function lesson(letter){
  letter=letter.toUpperCase();const index=order.indexOf(letter);
  if(index<0)throw new Error('Unknown lesson letter');
  const samples=examples[letter]||{combinations:[],words:[],sentences:[]};
  return {letter,index,knownLetters:knownLetters(letter),previous:order[index-1]||null,next:order[index+1]||null,stages:[...stages],examples:structuredClone(samples)};
 }
 const firstPractice=letter=>lesson(letter).examples.combinations[0]||letter.toUpperCase().repeat(3);
 return {order,stages,source,knownLetters,canUseText,lesson,firstPractice};
})();
