// Reviewed Lensk p36 fig5/6 order, adapted to upright type Б geometry.
// Only teaching paths/metadata change; assessment models and revisions do not.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),file=root+'/concepts/components/glyphs.js',context={};vm.createContext(context);vm.runInContext(fs.readFileSync(file,'utf8'),context);
const glyphs=vm.runInContext('DrawingGlyphs',context),original=JSON.parse(JSON.stringify(glyphs)),m=c=>glyphs[c].model,copy=v=>JSON.parse(JSON.stringify(v)),rev=line=>[...line].reverse(),line=(x,y,X,Y)=>[[x,y],[X,Y]],join=(a,b)=>[...a,...b.slice(Math.hypot(a.at(-1)[0]-b[0][0],a.at(-1)[1]-b[0][1])<.01?1:0)];
const arc=(x,y,r,a,b)=>Array.from({length:17},(_,i)=>{const t=(a+(b-a)*i/16)*Math.PI/180;return [x+r*Math.cos(t),y+r*Math.sin(t)]});
const bowl=(l,r,t,b)=>[[l,t],[r-15,t],...arc(r-15,t+15,15,-90,0).slice(1),[r,b-15],...arc(r-15,b-15,15,0,90).slice(1),[l,b]];
function halves(route){
 const ring=route.slice(0,-1),mid=(Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2,hits=[];
 for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(a[0]===b[0])continue;const t=(mid-a[0])/(b[0]-a[0]);if(t>=0&&t<1)hits.push({i,p:[mid,a[1]+t*(b[1]-a[1])]})}
 hits.sort((a,b)=>a.p[1]-b.p[1]);assert.equal(hits.length,2,'Oval must have exactly two centre crossings');const [top,bottom]=hits;
 const walk=(a,b)=>{const out=[a.p];for(let i=(a.i+1)%ring.length;;i=(i+1)%ring.length){out.push(ring[i]);if(i===b.i)break;if(out.length>ring.length+1)throw Error('Unclosed oval')}out.push(b.p);return out};
 const a=walk(top,bottom),b=rev(walk(bottom,top));return a.reduce((s,p)=>s+p[0],0)/a.length<mid?[a,b]:[b,a];
}
const routes={},steps={},put=(c,paths,names)=>{routes[c]=paths;steps[c]=names};
const names={down:'Сверху вниз',right:'Слева направо',left:'Справа налево',leftArc:'Левая дуга сверху вниз',rightArc:'Правая дуга сверху вниз'};
const A=m('А');put('А',[[A[0][1],A[0][0]],[A[0][1],A[0][2]],A[1]],['Левая сторона сверху вниз','Правая сторона сверху вниз','Перекладина слева направо']);put('а',[m('а')[0].slice(0,-1),m('а')[1]],['Корпус вокруг левой стороны','Стойка сверху вниз с выходом вправо']);
put('Б',[line(45,45,45,135),line(45,45,83.75,45.0833),[...rev(m('Б')[0].slice(7)),[45,135]]],['Стойка сверху вниз','Верхняя горизонталь','Нижняя округлая часть']);
put('б',[...halves(m('б')[2]),line(45,45,85,45),m('б')[1]],[names.leftArc,names.rightArc,'Верхняя горизонталь','Соединение сверху вниз']);
put('В',[line(45,45,45,135),bowl(45,95,85,135),bowl(45,90,45,85)],['Стойка сверху вниз','Нижняя округлая часть','Верхняя округлая часть']);
const v=m('в')[0],vb=[65,134.9167];put('в',[[...rev(v.slice(19,30)),vb],[...v.slice(4,19),vb],join(v.slice(29),rev(v.slice(0,5)))],['Левая стойка с нижним закруглением','Правая нижняя округлая часть','Верхняя округлая часть']);
put('Г',[line(45,45,45,135),line(45,45,83.75,45.0833)],['Стойка сверху вниз','Верхняя горизонталь']);
const g=m('г')[0],ga=g[12],gb=g[13],gt=(65-ga[0])/(gb[0]-ga[0]),gm=[65,ga[1]+gt*(gb[1]-ga[1])];put('г',[[...g.slice(0,13),gm],[gm,...g.slice(13)]],['Верхняя дуга к середине','От середины через нижнюю дугу вправо']);
put('Д',[line(95,45,95,135),[[95,45],...rev(m('Д')[1].slice(0,6))],line(45,135,105,135),line(45,135,45,145),line(105,135,105,145)],['Правая стойка сверху вниз','Верх и левая наклонная вниз','Нижняя горизонталь','Левый нижний штрих','Правый нижний штрих']);
const d=m('д')[0],db=[65,134.9167];put('д',[[...rev(d.slice(17)),db],[...d.slice(8,17),db],d.slice(0,9)],['Левый корпус к основанию','Правая стойка к основанию','Верхняя дуга вправо']);
put('Е',[line(45,45,45,135),line(45,45,84.25,45.0833),line(45,135,84.25,135.0833),m('Е')[0]],['Стойка сверху вниз','Верхняя горизонталь','Нижняя горизонталь','Средняя горизонталь']);
const e=m('е')[0];put('е',[e.slice(10),rev(e.slice(1,11)),e.slice(0,2)],['Внешний контур','Верхняя правая дуга','Средняя горизонталь']);
for(const [c,base]of [['Ё','Е'],['ё','е']])put(c,[...copy(routes[base]),...m(c).slice(-2)],[...steps[base],'Левая точка','Правая точка']);
const Z=m('Ж'),zc=[80,85.4167];put('Ж',[line(80,45,80,135),[...Z[4],zc],[...Z[0],zc],Z[2].slice(1),Z[3]],['Средняя стойка сверху вниз','Верхняя правая ветвь к стойке','Верхняя левая ветвь к стойке','Нижняя левая ветвь','Нижняя правая ветвь']);
const z=m('ж'),zj=[74,104.9167];put('ж',[line(74,75,74,135),[...z[3].slice(0,3),[85.25,104.9167],zj],[...z[0].slice(0,4),zj],z[0].slice(3),z[3].slice(2)],steps['Ж']);
put('З',[join(m('З')[0],rev(m('З')[1])),m('З')[2]],['Верхняя дуга с выходом влево к середине','Нижняя дуга от середины']);put('з',[join(m('з')[0],rev(m('з')[2])),rev(m('з')[1])],steps['З']);
const I=m('И')[0];put('И',[[I[0],I[1]],[I[2],I[3]],[I[2],I[1]]],['Левая стойка сверху вниз','Правая стойка сверху вниз','Диагональ сверху справа вниз влево']);
const i=m('и')[0];put('и',[i.slice(0,-1),rev(i.slice(-2))],['Левая стойка с нижним закруглением','Правая стойка сверху вниз']);
put('Й',[...copy(routes['И']),m('Й')[1]],[...steps['И'],'Верхний знак слева направо']);put('й',[...copy(routes['и']),line(55,45,75,45)],[...steps['и'],'Верхний знак слева направо']);
put('К',[line(45,45,45,135),join(m('К')[2].slice(0,3),rev(m('К')[1])),m('К')[2].slice(2)],['Стойка сверху вниз','Верхняя ветвь целиком к стойке','Нижняя ветвь от развилки']);put('к',[line(44,75,44,135),join(m('к')[3],rev(m('к')[1])),m('к')[2]],steps['К']);
put('Л',[line(95,45,95,135),[[95,45],...rev(m('Л')[0].slice(0,6))]],['Правая стойка сверху вниз','Верх и левая наклонная вниз']);put('л',[line(85,75,85,135),[[85,75],...rev(m('л')[0].slice(0,6))]],steps['Л']);
for(const c of ['М','м']){const p=m(c)[0];put(c,[[p[1],p[0]],[p[3],p[4]],[p[3],p[2]],[p[1],p[2]]],['Левая стойка сверху вниз','Правая стойка сверху вниз','Правая диагональ к середине','Левая диагональ к середине'])}
for(const [c,t,r,mid]of [['Н',45,95,85],['н',75,85,105]])put(c,[line(45,t,45,135),line(r,t,r,135),line(45,mid,r,mid)],['Левая стойка сверху вниз','Правая стойка сверху вниз','Перекладина слева направо']);
for(const c of ['О','о'])put(c,halves(m(c)[0]),[names.leftArc,names.rightArc]);
put('П',[line(45,45,45,135),line(95,45,95,135),line(45,45,95,45)],['Левая стойка сверху вниз','Правая стойка сверху вниз','Верхняя горизонталь']);put('п',[line(45,75,45,135),[[45,75],...m('п')[0].slice(3)]],['Левая стойка сверху вниз','Верх с переходом в правую стойку']);
put('Р',[line(45,45,45,135),bowl(45,95,45,95)],['Стойка сверху вниз','Верхняя округлая часть']);put('р',[line(45,75,45,165),bowl(45,85,75,135)],steps['Р']);
for(const [c,at]of [['С',8],['с',9]])put(c,[m(c)[0].slice(0,at+1),m(c)[0].slice(at)],['Верхняя часть и левая сторона вниз','Нижнее закругление вправо']);
put('Т',[line(70,45,70,135),line(45,45,95,45)],['Стойка сверху вниз','Верхняя горизонталь']);put('т',[line(45,75,45,135),[[45,75],m('т')[0][4]],m('т')[0].slice(4),m('т')[1]],['Левая стойка сверху вниз','Верхняя горизонталь','Правая стойка с закруглением','Средняя стойка сверху вниз']);
for(const c of ['У','у','Ч','ч'])put(c,[m(c)[1],m(c)[0]],['Правая стойка сверху вниз'+('Уу'.includes(c)?' с нижним закруглением':''),'Левая часть вниз и вправо']);
for(const [c,x,t,b]of [['Ф',80,45,135],['ф',75,55,165]])put(c,[line(x,t,x,b),...halves(m(c)[1])],['Средняя стойка сверху вниз',names.leftArc,names.rightArc]);
for(const c of ['Х','х'])put(c,[m(c)[1],m(c)[0]],['Наклонная сверху справа вниз влево','Наклонная сверху слева вниз вправо']);
put('Ц',[m('Ц')[0].slice(0,4),m('Ц')[1],m('Ц')[0].slice(3,5),m('Ц')[0].slice(4)],['Левая стойка сверху вниз','Правая стойка сверху вниз','Нижняя горизонталь','Нижний правый штрих']);
const ts=m('ц')[0],tsj=m('ц')[1].at(-1);put('ц',[[...ts.slice(0,9),tsj],m('ц')[1],[tsj,...ts.slice(9)]],['Левая часть с нижним закруглением','Правая стойка сверху вниз','Выход вправо и вниз']);
put('Ш',[m('Ш')[0].slice(0,4),rev(m('Ш')[0].slice(4)),m('Ш')[1],m('Ш')[0].slice(3,5)],['Левая стойка сверху вниз','Правая стойка сверху вниз','Средняя стойка сверху вниз','Нижняя горизонталь']);put('ш',[m('ш')[0].slice(0,7),m('ш')[0].slice(6,8),rev(m('ш')[0].slice(7)),m('ш')[1]],['Левая часть вниз','Нижняя горизонталь','Правая стойка сверху вниз','Средняя стойка сверху вниз']);
put('Щ',[m('Щ')[0].slice(0,4),m('Щ')[2],m('Щ')[1],m('Щ')[0].slice(3,5),m('Щ')[0].slice(4)],[...steps['Ш'],'Нижний правый штрих']);put('щ',[m('щ')[0].slice(0,9),m('щ')[0].slice(8,10),m('щ')[2],m('щ')[1],m('щ')[0].slice(9)],[...steps['ш'],'Нижний правый штрих']);
for(const [c,x,t,start]of [['Ъ',65,45,7],['ъ',50,75,7]])put(c,[line(x,t,x,135),[...rev(m(c)[0].slice(start)),[x,135]],[[m(c)[0][0][0],t],[x,t]]],['Стойка сверху вниз','Нижняя округлая часть','Верхний штрих слева направо']);
for(const [c,t]of [['Ы',45],['ы',75]])put(c,[line(45,t,45,135),[...rev(m(c)[0].slice(4)),[45,135]],m(c)[1]],['Левая стойка сверху вниз','Округлая часть','Правая стойка сверху вниз']);
for(const [c,t]of [['Ь',45],['ь',75]])put(c,[line(45,t,45,135),[...rev(m(c)[0].slice(3)),[45,135]]],['Стойка сверху вниз','Нижняя округлая часть']);
for(const c of ['Э','э'])put(c,[m(c)[0].slice(0,9),m(c)[0].slice(8),rev(m(c)[1])],['Верхняя часть и правая сторона вниз','Нижнее закругление влево','Средняя горизонталь справа налево']);
for(const [c,t]of [['Ю',45],['ю',75]])put(c,[line(45,t,45,135),...halves(m(c)[2]),m(c)[1]],['Стойка сверху вниз',names.leftArc,names.rightArc,'Соединение слева направо']);
for(const c of ['Я','я'])put(c,copy(original[c].demonstration),['Правая стойка сверху вниз','Округлая часть от верха влево','Наклонная от середины вниз влево']);
const index=JSON.parse(fs.readFileSync(root+'/references/stroke-order/index.json')),sourceURL=index.sources.find(s=>s.id==='LENSK').url,review={};
for(const row of index.rows)for(const [caseName,c]of [['upper',row.letter],['lower',row.letter.toLowerCase()]]){const s=row[caseName];review[c]={steps:steps[c],basis:s.type,source:sourceURL,figure:s.figure,group:s.group,base:s.base||null,adaptation:'Учебный порядок из схемы адаптирован к прямому ГОСТ типа Б. Номера обозначают элементы; совпадающие направленные стыки показываются без искусственного отрыва.'}}
const selectedArg=process.argv.find(a=>a.startsWith('--letters=')),selected=selectedArg?[...new Set([...selectedArg.slice(10)])]:Object.keys(review);for(const c of selected){assert(routes[c]&&steps[c],c+' missing reviewed order');assert.equal(routes[c].length,steps[c].length,c+' route/label mismatch');for(const l of routes[c])assert(l.length>=2&&l.flat().every(Number.isFinite),c+' invalid path')}
const fontFile=root+'/references/isopromat-fonts/demonstration-routes.json',fontRoutes=JSON.parse(fs.readFileSync(fontFile)),instructionFile=root+'/references/isopromat-fonts/writing-instructions.json',instructions=fs.existsSync(instructionFile)?JSON.parse(fs.readFileSync(instructionFile)):{};
for(const c of selected){glyphs[c].demonstration=routes[c];glyphs[c].instruction=review[c];instructions[c]=review[c];fontRoutes[c]=routes[c].map(l=>l.map(([x,y])=>[Number(((x-30)*14).toFixed(6)),Number(((140-y)*14).toFixed(6))]))}
for(const [c,g]of Object.entries(glyphs))for(const key of ['outline','model','revision','bounds','inkBounds','advance'])assert.deepEqual(copy(g[key]),original[c][key],c+' changed '+key);
fs.writeFileSync(file,'// Exact source contours; generated centre routes are prototype teaching paths.\nconst DrawingGlyphs='+JSON.stringify(glyphs)+';\n');fs.writeFileSync(fontFile,JSON.stringify(fontRoutes,null,2)+'\n');fs.writeFileSync(instructionFile,JSON.stringify(instructions,null,2)+'\n');console.log('Reviewed instructions:',selected.join(' '));
