import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright';
import {newCreation,normalizeCreation} from '../creative-model.js';
import {controlCondition,conditionActivation} from '../control-help.js';
import {VEIL_GROUPS,VEIL_META} from '../veil-model.js';
import {audioTargets} from '../audio-model.js';
import {parameterCatalog} from '../playground-model.js';
import {readPreset,presetDocument} from '../preset-files.js';

const fresh=normalizeCreation(newCreation());
const scenes=[
 ['Cubo',{baseForm:2,grainSource:'body',sceneGrains:0}],
 ['Nuvola',{engine:'particles',grainSource:'cloud',sceneGrains:1,pCount:2400}],
 ['Misto',{baseForm:4,grainSource:'body',sceneGrains:.52}]
].map(([name,state])=>[name,normalizeCreation({...fresh,...state})]);
function apply(state,patch){
 for(const [key,value] of Object.entries(patch)){
  if(key.startsWith('lights.')){
   const [,id,field]=key.split('.');
   state.lights.find(l=>l.id===Number(id))[field]=value;
  }else state[key]=value;
 }
}
for(const [name,s] of scenes){
 const catalog=parameterCatalog(s).map(item=>item.path);
 for(const key of [...Object.values(VEIL_GROUPS).flat(),'fiberGrowth','structWeaveRearY','structWeaveSpread','lightWrap'])assert(catalog.includes(key),name+' in Playground: '+key);
 for(const key of ['veilAmount','fiberGrowth','lightWrap'])assert(audioTargets(s.engine).includes(key),name+' in audio: '+key);
 const examples=[
  ['structWeaveFront',{structDelay:0},{structWeaveCradle:.65,structWeaveGrowth:.65,structDelay:.5}],
  ['structWeavePitch',{structWeaveNodes:.84},{structWeaveCradle:.65}],
  ['structWeaveFlare',{structWeaveGrowth:.21,structWeaveCup:0},{structWeaveNodes:.7,structWeaveCup:.65}],
  ['fiberLength',{fiberTarget:'nodes',fiberPile:0},{fiberPile:.65,structWeaveNodes:.7}],
  ['pVeilCoreDark',{pVeilCoreRadius:0},{veilAmount:.65,pVeilCoreRadius:.24}],
  ['pVeilLayerColor',{palette:['#856656'],pVeilLayers:1},{veilAmount:.65,palette:['#856656','#387d9c'],pVeilLayers:3}],
  ['pVeilDelay',{veilAmount:.64,pVeilLayers:4,pVeilFlow:0,pVeilBreath:0,pVeilRipple:0},{pVeilFlow:.4}]
 ];
 for(const [key,initial,expected] of examples){
  const state={...s,...initial};
  const patch=conditionActivation(state,key);
  assert.deepEqual(patch,expected,name+' '+key);
  apply(state,patch);
  assert.equal(controlCondition(state,key),'',name+' input chain incomplete for '+key);
 }
 const dark={...s,structWeaveNodes:.86,pLighting:.5,lights:[{id:19,power:0,enabled:false,color:'#e3bba8'}]};
 const patch=conditionActivation(dark,'structWeaveCupLight');
 assert.deepEqual(patch,{'lights.19.enabled':true,'lights.19.power':1});
 apply(dark,patch);
 assert.equal(controlCondition(dark,'structWeaveCupLight'),'');
 assert.equal(dark.lights[0].color,'#e3bba8');
 const moving={...s,motions:{...s.motions,veilAmount:{enabled:true,mode:'points',amplitude:0,points:[{at:0,offset:0},{at:.5,offset:.82}]}}};
 assert.equal(controlCondition(moving,'pVeilLayers'),'');
 const saved=readPreset(JSON.stringify(presetDocument({state:{...s,veilAmount:.28,pVeilOpacity:.34,fiberGrowth:.69},name}))).state;
 assert.deepEqual([saved.veilAmount,saved.pVeilOpacity,saved.fiberGrowth,saved.grainSource,saved.sceneGrains],[.28,.34,.69,s.grainSource,s.sceneGrains]);
}
const stalks={...fresh,structWeaveNodes:.72,structWeaveGrowth:.4};
for(const key of ['structWeaveSlope','structWeaveArch','structWeaveFlex'])assert.equal(controlCondition(stalks,key),'');
const threads={...fresh,structFibres:.8,structWeft:1};
for(const key of ['structWeaveBranching','structWeaveGrowth','structWeaveFlex','structWeaveFinesse'])assert.ok(controlCondition(threads,key),key);
const tensioned={...threads,structShell:1,structWeaveBranching:.8,structWeaveTension:.8,structDelay:.5};
for(const key of ['structWeaveRootBend','structWeaveTipBend','structWeaveRearX','structWeaveRearY','structWeaveFront'])assert.equal(controlCondition(tensioned,key),'',key);
console.log('Prerequisites, individual light edits, mappings and preset round trips passed for three unrelated scenes.');
if(process.argv.includes('--ui')||process.argv.includes('--render')){
 const source=existsSync('web/studio/index.html')?'web/studio':'.';
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://localhost:8374';
  await page.route(url+'/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/probe.html')return route.fulfill({contentType:'text/html',body:'<!doctype html>'});
   const scene=scenes.find(([name])=>path==='/previews/'+name+'.json');
   if(scene)return route.fulfill({contentType:'application/json',body:JSON.stringify(presetDocument({state:scene[1],name:scene[0]}))});
   const file=source+(path==='/'?'/index.html':path);
   return existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404});
  });
  if(process.argv.includes('--render')){
   await page.goto(url+'/probe.html');
   const report=await page.evaluate(async ({scenes,metadata})=>{
    const {Renderer}=await import('/renderer.js');
    const r=new Renderer(document.createElement('canvas'));
    async function pixels(scene){
     if(!await r.drawTiled(scene,1.17,196,160,{quality:'fast'})||r.gl.getError())throw Error('Fotogramma incompleto');
     return r.pixels().slice();
    }
    const report=[];
    try{
     for(const [name,source] of scenes){
      const base={...source,veilAmount:.78,rotateX:22,rotateY:27,pVeilLayers:4,pVeilStyle:.64,pVeilRipple:.22,pVeilCoreRadius:.28,pVeilCoreDark:.8,pVeilSpread:.72,pVeilFlow:.45,pVeilBreath:.23,pOrganic:.55,pCount:2000,pTrailCount:0,palette:['#5382b8','#e8ad62','#7857a2'],scale:1.15};
      for(const [key,[,low,high]] of Object.entries(metadata)){
       const atLow=await pixels({...base,[key]:low}),atHigh=await pixels({...base,[key]:high});
       let count=0;
       for(let i=0;i<atLow.length;i+=4)if(Math.max(Math.abs(atLow[i]-atHigh[i]),Math.abs(atLow[i+1]-atHigh[i+1]),Math.abs(atLow[i+2]-atHigh[i+2]))>2)count++;
       report.push([name,key,count]);
      }
     }
    }finally{r.dispose();}
    return report;
   },{scenes:scenes.filter(([name])=>name!=='Misto'),metadata:Object.fromEntries(Object.values(VEIL_GROUPS).flat().map(k=>[k,VEIL_META[k]]))});
   const failures=report.filter(([, ,pixels])=>pixels<5);
   console.log(JSON.stringify({controls:report.length,failures,smallest:report.toSorted((a,b)=>a[2]-b[2]).slice(0,3)}));
   assert.equal(failures.length,0);
  }
  if(process.argv.includes('--ui'))
  for(const [name] of scenes){
   await page.goto(url+'/?preset=previews/'+name+'.json');await page.waitForFunction(()=>window.prismaReady);
   for(const [tab,keys] of Object.entries(VEIL_GROUPS)){
    await page.locator('[data-tab="'+tab+'"]').click();
    for(const key of keys){
     const control=page.locator('#controls input[data-param="'+key+'"]');
     assert.equal(await control.count(),1,name+' '+key);
     assert.equal(await page.locator('#controls [data-number="'+key+'"]').count(),1,key);
     assert(await control.locator('xpath=ancestor::div[contains(@class,"param")][1]').locator('[data-help-text]').count(),key+' instructions');
    }
   }
   await page.locator('[data-tab="shape"]').click();
   await page.locator('#sections-open').click();
   const row=page.locator('#controls .param').filter({has:page.locator('[data-param="pVeilCoreRadius"]')});
   const button=row.locator('.condition-action');
   await button.click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('prisma-current-v2'))?.state?.veilAmount===.65);
   assert.equal(await row.locator('.condition-note').isVisible(),false);
   const amount=page.locator('[data-number="veilAmount"]');
   await amount.fill('0');await amount.press('Tab');
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('prisma-current-v2'))?.state?.veilAmount===0);
  }
  assert.deepEqual(errors,[]);
  if(process.argv.includes('--ui'))console.log('Three independent inspector flows passed.');
 }finally{await browser.close();}
}
