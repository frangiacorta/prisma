import assert from 'node:assert/strict';
import {grainPhaseRadians,grainFrame,setGrainMotion,freezeGrainMotion,resumeGrainMotion} from '../body-layers.js';
import {newCreation,normalizeCreation} from '../creative-model.js';
import {sampleFrame} from '../solid-renderer.js';
import {presetDocument,readPreset} from '../preset-files.js';
import {animationPhase} from '../animation-clock.js';

// CPU contract only. Renderer bindings and sample texture stability are covered
// by separate GPU integration checks, not inferred from these clock assertions.
const TAU=Math.PI*2,rows=[];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const check=(name,fn)=>{fn();rows.push({name,passed:true});};
const reopen=s=>readPreset(JSON.stringify(presetDocument({state:s,name:'Shared grain clock'}))).state;
check('Legacy/default clock is exact for all origins, representations and directions',()=>{
 for(const engine of ['solid','particles'])for(const source of [undefined,'cloud','body'])for(const mix of [0,.5,1])for(const pDirection of [-1,1]){
  const s={engine,grainSource:source,sceneGrains:mix,pDirection,pCycles:1.5};
  for(const p of [-TAU,0,.00001,.7,TAU,8.7*TAU])assert.equal(grainPhaseRadians(s,p),p);
  const n=normalizeCreation({...newCreation(),...s});assert.equal(n.grainMotion,true);assert.equal(n.grainMotionPhase,0);assert.equal(n.grainMotionOffset,0);
 }
});
check('Freeze captures current time before direction/cycles and never falls back to zero',()=>{
 for(const pDirection of [-1,1])for(const pCycles of [.3,1,2.7]){
  const s={...newCreation(),pDirection,pCycles,perfectLoop:false};
  const at=7.37*TAU,before=grainPhaseRadians(s,at);freezeGrainMotion(s,at);
  near(s.grainMotionPhase,7.37);assert.equal(s.grainMotion,false);
  for(const now of [0,.5,2,13].map(x=>x*TAU)){
   near(grainPhaseRadians(s,now),before);
   near(grainPhaseRadians(s,now)*pDirection*pCycles,before*pDirection*pCycles);
  }
 }
});
check('Resume is continuous after arbitrary scene seeks and repeated toggles',()=>{
 const s=newCreation();let current=.3*TAU;
 for(let i=0;i<12;i++){
  const before=grainPhaseRadians(s,current);freezeGrainMotion(s,current);
  const frozen=structuredClone(s);freezeGrainMotion(s,current+TAU);assert.deepEqual(s,frozen);
  current=(i%2?-2.4:8.7)*TAU;resumeGrainMotion(s,current);
  near(grainPhaseRadians(s,current),before);
  near(grainPhaseRadians(s,current+.2),before+.2);
  const playing=structuredClone(s);resumeGrainMotion(s,current+1);assert.deepEqual(s,playing);
  current+=.37;
 }
});
check('Frozen/resumed presets preserve time and common scene data',()=>{
 const s=normalizeCreation({...newCreation(),grainSource:'body',sceneGrains:.6,palette:['#124578'],duration:20,motionPeriod:8,keepMotionSpeed:true,pDirection:-1});
 const before=structuredClone(s),phase=animationPhase(s,.6*TAU);
 freezeGrainMotion(s,phase);const opened=reopen(s);near(grainPhaseRadians(opened,0),phase);
 for(const k of Object.keys(before))if(!k.startsWith('grainMotion'))assert.deepEqual(s[k],before[k],k);
 resumeGrainMotion(opened,animationPhase(opened,.1*TAU));const again=reopen(opened);
 near(grainPhaseRadians(again,animationPhase(again,.1*TAU)),phase);
 assert.deepEqual(reopen(again),again);
});
check('grainFrame holds internal tracks while shared pose, material and mix advance',()=>{
 const s=newCreation();s.pOpening=.5;s.pFill=.5;s.sceneGrains=.5;
 for(const key of ['pOpening','pFill','rotateY','roughness','sceneGrains'])s.motions[key]={...s.motions[key],enabled:true,mode:'wave',amplitude:.1,cycles:1,phase:0};
 s.lights[0].pulse.enabled=true;s.lights[0].pulse.amplitude=.2;
 s._dynamics={sentinel:17};freezeGrainMotion(s,.43);
 const old=structuredClone(s),now=1.52,frame=grainFrame(s,now,sampleFrame),common=sampleFrame(s,now),held=sampleFrame(s,.43);
 near(frame.pOpening,held.pOpening);near(frame.pFill,held.pFill);assert.notEqual(frame.pOpening,common.pOpening);
 for(const key of ['rotateY','roughness','sceneGrains','lights','palette','_dynamics'])assert.deepEqual(frame[key],common[key],key);
 assert.deepEqual(s,old); // Neither sample operation mutates the creation.
 resumeGrainMotion(s,now);near(grainFrame(s,now,sampleFrame).pOpening,held.pOpening);
});
check('Invalid toggle input cannot silently reset a valid clock',()=>{
 const s=newCreation(),old=structuredClone(s);
 assert.throws(()=>freezeGrainMotion(s,NaN),TypeError);assert.throws(()=>resumeGrainMotion(s,Infinity),TypeError);
 assert.throws(()=>setGrainMotion(s,'false',1),TypeError);assert.deepEqual(s,old);
 const n=normalizeCreation({...s,grainMotion:false,grainMotionPhase:NaN,grainMotionOffset:Infinity});
 assert.equal(n.grainMotionPhase,0);assert.equal(n.grainMotionOffset,0);
});
console.log(JSON.stringify({passed:true,scope:'CPU grain clock/state invariants; no GPU used',tests:rows},null,2));
