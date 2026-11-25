import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCreation,normalizeCreation} from '../creative-model.js';
import {presetDocument,readPreset} from '../preset-files.js';
import {controlCondition} from '../control-help.js';
import {normalizePlayground} from '../playground-model.js';
import {fiberMaterialUniform} from '../fiber-material.js';

const source=existsSync('web/studio/index.html')?'web/studio':'.';
const initial=normalizeCreation(newCreation());
const structure=['structWeaveCradle','structWeaveNodes','structWeaveMembrane'];
for(const key of structure){
 assert.equal(initial[key],0,key);
 assert.equal(controlCondition(initial,key),'',key+' must be usable from a new project');
}
for(const key of ['fiberPile','lightWrap','pSelfShadow'])assert.equal(initial[key],0,key);
const legacy=JSON.parse(await readFile(source+'/previews/reticolo-giunzioni.prisma.json','utf8'));
assert.equal(normalizeCreation(legacy.state).fiberTarget,'nodes');
assert.equal(normalizeCreation(legacy.state).fiberGrowth,1);
assert.equal(normalizeCreation(legacy.state).fiberPile,legacy.state.surfaceTexture);
const oldCoat={fiberTarget:'growth',fiberPile:.72,fiberLength:.76};
assert.deepEqual(fiberMaterialUniform(oldCoat),[.72,.76,1,1]);
const decks=normalizePlayground({decks:{A:{state:oldCoat},B:{state:null}}}).decks;
assert.deepEqual(fiberMaterialUniform(decks.A.state),[.72,.76,1,1]);
assert.equal(decks.A.state.fiberTarget,'nodes');
const unrelated={...initial,surfaceTexture:.78};
delete unrelated.fiberPile;
assert.equal(normalizeCreation(unrelated).fiberPile,0);
const edited={...initial,motions:{...initial.motions},fiberPile:.67,fiberLength:.82,fiberGrowth:.41,fiberTarget:'nodes',lightWrap:.57,pSelfShadow:.4,structWeaveCupLight:.73};
for(const key of structure)edited[key]=.72;
edited.motions.fiberPile={...edited.motions.fiberPile,enabled:true,amplitude:.16,cycles:2};
edited.motions.fiberGrowth={...edited.motions.fiberGrowth,enabled:true,amplitude:.12,cycles:3};
const reopened=readPreset(JSON.stringify(presetDocument({state:edited,name:'Fibre',phase:.72,ratio:1.6})));
for(const key of [...structure,'fiberPile','fiberLength','fiberGrowth','fiberTarget','lightWrap','pSelfShadow','structWeaveCupLight','motions'])assert.deepEqual(reopened.state[key],edited[key],key);
assert.equal(reopened.phase,.72);
if(process.argv.includes('--model')){console.log('Shared fibre controls and preset round trip passed');process.exit(0);}

