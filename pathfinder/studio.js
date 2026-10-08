import {defaults,limits,studies,makePreset,validatePreset,clockPhase,exportDefaults,validateExportSettings,exportBitrate} from './model.js';
import {PathfinderRenderer} from './renderer.js';
import {exportLoop} from './export.js';
import {importPrismaProject} from './prisma-controls.js';
import {createPrismaPanel} from './prisma-panel.js';
import {runtimeConfig} from './runtime-config.js';

const $=id=>document.getElementById(id),storage='prisma.pathfinder.v1';
let state=structuredClone(defaults),exportSettings={...exportDefaults},seconds=0,playing=true,renderer,busy=false,abort,previous=performance.now(),lastDraw=0;
let lastExport;
if(runtimeConfig.homeUrl){$('forms-home').href=runtimeConfig.homeUrl;$('forms-home').hidden=false;$('current-prisma').hidden=false;}
if(runtimeConfig.exportMode==='browser')$('runtime-label').textContent='Nel tuo browser';
try{const saved=localStorage.getItem(storage);if(saved){const parsed=JSON.parse(saved);state=validatePreset(parsed);exportSettings=validateExportSettings(parsed.export);}}catch{}
const rows=[
 ['matter','density','Densità',.01,v=>Math.round(v/1.5*96000).toLocaleString('it-IT')],
 ['shape','compactness','Compattezza',.01],['shape','opening','Vuoto centrale',.01],['shape','turbulence','Increspature',.01],['matter','trails','Lunghezza delle scie',.01],
 ['outer','outerStrength','Fasci esterni',.01,v=>v===0?'Spenti':Math.round(v*100)+'%'],['outer','outerReach','Estensione',.01],
 ['motion','cycles','Cicli nel loop',1,v=>String(v)],['motion','vortex','Vortice',.01],['motion','rhythm','Rilanci',.01],['motion','pause','Pausa nel ciclo',.01,v=>(v*100).toFixed(0)+'%'],
 ['light','exposure','Intensità scena',.01],['light','glow','Alone',.01],['matter','grain','Particelle in evidenza',.01],['frame','zoom','Zoom camera',.01,v=>v.toFixed(2)+'×'],
];
for(const [group,key,label,step] of rows){const div=document.createElement('div');div.className='control';div.innerHTML=`<label for="${key}">${label}<output id="value-${key}"></output></label><input type="range" id="${key}" min="${limits[key][0]}" max="${limits[key][1]}" step="${step}">`;$(`${group}-sliders`).append(div);$(key).addEventListener('input',e=>{state[key]=Number(e.target.value);seconds%=state.duration;changed();});}
const prismaPanel=createPrismaPanel(()=>state,changed,say);
function say(message){$('notice').textContent=message;}
function persist(){try{localStorage.setItem(storage,JSON.stringify(makePreset(state,exportSettings)));}catch{}}
function sync(){for(const [,key,, ,format]of rows){$(key).value=state[key];$('value-'+key).textContent=format?format(state[key]):Math.round(state[key]*100)+'%';}$('seed').value=state.seed;$('palette').value=state.palette;$('duration-label').textContent=state.duration+' s';$('particle-count').textContent=Math.round(state.density/1.5*96000).toLocaleString('it-IT')+' PARTICELLE';
 $('study').value=Object.entries(studies).find(([,p])=>Object.keys(defaults).filter(k=>k!=='prisma').every(k=>p[k]===state[k]))?.[0]||'custom';
 $('duration').value=state.duration;$('direction').value=state.direction;$('size').value=exportSettings.size;$('fps').value=exportSettings.fps;$('quality').value=exportSettings.quality;
 for(const button of document.querySelectorAll('[data-duration]'))button.setAttribute('aria-pressed',String(Number(button.dataset.duration)===state.duration));
 $('motion-summary').textContent=`Una evoluzione ogni ${(state.duration/state.cycles).toLocaleString('it-IT',{maximumFractionDigits:1})} s. Più cicli aumentano la velocità.`;
 const mb=exportBitrate(exportSettings)*state.duration/8/1e6;$('export-summary').textContent=`${(state.duration*exportSettings.fps).toLocaleString('it-IT')} fotogrammi · circa ${mb>=1000?(mb/1000).toFixed(1)+' GB':Math.ceil(mb)+' MB'}`;
 const curveState={...state,cycles:1,direction:1};const pts=[];for(let i=0;i<=100;i++){const t=i/100*state.duration;const velocity=(clockPhase(t+.001,curveState)-clockPhase(t,curveState))/.001;pts.push(`${i?'L':'M'}${i*2.6},${60-Math.max(0,velocity)*state.duration*2.4}`);}$('curve').setAttribute('d',pts.join(' '));prismaPanel.sync();}
