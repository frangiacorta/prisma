// Navigation only: the creation and its renderer are never changed here.
export const NAV_GROUPS=[
 {id:'structure',label:'Forma e moto',tabs:[['shape','Forma','shape'],['trails','Fibre e scie','motion','particles'],['motion','Movimento','motion']]},
 {id:'look',label:'Aspetto',tabs:[['material','Materia','material'],['color','Colori','palette'],['light','Luci','sun']]},
 {id:'scene',label:'Scena',tabs:[['background','Sfondo','background'],['photo','Finitura','photo']]},
 {id:'interaction',label:'Interazione',tabs:[['fields','Punti e percorsi','move','particles'],['body','Testa e mani','orbit'],['audio','Audio','audio']]}
];
export const navigationTabs=engine=>NAV_GROUPS.flatMap(g=>g.tabs.filter(t=>!t[3]||t[3]===engine).map(t=>({id:t[0],label:t[1],icon:t[2],group:g.id,groupLabel:g.label})));
const clean=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function renderNavigation(root,engine,tab,icon){
 const tabs=navigationTabs(engine),current=tabs.find(t=>t.id===tab)||tabs[0];
 root.innerHTML='<div class="nav-groups" aria-label="Aree di lavoro">'+NAV_GROUPS.map(g=>`<button type="button" data-tab="${tabs.find(t=>t.group===g.id).id}" aria-pressed="${current.group===g.id}" class="nav-group ${current.group===g.id?'active':''}">${g.label}</button>`).join('')+'</div><div class="nav-tabs" role="tablist" aria-label="'+current.groupLabel+'">'+tabs.filter(t=>t.group===current.group).map(t=>`<button type="button" role="tab" aria-controls="controls" id="tab-${t.id}" class="tab ${tab===t.id?'active':''}" data-tab="${t.id}" aria-selected="${tab===t.id}">${icon(t.icon)}${t.label}</button>`).join('')+'</div>';
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
 if(scope==='solid/shape'){
  group('Petali, radici e crescita','shape-growth',['Petali, spine e radici','Radici, corde e intrecci','Superficie e crescita irregolare','Innesto nella sfera','Proporzioni e distribuzione','Gambo opzionale','Esempio completo · Bloom']);
  group('Profilo e deformazioni','shape-profile',['Profilo, torsione e curvature','Vuoto interno · anelli','Ritaglio · semilune','Lobi e onde']);
 }
 if(scope==='particles/shape')group('Struttura e dettaglio organico','particle-structure',['Lobi, rami e addensamenti','Materia organica · dettaglio procedurale','Struttura neuronale','Tentacoli del nucleo','Fasci esterni','Deformazioni aggiuntive']);
 if(scope==='solid/motion'){
  group('Petali e radici in movimento','motion-growth',['Radici · crescita e intrecci','Radici · superficie e distribuzione','Petali e gambo · movimenti indipendenti']);
 }
 if(scope==='particles/motion')group('Deformazioni nel tempo','particle-motion-deform',['Vitalità e respiro','Tentacoli in movimento','Warp dello spazio','Ritmo e cadenze']);
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
    entries.push({tab:tab.id,label,path:[tab.groupLabel,tab.label,...ancestors].join(' › '),selector,haystack:clean([label,...ancestors,tab.label].join(' '))});
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
