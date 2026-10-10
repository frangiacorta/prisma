// Scene-space artistic fields. Coordinates match the particle camera at every aspect ratio.
export const MAX_FORCE_POINTS=8;
// The upper end of repulsion becomes an exclusion volume. Lower forces retain
// the existing soft field; increasing force grows the protected core smoothly.
export const forceBarrierGLSL=`
uniform highp int uForceCount;uniform vec4 uForcePoints[11];uniform vec2 uForceOptions[11];
float forceCore(int i){return uForceOptions[i].x*smoothstep(1.2,3.,-uForcePoints[i].w);}
bool insideForceCore(vec3 p){
 for(int i=0;i<11;i++){if(i>=uForceCount)break;float r=forceCore(i);if(r>0.&&distance(p,uForcePoints[i].xyz)<r*.99999)return true;}return false;
}
vec3 excludeForceCores(vec3 p){
 for(int pass=0;pass<3;pass++){
  bool moved=false;
  for(int i=0;i<11;i++){if(i>=uForceCount)break;float r=forceCore(i);if(r<=0.)continue;
   vec3 d=p-uForcePoints[i].xyz;float len=length(d);
   if(len<r){vec3 n=len>1e-7?d/len:normalize(vec3(.73,.51,.45));p=uForcePoints[i].xyz+n*(r+max(.00001,r*.00001));moved=true;}
  }if(!moved)return p;
 }
 // Overlapping spheres can trap alternating projections. Escape along a ray
 // beyond every intersected sphere, including ones not containing its origin.
 if(insideForceCore(p)){
  vec3 ray=normalize(vec3(.73,.51,.45));float travel=0.;
  for(int i=0;i<11;i++){if(i>=uForceCount)break;float r=forceCore(i);if(r<=0.)continue;
   vec3 d=p-uForcePoints[i].xyz;float b=dot(d,ray),disc=b*b-dot(d,d)+r*r;
   if(disc>=0.)travel=max(travel,-b+sqrt(disc)+max(.00001,r*.00001));
  }p+=ray*travel;
 }return p;
}`;
export function excludeForcePositions(positions,forces){
 const cores=forces.filter(f=>f.enabled&&f.strength<-1.2).map(f=>{const t=Math.min(1,(-f.strength-1.2)/1.8);return {...f,core:f.radius*t*t*(3-2*t)};});
 if(!cores.length)return positions;
 const ray=[.73,.51,.45],norm=Math.hypot(...ray);for(let k=0;k<3;k++)ray[k]/=norm;
 for(let j=0;j<positions.length;j+=3){let p=Array.from(positions.subarray(j,j+3));
  for(let pass=0;pass<3;pass++){let moved=false;for(const f of cores){const d=[p[0]-f.x,p[1]-f.y,p[2]-f.z],len=Math.hypot(...d);if(len<f.core){const r=f.core+Math.max(.00001,f.core*.00001);p=[f.x,f.y,f.z].map((v,k)=>v+r*(len>1e-7?d[k]/len:ray[k]));moved=true;}}if(!moved)break;}
  if(cores.some(f=>Math.hypot(p[0]-f.x,p[1]-f.y,p[2]-f.z)<f.core*.99999)){let travel=0;for(const f of cores){const d=[p[0]-f.x,p[1]-f.y,p[2]-f.z],b=d.reduce((a,v,k)=>a+v*ray[k],0),disc=b*b-d.reduce((a,v)=>a+v*v,0)+f.core*f.core;if(disc>=0)travel=Math.max(travel,-b+Math.sqrt(disc)+Math.max(.00001,f.core*.00001));}p=p.map((v,k)=>v+ray[k]*travel);}
  positions.set(p,j);
 }return positions;
}
export const FORCE_META={x:['Posizione X',-12,12,.01],y:['Posizione Y',-12,12,.01],z:['Profondità',-4,4,.01],strength:['Forza · − respinge / + attira',-3,3,.01],radius:['Raggio del campo 3D',.1,5,.01],swirl:['Avvolgimento',-2,2,.01]};
export function normalizeForcePoints(raw){
 if(!Array.isArray(raw))return [];
 return raw.filter(p=>p&&typeof p==='object'&&!Array.isArray(p)).slice(0,MAX_FORCE_POINTS).map((p,i)=>{
  const q={id:i+1,enabled:p.enabled!==false,x:0,y:0,z:0,strength:1,radius:1.2,swirl:0};
  for(const [k,[,lo,hi]] of Object.entries(FORCE_META))if(Number.isFinite(p[k]))q[k]=Math.max(lo,Math.min(hi,p[k]));
  return q;
 });
}
export function screenToForce(x,y,aspect,z=0){const depth=Math.max(2,7.5-z);return {x:(2*x-1)*aspect*depth/2.6,y:(1-2*y)*depth/2.6};}
export function forceToScreen(p,aspect){const depth=Math.max(2,7.5-p.z);return {x:.5+p.x*2.6/depth/aspect*.5,y:.5-p.y*2.6/depth*.5,radius:p.radius*2.6/depth*.5};}
export function addForcePoint(state,kind,x=.5,y=.5,aspect=1){
 const points=state.forcePoints||(state.forcePoints=[]);if(points.length>=MAX_FORCE_POINTS)return null;
 const p={id:Math.max(0,...points.map(p=>p.id))+1,enabled:true,...screenToForce(x,y,aspect),z:0,strength:kind==='repel'?-1.2:1.2,radius:1.2,swirl:0};points.push(p);return p;
}
export function forcePanel(state,selected){
 const points=state.forcePoints||[],p=points.find(p=>p.id===selected)||points[0];
 const slider=key=>{const [label,min,max,step]=FORCE_META[key],v=p[key];return `<div class="param"><div class="param-line"><label for="force-${key}">${label}</label><input type="number" class="number" data-force-number="${key}" aria-label="${label}: valore" min="${min}" max="${max}" step="${step}" value="${Number(v.toFixed(3))}"></div><input id="force-${key}" type="range" data-force-param="${key}" min="${min}" max="${max}" step="${step}" value="${v}" style="--fill:${(v-min)/(max-min)*100}%"></div>`;};
 return `<section class="control-section" id="force-controls"><h2 class="section-title">PUNTI SULLA SCENA · ${points.length}/${MAX_FORCE_POINTS}</h2><div class="force-actions"><button class="outline" data-force-mode="attract">⊕ Attira</button><button class="outline" data-force-mode="repel">⊖ Respingi</button></div><p class="help">Scegli uno strumento e fai clic sulla scena. Trascina i punti; la rotella sul punto regola il raggio, Maiusc + rotella la profondità. Anche con il tocco.</p><div class="force-list">${points.map(q=>`<button class="force-chip ${q===p?'selected':''}" data-force-select="${q.id}" aria-label="Seleziona punto ${q.id}">${q.strength<0?'⊖':'⊕'} ${q.id}${q.enabled?'':' · spento'}</button>`).join('')}</div>${p?`<label class="check"><input type="checkbox" data-force-enabled ${p.enabled?'checked':''}>Punto ${p.id} attivo</label><div class="force-actions"><button class="outline" data-force-set="-3">⊖⊖ Barriera</button><button class="outline" data-force-set="3">⊕⊕ Attira forte</button></div>${['strength','radius','swirl','z'].map(slider).join('')}<details class="control-details"><summary>Posizione precisa</summary>${['x','y'].map(slider).join('')}</details><div class="force-actions"><button class="quiet" data-force-invert>Inverti forza</button><button class="quiet danger" data-force-remove>Rimuovi punto</button></div><button class="quiet full" data-force-clear>Rimuovi tutti i punti</button>`:''}<p class="help">Forza −3: barriera completa nel raggio. Tra −1,2 e −3 il nucleo protetto cresce gradualmente; + attira e − respinge. Il campo è una sfera 3D: regola anche Profondità, perché i punti davanti o dietro possono apparire dentro il cerchio. I campi piegano anche le scie. Restano nella scena durante la rotazione della materia e si salvano nel preset. I simboli non compaiono nei video.</p></section>`;
}
