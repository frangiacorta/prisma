import {controlCondition} from './control-help.js?v=5b48561291a2';
// Inspector actions are explicit state edits, recorded by the app's undo history.
export const SHAPE_ZERO=['deform','asymmetry','twist','waves','hole','cut','roundness','taper','bendX','bendY','lobeAmount','pinch','rimRound','petalAmount','stemAmount','loopAmount','structShell','structFibres','structWeft','structSlices','structRadial','structLayers','structGrowth','structCurl','structFold','structBreath','structFlap','structScallop','structSpiral','structStagger','structRuffle','structTaper','filLength'];
const PARTICLE_ZERO=['pOpening','pClumps','pLobeDepth','pOrganic','pWarp','pNeural','pTentacle','pOuter','pBundleAmount','pFoldDepth','pInflate','pContract','pPores','pSkinOpening'];
export const MOTION_ZERO=['dynAmount','growthFlow','filmFlow','filmSwirl','pTravel','pVortex','pReentry','pLife','pSignal','pBreath','pRandom','pJitter','pWander','pSpaceWarp','pOrbitPrecession','pOrbitDrift','pTentacleWave','pInflate','pContract','finishWarpMotion','finishGlassMotion','finishGlyphVariation'];
export function simplifyShape(state,amount=0){
 const keys=[...SHAPE_ZERO,...(state.engine==='particles'?PARTICLE_ZERO:[])];
 for(const k of keys)if(Number.isFinite(state[k]))state[k]*=amount;
 for(const k of ['volume','stretchX','stretchY','stretchZ',...(state.engine==='particles'?['pGrainSpacing','pGroupSpacing']:[])])if(Number.isFinite(state[k]))state[k]=1+(state[k]-1)*amount;
 if(amount===0){state.pLiving=0;state.pLivingBlend=0;state.pSurfaceBind=0;}
 if(state.engine==='particles'&&amount===0){state.pTrailCount=0;state.pLinks=0;state.pFill=1;state.pSymmetry=1;}
 for(const [k,t] of Object.entries(state.motions||{}))if(keys.includes(k)||['volume','stretchX','stretchY','stretchZ'].includes(k)){if(amount===0)t.enabled=false;else if(Number.isFinite(t.amplitude))t.amplitude*=amount;}
 if(amount===0)for(const p of [...state.forcePoints||[],...state.forcePaths||[]])p.enabled=false;
 return state;
}
export function simplifyMotion(state,amount=0){
 for(const t of [...Object.values(state.motions||{}),...(state.lights||[]).flatMap(l=>[l.orbit,l.pulse]).filter(Boolean)]){
  if(amount===0)t.enabled=false;
  else if(t.enabled&&Number.isFinite(t.amplitude)&&t.mode!=='cycle')t.amplitude*=amount;
 }
 for(const k of MOTION_ZERO)if(Number.isFinite(state[k]))state[k]*=amount;
 if(amount===0){state.environmentRotate=false;state.finishGlitchAnimate=false;state.finishScanAnimate=false;for(const k of ['animateRotation','animateShape','animateColor','animateLight'])state[k]=false;}
 return state;
}
// An effect is on only when its enabling amount/checkbox is on. Subparameters
// such as density or frequency do not falsely make an inactive effect active.
const EFFECTS=[
 ['deform','Irregolarità'],['asymmetry','Asimmetria'],['twist','Torsione'],['bendX','Curvatura','bendY'],['taper','Rastremazione'],
 ['transparency','Trasparenza'],['thinFilm','Pellicola ottica'],['coat','Rivestimento'],['subsurface','Diffusione interna'],['emission','Emissione'],
 ['pOrganic','Deformazione delle particelle'],['pClumps','Addensamenti'],['pWarp','Distorsione delle particelle'],
 ['dynAmount','Dinamica'],
 ['loopAmount','Curve toroidali e nodi'],['structShell','Guscio e spessore'],['structFibres','Reticolo di fibre'],['structRadial','Suddivisione radiale e strati','structSlices','structLayers'],
 ['filLength','Filamenti su superficie'],['petalAmount','Petali e radici'],['stemAmount','Gambo'],['hole','Foro'],['cut','Ritaglio'],['lobeAmount','Lobi e onde','waves'],
 ['structCoreDark','Nucleo scuro'],['colorLayers','Strati di colore'],['textureDepth','Rilievo di superficie'],['growthAmount','Reazione-diffusione'],['iridescence','Iridescenza'],['colorWaveAmount','Onde di colore'],
 ['finishScan','Linee modulate'],['finishWarp','Distorsione ricorsiva'],['finishGlass','Vetro ottico'],['finishGlitch','Glitch'],['finishGlyph','Segni e caratteri'],['finishEdge','Contorni'],['finishMosaic','Mosaico'],['finishRgb','Separazione dei colori'],
 ['pSelfShadow','Ombre reciproche'],['pCaustic','Caustica'],['pShadow','Ombra sul piano'],['pLiving','Pelle'],['pLinks','Fili'],['pTrailCount','Scie'],['pTentacle','Tentacoli del nucleo'],['pOuter','Fasci esterni']
];
const active=v=>typeof v==='boolean'?v:typeof v==='number'&&Math.abs(v)>1e-7;
const equal=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<1e-7:a===b;
function at(s,path){let v=s;for(const part of path.split('.'))v=Array.isArray(v)?v.find(x=>String(x.id)===part):v?.[part];return v;}
function assign(s,path,value){const parts=path.split('.'),key=parts.pop(),parent=parts.length?at(s,parts.join('.')):s;if(parent)parent[key]=value;}
function reveal(target){document.getElementById('controls').classList.remove('only-changed');const toggle=document.getElementById('controls-changed');if(toggle)toggle.setAttribute('aria-pressed','false');let d=target.closest('details');while(d){d.open=true;d=d.parentElement.closest('details');}target.scrollIntoView({block:'center',behavior:'smooth'});target.focus({preventScroll:true});}
export function decorateInspector({root,state,baseline,tab,edit}){
 const rangeRows=[];
 for(const el of root.querySelectorAll('input[data-param],input[data-path]')){
  const key=el.dataset.param||el.dataset.path,base=at(baseline,key),host=el.closest('.param');if(!host||typeof base!=='number')continue;
  const label=host.querySelector('label')?.textContent||key;
  const reset=document.createElement('button');reset.type='button';reset.className='parameter-reset';reset.textContent='↶';reset.title=`Ripristina ${label}: ${base}`;reset.setAttribute('aria-label',reset.title);
  reset.onclick=()=>edit(s=>assign(s,key,base),'Parametro ripristinato');host.querySelector('.param-line')?.append(reset);
  rangeRows.push({host,el,key,base,reset});
 }
 const flags=[...root.querySelectorAll('[data-check],[data-path-check],[data-particle-select],[data-path-select],[data-finish-select]')].map(el=>({el,key:el.dataset.check||el.dataset.pathCheck||el.dataset.particleSelect||el.dataset.pathSelect||el.dataset.finishSelect,host:el.closest('.check,.field')})).filter(r=>r.host&&at(baseline,r.key)!==undefined);
 const toolbar=document.createElement('div');toolbar.className='inspector-overview';
 root.classList.remove('only-changed');
 const heading=document.createElement('div');heading.className='overview-heading';heading.innerHTML='<strong>In uso</strong>';
 const toggle=document.createElement('button');toggle.type='button';toggle.id='controls-changed';toggle.className='quiet';toggle.textContent='Mostra modificati';toggle.setAttribute('aria-pressed',String(root.classList.contains('only-changed')));toggle.onclick=()=>{const on=root.classList.toggle('only-changed');toggle.setAttribute('aria-pressed',String(on));refresh();if(on)for(const d of root.querySelectorAll('details.has-changes'))d.open=true;};heading.append(toggle);toolbar.append(heading);
 const hint=document.createElement('p');hint.className='help';hint.textContent='Modificati: valori diversi da quelli iniziali.';toolbar.append(hint);
 const select=document.createElement('select');select.setAttribute('aria-label','Vai a una sezione');select.innerHTML='<option value="">Vai a una sezione…</option>';
 const sections=[...root.querySelectorAll(':scope > details')];sections.forEach((d,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=[...d.querySelector('summary').childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();select.append(opt);});select.onchange=()=>{if(select.value!==''){reveal(sections[+select.value].querySelector('summary'));select.value='';}};toolbar.append(select);
 const activeList=document.createElement('div');activeList.className='active-effect-list';toolbar.append(activeList);
 if(['shape','motion'].includes(tab)){
  const actions=document.createElement('div');actions.className='simplify-actions';
  for(const [label,amount] of tab==='shape'?[['Riduci deformazioni',.5],['Solo forma base',0]]:[['Riduci ampiezze',.5],['Rimuovi animazioni',0]]){
   const button=document.createElement('button');button.type='button';button.className='outline';button.textContent=state.engine==='particles'&&tab==='shape'?(amount===0?'Ripristina il nucleo':'Riduci irregolarità'):label;button.dataset.simplify=tab+'-'+amount;button.onclick=()=>edit(s=>(tab==='shape'?simplifyShape:simplifyMotion)(s,amount),label+' · puoi annullare',tab==='motion'&&amount===0);actions.append(button);
  }
  toolbar.append(actions);const help=document.createElement('p');help.className='help';help.textContent=tab==='shape'?'Riduci dimezza le deformazioni. Forma base rimuove aggiunte e campi manuali. Materiale e colori restano. Puoi annullare.':'Riduci conserva durata e giri completi. Rimuovi ferma le animazioni; audio e tracking restano in Interazione. Puoi annullare.';toolbar.append(help);
 }
 const actions=toolbar.querySelector('.simplify-actions');
 const activeMenu=document.createElement('details');activeMenu.className='overview-active';const activeSummary=document.createElement('summary');activeSummary.textContent='Effetti attivi';activeMenu.append(activeSummary,activeList);
 const visibility=document.createElement('div');visibility.className='section-visibility';const showActive=document.createElement('button');showActive.type='button';showActive.className='quiet';showActive.textContent='Apri attivi';showActive.id='sections-active';showActive.onclick=()=>{for(const d of sections){d.open=!!d.querySelector('.effect-status[data-on=true]');if(d.open)for(const child of d.querySelectorAll('details'))child.open=!!child.querySelector('.effect-status[data-on=true]');}};visibility.append(showActive);
 heading.replaceChildren(activeMenu,toggle);toolbar.replaceChildren(heading,select,visibility);if(['fields','body','audio'].includes(tab)){heading.hidden=true;showActive.hidden=true;}if(actions){const simplify=document.createElement('details');simplify.className='overview-simplify';simplify.innerHTML='<summary>Semplifica questa scheda</summary>';simplify.append(actions);const note=document.createElement('p');note.className='help';note.textContent=tab==='shape'?'Riduci dimezza le deformazioni. Forma base rimuove aggiunte e campi. Materiale e colori restano. Puoi annullare.':'Riduci dimezza le ampiezze e conserva i giri continui. Rimuovi ferma le animazioni; audio e mani si gestiscono in Interazione. Puoi annullare.';simplify.append(note);toolbar.append(simplify);}
 root.prepend(toolbar);
 const records=[];
 const motionEffects=tab==='motion'?[['pTravel','Orbite delle particelle'],['pVortex','Vorticità'],['pReentry','Rientro'],['pLife','Pulsazione'],['pBreath','Dilatazione'],['pRandom','Irregolarità del moto'],['pJitter','Microfluttuazioni'],['pWander','Deriva'],['pSpaceWarp','Distorsione spaziale'],['growthFlow','Scorrimento della trama'],['filmFlow','Scorrimento della pellicola'],['filmSwirl','Rotazione della pellicola'],['environmentRotate','Rotazione dei riflessi']]:[];
 for(const [key,label,...extra] of [...EFFECTS,...motionEffects]){
  const keys=[key,...extra],el=keys.map(k=>root.querySelector(`[data-param="${k}"],[data-check="${k}"],[data-particle-select="${k}"]`)).find(Boolean);if(!el)continue;
  const d=el.closest('details');if(!d)continue;
  records.push({label,keys,el});
 }
 for(const el of root.querySelectorAll('[data-path-check$=".enabled"]')){
  const d=el.closest('details');if(!d)continue;const summary=d.querySelector(':scope > summary'),label=[...summary.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();records.push({label,el,path:el.dataset.pathCheck});
 }
 for(const el of root.querySelectorAll('[data-animate-path]')){const path=el.dataset.animatePath+'.enabled';if(at(state,path))records.push({label:(el.dataset.animationLabel||el.textContent).split(' · ')[0]+' · animazione',el,path});}
 const sectionResets=[];
 for(const d of sections){
  const rows=rangeRows.filter(r=>d.contains(r.el)),checks=flags.filter(r=>d.contains(r.el));
  if(!rows.length&&!checks.length||d.matches('.example-library')||d.querySelector(':scope > .section-reset'))continue;
  const button=document.createElement('button');button.type='button';button.className='quiet section-defaults';button.textContent='Ripristina valori della sezione';button.onclick=()=>edit(s=>{for(const r of rows)assign(s,r.key,r.base);for(const r of checks)assign(s,r.key,at(baseline,r.key));},'Valori della sezione ripristinati · puoi annullare');d.append(button);sectionResets.push({d,button});
 }
 const empty=document.createElement('p');empty.className='help changed-empty';empty.textContent='Nessun parametro modificato rispetto ai valori iniziali.';root.append(empty);
 function refresh(){
  for(const info of root.querySelectorAll('[data-help-key]')){
   const condition=controlCondition(state,info.dataset.helpKey);
   info.dataset.baseHelp??=info.dataset.helpText;
   info.dataset.helpText=info.dataset.baseHelp+(condition?' Ora: '+condition:'');
   info.classList.toggle('condition-unmet',!!condition);
   info.title=condition||'';
   const description=document.getElementById(info.getAttribute('aria-describedby'));if(description)description.textContent=info.dataset.helpText;
  }
  for(const {host,el,key,base,reset} of rangeRows){const changed=!equal(at(state,key),base);host.classList.toggle('is-changed',changed);reset.disabled=!changed;reset.hidden=!changed;}
  for(const r of flags)r.host.classList.toggle('is-changed',!equal(at(state,r.key),at(baseline,r.key)));
  for(const d of root.querySelectorAll('details')){
   const n=d.querySelectorAll('.is-changed').length;d.classList.toggle('has-changes',n>0);let badge=d.querySelector(':scope > summary > .change-count');if(!badge){badge=document.createElement('span');badge.className='change-count';d.querySelector(':scope > summary')?.append(badge);}badge.textContent=n?`${n} ${n===1?'modificato':'modificati'}`:'';badge.hidden=!n;
  }
  activeList.replaceChildren();
  for(const r of records){
   const on=r.path?!!at(state,r.path):r.keys.some(k=>active(state[k])||state.motions?.[k]?.enabled)&&(!r.keys[0].startsWith('finish')||state.finishEnabled!==false&&(state[r.keys[0]+'Mix']??1)>0);r.on=on;
   if(on){let d=r.el.closest('details');while(d){d.classList.add('has-changes');d=d.parentElement.closest('details');}const chip=document.createElement('span');chip.className='active-effect';const jump=document.createElement('button');jump.type='button';jump.textContent=r.label;jump.onclick=()=>r.el.matches('[data-animate-path]')?r.el.click():reveal(r.el);const off=document.createElement('button');off.type='button';off.textContent='Disattiva';off.setAttribute('aria-label','Disattiva '+r.label);off.onclick=()=>{if(r.path){edit(s=>assign(s,r.path,false),r.label+' disattivata');}else edit(s=>{for(const k of r.keys){s[k]=typeof s[k]==='boolean'?false:0;if(s.motions?.[k])s.motions[k].enabled=false;}},r.label+' disattivato');};chip.append(jump,off);activeList.append(chip);}
  }
  const omitted=(root.omittedControls||[]).filter(r=>!equal(at(state,r.key),at(baseline,r.key)));
  for(const r of omitted){const b=document.createElement('button');b.type='button';b.className='animation-link';b.dataset.revealOmitted=r.key;b.textContent=r.label+' · modificato';activeList.append(b);}
  if(!activeList.children.length){const empty=document.createElement('span');empty.className='help';empty.textContent='Nessun effetto con interruttore attivo in questa scheda.';activeList.append(empty);}
  for(const d of root.querySelectorAll('details')){const effects=records.filter(r=>d.contains(r.el));if(!effects.length)continue;let badge=d.querySelector(':scope > summary > .effect-status');if(!badge){badge=document.createElement('span');badge.className='effect-status';d.querySelector(':scope > summary').append(badge);}const on=effects.filter(r=>r.on).length;const onlyTracks=effects.every(r=>r.path);badge.textContent=on?(onlyTracks?(on+' animazioni'):(on===1?'Attivo':on+' attivi')):(onlyTracks?'':'Spento');badge.dataset.on=String(on>0);d.classList.toggle('effect-off',on===0);}
  const n=root.querySelectorAll('.is-changed').length+omitted.length;toggle.textContent=root.classList.contains('only-changed')?`Mostra tutti · ${n} modificati`:`Modificati (${n})`;toggle.title='Valori diversi dalla configurazione iniziale; non equivale a effetto attivo';
  activeSummary.textContent='Effetti attivi ('+(records.filter(r=>r.on).length+omitted.length)+')';empty.hidden=n>0;for(const r of sectionResets)r.button.disabled=!r.d.querySelector('.is-changed');
  activeList.hidden=false;if(!records.length&&!omitted.length){activeSummary.textContent='Effetti attivi (0)';activeList.hidden=true;}
 }
 refresh();return {refresh};
}
