import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);

const fixture=async name=>JSON.parse(await readFile(new URL('../previews/'+name+'.prisma.json',import.meta.url),'utf8')).state;
const lamella=await fixture('lamelle-asimmetriche');
const hair={...await fixture('filamenti-macro'),transparency:.7,scale:1.3,positionX:0,positionY:0,rotateX:0,rotateY:0,rotateZ:0,filLength:.22,filCore:1,filCount:1500,filWidth:.01,structCoreDark:1,structCoreRadius:.6,focusBlur:0,motions:{}};
const service=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
const timer=setTimeout(()=>browser.close().catch(()=>{}),120000);
try{
 const page=await browser.newPage();
 await page.route('**/__core-contract.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Core material regression</title>'}));
 await page.goto(service.url+'__core-contract.html');
 const result=await page.evaluate(async({base,lamella,hair})=>{
  const {Renderer}=await import(base+'renderer.js'),{normalizeCreation}=await import(base+'creative-model.js');
  const r=new Renderer(document.createElement('canvas')),rows=[];
  const diff=(a,b)=>{let max=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);sum+=d;}return {max,mean:sum/a.length};};
  const draw=async(s,phase)=>{if(!await r.drawAccumulated(s,phase,192,192,{samples:2,preview:false,quality:'full'}))throw Error('Interrupted');if(r.gl.getError())throw Error('GL');return r.pixels();};
  try{
   for(const [name,raw] of [['lamella',lamella],['transparent-export',{...lamella,bgMode:'transparent'}],['hair',hair],['mixed-grains',{...lamella,sceneGrains:.5,pCount:1200,pSize:3,pTrailCount:0,pLinks:0}]]){
    const s=normalizeCreation(raw),first=await draw({...s,structCoreDark:0},0),dark=await draw({...s,structCoreDark:1},0),restored=await draw({...s,structCoreDark:0},0);
    const start=await draw({...s,structCoreDark:1},0),end=await draw({...s,structCoreDark:1},Math.PI*2);
    const solid=r.kind==='solid'?r.impl:r.implementations?.solid,g=r.gl,buffers=solid?.implicitBuffers;
    let finite=true,throughRange=true,readGl=0;
    if(buffers)for(const bank of buffers.banks)for(let attachment=0;attachment<2;attachment++){
     g.bindFramebuffer(g.READ_FRAMEBUFFER,bank.framebuffer);g.readBuffer(g.COLOR_ATTACHMENT0+attachment);
     const p=new Float32Array(buffers.width*buffers.height*4);g.readPixels(0,0,buffers.width,buffers.height,g.RGBA,g.FLOAT,p);
     for(let i=0;i<p.length;i++)if(i%4!==3){finite&&=Number.isFinite(p[i]);if(attachment===1)throughRange&&=p[i]>=0&&p[i]<=1.001;}
     readGl|=g.getError();
    }
    g.bindFramebuffer(g.READ_FRAMEBUFFER,null);
    let clear=0,partial=0;for(let i=3;i<dark.length;i+=4){clear+=dark[i]===0;partial+=dark[i]>0&&dark[i]<255;}
    rows.push({name,change:diff(first,dark),restored:diff(first,restored),seam:diff(start,end),finite,throughRange,readGl,clear,partial});
   }
   return rows;
  }finally{r.dispose();}
 },{base:service.url,lamella,hair});
 console.log(JSON.stringify(result,null,2));
 assert(result.every(r=>r.change.mean>.01&&r.restored.max===0&&r.seam.max===0&&r.finite&&r.throughRange&&r.readGl===0));
 const alpha=result.find(r=>r.name==='transparent-export');assert(alpha.clear>1000&&alpha.partial>100);
}finally{clearTimeout(timer);await browser.close().catch(()=>{});service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
