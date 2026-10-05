import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Renderer} from '/workspace/prisma-studio/dist/renderer.js';
const oldScheduler=globalThis.scheduler,oldTimeout=globalThis.setTimeout,oldPerformance=globalThis.performance;
let yielded=0,timers=0;
globalThis.scheduler={yield:async()=>{yielded++}};
globalThis.setTimeout=(fn)=>{timers++;queueMicrotask(fn);return 1};
for (const polls of [3,8]) {
 yielded=0;timers=0;let n=0;
 const receiver={completionSync:{},assertAvailable(){},pollCompletion(){if(++n>=polls){this.completionSync=null;return true}return false}};
 assert.equal(await Renderer.prototype.waitForGpu.call(receiver),true);
 assert.equal(yielded,Math.min(4,polls-1));assert.equal(timers,Math.max(0,polls-1-4));
 console.log({polls,yielded,timers});
}
yielded=0;timers=0;const cancelled={completionSync:{},assertAvailable(){},pollCompletion:()=>false};
assert.equal(await Renderer.prototype.waitForGpu.call(cancelled,{cancelled:()=>yielded===1}),false);assert.equal(yielded,1);assert.ok(cancelled.completionSync);assert.equal(timers,0);
globalThis.scheduler=undefined;let n=0;const fallback={completionSync:{},assertAvailable(){},pollCompletion(){if(++n===3){this.completionSync=null;return true}return false}};
assert.equal(await Renderer.prototype.waitForGpu.call(fallback),true);assert.equal(timers,2);
let queries=0;const profile={gl:{RENDERER:1,getExtension:()=>null,getParameter:()=>{queries++;return 'RTX hardware'},getContextAttributes:()=>({powerPreference:'high-performance'})}};
assert.equal(Renderer.prototype.hardwareInfo.call(profile),Renderer.prototype.hardwareInfo.call(profile));assert.equal(queries,1);
const source=JSON.parse(fs.readFileSync('/workspace/attachments/492ed12a-996c-4a9e-99b5-92ad3c43aa42/Pasted text.txt')).state;
let clock=0;Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});
for(const software of [true,false]){
 const boxes=[];let enabled=false;const receiver={hardwareInfo:()=>({software}),gl:{SCISSOR_TEST:1,enable(){enabled=true},disable(){enabled=false},scissor(...b){boxes.push(b)}},draw(){clock+=8},waitForGpu:async()=>true};
 assert.equal(await Renderer.prototype.drawTiled.call(receiver,source,0,1021,373),true);
 assert.equal(boxes[0][2],64);assert.equal(Math.max(...boxes.map(b=>b[2])),software?64:256);assert.equal(enabled,false);
 const pixels=new Uint8Array(1021*373);for(const [x,y,w,h] of boxes)for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels[j*1021+i]++;
 assert.ok(pixels.every(n=>n===1));console.log({software,tiles:boxes.length,first:boxes[0][2],max:Math.max(...boxes.map(b=>b[2]))});
}
globalThis.scheduler=oldScheduler;globalThis.setTimeout=oldTimeout;Object.defineProperty(globalThis,'performance',{value:oldPerformance,configurable:true});
console.log({cancel:'pass',fallback:'pass',hardwareCache:'pass'});
