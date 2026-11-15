// Project-only data: never retain devices, canvases or a nested performance.
import {META,GROUPS} from './model.js?v=9d07961f209b';
import {cloudBody,grainMix} from './body-layers.js?v=9d07961f209b';
import {CONTROL_NAMES} from './control-vocabulary.js?v=9d07961f209b';
import {PARTICLE_META,migrateGrainSizes} from './particle-model.js?v=9d07961f209b';
import {LIGHT_META,TRACK_META,syncMaterialControl} from './studio-model.js?v=9d07961f209b';
import {FORCE_META} from './particle-forces.js?v=9d07961f209b';
import {PATH_META} from './particle-paths.js?v=9d07961f209b';
import {normalizeFlow} from './flow-model.js?v=9d07961f209b';
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const number=(x,f,a,b)=>Number.isFinite(x)?clamp(x,a,b):f;
const label=(x,f='',n=80)=>typeof x==='string'?x.replace(/[\x00-\x1f<>]/g,'').slice(0,n):f;
const forbidden=new Set(['__proto__','prototype','constructor','playground']);
const legacyLight=/^light(?:2)?(?:Angle|Height|Power|Size|Color)?$/;
export const MOD_SOURCES=[['sine','LFO 1'],['triangle','LFO 2'],['beat','Battito'],['low','Bassi'],['high','Alti'],['x','Pad X'],['y','Pad Y']];
export const modTarget=key=>typeof key==='string'&&/^(?:macro:[0-7]|mix|master|variant\.[AB]|fx\.(?:A|B|output)\.(?:mosaic|rgb|glitch|glyph|edge|warp|glass|feedback))$/.test(key);
export const TRANSITIONS=['fade','wipe','luma','add','iris','swirl','zoom'];
export const LIVE_FILTERS=[
 ['mosaic','Mosaico'],['rgb','RGB'],['glitch','Glitch'],['glyph','Segni'],
 ['edge','Contorni'],['warp','Distorsione'],['glass','Rifrazione 2D'],['feedback','Eco']
];
export const LIVE_BUSES=[['A','Scena A'],['B','Scena B'],['output','Uscita']];
export function sceneOnly(raw){
 let count=0;const copy=(v,depth)=>{if(++count>150000||depth>14)return null;if(v===null||typeof v==='boolean'||typeof v==='string')return v;if(typeof v==='number')return Number.isFinite(v)?v:0;if(Array.isArray(v))return v.slice(0,10000).map(x=>copy(x,depth+1));if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v))if(!forbidden.has(k))o[k]=copy(v[k],depth+1);return o;}return null;};return copy(raw,0)||{};
}
export function normalizeBinding(b){
 if(!b||typeof b!=='object')return null;
 if(b.kind==='key'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|BracketLeft|BracketRight)$/.test(b.code))return {kind:'key',code:b.code};
 if(['axis','button','cc','note'].includes(b.kind)&&Number.isInteger(b.index)&&b.index>=0&&b.index<128)return {kind:b.kind,index:b.index,device:label(b.device,'',180),channel:number(b.channel,0,0,15)|0};return null;
}
export function bindingName(b){if(!b)return 'Assegna';return b.kind==='key'?({ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'Spazio'})[b.code]||b.code.replace('Key','').replace('Digit',''):({axis:'Asse',button:'Pulsante',cc:'MIDI CC',note:'MIDI nota'})[b.kind]+' '+b.index;}
const humanName=key=>key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^finish /,'Filtro ').replace(/^p([A-Z])/,'Granelli $1');
function route(v){return {deck:v?.deck==='B'?'B':'A',path:label(v?.path,'scale',120),min:number(v?.min,0,-1e6,1e6),max:number(v?.max,1,-1e6,1e6),from:/^#[a-f\d]{6}$/i.test(v?.from)?v.from:'#000000',to:/^#[a-f\d]{6}$/i.test(v?.to)?v.to:'#ffffff'};}
export function normalizePlayground(raw){
 if(!raw||typeof raw!=='object')return null;
 const deck=d=>({name:label(d?.name,'Scena'),state:sceneOnly(d?.state),phase:number(d?.phase,0,0,1e9),ratio:number(d?.ratio,number(raw.ratio,16/9,.1,10),.1,10),playing:d?.playing!==false});
 const c={version:2,decks:{A:deck(raw.decks?.A),B:deck(raw.decks?.B)},mix:number(raw.mix,0,0,1),transition:TRANSITIONS.includes(raw.transition)?raw.transition:'fade',direction:number(raw.direction,0,0,3)|0,duration:number(raw.duration,2,.05,64),unit:raw.unit==='beats'?'beats':'seconds',bpm:number(raw.bpm,120,30,300),curve:['linear','smooth','in','out'].includes(raw.curve)?raw.curve:'smooth',quantize:!!raw.quantize,master:number(raw.master,1,0,1),blackout:false,resolution:[360,540,720,1080].includes(raw.resolution)?raw.resolution:540,autoQuality:raw.autoQuality!==false,macros:[],bindings:{},xyX:number(raw.xyX,0,0,7)|0,xyY:number(raw.xyY,1,0,7)|0};
 c.ratio=number(raw.ratio,16/9,.1,10);const old=Array.isArray(raw.slots)?raw.slots:[];
 c.flow=normalizeFlow(raw.flow);
 c.liveFx=Object.fromEntries(LIVE_BUSES.map(([bus])=>[bus,Object.fromEntries(LIVE_FILTERS.map(([id])=>[id,number(raw.liveFx?.[bus]?.[id],0,0,1)]))]));
 c.freeze=false;c.strobe=false;c.invert=raw.invert===true;
 c.banks=Object.fromEntries(['A','B'].map(id=>[id,Array.from({length:8},(_,i)=>{
  const source=raw.banks?.[id]?.[i];if(!source?.state)return null;
  const thumbnail=typeof source.thumbnail==='string'&&source.thumbnail.length<35900&&/^data:image\/(?:webp|png);base64,[a-zA-Z0-9+/=]+$/.test(source.thumbnail)?source.thumbnail:'';
  return {...deck(source),thumbnail};
 })]));
 c.modulations=(Array.isArray(raw.modulations)?raw.modulations:[]).slice(0,252)
  .filter(m=>MOD_SOURCES.some(([source])=>m?.source===source)&&modTarget(m.target))
  .map(m=>({source:m.source,target:m.target,depth:number(m.depth,.35,0,1),rate:number(m.rate,.25,.03,4)}));
 const sequence=raw.sequence;
 c.sequence={enabled:sequence?.enabled===true,steps:Array.from({length:16},(_,i)=>sequence?.steps?.[i]===true),division:[1,2,4,8].includes(sequence?.division)?sequence.division:4,target:modTarget(sequence?.target)?sequence.target:'fx.output.glitch',depth:number(sequence?.depth,.65,0,1)};
 c.director={brief:typeof raw.director?.brief==='string'?raw.director.brief.slice(0,4000):'',memory:typeof raw.director?.memory==='string'?raw.director.memory.slice(0,3000):'',history:Array.isArray(raw.director?.history)?raw.director.history.slice(-8).map(h=>({at:label(h.at,'',40),observation:label(h.observation,'',1000),intent:label(h.intent,'',1000),name:label(h.name),source:label(h.source,'',20)})):[]};
 c.macros=Array.from({length:8},(_,i)=>{const v=raw.macros?.[i]||old[i]||{};return {name:label(v.name||v.label,'Macro '+(i+1),40),value:number(v.value,0,0,1),routes:(Array.isArray(v.routes)?v.routes:old[i]?[{deck:'A',path:v.param,min:v.min,max:v.max}]:[]).slice(0,16).map(route)};});
 for(const [k,v]of Object.entries(raw.bindings||{}).slice(0,400)){if(forbidden.has(k)||k.length>160)continue;const b=normalizeBinding(v?.input);if(b)c.bindings[k]={input:b,mode:['hold','toggle','step'].includes(v.mode)?v.mode:'toggle',invert:!!v.invert,pickup:v.pickup!==false};}
 // Old absolute grain sizes become ratios in the same macro, without dropping
 // its input assignment or changing the stored scene's starting appearance.
 for(const d of Object.values(c.decks))migrateGrainSizes(d.state,d.state);
 for(const macro of c.macros)for(const r of macro.routes){
  if(r.path==='pFilm')r.path='thinFilm';
  const legacy=/^light(2?)(Power|Size|Color)$/.exec(r.path);
  if(legacy)r.path='lights.'+(legacy[1]?1:0)+'.'+legacy[2].toLowerCase();
  const next={pLargeSize:'pSizeRatio',pLinkNodeSize:'pNodeRatio'}[r.path];if(next){const base=Math.max(.08,c.decks[r.deck].state.pSize||1.1);r.path=next;r.min/=base;r.max/=base;}}
 for(const [key,b] of Object.entries(c.bindings)){
  const previous=raw.bindings?.[key]?.range;if(Array.isArray(previous)&&previous.length===2&&previous.every(x=>Number.isFinite(x)&&Math.abs(x)<=1e6))b.range=[...previous];
  const film=/^param:([AB]):pFilm$/.exec(key),light=/^param:([AB]):light(2?)(Power|Size|Color)$/.exec(key);
  const alias=film?'param:'+film[1]+':thinFilm':light?'param:'+light[1]+':lights.'+(light[2]?1:0)+'.'+light[3].toLowerCase():null;
  if(alias){c.bindings[alias]??=b;delete c.bindings[key];continue;}
  const match=/^param:([AB]):(pLargeSize|pLinkNodeSize)$/.exec(key);if(!match)continue;
  const base=Math.max(.08,c.decks[match[1]].state.pSize||1.1),next=`param:${match[1]}:${match[2]==='pLargeSize'?'pSizeRatio':'pNodeRatio'}`;
  if(!c.bindings[next])c.bindings[next]={...b,range:[(match[2]==='pLargeSize'?.08:0)/base,256/base]};delete c.bindings[key];
 }
 return c;
}
export function defaultPlayground(snapshot){
 const s=sceneOnly(snapshot.state),b=sceneOnly(snapshot.state),engine=s.engine;
 Object.assign(b,{sceneGrains:grainMix(s)>.5?.16:1,pCount:28000,pTrailCount:0,pOpacity:.55,pSize:2.3,pFill:.15});
 b.palette=s.palette.length>1?s.palette.slice().reverse():['#3249a3',s.palette[0], '#c2faff'];
 const specs=[['Dimensione','scale',.5,1.7],['Deformazione',engine==='particles'?'pOrganic':'deform',0,1],['Velocità','speed',.25,2],['Colore','gradientOffset',-1,1],['Metallo','metal',0,1],['Luce','environmentPower',0,2],['Bagliore','glow',0,1],['Granelli','sceneGrains',0,1]];
 const seed=globalThis.crypto?.getRandomValues(new Uint32Array(1))[0]??Math.floor(Math.random()*4294967296);
 const c=normalizePlayground({flow:{seed},resolution:1080,ratio:snapshot.ratio,decks:{A:{name:snapshot.name,state:s,phase:snapshot.phase,ratio:snapshot.ratio},B:{name:snapshot.name+' · B',state:b,phase:snapshot.phase,ratio:snapshot.ratio}},macros:specs.map(([name,path,min,max])=>({name,value:clamp(((s[path]??min)-min)/(max-min)),routes:[{deck:'A',path,min,max}]}))});
 c.macros[7].value=grainMix(s);
 c.bindings['take.B']={input:{kind:'key',code:'ArrowRight'},mode:'toggle',pickup:false};c.bindings['take.A']={input:{kind:'key',code:'ArrowLeft'},mode:'toggle',pickup:false};c.bindings.blackout={input:{kind:'key',code:'KeyB'},mode:'hold',pickup:false};return c;
}
const enumValues={bgMode:['solid','gradient','studio','transparent'],blendMode:['normal','add','screen'],curve:['sine','triangle','smooth','linear'],mode:['wave','cycle'],axis:['x','y','z']};
export function parameterCatalog(s){
 const entries=[];const add=(path,name,kind,min=0,max=1,step=.01,values)=>{const base=path.split('.')[0],group=base==='motions'?'motion':base==='lights'?'light':/^force|^dyn/.test(base)?'interaction':/^finish/.test(base)?'filters':Object.entries(GROUPS).find(([,keys])=>keys.includes(base))?.[0]||'shape';entries.push({path,name,kind,min,max,step,values,group});};
 add('sceneGrains','Superficie ↔ granelli','number',0,1,.001);
 const meta={...META,...PARTICLE_META};
 for(const [key,value]of Object.entries(s)){
  if(forbidden.has(key)||['sceneGrains','pFilm','pVeilSourceKind','pVeilFromForm','finishGlitchSoftness'].includes(key)||legacyLight.test(key)||/Version$|^seed$|^duration$|^motionPeriod$/.test(key))continue;
  if(key.startsWith('pVeil')&&s.pLiving!==4)continue;
  if(typeof value==='number'&&Object.hasOwn(meta,key)){const m=meta[key];add(key,CONTROL_NAMES[key]||m[0],'number',m[1],m[2],m[3]);}
  else if(typeof value==='boolean'&&!/^(animate|perfectLoop|keepMotionSpeed|assistant)/.test(key))add(key,CONTROL_NAMES[key]||({finishEnabled:'Filtri',finishTone:'Correzione colore',photoAll:'Correggi anche il fondale',environmentRotate:'Ruota ambiente',light2:'Seconda luce',thinShellMode:'Lamiera trasparente'}[key]??humanName(key)),'boolean',0,1,1);
  else if(typeof value==='string'&&/^#[a-f\d]{6}$/i.test(value))add(key,({background:'Colore del fondale',background2:'Secondo colore del fondale',internalColor:'Colore interno',sssColor:'Colore della diffusione'}[key]??humanName(key)),'color');
  else if(Object.hasOwn(enumValues,key)&&enumValues[key].includes(value))add(key,key,'enum',0,enumValues[key].length-1,1,enumValues[key]);
 }
 for(const [i,color]of (s.palette||[]).entries())if(/^#[a-f\d]{6}$/i.test(color))add('palette.'+i,'Palette · colore '+(i+1),'color');
 for(const [key,t]of Object.entries(s.motions||{})){
  const m=Object.hasOwn(TRACK_META,key)?TRACK_META[key]:Object.hasOwn(meta,key)?meta[key]:[key,0,1,.01];
  for(const [prop,min,max,step]of [['enabled',0,1,1],['amplitude',0,Math.max(Math.abs(m[1]),Math.abs(m[2])),m[3]],['cycles',.05,16,.05],['phase',0,360,1],['direction',-1,1,2],['pace',-1,1,.01],['pacePhase',0,360,1],['hold',0,.95,.01]])if(Object.hasOwn(t,prop))add(`motions.${key}.${prop}`,`Moto · ${m[0]} · ${{enabled:'attivo',amplitude:'ampiezza',cycles:'cicli',phase:'fase',direction:'verso',pace:'ritmo',pacePhase:'fase ritmo',hold:'sosta'}[prop]}`,prop==='enabled'?'boolean':'number',min,max,step);
  for(const prop of ['mode','curve'])if(enumValues[prop].includes(t[prop]))add(`motions.${key}.${prop}`,`Moto · ${m[0]} · ${prop}`,'enum',0,enumValues[prop].length-1,1,enumValues[prop]);
 }
 for(const [i,l]of (s.lights||[]).entries()){
  for(const [k,m]of Object.entries(LIGHT_META))if(Number.isFinite(l[k]))add(`lights.${i}.${k}`,`Luce ${i+1} · ${m[0]}`,'number',m[1],m[2],m[3]);
  for(const k of ['enabled','visible'])if(typeof l[k]==='boolean')add(`lights.${i}.${k}`,`Luce ${i+1} · ${k}`,'boolean',0,1,1);
  if(/^#[a-f\d]{6}$/i.test(l.color))add(`lights.${i}.color`,`Luce ${i+1} · colore`,'color');
  for(const k of ['orbit','pulse'])for(const [p,v]of Object.entries(l[k]||{}))if(typeof v==='number'||typeof v==='boolean')add(`lights.${i}.${k}.${p}`,`Luce ${i+1} · ${k} · ${p}`,typeof v==='boolean'?'boolean':'number',p==='direction'?-1:0,p==='phase'?360:p==='cycles'?16:1,p==='phase'?1:.01);
 }
 // Individual force controls retain their existing fields and dimensions.
 for(const collection of ['forcePoints','forcePaths'])for(const [i,f]of (s[collection]||[]).entries())for(const [k,v]of Object.entries(f)){
  const fieldMeta=collection==='forcePaths'?PATH_META:FORCE_META;
  if(typeof v==='number'&&Object.hasOwn(fieldMeta,k)){const m=fieldMeta[k];add(`${collection}.${i}.${k}`,`${collection==='forcePaths'?'Percorso':'Campo'} ${i+1} · ${m[0]}`,'number',m[1],m[2],m[3]);}
  if(typeof v==='boolean')add(`${collection}.${i}.${k}`,`Campo ${i+1} · ${k}`,'boolean',0,1,1);
 }
 return entries;
}
export function readParameter(s,path){if(path==='sceneGrains')return grainMix(s);if(path==='thinFilm'&&cloudBody(s)&&grainMix(s)>=1)return s.pFilm;let o=s;for(const k of path.split('.')){if(forbidden.has(k)||!o||!Object.hasOwn(o,k))return undefined;o=o[k];}return o;}
export function writeParameter(s,entry,value){
 if(!entry)return false;const keys=entry.path.split('.');let o=s;for(const k of keys.slice(0,-1)){if(forbidden.has(k)||!o||!Object.hasOwn(o,k))return false;o=o[k];}const k=keys.at(-1);if(forbidden.has(k)||!o||k!=='sceneGrains'&&!Object.hasOwn(o,k))return false;
 if(entry.kind==='color'){if(!/^#[a-f\d]{6}$/i.test(value))return false;o[k]=value;}
 else if(entry.kind==='enum'){if(!entry.values.includes(value))return false;o[k]=value;}
 else if(entry.kind==='boolean')o[k]=!!value;
 else {if(!Number.isFinite(value))return false;const v=clamp(value,entry.min,entry.max);o[k]=entry.step>=1?clamp(entry.min+Math.round((v-entry.min)/entry.step)*entry.step,entry.min,entry.max):v;}
 if(o===s)syncMaterialControl(s,k);
 return true;
}
export function colorMix(a,b,t){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');}
export function parameterFromUnit(entry,v){v=clamp(v);return entry.kind==='boolean'?v>=.5:entry.kind==='enum'?entry.values[Math.round(v*(entry.values.length-1))]:entry.min+v*(entry.max-entry.min);}
export function axisValue(value){return clamp((Math.abs(value)<.12?0:Math.sign(value)*(Math.abs(value)-.12)/.88)/2+.5);}
export function catchesValue(previous,next,current){return Math.abs(next-current)<.06||(Number.isFinite(previous)&&(previous-current)*(next-current)<=0);}
export function transitionSeconds(c){return c.duration*(c.unit==='beats'?60/c.bpm:1);}
export function ease(t,curve){return curve==='smooth'?t*t*(3-2*t):curve==='in'?t*t:curve==='out'?1-(1-t)*(1-t):t;}
export function transitionValue(job,time){const t=clamp((time-job.start)/job.seconds);return job.from+(job.to-job.from)*ease(t,job.curve);}
