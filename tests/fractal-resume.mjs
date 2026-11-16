import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);

// Batch size must affect scheduling only, including camera-inside and slow rays.
const fixture=JSON.parse(await readFile(new URL('../previews/mandelbulb-dettaglio.prisma.json',import.meta.url),'utf8')).state;
const server=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.route('**/__fractal-regression.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Fractal continuation regression</title>'}));
 await page.goto(server.url+'__fractal-regression.html');
 const result=await page.evaluate(async({url,fixture})=>{
  const {Renderer}=await import(url+'solid-renderer.js'),{normalizeCreation}=await import(url+'creative-model.js');
  let renderer=new Renderer(document.createElement('canvas'));
  const cases=[
   ['bulb-blend',{fractalKind:0,fractalAmount:.5}],
   ['menger-extreme',{fractalKind:1,fractalAmount:.8,fractalLevels:14,fractalDetail:0,deform:.3,twist:.8,waves:.15,waveScale:5}],
   ['menger-inside',{fractalKind:1,fractalAmount:1,scale:7}],
   ['box-sheet',{fractalKind:2,fractalAmount:.5,structFan:.35,structCurl:.3,structFlap:.1}],
  ],rows=[];
  const draw=async(state,budget,phase=.4,extra={})=>renderer.drawAccumulated(state,phase,160,120,{samples:1,preview:false,quality:'full',fractalHitBudget:budget,...extra});
  const capture=()=>{
   const g=renderer.gl,hits=new Float32Array(160*120*4);
   g.bindFramebuffer(g.READ_FRAMEBUFFER,renderer.implicitHit.framebuffer);g.readBuffer(g.COLOR_ATTACHMENT0);g.readPixels(0,0,160,120,g.RGBA,g.FLOAT,hits);g.bindFramebuffer(g.READ_FRAMEBUFFER,null);
   return {pixels:renderer.pixels(),hits,gl:g.getError(),complete:!renderer.fractalContinuationStats.at(-1)?.pending};
  };
  const maxDifference=(a,b)=>a.reduce((m,v,i)=>Math.max(m,Math.abs(v-b[i])),0);
  try {
   for(const [name,patch] of cases){
    const state=normalizeCreation({...fixture,scale:1.7,filLength:0,...patch});
    if(!await draw(state,4096))throw Error('Baseline interrupted: '+name);const a=capture();
    if(!await draw(state,512))throw Error('Small batch interrupted: '+name);const b=capture();
    rows.push({name,imageMax:maxDifference(a.pixels,b.pixels),hitMax:maxDifference(a.hits,b.hits),complete:a.complete&&b.complete,gl:a.gl||b.gl});
   }
   const state=normalizeCreation({...fixture,filLength:0,...cases[1][1]});
   await draw(state,512);const reference=renderer.pixels(),status=renderer.implicitRayStatus,original=status.pendingAsync;let entered=false;
   status.pendingAsync=async function(...args){entered=true;return original.apply(this,args);};
   const start=performance.now(),cancelled=!await draw(state,512,.7,{cancelled:()=>entered}),cancelMs=performance.now()-start;
   status.pendingAsync=original;
   const g=renderer.gl,queryReleased=g.getQuery(g.ANY_SAMPLES_PASSED,g.CURRENT_QUERY)===null;
   await draw(state,512);const restoreMax=maxDifference(reference,renderer.pixels()),gl=g.getError();
   renderer.dispose();renderer=new Renderer(document.createElement('canvas'));await draw(state,512);
   return {rows,lifecycle:{entered,cancelled,cancelMs,queryReleased,restoreMax,recreateMax:maxDifference(reference,renderer.pixels()),gl,recreatedGl:renderer.gl.getError()}};
  } finally {renderer.dispose();}
 },{url:server.url,fixture});
 assert(result.rows.every(x=>x.imageMax===0&&x.hitMax===0&&x.complete&&x.gl===0));
 const life=result.lifecycle;
 assert(life.entered&&life.cancelled&&life.queryReleased);
 assert(life.restoreMax===0&&life.recreateMax===0&&life.gl===0&&life.recreatedGl===0);
 console.log(JSON.stringify({passed:true,...result},null,2));
} finally {
 await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));
}
