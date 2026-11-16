import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
import {newCreation,normalizeCreation} from '../creative-model.js';
const state=normalizeCreation({...newCreation(),engine:'particles',grainSource:'cloud',sceneGrains:1,pOpening:.8,pThickness:.3,pTravel:1,pOrganic:.4,pCount:12000,pTrailCount:0,structFan:.8,fractalAmount:.6});
const server=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>localStorage.setItem('prisma-current-v2',JSON.stringify({state:s,ratio:'16:9',phase:0,name:'Test origine'})),state);
 await page.goto(server.url);const source=page.locator('[data-grain-source]');await source.waitFor();assert.equal(await source.inputValue(),'cloud');
 const mix=page.locator('#controls [data-param="sceneGrains"]');assert.equal(await mix.count(),1);
 await mix.evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state.sceneGrains===0);
 await source.selectOption('body');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state.grainSource==='body');
 const body=await page.evaluate(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state);assert.equal(body.loopAmount,.8);assert.equal(body.structFan,0);assert.equal(body.fractalAmount,0);
 await source.selectOption('cloud');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state.grainSource==='cloud');
 const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state);assert.equal(restored.pOpening,.8);assert.equal(restored.pTravel,1);assert.equal(restored.sceneGrains,0);
 await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('#render-error')?.hidden,{},{timeout:90000});
 assert.equal(await page.locator('[data-grain-source]').count(),1);
 await page.screenshot({path:'reports/cloud-source-v95/mobile.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({sourceConversion:true,sourceReturn:true,mixPreserved:true,mobile:true,pageErrors:errors}));
}finally{await browser.close();server.server.closeAllConnections();await new Promise(r=>server.server.close(r));}
