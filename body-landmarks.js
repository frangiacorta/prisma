// Only hand/arm landmarks leave the detector worker. Camera pixels stay local.
const visible=(p,threshold=.75)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??1)>threshold&&(p.presence??1)>threshold;
export function limbPoints(hands={},pose={}){
 const points=[],arms=[],diagnostics=[],p=pose.landmarks?.[0],wrists=[];
 for(const [side,s,e,w] of [['a',11,13,15],['b',12,14,16]]){
  // A trustworthy wrist remains useful even if the shoulder/elbow is occluded.
  if(visible(p?.[w],.5))wrists.push({side,point:p[w]});
  const missing=[[s,'spalla'],[e,'gomito'],[w,'polso']].filter(([i])=>!visible(p?.[i],.5)).map(([,name])=>name);
  diagnostics.push({id:'arm-'+side,missing});
  if(missing.length)continue;
  // Projected segment lengths/ratios cannot validate anatomy: foreshortening
  // can put a visible elbow almost on top of the shoulder. Temporal jump
  // rejection is handled independently by BodyTrackingState.
  const joints=[p[s],p[e],p[w]].map(({x,y})=>({x,y}));arms.push({id:'arm-'+side,joints});
  points.push({id:'arm-'+side,x:(p[s].x+p[e].x+p[w].x)/3,y:(p[s].y+p[e].y+p[w].y)/3,ageMs:0});
 }
 const candidates=[];
 for(const [i,marks] of (hands.landmarks||[]).entries()){
  if(marks.length!==21||![0,5,9,13,17].every(n=>visible(marks[n])))continue;
  const handed=hands.handedness?.[i]?.[0];
  if(!['Left','Right'].includes(handed?.categoryName)||(handed.score??1)<.7)continue;
  // One anatomical anchor in both detectors avoids palm-to-wrist jumps.
  candidates.push({x:marks[0].x,y:marks[0].y,wrist:marks[0],side:handed.categoryName==='Left'?'a':'b'});
 }
 // Match the closest pair globally, never by detector array order.
 // Ambiguous crossings retain pose identity instead of guessing a hand label.
 const used=new Set(),matched=new Set();
 const pairs=candidates.flatMap((h,i)=>wrists.map(w=>({i,side:w.side,d:Math.hypot(h.x-w.point.x,h.y-w.point.y)}))).sort((a,b)=>a.d-b.d);
 for(const pair of pairs){
  if(pair.d>.12||used.has(pair.side)||matched.has(pair.i))continue;
  const other=pairs.find(q=>q.i===pair.i&&q.side!==pair.side);
  if(other&&Math.abs(other.d-pair.d)<.04)continue;
  const h=candidates[pair.i];used.add(pair.side);matched.add(pair.i);
  points.push({id:'hand-'+pair.side,x:h.x,y:h.y,ageMs:0});
 }
 // With a visible body, unmatched hands must not acquire an unrelated ID.
 if(!p)for(const h of candidates){if(used.has(h.side))continue;used.add(h.side);points.push({id:'hand-'+h.side,x:h.x,y:h.y,ageMs:0});}
 // A visible pose wrist can continue broad movement when fingers turn edge-on.
 for(const w of wrists)if(!used.has(w.side))points.push({id:'hand-'+w.side,x:w.point.x,y:w.point.y,ageMs:0,partial:true});
 return {points,arms,diagnostics};
}
