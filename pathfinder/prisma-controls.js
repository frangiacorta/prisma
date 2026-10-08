// The animation sampler is the actual Prisma source already present in this project.
import {sampleFrame} from './reference/prisma/renderer.js';

export const prismaRanges = {
  volume:[.08,1.5],stretchX:[.35,2],stretchY:[.35,2],stretchZ:[.35,2],
  deform:[0,.75],twist:[-2.5,2.5],waves:[0,.4],waveScale:[.5,8],
  scale:[.35,1.7],positionX:[-1.5,1.5],positionY:[-1.5,1.5],
  rotateX:[-360,360],rotateY:[-360,360],rotateZ:[-360,360],
  metal:[0,1],roughness:[0,1],gloss:[0,1],iridescence:[0,1],emission:[0,2],
  transparency:[0,1],lighting:[0,1],pointSize:[.5,5],
  environmentPower:[0,3],environmentAngle:[-180,180],
  gradientAngle:[-180,180],gradientScale:[.1,5],gradientOffset:[0,1],
  exposure:[-2,2],brightness:[-.5,.5],contrast:[.5,2],saturation:[0,2],motion:[0,1],
};
export const environments=['studio','sunset','neon','sky','aquarium','aurora','city'];
export const motionTargets={volume:'Volume',deform:'Deformazione',twist:'Torsione',waves:'Onde',scale:'Scala',rotateX:'Rotazione X',rotateY:'Rotazione Y',rotateZ:'Rotazione Z',gradientOffset:'Scorrimento colore',iridescence:'Iridescenza',roughness:'Rugosità',transparency:'Trasparenza'};
export const materialPresets={
  luminous:{name:'Luminosa · originale',lighting:0,metal:0,roughness:.45,gloss:.6,iridescence:0,emission:1,environmentPower:0,transparency:0,pointSize:1},
  pearl:{name:'Perla',lighting:1,metal:.15,roughness:.32,gloss:.8,iridescence:.55,emission:.25,environmentPower:.6,transparency:0,pointSize:1.5},
  chrome:{name:'Metallo',lighting:1,metal:1,roughness:.12,gloss:1,iridescence:.1,emission:.1,environmentPower:1.3,transparency:0,pointSize:2},
  matte:{name:'Opaca',lighting:1,metal:0,roughness:.9,gloss:.1,iridescence:0,emission:.1,environmentPower:.3,transparency:0,pointSize:1.6},
};
export function newMotion(){return {enabled:false,amplitude:.2,cycles:1,phase:0,direction:1,curve:'sine',mode:'wave'};}
export function newLight(index=0){return {enabled:true,x:index%2?3:-3,y:index%2?-1:3,z:4,power:index%2?1:1.8,size:.6,color:index%2?'#c8adff':'#dcf5ff',orbit:{...newMotion(),mode:'cycle',axis:'y'},pulse:{...newMotion(),amplitude:.35}};}
export function prismaDefaults(){return {
  volume:1,stretchX:1,stretchY:1,stretchZ:1,deform:0,twist:0,waves:0,waveScale:3,
  scale:1,positionX:0,positionY:0,rotateX:0,rotateY:0,rotateZ:0,
  ...Object.fromEntries(Object.entries(materialPresets.luminous).filter(([key])=>key!=='name')),
  environment:'studio',environmentAngle:0,
  usePalette:false,palette:['#094561','#9efaff'],gradientAngle:35,gradientScale:1,gradientOffset:0,
  bgMode:'original',background:'#020407',background2:'#142535',
  exposure:0,brightness:0,contrast:1,saturation:1,motion:.3,perfectLoop:true,
  motions:{},lights:[newLight(),newLight(1)],sourceName:'',
};}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function color(value){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw new Error('Colore Prisma non valido.');return value.toLowerCase();}
function number(value,range,name){if(!Number.isFinite(value)||value<range[0]||value>range[1])throw new Error('Valore Prisma non valido: '+name);return value;}
function motion(value={},axis=false){
  const t={...newMotion(),...value};
  if(typeof t.enabled!=='boolean'||!['sine','triangle','soft'].includes(t.curve)||!['cycle','wave'].includes(t.mode)||![1,-1].includes(t.direction))throw new Error('Animazione Prisma non valida.');
  number(t.amplitude,[0,360],'ampiezza');number(t.cycles,[1,12],'cicli');number(t.phase,[-360,360],'fase');
  if(!Number.isInteger(t.cycles))throw new Error('Usa cicli interi per chiudere il loop.');
  const result={enabled:t.enabled,amplitude:t.amplitude,cycles:t.cycles,phase:t.phase,direction:t.direction,curve:t.curve,mode:t.mode};
  if(axis){if(!['x','y','z'].includes(t.axis??'y'))throw new Error('Asse luce non valido.');result.axis=t.axis??'y';}
  return result;
}
export function validatePrisma(value){
  const d=prismaDefaults(),s={...d,...value},out={};
  for(const [key,range]of Object.entries(prismaRanges))out[key]=number(s[key],range,key);
  if(!environments.includes(s.environment)||!['original','solid','gradient'].includes(s.bgMode)||typeof s.usePalette!=='boolean')throw new Error('Ambiente Prisma non valido.');
  if(!Array.isArray(s.palette)||s.palette.length<1||s.palette.length>12)throw new Error('La palette deve avere da 1 a 12 colori.');
  if(!Array.isArray(s.lights)||s.lights.length>8)throw new Error('Sono supportate fino a 8 luci.');
  out.lights=s.lights.map((l,i)=>{
    const t={...newLight(i),...l};if(typeof t.enabled!=='boolean')throw new Error('Luce non valida.');
    return {enabled:t.enabled,color:color(t.color),x:number(t.x,[-12,12],'luce X'),y:number(t.y,[-12,12],'luce Y'),z:number(t.z,[-12,12],'luce Z'),power:number(t.power,[0,12],'potenza luce'),size:number(t.size,[.01,5],'dimensione luce'),orbit:motion(t.orbit,true),pulse:motion(t.pulse)};
  });
  out.motions={};
  for(const [key,t]of Object.entries(s.motions??{})){
    if(!Object.hasOwn(motionTargets,key))throw new Error('Animazione non supportata: '+key);
    out.motions[key]=motion(t);
  }
  return {...out,environment:s.environment,bgMode:s.bgMode,usePalette:s.usePalette,palette:s.palette.map(color),background:color(s.background),background2:color(s.background2),perfectLoop:true,sourceName:typeof s.sourceName==='string'?s.sourceName.slice(0,120):''};
}
export function samplePrisma(p,seconds){
  const phase=(((seconds/p.duration*(p.direction??1))%1+1)%1)*Math.PI*2;
  const s=sampleFrame(p.prisma??prismaDefaults(),phase);
  for(const [key,range]of Object.entries(prismaRanges)){
    if(key.startsWith('rotate'))s[key]=((s[key]%360)+360)%360;
    else if(key==='gradientOffset')s[key]=((s[key]%1)+1)%1;
    else s[key]=clamp(s[key],...range);
  }
  return s;
}
export function importPrismaProject(data,current){
  if(data?.prismaProject!==2||!data.state||typeof data.state!=='object')throw new Error('Scegli un progetto Prisma (.json).');
  const source=data.state,next=prismaDefaults(),notes=[];
  for(const [key,range]of Object.entries(prismaRanges))if(source[key]!==undefined){
    if(!Number.isFinite(source[key]))throw new Error('Valore Prisma non valido: '+key);
    next[key]=key==='gradientOffset'?((source[key]%1)+1)%1:clamp(source[key],...range);
  }
  next.lighting=1;next.pointSize=1.5;
  next.palette=source.palette??next.palette;next.usePalette=true;
  for(const key of ['background','background2'])if(source[key]!==undefined)next[key]=source[key];
  next.bgMode=['solid','gradient'].includes(source.bgMode)?source.bgMode:'solid';
  if(source.environment!==undefined&&environments.includes(source.environment))next.environment=source.environment;
  next.environmentPower=clamp(source.environmentPower??.7,0,3);
  if(Array.isArray(source.lights))next.lights=source.lights.slice(0,8).map((l,i)=>{
    const light={...newLight(i),...l};
    for(const key of ['orbit','pulse'])light[key]={...newMotion(),...l[key],cycles:clamp(Math.round(l[key]?.cycles??1),1,12)};
    return light;
  });
  next.motions={};
  for(const [key,t]of Object.entries(source.motions??{})){
    if(Object.hasOwn(motionTargets,key))next.motions[key]={...t,cycles:clamp(Math.round(t.cycles??1),1,12)};
    else if(t.enabled)notes.push('Animazione '+key);
  }
  if(source.transparency>0||source.refraction>1)notes.push('Rifrazione volumetrica');
  if(source.petalAmount||source.hollow||source.cut||source.hole)notes.push('Geometria solida, cavità e petali');
  if(source.subsurface||source.scattering||source.thinFilm)notes.push('Dispersione interna e film sottile');
  notes.push('Ombre e caustiche','Sagoma delle luci ad area');
  next.sourceName=String(data.name||'Progetto Prisma');
  // Use the project's framing once, avoiding duplicate rotations from Pathfinder's view.
  return {parameters:{...structuredClone(current),yaw:0,pitch:0,zoom:1,prisma:validatePrisma(next)},notes:[...new Set(notes)]};
}
