import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
import {newCreation,motionPreset} from '../creative-model.js';
import {loopStatus,exportLoop,loopSeamAmount} from '../animation-clock.js';
import {presetDocument} from '../preset-files.js';

const directory='reports/unified-studio',testBenchmark=process.argv.includes('--benchmark');
const knownDecoder='local/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const ffmpeg=process.argv.find(a=>a.startsWith('--ffmpeg='))?.slice(9)||(existsSync(knownDecoder)?knownDecoder:null);
await mkdir(directory,{recursive:true});
const baseline={...newCreation(),duration:14,motionPeriod:6};
assert.equal(loopStatus(baseline).closed,false);
assert.equal(exportLoop(baseline,'natural').seconds,12);
assert.equal(exportLoop(baseline,'fit').seconds,14);
assert.equal(exportLoop(baseline,'fit').repeat,true);
assert.equal(exportLoop({...baseline,dynAmount:.6},'seam').smooth,true);
assert.equal(loopSeamAmount(59,60,30),1);
const server=await startCreativeServer(0);
const old=testBenchmark?await startCreativeServer(0,{studioRoot:path.resolve('local/prisma-online')}):null;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text());});
 const report={};
 if(old){
  const timing=async(base)=>{await page.goto(base+'moodboard/');return page.evaluate(async base=>{
   const {Renderer}=await import(base+'renderer.js'),{newCreation}=await import(base+'creative-model.js');
   const r=new Renderer(document.createElement('canvas')),values={};
   const median=xs=>xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)];
   for(const [name,patch] of Object.entries({sphere:{},cells:{cellMorph:.75,cellSpines:.48,cellSpineLength:.25,cellBubbles:.78}})){
    const state={...newCreation(),...patch};
    for(let i=0;i<8;i++){
     const start=performance.now();
     if(!await r.drawAccumulated(state,.56,1920,1080,{samples:2,cancelled:()=>performance.now()-start>90000}))throw Error('Misura interrotta');
     const elapsed=performance.now()-start;
     values[name]??={times:[]};values[name].times.push(elapsed);
    }
    values[name].first=Math.round(values[name].times[0]);
    values[name].median=median(values[name].times.slice(2));
    let h=2166136261;for(const c of r.pixels())h=Math.imul(h^c,16777619);
    values[name].hash=h>>>0;
   }
   const hardware=r.hardwareInfo().name;r.dispose();return {values,hardware};
  },base);};
  report.before=await timing(old.url);console.log('v84',JSON.stringify(report.before));
  report.after=await timing(server.url);console.log('v85',JSON.stringify(report.after));
  for(const name of ['sphere','cells'])assert.equal(report.before.values[name].hash,report.after.values[name].hash,name+' pixel hash');
 }
 await page.goto(server.url+'moodboard/');
 report.hybrid=await page.evaluate(async base=>{
  const {Renderer}=await import(base+'renderer.js'),{newCreation}=await import(base+'creative-model.js');
  const r=new Renderer(document.createElement('canvas')),w=336,h=224;
  const state={...newCreation(),sceneGrains:.55,loopAmount:.87,loopTube:.19,pCount:16000,pSize:2.1,pTrailCount:0,pFill:1,pLinks:0};
  const draws=[];
  for(const samples of [1,4]){
   const start=performance.now();
   if(!await r.drawAccumulated(state,.4,w,h,{samples,cancelled:()=>performance.now()-start>90000}))throw Error('Composizione non completata');
   const gl=r.gl,err=gl.getError();if(err)throw Error('WebGL '+err);
   const depth=new Uint8Array(w*h*4);gl.bindFramebuffer(gl.FRAMEBUFFER,r.bodyComposite.framebuffer);gl.readBuffer(gl.COLOR_ATTACHMENT1);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,depth);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   const count=depth.reduce((n,c,i)=>n+(i%4===2&&c>0),0);
   if(count<500)throw Error('Profondità mancante nel composito');
   let checksum=0;for(const byte of r.pixels())checksum=(Math.imul(checksum,31)+byte)>>>0;
   draws.push({samples,count,checksum,ms:performance.now()-start});
  }
  if(draws[0].checksum===draws[1].checksum)throw Error('Campioni extra ignorati');
  r.dispose();return draws;
 },server.url);
 console.log('Hybrid',JSON.stringify(report.hybrid));
 const movie={...newCreation(),sceneGrains:.6,pCount:12000,pSize:1.7,pTrailCount:0,pLinks:0,grainDispersal:.32,dynAmount:.31,dynGravity:.6,
  finishFeedback:true,finishFeedbackMix:.23,finishFeedbackMemory:.42,palette:['#fa958d','#6078c8']};
 motionPreset(movie,'float');Object.assign(movie,{duration:2,motionPeriod:3});
 await page.goto(server.url);await page.waitForFunction(()=>window.prismaReady);
 await page.locator('#project-file').setInputFiles({name:'test-loop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(presetDocument({state:movie,name:'Verifica raccordo',ratio:16/9})))});
 await page.locator('#export-open').click();await page.locator('[data-export=video]').click();
 await page.locator('#export-width').fill('321');await page.locator('#export-width').dispatchEvent('change');
 await page.locator('#export-height').fill('181');await page.locator('#export-height').dispatchEvent('change');
 await page.locator('#video-fps').selectOption('30');
 assert.match(await page.locator('#export-loop-status').innerText(),/raccord/i);
 const download=page.waitForEvent('download',{timeout:240000});
 await page.locator('#download').click();const result=await download;
 assert.match(result.suggestedFilename(),/\.mp4$/);
 const output=directory+'/raccordo-verifica.mp4';await result.saveAs(output);
 assert(await page.locator('#ready-video-download').isVisible());
 const file=await readFile(output);
 report.video=await page.evaluate(async ({bytes,metadataOnly})=>{
  const blob=new Blob([Uint8Array.from(atob(bytes),x=>x.charCodeAt(0))],{type:'video/mp4'}),url=URL.createObjectURL(blob);
  const video=document.createElement('video'),canvas=document.createElement('canvas');video.muted=true;video.preload='auto';
  const loaded=new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error(video.error?.message));});video.src=url;await loaded;
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  const metrics={width:canvas.width,height:canvas.height,seconds:video.duration,bytes:blob.size};
  if(metadataOnly){URL.revokeObjectURL(url);return metrics;}
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  async function pixels(t){
   if(Math.abs(video.currentTime-t)>.00001){const ready=new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));video.currentTime=t;await ready;}
   ctx.drawImage(video,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;
  }
  const start=await pixels(0),middle=await pixels(1),end=await pixels(video.duration-.015);
  const delta=(a,b)=>a.reduce((n,c,i)=>n+(i%4!==3?Math.abs(c-b[i]):0),0)/(a.length*.75);
  Object.assign(metrics,{seam:delta(start,end),motion:delta(start,middle)});
  URL.revokeObjectURL(url);return metrics;
 },{bytes:file.toString('base64'),metadataOnly:!!ffmpeg});
 if(ffmpeg){
  const raw=spawnSync(path.resolve(ffmpeg),['-v','error','-i',output,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:20000000});
  if(raw.error||raw.status!==0)throw raw.error||Error(raw.stderr.toString());
  const size=report.video.width*report.video.height*3,frames=raw.stdout.length/size;
  const distance=(a,b)=>{let sum=0;for(let i=0;i<size;i++)sum+=Math.abs(raw.stdout[a*size+i]-raw.stdout[b*size+i]);return sum/size;};
  assert.equal(frames,60);
  Object.assign(report.video,{frames,seam:distance(0,frames-1),motion:distance(0,Math.floor(frames/2))});
 }
 assert.equal(report.video.width,322);assert.equal(report.video.height,182);assert.equal(report.video.seconds,2);
 assert(report.video.seam<2&&report.video.motion>3,JSON.stringify(report.video));
 assert.deepEqual(errors,[]);
 await writeFile(directory+'/delivery.json',JSON.stringify(report,null,2));
 console.log('EXPORT PASS',JSON.stringify(report.video));
}finally{await browser.close();for(const s of [old,server].filter(Boolean)){s.server.closeAllConnections();await new Promise(resolve=>s.server.close(resolve));}}
