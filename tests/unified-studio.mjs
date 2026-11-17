import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
import {cloudToBody,changeGrainSource,grainMix} from '../body-layers.js';
import {newCreation,normalizeCreation} from '../creative-model.js';
import {particleCreation} from '../particle-model.js';
import {presetDocument,readPreset} from '../preset-files.js';

const input=particleCreation(newCreation());
Object.assign(input,{grainSource:'cloud',pOpening:.48,pLobeDepth:.5,pLobes:7,pCellAmount:.3,bgMode:'gradient',duration:16,
 palette:['#245aba','#f04bc2'],finishRgb:true,finishRgbMix:.34});
Object.assign(input.motions.pOpening,{enabled:true,amplitude:.12,cycles:2,phase:30});
Object.assign(input.motions.pCellAmount,{enabled:true,amplitude:.1});
const surface=cloudToBody(input);
// Explicit source conversion preserves common appearance, not the entire
// source-specific motion map. The representation slider no longer uses it.
for(const key of ['palette','lights','bgMode','duration','finishRgb','finishRgbMix'])assert.deepEqual(surface[key],input[key]);
assert.deepEqual(surface.motions.rotateY,input.motions.rotateY);
assert.deepEqual(surface.motions.loopAmount,input.motions.pOpening);
assert.equal(surface.motions.pOpening.enabled,false);
assert.equal(surface.motions.pCellAmount.enabled,false);
assert.equal(surface.cellMorph,0); // Grouped grains are not Nacre cells/spines.
assert.equal(surface.loopAmount,.48);
assert.equal(surface.lobes,7);
assert.equal(grainMix(normalizeCreation(input)),1);
const mixed={...input,sceneGrains:.46};
const conversion=changeGrainSource(mixed,'body');
assert.equal(conversion.lossy,true);
assert.ok(conversion.unmapped.includes('pCellAmount'));
assert.ok(conversion.unmapped.includes('motions.pCellAmount'));
const roundtrip=readPreset(JSON.stringify(presetDocument({state:mixed,name:'Corpo e granelli'}))).state;
assert.equal(roundtrip.sceneGrains,.46);
assert.equal(roundtrip.grainSource,'body');
assert.equal(roundtrip.loopAmount,.48);
assert.deepEqual(roundtrip.motions.loopAmount,mixed.motions.loopAmount);

if(process.argv.includes('--cpu-only')){console.log('CPU SOURCE CONVERSION PASS');process.exit(0);}

