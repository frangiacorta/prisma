import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
const out='reports/review-v86';
const server=await startCreativeServer(0);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto(server.url+'moodboard/');
 const report=await page.evaluate(async base=>{
  const {Renderer}=await import(base+'renderer.js');
  const {newCreation,motionPreset}=await import(base+'creative-model.js');
  const {VideoExportSession}=await import(base+'video-export.js');
  const w=640,h=360,fps=30,frames=16,scene={...newCreation(),duration:4,motionPeriod:4,sceneGrains:.44,pCount:17000,pSize:2.4,pTrailCount:0,pLinks:0,filLength:0,
   palette:['#ee3627','#1155de','#42d18f','#ead9a0'],background:'#141923',background2:'#08070b',bgMode:'gradient',roughness:.35,metal:.19,deform:.16,twist:.32};
  motionPreset(scene,'turn');
  const r=new Renderer(document.createElement('canvas')),native=new VideoExportSession(),raw=new VideoExportSession();
  const state={width:w,height:h,fps,totalFrames:frames,memoryOnly:true},cost={native:0,raw:0};
  await native.init(state);await raw.init(state);
  const delta=(a,b)=>{
   let sum=0,mx=0,pixels=0;
   for(let i=0;i<a.length;i++)if(i%4!==3){const d=Math.abs(a[i]-b[i]);sum+=d;mx=Math.max(mx,d);pixels++;}
   return {mae:sum/pixels,max:mx};
  };
  const decode=async (blob,time)=>{
   const video=document.createElement('video'),url=URL.createObjectURL(blob);
   try{
    video.muted=true;video.src=url;await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=reject;});
    if(time){video.currentTime=time;await new Promise((resolve,reject)=>{video.onseeked=resolve;video.onerror=reject;});}
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(video,0,0,w,h);return {data:ctx.getImageData(0,0,w,h).data,width:video.videoWidth,height:video.videoHeight,duration:video.duration,photo:c.toDataURL('image/png').split(',')[1]};
   }finally{URL.revokeObjectURL(url);}
  };
  try{
   let expected=null,original=null;
   for(let i=0;i<frames;i++){
    const opts={samples:2,cancelled:()=>false};
    if(!await r.drawAccumulated(scene,i/frames*Math.PI*2,w,h,opts))throw Error('Rendering interrotto');
    if(!i){expected=r.pixels();original=r.canvas.toDataURL('image/png').split(',')[1];}
    let t=performance.now();await native.frameFrom(r.canvas,i,()=>r.pixels());cost.native+=performance.now()-t;
    t=performance.now();await raw.frame(r.pixels());cost.raw+=performance.now()-t;
   }
   const a=await native.finish(),b=await raw.finish();
   const aa=await decode(a.blob,.001),bb=await decode(b.blob,.001),ae=await decode(a.blob,(frames-1)/fps+.001),be=await decode(b.blob,(frames-1)/fps+.001);
   const frame=new Uint8Array(expected.length);
   for(let y=0;y<h;y++)frame.set(expected.subarray(y*w*4,(y+1)*w*4),(h-y-1)*w*4);
   const observed=Array.from(aa.data.subarray(0,8));
   return {backend:a.stats.backend,hardware:r.hardwareInfo().name,cost,width:aa.width,height:aa.height,duration:aa.duration, flipped:delta(aa.data,frame),observed,expected:Array.from(expected.subarray(0,8)),pictures:[original,aa.photo,bb.photo],
    start:delta(aa.data,bb.data),end:delta(ae.data,be.data),nativeFromCanvas:delta(aa.data,expected),readPixels:delta(bb.data,expected)};
  }finally{native.dispose();raw.dispose();r.dispose();}
 },server.url);
 await mkdir(out,{recursive:true});
 const pictures=report.pictures;delete report.pictures;
 for(const [i,photo] of pictures.entries())await writeFile(out+'/export-colore-'+i+'.png',Buffer.from(photo,'base64'));
 await writeFile(out+'/export-colore.json',JSON.stringify(report,null,2));
 assert.equal(report.width,640);assert.equal(report.height,360);assert(Math.abs(report.duration-16/30)<.02);
 assert(report.start.mae<3&&report.end.mae<3,JSON.stringify(report));
 assert(report.nativeFromCanvas.mae<5&&report.readPixels.mae<5,JSON.stringify(report));
 console.log(JSON.stringify(report));
}finally{await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));}
