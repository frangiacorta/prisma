import {onlineDirector,DIRECTOR_ONLINE_URL} from './director-connection.js?v=e537543adb5a';
import {PlaygroundDirector} from './playground-director.js?v=e537543adb5a';
import {FLOW_MOODS,FLOW_COLORS,FLOW_PALETTES,flowTiming,flowPalette} from './flow-model.js?v=e537543adb5a';
import {familyName,presetFamily} from './preset-families.js?v=e537543adb5a';
import {closeLivingSkin} from './living-panel.js?v=e537543adb5a';
import {PlaygroundEngine} from './playground-engine.js?v=e537543adb5a';
import {PlaygroundInputs} from './playground-inputs.js?v=e537543adb5a';
import {newCreation,normalizeCreation,motionPreset} from './creative-model.js?v=e537543adb5a';
import {particleCreation} from './particle-model.js?v=e537543adb5a';
import {readPreset} from './preset-files.js?v=e537543adb5a';
import {controlHelp,controlCondition} from './control-help.js?v=e537543adb5a';
import {MUTATIONS} from './playground-performance.js?v=e537543adb5a';
import {LIVE_FILTERS,LIVE_BUSES,MOD_SOURCES,TRANSITIONS,normalizePlayground,defaultPlayground,sceneOnly,bindingName,readParameter,parameterFromUnit,parameterCatalog,clamp} from './playground-model.js?v=e537543adb5a';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,fn,cls='outline')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
const options=(select,list,value)=>{select.replaceChildren(...list.map(([v,name])=>{const o=el('option','',name);o.value=v;return o;}));select.value=String(value);return select;};
const field=(name,node)=>{const l=el('label','pg-field');node.setAttribute('aria-label',name);l.append(el('span','',name),node);return l;};
const numeric=(value,min,max,step,fn)=>{const n=el('input');n.type='number';n.min=min;n.max=max;n.step=step;n.value=value;n.onchange=()=>{const v=Number(n.value);if(Number.isFinite(v)){n.value=clamp(v,min,max);fn(+n.value);}};return n;};
const select=(list,value,fn)=>{const s=options(el('select'),list,value);s.onchange=()=>fn(s.value);return s;};

