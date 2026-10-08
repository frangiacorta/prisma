// Scene-space artistic fields. Coordinates match the particle camera at every aspect ratio.
export const MAX_FORCE_POINTS=8;
export const FORCE_META={x:['Posizione X',-12,12,.01],y:['Posizione Y',-12,12,.01],z:['Profondità',-4,4,.01],strength:['Forza · − respinge / + attira',-3,3,.01],radius:['Raggio di influenza',.1,5,.01],swirl:['Avvolgimento',-2,2,.01]};
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
 return `<section class="control-section" id="force-controls"><h2 class="section-title">PUNTI SULLA SCENA · ${points.length}/${MAX_FORCE_POINTS}</h2><div class="force-actions"><button class="outline" data-force-mode="attract">⊕ Attira</button><button class="outline" data-force-mode="repel">⊖ Respingi</button></div><p class="help">Scegli uno strumento e fai clic sulla scena. Trascina i punti; la rotella sul punto regola il raggio, Maiusc + rotella la profondità. Anche con il tocco.</p><div class="force-list">${points.map(q=>`<button class="force-chip ${q===p?'selected':''}" data-force-select="${q.id}" aria-label="Seleziona punto ${q.id}">${q.strength<0?'⊖':'⊕'} ${q.id}${q.enabled?'':' · spento'}</button>`).join('')}</div>${p?`<label class="check"><input type="checkbox" data-force-enabled ${p.enabled?'checked':''}>Punto ${p.id} attivo</label>${['strength','radius','swirl','z'].map(slider).join('')}<details class="control-details"><summary>Posizione precisa</summary>${['x','y'].map(slider).join('')}</details><div class="force-actions"><button class="quiet" data-force-invert>Inverti forza</button><button class="quiet danger" data-force-remove>Rimuovi punto</button></div><button class="quiet full" data-force-clear>Rimuovi tutti i punti</button>`:''}<p class="help">I campi piegano anche le scie. Restano nella scena durante la rotazione della materia e si salvano nel preset. I simboli non compaiono nei video.</p></section>`;
}
