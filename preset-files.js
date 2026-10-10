import {migratePathfinder} from './particle-model.js?v=170c6bdce53c';
import {newCreation} from './creative-model.js?v=170c6bdce53c';
import {normalizeCreation} from './creative-model.js?v=170c6bdce53c';

let downloadSerial=0;
export function cleanPresetName(value,fallback='La tua creazione'){
 const clean=typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,90):'';
 return clean||fallback;
}
export function favoriteName(record){
 const suffix=String(record.id||'').replace(/[^a-z0-9]/gi,'').slice(-6)||'preset';
 return cleanPresetName(record.name,`${cleanPresetName(record.state?.materialName,'Creazione')} · ${suffix}`);
}
export function favoriteDate(record){
 const date=new Date(record.date);
 return Number.isFinite(date.getTime())?date.toLocaleString('it-IT',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Data non disponibile';
}
export function uniqueDownloadName(stem,extension,date=new Date()){
 const pad=(v,n=2)=>String(v).padStart(n,'0');
 const stamp=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(),3)}`;
 const slug=cleanPresetName(stem,'prisma').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'prisma';
 const serial=(++downloadSerial).toString(36);
 return `${slug}-${stamp}-${serial}.${String(extension).replace(/[^a-z0-9]/gi,'').toLowerCase()||'json'}`;
}
export function presetDocument(snapshot,now=new Date()){
 return {prismaProject:2,name:cleanPresetName(snapshot.name),createdAt:snapshot.date||now.toISOString(),exportedAt:now.toISOString(),state:structuredClone(snapshot.state),ratio:Number.isFinite(snapshot.ratio)?snapshot.ratio:1,phase:Number.isFinite(snapshot.phase)?snapshot.phase:0};
}
export function readPreset(text,fallbackName='Preset importato'){
 const document=JSON.parse(text);
 if(!document||typeof document!=='object'||Array.isArray(document))throw Error('Il file non contiene un preset Prisma.');
 const raw=document.format==='prisma/pathfinder'?migratePathfinder(document,newCreation()):document.state||document;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['volume','deform','scale','transparency'].some(k=>Number.isFinite(raw[k])))throw Error('Il file non contiene i parametri di una creazione Prisma.');
 const state=normalizeCreation(raw),ratio=Number.isFinite(document.ratio)&&document.ratio>=.1&&document.ratio<=10?document.ratio:1;
 const phase=Number.isFinite(document.phase)?document.phase>=0&&document.phase<Math.PI*2?document.phase:((document.phase%(Math.PI*2))+(Math.PI*2))%(Math.PI*2):0;
 return {state,ratio,phase,name:cleanPresetName(document.name,fallbackName)};
}
