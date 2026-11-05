// Same endpoint-preserving weighted smoothing as the original copybook.
// Presentation only: raw points remain the source for storage and assessment.
const PenAppearance={
 cache:new WeakMap(),
 smooth(points,level=0,cache=true){
  if(!level||points.length<3)return points;
  let saved=cache?this.cache.get(points):null;if(saved?.has(level))return saved.get(level);
  let result=points;for(let pass=0;pass<Math.min(2,level);pass++)result=result.map((p,i)=>i===0||i===result.length-1?p:[(result[i-1][0]+p[0]*2+result[i+1][0])/4,(result[i-1][1]+p[1]*2+result[i+1][1])/4]);
  if(cache){if(!saved){saved=new Map();this.cache.set(points,saved)}saved.set(level,result)}return result;
 },
 preview:[[10,30],[25,16],[40,22],[55,8],[70,18],[85,29],[100,24],[115,33],[130,17],[145,12],[160,25],[175,19],[190,27],[210,13]]
};
