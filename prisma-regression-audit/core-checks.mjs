import assert from 'node:assert/strict';
import {PreviewQuality} from '../prisma-studio/dist/preview-quality.js';
import {RenderSession} from '../prisma-studio/dist/render-session.js';
import {sampleFrame,growthTable,fieldAt} from '../prisma-studio/dist/renderer.js';
import {newCreation,sculpt,normalizeCreation} from '../prisma-studio/dist/creative-model.js';
const q=new PreviewQuality(),initial=q.limit;
assert.equal(q.refinementSamples(),1);
q.observe(1400,1600,{gpu:true});assert(q.limit<initial*.5);assert.equal(q.refinementSamples(),1);
for(let i=1;i<20;i++)q.observe(1400,1600+i*200,{gpu:true});assert.equal(q.limit,q.profile.min);
q.setMode('auto');for(let i=1;i<400;i++)q.observe(4,i*200,{gpu:true});assert.equal(q.limit,q.profile.max);assert.equal(q.refinementSamples(),2);
q.recover();assert(q.limit<=192);assert.equal(q.refinementSamples(),1);
const prior=q.limit;for(const ms of [NaN,-1,Infinity,0])q.observe(ms,50000);assert.equal(q.limit,prior);
assert.deepEqual(q.size(1080,1920,2,true),[108,192]);
const saved=new Map([['prisma-current-v2','saved creation'],['prisma-favorites-v2','saved favorites']]);
const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
let session=new RenderSession(storage);assert.equal(session.blocked,false);session.begin();session=new RenderSession(storage);assert.equal(session.blocked,true);session.begin();session.complete();assert.equal(new RenderSession(storage).blocked,false);assert.equal(saved.get('prisma-current-v2'),'saved creation');assert.equal(saved.get('prisma-favorites-v2'),'saved favorites');
// Test saved seeds and exact periodic growth data independently of the renderer.
for(const i of [1,2,3]){const s=sculpt(newCreation(),i),restored=normalizeCreation(JSON.parse(JSON.stringify(s)));assert.deepEqual(growthTable(restored).data,growthTable(s).data);const t=structuredClone(s);t.petalPhase+=360;assert.deepEqual(growthTable(t).data,growthTable(s).data);for(const point of [[0,0,0],[.5,.2,.1],[-.8,.4,.2]])assert.equal(fieldAt(restored,point),fieldAt(s,point));s.motions.petalCurl={enabled:true,mode:'wave',amplitude:.2,cycles:1,phase:0,direction:1};const a=sampleFrame(s,0),b=sampleFrame(s,Math.PI*2);assert(Math.abs(a.petalCurl-b.petalCurl)<1e-12);}
console.log('PASS: severe stalls, measured refinement, recovery, aspect ratio, preserved projects/gallery, seeds and loop continuity');
