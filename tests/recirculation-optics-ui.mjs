import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {newCreation,normalizeCreation} from '../creative-model.js';
import {SPHERE_FORM} from '../particle-model.js';

// End-to-end pause check. Read the studio's visible artboard without calling
// its renderer. A control input must invalidate the paused preview itself.
const studio=new URL('../',import.meta.url);
const origin='http://localhost:8458/';
const executablePath=process.env.PRISMA_BROWSER_EXECUTABLE;
const browser=await chromium.launch(executablePath?{executablePath}:{channel:'chrome'});
try{
 for(const source of ['cloud','body']){
  const base=newCreation();
  const state=normalizeCreation({...base,...SPHERE_FORM,grainSource:source,engine:source==='cloud'?'particles':'solid',
   sceneGrains:1,grainDispersal:.9,baseForm:2,grainMotion:false,grainMotionPhase:.17,pReentry:2,pOpening:.12,pFill:.04,
   pCount:36000,pSize:5,pSoftness:1.65,pOpacity:.78,pLighting:1,pSizeSpread:0,pLargeCount:0,pNodeRatio:0,
   pTrailCount:0,pTrailOpacity:0,pLiving:0,palette:['#999999'],transparency:.7,metal:0,roughness:.14,gloss:.9,
   iridescence:0,dispersion:0,pFilm:0,thinFilm:0,emission:0,refraction:1.53,environmentPower:0,finishEnabled:false,
   lights:[{...base.lights[0],visible:false,color:'#ffffff',x:-2.5,y:1.5,z:-1.8,power:3.2,size:.55}]});
  const page=await browser.newPage({serviceWorkers:'block',viewport:{width:1180,height:780}});
  page.on('pageerror',error=>console.error(error.message));
  page.on('console',msg=>{if(/GL_INVALID|WebGL:.*INVALID/.test(msg.text()))console.error(msg.text());});
  await page.route(origin+'**',route=>{
   const path=new URL(route.request().url()).pathname.slice(1)||'index.html';
   if(!/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:js|css|html|json|webp|png|jpg|woff2)$/.test(path))return route.abort();
   return route.fulfill({path:fileURLToPath(new URL(path,studio))});
  });
  await page.addInitScript(s=>{
   localStorage.setItem('prisma-current-v2',JSON.stringify({state:s,phase:1.1,ratio:1,name:'Verifica ottica'}));
   localStorage.setItem('prisma-preview-quality','fluid');
   localStorage.setItem('prisma-last-tab','material');
  },state);
  await page.goto(origin);
  await page.waitForFunction(()=>window.prismaReady);
  if(await page.locator('#play').getAttribute('aria-label')==='Metti in pausa')await page.locator('#play').click();
  await page.evaluate(()=>{
   const sample=document.createElement('canvas');sample.width=96;sample.height=64;
   const ctx=sample.getContext('2d',{willReadFrequently:true});
   window.sampleOptics=()=>{
    const refined=document.querySelector('#art-refined');
    ctx.drawImage(refined&&!refined.hidden?refined:document.querySelector('#art'),0,0,96,64);
    const rgba=ctx.getImageData(0,0,96,64).data;
    let energy=0,chroma=0;
    for(let i=0;i<rgba.length;i+=4){
     energy+=rgba[i]+rgba[i+1]+rgba[i+2];
     chroma+=Math.abs(rgba[i]-rgba[i+1])+Math.abs(rgba[i+2]-rgba[i+1]);
    }
    return {energy:energy/(3*96*64),chroma:chroma/(2*96*64),phase:document.querySelector('#timeline').value};
   };
  });
  try{
   await page.waitForFunction(()=>{
    const failure=document.querySelector('#render-error');
    if(!failure.hidden&&!failure.classList.contains('preparing'))throw Error(failure.textContent);
    return window.sampleOptics().energy>1;
   },null,{timeout:90000});
  }catch(error){
   const diagnostic=await page.evaluate(()=>({image:window.sampleOptics(),renderError:document.querySelector('#render-error').textContent}));
   throw Error(source+' initial frame missing: '+JSON.stringify(diagnostic),{cause:error});
  }
  const before=await page.evaluate(()=>window.sampleOptics());
  const number=page.locator('#controls input[data-number="dispersion"]').first();
  if(!await number.count()){
   await page.locator('.nav-group').filter({hasText:'Aspetto'}).click();
   await page.locator('.nav-tabs [data-tab="material"]').click();
  }
  await number.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
  async function set(value){await number.fill(String(value));await number.press('Tab');}
  await set(.9);
  try{
   await page.waitForFunction(start=>window.sampleOptics().chroma>start+.28,before.chroma,{timeout:45000});
  }catch(error){
   const diagnostic=await page.evaluate(()=>({image:window.sampleOptics(),dispersion:JSON.parse(localStorage.getItem('prisma-current-v2')).state.dispersion,
    renderError:document.querySelector('#render-error').textContent}));
   throw Error(source+' paused preview failed to respond: '+JSON.stringify({before,...diagnostic}),{cause:error});
  }
  const on=await page.evaluate(()=>window.sampleOptics());
  await set(0);
  await page.waitForFunction(start=>window.sampleOptics().chroma<start+.12,before.chroma,{timeout:45000});
  const off=await page.evaluate(()=>window.sampleOptics());
  assert.equal(before.phase,on.phase);assert.equal(before.phase,off.phase);
  assert.equal(await page.locator('#play').getAttribute('aria-label'),'Avvia animazione');
  assert(await page.locator('#render-error').isHidden());
  console.log(source,{before,on,off});
  await page.close();
 }
}finally{await browser.close();}