export function mountPlayground(api){
 let fxBus='output',modBank='mix',modLink=null,outputWindow=null;
 const audioHost=el('div','pg-audio-player');
 let active=false,opening=false,config,engine,inputs,director,saveTimer,syncTimer,entry,activeMacro=0,targetKey='mix',focusedDeck='A';
 const controlNodes=new Map(),deckNodes={};
 const shell=el('section','pg-shell');shell.id='playground';shell.hidden=true;shell.setAttribute('aria-label','Playground · due scene vive');
 const header=el('header','pg-header'),title=el('strong','','Playground'),status=el('p','pg-status',''),stage=el('div','pg-stage');let canvas=el('canvas');canvas.id='playground-output';canvas.setAttribute('aria-label','Mix delle scene A e B');
 const consolePanel=el('div','pg-console'),top=el('div','pg-decks'),mixPanel=el('section','pg-mix'),macrosPanel=el('section','pg-macros'),details=el('div','pg-details');
 const effectsPanel=el('details','pg-effects'),modulationPanel=el('details','pg-modulators');
 const flowPanel=el('section','pg-flow-panel');consolePanel.prepend(flowPanel);
 const mapDialog=el('dialog','pg-dialog'),macroDialog=el('dialog','pg-dialog'),parameterDialog=el('dialog','pg-dialog');
 const fullscreen=async()=>{try{if(document.fullscreenElement===shell)await document.exitFullscreen();else await shell.requestFullscreen();}catch{message('Schermo intero non disponibile in questo browser.');}};
 const flowMode=button('Flow',()=>{director?.stop();engine.flow.start();render();changed();}),manualMode=button('Manuale',()=>{director?.stop();engine.flow.stop();render();changed();});flowMode.dataset.pgMode='flow';manualMode.dataset.pgMode='manual';
 const directorButton=button('Regia AI',()=>{if(director?.running){director.stop();return;}directorPanel.hidden=!directorPanel.hidden;if(!directorPanel.hidden)brief.focus();});directorButton.id='director-toggle';
 function projectOutput(){
  if(outputWindow&&!outputWindow.closed){outputWindow.focus();return;}
  if(!canvas.captureStream){message('Usa Schermo intero per proiettare con questo browser.');return;}
  const win=window.open('','prisma-output','popup,width=960,height=540');
  if(!win){message('Consenti la finestra di uscita in questo browser.');return;}
  const playingEngine=engine;
  outputWindow=win;win.document.title='Prisma · Uscita';
  const video=win.document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.srcObject=canvas.captureStream(60);
  win.document.body.style.cssText='margin:0;background:#000;overflow:hidden';video.style.cssText='width:100vw;height:100vh;object-fit:contain;display:block';
  win.document.body.replaceChildren(video);
  video.onclick=()=>void win.document.body.requestFullscreen?.().catch(()=>{});
  win.addEventListener('pagehide',()=>{
   video.srcObject?.getTracks().forEach(t=>t.stop());
   playingEngine.useOutputWindow(null);
   if(outputWindow===win)outputWindow=null;
  },{once:true});
  playingEngine.useOutputWindow(win);
 }
 const more=el('details','pg-menu'),morePanel=el('div','pg-menu-items');more.append(el('summary','','Menu'),morePanel);
 morePanel.append(directorButton,button('Salva progetto',()=>{persist();api.exportProject();}),button('Collega controlli',()=>openMapping(config.flow.enabled?'flow.speed':'mix')),button('Schermo intero',fullscreen),button('Seconda finestra',projectOutput),button('Solo scena',()=>shell.classList.toggle('pg-clean')),button('Torna all’editor',()=>close()));
 const compactMenu=matchMedia('(max-width:700px)');const menuLayout=()=>more.open=!compactMenu.matches;
 menuLayout();compactMenu.addEventListener('change',menuLayout);morePanel.addEventListener('click',()=>{if(compactMenu.matches)more.open=false;});
 header.append(title,manualMode,flowMode,more);
 stage.append(canvas,button('Controlli',()=>shell.classList.remove('pg-clean'),'pg-reveal'));shell.append(header,stage,status,consolePanel,mapDialog,macroDialog,parameterDialog);consolePanel.append(mixPanel,macrosPanel,top,effectsPanel,modulationPanel,details);document.body.append(shell);
 const directorPanel=el('section','pg-director-panel');directorPanel.hidden=true;consolePanel.prepend(directorPanel);
 const directorText=el('p','pg-help','Premi Regia AI per affidare le scene a Codex. Puoi riprendere il controllo in ogni momento.'),brief=el('textarea'),directorLog=el('details');directorText.setAttribute('role','status');brief.rows=3;brief.maxLength=4000;brief.placeholder='Carta bianca, oppure una direzione: più liquido, resta su questi colori…';brief.setAttribute('aria-label','Direzione della regia AI');brief.oninput=()=>{if(config){config.director.brief=brief.value;changed();}};
 const steer=button('Avvia regia',()=>{if(director?.running)director.stop('Cambio direzione…');director?.start();});
 const cloud=button('Apri questa sessione online',()=>{const snapshot=api.getSnapshot();snapshot.state={...snapshot.state,playground:engine.snapshot()};const data=JSON.stringify(snapshot);if(data.length>350000)return message('Salva il progetto e importalo nella Regia online: la sessione è troppo grande per il trasferimento diretto.');window.open(DIRECTOR_ONLINE_URL+'studio/index.html?playground=1&engine='+snapshot.state.engine+'#prisma-assistant='+encodeURIComponent(data),'_blank','noopener');});cloud.hidden=onlineDirector();
 const consumption=el('p','pg-help');consumption.setAttribute('role','status');
 const pc=button('Apri questa sessione sul PC',()=>{const snapshot=api.getSnapshot();snapshot.state={...snapshot.state,playground:engine.snapshot()};const data=JSON.stringify(snapshot);if(data.length>350000)return message('Salva il progetto e importalo in Prisma sul PC: questa sessione è troppo grande per il trasferimento diretto.');window.open('http://127.0.0.1:8242/?playground=1&engine='+snapshot.state.engine+'#prisma-assistant='+encodeURIComponent(data),'_blank','noopener');});pc.hidden=onlineDirector()||['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const privacy=el('p','pg-help','Usa il tuo accesso Codex e i relativi limiti. Invia soltanto immagini della scena e parametri, senza webcam o audio. Le decisioni richiedono alcuni secondi; il movimento continua durante l’attesa. Sul PC avvia PRISMA-CREATIVO.cmd.');
 if(onlineDirector())privacy.textContent='Regia online personale: massimo 12 tentativi per avvio e 60 al giorno. L’uso API consuma credito. Invia solo immagini della scena e parametri, senza webcam o audio. Il movimento continua durante l’attesa. I token mostrati possono essere parziali dopo un’interruzione.';
 directorPanel.append(el('h2','','Regia AI'),directorText,brief,steer,cloud,pc,privacy,consumption,directorLog);
 const takeover=button('Riprendi il controllo',()=>director?.stop(),'pg-director-takeover');takeover.hidden=true;stage.append(takeover);
 function directorUI(){if(!director)return;directorText.textContent=director.text||'Regia pronta';const u=director.usage;consumption.textContent=u?`${u.attempts}/${u.limit} tentativi · ${u.dayUsed}/${u.dayLimit} oggi · ${(u.inputTokens||0)+(u.outputTokens||0)} token`:'';directorButton.textContent=director.running?'Riprendi il controllo':'Regia AI';directorButton.setAttribute('aria-pressed',String(director.running));takeover.hidden=!director.running;shell.classList.toggle('pg-directed',director.running);directorLog.replaceChildren(el('summary','','Scelte della sessione'));for(const h of config?.director.history||[])directorLog.append(el('p','pg-help',h.intent));sync();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&director?.running)director.stop('Regia sospesa: la scheda non è visibile. Premi Regia AI per riprendere.');});
 document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'&&shell.classList.contains('pg-clean')&&!shell.querySelector('dialog[open]')){shell.classList.remove('pg-clean');e.preventDefault();}});
 const opener=document.getElementById('playground-open');
 opener.onclick=()=>open();
 function message(text){status.textContent=text;}
 function persist(){if(!active||!engine)return;clearTimeout(saveTimer);api.save(engine.snapshot());}
 function changed(){clearTimeout(saveTimer);saveTimer=setTimeout(persist,350);sync();}
 function touch(key,value){inputs?.manual(key);target(key)?.set(value);}
 function parameterTarget(key){const m=/^param:([AB]):(.+)$/.exec(key);if(!m)return null;const d=engine?.decks[m[1]],p=d?.catalog.find(x=>x.path===m[2]);if(!p||p.kind==='color')return null;const range=config.bindings[key]?.range,entry=range&&p.kind==='number'?{...p,min:range[0],max:range[1]}:p;return {kind:'value',get:()=>{const v=readParameter(d.state,p.path);return p.kind==='boolean'?Number(v):p.kind==='enum'?p.values.indexOf(v)/(p.values.length-1):clamp((v-entry.min)/(entry.max-entry.min));},set:v=>{engine.setParameter(m[1],p.path,parameterFromUnit(entry,v));changed();}};}
 function target(key){const t=rawTarget(key);if(!t)return t;return {...t,set:v=>{if(director?.running&&!['master','blackout'].includes(key))director.stop();t.set(v);}};}
 function rawTarget(key){
  if(!engine)return null;
  if(key==='flow.enabled')return {kind:'value',get:()=>+config.flow.enabled,set:v=>{v>=.5?engine.flow.start():engine.flow.stop();render();changed();}};
  if(key.startsWith('flow.')){const k=key.slice(5),f=config.flow;
   if(k==='next')return {kind:'action',get:()=>0,set:v=>{if(v>.5)engine.flow.next();changed();}};
   if(k==='paused')return {kind:'value',get:()=>+f.paused,set:v=>{f.paused=v>=.5;changed();}};
   const choices={mood:FLOW_MOODS.map(x=>x[0]),colors:FLOW_COLORS.map(x=>x[0]),engines:['both','solid','particles']};
   if(choices[k]){const list=choices[k];return {kind:'value',get:()=>list.indexOf(f[k])/(list.length-1),set:v=>{f[k]=list[Math.round(clamp(v)*(list.length-1))];changed();}};}
   if(['speed','intensity','variety'].includes(k)){const min=k==='speed'?.25:0,max=k==='speed'?3:1;return {kind:'value',get:()=>(f[k]-min)/(max-min),set:v=>{f[k]=min+clamp(v)*(max-min);changed();}};}
  }
  if(config.flow.enabled&&!['blackout','master'].includes(key))return null;
  if(key.startsWith('param:'))return parameterTarget(key);
  const value=(get,set)=>({kind:'value',get,set:v=>{set(clamp(v));changed();}}),action=fn=>({kind:'action',get:()=>0,set:v=>{if(v>.5)fn();changed();}});
   if(['freeze','invert','strobe'].includes(key))return value(()=>+!!config[key],v=>config[key]=v>=.5);
  if(key==='flash')return action(()=>engine.flashUntil=engine.clock+.32);
  if(key==='impact')return action(()=>engine.impactUntil=engine.clock+.34);
  if(key==='random')return action(()=>engine.mutate(config.mix<.5?'A':'B','all'));
  if(key==='sequence')return value(()=>+config.sequence.enabled,v=>config.sequence.enabled=v>=.5);
  if(/^step:(?:[0-9]|1[0-5])$/.test(key)){const step=+key.slice(5);return value(()=>+config.sequence.steps[step],v=>config.sequence.steps[step]=v>=.5);}
  if(key==='rewind')return action(()=>{for(const id of ['A','B'])if(engine.decks[id]){engine.decks[id].phase=0;engine.refresh(id);}});
  if(key.startsWith('fx.')){const [,bus,filter]=key.split('.');if(config.liveFx[bus]&&Object.hasOwn(config.liveFx[bus],filter))return value(()=>config.liveFx[bus][filter],v=>{config.liveFx[bus][filter]=v;if(bus!=='output')engine.refresh(bus);});}
  if(key.startsWith('mutate.')){const [,id,kind]=key.split('.');return action(()=>engine.mutate(id,kind));}
  if(key.startsWith('variant.')){const id=key.at(-1);return value(()=>engine.decks[id]?.mutation?.position||0,v=>engine.mutationPosition(id,v));}
  if(key==='mix')return value(()=>config.mix,v=>engine.mix(v));
  if(key==='blackout')return value(()=>+config.blackout,v=>config.blackout=v>=.5);
  if(key==='master')return value(()=>config.master,v=>config.master=v);
  if(key==='duration')return value(()=>(config.duration-.05)/63.95,v=>config.duration=.05+v*63.95);
  if(key==='bpm')return value(()=>(config.bpm-30)/270,v=>config.bpm=30+v*270);
  for(const [k,list]of [['transition',TRANSITIONS],['curve',['linear','smooth','in','out']],['direction',[0,1,2,3]],['unit',['seconds','beats']]])if(key===k)return value(()=>list.indexOf(config[k])/(list.length-1),v=>config[k]=list[Math.round(v*(list.length-1))]);
  if(key==='quantize')return value(()=>+config.quantize,v=>config.quantize=v>=.5);
  if(key==='take.A'||key==='take.B')return action(()=>engine.take(key.endsWith('A')?0:1));
  if(key==='close.A'||key==='close.B')return action(()=>{const id=key.at(-1),d=engine.decks[id];if(d){closeLivingSkin(d.state);d.catalog=parameterCatalog(d.state);engine.refresh(id);}});
  if(key==='cut.A'||key==='cut.B')return action(()=>{const id=key.at(-1);if(engine.decks[id]&&!engine.pending[id])engine.mix(id==='A'?0:1);else message('Attendi la scena '+id+'.');});
  if(/^macro:[0-7]$/.test(key)){const i=+key.slice(6);return value(()=>config.macros[i].value,v=>engine.macro(i,v));}
  if(/^play:[AB]$/.test(key)){const id=key.at(-1);return value(()=>+!!engine.decks[id]?.playing,v=>{const d=engine.decks[id];if(d&&d.playing!==(v>=.5))engine.toggle(id);});}
  return null;
 }
 function learnButton(key){const b=button('Assegna',()=>openMapping(key),'pg-map');b.dataset.map=key;b.setAttribute('aria-label','Assegna '+key);return b;}
 function slider(name,key,min=0,max=1,step=.001,read=v=>v,write=v=>v){
  const row=el('div','pg-control'),label=el('label','',name),range=el('input'),num=numeric(read(target(key)?.get()||0),min,max,step,v=>touch(key,write(v)));range.type='range';range.min=min;range.max=max;range.step=step;range.setAttribute('aria-label',name);range.dataset.control=key;num.setAttribute('aria-label',name+' · valore');range.oninput=()=>touch(key,write(+range.value));label.append(range);row.append(label,num,learnButton(key));controlNodes.set(key,{range,num,read});return row;
 }
 function choice(name,key,list){const row=el('div','pg-choice'),s=select(list,config[key],v=>touch(key,list.findIndex(x=>String(x[0])===v)/(list.length-1)));s.dataset.control=key;row.append(field(name,s),learnButton(key));controlNodes.set(key,{select:s});return row;}
 function actionButton(name,key){const row=el('span','pg-action'),b=button(name,()=>touch(key,1));b.dataset.action=key;row.append(b,learnButton(key));return row;}
 function renderFlow(){
  flowPanel.replaceChildren(el('h2','','Flow'));const f=config.flow;
  const description=el('p','pg-help','Forme, materiali e movimenti in evoluzione. Colori collegati tra le scene e passaggi radiali, torsioni o zoom. Manuale ripristina le tue due scene.');flowPanel.append(description);
  const choices=el('div','pg-grid');for(const [key,name,list]of [['mood','Mood',FLOW_MOODS],['colors','Palette',FLOW_COLORS],['engines','Scene',[['both','Forma e particelle'],['solid','Solo forma'],['particles','Solo particelle']]]]){const s=select(list,f[key],v=>{f[key]=v;changed();});s.dataset.control='flow.'+key;controlNodes.set('flow.'+key,{select:s});const box=el('div','pg-choice');box.append(field(name,s),learnButton('flow.'+key));choices.append(box);}flowPanel.append(choices);const seed=numeric(f.seed,0,4294967295,1,value=>{f.seed=value;f.step=0;changed();});flowPanel.append(field('Variante',seed),button('Nuova sequenza',()=>{f.seed=crypto.getRandomValues(new Uint32Array(1))[0];f.step=0;seed.value=f.seed;engine.flow.next();changed();}));
  const colors=el('div','pg-flow-colors');for(let i=0;i<3;i++){const c=el('input');c.type='color';c.dataset.flowColor=String(i);c.setAttribute('aria-label','Colore Flow '+(i+1));c.oninput=()=>{const previous=f.colors==='auto'?(engine.decks[config.mix<.5?'A':'B']?.state.palette||flowPalette(f)):flowPalette(f);f.palette=Array.from({length:3},(_,j)=>previous[j%previous.length]||'#ffffff');f.palette[i]=c.value;f.colors='custom';changed();};colors.append(c);}flowPanel.append(colors);
  flowPanel.append(slider('Velocità','flow.speed',.25,3,.05,v=>.25+v*2.75,v=>(v-.25)/2.75),slider('Intensità','flow.intensity'),slider('Varietà','flow.variety'));
  flowPanel.append(el('p','pg-help','Velocità regola movimento e durata dei passaggi. Intensità cambia deformazione e luminosità. Varietà cambia forme, materia e coreografie. Colori in evoluzione alterna le palette; le altre scelte mantengono i tuoi colori.'));const actions=el('div','pg-row'),pause=button('Mantieni scena',()=>{f.paused=!f.paused;if(!f.paused&&engine.flow.phase==='error')engine.flow.next();changed();});pause.dataset.flowPause='';const pauseGroup=el('span','pg-action');pauseGroup.append(pause,learnButton('flow.paused'));actions.append(pauseGroup,actionButton('Prossima scena','flow.next'));flowPanel.append(actions);const progress=el('p','pg-flow-status');progress.setAttribute('role','status');flowPanel.append(progress);
 }
 function renderBank(id,d){
  const panel=el('details','pg-bank'),summary=el('summary','','Banco scene '+id),grid=el('div','pg-bank-grid');
  panel.append(summary,grid);
  for(let i=0;i<8;i++){
   const item=config.banks[id][i],cell=el('div','pg-slot'),load=button(item?item.name:String(i+1),()=>{if(item)loadScene(id,item);});
   load.disabled=!item;load.setAttribute('aria-label',item?'Carica '+item.name+' in '+id:'Posizione '+(i+1)+' vuota');
   if(item?.thumbnail){const img=el('img');img.src=item.thumbnail;img.alt='';load.prepend(img);}
   const store=button('+',()=>{
    if(!engine.decks[id])return;
    const value=engine.deckSnapshot(id),small=el('canvas');small.width=144;small.height=81;
    small.getContext('2d').drawImage(engine.decks[id].canvas,0,0,144,81);
    config.banks[id][i]={...value,thumbnail:small.toDataURL('image/webp',.76)};
    changed();const updated=renderBank(id,engine.decks[id]);panel.replaceWith(updated);updated.open=true;
   });
   store.setAttribute('aria-label','Conserva scena '+id+' nella posizione '+(i+1));cell.append(load,store);grid.append(cell);
  }
  return panel;
 }
 function renderEffects(){
  effectsPanel.replaceChildren(el('summary','','Effetti e tasti'));
  const transport=el('div','pg-row');
  for(const [id,name] of [['blackout','Nero'],['strobe','Strobo'],['freeze','Fermo'],['invert','Inverti'],['impact','Colpo'],['flash','Lampo'],['rewind','Riavvolgi'],['random','Casuale']]){
   const b=button(name,()=>{const t=target(id);if(t)t.set(t.kind==='action'?1:1-t.get());});b.dataset.performance=id;
   const row=el('span','pg-action');row.append(b,learnButton(id));transport.append(row);
  }
  const bus=select(LIVE_BUSES,fxBus,value=>{fxBus=value;renderEffects();});effectsPanel.append(transport,field('Applica a',bus));
  const grid=el('div','pg-effects-grid');
  for(const [key,label] of LIVE_FILTERS){
   const busId=fxBus,path='fx.'+busId+'.'+key,level=config.liveFx[busId][key],cell=el('div','pg-effect'),press=button(label,()=>touch(path,level>0?0:.7));
   press.dataset.effect=path;press.setAttribute('aria-pressed',String(level>0));
   press.onclick=()=>{const t=target(path);if(t)touch(path,t.get()>0?0:.7);};
   const amount=numeric(level,0,1,.01,value=>touch(path,value));amount.setAttribute('aria-label',label+' · quantità');
   controlNodes.set(path,{num:amount,read:v=>v});
   const hit=button('Tieni',()=>{});hit.setAttribute('aria-label','Tieni '+label);
   const down=()=>engine?.setHeldFx(busId,key,Math.max(.5,target(path)?.get()||0)),up=()=>engine?.setHeldFx(busId,key,0);
   hit.onpointerdown=e=>{hit.setPointerCapture(e.pointerId);down();};
   hit.onpointerup=hit.onpointercancel=hit.onlostpointercapture=up;
   hit.onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();down();}};
   hit.onkeyup=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();up();}};hit.onblur=up;
   cell.append(press,amount,hit,learnButton(path));grid.append(cell);
  }
  effectsPanel.append(grid);
 }
 function renderModulations(){
  modulationPanel.replaceChildren(el('summary','','Modulatori e sequencer'));
  const banks={
   mix:[['mix','Mix'],['master','Uscita'],['variant.A','Variante A'],['variant.B','Variante B']],
   macros:config.macros.map((m,i)=>['macro:'+i,m.name]),
   ...Object.fromEntries(LIVE_BUSES.map(([bus])=>[bus,LIVE_FILTERS.map(([id,name])=>['fx.'+bus+'.'+id,name])]))
  };
  const destinations=banks[modBank],all=Object.entries(banks).flatMap(([bank,targets])=>targets.map(([path,name])=>[path,(LIVE_BUSES.find(([key])=>key===bank)?.[1]||'')+(LIVE_BUSES.some(([key])=>key===bank)?' · ':'')+name]));
  modulationPanel.append(field('Destinazioni',select([['mix','Mix e varianti'],['macros','Macro'],...LIVE_BUSES.map(([key,name])=>[key,'Filtri · '+name])],modBank,value=>{modBank=value;renderModulations();})));
  const scroll=el('div','pg-patch-scroll'),table=el('table','pg-patch'),head=el('tr');
  head.append(el('th','','Sorgente'),...destinations.map(([,name])=>el('th','',name)));table.append(head);scroll.append(table);
  const editRoute=el('div','pg-modulation');
  const showRoute=()=>{
   editRoute.replaceChildren();
   const route=config.modulations.find(m=>m.source===modLink?.[0]&&m.target===modLink?.[1]);
   if(!route)return;
   editRoute.append(field('Intensità',numeric(route.depth,0,1,.01,value=>{route.depth=value;changed();})));
   if(['sine','triangle'].includes(route.source))editRoute.append(field('Frequenza · Hz',numeric(route.rate,.03,4,.01,value=>{
    for(const m of config.modulations)if(m.source===route.source)m.rate=value;
    changed();
   })));
  };
  for(const [source,label] of MOD_SOURCES){
   const row=el('tr'),name=el('th','',label);name.scope='row';row.append(name);
   for(const [target,name] of destinations){
    const cell=el('td'),pad=button('●',()=>{
     const index=config.modulations.findIndex(m=>m.source===source&&m.target===target);
     if(index<0){
      const rate=config.modulations.find(m=>m.source===source)?.rate??(source==='triangle'?.13:.25);
      config.modulations.push({source,target,depth:.35,rate});modLink=[source,target];
     }else if(modLink?.[0]===source&&modLink?.[1]===target){
      config.modulations.splice(index,1);modLink=null;
     }else modLink=[source,target];
     changed();renderModulations();
    });
    pad.setAttribute('aria-label',label+' → '+name);
    pad.setAttribute('aria-pressed',String(config.modulations.some(m=>m.source===source&&m.target===target)));
    if(modLink?.[0]===source&&modLink?.[1]===target)pad.classList.add('pg-patch-selected');
    cell.append(pad);row.append(cell);
   }
   table.append(row);
  }
  showRoute();modulationPanel.append(scroll,editRoute);
  const file=el('input');file.type='file';file.accept='audio/*';file.hidden=true;
  async function startAudio(input){
   try{if(await engine?.startAudio(input,audioHost))message(input?'Audio dal file locale.':'Microfono attivo · l’audio resta sul dispositivo.');}
   catch{message('Ingresso audio non disponibile. Controlla il microfono o prova un file audio.');}
  }
  file.onchange=()=>{if(file.files[0])void startAudio(file.files[0]);};
  const audio=el('div','pg-row');audio.append(button('Microfono',()=>void startAudio()),button('File audio',()=>file.click()),button('Ferma audio',()=>engine?.stopAudio()),file);modulationPanel.append(audio,audioHost);
  const seq=config.sequence,grid=el('div','pg-sequence');
  for(const [i,value] of seq.steps.entries()){
   const pad=button(i+1,()=>touch('step:'+i,+!seq.steps[i]));
   pad.dataset.sequenceStep=i;pad.setAttribute('aria-label','Passo '+(i+1));pad.setAttribute('aria-pressed',String(value));grid.append(pad);
  }
  const run=button('Sequencer',()=>touch('sequence',+!seq.enabled));run.dataset.performance='sequence';
  modulationPanel.append(run,grid,field('Destinazione del sequencer',select(all,seq.target,value=>{seq.target=value;changed();})),
   field('Passi per battito',select([[1,'1'],[2,'2'],[4,'4'],[8,'8']],seq.division,value=>{seq.division=+value;changed();})),
   field('Intensità sequencer',numeric(seq.depth,0,1,.01,value=>{seq.depth=value;changed();})));
  sync();
 }
 function render(){
  controlNodes.clear();renderFlow();renderEffects();renderModulations();top.replaceChildren();
  for(const id of ['A','B']){
   const d=engine.decks[id],card=el('section','pg-deck'),head=el('div','pg-deck-head'),name=el('input'),state=el('small');name.type='text';name.maxLength=80;name.value=d?.name||config.decks[id].name;name.setAttribute('aria-label','Nome scena '+id);name.onchange=()=>{if(engine.decks[id])engine.decks[id].name=name.value;config.decks[id].name=name.value;changed();};head.append(el('strong','pg-letter',id),name,state);card.append(head);
   const preview=deckNodes[id]?.preview||el('canvas','pg-preview');if(preview.width!==320||preview.height!==180){preview.width=320;preview.height=180;}preview.setAttribute('aria-label','Anteprima scena '+id);card.append(preview);deckNodes[id]={card,state,preview,name};
   const transport=el('div','pg-row'),play=button('Pausa',()=>touch('play:'+id,target('play:'+id).get()>.5?0:1));play.dataset.play=id;transport.append(play,learnButton('play:'+id),button('Parametri',()=>openParameters(id)),button('Modifica nell’editor',()=>editDeck(id)));card.append(transport);
   card.append(slider('Velocità '+id,'param:'+id+':speed',.25,2,.01,v=>.25+v*1.75,v=>(v-.25)/1.75));
   const sources=el('details','pg-source'),summary=el('summary','','Carica scena');sources.append(summary);
   sources.append(button('Scena dell’editor',()=>loadScene(id,entry)),button('Copia '+(id==='A'?'B':'A'),()=>{const other=engine.decks[id==='A'?'B':'A'];if(other)loadScene(id,{...other,state:sceneOnly(other.state)});}),button('Sfera semplice',()=>loadScene(id,{state:newCreation(),name:'Sfera semplice',phase:0})),button('Particelle',()=>loadScene(id,{state:particleCreation(newCreation()),name:'Particelle',phase:0})));
   const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.onchange=async()=>{const f=file.files[0];if(!f)return;try{if(f.size>2e6)throw Error('Il progetto deve essere inferiore a 2 MB.');const q=readPreset(await f.text(),f.name);await loadScene(id,q);}catch(e){message(e.message);}file.value='';};sources.append(button('Importa progetto JSON',()=>file.click()),file);
   const saved=[...(api.favorites?.()||[])].sort((a,b)=>(familyName(presetFamily(a.state))+' '+a.name).localeCompare(familyName(presetFamily(b.state))+' '+b.name,'it'));if(saved.length){const s=select([['','Dai preset salvati…'],...saved.map((x,i)=>[String(i),familyName(presetFamily(x.state))+' · '+(x.name||'Preset '+(i+1))])],'',v=>{if(v!=='')loadScene(id,saved[+v]);});sources.append(s);}card.append(sources,renderBank(id,d));
   const change=el('details','pg-mutation'),variant=select(MUTATIONS,'grains',()=>{});
   change.append(el('summary','','Varia scena'),field('Varia',variant),button('Avvia passaggio',()=>touch('mutate.'+id+'.'+variant.value,1)),slider('Inizio ↔ variante','variant.'+id));card.append(change);top.append(card);
  }
  mixPanel.replaceChildren(el('h2','','Mix A / B'));mixPanel.append(slider('Mix · A ← → B','mix',0,1,.001));
  const actions=el('div','pg-row');actions.append(actionButton('A subito','cut.A'),actionButton('Transizione verso A','take.A'),actionButton('Transizione verso B','take.B'),actionButton('B subito','cut.B'));mixPanel.append(actions);
  const types=[['fade','Dissolvenza'],['wipe','Tendina'],['luma','Luminanza'],['add','Somma'],['iris','Radiale'],['swirl','Torsione'],['zoom','Zoom']];
  const pads=el('div','pg-transition-pads');for(const [i,[key,label]] of types.entries()){const b=button(label,()=>touch('transition',i/(types.length-1)));b.dataset.transitionPad=key;pads.append(b);}mixPanel.append(pads);
  const choices=el('details','pg-transition-settings');choices.append(el('summary','','Direzione e ritmo'),choice('Direzione','direction',[[0,'Da sinistra'],[1,'Dal basso'],[2,'Da destra'],[3,'Dall’alto']]),choice('Andamento','curve',[['linear','Lineare'],['smooth','Morbido'],['in','Accelera'],['out','Rallenta']]),choice('Durata in','unit',[['seconds','Secondi'],['beats','Battiti']]),slider('Tempo · BPM','bpm',30,300,1,v=>30+v*270,v=>(v-30)/270));mixPanel.append(slider('Durata transizione','duration',.05,64,.05,v=>.05+v*63.95,v=>(v-.05)/63.95),choices);
  const quant=el('div','pg-row'),q=el('input');q.type='checkbox';q.onchange=()=>touch('quantize',+q.checked);controlNodes.set('quantize',{check:q});quant.append(field('Avvia sul prossimo battito',q),learnButton('quantize'),button('Tap tempo',tap));mixPanel.append(quant,slider('Livello uscita','master'));
  const black=button('Nero',()=>touch('blackout',config.blackout?0:1));black.dataset.blackout='';mixPanel.append(black,learnButton('blackout'),el('p','pg-help','La velocità delle scene è indipendente dalla transizione. Puoi invertire il passaggio o riprendere il mix a mano senza saltare. La luminanza segue le zone chiare della scena B.'));
  macrosPanel.replaceChildren(el('h2','','Macro'));const grid=el('div','pg-macro-grid');config.macros.forEach((m,i)=>{const c=el('section','pg-macro');c.append(slider(m.name,'macro:'+i),button(m.routes.length+' parametri · configura',()=>openMacro(i),'quiet'));grid.append(c);});macrosPanel.append(grid);
  const xy=el('div','pg-xy');xy.tabIndex=0;xy.setAttribute('role','group');xy.setAttribute('aria-label','Pad XY · controlli macro');const dot=el('span');xy.append(dot);const move=e=>{const rect=xy.getBoundingClientRect();touch('macro:'+config.xyX,clamp((e.clientX-rect.left)/rect.width));touch('macro:'+config.xyY,1-clamp((e.clientY-rect.top)/rect.height));dot.style.left=(config.macros[config.xyX].value*100)+'%';dot.style.top=((1-config.macros[config.xyY].value)*100)+'%';};xy.onpointerdown=e=>{xy.setPointerCapture(e.pointerId);move(e);};xy.onpointermove=e=>{if(xy.hasPointerCapture(e.pointerId))move(e);};xy.onkeydown=e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();const x=e.key==='ArrowLeft'||e.key==='ArrowRight',i=x?config.xyX:config.xyY;touch('macro:'+i,clamp(config.macros[i].value+(e.key==='ArrowLeft'||e.key==='ArrowDown'?-.02:.02)));};
  const xyBox=el('div','pg-xy-box'),macroOptions=config.macros.map((m,i)=>[i,m.name]);xyBox.append(xy,field('X',select(macroOptions,config.xyX,v=>{config.xyX=+v;changed();})),field('Y',select(macroOptions,config.xyY,v=>{config.xyY=+v;changed();})));macrosPanel.append(xyBox);
  details.replaceChildren();const quality=el('details');quality.append(el('summary','','Uscita e prestazioni'));quality.append(field('Altezza uscita',select([[360,'360 px'],[540,'540 px'],[720,'720 px'],[1080,'1080 px']],config.resolution,v=>{config.resolution=+v;for(const id of ['A','B'])engine.refresh(id);changed();})));const auto=el('input');auto.type='checkbox';auto.checked=config.autoQuality;auto.onchange=()=>{config.autoQuality=auto.checked;changed();};quality.append(field('Adatta l’anteprima al carico GPU',auto),el('p','pg-help','Due scene vengono calcolate insieme sul tuo computer. L’adattamento può ridurre pixel, granelli e fili visibili; i valori delle scene salvate restano interi. Il progetto salva anche mix, macro e assegnazioni. Il download video dell’editor esporta la singola scena, non una registrazione della performance.'));details.append(quality);sync();
 }
 let taps=[];function tap(){const now=performance.now();if(now-(taps.at(-1)||0)>2200)taps=[];taps.push(now);taps=taps.slice(-5);if(taps.length>1){config.bpm=clamp(60000/((now-taps[0])/(taps.length-1)),30,300);changed();}}
 function drawPreview(id){const d=engine?.decks[id],n=deckNodes[id];if(!d||!n||d.renderer.completionSync||d.frames===n.frames)return;const now=performance.now();if(n.frames!==undefined&&now-(n.previewAt||0)<150)return;const ctx=n.preview.getContext('2d'),fit=Math.min(320/d.canvas.width,180/d.canvas.height),w=d.canvas.width*fit,h=d.canvas.height*fit;ctx.fillStyle='#000';ctx.fillRect(0,0,320,180);ctx.drawImage(d.canvas,(320-w)/2,(180-h)/2,w,h);n.frames=d.frames;n.previewAt=now;}
 function sync(){if(!active||!engine)return;for(const [key,n]of controlNodes){const t=target(key);if(!t)continue;if(n.range){const v=n.read(t.get());n.range.value=v;if(document.activeElement!==n.num)n.num.value=Number(v.toFixed(3));}if(n.select)n.select.value=String(key.startsWith('flow.')?config.flow[key.slice(5)]:config[key]);if(n.num&&!n.range&&document.activeElement!==n.num)n.num.value=n.read(t.get());if(n.check)n.check.checked=!!config[key];}
  for(const b of modulationPanel.querySelectorAll('[data-sequence-step]')){
   const i=Number(b.dataset.sequenceStep);b.setAttribute('aria-pressed',String(config.sequence.steps[i]));b.classList.toggle('pg-step-current',config.sequence.enabled&&engine.step===i);
  }
  for(const b of shell.querySelectorAll('[data-transition-pad]'))b.setAttribute('aria-pressed',String(config.transition===b.dataset.transitionPad));
  for(const b of shell.querySelectorAll('[data-effect],[data-performance]')){const t=target(b.dataset.effect||b.dataset.performance);if(t?.kind==='value')b.setAttribute('aria-pressed',String(t.get()>0));}
  for(const id of ['A','B']){const d=engine.decks[id],n=deckNodes[id];if(!n)continue;n.state.textContent=engine.pending[id]?'Preparo…':d?`${d.state.engine==='particles'?'Particelle':'Forma'} · ${d.playing?'in movimento':'in pausa'}`:'In attesa';const b=n.card.querySelector('[data-play]');if(b)b.textContent=d?.playing?'Pausa':'Riproduci';drawPreview(id);}
  shell.classList.toggle('pg-flow',config.flow.enabled);flowPanel.hidden=!config.flow.enabled;flowMode.setAttribute('aria-pressed',String(config.flow.enabled));manualMode.setAttribute('aria-pressed',String(!config.flow.enabled&&!director?.running));
  const f=config.flow,fs=engine.flow.status(),visibleDeck=engine.decks[config.mix<.5?'A':'B'];const note=flowPanel.querySelector('.pg-flow-status');if(note)note.textContent=fs.error||`${visibleDeck?.name||'Preparo le scene'} · ${f.paused?'cambi in pausa':({settle:'avvio',loading:'preparo la prossima',ready:'prossimo mix fra '+Math.ceil((1-fs.progress)*flowTiming(f).hold)+' s',transition:'mix in corso',hold:'nuova scena',idle:'manuale'})[fs.phase]||''}`;
  const pause=flowPanel.querySelector('[data-flow-pause]');if(pause){pause.textContent=f.paused?'Riprendi cambi':'Mantieni scena';pause.setAttribute('aria-pressed',String(f.paused));}const palette=f.colors==='auto'?(engine.decks[config.mix<.5?'A':'B']?.state.palette||flowPalette(f)):flowPalette(f);for(const c of flowPanel.querySelectorAll('[data-flow-color]'))if(document.activeElement!==c)c.value=palette[Number(c.dataset.flowColor)%palette.length]||'#ffffff';
  shell.querySelector('[data-blackout]')?.classList.toggle('active',config.blackout);for(const b of shell.querySelectorAll('[data-map]')){const assigned=config.bindings[b.dataset.map];b.textContent=assigned?bindingName(assigned.input):'Assegna';b.classList.toggle('assigned',!!assigned);}
 }
 function dialogHead(dialog,title){dialog.replaceChildren();const head=el('header','pg-dialog-head');head.append(el('h2','',title),button('Chiudi',()=>dialog.close()));dialog.append(head);}
 function catalogOptions(id,includeColors=true){const d=engine.decks[id];return (d?.catalog||[]).filter(x=>includeColors||x.kind!=='color').map(x=>[x.path,x.name]);}
 function openParameters(id){focusedDeck=id;dialogHead(parameterDialog,'Parametri · scena '+id);const search=el('input');search.type='search';search.placeholder='Cerca forma, colore, luce, moto…';search.setAttribute('aria-label','Cerca parametri scena '+id);const list=el('div','pg-parameter-list'),group=select([['all','Tutti i gruppi'],['shape','Forma / particelle'],['material','Materiale'],['color','Colore'],['light','Luce'],['motion','Movimento'],['interaction','Dinamica e campi'],['filters','Filtri'],['photo','Correzione colore'],['background','Sfondo']], 'shape',()=>draw());parameterDialog.append(search,field('Gruppo',group),actionButton('Chiudi pelle','close.'+id),el('p','pg-help','Gli stessi parametri dell’editor. Gli interruttori attivano i moduli; poi puoi regolarli, assegnarli a un dispositivo o collegarli a una macro. Un parametro guidato anche da un’animazione conserva quella modulazione.'),button('Aggiungi rotazione continua',()=>{const d=engine.decks[id];if(d){motionPreset(d.state,'turn');d.catalog=parameterCatalogFor(d.state);engine.refresh(id);d.playing=true;changed();draw();}}),list);
  function draw(){list.replaceChildren();const query=search.value.toLocaleLowerCase();for(const p of engine.decks[id]?.catalog||[]){if(!query&&group.value!=='all'&&p.group!==group.value)continue;if(query&&!`${p.name} ${p.path}`.toLocaleLowerCase().includes(query))continue;const row=el('div','pg-param'),value=readParameter(engine.decks[id].state,p.path),key=`param:${id}:${p.path}`;let control;
    if(p.kind==='color'){control=el('input');control.type='color';control.value=value;control.oninput=()=>{engine.setParameter(id,p.path,control.value);changed();};}
    else if(p.kind==='enum')control=select(p.values.map(x=>[x,x]),value,v=>{engine.setParameter(id,p.path,v);changed();});
    else if(p.kind==='boolean'){control=el('input');control.type='checkbox';control.checked=value;control.onchange=()=>{engine.setParameter(id,p.path,control.checked);changed();};}
    else {control=el('div','pg-param-value');const range=el('input');range.type='range';range.min=p.min;range.max=p.max;range.step=p.step;range.value=value;range.setAttribute('aria-label',p.name);const n=numeric(value,p.min,p.max,p.step,v=>{range.value=v;engine.setParameter(id,p.path,v);changed();});range.oninput=()=>{n.value=range.value;engine.setParameter(id,p.path,+range.value);changed();};control.append(range,n);}
    row.append(field(p.name,control));const help=controlHelp(p.path,engine.decks[id].state.engine),condition=controlCondition(engine.decks[id].state,p.path);if(help||condition){const info=el('details','pg-info');info.append(el('summary','','i'),el('p','pg-help',[help,condition].filter(x=>typeof x==='string').join(' ')));row.append(info);}if(p.kind!=='color')row.append(learnButton(key));else row.append(el('small','','Via macro: scegli i due colori'));row.dataset.parameter=p.path;list.append(row);
   }}search.oninput=draw;draw();parameterDialog.showModal();}
 function parameterCatalogFor(s){return parameterCatalog(s);}
 function openMacro(index){activeMacro=index;const m=config.macros[index];dialogHead(macroDialog,'Macro '+(index+1));const name=el('input');name.value=m.name;name.maxLength=40;name.onchange=()=>{m.name=name.value;changed();};macroDialog.append(field('Nome',name),el('p','pg-help','Un solo fader può guidare più parametri in A e B. I due estremi possono anche essere invertiti. I colori sfumano fra i due campioni. Aggiungere un collegamento non cambia la scena finché non muovi la macro.'));
  const routes=el('div');macroDialog.append(routes);for(const [i,r]of m.routes.entries()){
   const row=el('div','pg-route'),deck=select([['A','Scena A'],['B','Scena B']],r.deck,v=>{r.deck=v;changed();openMacroBody();}),param=select(catalogOptions(r.deck),r.path,v=>{r.path=v;const p=engine.decks[r.deck]?.catalog.find(x=>x.path===v);if(p){r.min=p.min;r.max=p.max;}changed();openMacroBody();});row.append(field('Scena',deck),field('Parametro',param));const p=engine.decks[r.deck]?.catalog.find(x=>x.path===r.path);
   if(p?.kind==='color'){for(const key of ['from','to']){const c=el('input');c.type='color';c.value=r[key];c.oninput=()=>{r[key]=c.value;changed();};row.append(field(key==='from'?'A 0%':'A 100%',c));}}
   else if(p&&p.kind==='number')row.append(field('A 0%',numeric(r.min,p.min,p.max,p.step,v=>{r.min=v;changed();})),field('A 100%',numeric(r.max,p.min,p.max,p.step,v=>{r.max=v;changed();})));
   else if(!p)row.append(el('p','pg-help','Parametro non disponibile nella scena attuale. Scegline uno.'));
   row.append(button('Rimuovi',()=>{m.routes.splice(i,1);changed();openMacroBody();}));routes.append(row);
  }
  macroDialog.append(button('Aggiungi parametro',()=>{if(m.routes.length>=16)return message('Massimo 16 parametri per macro.');m.routes.push({deck:'A',path:'scale',min:.5,max:1.7,from:'#000000',to:'#ffffff'});changed();openMacroBody();}));if(!macroDialog.open)macroDialog.showModal();
 }
 function openMacroBody(){openMacro(activeMacro);}
 macroDialog.addEventListener('close',()=>{render();changed();});
 function mappingCatalog(){const fixed=[['flow.enabled','Modalità Flow'],['flow.mood','Flow · mood'],['flow.colors','Flow · palette'],['flow.speed','Flow · velocità'],['flow.intensity','Flow · intensità'],['flow.variety','Flow · varietà'],['flow.engines','Flow · scene'],['flow.paused','Flow · mantieni scena'],['flow.next','Flow · prossima scena'],['mix','Mix A/B'],['take.A','Transizione verso A'],['take.B','Transizione verso B'],['cut.A','A subito'],['cut.B','B subito'],['transition','Tipo transizione'],['direction','Direzione tendina'],['curve','Andamento'],['duration','Durata'],['unit','Secondi / battiti'],['bpm','BPM'],['quantize','Partenza sul battito'],['master','Livello uscita'],['blackout','Nero'],['close.A','Chiudi pelle A'],['close.B','Chiudi pelle B'],['play:A','Riproduzione A'],['play:B','Riproduzione B'],...config.macros.map((m,i)=>['macro:'+i,'Macro · '+m.name]),['freeze','Fermo'],['invert','Inverti'],['flash','Lampo'],['rewind','Riavvolgi'],['strobe','Strobo'],['impact','Colpo'],['random','Casuale'],['sequence','Sequencer'],...config.sequence.steps.map((_,i)=>['step:'+i,'Passo '+(i+1)]),...LIVE_BUSES.flatMap(([id,name])=>LIVE_FILTERS.map(([key,label])=>['fx.'+id+'.'+key,name+' · '+label])),...['A','B'].flatMap(id=>[['variant.'+id,'Inizio ↔ variante '+id],...MUTATIONS.map(([k,n])=>['mutate.'+id+'.'+k,'Varia '+id+' · '+n])])];for(const id of ['A','B'])for(const [p,n]of catalogOptions(id,false))fixed.push([`param:${id}:${p}`,id+' · '+n]);return fixed;}
 function openMapping(key){targetKey=key;dialogHead(mapDialog,'Assegna un controllo');const catalog=mappingCatalog().filter(([id])=>config.flow.enabled?id.startsWith('flow.')||['master','blackout'].includes(id):true),search=el('input');search.type='search';search.placeholder='Cerca un controllo…';search.setAttribute('aria-label','Cerca controllo da assegnare');const preferred=catalog.find(row=>row[0]===key),selectable=rows=>[...(preferred&&!rows.some(row=>row[0]===key)?[preferred]:[]),...rows.slice(0,40)];
  const choose=select(selectable(catalog),key,value=>{targetKey=value;openMapping(value);});
  search.oninput=()=>{const words=search.value.toLocaleLowerCase('it').trim().split(/\s+/);options(choose,selectable(catalog.filter(([,name])=>words.every(word=>name.toLocaleLowerCase('it').includes(word)))),targetKey);};const existing=config.bindings[key],mode=select([['toggle','Alterna minimo / massimo'],['hold','Attivo mentre premi'],['step','Avanza a passi del 10%']],existing?.mode||'toggle',()=>{}),invert=el('input'),pickup=el('input');invert.type=pickup.type='checkbox';invert.checked=existing?.invert||false;pickup.checked=existing?.pickup!==false;
  const info=el('p','pg-help');info.textContent=existing?'Collegato a '+bindingName(existing.input):'Nessuna assegnazione';mapDialog.append(search,field('Controllo',choose),field('Tasti e pulsanti',mode),field('Inverti',invert),field('Aggancia quando raggiungi il valore attuale',pickup),info,button('Impara assegnazione',()=>inputs.learn(targetKey,mode.value,invert.checked,pickup.checked)),button('Collega MIDI',()=>inputs.connectMidi()),button('Rimuovi assegnazione',()=>{delete config.bindings[targetKey];inputs.release();changed();openMapping(targetKey);}),el('p','pg-help','Tastiera, joystick e MIDI CC / note. Gli assi sono continui; una zona morta evita tremolii al centro. I controlli fisici agganciano il valore senza saltare. Il pad XY e i fader funzionano anche con mouse e touch.'));
  const all=el('details');all.append(el('summary','',Object.keys(config.bindings).length+' assegnazioni salvate'));for(const [k,v]of Object.entries(config.bindings)){const n=catalog.find(x=>x[0]===k)?.[1]||k;all.append(button(n+' ← '+bindingName(v.input),()=>openMapping(k),'quiet'));}mapDialog.append(all);if(!mapDialog.open)mapDialog.showModal();
 }
 mapDialog.addEventListener('close',()=>{if(inputs)inputs.learning=null;});
 async function loadScene(id,snapshot){if(!active)return false;if(director?.running)director.stop();message('Preparo la scena '+id+'. Il mix attuale resta visibile.');const ok=await engine.load(id,{...snapshot,state:sceneOnly(snapshot.state)});if(ok){render();changed();message('Scena '+id+' pronta · '+engine.decks[id].name);}return ok;}
 function notify(kind,id,detail){if(!active)return;if(kind==='frame'){drawPreview(id);return;}if(kind==='error'||kind==='notice')message(detail);else if(kind==='flow'){changed();}else if(kind==='ready'){render();changed();}else if(kind==='loading')sync();else if(kind==='transition-end'){changed();message('Transizione completata.');}else if(kind==='stats'){const d=engine.decks;message(`A ${d.A?.frames||0} fotogrammi · B ${d.B?.frames||0} fotogrammi · uscita ${engine.mixer.canvas.width} × ${engine.mixer.canvas.height}${engine.scale<1||engine.workload<1?' · qualità adattiva':''}${engine.job?' · transizione in corso':''}`);}}
 async function open(){if(active||opening)return;opening=true;opener.disabled=true;try{
   await api.suspend();entry=api.getSnapshot();config=normalizePlayground(entry.state.playground)||defaultPlayground(entry);for(const id of ['A','B'])if(!Number.isFinite(config.decks[id].state.volume))config.decks[id]={name:entry.name,state:sceneOnly(entry.state),phase:entry.phase,playing:true};
   active=true;shell.hidden=false;document.body.classList.add('pg-open');for(const node of document.querySelectorAll('body > .topbar,body > .workspace'))node.inert=true;
   const fresh=canvas.cloneNode();canvas.replaceWith(fresh);canvas=fresh;engine=new PlaygroundEngine(canvas,config,notify);director=new PlaygroundDirector(engine,{notify:directorUI,save:persist});brief.value=config.director.brief;directorUI();stage.style.aspectRatio=String(engine.ratio);inputs=new PlaygroundInputs(config,target,(text,id)=>{if(text==='assigned'){changed();message('Assegnazione salvata nel progetto.');if(mapDialog.open)openMapping(id);}else message(text);});render();message('Preparo le due scene vive…');syncTimer=setInterval(sync,150);
   await loadScene('A',config.decks.A);if(active)await loadScene('B',config.decks.B);
  }catch(e){message(e.message);api.toast(e.message);if(active)close();else api.resume();}finally{opening=false;opener.disabled=false;}}
 function close(){if(!active)return;outputWindow?.close();outputWindow=null;const address=new URL(location.href);if(address.searchParams.has('playground')){address.searchParams.delete('playground');history.replaceState(null,'',address);}
director?.stop();director=null;inputs?.dispose();persist();active=false;clearTimeout(saveTimer);clearInterval(syncTimer);for(const dialog of [mapDialog,macroDialog,parameterDialog])if(dialog.open)dialog.close();engine?.dispose();engine=null;inputs=null;shell.hidden=true;document.body.classList.remove('pg-open');for(const node of document.querySelectorAll('body > .topbar,body > .workspace'))node.inert=false;if(document.fullscreenElement===shell)document.exitFullscreen().catch(()=>{});api.resume();opener.focus();}
 function editDeck(id){const d=engine.decks[id];if(!d)return;const snapshot={state:sceneOnly(d.state),name:d.name,phase:d.phase,ratio:d.ratio},p=engine.snapshot();close();snapshot.state.playground=p;api.adopt(snapshot);api.toast('Modifica la scena; nel Playground usa “Carica scena → Scena dell’editor” per portarla in A o B.');}
 window.addEventListener('pagehide',()=>{outputWindow?.close();director?.stop();engine?.stopAudio();if(active)persist();});
 shell.addEventListener('input',event=>{if(director?.running&&!directorPanel.contains(event.target))director.stop();},true);
 return {open,close,get active(){return active;},get engine(){return engine;},get director(){return director;},getSnapshot:()=>engine?.snapshot()||null,loadScene,setControl:touch,getStatus:()=>engine?{pending:{...engine.pending},decks:Object.fromEntries(Object.entries(engine.decks).map(([id,d])=>[id,d?{engine:d.state.engine,frames:d.frames,phase:d.phase,playing:d.playing}:null])),mix:config.mix,transitioning:!!engine.job,stats:engine.stats,flow:engine.flow.status(),flowSettings:{...config.flow}}:null};
}
