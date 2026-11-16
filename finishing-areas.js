import {MAX_FINISH_REGIONS,MAX_BRUSH_POINTS,MAX_BRUSH_STROKES} from './finishing.js?v=bfebe1e74135';

// Editor handles are DOM-only; exported pixels contain the effect, never its handles.
export function mountFinishingAreas({board,getState,getTab,remember,mark,renderControls,toast}){
 let editing=false,drawing=false,selected=null,drag=null,painting=false,stroke=null;
 const overlay=document.createElement('div');overlay.id='finish-areas';overlay.hidden=true;overlay.setAttribute('aria-label','Riquadri dei filtri');board.append(overlay);
 const brush=document.createElement('div');brush.id='finish-brush-board';brush.hidden=true;
 brush.innerHTML='<span class="finish-brush-cursor" aria-hidden="true" hidden></span><button type="button" class="finish-area-done">Fine pennello</button>';
 board.append(brush);
 const cursor=brush.firstElementChild;
 const controls=document.querySelector('#controls');
 const regions=()=>getState().finishRegions||[];
 const current=()=>regions().find(r=>r.id===selected);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const nextId=()=>Math.max(0,...regions().map(r=>r.id))+1;
 const strokes=()=>getState().finishBrushStrokes||[];
 function brushPanel(){
  return `<div class="finish-area-actions"><button type="button" id="finish-brush-edit" class="outline" aria-pressed="${painting}" ${strokes().length>=MAX_BRUSH_STROKES?'disabled':''}>${painting?'Chiudi pennello':'Dipingi sulla scena'}</button><button type="button" id="finish-brush-clear" class="quiet" ${strokes().length?'':'disabled'}>Cancella tratti</button></div><p class="help">Trascina per spostare l’immagine localmente. Raggio e forza valgono per il prossimo tratto. Con una penna, la pressione cambia raggio e forza. I tratti seguono l’inquadratura e si salvano con i filtri. Usa Annulla per rimuovere l’ultimo tratto.</p>`;
 }
 function panel(){
  if(!current())selected=regions()[0]?.id??null;
  const r=current();
  return `<p class="help">Disegna fino a ${MAX_FINISH_REGIONS} riquadri. Restano fermi nell’immagine durante il movimento della scena e si salvano nel preset.</p><div class="finish-area-actions"><button id="finish-area-add" class="outline" ${regions().length>=MAX_FINISH_REGIONS?'disabled':''}>+ Riquadro</button><button id="finish-area-draw" class="outline" ${regions().length>=MAX_FINISH_REGIONS?'disabled':''}>${drawing?'Annulla disegno':'Disegna sulla scena'}</button><button id="finish-area-edit" class="quiet" aria-pressed="${editing}">${editing?'Nascondi riquadri':'Modifica sulla scena'}</button></div><p class="help">${drawing?'Trascina su una zona libera della scena per disegnare.':'Trascina il riquadro per spostarlo, l’angolo per cambiarne la dimensione.'}</p><div class="finish-area-list">${regions().map((a,i)=>`<button data-region-select="${a.id}" class="${selected===a.id?'selected':''}" aria-pressed="${selected===a.id}">Riquadro ${i+1}</button>`).join('')}</div>${r?`<div class="finish-area-numbers">${[['x','Sinistra'],['y','Alto'],['w','Larghezza'],['h','Altezza']].map(([k,label])=>`<label>${label} %<input type="number" data-region-key="${k}" aria-label="Riquadro: ${label}" value="${+r[k].toFixed(1)}" min="${k==='w'||k==='h'?1:0}" max="100" step=".1"></label>`).join('')}</div><button id="finish-area-remove" class="quiet danger">Rimuovi riquadro selezionato</button>`:'<p class="help">Nessun riquadro: gli effetti limitati alle aree rimangono nascosti.</p>'}`;
 }
 function sync(){
  if(!current())selected=regions()[0]?.id??null;
  if(getTab()!=='photo')painting=false;
  brush.hidden=!painting;
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
  if(b.id==='finish-brush-edit'){
   painting=!painting;editing=drawing=false;renderControls();
   if(painting){board.scrollIntoView({block:'center',behavior:'smooth'});brush.querySelector('button').focus({preventScroll:true});}
   return;
  }
  if(b.id==='finish-brush-clear'){remember(getState(),'Cancella tratti');getState().finishBrushStrokes=[];mark();renderControls();return;}
  if(b.dataset.regionSelect||b.id.startsWith('finish-area-'))painting=false;
  if(b.dataset.regionSelect){selected=+b.dataset.regionSelect;editing=true;drawing=false;renderControls();return;}
  if(b.id==='finish-area-add'){
   if(regions().length>=MAX_FINISH_REGIONS)return;remember();activate();const s=getState();selected=nextId();s.finishRegions=[...regions(),{id:selected,x:25,y:25,w:40,h:40}];if(s.finishRegionMosaic&&!s.finishGlyph&&!s.finishEdge&&!s.finishGlitch&&!s.finishRgb)s.finishMosaic=true;drawing=false;mark();renderControls();
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
  if(drawing){if(regions().length>=MAX_FINISH_REGIONS)return;selected=nextId();getState().finishRegions=[...regions(),{id:selected,x:Math.min(99,p.x),y:Math.min(99,p.y),w:1,h:1}];if(getState().finishRegionMosaic&&!getState().finishGlyph&&!getState().finishEdge&&!getState().finishGlitch&&!getState().finishRgb)getState().finishMosaic=true;}
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
 function brushPoint(event){
  const rect=brush.getBoundingClientRect(),x=clamp((event.clientX-rect.left)/rect.width,0,1),y=clamp((event.clientY-rect.top)/rect.height,0,1);
  const pressure=event.pointerType==='pen'?event.pressure:1;
  const diameter=2*Math.min(rect.width,rect.height)*getState().finishBrushRadius*(.45+.55*pressure);
  Object.assign(cursor.style,{width:`${diameter}px`,height:`${diameter}px`,left:`${100*x}%`,top:`${100*y}%`});
  cursor.hidden=false;return [x,y,pressure];
 }
 brush.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('button')||stroke||strokes().length>=MAX_BRUSH_STROKES)return;
  event.preventDefault();const state=getState();brush.setPointerCapture(event.pointerId);
  stroke={pointer:event.pointerId,state,before:structuredClone(state),id:strokes().length,points:[brushPoint(event)]};
 });
 brush.addEventListener('pointermove',event=>{
  if(event.target.closest('button')){cursor.hidden=true;return;}
  const next=brushPoint(event);
  if(event.pointerId!==stroke?.pointer||stroke.state!==getState())return;
  const last=stroke.points.at(-1);
  if(Math.hypot(next[0]-last[0],next[1]-last[1])<.0025)return;
  if(stroke.points.length>=MAX_BRUSH_POINTS){
   const first=stroke.points[0];stroke.points=[first,...stroke.points.filter((_,i)=>i%2===1)];
  }
  stroke.points.push(next);
  const s=stroke.state;
  s.finishFeedback=true;s.finishEnabled=true;s.finishCompare=false;
  s.finishBrushStrokes=[...strokes().slice(0,stroke.id),{radius:s.finishBrushRadius,strength:s.finishBrushStrength,points:stroke.points.slice()}];
  mark(false);
 });
 function endStroke(pointer,cancel=false){
  if(stroke?.pointer!==pointer)return;
  const finished=stroke;stroke=null;cursor.hidden=true;
  if(brush.hasPointerCapture(pointer))brush.releasePointerCapture(pointer);
  if(finished.state!==getState()||strokes().length===finished.id)return;
  if(cancel){const {finishFeedback,finishEnabled,finishCompare,finishBrushStrokes}=finished.before;Object.assign(finished.state,{finishFeedback,finishEnabled,finishCompare,finishBrushStrokes});}
  else remember(finished.before,'Pennello liquido');
  if(strokes().length>=MAX_BRUSH_STROKES)painting=false;
  mark(!cancel);renderControls();
 }
 brush.addEventListener('pointerup',event=>endStroke(event.pointerId));
 brush.addEventListener('pointercancel',event=>endStroke(event.pointerId,true));
 brush.addEventListener('lostpointercapture',event=>endStroke(event.pointerId,true));
 brush.addEventListener('pointerleave',()=>{cursor.hidden=true;});
 function closeBrush(){if(stroke)endStroke(stroke.pointer,true);painting=false;cursor.hidden=true;renderControls();controls.querySelector('#finish-brush-edit')?.focus({preventScroll:true});}
 brush.querySelector('button').addEventListener('click',closeBrush);
 document.addEventListener('keydown',event=>{if(painting&&event.key==='Escape')closeBrush();});
 return {panel,brushPanel,sync};
}
