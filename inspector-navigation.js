// Navigation only: the creation and its renderer are never changed here.
export const NAV_GROUPS=[
 {id:'structure',label:'Forma',tabs:[['shape','Forma e deformazioni','shape'],['grains','Particelle','shape','particles'],['trails','Fibre e scie','motion','particles']]},
 {id:'movement',label:'Movimento',tabs:[['motion','Animazione','motion']]},
 {id:'look',label:'Aspetto',tabs:[['material','Materiale','material'],['color','Colori','palette'],['light','Luci','sun']]},
 {id:'scene',label:'Scena',tabs:[['background','Sfondo','background'],['tone','Correzione colore','photo']]},
 {id:'post',label:'Filtri',tabs:[['photo','Filtri','photo']]},
 {id:'interaction',label:'Interazione',tabs:[['fields','Campi di forza','move'],['body','Mani e braccia','orbit'],['audio','Audio','audio']]}
];
const PROCEDURES=[{"label": "Guscio e spessore", "aliases": ["Membrana", "Membrane vive"], "description": "Svuota il volume della forma mantenendo una parete di spessore regolabile. È una costruzione geometrica; non simula una membrana fisica."}, {"label": "Reticolo di fibre", "aliases": ["Fibre e tessitura", "Tessuto e connessioni"], "description": "Separa la superficie in fili longitudinali e trasversali. Densità, larghezza e intreccio modificano la stessa struttura."}, {"label": "Suddivisione radiale e strati", "aliases": ["Lamelle e strati", "Veli e aureole", "Veli trasparenti e aureole"], "description": "Apre intervalli radiali, sezioni e gusci concentrici nella forma corrente. Trasparenza ed emissione si regolano nel materiale."}, {"label": "Filamenti su superficie", "aliases": ["Filamenti e spine", "Pianeti di filamenti"], "description": "Distribuisce filamenti ancorati alla superficie. Lunghezza, diametro, curvatura e raggruppamento permettono pelo, ciuffi e spine."}, {"label": "Curve toroidali e nodi", "aliases": ["Anelli e nodi", "Nodi morbidi"], "description": "Costruisce tubi o nastri lungo percorsi chiusi. Raggio, sezione, torsione e intreccio sono indipendenti."}, {"label": "Reazione-diffusione", "aliases": ["Crescita organica", "Gray Scott"], "description": "Il modello Gray–Scott genera un campo 3D. Qui il campo modifica colore, rugosità e normali (bump), non il contorno. Scorrimento trasporta il campo già calcolato."}, {"label": "Interferenza di pellicola", "aliases": ["Interferenza e iridescenza", "Cobalto e oro", "Pellicola madreperlacea"], "description": "I riflessi dipendono dallo spessore ottico e dalla variazione della pellicola. Cobalto e oro è un esempio di valori, non una modalità."}, {"label": "Bump procedurale", "aliases": ["Texture organica", "Grinze", "Pieghe della materia"], "description": "Una trama perturba le normali usate dalla luce. Produce l’aspetto di un rilievo senza cambiare la silhouette della geometria."}, {"label": "Distorsione ricorsiva 2D", "aliases": ["Warp ricorsivo", "Warp"], "description": "Ripete una deformazione delle coordinate dell’immagine nello stesso fotogramma. Non conserva immagini precedenti: il feedback temporale è un’altra funzione."}, {"label": "Rifrazione 2D", "aliases": ["Vetro", "Vetro ottico"], "description": "Deforma e filtra l’immagine della scena. È un trattamento finale, distinto dalla rifrazione del materiale 3D."}, {"label": "Oscillazione delle fibre", "aliases": ["Fibre che respirano", "Respiro delle fibre"], "description": "Varia periodicamente la posa delle fibre. Ampiezza, fase e ritardo regolano il movimento; non implica una simulazione di vento."}];
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
  group('Struttura','shape-structure',['Proprietà','Guscio e spessore','Reticolo di fibre','Suddivisione radiale e strati','Piegatura e curvatura']);
  group('Profilo','shape-profile',['Deformazioni','Foro','Ritaglio','Lobi e onde']);
 }
 if(scope==='particles/shape')group('Struttura','particle-structure',['Lobi, rami e addensamenti','Rumore multiscala','Rete di percorsi','Tentacoli del nucleo','Fasci esterni','Deformazioni']);
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
 for(const d of root.querySelectorAll('details')){
  const title=d.querySelector(':scope > summary')?.textContent,term=PROCEDURES.find(t=>t.label===title);
  if(term&&!d.querySelector(':scope > .procedure-help')){const p=document.createElement('p');p.className='help procedure-help';p.textContent=term.description;d.querySelector('summary').after(p);}
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
    const oldNames=PROCEDURES.filter(t=>ancestors.some(a=>a.includes(t.label))).flatMap(t=>t.aliases);
    const parameterAliases={growthFeed:['Nutrimento'],growthKill:['Consumo'],growthAge:['Sviluppo della trama'],growthDepth:['Incisione / rilievo'],filPhase:['Scorrimento'],filWind:['Oscillazione delle punte'],structBreath:['Dilatazione del respiro'],structFlap:['Apertura del battito'],glow:['Diffusione alone'],emission:['Luce propria']};
    oldNames.push(...(parameterAliases[el.dataset.param]||[]));
    entries.push({tab:tab.id,label,path:[tab.groupLabel,tab.label,...ancestors].join(' › '),selector,haystack:clean([label,...ancestors,...oldNames,tab.label,({structure:'geometria forma',look:'materiale luce aspetto',post:'post processing filtri',interaction:'modulazione interazione'})[tab.group]||'',aliases[tab.id]||''].join(' '))});
   }
  }
 }
 function search(){
  const words=clean(input.value).split(' ').filter(Boolean);if(!words.length){close();return;}
  const found=entries.filter(e=>words.every(w=>e.haystack.includes(w))).sort((a,b)=>(clean(b.label).includes(clean(input.value))?1:0)-(clean(a.label).includes(clean(input.value))?1:0));
  results.replaceChildren();results.hidden=false;status.textContent=found.length?found.length+' risultati'+(found.length>24?' · precisa la ricerca':''):'Nessun risultato · prova «orbita», «spessore» o «luce»';
  for(const entry of found.slice(0,24)){
   const b=document.createElement('button');b.type='button';b.className='control-search-result';const title=document.createElement('strong'),path=document.createElement('small');title.textContent=entry.label;path.textContent=entry.path;b.append(title,path);
   b.onclick=()=>{input.value='';close();showTab(entry.tab);document.getElementById('controls').classList.remove('only-changed');const target=document.getElementById('controls').querySelector(entry.selector);if(!target)return;let d=target.closest('details');while(d){d.open=true;d=d.parentElement.closest('details');}const host=target.closest('.param,.field,.check,.color-field')||target;host.classList.add('search-highlight');requestAnimationFrame(()=>{target.focus({preventScroll:true});target.scrollIntoView({block:'center',behavior:'smooth'});});setTimeout(()=>host.classList.remove('search-highlight'),2200);};results.append(b);
  }
 }
 input.addEventListener('focus',()=>{refresh();search();});input.addEventListener('input',search);
 document.getElementById('control-search-clear').onclick=()=>{input.value='';close();input.focus();};
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';close();}if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();results.querySelector('button')?.click();}});
 results.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';close();input.focus();}});
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.inspector-search'))close();});
 return {close};
}