const server=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:880}});
const directory='reports/unified-studio';
await mkdir(directory,{recursive:true});
try{
 if(!process.argv.includes('--ui-only')){
 await page.goto(server.url+'moodboard/');
 const result=await page.evaluate(async base=>{
  const {Renderer}=await import(base+'renderer.js');
  const {newCreation,normalizeCreation}=await import(base+'creative-model.js');
  const {fieldAt}=await import(base+'solid-renderer.js');
  const r=new Renderer(document.createElement('canvas')),w=576,h=360;
  const seed={...newCreation(),pCount:42000,pSize:3.2,pOpacity:.38,pTrailCount:0,roughness:.35,metal:.24,
   palette:['#6e459e','#61d1df','#e4d58f'],pLighting:1,edge:0,background:'#000000',duration:8};
  const studies={
   sfera:{},
   anello:{loopAmount:1,loopRadius:.82,loopTube:.25,rotateX:10,pFill:0},
   solido:{baseForm:2,rotateX:14,rotateY:-25,stretchX:1.15,pFill:.38},
   cellule:{cellMorph:.85,cellBubbles:1,cellSpines:.6,cellSpineLength:.23,pFill:.11},
   frattale:{fractalAmount:1,fractalKind:0,fractalLevels:8,rotateY:12,pFill:.08},
   radici:{petalAmount:.8,petalCount:7,petalCoverage:1,petalGrowth:.76,petalCurl:.28,petalLength:.68,pFill:.12}
  };
  const pictures={},stats={};
  async function render(state,phase,options={}){
   const start=performance.now(),deadline=()=>performance.now()-start>65000;
   if(!await r.drawAccumulated(state,phase,w,h,{preview:true,quality:'fast',samples:1,cancelled:deadline,...options}))throw Error('Rendering interrotto');
   const error=r.gl.getError();
   if(error!==r.gl.NO_ERROR)throw Error('Errore WebGL '+error);
   return r.pixels();
  }
  for(const [name,patch] of Object.entries(studies)){
   const s=normalizeCreation({...seed,...patch});
   const start=performance.now(),images=[];
   for(const mix of [0,.45,1]){
    const pixels=await render({...s,sceneGrains:mix},1);
    let count=0,center=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const i=(y*w+x)*4;
     if(pixels[i]+pixels[i+1]+pixels[i+2]>70){count++;if(Math.hypot(x-w/2,y-h/2)<15)center++;}
    }
    if(count<500)throw Error(name+' vuoto a '+mix+' '+count);
    images.push({mix,count,center});
    pictures[name+'-'+mix]=r.canvas.toDataURL().split(',')[1];
   }
   const a=await render({...s,sceneGrains:.66},1);
   const b=await render({...s,sceneGrains:.66},1+2*Math.PI);
   const loop=a.reduce((n,c,i)=>n+Math.abs(c-b[i]),0)/a.length;
   if(loop>.15)throw Error(name+' non torna alla stessa fase '+loop);
   stats[name]={images,loop,elapsed:Math.round(performance.now()-start)};
  }
  // Tube control is functional in the mixed mode and the negative field is
  // actually outside the body, not inferred only from the final screenshot.
  const torus={...seed,...studies.anello,renderVersion:2};
  if(fieldAt(torus,[0,0,0])<=0||stats.anello.images.some(s=>s.center>5))throw Error('Il foro si riempie durante il passaggio.');
  const hardware=r.hardwareInfo().name;r.dispose();
  return {stats,pictures,hardware};
 },server.url);
 for(const [name,img] of Object.entries(result.pictures))await writeFile(directory+'/'+name+'.png',Buffer.from(img,'base64'));
 delete result.pictures;
 console.log(JSON.stringify(result,null,2));
 await writeFile(directory+'/render.json',JSON.stringify(result,null,2));
 }
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(server.url);
 const mix=page.locator('#controls [data-param=sceneGrains]');
 await mix.waitFor();
 assert.equal(await page.locator('#controls [data-grain-source]').count(),0);
 assert.equal(await page.locator('#controls [data-param=sceneGrains]').count(),1);
 await mix.evaluate(el=>{el.focus();el.value='0.67';for(const type of ['input','change'])el.dispatchEvent(new Event(type,{bubbles:true}));});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('prisma-current-v2')||'{}').state?.sceneGrains===.67);
 await mix.focus();
 await page.keyboard.press('Control+KeyZ');
 await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('prisma-current-v2')||'{}').state?.sceneGrains);
 await page.locator('#controls [data-animate-open=sceneGrains]').click();
 assert.equal(await page.locator('#animation-editor.parameter-animation [data-path-check="motions.sceneGrains.enabled"]').isChecked(),true);
 await page.locator('#animation-editor button[aria-label="Chiudi editor"]').click();
 await page.setViewportSize({width:1600,height:1000});
 const sectionRail=page.locator('#inspector-section-rail');
 await sectionRail.waitFor();
 assert(await sectionRail.locator('button').count()>3);
 const targetSection='Deformazioni e ritagli';
 await sectionRail.getByRole('button',{name:targetSection,exact:true}).click();
 await page.waitForFunction(name=>[...document.querySelectorAll('#controls>details[open]>summary')].some(s=>s.textContent.includes(name)),targetSection);
 const desktop=await page.evaluate(()=>{
  const boxes=['.studio','#inspector-section-rail','.inspector'].map(selector=>document.querySelector(selector).getBoundingClientRect());
  const [scene,index,inspector]=boxes;return {scene:scene.width,rail:index.width,inspector:inspector.width,sameRow:scene.top===inspector.top&&scene.top===index.top,ordered:scene.right<=index.left&&index.right<=inspector.left};
 });
 assert(desktop.sameRow&&desktop.ordered&&desktop.rail<=150&&desktop.inspector>=320&&desktop.inspector<=560,JSON.stringify(desktop));
 await page.screenshot({path:directory+'/editor-desktop.png'});
 await page.locator('#control-level').selectOption('simple');
 await page.reload();
 assert.equal(await page.locator('#control-level').inputValue(),'simple');
 assert.equal(await page.locator('#controls [data-param=sceneGrains]').count(),1);
 await page.setViewportSize({width:390,height:844});
 await page.locator('#control-level').selectOption('expert');
 const mobile=await page.evaluate(()=>{
  const a=document.querySelector('#artboard').getBoundingClientRect();
  const r=document.querySelector('#controls [data-param=sceneGrains]').getBoundingClientRect();
  const parts=Object.fromEntries(['.studio','.stage-toolbar','.viewport','.scene-actions','.description-bar','.inspector','.inspector-search','#tabs','#controls'].map(selector=>{
   const z=document.querySelector(selector).getBoundingClientRect();return [selector,[Math.round(z.top),Math.round(z.height)]];
  }));
  const tools=document.querySelector('.canvas-tools'),box=tools.getBoundingClientRect();
  const toolsReachable=tools.contains(document.elementFromPoint(box.left+box.width/2,box.top+box.height/2));
  return {canvasTop:a.top,sliderTop:r.top,width:document.documentElement.scrollWidth,toolsReachable,parts};
 });
 await page.screenshot({path:directory+'/editor-mobile.png'});
 assert(mobile.canvasTop<120&&mobile.sliderTop<844&&mobile.width<=390&&mobile.toolsReachable,JSON.stringify(mobile));
 await page.locator('.header-actions .workflow-menu > summary').click();
 assert(await page.locator('#playground-open').isVisible());
 await page.locator('.header-actions .workflow-menu > summary').click();
 await page.screenshot({path:directory+'/editor-mobile.png'});
 await page.setViewportSize({width:1280,height:880});
 await page.evaluate(()=>{void window.prismaPlayground.open();});
 await page.waitForFunction(()=>{const s=window.prismaPlayground.getStatus();return s?.decks.A&&s.decks.B;},null,{timeout:120000});
 const visibleOutput=()=>{const mixer=window.prismaPlayground.engine.mixer,c=mixer.canvas,g=mixer.gl;
  if(c.width<10)return false;
  const p=new Uint8Array(4*20);g.readPixels((c.width>>1)-10,c.height>>1,20,1,g.RGBA,g.UNSIGNED_BYTE,p);
  return p.some((x,i)=>i%4!==3&&x>24);
 };
 await page.waitForFunction(visibleOutput,null,{timeout:120000});
 await page.locator('[data-transition-pad=luma]').click();
 assert.equal(await page.locator('[data-transition-pad=luma]').getAttribute('aria-pressed'),'true');
 const reference=await page.evaluate(()=>{
  const pg=window.prismaPlayground,engine=pg.engine;
  pg.setControl('cut.A',1);pg.setControl('fx.output.rgb',.36);
  engine.config.duration=.5;
  pg.setControl('mutate.B.grains',1);pg.setControl('variant.B',.42);
  return pg.getSnapshot();
 });
 assert.equal(reference.liveFx.output.rgb,.36);
 assert(reference.decks.B.state.sceneGrains>0&&reference.decks.B.state.sceneGrains<1);
 await page.waitForFunction(()=>!!window.prismaPlayground.engine.mixer.effects?.finishing,null,{timeout:20000});
 await page.waitForFunction(visibleOutput,null,{timeout:15000});
 await page.evaluate(()=>{const pg=window.prismaPlayground;pg.setControl('flow.enabled',1);pg.setControl('flow.next',1);});
 await page.waitForFunction(()=>window.prismaPlayground.getStatus()?.flow.cycles>=1,null,{timeout:120000});
 const stored=await page.evaluate(()=>window.prismaPlayground.getSnapshot());
 assert.deepEqual(stored.decks.B.state,reference.decks.B.state);
 assert.equal(stored.mix,reference.mix);
 await page.evaluate(()=>window.prismaPlayground.setControl('flow.enabled',0));
 await page.waitForFunction(()=>!window.prismaPlayground.engine?.restoring,null,{timeout:120000});
 const restored=await page.evaluate(()=>window.prismaPlayground.getSnapshot());
 assert.deepEqual(restored.decks.B.state,reference.decks.B.state);
 assert.equal(restored.transition,'luma');
 try{await page.waitForFunction(visibleOutput,null,{timeout:30000});}catch(error){
  const state=await page.evaluate(()=>{const e=window.prismaPlayground.engine;return {mix:e.config.mix,master:e.config.master,blackout:e.config.blackout,error:e.lastRenderError,glError:e.mixer.gl.getError(),lost:e.mixer.gl.isContextLost(),frames:e.mixer.frames,status:window.prismaPlayground.getStatus()};});
  console.log(JSON.stringify({state,errors}));throw error;
 }
 await page.screenshot({path:directory+'/playground-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:directory+'/playground-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('EDITOR E PLAYGROUND',JSON.stringify({mobile,afterFlow:restored.transition,output:'visibile'}));
}finally{await browser.close();await new Promise(resolve=>server.server.close(resolve));}
