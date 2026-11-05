// Current guided-letter timings. Coordinates remain in the existing ink store.
class WritingTimes {
 constructor(storage,onError=()=>{}){this.storage=storage;this.onError=onError;this.key='gost-writing-times-v1';this.dirty=new Map();this.state=this.read()}
 static empty(){return {version:1,books:{}}}
 static hash(ink){const text=JSON.stringify(ink);let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16)}
 static eligible(id){return /^gost-file-b90-(?:upper|lower)-\d{1,3}$/.test(id)}
 static validate(value){
  const out=this.empty();if(value?.version!==1||!value.books||typeof value.books!=='object')return out;
  for(const [book,records]of Object.entries(value.books).slice(-200)){
   if(!/^letter-worksheet-(?:v[1-3]-[0-4]|gost-[a-f0-9]+-[a-f0-9]+-[0-4])$/.test(book)||!records||typeof records!=='object')continue;
   const clean={};for(const [id,r]of Object.entries(records).slice(-200))if(this.eligible(id)&&r&&/^[a-f0-9]{1,8}$/.test(r.hash)&&Number.isSafeInteger(r.strokes)&&r.strokes>0&&r.strokes<=10000&&Number.isFinite(r.ms)&&r.ms>=0&&r.ms<=86400000)clean[id]={hash:r.hash,strokes:r.strokes,ms:Math.round(r.ms)};
   if(Object.keys(clean).length)out.books[book]=clean;
  }return out;
 }
 read(){try{return WritingTimes.validate(JSON.parse(this.storage.getItem(this.key)||'null'))}catch{return WritingTimes.empty()}}
 synchronize(){const next=this.read();for(const [book,changes]of this.dirty){const records=next.books[book]||={};for(const [id,r]of changes)if(r)records[id]=structuredClone(r);else delete records[id]}this.state=next}
 static matches(r,ink){return !!r&&!!ink?.length&&r.strokes===ink.length&&r.hash===this.hash(ink)}
 duration(book,id,ink){const r=this.state.books[book]?.[id];return WritingTimes.matches(r,ink)?r.ms:null}
 set(book,id,record){if(!WritingTimes.eligible(id))return;const records=this.state.books[book]||={};if(record)records[id]=structuredClone(record);else delete records[id];if(!this.dirty.has(book))this.dirty.set(book,new Map());this.dirty.get(book).set(id,record?structuredClone(record):null)}
 append(book,id,before,after,elapsed){
  if(!WritingTimes.eligible(id))return;const previous=before?.length?this.duration(book,id,before):0;
  // Missing old timing cannot be reconstructed from newly appended strokes.
  if(previous===null||!Number.isFinite(elapsed)||elapsed<0||previous+elapsed>86400000){this.set(book,id,null);return}
  this.set(book,id,{hash:WritingTimes.hash(after),strokes:after.length,ms:Math.round(previous+elapsed)});
 }
 snapshot(book,ids){const out={};for(const id of ids){const r=this.state.books[book]?.[id];if(r)out[id]=structuredClone(r)}return out}
 restore(book,ids,records){for(const id of ids)this.set(book,id,records[id]||null)}
 commit(){if(!this.dirty.size)return true;this.synchronize();try{this.storage.setItem(this.key,JSON.stringify(this.state));this.dirty.clear();return true}catch{this.onError();return false}}
 static merge(current,incoming,inkForBook){
  const a=this.validate(current),b=this.validate(incoming),out=this.empty();
  for(const book of new Set([...Object.keys(a.books),...Object.keys(b.books)])){
   const ink=inkForBook(book),records={};for(const id of new Set([...Object.keys(a.books[book]||{}),...Object.keys(b.books[book]||{})])){const r=[a.books[book]?.[id],b.books[book]?.[id]].find(r=>this.matches(r,ink[id]));if(r)records[id]=structuredClone(r)}if(Object.keys(records).length)out.books[book]=records;
  }return out;
 }
}
