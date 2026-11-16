import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
const dir='reports/cloud-source-v95';await mkdir(dir,{recursive:true});
const service=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
const timeout=setTimeout(()=>browser.close().catch(()=>{}),240000);
try{
 const page=await browser.newPage();await page.goto(service.url+'moodboard/');
 const result=await page.evaluate(async base=>{
  const {Renderer}=await import(base+'renderer.js'),{newCreation,normalizeCreation}=await import(base+'creative-model.js'),{particleCreation}=await import(base+'particle-model.js');
  const r=new Renderer(document.createElement('canvas')),pictures={},rows=[];
  const state=normalizeCreation({...particleCreation(newCreation()),grainSource:'cloud',sceneGrains:0,pOpening:.62,pThickness:.24,pFill:0,pCount:16000,pSize:2,pOpacity:.65,pOrganic:.6,pFrequency:2.2,pTravel:.65,pVortex:1.4,pBreath:.22,pLife:.25,pRandom:0,pJitter:0,pTrailCount:0,pLinks:0,scale:1.1,rotateX:12,metal:.35,pLighting:1,roughness:.32,palette:['#6eaec9','#b9b3d9','#f5cc99'],background:'#000000',bgMode:'solid',motions:{},animateLights:false});
  const diff=(a,b)=>{let sum=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;max=Math.max(max,d);}return {mean:sum/a.length,max};};
  const draw=async(s,p,name)=>{const t=performance.now();if(!await r.drawAccumulated(s,p,384,288,{preview:false,quality:'full',samples:1}))throw Error('Interrupted');const gl=r.gl.getError();if(gl)throw Error('GL '+gl);const pixels=r.pixels();if(name)pictures[name]=r.canvas.toDataURL().split(',')[1];return {pixels,ms:performance.now()-t};};
  for(const mix of [0,.5,1]){
   const s={...state,sceneGrains:mix},a=await draw(s,.3,'mix-'+mix),b=await draw(s,1.7,'motion-'+mix),end=await draw(s,.3+2*Math.PI),polluted=await draw({...s,fractalAmount:1,baseForm:5,petalAmount:1,thinShell:1,fanAmount:1,spike:1},.3);
   rows.push({mix,motion:diff(a.pixels,b.pixels),seam:diff(a.pixels,end.pixels),latent:diff(a.pixels,polluted.pixels),ms:Math.round(a.ms),light:a.pixels.filter((v,i)=>i%4!==3&&v>30).length});
  }
  // Animated representation must not freeze the sampled motion or rebuild a solid.
  const animated={...state,motions:{sceneGrains:{enabled:true,amplitude:.5,center:.5,cycles:1,phase:0,wave:'sine'}}};
  await draw(animated,.6,'animated-mix');
  const variants=[];
  for(const [name,patch]of [['sphere',{pOpening:0,scale:1.5}],['transparent',{transparency:.55,refraction:1.3}],['living',{pLiving:3,pLivingBlend:.5,pSkin:.8,pThreadOpacity:.05,pStrands:128}],['dense',{pCount:100000,sceneGrains:.35}],['legacy',{grainSource:undefined}]]){
   const s={...state,...patch},a=await draw(s,.3,name),b=await draw(s,1.7);
   variants.push({name,motion:diff(a.pixels,b.pixels),ms:Math.round(a.ms)});
  }
  const startedSolid=!!r.implementations?.solid||r.kind==='solid';
  r.dispose();return {rows,variants,startedSolid,pictures};
 },service.url);
 for(const [name,data] of Object.entries(result.pictures))await writeFile(dir+'/'+name+'.png',Buffer.from(data,'base64'));
 delete result.pictures;await writeFile(dir+'/render.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 assert(!result.startedSolid);assert(result.rows.every(x=>x.motion.mean>.2&&x.seam.max<=1&&x.latent.max===0&&x.light>500));
 assert(result.variants.every(x=>x.motion.mean>.1));
}finally{clearTimeout(timeout);await browser.close().catch(()=>{});service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
