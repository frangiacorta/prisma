// Navigation only: the creation and its renderer are never changed here.
export const NAV_GROUPS=[
 {id:'structure',label:'Struttura',tabs:[['shape','Forma','shape'],['grains','Particelle','shape','particles'],['trails','Fibre e scie','motion','particles'],['motion','Movimento','motion']]},
 {id:'look',label:'Aspetto',tabs:[['material','Materia','material'],['color','Colori','palette'],['light','Luci','sun']]},
 {id:'scene',label:'Scena',tabs:[['background','Sfondo','background'],['tone','Regolazioni','photo'],['photo','Post-processing','photo']]},
 {id:'interaction',label:'Interazione',tabs:[['fields','Campi','move'],['body','Mani e braccia','orbit'],['audio','Audio','audio']]}
];
export const navigationTabs=engine=>NAV_GROUPS.flatMap(g=>g.tabs.filter(t=>(!t[3]||t[3]===engine)&&!(engine==='veils'&&['fields','body','audio'].includes(t[0]))).map(t=>({id:t[0],label:t[1],icon:t[2],group:g.id,groupLabel:g.label})));
const clean=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function renderNavigation(root,engine,tab,icon){
 const tabs=navigationTabs(engine),current=tabs.find(t=>t.id===tab)||tabs[0];
 root.innerHTML='<div class="nav-groups" aria-label="Aree di lavoro">'+NAV_GROUPS.filter(g=>tabs.some(t=>t.group===g.id)).map(g=>`<button type="button" data-tab="${tabs.find(t=>t.group===g.id).id}" aria-pressed="${current.group===g.id}" class="nav-group ${current.group===g.id?'active':''}">${g.label}</button>`).join('')+'</div><div class="nav-tabs" role="tablist" aria-label="'+current.groupLabel+'">'+tabs.filter(t=>t.group===current.group).map(t=>`<button type="button" role="tab" aria-controls="controls" id="tab-${t.id}" class="tab ${tab===t.id?'active':''}" data-tab="${t.id}" aria-selected="${tab===t.id}">${icon(t.icon)}${t.label}</button>`).join('')+'</div>';
 document.getElementById('controls').setAttribute('aria-labelledby','tab-'+current.id);
 document.getElementById('panel-location').textContent=current.label;
}
export function organizeSections(root,scope){
 // Deep shape controls belong under their parent instead of a long flat list.
 function group(label,id,titles){
  const nodes=[...root.children].filter(d=>titles.includes(d.querySelector(':scope > summary')?.textContent));if(!nodes.length)return;
  const parent=document.createElement('details');parent.className='control-details';parent.id=id;
  const summary=document.createElement('summary');summary.textContent=label;parent.append(summary);nodes[0].before(parent);parent.append(...nodes);
 }
 // Presets/examples have one predictable home at the bottom of each tab.
 const library=document.createElement('details');library.className='control-details example-library';
 library.innerHTML='<summary>Esempi</summary><p class="help">Applica un esempio, poi continua con tutti i parametri della scheda.</p>';
 const selectors='[data-sculpt],#load-bloom-example,[data-material],#material-picker,[data-legacy-material],[data-film-look],[data-film-light],[data-texture-style],[data-motion-preset],[data-mood],#random-palette,#light-rig,[data-light-source],[data-backdrop],[data-audio-preset]';
 const buckets=new Map(),exampleParents=new Set();
 for(const button of [...root.querySelectorAll(selectors)]){
  if(scope.endsWith('/material')||(scope.endsWith('/motion')&&button.matches('[data-motion-preset]')))continue;
  if(library.contains(button))continue;
  const container=button.closest('.mood-grid,.field,.audio-presets')||button;
  let ancestor=button.closest('details');while(ancestor&&root.contains(ancestor)){exampleParents.add(ancestor);ancestor=ancestor.parentElement.closest('details');}
  const title=button.closest('details')?.querySelector(':scope > summary')?.textContent||'Esempi';
  if(!buckets.has(title)){const block=document.createElement('details');block.className='control-details';const head=document.createElement('summary');head.textContent=title;block.append(head);buckets.set(title,block);library.append(block);}
  buckets.get(title).append(container);
 }
 // Remove only empty preset wrappers, never sections with live controls.
 for(const d of [...root.querySelectorAll('details')].reverse())if(exampleParents.has(d)&&!d.querySelector('input,select,button,details')&& ![...d.children].some(c=>!c.matches('summary,p.help')))d.remove();
 for(const button of root.querySelectorAll('button[id^="reset-"]')){
  const parent=button.closest('details')||root,footer=document.createElement('div');footer.className='section-reset';
  parent.append(footer);footer.append(button);button.classList.remove('full');
 }
 if(scope==='solid/shape'){
  const growth=[...root.children].find(d=>d.querySelector(':scope > summary')?.textContent==='Petali e radici');
  if(growth){growth.id='shape-growth';const stem=[...root.children].find(d=>d.querySelector(':scope > summary')?.textContent==='Gambo');if(stem)growth.append(stem);}
  group('Struttura','shape-structure',['Proprietà','Membrana','Fibre e tessitura','Lamelle e strati','Pieghe e curvatura']);
  group('Profilo','shape-profile',['Deformazioni','Foro','Ritaglio','Lobi e onde']);
 }
 if(scope==='particles/shape')group('Struttura','particle-structure',['Lobi, rami e addensamenti','Dettaglio organico','Struttura neuronale','Tentacoli del nucleo','Fasci esterni','Deformazioni']);
 if(scope==='solid/motion'){
  const general=[...root.children].find(d=>d.querySelector(':scope > summary')?.textContent==='Tempo');if(general)root.prepend(general);
  group('Scena','motion-scene',['Rotazione','Posizione e dimensione','Luci','Ambiente e pellicola']);
  const scene=root.querySelector('#motion-scene');if(scene&&general)general.after(scene);
  group('Struttura','motion-structure',['Posa','Animazione']);
  group('Petali e radici','motion-growth',['Radici: scorrimento','Radici: crescita','Radici: distribuzione','Petali e gambo']);
 }
 if(scope==='particles/motion')group('Deformazioni','particle-motion-deform',['Pulsazione','Tentacoli in movimento','Distorsione','Ritmo e cadenze']);
 if(scope.endsWith('/color')){const palette=[...root.children].find(d=>d.querySelector(':scope > summary')?.textContent.startsWith('Palette'));if(palette)root.prepend(palette);}
 if(buckets.size)root.append(library);
 if(scope.endsWith('/motion')){
  const examples=[...root.children].find(d=>d.querySelector(':scope > summary')?.textContent==='Esempi di movimento');if(examples){examples.dataset.defaultOpen='true';root.prepend(examples);}
  const active=document.createElement('details');active.className='control-details active-motion';active.id='active-motion';active.dataset.defaultOpen='true';active.innerHTML='<summary>Movimenti attivi</summary>';
  const tracks=[...root.querySelectorAll('input[data-path-check$=".enabled"]')].filter(el=>el.checked);
  for(const el of tracks){const d=el.closest('details');if(d&&!active.contains(d))active.append(d);}
  const growth=root.querySelector('[data-param="growthFlow"]');if(growth&&Number(growth.value)>0){active.append(growth.closest('.param'));const cycles=root.querySelector('[data-param="growthCycles"]');if(cycles)active.append(cycles.closest('.param'));}
  const film=['filmFlow','filmSwirl'];for(const key of [...film,...(scope.startsWith('particles/')?['pTravel','pVortex','pReentry','pLife','pBreath','pPulse','pSignal','pRandom','pJitter','pWander','pSpaceWarp']:[])]){const el=root.querySelector('[data-param="'+key+'"]');if(el&&Number(el.value)>0)active.append(el.closest('.param'));}
  if(film.some(key=>Number(active.querySelector('[data-param="'+key+'"]')?.value)>0)){const cycles=root.querySelector('[data-param="filmCycles"]');if(cycles)active.append(cycles.closest('.param'));}
  const env=root.querySelector('[data-check="environmentRotate"]');if(env?.checked){active.append(env.closest('.check'));const cycles=root.querySelector('[data-param="environmentCycles"]');if(cycles)active.append(cycles.closest('.param'));}
  if(active.children.length===1)active.innerHTML+='<p class="help">Nessun movimento attivo. Attivalo nelle sezioni qui sotto: i suoi controlli compariranno qui.</p>';
  root.prepend(active);
  for(const d of [...root.querySelectorAll('details')].reverse())if(d!==active&&!d.querySelector('input,select,button,details')&&d.children.length===1)d.remove();
 }
 if(scope.endsWith('/audio')){
  const response=root.querySelector('#audio-response-controls'),input=root.querySelector('#audio-input-controls');if(response&&input)input.after(response);
 }
}
const searchable='input:not(.number):not(.hex-input):not([type=file]):not([type=hidden]),select,button:not([data-help-text]):not(.audio-link)';
function address(el){
 for(const a of el.attributes)if(a.name==='id')return '#'+CSS.escape(a.value);
 const attrs=[...el.attributes].filter(a=>a.name.startsWith('data-'));
 return attrs.length?el.tagName.toLowerCase()+attrs.map(a=>'['+a.name+'='+JSON.stringify(a.value)+']').join(''):null;
}
function entryLabel(el){
 const host=el.closest('.param,.field,.check,.color-field');
 if(host){const clone=host.cloneNode(true);clone.querySelectorAll('input,select,output,button,.range-ends').forEach(n=>n.remove());return clone.textContent.trim();}
 return el.getAttribute('aria-label')||el.textContent.trim();
}
export function mountControlSearch({getEngine,getMarkup,showTab}){
 const input=document.getElementById('control-search'),results=document.getElementById('control-search-results'),status=document.getElementById('control-search-status');let entries=[];
 function close(){results.hidden=true;status.textContent='';}
 function refresh(){
  entries=[];
  for(const tab of navigationTabs(getEngine())){
   const template=document.createElement('template');template.innerHTML=getMarkup(tab.id);
   for(const el of template.content.querySelectorAll(searchable)){
    const selector=address(el),label=entryLabel(el);if(!selector||!label)continue;
    const ancestors=[];let d=el.closest('details,section.control-section');while(d){ancestors.unshift(d.querySelector(':scope > summary,:scope > h2')?.textContent||'');d=d.parentElement?.closest('details,section.control-section');}
    const aliases={tone:'esposizione luminosita saturazione correzione colore fotografia',photo:'filtri effetti finitura post processing',motion:'moto animazione animare muovere movimento ritmo velocita',fields:'attrazione repulsione magneti',body:'webcam tracking mani braccia'};
    entries.push({tab:tab.id,label,path:[tab.groupLabel,tab.label,...ancestors].join(' › '),selector,haystack:clean([label,...ancestors,tab.label,aliases[tab.id]||''].join(' '))});
   }
  }
 }
 function search(){
  const words=clean(input.value).split(' ').filter(Boolean);if(!words.length){close();return;}
  const found=entries.filter(e=>words.every(w=>e.haystack.includes(w))).sort((a,b)=>(clean(b.label).includes(clean(input.value))?1:0)-(clean(a.label).includes(clean(input.value))?1:0));
  results.replaceChildren();results.hidden=false;status.textContent=found.length?found.length+' risultati'+(found.length>24?' · precisa la ricerca':''):'Nessun risultato · prova «orbita», «spessore» o «luce»';
  for(const entry of found.slice(0,24)){
   const b=document.createElement('button');b.type='button';b.className='control-search-result';const title=document.createElement('strong'),path=document.createElement('small');title.textContent=entry.label;path.textContent=entry.path;b.append(title,path);
   b.onclick=()=>{input.value='';close();showTab(entry.tab);const target=document.getElementById('controls').querySelector(entry.selector);if(!target)return;let d=target.closest('details');while(d){d.open=true;d=d.parentElement.closest('details');}const host=target.closest('.param,.field,.check,.color-field')||target;host.classList.add('search-highlight');requestAnimationFrame(()=>{target.focus({preventScroll:true});target.scrollIntoView({block:'center',behavior:'smooth'});});setTimeout(()=>host.classList.remove('search-highlight'),2200);};results.append(b);
  }
 }
 input.addEventListener('focus',()=>{refresh();search();});input.addEventListener('input',search);
 document.getElementById('control-search-clear').onclick=()=>{input.value='';close();input.focus();};
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';close();}if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();results.querySelector('button')?.click();}});
 results.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';close();input.focus();}});
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.inspector-search'))close();});
 return {close};
}