const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 const url='http://localhost:8243';
 const scenes=[
  ['cubo',{baseForm:2,rotateX:24,rotateY:37,grainSource:'body',sceneGrains:0}],
  ['misto',{baseForm:4,rotateX:20,grainSource:'body',sceneGrains:.55}],
  ['granelli',{engine:'particles',grainSource:'cloud',sceneGrains:1,pLobeDepth:.5,pOrganic:.37}]
 ].map(([name,settings])=>[name,normalizeCreation({...initial,pCount:4200,pSize:2.6,pOpacity:.9,pFill:0,scale:.72,...settings})]);
 await page.route(url+'/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/probe.html')return route.fulfill({contentType:'text/html',body:'<!doctype html>'});
  const scene=scenes.find(([name])=>path==='/previews/'+name+'.json');
  if(scene)return route.fulfill({contentType:'application/json',body:JSON.stringify(presetDocument({name:scene[0],state:scene[1]}))});
  const file=source+(path==='/'?'/index.html':path);
  return existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404});
 });
 await page.goto(url+'/probe.html');
 const result=process.argv.includes('--inspector')?[]:await page.evaluate(async ({scenes,structure})=>{
  const {Renderer}=await import('/renderer.js');
  const renderer=new Renderer(document.createElement('canvas'));
  const draw=async s=>{
   if(!await renderer.drawAccumulated(s,.41,192,192,{quality:'full',samples:1}))throw Error('Incomplete frame');
   if(renderer.gl.getError())throw Error('WebGL error');
   return renderer.pixels().slice();
  };
  const changed=(a,b)=>{
   let count=0;
   for(let i=0;i<a.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])))>2)count++;
   return count;
  };
  const report=[];
  for(const [name,s] of scenes){
   const base=await draw(s);
   for(const key of [...structure,'fiberPile','lightWrap']){
    const next=await draw({...s,[key]:.9});
    report.push([name,key,changed(base,next)]);
   }
   const coat=await draw({...s,fiberPile:.88,fiberLength:.04});
   report.push([name,'fiberLength',changed(coat,await draw({...s,fiberPile:.88,fiberLength:.92}))]);
   const nodes=await draw({...s,structWeaveNodes:.9,structWeaveCupSize:1.35});
   report.push([name,'pile on nodes',changed(nodes,await draw({...s,structWeaveNodes:.9,structWeaveCupSize:1.35,fiberPile:1,fiberLength:1,fiberTarget:'nodes'}))]);
   const growing={...s,structWeaveNodes:.9,structWeaveCupSize:1.35,structWeaveGrowth:.35,fiberPile:1,fiberLength:1,fiberTarget:'nodes'};
   const steady=await draw(growing),partial=await draw({...growing,fiberGrowth:.5}),follows=await draw({...growing,fiberGrowth:1});
   report.push([name,'growth response 0–0.5',changed(steady,partial)],[name,'growth response 0.5–1',changed(partial,follows)]);
   if(changed(base,await draw(s)))throw Error(name+': disabling the web changed the bare figure');
   if(changed(base,await draw({...s,fiberPile:1,fiberTarget:'nodes'})))throw Error(name+': nodule-only coat changed bare figure');
  }
  for(const variation of [0,.78]){
   const weave={...scenes[0][1],structShell:1,structFibres:1,structWeft:1,structWeaveNodes:1,structDensity:7,structThreadWidth:.45,structThickness:.15,structWeaveVariation:variation};
   const plain=await draw(weave),coat=await draw({...weave,fiberPile:1,fiberTarget:'nodes'}),whole=await draw({...weave,fiberPile:1});
   const knotPixels=changed(plain,coat);
   if(knotPixels>=changed(plain,whole))throw Error('Nodule coating leaked onto the entire weave');
   report.push(['woven cube '+variation,'pile on nodes',knotPixels]);
  }
  const links={...scenes[2][1],pLinks:.8,pLinkNodes:160,pNodeRatio:3,pLinkReach:.45};
  const bareLinks=await draw(links),linkedCoat={...links,fiberPile:.9,fiberTarget:'nodes'};
  report.push(['connected grains','pile on nodes',changed(bareLinks,await draw(linkedCoat))]);
  if(changed(bareLinks,await draw({...linkedCoat,fiberGrowth:1})))throw Error('Static link nodes acquired a growth coat');
  return report;
 },{scenes,structure});
 for(const [name,key,changed] of result)assert(changed>12,name+' / '+key+': '+changed+' changed pixels');
 console.log(JSON.stringify(result));
 for(const [name] of scenes.filter(([name])=>name!=='misto')){
  await page.goto(url+'/?preset=previews/'+name+'.json');
  await page.waitForFunction(()=>window.prismaReady);
  for(const [tab,keys] of [['shape',structure],['material',['fiberPile','fiberLength']],['light',['lightWrap','pSelfShadow','structWeaveCupLight']]]){
   await page.locator('[data-tab="'+tab+'"]').click();
   for(const key of keys){
    const range=page.locator('#controls [data-param="'+key+'"]');
    assert.equal(await range.count(),1,name+' '+key+' range');
    assert.equal(await page.locator('#controls [data-number="'+key+'"]').count(),1,key+' value');
    assert(await range.locator('xpath=ancestor::div[contains(@class,"param")][1]').locator('[data-help-text]').count(),key+' help');
   }
  }
  for(const [term,expected] of [['lana','Peluria'],['palline','Noduli'],['ragnatela','Ragnatela']]){
   await page.locator('#control-search').fill(term);
   await page.locator('.control-search-result strong').filter({hasText:expected}).first().waitFor();
  }
  await page.locator('#control-search').fill('');
  await page.locator('[data-tab="material"]').click();
  await page.locator('#sections-open').click();
  await page.locator('[data-number="fiberPile"]').fill('0.64');
  await page.locator('[data-number="fiberPile"]').press('Tab');
  await page.locator('#fiber-target').selectOption('nodes');
  await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('prisma-current-v2'))?.state;return s?.fiberPile===.64&&s.fiberTarget==='nodes';});
 }
 assert.deepEqual(errors,[]);
 console.log('Shared fibre controls passed in the renderer and inspector');
}finally{await browser.close();}
