import assert from 'node:assert/strict';
import {PreviewQuality,PREVIEW_MODES} from '../prisma-studio/dist/preview-quality.js';
const q=new PreviewQuality('fluid'),initial=q.limit;
for(const flag of [{warmup:true},{preparing:true},{refining:true},{interactive:false},{settled:true}]){
 for(let i=0;i<6;i++)q.observe(15000,i*200,{gpu:true,...flag});
 assert.equal(q.limit,initial);
}
q.observe(12000,200,{gpu:true});assert.equal(q.limit,initial,'First GPU pipeline draw does not shrink interactive resolution');
q.observe(5000,400,{gpu:true});assert.equal(q.limit,initial,'One isolated compilation/OS stall does not shrink');
for(let i=0;i<10;i++)q.observe(8,600+i*200,{gpu:true});assert.equal(q.limit,initial,'A one-off stall does not poison later EWMA');
for(let i=0;i<20;i++)q.observe(120,3000+i*200,{gpu:true});assert.equal(q.limit,q.profile.min,'Sustained expensive animation still downscales');
assert.deepEqual(q.size(1920,1080,2,true),[144,81]);
const before=q.limit,plan=q.idlePlan(1920,1080,2);assert.equal(q.limit,before);assert.deepEqual([plan.width,plan.height],[640,360]);assert.equal(plan.forceTiled,true);assert.equal(plan.tileSize,64);assert.equal(plan.trackTiming,false);assert.equal(plan.samples,2);
for(let i=0;i<60;i++)q.observe(500,9000+i*200,{gpu:true,interactive:false});assert.equal(q.limit,before,'Static pixels never feed back into interactive adaptation');
for(let i=0;i<500;i++)q.observe(3,30000+i*200,{gpu:true});assert(q.limit>initial);assert(q.limit<=q.profile.max);
q.recover();assert(q.limit<=192);assert.equal(q.idlePlan(1920,1080,2).width,640);
for(const [mode,profile] of Object.entries(PREVIEW_MODES)){
 const quality=new PreviewQuality(mode),idle=quality.idlePlan(1920,1080,2);assert.equal(idle.width,profile.still);assert(Math.abs(idle.width/idle.height-16/9)<.005);assert(idle.samples>=2);assert.equal(quality.size(1920,1080,2,true)[0],Math.min(profile.initial,profile.moving));assert(quality.idlePlan(300,600,2).height<=profile.still);
}
console.log('PASS: startup outliers, persistent slow motion, fixed readable paused resolution, tile bounds, recovery, aspect ratios and independent budgets');
