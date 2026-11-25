import assert from 'node:assert/strict';
import {freezeGrainMotion,grainFrame} from '../body-layers.js';
import {newCreation,normalizeCreation} from '../creative-model.js';
import {motionPointOffset,normalizeMotionPoints} from '../motion-keyframes.js';
import {presetDocument,readPreset} from '../preset-files.js';
import {sampleFrame} from '../solid-renderer.js';

const TAU = 2*Math.PI;
const circularDifference = (a,b) => Math.abs(((a-b+540)%360)-180);
const track = (...points) => ({enabled:true,mode:'points',points:points.map(([at,offset])=>({at,offset}))});
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-7, `${a} != ${b}`);

const points=normalizeMotionPoints([
 {at:.81,offset:1.2},{at:.18,offset:0},{at:.46,offset:.6},
 {at:.46,offset:1.01},{at:1,offset:1.4},{at:NaN,offset:2}
],['',0,1,.01]);
assert.deepEqual(points,[{at:.18,offset:0},{at:.46,offset:1},{at:.81,offset:1}]);
for(const {at,offset} of points)near(motionPointOffset(points,at),offset);
for(let i=-200;i<200;i++){
 const value=motionPointOffset(points,i/100);
 assert.ok(value>=0&&value<=1);
 near(value,motionPointOffset(points,i/100+1));
}
// A later time can keep turning in the same direction across the slider's ±180° boundary.
const rotation=track([0,0],[.25,90],[.5,180],[.75,-90]);
assert.equal(circularDifference(motionPointOffset(rotation.points,.62,true),223.2)<1e-8,true);
const initial=newCreation();
initial.motions={...initial.motions,rotateZ:rotation,pBreath:track([0,0],[.5,.61]),pSignal:track([0,0],[.5,.45]),scale:track([0,0],[.5,1.15]),exposure:track([0,0],[.5,.42])};
initial.motions.focusTilt=track([0,-13.5],[.5,21]);
for(const engine of ['solid','particles']){
 const state=normalizeCreation({...initial,engine});
 const reopened=readPreset(JSON.stringify(presetDocument({state,name:'Ricircolo'}))).state;
 assert.deepEqual(reopened.motions,state.motions);
 const start=sampleFrame(state,0),mid=sampleFrame(state,TAU/2),end=sampleFrame(state,TAU);
 near(start.focusTilt,-13.5);near(mid.focusTilt,21);near(end.focusTilt,-13.5);
 for(const key of ['rotateZ','pBreath','pSignal','scale','exposure']){
  if(key==='rotateZ')near(circularDifference(start[key],end[key]),0);else near(start[key],end[key]);
  assert.notEqual(start[key],mid[key],key);
 }
 freezeGrainMotion(state,0);
 const held=grainFrame(state,TAU/2,sampleFrame);
 near(held.pBreath,start.pBreath);near(held.pSignal,start.pSignal);
 near(held.scale,mid.scale);near(held.exposure,mid.exposure);
}
const legacy=normalizeCreation({...newCreation(),motions:{scale:{enabled:true,mode:'wave',amplitude:.2}}});
near(sampleFrame(legacy,TAU/4).scale,legacy.scale+.2*legacy.motion/.3);
for(const engine of ['solid','particles']){
 const scene=newCreation();scene.engine=engine;scene.motion=0;
 const light=scene.lights[0];Object.assign(light,{x:1,y:2,z:3});
 for(const [axis,expected] of [['x',[1,-3,2]],['y',[-3,2,1]],['z',[-2,1,3]]]){
  light.orbit={...light.orbit,...track([.25,90],[.75,-90],[0,0]),axis};
  const state=readPreset(JSON.stringify(presetDocument({state:scene,name:'Orbita'}))).state;
  assert.deepEqual(state.lights[0].orbit.points.map(p=>p.at),[0,.25,.75]);
  const frame=sampleFrame(state,TAU/4),end=sampleFrame(state,TAU);
  for(const [i,k] of ['x','y','z'].entries()){
   near(frame.lights[0][k],expected[i]);near(end.lights[0][k],light[k]);
  }
  assert.deepEqual(frame.lights.slice(1),state.lights.slice(1));
  state.lights[0].orbit.enabled=false;
  near(sampleFrame(state,TAU/4).lights[0].x,light.x);
 }
 light.orbit.points=[{at:.3,offset:1000},{at:.3,offset:6},{at:1,offset:10}];
 const normalized=normalizeCreation(scene).lights[0].orbit;
 assert.equal(normalized.mode,'wave');assert.equal(normalized.points,undefined);
}
console.log('Punti nel tempo, rotazione continua, riapertura preset e pausa dei granelli verificati.');
