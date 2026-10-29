import {clockStatus} from './animation-clock.js?v=02b214873299';
import {nameControls,CONTROL_NAMES,essentialKeys,EXPERT_KEYS,ESSENTIAL_FLAGS,ESSENTIAL_FIELDS,ESSENTIAL_BUTTONS} from './control-vocabulary.js?v=02b214873299';
export const WORK_TABS=[['shape','Forma'],['material','Materiale'],['color','Colori'],['light','Luci'],['background','Scena'],['photo','Filtri'],['motion','Movimento'],['library','Preset']];
const html=s=>{const d=document.createElement('div');d.innerHTML=s;return d;};
const section=(title,id)=>{const d=document.createElement('details');d.className='control-details';if(id)d.id=id;const h=document.createElement('summary');h.textContent=title;d.append(h);return d;};
const exampleSelector='#load-bloom-example,[data-sculpt],[data-material],#material-picker,[data-legacy-material],[data-film-look],[data-film-light],[data-texture-style],[data-motion-preset],[data-mood],#light-rig,[data-light-source],[data-backdrop],[data-audio-preset],[data-growth-study],[data-particle-material],[data-particle-film],[data-fiber-style],[data-link-style],[data-living-style],[data-veil-look]';
const transforms=['scale','positionX','positionY','rotateX','rotateY','rotateZ','stretchX','stretchY','stretchZ'];
const rowFor=e=>e.closest('.control-with-help')||e.closest('.param,.field,.check,.color-field')||e;
export function stripEmpty(root){for(const d of [...root.querySelectorAll('details')].reverse())if(!d.querySelector('input,select,button:not(.parameter-info):not([data-help-text]),details,output')&&!d.querySelector('canvas,video'))d.remove();}
const isParticle=s=>s.engine==='particles'||s.pLiving>0;
const labelFor=(key,fallback)=>CONTROL_NAMES[key]||fallback||key;
function moveRows(source,target,keys){for(const k of keys){const el=source.querySelector(`[data-param="${k}"]`);if(el&&!target.querySelector(`[data-param="${k}"]`))target.append(rowFor(el));}}
function motionOrigin(key){if(['duration','speed','motion','pCycles','pDirection','perfectLoop'].includes(key))return 'motion';if(/^environment/.test(key))return 'light';if(/^(film|growth)/.test(key))return 'material';if(/^(struct|fil|petal|stem|loop)/.test(key))return 'shape';return 'motion';}
function trackMap(raw){const root=html(raw('motion')),map=new Map();for(const el of root.querySelectorAll('[data-path-check$=".enabled"]')){const path=el.dataset.pathCheck.replace(/\.enabled$/,'');if(!map.has(path))map.set(path,el.closest('details'));}return map;}
export function animationMarkup(path,raw){const d=trackMap(raw).get(path);return d?.outerHTML||'';}
export function motionGroups(raw){const root=html(raw('motion'));root.querySelector('[data-dynamics-panel]')?.remove();for(const e of [...root.querySelectorAll('[data-path-check$=".enabled"]')])e.closest('details').remove();for(const e of [...root.querySelectorAll('[data-param]')])if(motionOrigin(e.dataset.param)!=='motion'||['duration','speed','motion','pCycles'].includes(e.dataset.param))rowFor(e).remove();for(const e of root.querySelectorAll('[data-check],[data-particle-select]'))rowFor(e).remove();stripEmpty(root);return [...root.children].filter(d=>d.matches('details')&&d.querySelector('[data-param]'));}
function baseMarkup(id,raw,state){
 const root=html(raw(id));
 if(id==='shape'&&isParticle(state))root.innerHTML+=raw('grains')+raw('trails');
 if(id==='shape'){
  for(const key of transforms)root.querySelector(`[data-param="${key}"]`)?.closest('.param')?.remove();
  for(const e of root.querySelectorAll('#force-controls,#guide-controls'))e.remove();
  const cavity=section('Cavità degli elementi'),source=html(raw('material'));moveRows(source,cavity,['hollow','wallThickness']);if(cavity.querySelector('input'))root.append(cavity);
 }
 if(id==='material'){root.querySelector('#add-inside-light')?.remove();for(const k of ['hollow','wallThickness'])root.querySelector(`[data-param="${k}"]`)?.closest('.param')?.remove();}
 if(id==='background'){
  const frame=section('Inquadratura','scene-frame');moveRows(root,frame,transforms);moveRows(html(raw('shape')),frame,transforms);root.prepend(frame);root.innerHTML+=raw('tone');
 }
 if(['shape','material','light'].includes(id)){
  const extra=section(id==='shape'?'Scorrimento e deformazione':id==='light'?'Rotazione dei riflessi':'Scorrimento del materiale');
  for(const e of html(raw('motion')).querySelectorAll('[data-param],[data-check]')){const key=e.dataset.param||e.dataset.check;if(motionOrigin(key)===id&&!root.querySelector(`[data-param="${key}"],[data-check="${key}"]`))extra.append(rowFor(e));}if(extra.querySelector('input'))root.append(extra);
 }
 const seen=new Set();for(const e of [...root.querySelectorAll('[data-param]')]){const key=e.dataset.param;if(seen.has(key))rowFor(e).remove();else seen.add(key);}
 stripEmpty(root);return root;
}
function particleLayers(root,state){
 const layers=[section('Nucleo','layer-core'),section('Granelli','layer-grains'),section('Fili','layer-links'),section('Scie','layer-trails'),section('Pelle','layer-skin')];
 const skin=/^p(?:Skin|Thread|Weft|Strands|Bundle|Bundles|Fray|Fold|Pore|Living|SurfaceBind)/;
 const classify=k=>/^pLink/.test(k)||k==='pNodeRatio'?2:/^pTrail/.test(k)?3:skin.test(k)?4:['pSizeRatio','pLargeCount','pSizeSpread','pSizeBias','pCount','pSize','pOpacity','pSoftness','pSizeVar','pSprite','pGrainSpacing','pGroupSpacing','pDistributionCells'].includes(k)?1:0;
 for(const node of [...root.children]){
  if(!node.matches('details')){layers[0].append(node);continue;}
  const e=node.querySelector('[data-param],[data-particle-select],[data-living-enabled]');const k=e?.dataset.param||e?.dataset.particleSelect||(e?.hasAttribute('data-living-enabled')?'pLiving':'');
  const index=classify(k);const name=node.querySelector('summary')?.textContent||'';
  if(['Forma','Particelle','Connessioni','Scie','Superficie e reticolo'].includes(name)){node.querySelector('summary')?.remove();layers[index].append(...node.childNodes);}else layers[index].append(node);
 }
 for(const e of layers[4].querySelectorAll('[data-living-enabled]'))e.closest('label')?.remove();
 const defs=[null,null,['links','pLinks'],['trails','pTrailCount'],['skin','pLiving']];
 layers.forEach((d,i)=>{d.dataset.particleLayer=String(i);if(defs[i]){const [kind,key]=defs[i],on=Number(state[key])>0;d.dataset.layerOff=String(!on);const toggle=document.createElement('input');toggle.type='checkbox';toggle.dataset.layerToggle=kind;toggle.checked=on;toggle.defaultChecked=on;toggle.setAttribute('aria-label','Attiva '+d.querySelector('summary').textContent);d.querySelector('summary').prepend(toggle);}else d.dataset.defaultOpen='true';});
 root.replaceChildren(...layers);
 const names={pOpening:'Sfera ↔ anello',pFill:'Riempimento',pThickness:'Spessore del nucleo',pOrganic:'Irregolarità',pCount:'Quantità',pSize:'Diametro comune · px',pOpacity:'Opacità',pLinks:'Intensità',pLinkNodes:'Nodi',pLinkWidth:'Spessore',pLinkReach:'Distanza',pTrailLength:'Lunghezza',pTrailWidth:'Spessore',pTrailCount:'Quantità',pSkin:'Visibilità della pelle',pFoldDepth:'Pieghe',pPores:'Pori'};
 for(const e of root.querySelectorAll('[data-param]'))if(names[e.dataset.param]){const label=rowFor(e).querySelector('label');e.dataset.searchAliases=label.textContent;label.textContent=names[e.dataset.param];}
 const sprite=root.querySelector('[data-particle-select=pSprite]');if(sprite)for(const n of sprite.closest('label').childNodes)if(n.nodeType===3)n.textContent='Sagoma';
}
export function composePanel(id,raw,state){
 if(id==='body')return raw(id).replace(/Usa mano ([ab])/g,(_,x)=>'Usa mano '+x.toUpperCase()).replace(/Usa braccio ([ab])/g,(_,x)=>'Usa braccio '+x.toUpperCase());
 if(id==='audio')return raw(id).replace(/>Ritmo</g,'>Battito<');
 if(id==='fields')return raw(id);
 const tracks=trackMap(raw);
 if(id==='library'){
  const root=html('<p class="help">Preset completi: sostituiscono la creazione. Esempi per categoria: modificano solo quella parte.</p><button type="button" id="library-saved" class="outline full">I miei preset · importa ed esporta</button><details class="control-details" data-default-open="true" data-library-category="complete"><summary>Scene complete</summary><div id="complete-presets-slot"></div></details>');
  const seen=new Set();for(const [tab,label]of WORK_TABS.filter(([t])=>t!=='library')){const source=baseMarkup(tab,raw,state),group=section(label),subgroups=new Map();group.dataset.libraryCategory=tab;
   for(const e of [...source.querySelectorAll(exampleSelector)]){if(seen.has(e.outerHTML))continue;seen.add(e.outerHTML);if(e.id==='material-picker'){for(const o of e.options)if(o.value!==''){const b=document.createElement('button');b.type='button';b.className='outline library-card';b.dataset.material=o.value;b.textContent=o.textContent;group.append(b);}continue;}const title=e.closest('details')?.querySelector(':scope > summary')?.textContent||label;let target=subgroups.get(title);if(!target){target=section(title);target.dataset.librarySubgroup=title;subgroups.set(title,target);group.append(target);}target.append(e.matches('select')?rowFor(e):e);}
   const cards=[...group.querySelectorAll(':scope > [data-material],:scope > [data-mood]')];if(cards.length){const grid=document.createElement('div');grid.className='library-card-grid';cards[0].before(grid);for(const c of cards)c.classList.add('library-card');grid.append(...cards);}if(group.querySelector('button,select'))root.append(group);
  }return root.innerHTML;
 }
 if(id==='motion'){
  const original=html(raw('motion')),root=document.createElement('div'),time=section('Tempo del loop','motion-time'),list=section('Animazioni','animation-list'),recipes=section('Movimenti pronti','motion-recipes'),reactions=section('Reazioni','motion-reactions');time.dataset.defaultOpen='true';list.dataset.defaultOpen='true';
  for(const e of original.querySelectorAll('[data-param],[data-check],[data-particle-select]'))if(['duration','speed','motion','pCycles','pDirection','perfectLoop'].includes(e.dataset.param||e.dataset.check||e.dataset.particleSelect))time.append(rowFor(e));
  for(const [path,track]of tracks){const parts=path.split('.');const value=parts[0]==='motions'?state.motions?.[parts[1]]:state.lights.find(l=>String(l.id)===parts[1])?.[parts[2]];if(!value?.enabled)continue;const b=document.createElement('button');b.className='animation-link';b.dataset.animatePath=path;b.textContent=labelFor(parts[1],track.querySelector('summary').textContent)+' · '+value.cycles+'×';list.append(b);}
  const add=document.createElement('select');add.id='add-animation';add.setAttribute('aria-label','Aggiungi animazione');add.innerHTML='<option value="">Aggiungi animazione…</option>';for(const [path,t]of tracks){const o=document.createElement('option');o.value=path;o.textContent=labelFor(path.split('.')[1],t.querySelector('summary').textContent);add.append(o);}list.append(add);
  for(const [i,g]of motionGroups(raw).entries()){const b=document.createElement('button');b.className='animation-link';b.dataset.animationGroup=String(i);b.textContent=g.querySelector('summary').textContent;list.append(b);}
  for(const e of original.querySelectorAll('[data-motion-preset],#roots-flow-loop,#roots-orbit-loop,#vary-motion,[data-check^=animate]'))recipes.append(e.matches('input')?rowFor(e):e);
  for(const [tab,label]of [['audio','Audio'],['body','Mani e braccia'],['fields','Campi e tracciati']]){const b=document.createElement('button');b.type='button';b.className='outline';b.dataset.jumpTab=tab;b.textContent=label;reactions.append(b);}
  const preserve=document.createElement('label');preserve.className='check';preserve.innerHTML='<input type="checkbox" data-check="keepMotionSpeed" '+(state.keepMotionSpeed!==false?'checked':'')+'> Mantieni velocità quando cambi durata';time.append(preserve);const status=document.createElement('p');status.className='help';status.id='motion-clock-status';status.setAttribute('role','status');status.textContent=clockStatus(state);time.append(status);const duration=document.createElement('p');duration.className='help';duration.setAttribute('role','status');duration.innerHTML='Durata video: <strong id="effective-duration">'+(state.duration/state.speed).toFixed(1)+' s</strong>';time.append(duration);const loopLabel=time.querySelector('[data-check=perfectLoop]')?.closest('label');if(loopLabel)for(const text of loopLabel.childNodes)if(text.nodeType===3)text.textContent=' Cicli interi per colori, luci e forma';root.append(time);const dynamics=original.querySelector('[data-dynamics-panel]');root.append(list);if(dynamics)root.append(dynamics);root.append(recipes);nameControls(root);return root.innerHTML;
 }
 const root=baseMarkup(id,raw,state);for(const e of [...root.querySelectorAll(exampleSelector)])(e.matches('select')?rowFor(e):e).remove();
 // The editor is created on demand; no animation form is hidden in the panel DOM.
 for(const e of [...root.querySelectorAll('[data-path-check$=".enabled"]')]){const path=e.dataset.pathCheck.replace(/\.enabled$/,'');if(!/\.(orbit|pulse)$/.test(path))continue;const d=e.closest('details'),b=document.createElement('button');b.type='button';b.className='animation-link';b.dataset.animatePath=path;b.textContent=d.querySelector('summary').textContent;d.replaceWith(b);}
 nameControls(root);if(id==='shape'&&isParticle(state))particleLayers(root,state);
 if(id==='material'&&isParticle(state))for(const d of root.querySelectorAll('details')){const h=d.querySelector(':scope > summary');if(h?.textContent==='Riflessi delle fibre')h.textContent='Fibre · riflessi';}
 for(const e of root.querySelectorAll('[data-param]')){const key=e.dataset.param,path='motions.'+key;if(!tracks.has(path))continue;const t=state.motions?.[key],b=document.createElement('button');b.type='button';b.className='animate-toggle';b.dataset.animatePath=path;b.dataset.animateOpen=key;b.dataset.animationLabel=rowFor(e).querySelector('label').textContent;b.textContent=t?.enabled?'∿ '+t.cycles+'×':'∿';b.setAttribute('aria-label','Anima '+b.dataset.animationLabel);b.setAttribute('aria-pressed',String(!!t?.enabled));rowFor(e).querySelector('.param-line').append(b);}
 stripEmpty(root);return root.innerHTML;
}
export function refinePanel(root,level='simple',{state={},baseline={},tab='shape'}={}){
 root.dataset.level=level;root.omittedControls=[];const essential=essentialKeys(isParticle(state)?'particles':'solid',tab);
 if(['body','audio','fields','library'].includes(tab))return;
 for(const e of [...root.querySelectorAll('input[data-param],input[data-path]')]){
  const key=e.dataset.param||e.dataset.path,suffix=key.split('.').at(-1),row=rowFor(e),changed=e.dataset.param&&typeof baseline[key]==='number'&&Math.abs(state[key]-baseline[key])>1e-7;
  const expert=EXPERT_KEYS.has(key)||/Seed$|Contact|Collision|Octaves/.test(key);
  const keep=level==='expert'||(level==='complete'&&!expert)||(level==='simple'&&essential.has(e.dataset.param||suffix)&&!expert);
  if(!keep){root.omittedControls.push({key,label:row.querySelector('label')?.textContent||key,html:row.outerHTML,changed:!!changed,expert});row.remove();}
 }
 // Detail levels choose parameters, never remove precision or help from a visible one.
 if(level==='simple'){
  root.querySelector('.finish-order')?.remove();
  for(const e of [...root.querySelectorAll('input[data-check],select')]){const key=e.dataset.check||e.dataset.particleSelect||e.dataset.finishSelect||e.id;if(!(e.matches('select')?ESSENTIAL_FIELDS.has(key)||key==='add-animation':ESSENTIAL_FLAGS.has(key)))rowFor(e).remove();}
  for(const e of [...root.querySelectorAll('button')])if(!e.matches(ESSENTIAL_BUTTONS+',.parameter-info,[data-help-text],[data-color-move],[data-color-remove]')&&!e.closest('.base-form-grid,.light-list'))e.remove();
 }
 if(level==='simple')for(const layer of root.querySelectorAll('[data-particle-layer]'))for(const d of [...layer.querySelectorAll('details')].reverse()){d.querySelector(':scope > summary')?.remove();for(const p of d.querySelectorAll(':scope > .help'))p.remove();d.replaceWith(...d.childNodes);}
 if(level==='simple')for(const [i,keys]of [['pOpening','pFill','pThickness','pOrganic'],['pCount','pSize','pSprite','pOpacity'],['pLinks','pLinkNodes','pLinkWidth','pLinkReach'],['pTrailLength','pTrailWidth','pTrailCount'],['pSkin','pFoldDepth','pPores']].entries()){const layer=root.querySelector('[data-particle-layer="'+i+'"]');if(!layer)continue;let anchor=layer.querySelector('summary');for(const key of keys){const input=layer.querySelector('[data-param="'+key+'"],[data-particle-select="'+key+'"]');if(input){const row=rowFor(input);anchor.after(row);anchor=row;}}}
 for(const d of root.querySelectorAll('[data-layer-off=true]')){for(const child of [...d.children])if(child.tagName!=='SUMMARY')child.remove();d.open=false;}
 for(const d of root.querySelectorAll('details')){
  const notes=[...d.querySelectorAll(':scope > p.help')].filter(p=>!p.hasAttribute('role'));if(notes.length){const b=document.createElement('button');b.type='button';b.className='parameter-info section-info';b.textContent='i';b.dataset.helpLabel=d.querySelector('summary')?.textContent||'Informazioni';b.dataset.helpText=notes.map(p=>p.textContent).join('\n\n');b.setAttribute('aria-label','Informazioni: '+b.dataset.helpLabel);d.querySelector('summary')?.append(b);notes.forEach(p=>p.remove());}
 }
 for(const p of root.querySelectorAll(':scope > p.help,:scope > p.control-intro'))p.remove();
 stripEmpty(root);
}
