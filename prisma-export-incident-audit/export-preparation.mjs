import assert from 'node:assert/strict';
import {Renderer} from '/workspace/prisma-studio/dist/renderer.js';
const realNow=Date.now,realTimeout=globalThis.setTimeout;let now=0;
Date.now=()=>now;globalThis.setTimeout=resolve=>{now+=60000;queueMicrotask(resolve);};
try{
 let calls=0,stages=[],checks=0;
 const healthy={assertAvailable(){checks++;},prepare(){return ++calls===5;}};
 assert.equal(await Renderer.prototype.prepareAsync.call(healthy,{},0,{onStage:s=>stages.push(s)}),true);
 assert.equal(now,240000);assert.equal(checks,5);assert.deepEqual(stages,['preparing','preparing-slow','rendering']);
 calls=0;now=0;stages=[];
 const cancelled={assertAvailable(){},prepare(){calls++;return false;}};
 assert.equal(await Renderer.prototype.prepareAsync.call(cancelled,{},0,{cancelled:()=>calls>=2,onStage:s=>stages.push(s)}),false);
 assert.equal(calls,2);assert.ok(!stages.includes('rendering'));
 await assert.rejects(Renderer.prototype.prepareAsync.call({assertAvailable(){throw Error('context lost');},prepare(){throw Error('should not run');}},{}),/context lost/);
 console.log('PASS: compilation can finish after 4 minutes; one slow-stage notice; responsive cancellation; context loss reported. Simulated time, no GPU.');
}finally{Date.now=realNow;globalThis.setTimeout=realTimeout;}
