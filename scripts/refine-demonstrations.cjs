// Author readable teaching starts; never replace the source contour/assessment.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('concepts/components/glyphs.js','utf8'),context);const glyphs=vm.runInContext('DrawingGlyphs',context),original=JSON.parse(JSON.stringify(glyphs)),m=c=>glyphs[c].model;
const concat=(a,b)=>[...a,...b.slice(Math.hypot(a.at(-1)[0]-b[0][0],a.at(-1)[1]-b[0][1])<.5?1:0)];
const arc=(x,y,r,a,b)=>Array.from({length:17},(_,i)=>{const t=(a+(b-a)*i/16)*Math.PI/180;return [x+r*Math.cos(t),y+r*Math.sin(t)]});
const bowl=(left,right,top,bottom,r=15)=>[[left,top],[right-r,top],...arc(right-r,top+r,r,-90,0).slice(1),[right,bottom-r],...arc(right-r,bottom-r,r,0,90).slice(1),[left,bottom]];
// Lensk fig5/group4: each half of O descends independently. Split the exact
// existing loop at its top/bottom centre intersections; do not redraw its shape.
const twoHalves=model=>{
 const ring=model[0].slice(0,-1),mid=(Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2,hits=[];
 for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(a[0]===b[0])continue;const t=(mid-a[0])/(b[0]-a[0]);if(t>=0&&t<=1)hits.push({i,p:[mid,a[1]+t*(b[1]-a[1])]})}
 hits.sort((a,b)=>a.p[1]-b.p[1]);assert.equal(hits.length,2);const [top,bottom]=hits;assert(top.i<bottom.i);
 return [[top.p,...ring.slice(top.i+1,bottom.i+1),bottom.p],[top.p,...ring.slice(0,top.i+1).reverse(),...ring.slice(bottom.i+1).reverse(),bottom.p]];
};
const changes={
 'О':twoHalves(m('О')),
 'о':twoHalves(m('о')),
 'И':[[[45,45],[45,135],[95,45],[95,135]]],
 // Lensk p36, fig6/group1: outer C, upper-right arc, middle bar.
 // Reorder exact existing edges; no new shape or assessment revision.
 'е':[m('е')[0].slice(10),m('е')[0].slice(1,11).reverse(),m('е')[0].slice(0,2)],
 'Й':[[[45,45],[45,135],[95,45],[95,135]],[[60,25],[80,25]]],
 'Р':[[[45,45],[45,135]],bowl(45,95,45,95)],
 'р':[[[45,75],[45,165]],bowl(45,85,75,135)],
 'В':[[[45,45],[45,135]],bowl(45,90,45,85),bowl(45,95,85,135)],
 'Е':[m('Е')[1],m('Е')[0]],
 'Ё':[m('Ё')[1],m('Ё')[0],...m('Ё').slice(2)],
 'Д':[m('Д')[1],m('Д')[0]],
 // Lensk technical-graphics fig5/group2: stem, full upper arm to stem,
 // lower leg from the branch. Do not draw a floating V before its connector.
 'К':[m('К')[0],concat(m('К')[2].slice(0,3),[...m('К')[1]].reverse()),m('К')[2].slice(2)],
 'к':[m('к')[0],concat(m('к')[3],[...m('к')[1]].reverse()),m('к')[2]],
 'З':[concat(m('З')[0],m('З')[2]),m('З')[1]],
 'з':[concat(m('з')[0],[...m('з')[1]].reverse()),m('з')[2]],
 'Ж':[m('Ж')[1],concat(m('Ж')[0],m('Ж')[2].slice(1)),concat(m('Ж')[4],m('Ж')[3]),[...m('Ж')[2].slice(0,2)].reverse()],
 'ж':[m('ж')[2],m('ж')[0],m('ж')[3],m('ж')[1]],
 'б':[m('б')[0],concat(m('б')[1],m('б')[2])]
};
// The lowercase в has a small upper loop and a larger bowl. Start at its top,
// retaining every centre segment of both exact loops, rather than the junction.
const v=m('в')[0],junction=v.findIndex((p,i)=>i>5&&Math.hypot(p[0]-v[0][0],p[1]-v[0][1])<.01),prefix=v.slice(0,5),upper=[...v.slice(junction),...[...prefix].reverse().slice(1)],ring=upper.slice(0,-1),at=ring.reduce((best,p,i)=>p[1]<ring[best][1]?i:best,0);changes['в']=[[...ring.slice(at),...ring.slice(0,at),ring[at]],v.slice(0,junction+1)];
const letters=process.argv.find(a=>a.startsWith('--letters='))?.slice(10),selected=Object.keys(changes).filter(c=>!letters||letters.includes(c));
const target='references/isopromat-fonts/demonstration-routes.json',routes=JSON.parse(fs.readFileSync(target));
for(const c of selected){glyphs[c].demonstration=changes[c];routes[c]=changes[c].map(line=>line.map(([x,y])=>[Number(((x-30)*14).toFixed(6)),Number(((140-y)*14).toFixed(6))]))}
for(const [c,g] of Object.entries(glyphs))for(const key of ['outline','model','revision','inkBounds','bounds'])assert.deepEqual(JSON.parse(JSON.stringify(g[key])),original[c][key],c+' '+key+' changed');
fs.writeFileSync('concepts/components/glyphs.js','// Exact source contours; generated centre routes are prototype teaching paths.\nconst DrawingGlyphs='+JSON.stringify(glyphs)+';\n');fs.writeFileSync(target,JSON.stringify(routes,null,2)+'\n');console.log('Authored demonstrations:',selected.join(' '));