function dimensions(){const [w,h]=$('size').value.split('x').map(Number);const max=Math.min(1400,Math.max(640,$('scene').parentElement.clientWidth*devicePixelRatio));const scale=Math.min(1,max/w,1000/h);return [Math.round(w*scale/2)*2,Math.round(h*scale/2)*2];}
function draw(){if(!renderer)return;const [w,h]=dimensions();renderer.render(state,seconds,w,h);$('scene').style.aspectRatio=w+'/'+h;$('time').textContent=seconds.toFixed(2).padStart(5,'0');$('timeline').value=Math.round(seconds/state.duration*1000);}
function releaseExport(){const old=lastExport;lastExport=null;old?.dispose?.().catch(()=>{});$('download').hidden=true;$('download-metadata').hidden=true;}
function changed(){sync();persist();draw();releaseExport();$('verification').textContent='';say(state.duration+' secondi. Un ciclo continuo.');}
function setPlaying(value){playing=value;$('play').textContent=value?'Ⅱ':'▷';$('play').setAttribute('aria-label',value?'Metti in pausa':'Riprendi');previous=performance.now();}
function apply(p,settings=exportSettings){state=structuredClone(p);exportSettings={...settings};seconds=0;changed();}
function fail(e){$('failure').hidden=false;$('failure').textContent=e.message||String(e);setPlaying(false);}
$('play').onclick=()=>setPlaying(!playing);
$('timeline').oninput=e=>{setPlaying(false);seconds=Number(e.target.value)/1000*state.duration;draw();};
$('study').onchange=e=>{apply({...studies[e.target.value],duration:state.duration,prisma:state.prisma});say('Studio caricato. Lo stile Prisma e la durata sono conservati.');};
$('reset').onclick=()=>{apply(defaults,exportDefaults);$('study').value='nucleus';say('Studio originale ripristinato.');};
$('palette').onchange=e=>{state.palette=e.target.value;state.prisma.usePalette=false;changed();};
$('seed').onchange=e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=0&&v<=999999){state.seed=v;changed();}else{$('seed').value=state.seed;say('La variazione deve essere un intero da 0 a 999999.');}};
$('vary').onclick=()=>{state.seed=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;changed();};
for(const tab of document.querySelectorAll('[role=tab]')){tab.onclick=()=>{for(const t of document.querySelectorAll('[role=tab]')){const active=t===tab;t.setAttribute('aria-selected',String(active));$(t.getAttribute('aria-controls')).hidden=!active;}};}
$('focus').onclick=()=>{const focus=document.body.classList.toggle('focus');$('focus').textContent=focus?'Mostra controlli ↙':'Solo opera ↗';draw();};
function setDuration(value){if(!Number.isInteger(value)||value<4||value>300){$('duration').value=state.duration;say('Scegli una durata intera da 4 a 300 secondi.');return;}seconds=seconds/state.duration*value;state.duration=value;changed();}
$('duration').onchange=e=>setDuration(Number(e.target.value));
for(const button of document.querySelectorAll('[data-duration]'))button.onclick=()=>setDuration(Number(button.dataset.duration));
$('direction').onchange=e=>{state.direction=Number(e.target.value);changed();};
for(const key of ['size','fps','quality'])$(key).onchange=e=>{exportSettings[key]=key==='fps'?Number(e.target.value):e.target.value;changed();};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('save-preset').onclick=()=>{download(new Blob([JSON.stringify(makePreset(state,exportSettings),null,2)],{type:'application/json'}),'Prisma-Pathfinder.json');say('Preset salvato.');};
$('load-preset').onclick=()=>$('preset-file').click();
function applyPrisma(data){const result=importPrismaProject(data,state);apply(result.parameters);say('Stile Prisma applicato: materia, palette, luci e animazioni compatibili. Durata conservata.');$('bridge-status').textContent='Stile da Prisma: '+state.prisma.sourceName+'. Adattato alle particelle; le superfici solide e gli effetti volumetrici restano nel renderer originale.';}
$('preset-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>64000)throw new Error('Preset troppo grande.');const data=JSON.parse(await f.text());if(busy)return;if(data.prismaProject===2)applyPrisma(data);else{apply(validatePreset(data),validateExportSettings(data.export));say('Preset aperto.');}}catch(error){say(error.message);}finally{e.target.value='';}};
$('apply-reference').onclick=async()=>{if(busy)return;$('apply-reference').disabled=true;try{const response=await fetch(runtimeConfig.referenceBase+$('reference-style').value+'/preset.json');if(!response.ok)throw new Error('Preset Prisma non disponibile. Ricarica la pagina.');const data=await response.json();if(!busy)applyPrisma(data);}catch(error){say(error.message);}finally{if(!busy)$('apply-reference').disabled=false;}};
$('current-prisma').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem('prisma-current-v2')||'null');if(!saved?.state)throw new Error('Apri prima Forme e prepara una creazione in questo browser.');applyPrisma({prismaProject:2,state:saved.state,name:'Creazione attuale'});}catch(error){say(error.message);}};
$('snapshot').onclick=()=>{try{draw();$('scene').toBlob(blob=>{if(blob)download(blob,'Prisma-Pathfinder.png');},'image/png');}catch(error){say(error.message);}};
let pointer;
$('scene').onpointerdown=e=>{if(busy)return;pointer={x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch};$('scene').setPointerCapture(e.pointerId);};
$('scene').onpointermove=e=>{if(!pointer)return;state.yaw=Math.max(-180,Math.min(180,pointer.yaw+(e.clientX-pointer.x)*.3));state.pitch=Math.max(-80,Math.min(80,pointer.pitch+(e.clientY-pointer.y)*.3));draw();};
$('scene').onpointerup=$('scene').onpointercancel=()=>{if(pointer){pointer=null;changed();}};
document.addEventListener('keydown',e=>{if(busy||/INPUT|SELECT|BUTTON|SUMMARY/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}});
function lock(value){busy=value;for(const el of document.querySelectorAll('aside button,aside input,aside select,.transport button,.transport input'))el.disabled=value;$('cancel').disabled=false;$('export-progress').hidden=!value;}
$('cancel').onclick=()=>abort?.abort();
$('export').onclick=async()=>{
 const resume=playing;setPlaying(false);lock(true);abort=new AbortController();releaseExport();
 const snapshot=structuredClone(state),settings={...exportSettings},[width,height]=settings.size.split('x').map(Number),fps=settings.fps;
 try{say('Preparazione del video…');
   const result=await exportLoop(snapshot,{settings,signal:abort.signal,onProgress:(progress,frame,count)=>{$('progress').value=progress;say(`Render ${frame} / ${count} · ${Math.round(progress*100)}%`);}});
   lastExport=result;$('download').href=result.url;$('download').download=result.filename;$('download').hidden=false;
   if(result.metadataUrl){$('download-metadata').href=result.metadataUrl;$('download-metadata').download=result.filename.replace(/\.mp4$/,'.json');$('download-metadata').hidden=false;}
   say(`${result.browser?'Pronto da scaricare':'Salvato'} · ${width} × ${height} · ${snapshot.duration} s · ${fps} fps. Raccordo verificato.`);
 }catch(error){say(error.name==='AbortError'?'Esportazione annullata.':error.message);}
 finally{lock(false);prismaPanel.sync();setPlaying(resume);draw();}
};
$('verify').onclick=()=>{
 const time=seconds,resume=playing;setPlaying(false);
 try{const [w,h]=[480,270];renderer.render(state,0,w,h);const first=renderer.pixels();renderer.render(state,state.duration,w,h);const end=renderer.pixels();let max=0;for(let i=0;i<first.length;i++)max=Math.max(max,Math.abs(first[i]-end[i]));const message=max===0?'Chiusura esatta: inizio e fine coincidono.':'Differenza massima: '+max+'/255';$('verification').textContent=message;
 }catch(error){$('verification').textContent=error.message;}finally{seconds=time;setPlaying(resume);draw();}
};
addEventListener('resize',()=>{if(!busy)draw();});
document.addEventListener('visibilitychange',()=>{previous=performance.now();});
addEventListener('pagehide',()=>{abort?.abort();releaseExport();});
$('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();abort?.abort();fail(new Error('La GPU è stata interrotta. Ricarica la pagina per riprendere.'));});
function tick(now){requestAnimationFrame(tick);const dt=Math.min(.1,(now-previous)/1000);previous=now;if(!document.hidden&&!busy&&playing&&renderer){seconds=(seconds+dt)%state.duration;if(now-lastDraw>1000/30){try{draw();}catch(e){fail(e);}lastDraw=now;}}}
sync();say(state.duration+' secondi. Un ciclo continuo.');try{renderer=new PathfinderRenderer($('scene'));draw();requestAnimationFrame(tick);}catch(e){fail(e);}
