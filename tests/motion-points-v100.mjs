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
for(const engine of ['solid','particles']){
 const state=normalizeCreation({...initial,engine});
 const reopened=readPreset(JSON.stringify(presetDocument({state,name:'Ricircolo'}))).state;
 assert.deepEqual(reopened.motions,state.motions);
 const start=sampleFrame(state,0),mid=sampleFrame(state,TAU/2),end=sampleFrame(state,TAU);
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
console.log('Punti nel tempo, rotazione continua, riapertura preset e pausa dei granelli verificati.');
