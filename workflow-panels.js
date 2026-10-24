import {nameControls} from './control-vocabulary.js?v=14e2ae89e5f8';
const html=s=>{const d=document.createElement('div');d.innerHTML=s;return d;};
export const WORK_TABS=[['shape','Forma'],['material','Materiale'],['color','Colori'],['light','Luci'],['background','Scena'],['photo','Filtri'],['motion','Movimento'],['fields','Interazione']];
const exampleSelector='#load-bloom-example,[data-sculpt],[data-material],#material-picker,[data-legacy-material],[data-film-look],[data-film-light],[data-texture-style],[data-motion-preset],[data-mood],#light-rig,[data-light-source],[data-backdrop],[data-audio-preset],[data-growth-study],[data-particle-material],[data-particle-film],[data-fiber-style],[data-link-style],[data-living-style],[data-veil-look]';
function stripEmpty(root){for(const d of [...root.querySelectorAll('details')].reverse())if(!d.querySelector('input,select,button,details')&&!d.querySelector('canvas,video'))d.remove();}
function baseMarkup(id,raw,state){
 let result=raw(id);if(id==='shape'&&(state.engine==='particles'||state.pLiving>0))result+=raw('grains')+raw('trails');
 const root=html(result);
 if(id==='shape'){
  for(const el of root.querySelectorAll('[data-param="scale"],[data-param="positionX"],[data-param="positionY"]'))el.closest('.param')?.remove();
  for(const el of root.querySelectorAll('[data-force-param],[data-force-enabled],[data-guide-param],[data-guide-flag]')){
   let d=el.closest('details,section');while(d?.parentElement&&d.parentElement!==root&&d.parentElement.closest('details,section'))d=d.parentElement.closest('details,section');d?.remove();
  }
 }
 if(id==='shape'){
  const material=html(raw('material')),cavity=document.createElement('details');cavity.className='control-details';cavity.innerHTML='<summary>Cavità degli elementi</summary>';
  for(const key of ['hollow','wallThickness']){const row=material.querySelector('[data-param="'+key+'"]')?.closest('.param');if(row)cavity.append(row);}if(cavity.querySelector('input'))root.append(cavity);
 }
 if(id==='material'){root.querySelector('#add-inside-light')?.remove();for(const key of ['hollow','wallThickness'])root.querySelector('[data-param="'+key+'"]')?.closest('.param')?.remove();for(const p of root.querySelectorAll('p.help'))if(p.textContent.startsWith('Svuotamento in Forma'))p.textContent='Le cavità dei singoli elementi si regolano in Forma → Cavità degli elementi.';}

 if(id==='background')root.innerHTML+=raw('tone');
 // A setting has one location even when two composed structures share a helper.
 const seen=new Set();for(const el of root.querySelectorAll('[data-param]')){if(seen.has(el.dataset.param))el.closest('.param')?.remove();else seen.add(el.dataset.param);}
 stripEmpty(root);return root;
}
export function composePanel(id,raw,state){
 if(id==='body')return raw(id).replace(/Usa mano ([ab])/g,(_,x)=>'Usa mano '+x.toUpperCase()).replace(/Usa braccio ([ab])/g,(_,x)=>'Usa braccio '+x.toUpperCase());
 if(id==='audio')return raw(id).replace(/>Ritmo</g,'>Battito<');
 if(id==='fields')return raw('fields');
 const motion=html(raw('motion')),tracks=new Map();
 for(const el of motion.querySelectorAll('[data-path-check^="motions."]')){const key=el.dataset.pathCheck.split('.')[1];if(!tracks.has(key))tracks.set(key,el.closest('details'));}
 const owners=new Map();
 for(const [tab] of WORK_TABS.filter(([t])=>!['motion','fields'].includes(t)))for(const el of baseMarkup(tab,raw,state).querySelectorAll('[data-param]'))if(!owners.has(el.dataset.param))owners.set(el.dataset.param,tab);
 if(id==='library'){
  const library=html('<p class="help">I preset completi sostituiscono la creazione. Gli esempi per categoria modificano solo i parametri indicati.</p>');
  library.innerHTML+='<button type="button" id="library-saved" class="outline full">I miei preset · importa ed esporta</button><details class="control-details" data-library-category="complete"><summary>Preset completi</summary><div id="complete-presets-slot"></div></details>';
  const seen=new Set();for(const [tab,label] of WORK_TABS){const root=baseMarkup(tab,raw,state),group=document.createElement('details');group.className='control-details';group.dataset.libraryCategory=tab;group.innerHTML='<summary>'+label+'</summary>';
   for(const el of [...root.querySelectorAll(exampleSelector)]){const signature=el.outerHTML;if(seen.has(signature))continue;seen.add(signature);if(el.id==='material-picker'){for(const opt of el.options){if(opt.value==='')continue;const card=document.createElement('button');card.type='button';card.className='outline library-card';card.dataset.material=opt.value;card.textContent=opt.textContent;group.append(card);}continue;}const host=el.matches('select')?el.closest('.field')||el:el;group.append(host);}
   const cards=[...group.querySelectorAll('.library-card')];if(cards.length){const grid=document.createElement('div');grid.className='library-card-grid';cards[0].before(grid);grid.append(...cards);}if(group.querySelector('button,select'))library.append(group);
  }return library.innerHTML;
 }
 const root=baseMarkup(id,raw,state);
 for(const el of [...root.querySelectorAll(exampleSelector)]){const host=el.matches('select')?el.closest('.field')||el:el;host.remove();}
 if(id==='motion'){
  const all=html(raw('motion')),list=document.createElement('details');list.className='control-details';list.id='animation-list';list.dataset.defaultOpen='true';list.innerHTML='<summary>Animazioni attive</summary>';
  for(const [key,track] of tracks){if(state.motions?.[key]?.enabled&&owners.has(key)){const b=document.createElement('button');b.type='button';b.className='animation-link';b.dataset.animateJump=key;b.dataset.ownerTab=owners.get(key);b.textContent=track.querySelector('summary').textContent;list.append(b);}}
  if(!list.querySelector('button'))list.innerHTML+='<p class="help">Nessuna traccia attiva. Premi Anima accanto al parametro che vuoi muovere.</p>';
  // Keep only animation tracks without a static counterpart, and particle fields.
  for(const el of [...root.querySelectorAll('[data-path-check^="motions."]')]){const key=el.dataset.pathCheck.split('.')[1];if(owners.has(key))el.closest('details').remove();}
  for(const el of [...root.querySelectorAll('[data-path-check^="lights."]')]){if(el.checked){const b=document.createElement('button');b.type='button';b.className='animation-link';b.dataset.jumpTab='light';b.textContent=el.closest('details').querySelector('summary').textContent;list.append(b);}el.closest('details').remove();}
  for(const el of [...root.querySelectorAll('[data-param]')]){const key=el.dataset.param;if(owners.has(key)){if(Number(state[key])!==0){const b=document.createElement('button');b.type='button';b.className='animation-link';b.dataset.parameterJump=key;b.dataset.ownerTab=owners.get(key);b.textContent=el.closest('.param').querySelector('label').textContent;list.append(b);}el.closest('.param').remove();}}
  stripEmpty(root);root.prepend(list);
  const add=document.createElement('select');add.id='add-animation';add.setAttribute('aria-label','Aggiungi animazione');add.innerHTML='<option value="">Aggiungi animazione…</option>';
  for(const [key,track] of tracks){const o=document.createElement('option');o.value=key;o.textContent=track.querySelector('summary').textContent;o.dataset.ownerTab=owners.get(key)||'motion';add.append(o);}list.append(add);
  const library=document.createElement('button');library.type='button';library.dataset.openLibrary='motion';library.className='outline';library.textContent='Scegli un movimento dalla libreria';list.append(library);
 }else{
  for(const el of [...root.querySelectorAll('[data-param]')]){const key=el.dataset.param,source=tracks.get(key);if(!source)continue;
   const track=source.cloneNode(true);track.id='animate-'+key;track.classList.add('inline-animation');track.dataset.animationKey=key;track.removeAttribute('open');track.querySelector('summary').textContent='Animazione · '+(el.closest('.param').querySelector('label')?.textContent||key);
   const button=document.createElement('button');button.type='button';button.className='animate-toggle';button.dataset.animateOpen=key;button.textContent=state.motions?.[key]?.enabled?'Animato':'Anima';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',track.id);el.closest('.param').querySelector('.param-line').append(button);el.closest('.param').after(track);
  }
 }
 stripEmpty(root);nameControls(root);return root.innerHTML;
}
export function refinePanel(root,level='simple'){
 root.dataset.level=level;
 // Long explanations are still available through the existing accessible help.
 for(const d of root.querySelectorAll('details')){
  const notes=[...d.querySelectorAll(':scope > p.help')].filter(p=>!p.hasAttribute('role'));if(notes.length){const b=document.createElement('button');b.type='button';b.className='parameter-info section-info';b.textContent='i';b.dataset.helpLabel=d.querySelector('summary')?.textContent||'Informazioni';b.dataset.helpText=notes.map(p=>p.textContent).join('\n\n');b.setAttribute('aria-label','Informazioni: '+b.dataset.helpLabel);d.querySelector('summary')?.append(b);notes.forEach(p=>p.remove());}
 }
 const primary=new Set(['petalAmount','filLength','structShell','structFibres','structRadial','structLayers','loopAmount','pLiving','pCount','pSize','pTravel','transparency','metal','roughness','gloss','iridescence','textureDepth','growthAmount','duration','speed','scale','positionX','positionY']);
 for(const d of [...root.querySelectorAll('details')]){
  if(d.closest('.example-library')||d.dataset.advanced)continue;
  const params=[...d.children].filter(el=>el.matches('.param,.control-with-help,.field'));let kept=0;const extra=[];
  for(const row of params){const input=row.querySelector('[data-param],[data-path],select');if(!input)continue;const key=input.dataset.param;if(primary.has(key)||kept++<3)continue;extra.push(row);const animation=row.nextElementSibling;if(animation?.matches('.inline-animation'))extra.push(animation);}
  if(extra.length){const advanced=document.createElement('details');advanced.className='control-details advanced-controls';advanced.dataset.advanced='true';advanced.innerHTML='<summary>Altri controlli</summary>';extra[0].before(advanced);advanced.append(...extra);if(level!=='simple')advanced.open=true;}
 }
 for(const el of root.querySelectorAll('[data-param],[data-path]'))if(/Seed$|seed$|growthFeed|growthKill|growthDiffusion|growthAge|ContactPasses/.test(el.dataset.param||el.dataset.path||''))el.closest('.param')?.classList.add('expert-control');
}
