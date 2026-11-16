import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
const out='reports/visual-parity/v90-implicit-contracts';await mkdir(out,{recursive:true});
const states={};for(const name of ['velo-fibre','reticolo-giunzioni','bolla-su-granelli','trama-estrusa'])states[name]=JSON.parse(await readFile(`previews/${name}.prisma.json`,'utf8')).state;
const server=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu-shader-disk-cache']});
try{
 const page=await browser.newPage();await page.goto(server.url+'moodboard/');
 const report=await page.evaluate(async({base,states})=>{
  const {Renderer}=await import(base+'renderer.js'),{normalizeCreation}=await import(base+'creative-model.js');
  const r=new Renderer(document.createElement('canvas')),cases=[],w=360;
  const difference=(a,b)=>{let total=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);total+=d;max=Math.max(max,d);}return {mean:total/a.length,max};};
  const frame=async(state,phase=0,options={})=>{
   const start=performance.now(),settings={exactLayers:true,samples:2,preview:false,...options,cancelled:()=>performance.now()-start>150000};
   if(!await r.drawAccumulated(state,phase,w,w,settings))throw Error('Frame interrupted');
   const error=r.gl.getError();if(error)throw Error('WebGL '+error);
   return {pixels:r.pixels(),ms:performance.now()-start,image:r.canvas.toDataURL('image/png').split(',')[1]};
  };
  try{
   for(const [name,raw] of Object.entries(states)){
    const state=normalizeCreation(raw),first=await frame(state),middle=await frame(state,Math.PI),last=await frame(state,Math.PI*2);
    cases.push({name,ms:[first.ms,middle.ms,last.ms],seam:difference(first.pixels,last.pixels),motion:difference(first.pixels,middle.pixels),image:first.image});
   }
   const clean=normalizeCreation({...states['velo-fibre'],motions:{},bgMode:'transparent',transparency:.65,structFanBias:1});
   const alpha=await frame(clean);let clear=0,partial=0;for(let i=3;i<alpha.pixels.length;i+=4){if(alpha.pixels[i]===0)clear++;else if(alpha.pixels[i]<255)partial++;}
   cases.push({name:'transparent-export',clear,partial,image:alpha.image});
   const material=normalizeCreation({...clean,bgMode:'solid',background:'#000000',textureScale:.7,textureDepth:1,textureWrinkles:0,textureFolds:0,textureWear:0,textureRipples:0,textureRandomness:0,textureWarp:0,texturePatch:0});
   const plain=await frame(material),detail=await frame({...material,textureFolds:.8,textureWrinkles:.8,textureRandomness:.9,textureWarp:.8}),restored=await frame(material);
   cases.push({name:'material-toggle',change:difference(plain.pixels,detail.pixels),restored:difference(plain.pixels,restored.pixels),image:detail.image});
   const mixed=await frame(normalizeCreation({...states['reticolo-giunzioni'],sceneGrains:.45,pCount:12000,pSize:2,pLinks:0,pTrailCount:0}),.75,{samples:1});
   cases.push({name:'attached-grains',ms:mixed.ms,image:mixed.image});
   return {gpu:r.hardwareInfo().name,cases};
  }finally{r.dispose();}
 },{base:server.url,states});
 for(const entry of report.cases){await writeFile(`${out}/${entry.name}.png`,Buffer.from(entry.image,'base64'));delete entry.image;}
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
 for(const entry of report.cases){if(entry.seam)assert(entry.seam.mean<.02,entry.name+' seam');if(entry.name==='transparent-export')assert(entry.clear>1000&&entry.partial>100,'Transparent output');if(entry.name==='material-toggle'){assert(entry.change.mean>.01,'Material control has no effect');assert(entry.restored.mean<.02,'Material toggle failed to restore');}}
 console.log(JSON.stringify(report));
 const wallpaper=await page.evaluate(async base=>{const {createWallpaper}=await import(base+'wallpaper-export.js'),{newCreation}=await import(base+'creative-model.js');return await(await createWallpaper(newCreation())).text();},server.url);
 await writeFile(out+'/wallpaper.html',wallpaper);
 const script=wallpaper.match(/<script type="module">([\s\S]*?)<\/script>/)[1];await writeFile(out+'/wallpaper.mjs',script);
}finally{await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));}
