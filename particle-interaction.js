import {MAX_FORCE_POINTS,FORCE_META,addForcePoint,screenToForce,forceToScreen,forcePanel} from './particle-forces.js?v=c2b52e9c14b3';

export function mountParticleForces({canvas,board,getState,getMode,setMode,remember,mark,renderControls,showTab,toast}){
 const overlay=document.querySelector('#force-handles'),controls=document.querySelector('#controls');
 let selected=null,drag=null,before=null,recorded=false,wheelTimer=null;
 const active=()=>getState().engine==='particles'&&['attract','repel'].includes(getMode());
 const current=()=>(getState().forcePoints||[]).find(p=>p.id===selected);
 const clamp=(key,v)=>Math.max(FORCE_META[key][1],Math.min(FORCE_META[key][2],v));
 const pointer=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,aspect:r.width/r.height};};
 function sync(){
  const points=getState().forcePoints||[],isParticle=getState().engine==='particles';
  for(const kind of ['attract','repel'])document.querySelector('#'+kind+'-tool').hidden=!isParticle;
  overlay.hidden=!active();canvas.classList.toggle('placing-force',active());
  if(!points.some(p=>p.id===selected))selected=points[0]?.id??null;
  if([...overlay.querySelectorAll('[data-force-id]')].map(el=>+el.dataset.forceId).join(',')!==points.map(p=>p.id).join(',')){
   overlay.replaceChildren();for(const p of points){const el=document.createElement('button');el.className='force-handle';el.dataset.forceId=p.id;el.type='button';overlay.append(el);}
   const ring=document.createElement('div');ring.className='force-radius';ring.setAttribute('aria-hidden','true');overlay.append(ring);
  }
  const aspect=board.clientWidth/Math.max(1,board.clientHeight);
  for(const el of overlay.querySelectorAll('[data-force-id]')){const p=points.find(p=>p.id===+el.dataset.forceId),q=forceToScreen(p,aspect);
   el.style.left=q.x*100+'%';el.style.top=q.y*100+'%';el.textContent=(p.strength<0?'−':'+')+p.id;
   el.classList.toggle('repel',p.strength<0);el.classList.toggle('selected',p.id===selected);el.classList.toggle('disabled',!p.enabled);
   el.setAttribute('aria-label',`Trascina punto ${p.id} · ${p.strength<0?'repulsione':'attrazione'}`);el.title=`Punto ${p.id} · rotella: raggio · Maiusc + rotella: profondità`;
  }
  const ring=overlay.querySelector('.force-radius'),p=current();if(ring){ring.hidden=!p;if(p){const q=forceToScreen(p,aspect);ring.style.left=q.x*100+'%';ring.style.top=q.y*100+'%';ring.style.width=ring.style.height=q.radius*2*board.clientHeight+'px';ring.classList.toggle('repel',p.strength<0);}}
 }
 function syncInputs(){const p=current();if(!p)return;for(const key of Object.keys(FORCE_META)){const v=p[key],[,lo,hi]=FORCE_META[key];for(const el of controls.querySelectorAll(`[data-force-param="${key}"],[data-force-number="${key}"]`)){if(el!==document.activeElement)el.value=Number(v.toFixed(3));el.style.setProperty('--fill',(v-lo)/(hi-lo)*100+'%');}}}
 function start(e,p,element){selected=p.id;drag={id:p.id,pointerId:e.pointerId,start:{...p},...pointer(e),clientY:e.clientY};element.setPointerCapture(e.pointerId);renderControls();sync();}
 canvas.addEventListener('pointerdown',e=>{
  if(!active())return;e.preventDefault();e.stopImmediatePropagation();if(drag||e.button>0)return;
  if((getState().forcePoints||[]).length>=MAX_FORCE_POINTS){toast('Puoi usare fino a 8 punti. Trascinane uno o rimuovilo in Moto.');return;}
  remember();const q=pointer(e),p=addForcePoint(getState(),getMode(),q.x,q.y,q.aspect);start(e,p,canvas);mark();
 },true);
 overlay.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-force-id]');if(!el||drag)return;e.preventDefault();e.stopPropagation();const p=(getState().forcePoints||[]).find(p=>p.id===+el.dataset.forceId);remember();start(e,p,el);});
 function move(e){if(!drag||drag.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const p=current();if(!p)return;const q=pointer(e);
  if(e.shiftKey)p.z=clamp('z',drag.start.z+(drag.clientY-e.clientY)*.02);
  else{const a=screenToForce(q.x,q.y,q.aspect,p.z),b=screenToForce(drag.x,drag.y,q.aspect,p.z);p.x=clamp('x',drag.start.x+a.x-b.x);p.y=clamp('y',drag.start.y+a.y-b.y);}
  mark();syncInputs();
 }
 function end(e){if(drag?.pointerId===e.pointerId){drag=null;e.stopImmediatePropagation();}}
 for(const el of [canvas,overlay]){el.addEventListener('pointermove',move,true);for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,end,true);}
 overlay.addEventListener('wheel',e=>{const el=e.target.closest('[data-force-id]');if(!el)return;e.preventDefault();e.stopPropagation();selected=+el.dataset.forceId;const p=current();if(!wheelTimer)remember();clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>wheelTimer=null,300);if(e.shiftKey)p.z=clamp('z',p.z-e.deltaY*.005);else p.radius=clamp('radius',p.radius*Math.exp(-e.deltaY*.002));mark();renderControls();},{passive:false});
 overlay.addEventListener('keydown',e=>{const el=e.target.closest('[data-force-id]');if(!el)return;selected=+el.dataset.forceId;const p=current();if(['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();remember();getState().forcePoints=getState().forcePoints.filter(q=>q.id!==selected);mark();renderControls();}else if(e.key.startsWith('Arrow')){e.preventDefault();e.stopPropagation();remember();const k=e.shiftKey?'z':['ArrowLeft','ArrowRight'].includes(e.key)?'x':'y';p[k]=clamp(k,p[k]+(['ArrowRight','ArrowUp'].includes(e.key)?.06:-.06));mark();syncInputs();}});
 const isInput=el=>el.matches('[data-force-param],[data-force-number],[data-force-enabled]');
 for(const type of ['pointerdown','focusin'])controls.addEventListener(type,e=>{if(isInput(e.target)&&!before){before=structuredClone(getState());recorded=false;}});
 controls.addEventListener('focusout',e=>{if(isInput(e.target)){before=null;recorded=false;}});
 controls.addEventListener('input',e=>{const el=e.target,key=el.dataset.forceParam||el.dataset.forceNumber;if(!key||!current()||el.value===''||!Number.isFinite(+el.value))return;if(!recorded){remember(before||getState());recorded=true;}current()[key]=clamp(key,+el.value);mark();syncInputs();});
 controls.addEventListener('change',e=>{if(!isInput(e.target)||!current())return;if(e.target.hasAttribute('data-force-enabled')){remember(before||getState());current().enabled=e.target.checked;mark();}before=null;recorded=false;syncInputs();});
 controls.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;before=null;recorded=false;
  if(b.dataset.forceMode){setMode(b.dataset.forceMode);return;}
  if(b.hasAttribute('data-force-set')&&current()){remember();current().strength=+b.dataset.forceSet;setMode(current().strength<0?'repel':'attract');mark();renderControls();sync();return;}
  if(b.dataset.forceSelect){selected=+b.dataset.forceSelect;setMode(current().strength<0?'repel':'attract');renderControls();sync();return;}
  if(b.hasAttribute('data-force-remove')||b.hasAttribute('data-force-clear')||b.hasAttribute('data-force-invert')){remember();if(b.hasAttribute('data-force-invert'))current().strength=-current().strength;else getState().forcePoints=b.hasAttribute('data-force-clear')?[]:getState().forcePoints.filter(p=>p.id!==selected);mark();renderControls();}
 });
 return {sync,panel:()=>forcePanel(getState(),selected),get dragging(){return !!drag;},activate(kind){setMode(kind);showTab('fields');const group=document.getElementById('force-controls');if(group){group.open=true;group.scrollIntoView({block:'nearest'});}},dispose(){clearTimeout(wheelTimer);}};
}
