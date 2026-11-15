import {organizeWorkspace} from './workspace-layout.js?v=6a9e627b503d';
import {mountPresetLibrary} from './preset-library.js?v=6a9e627b503d';
import {newCreation,material} from './creative-model.js?v=6a9e627b503d';
import {addHelp} from './inspector-ui.js?v=6a9e627b503d';
import {MOODS} from './model.js?v=6a9e627b503d';
import {CONTROL_NAMES,EXPERT_KEYS} from './control-vocabulary.js?v=6a9e627b503d';
import {animationMarkup,motionGroups,composePanel,WORK_TABS} from './workflow-panels.js?v=6a9e627b503d';
const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const put=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
export function mountWorkflowTools(api){
 const {getState,showTab,renderControls,toast,remember,mark,adopt,getSnapshot}=api;
 const root=document.getElementById('controls'),head=document.querySelector('.inspector-head');
 const sectionHome=document.querySelector('.inspector-tools'),sectionButtons=[document.getElementById('sections-open'),document.getElementById('sections-close')];
 const presets=document.getElementById('presets'),presetHome=presets.parentElement;let thumbnailObserver=null;const materialThumbs=new Map();document.body.classList.add('unified-library');
 const pinned=get('prisma-pinned-controls',[]),recent=get('prisma-recent-controls',[]);
 let quickControlsOpen=false;
 let popup=null,popupRequest=null,popupAdvanced=false;
 const savedLevel=get('prisma-control-level','expert');
 let level=['simple','complete','expert'].includes(savedLevel)?savedLevel:'expert',lastAction='Modifica',comparison=null;
 const mode=document.createElement('select');mode.id='control-level';mode.setAttribute('aria-label','Livello dei controlli');mode.innerHTML='<option value="simple">Essenziali</option><option value="complete">Avanzati</option><option value="expert">Esperto</option>';mode.value=level;head.append(mode);mode.onchange=()=>{level=mode.value;put('prisma-control-level',level);renderControls();};
 const status=document.createElement('span');status.id='session-save-status';status.setAttribute('role','status');status.textContent='Sessione locale';document.querySelector('.inspector-footer').replaceChildren(status);
 const button=(id,label,fn)=>{const b=document.createElement('button');b.type='button';b.id=id;b.className='quiet';b.textContent=label;b.onclick=()=>{tools.open=false;return fn();};return b;};
 const tools=document.createElement('details');tools.className='workflow-menu';tools.innerHTML='<summary aria-label="Aiuto e strumenti">?</summary>';const content=document.createElement('div');content.className='workflow-menu-body';tools.append(content);document.querySelector('.header-actions').append(tools);tools.addEventListener('toggle',()=>{if(!tools.open)return;const r=tools.querySelector('summary').getBoundingClientRect(),height=content.getBoundingClientRect().height;content.style.left=Math.max(8,Math.min(innerWidth-236,r.left))+'px';content.style.top=Math.max(8,Math.min(innerHeight-height-8,r.bottom+6))+'px';});document.addEventListener('pointerdown',e=>{if(!tools.contains(e.target))tools.open=false;});window.addEventListener('resize',()=>tools.open=false);
 const dialog=(id,title)=>{const d=document.createElement('dialog');d.id=id;d.className='small-dialog';const h=document.createElement('form');h.method='dialog';h.className='dialog-head';h.innerHTML='<h2>'+title+'</h2><button aria-label="Chiudi">×</button>';d.append(h);const body=document.createElement('div');body.className='dialog-body';d.append(body);document.body.append(d);return {d,body};};
 const log=dialog('history-dialog','Cronologia');
 function showHistory(){log.body.replaceChildren();if(!api.history.length)log.body.textContent='Nessuna modifica da annullare.';for(let i=api.history.length-1;i>=Math.max(0,api.history.length-20);i--){const entry=api.history[i],b=button('',entry.label||'Modifica',()=>{const n=api.history.length-i;for(let j=0;j<n;j++)api.undo();log.d.close();});b.className='outline full';b.title='Torna a prima di questa modifica e annulla le successive';log.body.append(b);}log.d.showModal();}
 content.append(button('history-open','Cronologia',showHistory));
 const compare=dialog('comparison-dialog','Confronto A / B');compare.d.classList.add('comparison-dialog');
 async function compareAB(){if(!comparison){toast('Prima conserva una versione A.');return;}const current=getSnapshot();compare.body.replaceChildren();compare.d.showModal();const views=document.createElement('div');views.className='comparison-views';compare.body.append(views);for(const [label,snapshot] of [['A · conservata',comparison],['B · attuale',current]]){const card=document.createElement('figure');card.innerHTML='<figcaption>'+label+'</figcaption>';views.append(card);const image=document.createElement('img');image.alt=label;card.append(image);try{const url=await api.thumbnail(snapshot.state,snapshot.phase,snapshot.ratio,()=>!compare.d.open,600);if(!compare.d.open)return;if(url)image.src=url;}catch{image.alt='Anteprima non disponibile';}const b=button('',label.startsWith('A')?'Usa A':'Mantieni B',()=>{if(label.startsWith('A')){remember(undefined,'Ripristina versione A');adopt(structuredClone(snapshot.state),snapshot.name,snapshot);}compare.d.close();});card.append(b);}}
 content.append(button('compare-pin','Conserva versione A',()=>{comparison=getSnapshot();put('prisma-comparison-a',comparison);toast('Versione A conservata nel browser');}),button('compare-open','Confronta A / B',compareAB));comparison=get('prisma-comparison-a',null);const compareActions=document.createElement('span');compareActions.className='compare-actions';compareActions.append(document.getElementById('compare-pin'),document.getElementById('compare-open'));document.querySelector('.random-bar').append(compareActions);document.getElementById('compare-pin').textContent='Conserva A';document.getElementById('compare-open').textContent='A / B';
 const keyboard=dialog('shortcut-dialog','Scorciatoie');keyboard.body.innerHTML='<p>Spazio: riproduci / pausa<br>Ctrl o ⌘ Z: annulla<br>Maiusc + Ctrl o ⌘ Z: ripeti<br>R: variazione casuale<br>V: opzioni di variazione<br>F: schermo intero<br>1–8: schede principali<br>?: questo elenco</p>';
 content.append(button('tips-reset','Mostra i suggerimenti',()=>{put('prisma-context-tips',[]);toast('Suggerimenti riattivati');}),button('shortcuts-open','Scorciatoie',()=>keyboard.d.showModal()));
 try{localStorage.removeItem('prisma-start-guide-seen');}catch{}
 const library=document.getElementById('gallery-open');library.textContent='I miei preset';document.getElementById('reset').textContent='Ricomincia';document.getElementById('random-settings').textContent='Variazione…';
 document.querySelector('#similar-dialog h2')?.replaceChildren(document.createTextNode('Varianti della creazione'));
 document.getElementById('expand-preview').hidden=true;document.getElementById('fullscreen').className='quiet';document.getElementById('fullscreen').textContent='Schermo intero';
 document.querySelector('.canvas-tools .scene-interactions > summary').textContent='Interazione';
 document.addEventListener('keydown',e=>{if(document.body.classList.contains('pg-open'))return;if(e.target.matches('input,select,textarea')||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();if(/^[1-8]$/.test(k)){e.preventDefault();showTab(WORK_TABS[Number(k)-1][0]);}else if(k==='r')document.getElementById('randomize').click();else if(k==='v')document.getElementById('random-settings').click();else if(k==='f')document.getElementById('fullscreen').click();else if(k==='?')keyboard.d.showModal();});
 organizeWorkspace();
 const compact=matchMedia('(max-width:700px)'),header=document.querySelector('.header-actions');
 const mobileButtons=['play','undo','redo','wallpaper-guide','performance-open'].map(id=>document.getElementById(id)).filter(Boolean);
 const moodboard=document.querySelector('.moodboard-link');if(moodboard)mobileButtons.push(moodboard);
 const homes=new Map(mobileButtons.map(el=>{const anchor=document.createComment('Toolbar control');el.before(anchor);return [el,anchor];}));
 const moved=document.createElement('div');moved.className='compact-menu-actions';content.prepend(moved);
 const arrange=()=>{tools.open=false;for(const [el,anchor] of homes){if(compact.matches){if(el.id==='play')header.prepend(el);else moved.append(el);}else anchor.after(el);}moved.hidden=!compact.matches;};
 arrange();compact.addEventListener('change',arrange);
 requestAnimationFrame(()=>{const el=document.getElementById('playground-open');if(el){const anchor=document.createComment('Playground');el.before(anchor);homes.set(el,anchor);arrange();}});
 const inspector=document.querySelector('.inspector'),workspace=inspector.parentElement;
 const separator=document.createElement('div');separator.className='inspector-width';separator.tabIndex=0;
 separator.setAttribute('role','separator');separator.setAttribute('aria-orientation','vertical');separator.setAttribute('aria-label','Larghezza dei parametri');
 separator.setAttribute('aria-valuemin','320');separator.setAttribute('aria-valuemax','560');inspector.prepend(separator);
 function setWidth(n,save){
  const value=Math.max(320,Math.min(560,Math.round(n)));
  workspace.style.setProperty('--inspector-width',value+'px');separator.setAttribute('aria-valuenow',value);
  if(save)put('prisma-inspector-width',value);
 }
 const width=()=>inspector.getBoundingClientRect().width;
 setWidth(get('prisma-inspector-width',innerWidth>=1600?390:360),false);
 separator.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setWidth(e.key==='Home'?320:e.key==='End'?560:width()+(e.key==='ArrowLeft'?12:-12),true);};
 let resizeStart=null;
 separator.onpointerdown=e=>{if(e.button!==0)return;resizeStart={x:e.clientX,width:width()};separator.setPointerCapture(e.pointerId);};
 separator.onpointermove=e=>{if(resizeStart)setWidth(resizeStart.width+resizeStart.x-e.clientX,false);};
 separator.onlostpointercapture=()=>{if(resizeStart){resizeStart=null;setWidth(width(),true);}};
 function closeEditor(){popupRequest=null;popupAdvanced=false;popup?.close?.();popup?.remove();popup=null;}
 function openEditor(request){
  popup?.remove();popup=null;popupRequest=request;
  const inline=!!request.path;
  const d=document.createElement(inline?'section':'dialog');if(inline)d.classList.add('parameter-animation');d.id='animation-editor';d.classList.add('animation-editor');d.setAttribute('aria-label','Regola il parametro');const header=document.createElement('div');header.className='dialog-head';const title=document.createElement('h2'),close=button('','×',closeEditor);close.setAttribute('aria-label','Chiudi editor');header.append(title,close);const body=document.createElement('div');body.className='dialog-body';d.append(header,body);
  const raw=api.rawPanelMarkup;
  if(request.path){
   const source=document.createElement('div');source.innerHTML=animationMarkup(request.path,raw);const track=source.firstElementChild;if(!track){popupRequest=null;toast('Questo movimento è sospeso dai vincoli della forma.');return;}
   title.textContent=CONTROL_NAMES[request.path.split('.')[1]]||request.label||track.querySelector('summary')?.textContent||'Animazione';
   const advanced=document.createElement('details');advanced.className='animation-advanced';advanced.innerHTML='<summary>Regola andamento e fase</summary>';advanced.open=popupAdvanced;
   for(const e of [...track.querySelectorAll('input:not(.number),select')]){
    const path=e.dataset.path||e.dataset.pathCheck||e.dataset.pathSelect;if(!path)continue;const row=e.closest('.param,.field,.check');if(!row)continue;
    const basic=/\.(enabled|mode|amplitude|cycles)$/.test(path);(basic?body:advanced).append(row);
    const label=row.querySelector('label');if(label&&path.endsWith('.amplitude'))label.textContent='Ampiezza';if(label&&path.endsWith('.cycles'))label.textContent='Ripetizioni nel loop';
    if(path.endsWith('.mode')){for(const n of row.childNodes)if(n.nodeType===3)n.textContent='Stile';for(const o of e.options)o.textContent=o.value==='wave'?'Va e torna':request.path.endsWith('.orbit')||/rotate/.test(request.path)?'Giro continuo':'Scorrimento continuo';}
   }
   if(advanced.querySelector('input,select'))body.append(advanced);advanced.addEventListener('toggle',()=>popupAdvanced=advanced.open);
  }else if(request.group!==undefined){const group=motionGroups(raw)[request.group];if(!group)return;title.textContent=group.querySelector('summary').textContent;group.querySelector('summary').remove();body.append(...group.childNodes);for(const details of body.querySelectorAll('details'))details.open=false;
  }else if(request.omitted){title.textContent='Altri parametri modificati';for(const item of root.omittedControls||[])if(item.changed){const b=button('',item.label,()=>openEditor({key:item.key,expert:item.expert,label:item.label,markup:item.html}));b.className='animation-link';body.append(b);}
  }else{title.textContent=request.label||'Parametro';const current=document.createElement('div');current.innerHTML=composePanel(api.getTab(),raw,getState());const value=request.key?current.querySelector('[data-param="'+request.key+'"]'):null;body.innerHTML=value?.closest('.param')?.outerHTML||request.markup||'';const note=document.createElement('p');note.className='help';note.textContent='Questo controllo appartiene ai livelli avanzati. Il valore resta nel preset anche in Essenziali.';body.prepend(note);const higher=button('','Mostra in '+(request.expert?'Esperto':'Avanzati'),()=>{closeEditor();mode.value=request.expert?'expert':'complete';mode.dispatchEvent(new Event('change'));const el=root.querySelector('[data-param="'+request.key+'"]');if(el){let d=el.closest('details');while(d){d.open=true;d=d.parentElement.closest('details');}el.scrollIntoView({block:'center'});}});body.append(higher);}
  if(level!=='expert'&&request.group!==undefined)for(const e of body.querySelectorAll('[data-param]'))if(EXPERT_KEYS.has(e.dataset.param)||/Seed$|Contact|Collision|Octaves/.test(e.dataset.param))e.closest('.param')?.remove();
  addHelp(body);
  popup=d;if(inline){const trigger=[...root.querySelectorAll('[data-animate-path]')].find(b=>b.dataset.animatePath===request.path);const row=trigger?.closest('.param')||trigger;if(row)row.after(d);else root.prepend(d);for(let parent=d.parentElement.closest('details');parent;parent=parent.parentElement.closest('details'))parent.open=true;return;}
  root.append(d);d.addEventListener('cancel',()=>{popupRequest=null;popupAdvanced=false;});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeEditor();}});d.showModal();
 }
 function revealControl(entry){
  const source=document.createElement('div');source.innerHTML=composePanel(entry.tab,api.rawPanelMarkup,getState());const el=source.querySelector(entry.selector);if(!el)return false;
  const row=el.closest('.param,.field,.check,.color-field')||el;openEditor({key:el.dataset.param,expert:EXPERT_KEYS.has(el.dataset.param),label:entry.label,markup:row.outerHTML});return true;
 }
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.animatePath){
  if(popupRequest?.path===b.dataset.animatePath){closeEditor();return;}
  const path=b.dataset.animatePath;
  openEditor({path,label:b.dataset.animationLabel});
  const checkbox=popup?.querySelector('[data-path-check$=".enabled"]');
  if(checkbox&&!checkbox.checked){
   remember(undefined,'Anima '+(b.dataset.animationLabel||b.textContent));checkbox.checked=true;
   checkbox.dispatchEvent(new Event('change',{bubbles:true}));
  }
 }if(b.dataset.animationGroup!==undefined)openEditor({group:Number(b.dataset.animationGroup)});if(b.dataset.revealOmitted){const item=(root.omittedControls||[]).find(r=>r.key===b.dataset.revealOmitted);if(item)openEditor({key:item.key,expert:item.expert,label:item.label,markup:item.html});}if(b.dataset.openLibrary){closeEditor();showTab('library');root.querySelector(`[data-library-category="${b.dataset.openLibrary}"]`)?.setAttribute('open','');}if(b.id==='library-saved')api.showGallery();});
 root.addEventListener('change',e=>{
  const key=e.target.dataset.param||e.target.dataset.number;
  if(key){
   const title=e.target.closest('.param')?.querySelector('label')?.textContent||key;
   const entry={tab:api.getTab(),key,title};const index=recent.findIndex(x=>x.key===key);if(index>=0)recent.splice(index,1);
   recent.unshift(entry);recent.splice(8);put('prisma-recent-controls',recent);refreshQuickControls();
  }
  if(e.target.id==='add-animation'&&e.target.value){openEditor({path:e.target.value});const active=popup?.querySelector('[data-path-check$=".enabled"]');if(active&&!active.checked){remember(undefined,'Nuova animazione');active.checked=true;active.dispatchEvent(new Event('change',{bubbles:true}));}}
  if(e.target.dataset.layerToggle){const key={links:'pLinks',trails:'pTrailCount',skin:'pLiving'}[e.target.dataset.layerToggle],s=getState();remember(undefined,'Attiva o disattiva '+e.target.dataset.layerToggle);s.layerMemory??={};if(!e.target.checked){s.layerMemory[key]=s[key];s[key]=0;}else{s[key]=s.layerMemory[key]||{pLinks:.5,pTrailCount:700,pLiving:3}[key];if(key==='pLiving'&&!s.pSkin)s.pSkin=1;}const kind=e.target.dataset.layerToggle,on=e.target.checked;mark();renderControls();const layer=root.querySelector('#layer-'+kind);if(layer)layer.open=on;}
 });
 root.addEventListener('click',e=>{if(e.target.matches('[data-layer-toggle]'))e.stopPropagation();else if(e.target.closest('[data-layer-off=true] > summary'))e.preventDefault();});
 let numericDrag=null;
 root.addEventListener('pointerdown',e=>{const input=e.target;if(e.pointerType==='mouse'&&e.button===0&&input.matches('input.number[data-number]')&&Number.isFinite(input.valueAsNumber))numericDrag={input,id:e.pointerId,x:e.clientX,value:input.valueAsNumber,active:false};});
 root.addEventListener('pointermove',e=>{
  const d=numericDrag;if(!d||e.pointerId!==d.id||!(e.buttons&1))return;
  const distance=e.clientX-d.x;if(!d.active&&Math.abs(distance)<6)return;
  if(!d.active){d.active=true;d.input.setPointerCapture(e.pointerId);d.input.classList.add('number-dragging');}
  const step=Number(d.input.step),increment=Math.trunc(distance/(e.altKey?16:4))*(e.shiftKey?10:1);
  const value=Math.min(+d.input.max,Math.max(+d.input.min,+((d.value+step*increment).toFixed(7))));
  if(d.input.valueAsNumber!==value){d.input.value=value;d.input.dispatchEvent(new Event('input',{bubbles:true}));}
  e.preventDefault();
 });
 const endNumberDrag=e=>{const d=numericDrag;if(!d||e.pointerId!==d.id)return;numericDrag=null;if(d.active){d.input.classList.remove('number-dragging');if(d.input.valueAsNumber!==d.value)d.input.dispatchEvent(new Event('change',{bubbles:true}));}};
 document.addEventListener('pointerup',endNumberDrag);
 document.addEventListener('pointercancel',endNumberDrag);
 const tipSeen=()=>get('prisma-context-tips',[]);
 function showContextTip(e){const target=e.target.closest('[data-animate-open],[data-lock-parameter],#random-settings');if(!target)return;const key=target.id==='random-settings'?'vary':target.dataset.lockParameter?'lock':'animate';if(tipSeen().includes(key))return;put('prisma-context-tips',[...tipSeen(),key]);const text={animate:'Anima questo valore senza cambiare gli altri parametri.',lock:'Conserva questo valore durante Casuale e Varianti.',vary:'Scegli quanto cambiare e quali valori conservare.'}[key];target.title=text;toast(text);}
 document.addEventListener('pointerover',showContextTip);document.addEventListener('focusin',showContextTip);
 document.getElementById('random-settings').addEventListener('click',()=>{const box=document.getElementById('parameter-locks')||document.createElement('details');box.id='parameter-locks';box.innerHTML='<summary>Valori da conservare</summary>';const seen=new Set();for(const [tab] of WORK_TABS.filter(([t])=>t!=='library')){const d=document.createElement('div');d.innerHTML=composePanel(tab,api.rawPanelMarkup,getState());for(const input of d.querySelectorAll('[data-param]')){const key=input.dataset.param;if(seen.has(key))continue;seen.add(key);const label=document.createElement('label');label.className='check';const check=document.createElement('input');check.type='checkbox';check.checked=(getState().controlLocks||[]).includes(key);label.append(check,input.closest('.param').querySelector('label').textContent);check.onchange=()=>{remember(undefined,'Blocco parametro');const keys=new Set(getState().controlLocks||[]);check.checked?keys.add(key):keys.delete(key);getState().controlLocks=[...keys];mark(false);};box.append(label);}}document.querySelector('#random-dialog .dialog-body').append(box);});
 document.addEventListener('pointerdown',e=>{const target=e.target.closest('.param,.check,.field,button');if(target)lastAction=(target.querySelector('label')?.textContent||target.getAttribute('aria-label')||target.textContent||'Modifica').replace(/\s+/g,' ').trim().slice(0,90);},true);
 function refreshQuickControls(){
  const old=root.querySelector('.quick-controls');if(old){quickControlsOpen=old.open;old.remove();}
  if(!pinned.length&&!recent.length||api.getTab()==='library')return;
  const list=document.createElement('details'),summary=document.createElement('summary');
  list.className='quick-controls';list.open=quickControlsOpen;summary.textContent='Comandi fissati e recenti';list.append(summary);
  list.ontoggle=()=>{if(list.isConnected)quickControlsOpen=list.open;};
  for(const entry of [...pinned,...recent.filter(x=>!pinned.some(p=>p.key===x.key))]){
   const selector='[data-param="'+CSS.escape(entry.key)+'"]';
   const link=button('',entry.title,()=>{
    quickControlsOpen=list.open;showTab(entry.tab);
    const param=root.querySelector(selector);
    if(!param){revealControl({tab:entry.tab,selector,label:entry.title});return;}
    for(let d=param.closest('details');d;d=d.parentElement.closest('details'))d.open=true;
    param.scrollIntoView({block:'center'});param.focus({preventScroll:true});
   });
   link.title=pinned.includes(entry)?'Comando fissato':'Comando recente';list.append(link);
  }
  root.querySelector('.section-jumps,.inspector-overview')?.after(list);
 }
 function decorate(panel){
  const seed=document.querySelector('.seed');(document.getElementById('workspace-variants')||document.querySelector('#random-dialog .dialog-body')).append(seed);
  const actions=panel.querySelector('.section-visibility');if(actions)actions.append(...sectionButtons);
  for(const input of panel.querySelectorAll('input[data-param]')){
   const key=input.dataset.param,row=input.closest('.param'),line=row.querySelector('.param-line'),locked=(getState().controlLocks||[]).includes(key);
   const b=button('',locked?'Bloccato':'Blocca',()=>{remember(undefined,'Blocco del parametro');const keys=new Set(getState().controlLocks||[]);keys.has(key)?keys.delete(key):keys.add(key);getState().controlLocks=[...keys];mark(false);renderControls();});b.textContent=locked?'Bloccato':'Blocca';b.className='parameter-lock';b.dataset.lockParameter=key;b.setAttribute('aria-pressed',String(locked));b.title='Conserva questo valore durante la variazione casuale';line.append(b);
   const title=row.querySelector('label')?.textContent||key,entry={tab:api.getTab(),key,title};
   const pin=button('','◇',()=>{const index=pinned.findIndex(x=>x.key===key);if(index>=0)pinned.splice(index,1);else pinned.push(entry);put('prisma-pinned-controls',pinned);pin.setAttribute('aria-pressed',String(index<0));refreshQuickControls();});
   pin.className='pin-control';pin.setAttribute('aria-label','Fissa '+title);pin.setAttribute('aria-pressed',String(pinned.some(x=>x.key===key)));line.append(pin);
   input.addEventListener('dblclick',()=>row.querySelector('.parameter-reset:not([disabled])')?.click());
  }
  refreshQuickControls();
  if(api.getTab()==='library'){
   panel.querySelector('#complete-presets-slot')?.append(presets);
   thumbnailObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const card=entry.target;thumbnailObserver?.unobserve(card);const id=(card.dataset.material!==undefined?'material:':'palette:')+(card.dataset.material??card.dataset.mood);const img=document.createElement('img');img.className='library-thumb';img.alt='';card.prepend(img);if(materialThumbs.has(id)){img.src=materialThumbs.get(id);continue;}const state=newCreation();if(card.dataset.material!==undefined)material(state,Number(card.dataset.material));else state.palette=[...MOODS[Number(card.dataset.mood)].colors];api.thumbnail(state,0,1,()=>!card.isConnected).then(url=>{if(url&&card.isConnected){materialThumbs.set(id,url);img.src=url;}else img.remove();}).catch(()=>img.remove());}},{root:panel});for(const card of panel.querySelectorAll('button[data-material],button[data-mood]'))thumbnailObserver.observe(card);
   mountPresetLibrary(panel,WORK_TABS);
  }
  
  if(api.getTab()==='background'){
   const target=panel.querySelector('[data-color=background]');if(target){const pipette=button('background-eyedropper','Preleva colore dallo schermo',async()=>{if(!window.EyeDropper){toast('La pipetta non è disponibile in questo browser. Usa il selettore colore.');return;}try{const result=await new EyeDropper().open();remember(undefined,'Colore prelevato');getState().background=result.sRGBHex;mark();renderControls();}catch{}});target.closest('.color-field').after(pipette);}
  }
 }
 function beforeRender(){sectionHome.append(...sectionButtons);if(popup){if(popup.tagName==='DIALOG'&&!popup.open)popupRequest=null;popup.remove();popup=null;}thumbnailObserver?.disconnect();thumbnailObserver=null;if(presets.isConnected)presetHome.append(presets);}
 function afterRender(){if(popupRequest)openEditor(popupRequest);}
 return {beforeRender,afterRender,revealControl,closeEditor,get level(){return level;},get lastAction(){return lastAction;},get lockedKeys(){return getState().controlLocks||[];},decorate,dirty:()=>{status.textContent='Salvataggio…';},saved:()=>{status.textContent='Sessione salvata in questo browser';},saveFailed:()=>{status.textContent='Salvataggio locale non riuscito · esporta un preset';},refreshStatus:()=>{status.textContent='Sessione locale · preset salvati in I miei preset';}};
}
