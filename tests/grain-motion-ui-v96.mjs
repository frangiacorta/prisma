import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
import {newCreation,normalizeCreation} from '../creative-model.js';
const dir='reports/material-surface-v96';await mkdir(dir,{recursive:true});
const state=normalizeCreation({...newCreation(),sceneGrains:1,grainSource:'body',pCount:12000,pSize:4,pTrailCount:0,grainMotion:false,grainDispersal:0});
for(const track of Object.values(state.motions))track.enabled=false;
const service=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{if(!localStorage.getItem('prisma-current-v2'))localStorage.setItem('prisma-current-v2',JSON.stringify({state:s,ratio:16/9,phase:.7,name:'Test sfera condivisa'}));},state);
 await page.goto(service.url);await page.locator('[data-tab="motion"]').click();
 assert.equal(await page.locator('[data-grain-source]').count(),0);const control=page.locator('[data-grain-motion]');await control.waitFor();
 assert.equal(await page.locator('#controls [data-param="grainDispersal"]').count(),1);assert.equal(await control.isChecked(),false);
 await control.check();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state.grainDispersal>0);
 await page.waitForFunction(()=>document.querySelector('#render-error')?.hidden,{},{timeout:90000});await page.waitForTimeout(600);
 await control.uncheck();const frozen=await page.evaluate(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state);assert.equal(frozen.grainMotion,false);assert(frozen.grainMotionPhase>0);
 await page.locator('[data-tab="shape"]').click();const mix=page.locator('#controls [data-param="sceneGrains"]');await mix.evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.waitForFunction(()=>document.querySelector('#render-error')?.hidden,{},{timeout:90000});
 // Sliders debounce persistence by 500 ms. A hidden render message is not a
 // save acknowledgement. Verify the stored state before the normal reload.
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('prisma-current-v2')||'null')?.state?.sceneGrains===0,{},{timeout:5000});
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state);assert.equal(before.sceneGrains,0);assert.equal(before.grainMotionPhase,frozen.grainMotionPhase);assert.equal(before.grainSource,'body');
 await page.reload();await page.locator('[data-tab="motion"]').click();await page.locator('[data-grain-motion]').waitFor();assert.equal(await page.locator('[data-grain-motion]').isChecked(),false);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state);assert.equal(after.grainMotionPhase,before.grainMotionPhase);assert.equal(after.sceneGrains,0);
 await page.waitForFunction(()=>document.querySelector('#render-error')?.hidden,{},{timeout:90000});await page.locator('[data-grain-motion-panel]').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/movement-mobile.png'});
 await page.locator('[data-tab="shape"]').click();
 await page.locator('#controls [data-param="sceneGrains"]').evaluate(el=>{el.value='.4';el.dispatchEvent(new Event('input',{bubbles:true}));window.dispatchEvent(new PageTransitionEvent('pagehide'));});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('prisma-current-v2')).state.sceneGrains),.4);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({selectorAbsent:true,motionToggle:true,bodyMotionEnabled:true,frozenAfterRepresentationSwitch:true,persisted:true,immediateSaveOnExit:true,mobile:true,errors}));
}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
