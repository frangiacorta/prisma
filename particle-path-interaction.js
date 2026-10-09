import {MAX_FORCE_PATHS,PATH_META,pathValue,newForcePath,samplePath,ellipseKnots} from './particle-paths.js?v=285a9866eee5';
import {screenToForce,forceToScreen} from './particle-forces.js?v=285a9866eee5';

export function mountParticlePaths({canvas,board,getState,getMode,setMode,remember,mark,renderControls,showTab,toast}){
 const overlay=document.querySelector('#guide-handles'),controls=document.querySelector('#controls');
 let selected=null,kind='free',drag=null,redraw=false,before=null,recorded=false,paintKey='';
 const active=()=>getState().engine==='particles'&&['guide','avoid'].includes(getMode());
 const paths=()=>getState().forcePaths||[];
 const current=()=>paths().find(p=>p.id===selected);
 const pointer=(e,z=0)=>{const r=canvas.getBoundingClientRect();return screenToForce((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height,r.width/r.height,z);};
 function draftPoints(){if(!drag?.drawing)return [];const a=drag.points[0],b=drag.points.at(-1);return kind==='ellipse'?ellipseKnots(a,b):kind==='line'?[a,b]:drag.points;}
 function sync(){
  for(const k of ['guide','avoid'])document.querySelector('#'+k+'-tool').hidden=getState().engine!=='particles';
  overlay.toggleAttribute('hidden',!active());canvas.classList.toggle('drawing-guide',active());
  if(!paths().some(p=>p.id===selected))selected=paths()[0]?.id??null;
  if(!active())return;
  const w=board.clientWidth,h=board.clientHeight,key=JSON.stringify([paths(),selected,w,h,drag?.drawing?draftPoints():null]);if(paintKey===key)return;paintKey=key;
  overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const screen=(q,z)=>{const p=forceToScreen({...q,z},w/h);return {x:p.x*w,y:p.y*h};};
  const svgLine=(ps,z,closed)=>ps.map((q,i)=>{const p=screen(q,z);return `${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;}).join(' ')+(closed?' Z':'');
  overlay.innerHTML=paths().map(p=>{
   const d=svgLine(samplePath(p),p.z,p.closed),sel=p.id===selected;
   return `<g class="guide-shape ${p.mode==='avoid'?'avoid':''} ${sel?'selected':''} ${p.enabled?'':'disabled'}"><path class="guide-hit" data-guide-id="${p.id}" d="${d}" tabindex="0" role="button" aria-label="Trascina percorso ${p.id}"/><path class="guide-line" d="${d}"/>${sel?p.points.map((q,i)=>{const a=screen(q,p.z);return `<circle class="guide-knot" data-guide-id="${p.id}" data-guide-knot="${i}" cx="${a.x}" cy="${a.y}" r="5" tabindex="0" role="button" aria-label="Nodo ${i+1} del percorso ${p.id}"/>`;}).join(''):''}</g>`;
  }).join('')+(drag?.drawing?`<path class="guide-draft ${getMode()==='avoid'?'avoid':''}" d="${svgLine(draftPoints(),drag.z,kind==='ellipse')}"/>`:'');
 }
 function syncInputs(){const p=current();if(!p)return;for(const [key,[,lo,hi]] of Object.entries(PATH_META))for(const el of controls.querySelectorAll(`[data-guide-param="${key}"],[data-guide-number="${key}"]`)){if(el!==document.activeElement)el.value=Number(p[key].toFixed(3));el.style.setProperty('--fill',(p[key]-lo)/(hi-lo)*100+'%');}}
 const cancel=()=>{drag=null;paintKey='';sync();};
 canvas.addEventListener('pointerdown',e=>{
  if(!active())return;e.preventDefault();e.stopImmediatePropagation();if(e.button>0||drag)return;
  if(paths().length>=MAX_FORCE_PATHS&&!redraw){toast('Fino a 4 percorsi: ridisegna o rimuovi quello selezionato.');return;}
  const z=redraw&&current()?current().z:0;drag={drawing:true,id:e.pointerId,z,points:[pointer(e,z)],startX:e.clientX,startY:e.clientY};canvas.setPointerCapture(e.pointerId);sync();
 },true);
 overlay.addEventListener('pointerdown',e=>{
  const el=e.target.closest('[data-guide-id]');if(!el||drag||e.button>0)return;e.preventDefault();e.stopPropagation();
  selected=+el.dataset.guideId;const p=current();remember();drag={drawing:false,id:e.pointerId,start:pointer(e,p.z),points:structuredClone(p.points),knot:el.hasAttribute('data-guide-knot')?+el.dataset.guideKnot:null};
  overlay.setPointerCapture(e.pointerId);renderControls();sync();
 });
 function move(e){
  if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
  if(drag.drawing){const q=pointer(e,drag.z),last=drag.points.at(-1),r=canvas.getBoundingClientRect(),threshold=3/r.height*(7.5-drag.z)/1.3;
   if(Math.hypot(q.x-last.x,q.y-last.y)>=threshold&&drag.points.length<4096)drag.points.push(q);sync();return;
  }
  const p=current();if(!p)return;const q=pointer(e,p.z),dx=q.x-drag.start.x,dy=q.y-drag.start.y;
  p.points=drag.points.map((point,i)=>drag.knot===null||i===drag.knot?{x:Math.max(-12,Math.min(12,point.x+dx)),y:Math.max(-12,Math.min(12,point.y+dy))}:{...point});mark();
 }
 function end(e){
  if(!drag||drag.id!==e.pointerId)return;e.stopImmediatePropagation();
  if(!drag.drawing){drag=null;return;}
  const span=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);
  if(span<8&&kind!=='free'||drag.points.length<2){cancel();toast('Trascina sulla scena per disegnare un percorso.');return;}
  let points=draftPoints(),closed=kind==='ellipse';
  if(kind==='free'&&points.length>4){const r=canvas.getBoundingClientRect(),limit=16/r.height*(7.5-drag.z)/1.3;closed=Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<limit;if(closed)points.pop();}
  const p=newForcePath(getState(),points,getMode()==='avoid'?'avoid':'follow',closed);
  if(p){remember();if(redraw&&current())Object.assign(current(),{points:p.points,closed:p.closed});else{p.z=drag.z;getState().forcePaths=[...paths(),p];selected=p.id;}redraw=false;drag=null;mark();renderControls();toast('Percorso salvato · regola quante particelle lo seguono in Moto.');}else cancel();
 }
 for(const el of [canvas,overlay]){el.addEventListener('pointermove',move,true);el.addEventListener('pointerup',end,true);for(const type of ['pointercancel','lostpointercapture'])el.addEventListener(type,e=>{if(drag?.id===e.pointerId)cancel();},true);}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag?.drawing){e.preventDefault();cancel();}});
 overlay.addEventListener('keydown',e=>{
  const el=e.target.closest('[data-guide-id]');if(!el)return;selected=+el.dataset.guideId;const p=current();
  if(['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();remember();getState().forcePaths=paths().filter(q=>q.id!==selected);mark();renderControls();}
  else if(e.key.startsWith('Arrow')){e.preventDefault();e.stopPropagation();remember();const k=['ArrowLeft','ArrowRight'].includes(e.key)?'x':'y',v=['ArrowRight','ArrowUp'].includes(e.key)?.06:-.06,index=el.hasAttribute('data-guide-knot')?+el.dataset.guideKnot:null;
   p.points.forEach((q,i)=>{if(index===null||index===i)q[k]=Math.max(-12,Math.min(12,q[k]+v));});mark();overlay.querySelector(`[data-guide-id="${p.id}"]${index===null?'.guide-hit':`[data-guide-knot="${index}"]`}`)?.focus();
  }
 });
 const isInput=el=>el.matches('[data-guide-param],[data-guide-number],[data-guide-flag],[data-guide-select]');
 for(const type of ['pointerdown','focusin'])controls.addEventListener(type,e=>{if(isInput(e.target)&&!before){before=structuredClone(getState());recorded=false;}});
 controls.addEventListener('focusout',e=>{if(isInput(e.target)){before=null;recorded=false;}});
 controls.addEventListener('input',e=>{const el=e.target,key=el.dataset.guideParam||el.dataset.guideNumber;if(!PATH_META[key]||!current()||el.value===''||!Number.isFinite(+el.value))return;if(!recorded){remember(before||getState());recorded=true;}current()[key]=pathValue(key,+el.value);mark();syncInputs();});
 controls.addEventListener('change',e=>{
  const el=e.target;if(el.id==='guide-kind'){kind=el.value;redraw=false;return;}if(!isInput(el)||!current())return;
  if(el.dataset.guideFlag||el.dataset.guideSelect){remember(before||getState());if(el.dataset.guideFlag)current()[el.dataset.guideFlag]=el.checked;else current()[el.dataset.guideSelect]=el.dataset.guideSelect==='direction'?Number(el.value):el.value;mark();renderControls();}
  const numericKey=el.dataset.guideParam||el.dataset.guideNumber;if(numericKey)el.value=Number(current()[numericKey].toFixed(3));before=null;recorded=false;syncInputs();
 });
 controls.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;before=null;recorded=false;
  if(b.dataset.guideTool){activate(b.dataset.guideTool);return;}
  if(b.dataset.guidePick){selected=+b.dataset.guidePick;setMode(current().mode==='avoid'?'avoid':'guide');renderControls();sync();return;}
  if(b.hasAttribute('data-guide-redraw')){redraw=true;setMode(current().mode==='avoid'?'avoid':'guide');toast('Disegna sulla scena per sostituire il percorso selezionato.');return;}
  if(b.hasAttribute('data-guide-remove')||b.hasAttribute('data-guide-clear')){remember();getState().forcePaths=b.hasAttribute('data-guide-clear')?[]:paths().filter(p=>p.id!==selected);redraw=false;mark();renderControls();}
 });
 function activate(mode){redraw=false;setMode(mode);showTab('motion');const group=document.getElementById('guide-controls');if(group){group.open=true;group.scrollIntoView({block:'nearest'});}}
 function panel(){
  const p=current()||paths()[0];
  const slider=key=>{const [label,min,max,step]=PATH_META[key],v=p[key];return `<div class="param"><div class="param-line"><label for="guide-${key}">${label}</label><input type="number" class="number" data-guide-number="${key}" aria-label="${label}: valore" min="${min}" max="${max}" step="${step}" value="${Number(v.toFixed(3))}"></div><input id="guide-${key}" type="range" data-guide-param="${key}" min="${min}" max="${max}" step="${step}" value="${v}" style="--fill:${(v-min)/(max-min)*100}%"></div>`;};
  return `<section class="control-section" id="guide-controls"><h2 class="section-title">PERCORSI SULLA SCENA · ${paths().length}/${MAX_FORCE_PATHS}</h2><div class="force-actions"><button class="outline ${getMode()==='guide'?'selected':''}" data-guide-tool="guide">∿+ Segui</button><button class="outline ${getMode()==='avoid'?'selected':''}" data-guide-tool="avoid">∿− Evita</button></div><label class="field">Disegna<select id="guide-kind">${[['free','Mano libera'],['ellipse','Orbita'],['line','Linea']].map(([v,n])=>`<option value="${v}" ${kind===v?'selected':''}>${n}</option>`).join('')}</select></label><p class="help">Trascina sulla scena per disegnare. Trascina la curva per spostarla o i nodi per piegarla. Orbita usa il rettangolo del tuo gesto.</p><div class="force-list">${paths().map(q=>`<button class="force-chip ${q===p?'selected':''}" data-guide-pick="${q.id}" aria-label="Seleziona percorso ${q.id}">${q.mode==='avoid'?'∿−':'∿+'} ${q.id}${q.enabled?'':' · spento'}</button>`).join('')}</div>${p?`<label class="check"><input type="checkbox" data-guide-flag="enabled" ${p.enabled?'checked':''}>Percorso ${p.id} attivo</label><label class="field">Comportamento<select data-guide-select="mode"><option value="follow" ${p.mode==='follow'?'selected':''}>Segui · attira e accompagna</option><option value="avoid" ${p.mode==='avoid'?'selected':''}>Evita · respinge dalla linea</option></select></label>${['coverage','strength','radius'].map(slider).join('')}<p class="help">La percentuale seleziona un gruppo stabile. Agisce entro la distanza di influenza; le altre particelle restano libere.</p>${p.mode==='follow'?slider('adherence')+`<details class="control-details"><summary>Satelliti e movimento lungo la curva</summary>${['orbitRadius','orbitTurns','cycles','phase'].map(slider).join('')}<label class="field">Verso<select data-guide-select="direction"><option value="1" ${p.direction===1?'selected':''}>Avanti</option><option value="-1" ${p.direction===-1?'selected':''}>Indietro</option></select></label><p class="help">Distanza 0 segue il centro; aumentala per avvolgere il percorso in 3D. Le linee aperte hanno un ritorno morbido.</p></details>`:''}<details class="control-details"><summary>Uscita, rientro e profondità</summary>${['release','softness',...(p.mode==='avoid'?['cycles','phase']:[]),'z'].map(slider).join('')}<p class="help">Tempo libero 0 = influenza continua; 100 = sempre libera. I rientri sono sfalsati e morbidi. Profondità sposta il piano della curva nella scena.</p></details><label class="check"><input type="checkbox" data-guide-flag="closed" ${p.closed?'checked':''} ${p.points.length<3?'disabled':''}>Chiudi il percorso</label><div class="force-actions"><button class="quiet" data-guide-redraw>Ridisegna</button><button class="quiet danger" data-guide-remove>Rimuovi</button></div><button class="quiet full" data-guide-clear>Rimuovi tutti i percorsi</button>`:''}<p class="help">Percorsi, punti, fibre e colori si salvano nello stesso preset. Le guide restano fuori dai video esportati.</p></section>`;
 }
 return {sync,panel,activate,get dragging(){return !!drag;}};
}
