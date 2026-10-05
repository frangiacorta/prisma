import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Renderer} from '/workspace/prisma-studio/dist/renderer.js';
const state=JSON.parse(fs.readFileSync('/workspace/attachments/492ed12a-996c-4a9e-99b5-92ad3c43aa42/Pasted text.txt')).state;
const originalPerformance=globalThis.performance;
let clock=0;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
for (const preview of [false,true]) {
 const width=193,height=117,pixels=new Uint8Array(width*height),progress=[];let box,enabled=false,draws=0;
 const receiver={hardwareInfo:()=>({software:true}),gl:{SCISSOR_TEST:1,enable:()=>enabled=true,disable:()=>enabled=false,scissor:(...b)=>box=b},draw(){assert.ok(enabled);draws++;clock+=draws%3===1?180:8;const [x,y,w,h]=box;for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels[j*width+i]++;},waitForGpu:async()=>true};
 assert.equal(await Renderer.prototype.drawTiled.call(receiver,state,0,width,height,{preview,forceTiled:preview,tileSize:64,tileProgress:p=>progress.push(p)}),true);
 assert.ok(pixels.every(n=>n===1),'every destination pixel covered once');assert.equal(enabled,false);assert.equal(progress.at(-1),1);assert.ok(progress.every((p,i)=>!i||p>progress[i-1]));
 console.log({preview,draws,pixels:pixels.length,complete:true});
}
let enabled=false,draws=0;const receiver={hardwareInfo:()=>({software:true}),gl:{SCISSOR_TEST:1,enable:()=>enabled=true,disable:()=>enabled=false,scissor(){}},draw(){draws++},waitForGpu:async()=>true};
assert.equal(await Renderer.prototype.drawTiled.call(receiver,state,0,193,117,{tileSize:64,cancelled:()=>draws>=3}),false);assert.equal(draws,3);assert.equal(enabled,false);
Object.defineProperty(globalThis,'performance',{value:originalPerformance,configurable:true});console.log({cancelled:true,scissorRestored:true});
