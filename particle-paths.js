// Artist-drawn guides in scene space. Curves are resampled by arc length so
// drawing slowly does not cause particles to slow down at densely sampled knots.
export const MAX_FORCE_PATHS=4,MAX_PATH_KNOTS=32,PATH_SAMPLES=128;
export const PATH_META={
 coverage:['Particelle coinvolte · %',0,100,1],
 strength:['Forza',0,3,.01],
 radius:['Distanza di influenza',.05,5,.01],
 adherence:['Aderenza al percorso',0,1,.01],
 orbitRadius:['Distanza di satellite',0,2,.01],
 orbitTurns:['Giri di satellite per loop',1,12,1],
 release:['Tempo libero dal percorso · %',0,100,1],
 softness:['Morbidezza di ingresso e uscita',0,1,.01],
 cycles:['Passaggi per loop',1,8,1],
 phase:['Sfasamento',0,1,.01],
 z:['Profondità',-4,4,.01]
};
export const PATH_DEFAULTS={enabled:true,mode:'follow',closed:false,coverage:65,strength:1.8,radius:1.8,adherence:.85,orbitRadius:.15,orbitTurns:1,release:0,softness:.75,cycles:1,phase:0,z:0,direction:1};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function pathValue(key,value){const [,lo,hi,step]=PATH_META[key];return step===1?Math.round(clamp(value,lo,hi)):clamp(value,lo,hi);}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function resamplePolyline(points,count,closed=false){
 if(points.length<2)return points.map(p=>({...p}));
 const line=closed?[...points,points[0]]:points,lengths=[0];
 for(let i=1;i<line.length;i++)lengths.push(lengths[i-1]+dist(line[i],line[i-1]));
 const total=lengths.at(-1);if(total<1e-6)return [line[0]];
 let j=1;return Array.from({length:count},(_,i)=>{if(i===0)return {...line[0]};if(!closed&&i===count-1)return {...line.at(-1)};const d=total*i/(closed?count:count-1);while(j<line.length-1&&lengths[j]<d)j++;const a=line[j-1],b=line[j],t=(d-lengths[j-1])/Math.max(1e-9,lengths[j]-lengths[j-1]);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};});
}
export function normalizeForcePaths(raw){
 if(!Array.isArray(raw))return [];
 const out=[],ids=new Set();for(const item of raw){
  if(!item||typeof item!=='object'||!Array.isArray(item.points))continue;
  let points=[];for(const p of item.points.slice(0,4096)){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;const q={x:clamp(p.x,-12,12),y:clamp(p.y,-12,12)};if(!points.length||dist(q,points.at(-1))>1e-4)points.push(q);}
  const closed=!!item.closed;if(closed&&points.length>2&&dist(points[0],points.at(-1))<1e-4)points.pop();
  if(points.length<2)continue;if(points.length>MAX_PATH_KNOTS)points=resamplePolyline(points,MAX_PATH_KNOTS,closed);
  let id=Number.isSafeInteger(item.id)&&item.id>0&&item.id<=999999?item.id:1;while(ids.has(id))id++;ids.add(id);
  const p={...PATH_DEFAULTS,id,points,closed:closed&&points.length>2,mode:item.mode==='avoid'?'avoid':'follow',enabled:item.enabled!==false,direction:item.direction===-1?-1:1};
  for(const key of Object.keys(PATH_META))if(Number.isFinite(item[key]))p[key]=pathValue(key,item[key]);
  out.push(p);if(out.length===MAX_FORCE_PATHS)break;
 }return out;
}
export function newForcePath(state,points,mode='follow',closed=false){
 const paths=state.forcePaths||[];let id=Math.max(0,...paths.map(p=>p.id))+1;if(id>999999)id=1;while(paths.some(p=>p.id===id))id++;
 return normalizeForcePaths([{...PATH_DEFAULTS,id,points,mode,closed}])[0]||null;
}
export function samplePath(path,count=PATH_SAMPLES){
 const ps=path.points,n=ps.length,dense=[],at=i=>ps[path.closed?(i+n)%n:clamp(i,0,n-1)];
 for(let i=0;i<(path.closed?n:n-1);i++){
  const a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);
  for(let j=0;j<16;j++){const t=j/16,t2=t*t,t3=t2*t,p={};for(const k of ['x','y'])p[k]=.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);dense.push(p);}
 }
 if(!path.closed)dense.push({...ps.at(-1)});
 return resamplePolyline(dense,count,path.closed);
}
export function packPathCurves(paths){
 const data=new Float32Array(PATH_SAMPLES*MAX_FORCE_PATHS*4),bounds=[];
 paths.forEach((p,row)=>{const curve=samplePath(p);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(let i=0;i<PATH_SAMPLES;i++){const a=curve[p.closed?(i+PATH_SAMPLES-1)%PATH_SAMPLES:Math.max(0,i-1)],b=curve[p.closed?(i+1)%PATH_SAMPLES:Math.min(PATH_SAMPLES-1,i+1)],q=curve[i];data.set([q.x,q.y,(b.x-a.x)*.5,(b.y-a.y)*.5],(row*PATH_SAMPLES+i)*4);minX=Math.min(minX,q.x);minY=Math.min(minY,q.y);maxX=Math.max(maxX,q.x);maxY=Math.max(maxY,q.y);}
  const margin=p.radius+.1;bounds.push([minX-margin,minY-margin,maxX-minX+margin*2,maxY-minY+margin*2]);
 });return {data,bounds};
}
export function ellipseKnots(a,b){return Array.from({length:8},(_,i)=>{const t=i*Math.PI/4;return {x:(a.x+b.x)/2+Math.abs(b.x-a.x)/2*Math.cos(t),y:(a.y+b.y)/2+Math.abs(b.y-a.y)/2*Math.sin(t)};});}
