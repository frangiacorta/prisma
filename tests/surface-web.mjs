import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readPreset} from '../preset-files.js';
import {sampleFrame} from '../solid-renderer.js';
import {surfaceWebGraph,surfaceWebStrength,surfaceWebWeights} from '../surface-web-model.js';

const surface={engine:'solid',grainSource:'body',structWeaveCradle:.6,structWeaveNodes:.8,structWeaveMembrane:.3};
assert.deepEqual(surfaceWebWeights(surface),[.6,.8,.3]);
assert.equal(surfaceWebStrength({}),0);
const woven={...surface,structFibres:1,structWeft:1,structShell:1};
assert.deepEqual(surfaceWebWeights(woven),[.6,0,0]);
assert.equal(surfaceWebStrength({...woven,structWeaveBranching:1,structWeaveTension:1}),0);
assert.deepEqual(surfaceWebWeights({...woven,grainSource:'cloud'}),[.6,.8,.3]);
assert.equal(surfaceWebStrength({...surface,grainSource:'cloud',pCount:0}),0);

// Existing reference animation keeps its original, explicitly modelled junctions on every frame.
const {state}=readPreset(await readFile(new URL('../previews/reticolo-giunzioni.prisma.json',import.meta.url),'utf8'));
for(let f=0;f<=60*state.duration;f++){
 const s=sampleFrame(state,2*Math.PI*f/(60*state.duration));
 assert.equal(surfaceWebStrength(s),0,'duplicate reference geometry at frame '+f);
}

// The implicit sampler marks a missed surface with an invalid point. Even a
// single miss must not draw a triangle to the fallback coordinate at infinity.
const count=80,rest=new Float32Array(8*count);
for(let i=0;i<count;i++){
 const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*2.399963;
 rest.set([r*Math.cos(a),y,r*Math.sin(a),i%9===0?0:1],8*i);
}
const first=surfaceWebGraph(rest,count);
assert.deepEqual(first,surfaceWebGraph(rest,count));
assert(first.faces.length&&first.edges.length&&first.points.length);
for(const buffer of Object.values(first)){
 for(let i=0;i<buffer.length;i+=4)for(let j=0;j<3;j++)assert(rest[8*buffer[i+j]+3]);
}
// The graph stays fixed when the branching value is animated. Optional
// stitches grow in every third of its range and share their two anchors.
for(const buffer of [first.edges,first.faces]){
 const tiers=new Set();
 for(let i=3;i<buffer.length;i+=4)tiers.add(Math.round(3*buffer[i]));
 assert.deepEqual([...tiers].sort((a,b)=>a-b),[-3,0,1,2]);
}
assert.notDeepEqual(surfaceWebGraph(rest,count,.55).edges,first.edges);
const beads=surfaceWebGraph(rest,count,1,false);
assert.deepEqual(beads.points,first.points);assert.equal(beads.faces.length+beads.edges.length,0);
console.log('Reticolo su forma e nuvola, connettività, identità dei campioni e compatibilità dei 1.801 fotogrammi verificati.');

// Exercise the visible geometry alone so a change to the underlying body
// cannot make a dead network control pass. Run with --render and Chrome.
if(process.argv.includes('--render')){
 const {chromium}=await import('playwright');
 const {fileURLToPath}=await import('node:url');
 const source=new URL('../surface-web.js',import.meta.url);
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({serviceWorkers:'block'});
  await page.route('http://localhost:8247/**',route=>{
   const path=new URL(route.request().url()).pathname;
   return path==='/'?route.fulfill({body:'<!doctype html>'}):route.fulfill({path:fileURLToPath(new URL(path.slice(1),source))});
  });
  await page.goto('http://localhost:8247');
  const results=await page.evaluate(async()=>{
   const {newCreation}=await import('/creative-model.js'),{Renderer}=await import('/renderer.js');
   const renderer=new Renderer(document.createElement('canvas')),gl=renderer.gl,w=234,h=222;
   const results={};
   const image=async(s,phase=0)=>{
    if(!await renderer.drawAccumulated(s,phase,w,h,{quality:'full',samples:1}))throw Error('Incomplete frame');
    const web=renderer.impl.surfaceWeb||renderer.implementations.particles.surfaceWeb;
    gl.bindFramebuffer(gl.FRAMEBUFFER,web.layer.fbo);
    const pixels=new Float32Array(4*w*h);
    gl.readPixels(0,0,w,h,gl.RGBA,gl.FLOAT,pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    if(gl.getError())throw Error('WebGL readback failed');
    return {pixels,graph:web.key};
   };
   const difference=(a,b)=>a.pixels.reduce((total,value,i)=>total+Math.abs(value-b.pixels[i]),0);
   for(const name of ['cube','cloud']){
    const solid=name==='cube';
    const s={...newCreation(),engine:solid?'solid':'particles',grainSource:solid?'body':'cloud',sceneGrains:solid?0:1,
     pCount:1800,scale:1.4,rotateY:36,rotateX:22,baseForm:solid?2:0,pLighting:1,structDensity:23,structWeaveCradle:.92,
     structWeaveNodes:.92,structWeaveMembrane:.42,structWeaveGrowth:.73,structWeaveCup:.63,structDelay:.68,structWeaveCupSize:1.32};
    const initial=await image(s);
    const report={};results[name]=report;
    for(const [low,high] of [[.18,.27],[.5,.57],[.85,.92]]){
     const a=await image({...s,structWeaveBranching:low}),b=await image({...s,structWeaveBranching:high});
     if(a.graph!==b.graph)throw Error('Branching rebuilt the neighbour graph');
     report['branch '+low]=difference(a,b);
    }
    for(const [key,value] of Object.entries({structWeaveSlope:.8,structWeaveArch:-.72,structWeaveHierarchy:.93,structWeaveRootBend:.55,
     structWeaveTipBend:-.62,structWeaveSpread:.42,structWeaveReach:1.6,structWeaveFront:.86,structWeaveRearX:1,structWeaveRearY:1,structWeaveCupLight:1.45})){
     report[key]=difference(initial,await image({...s,[key]:value}));
    }
    const membrane={...s,structWeaveMembrane:1,structWeaveCradle:0,structWeaveNodes:0,structWeaveGrowth:0,pFiberSheen:0};
    const plainSheet=await image(membrane);
    for(const [key,value] of [['structThreadWidth',.8],['structWeaveAlignment',1]]){
     report['membrane / '+key]=difference(plainSheet,await image({...membrane,[key]:value}));
    }
    for(const [label,dark] of [['no lamps',{lights:[],emission:.35}],['unlit',{pLighting:0}]]){
     const state={...s,...dark};
     report[label]=difference(await image(state),await image({...state,structWeaveCupLight:1.5}));
    }
    const moving={...s,structWeaveFlex:.76},start=await image(moving,0);
    report.motion=difference(start,await image(moving,1.2));
    report.seam=difference(start,await image(moving,2*Math.PI));
   }
   renderer.dispose();return results;
  });
  console.log(JSON.stringify(results));
  for(const [name,report] of Object.entries(results))for(const [key,value] of Object.entries(report)){
   if(['no lamps','unlit','seam'].includes(key))assert(value<.01,name+' / '+key+': '+value);
   else assert(value>.1,name+' / '+key+': '+value);
  }
 }finally{await browser.close();}
}
