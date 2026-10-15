// Only hand/arm landmarks leave the detector worker. Camera pixels stay local.
const visible=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>.55&&(p.presence??1)>.55;
export function limbPoints(hands={},pose={}){
 const points=[],arms=[],p=pose.landmarks?.[0],wrists=[];
 for(const [side,s,e,w] of [['a',11,13,15],['b',12,14,16]]){
  if(visible(p?.[w]))wrists.push({side,point:p[w]});
  if(![s,e,w].every(i=>visible(p?.[i])))continue;
  const joints=[p[s],p[e],p[w]].map(({x,y})=>({x,y}));arms.push({id:'arm-'+side,joints});
  points.push({id:'arm-'+side,x:(p[s].x+p[e].x+p[w].x)/3,y:(p[s].y+p[e].y+p[w].y)/3,ageMs:0});
 }
 const candidates=[];
 for(const [i,marks] of (hands.landmarks||[]).entries()){
  if(marks.length!==21||![0,5,9,13,17].every(n=>visible(marks[n])))continue;
  const palm=[0,5,9,13,17].map(n=>marks[n]);
  candidates.push({x:palm.reduce((a,v)=>a+v.x,0)/5,y:palm.reduce((a,v)=>a+v.y,0)/5,wrist:marks[0],side:hands.handedness?.[i]?.[0]?.categoryName==='Left'?'a':'b'});
 }
 // Prefer pose wrists for a consistent identity when hands cross or turn.
 const used=new Set();
 for(const h of candidates){
  const closest=wrists.filter(w=>!used.has(w.side)).sort((a,b)=>Math.hypot(h.wrist.x-a.point.x,h.wrist.y-a.point.y)-Math.hypot(h.wrist.x-b.point.x,h.wrist.y-b.point.y))[0];
  const side=closest&&Math.hypot(h.wrist.x-closest.point.x,h.wrist.y-closest.point.y)<.18?closest.side:h.side;
  if(used.has(side))continue;used.add(side);points.push({id:'hand-'+side,x:h.x,y:h.y,ageMs:0});
 }
 // A visible pose wrist can continue broad movement when fingers turn edge-on.
 for(const w of wrists)if(!used.has(w.side))points.push({id:'hand-'+w.side,x:w.point.x,y:w.point.y,ageMs:0,partial:true});
 return {points,arms};
}
