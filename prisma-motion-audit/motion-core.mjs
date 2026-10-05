import assert from 'node:assert/strict';
import {sampleFrame,growthTable} from '/workspace/prisma-studio/dist/renderer.js';
import {newCreation,bloomExample,sculpt,motionPreset} from '/workspace/prisma-studio/dist/creative-model.js';
import {SHAPE_TRACKS} from '/workspace/prisma-studio/dist/studio-model.js';
const TAU=2*Math.PI;
for(const shape of [bloomExample(),sculpt(newCreation(),3)]){
 for(const key of ['petalBlend','petalRoot','petalRandom']){Object.assign(shape.motions[key],{enabled:true,amplitude:1});assert(SHAPE_TRACKS.includes(key));}
 const before=JSON.stringify(shape);let store;
 for(let i=0;i<=360;i++){
  const frame=sampleFrame(shape,i/360*TAU);
  for(const key of ['petalBlend','petalRoot','petalRandom'])assert(frame[key]>=0&&frame[key]<=1,key);
  const result=growthTable(frame,store);if(store){assert.equal(result.data,store.data);assert.equal(result.rowData,store.rowData);}
  assert(Array.from(result.data).every(Number.isFinite));assert(Number.isFinite(result.radiusBound));store=result;
 }
 assert.equal(JSON.stringify(shape),before,'Sampling must not modify the saved creation');
}
for(const name of ['breathe','reflect','film','orbit','wave','bloom','chromatic']){
 const s=motionPreset(newCreation(),name),a=sampleFrame(s,0),b=sampleFrame(s,TAU);
 for(const key of ['volume','deform','twist','waves','petalOpen','petalCurl','stemBend'])assert(Math.abs(a[key]-b[key])<1e-12,key);
 for(let i=0;i<a.lights.length;i++)for(const key of ['x','y','z','power'])assert(Math.abs(a.lights[i][key]-b.lights[i][key])<1e-10,key);
}
console.log('All motion presets close their loop; organic tracks stay bounded; buffers are reused; source stays unchanged.');
