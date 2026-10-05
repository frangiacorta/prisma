import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fieldAt,sampleFrame} from '/workspace/prisma-studio/dist/renderer.js';
import {fieldAt as oldFieldAt} from './renderer-before.js';
import {newCreation,sculpt,motionPreset,normalizeCreation,SCULPT_EXAMPLES,MOTION_PRESETS} from '/workspace/prisma-studio/dist/creative-model.js';
import {META,GROUPS} from '/workspace/prisma-studio/dist/model.js';
import {SHAPE_TRACKS} from '/workspace/prisma-studio/dist/studio-model.js';
const directory='/workspace/prisma-roots-audit/',TAU=Math.PI*2;
const keys=['petalGrowth','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder'];
const oldCases=JSON.parse(fs.readFileSync(directory+'old-states.json'));
const result={compatibility:[],presets:[],motions:[]};
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const {name,state} of oldCases){
 for(const key of keys)delete state[key];
 const normalized=normalizeCreation(state);
 for(const key of keys){assert.equal(normalized[key],key==='petalGrowth'?1:0,`${name}: missing ${key} default`);assert(GROUPS.shape.includes(key),`${key} must be saved/randomized in shape group`);assert(SHAPE_TRACKS.includes(key),`${key} has independent motion`);}
 let maxDifference=0;
 for(let i=0;i<400;i++){
  const point=Array.from({length:3},()=>random()*5-2.5);
  const a=fieldAt(state,point),b=oldFieldAt(state,point);assert(Number.isFinite(a)&&Number.isFinite(b),name);maxDifference=Math.max(maxDifference,Math.abs(a-b));
 }
 assert(maxDifference<1e-12,`${name} old fields changed by ${maxDifference}`);
 result.compatibility.push({name,points:400,maxDifference});
}
for(const [index,name] of [[4,'Radici'],[5,'Corde'],[6,'Rigonfiamenti'],[7,'Radici intrecciate']]){
 assert.equal(SCULPT_EXAMPLES[index].name,name);
 const state=sculpt(newCreation(),index);state.rotateX=state.rotateY=state.rotateZ=0;const before=JSON.stringify(state);
 for(const key of keys){assert(Number.isFinite(state[key]),name+' '+key);assert(state[key]>=META[key][1]&&state[key]<=META[key][2],name+' range '+key);}
 let inside=0,outside=0;
 for(let i=0;i<800;i++){
  const point=Array.from({length:3},()=>random()*5-2.5),d=fieldAt(state,point);assert(Number.isFinite(d),name+' finite field');if(d<0)inside++;else outside++;
 }
 assert(inside>0&&outside>0,name+' occupies nonempty bounded volume');
 assert(fieldAt(state,[0,0,0])<0,name+' center connected body');
 const hidden={...state,petalGrowth:0};
 const distances=Array.from({length:120},(_,i)=>{const y=1-2*(i+.5)/120,phi=i*2.399963229728653,r=Math.sqrt(1-y*y);return fieldAt(hidden,[r*1.5*Math.cos(phi),y*1.5,r*1.5*Math.sin(phi)]);});
 const radialVariation=Math.max(...distances)-Math.min(...distances);assert(radialVariation<.04,name+' fully hidden tips leave round body '+radialVariation);
 assert.equal(JSON.stringify(state),before,'fieldAt must not mutate source');
 const normalized=normalizeCreation(JSON.parse(before));for(const key of keys)assert.equal(normalized[key],state[key]);
 result.presets.push({name,inside,outside,radialVariation});
}
for(const key of ['emerge','wrap','roots']){
 assert(MOTION_PRESETS.some(m=>m[0]===key),'preset '+key);
 const state=motionPreset(sculpt(newCreation(),4),key),before=JSON.stringify(state),a=sampleFrame(state,0),b=sampleFrame(state,TAU);let minGrowth=1,maxGrowth=0;
 for(const property of keys)assert(Math.abs(a[property]-b[property])<1e-12,key+' loop closure '+property);
 for(let i=0;i<=180;i++){
  const frame=sampleFrame(state,i/180*TAU);minGrowth=Math.min(minGrowth,frame.petalGrowth);maxGrowth=Math.max(maxGrowth,frame.petalGrowth);
  for(const property of keys)assert(Number.isFinite(frame[property])&&frame[property]>=META[property][1]&&frame[property]<=META[property][2],key+' finite bounded '+property);
 }
 assert.equal(JSON.stringify(state),before,key+' source immutability');
 if(key==='emerge')assert(minGrowth<.01&&maxGrowth>.99,'Emerge must really disappear and fully regrow');
 result.motions.push({key,minGrowth,maxGrowth});
}
const extremes=sculpt(newCreation(),4);for(const key of keys){extremes[key]=META[key][1];Object.assign(extremes.motions[key],{enabled:true,amplitude:20,phase:0});}
for(let i=0;i<48;i++){const s=sampleFrame(extremes,i/48*TAU);for(const key of keys)assert(s[key]>=META[key][1]&&s[key]<=META[key][2],`clamp ${key}`);}
fs.writeFileSync(directory+'roots-core-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));console.log('CORE DEFAULT COMPATIBILITY, ROOT FIELDS, ROUND GROWTH ZERO, SERIALIZATION AND MOTION LOOPS PASS');
