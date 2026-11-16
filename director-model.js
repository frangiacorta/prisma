import {newCreation,normalizeCreation} from './creative-model.js?v=3382c134fb2d';
import {particleCreation} from './particle-model.js?v=3382c134fb2d';
import {parameterCatalog,readParameter,writeParameter,sceneOnly,TRANSITIONS} from './playground-model.js?v=3382c134fb2d';

export const DIRECTOR_BRIEF='Esplora liberamente forma e particelle, materia, luce, colore e movimento. Sviluppa idee riconoscibili, cambia ritmo e scala, alterna dettagli e insieme. Usa sovrapposizioni intenzionali, non alternare meccanicamente i due motori. Parti dalla scena presente e valuta visivamente ogni risultato. Sfondo nero, composizioni leggibili, niente lampeggi rapidi.';
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const str={type:'string'},num={type:'number'};
export const DIRECTOR_MAX_CHANGES=100,DIRECTOR_MAX_COLORS=8;
export const DIRECTOR_SCHEMA=obj({observation:str,intent:str,memory:str,action:{type:'string',enum:['hold','evolve']},source:{type:'string',enum:['A','B','sphere','particles']},name:str,changes:{type:'array',maxItems:DIRECTOR_MAX_CHANGES,items:obj({path:str,value:{anyOf:[num,str,{type:'boolean'}]}})},palette:{type:'array',maxItems:DIRECTOR_MAX_COLORS,items:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},transition:{type:'string',enum:TRANSITIONS},direction:{type:'integer',minimum:0,maximum:3},curve:{type:'string',enum:['linear','smooth','in','out']},seconds:{type:'number',minimum:2,maximum:24},blend:{type:'number',minimum:.15,maximum:1},holdSeconds:{type:'number',minimum:8,maximum:45}});
export function directorBase(source,decks){
 if(source==='sphere')return newCreation();
 if(source==='particles')return particleCreation(newCreation(),0);
 if(!['A','B'].includes(source)||!decks[source]?.state)throw Error('Scena di partenza non valida.');
 return normalizeCreation(sceneOnly(decks[source].state));
}
// Explicit capabilities, never generated JavaScript. Motion/light paths use the same
// catalog and validation as the manual console. Compact templates keep vision turns short.
export function directorCatalog(state){
 const entries=parameterCatalog(state),tracks={},lights={};
 const parameters=entries.filter(e=>!e.path.startsWith('motions.')&&!e.path.startsWith('lights.')&&!e.path.startsWith('palette.')).map(e=>[e.path,e.name,e.kind,e.kind==='enum'?e.values:[e.min,e.max]]);
 for(const e of entries){const m=/^motions\.([^.]+)\.(amplitude|enabled)$/.exec(e.path);if(m&&m[2]==='amplitude')tracks[m[1]]=e.max;const l=/^lights\.0\.(.+)$/.exec(e.path);if(l)lights[l[1]]=e.kind==='enum'?e.values:[e.kind,e.min,e.max];}
 return {parameters,tracks,lights,trackPaths:'motions.KEY.enabled/amplitude/cycles/phase/direction/pace/pacePhase/hold/mode/curve. enabled boolean; cycles .05–16; phase 0–360; direction ±1; pace -1–1; hold 0–.95; mode wave/cycle; curve sine/triangle. Activate enabled and nonzero amplitude. Cycle for continuous rotation/flow; wave for oscillation.',lightPaths:'lights.INDEX.PROPERTY. Use existing indexes. Color #rrggbb; enabled/visible boolean. visible is only a gizmo. Orbit/pulse enabled, amplitude, cycles, phase are available.'};
}
export function validateDirectorPlan(reply,decks){
 if(!reply||!['hold','evolve'].includes(reply.action)||!['A','B','sphere','particles'].includes(reply.source))throw Error('Decisione della regia non valida.');
 const copyText=(key,length)=>typeof reply[key]==='string'?reply[key].replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'').trim().slice(0,length):'';
 const observation=copyText('observation',1000),intent=copyText('intent',1000),memory=copyText('memory',3000),name=copyText('name',80);
 if(!Array.isArray(reply.changes)||reply.changes.length>DIRECTOR_MAX_CHANGES||!Array.isArray(reply.palette)||reply.palette.length>DIRECTOR_MAX_COLORS||reply.palette.some(c=>!/^#[\da-f]{6}$/i.test(c)))throw Error('Parametri della regia non validi.');
 if(!TRANSITIONS.includes(reply.transition)||!['linear','smooth','in','out'].includes(reply.curve)||!Number.isInteger(reply.direction)||reply.direction<0||reply.direction>3)throw Error('Transizione non valida.');
 for(const [key,min,max]of [['seconds',2,24],['blend',.15,1],['holdSeconds',8,45]])if(!Number.isFinite(reply[key])||reply[key]<min||reply[key]>max)throw Error('Tempo o mix non valido.');
 const state=directorBase(reply.source,decks);
 // Palette replacement defines the slots available to this same proposal.
 if(reply.palette.length)state.palette=[...reply.palette];
 // Enable the connected-surface catalog before applying its dependent controls.
 const caps={pCount:120000,filCount:24000,pLinkNodes:2500,pTrailCount:12000};
 const changes=[];
 const accept=(entry,value)=>{
  if(!entry||entry.kind==='boolean'&&typeof value!=='boolean')return false;
  if(entry.kind==='number'&&(!Number.isFinite(value)||value<entry.min||value>Math.min(entry.max,caps[entry.path]??Infinity)))return false;
  if(!writeParameter(state,entry,value))return false;
  changes.push({path:entry.path,value});
  return true;
 };
 const living=parameterCatalog(state).find(e=>e.path==='pLiving');
 for(const change of reply.changes)if(change?.path==='pLiving')accept(living,change.value);
 const catalog=new Map(parameterCatalog(state).map(entry=>[entry.path,entry]));
 for(const change of reply.changes)if(change&&typeof change.path==='string'&&change.path!=='pLiving')accept(catalog.get(change.path),change.value);
 // Camera/microphone inputs belong to the user, not to a generated plan.
 if(state.bodyTracking)state.bodyTracking.enabled=false;
 if(state.audioReactive)state.audioReactive.enabled=false;
 return {...reply,observation,intent,memory,name,changes,state:normalizeCreation(state)};
}
export function directorStateSummary(state){
 const c=parameterCatalog(state);return Object.fromEntries(c.filter(e=>!e.path.startsWith('motions.')||state.motions?.[e.path.split('.')[1]]?.enabled).map(e=>[e.path,readParameter(state,e.path)]));
}
