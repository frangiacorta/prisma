import assert from 'node:assert/strict';
import {preset,META,GROUPS,randomize} from '/workspace/prisma-studio/dist/model.js';
import {EXTRA_BASE,SHAPE_TRACKS,TRACK_META} from '/workspace/prisma-studio/dist/studio-model.js';
import {newCreation,normalizeCreation,sculpt,similar,motionPreset,SCULPT_EXAMPLES,MOTION_PRESETS} from '/workspace/prisma-studio/dist/creative-model.js';
import {buildPanel} from '/workspace/prisma-studio/dist/panels.js';
const keys=['petalGrowth','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder'];
for(let i=0;i<6;i++){
 const old=preset(i);for(const k of keys){delete old[k];delete old.motions[k];}
 const restored=normalizeCreation(old);
 for(const k of keys){assert.equal(restored[k],k==='petalGrowth'?1:0);assert.equal(restored.motions[k].enabled,false);}
}
const s=newCreation();
for(const k of keys){assert(META[k]&&TRACK_META[k]);assert(GROUPS.shape.includes(k)&&SHAPE_TRACKS.includes(k));}
for(let i=4;i<SCULPT_EXAMPLES.length;i++){
 const base=structuredClone(s),material=Object.fromEntries(GROUPS.material.map(k=>[k,base[k]]));sculpt(base,i);
 assert.deepEqual(Object.fromEntries(GROUPS.material.map(k=>[k,base[k]])),material);
 assert(base.petalCount*base.petalRows<=40);
 for(const [k,m] of Object.entries(META)){assert(Number.isFinite(base[k]),k);assert(base[k]>=m[1]&&base[k]<=m[2],`${i}:${k} out of range`);}
 const restored=normalizeCreation(JSON.parse(JSON.stringify(base)));
 for(const k of keys)assert.equal(restored[k],base[k]);
 for(const variant of similar(base,818,8))for(const k of keys)assert(Number.isFinite(variant[k])&&variant[k]>=META[k][1]&&variant[k]<=META[k][2]);
}
const malformed={...s,petalGrowth:-5,petalCoil:-5,petalKnots:500,petalWander:NaN};
const safe=normalizeCreation(malformed);assert.equal(safe.petalGrowth,0);assert.equal(safe.petalCoil,-1);assert.equal(safe.petalKnots,1);assert.equal(safe.petalWander,0);
for(const id of ['emerge','wrap','roots']){
 const q=newCreation();q.deform=.13;const before=Object.fromEntries(GROUPS.material.map(k=>[k,q[k]]));motionPreset(q,id);
 assert(MOTION_PRESETS.some(([k])=>k===id));assert(q.petalAmount>0);assert.equal(q.deform,.13);assert.deepEqual(Object.fromEntries(GROUPS.material.map(k=>[k,q[k]])),before);
 assert.equal(q.duration,12);assert.equal(q.motion,.3);
 const roundTrip=normalizeCreation(JSON.parse(JSON.stringify(q)));for(const k of keys)assert.deepEqual(roundTrip.motions[k],q.motions[k]);
 if(id!=='wrap'){const t=q.motions.petalGrowth;const value=p=>q.petalGrowth+Math.sin(p+t.phase*Math.PI/180)*t.amplitude;assert(Math.abs(value(0))<1e-12);assert(Math.abs(value(Math.PI)-1)<1e-12);assert(Math.abs(value(Math.PI*2))<1e-12);}
}
const ui={slider:k=>`[slider:${k}]`,section:(name,body)=>body,details:(name,body)=>body,colorField:()=>'',check:()=>'',icon:()=>''};
const shapeHTML=buildPanel('shape',s,ui,1),motionHTML=buildPanel('motion',s,ui,1);
for(const k of keys){assert(shapeHTML.includes(`[slider:${k}]`));assert(motionHTML.includes(`motions.${k}.enabled`));}
for(const k of ['petalBlend','petalRoot','petalRandom'])assert(motionHTML.includes(`motions.${k}.enabled`));
const random=randomize(s,29,.7,'shape',{});for(const k of keys)assert(Number.isFinite(random[k]));
console.log(JSON.stringify({passed:true,newControls:keys.length,newShapeExamples:SCULPT_EXAMPLES.slice(4).map(q=>q.name),newMotionPresets:['emerge','wrap','roots'],legacyDefaults:true,shapeMaterialPreservation:true,roundTrip:true,panelCoverage:true}));
