import {MAX_FINISH_REGIONS} from './finishing.js?v=c8567bd14506';

// Editor handles are DOM-only; exported pixels contain the effect, never its handles.
export function mountFinishingAreas({board,getState,getTab,remember,mark,renderControls,toast}){
 let editing=false,drawing=false,selected=null,drag=null;
 const overlay=document.createElement('div');overlay.id='finish-areas';overlay.hidden=true;overlay.setAttribute('aria-label','Riquadri della finitura');board.append(overlay);
 const controls=document.querySelector('#controls');
 const regions=()=>getState().finishRegions||[];
 const current=()=>regions().find(r=>r.id===selected);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const nextId=()=>Math.max(0,...regions().map(r=>r.id))+1;
 function panel(){
  if(!current())selected=regions()[0]?.id??null;
  const r=current();
  return `<p class="help">Disegna fino a ${MAX_FINISH_REGIONS} riquadri. Restano fermi nell’immagine durante il movimento della scena e si salvano nel preset.</p><div class="finish-area-actions"><button id="finish-area-add" class="outline" ${regions().length>=MAX_FINISH_REGIONS?'disabled':''}>+ Riquadro</button><button id="finish-area-draw" class="outline" ${regions().length>=MAX_FINISH_REGIONS?'disabled':''}>${drawing?'Annulla disegno':'Disegna sulla scena'}</button><button id="finish-area-edit" class="quiet" aria-pressed="${editing}">${editing?'Nascondi riquadri':'Modifica sulla scena'}</button></div><p class="help">${drawing?'Trascina su una zona libera della scena per disegnare.':'Trascina il riquadro per spostarlo, l’angolo per cambiarne la dimensione.'}</p><div class="finish-area-list">${regions().map((a,i)=>`<button data-region-select="${a.id}" class="${selected===a.id?'selected':''}" aria-pressed="${selected===a.id}">Riquadro ${i+1}</button>`).join('')}</div>${r?`<div class="finish-area-numbers">${[['x','Sinistra'],['y','Alto'],['w','Larghezza'],['h','Altezza']].map(([k,label])=>`<label>${label} %<input type="number" data-region-key="${k}" aria-label="Riquadro: ${label}" value="${+r[k].toFixed(1)}" min="${k==='w'||k==='h'?1:0}" max="100" step=".1"></label>`).join('')}</div><button id="finish-area-remove" class="quiet danger">Rimuovi riquadro selezionato</button>`:'<p class="help">Nessun riquadro: gli effetti limitati alle aree rimangono nascosti.</p>'}`;
 }
 function sync(){
  if(!current())selected=regions()[0]?.id??null;
  overlay.hidden=!(editing&&getTab()==='photo'&&getState().finishRegionsEnabled);
  overlay.classList.toggle('drawing',drawing);
  const focused=document.activeElement?.dataset?.region;
  overlay.innerHTML=regions().map((r,i)=>`<button type="button" class="finish-area-box ${r.id===selected?'selected':''}" data-region="${r.id}" aria-label="Sposta riquadro ${i+1}" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%"><span class="finish-area-label">${i+1}</span><span class="finish-area-resize" data-resize="true" aria-hidden="true"></span></button>`).join('')+'<button type="button" class="finish-area-done" data-finish-done>Fine riquadri</button>';
  if(focused&&!drag)overlay.querySelector(`[data-region="${Number(focused)}"]`)?.focus({preventScroll:true});
  const r=current();if(r)controls.querySelectorAll('[data-region-key]').forEach(el=>{if(el!==document.activeElement)el.value=+r[el.dataset.regionKey].toFixed(1);});
 }
 function activate(){const s=getState();s.finishRegionsEnabled=true;s.finishEnabled=true;editing=true;}
 controls.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.regionSelect){selected=+b.dataset.regionSelect;editing=true;drawing=false;renderControls();return;}
  if(b.id==='finish-area-add'){
   if(regions().length>=MAX_FINISH_REGIONS)return;remember();activate();const s=getState();selected=nextId();s.finishRegions=[...regions(),{id:selected,x:25,y:25,w:40,h:40}];if(s.finishRegionMosaic)s.finishMosaic=true;drawing=false;mark();renderControls();
  }
  if(b.id==='finish-area-draw'){if(!drawing&&regions().length>=MAX_FINISH_REGIONS)return;remember();activate();drawing=!drawing;mark();renderControls();if(drawing)toast('Trascina sulla scena per disegnare il riquadro');}
  if(b.id==='finish-area-edit'){if(!editing&&!getState().finishRegionsEnabled){remember();getState().finishRegionsEnabled=true;mark();}editing=!editing;drawing=false;renderControls();}
  if(b.id==='finish-area-remove'){remember();getState().finishRegions=regions().filter(r=>r.id!==selected);selected=null;mark();renderControls();}
 });
 controls.addEventListener('input',e=>{const k=e.target.dataset.regionKey,r=current();if(!k||!r||e.target.value===''||!Number.isFinite(+e.target.value))return;const v=+e.target.value;if(k==='x')r.x=clamp(v,0,100-r.w);if(k==='y')r.y=clamp(v,0,100-r.h);if(k==='w')r.w=clamp(v,1,100-r.x);if(k==='h')r.h=clamp(v,1,100-r.y);mark();});
 controls.addEventListener('change',e=>{if(e.target.dataset.regionKey){const r=current();if(r)e.target.value=+r[e.target.dataset.regionKey].toFixed(1);sync();}});
 const point=e=>{const b=overlay.getBoundingClientRect();return {x:clamp((e.clientX-b.left)/b.width*100,0,100),y:clamp((e.clientY-b.top)/b.height*100,0,100)};};
 overlay.addEventListener('click',e=>{if(e.target.closest('[data-finish-done]')){editing=false;drawing=false;renderControls();}});
 overlay.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag||e.target.closest('[data-finish-done]'))return;const box=e.target.closest('[data-region]');if(!drawing&&!box)return;
  e.preventDefault();e.stopPropagation();const before=structuredClone(getState()),p=point(e);overlay.setPointerCapture(e.pointerId);
  if(drawing){if(regions().length>=MAX_FINISH_REGIONS)return;selected=nextId();getState().finishRegions=[...regions(),{id:selected,x:Math.min(99,p.x),y:Math.min(99,p.y),w:1,h:1}];if(getState().finishRegionMosaic)getState().finishMosaic=true;}
  else selected=+box.dataset.region;
  drag={pointer:e.pointerId,p,origin:{...current()},before,kind:drawing?'draw':e.target.closest('[data-resize]')?'resize':'move'};mark();
 });
 overlay.addEventListener('pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;e.preventDefault();const p=point(e),r=current(),o=drag.origin;if(!r)return;
  if(drag.kind==='draw'){r.x=Math.min(99,Math.min(drag.p.x,p.x));r.y=Math.min(99,Math.min(drag.p.y,p.y));r.w=clamp(Math.abs(p.x-drag.p.x),1,100-r.x);r.h=clamp(Math.abs(p.y-drag.p.y),1,100-r.y);}
  if(drag.kind==='move'){r.x=clamp(o.x+p.x-drag.p.x,0,100-r.w);r.y=clamp(o.y+p.y-drag.p.y,0,100-r.h);}
  if(drag.kind==='resize'){r.w=clamp(o.w+p.x-drag.p.x,1,100-r.x);r.h=clamp(o.h+p.y-drag.p.y,1,100-r.y);}mark();
 });
 function end(e,cancel=false){if(!drag||drag.pointer!==e.pointerId)return;if(cancel){getState().finishRegions=drag.before.finishRegions;getState().finishMosaic=drag.before.finishMosaic;}else remember(drag.before);drag=null;drawing=false;if(overlay.hasPointerCapture(e.pointerId))overlay.releasePointerCapture(e.pointerId);mark();renderControls();}
 overlay.addEventListener('pointerup',e=>end(e));overlay.addEventListener('pointercancel',e=>end(e,true));
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){if(drag)end({pointerId:drag.pointer},true);editing=false;drawing=false;renderControls();}if(e.target.dataset.region)selected=+e.target.dataset.region;const r=current();if(!r||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();remember();const step=e.shiftKey?5:1;r.x=clamp(r.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),0,100-r.w);r.y=clamp(r.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0),0,100-r.h);mark();});
 return {panel,sync};
}
