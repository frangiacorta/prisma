import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rootGeometry,sampleFrame} from '/workspace/prisma-studio/dist/renderer.js';
import {newCreation,sculpt,motionPreset} from '/workspace/prisma-studio/dist/creative-model.js';
const results=[];
for(const index of [4,5,6,7]){
 const state=motionPreset(sculpt(newCreation(),index),'roots');state.petalCount=24;state.petalRows=8;state.petalKnots=1;state.petalRidges=1;state.petalDisorder=1;state.petalCoil=1;state.petalWander=1;state.petalReentry=1;
 let storage,original,maximumRadius=0,ms=[];
 for(let i=0;i<120;i++){
  const sampled=sampleFrame(state,i/60*Math.PI*2);const begin=performance.now();storage=rootGeometry(sampled,storage);ms.push(performance.now()-begin);
  if(!original)original={segments:storage.segments,data:storage.data,order:storage.order,right:storage.right,leaf:storage.leaf};
  for(const [key,value] of Object.entries(original))assert.equal(storage[key],value,key+' array must be reused');
  assert.equal(storage.builds,1,'Do not rebuild topology during loop');
  assert(storage.count*8<=storage.segments.length&&storage.nodeCount*16<=storage.data.length,'No texture/buffer overflow');
  for(let j=0;j<storage.count;j++){
   const q=j*8,s=storage.segments;
   for(let n=0;n<8;n++)assert(Number.isFinite(s[q+n]),'Finite cone data');
   const bound=Math.max(Math.hypot(s[q],s[q+1],s[q+2])+s[q+3],Math.hypot(s[q+4],s[q+5],s[q+6])+s[q+7]);
   maximumRadius=Math.max(maximumRadius,bound);assert(bound<=storage.radiusBound+1e-5,'Bounds enclose roots');
  }
  for(let n=0;n<storage.nodeCount;n++){
   const d=storage.data,q=n*16;for(let k=0;k<16;k++)assert(Number.isFinite(d[q+k]),'Finite BVH');
   assert(d[q+3]>n&&d[q+3]<=storage.nodeCount,'Escape index progresses within tree');
   for(let k=0;k<3;k++)assert(d[q+k]<=d[q+4+k],'valid AABB');
   if(storage.leaf[n]<0)for(const child of [n+1,storage.right[n]])for(let k=0;k<3;k++){assert(d[q+k]<=d[child*16+k]+1e-6);assert(d[q+4+k]>=d[child*16+4+k]-1e-6);}
  }
 }
 results.push({index,frames:120,roots:storage.roots,segments:storage.count,nodes:storage.nodeCount,builds:storage.builds,refits:storage.refits,maximumRadius,meanMs:ms.reduce((a,b)=>a+b)/ms.length,maxMs:Math.max(...ms)});
}
fs.writeFileSync('/workspace/prisma-roots-audit/roots-bvh-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));console.log('MAXIMUM ROOT COUNTS: BUFFERS REUSED, FINITE BVH, ENCLOSED CONES AND ONE BUILD PER LOOP PASS');
