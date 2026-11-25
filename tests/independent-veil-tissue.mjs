import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
import {newCreation,normalizeCreation,hasMotion} from '../creative-model.js';
import {applyLivingStyle} from '../living-panel.js';
import {applyVeilLook,beginVeilTransform} from '../veil-model.js';
import {strainPoint} from '../weave-strain.js';
import {junctionPose} from '../weave-junction.js';
import {sampleFrame} from '../solid-renderer.js';

const sphere=newCreation();
assert.equal(sphere.veilAmount,0);
assert.equal(normalizeCreation({...sphere,pVeilMorph:1,pVeilStyle:2}).veilAmount,0);
for(const cloud of [false,true]){
 const s={...newCreation(),engine:cloud?'particles':'solid',grainSource:cloud?'cloud':'body',sceneGrains:cloud?.71:.24};
 const signature=()=>[s.engine,s.grainSource,s.sceneGrains,s.pLiving,s.palette.slice(),s.seed];
 const before=signature();
 applyLivingStyle(s,'veils');
 assert.deepEqual(signature(),before);
 assert.ok(s.veilAmount>0&&hasMotion(s));
 const points=[{at:0,offset:-.2},{at:.5,offset:.3}];
 s.motions.veilAmount={...s.motions.veilAmount,enabled:true,mode:'points',points};
 s.motions.pVeilTwist={...s.motions.pVeilTwist,enabled:true,mode:'points',points};
 const reopened=normalizeCreation(JSON.parse(JSON.stringify(s)));
 for(const key of ['veilAmount','pVeilTwist']){
  assert.deepEqual(reopened.motions[key],s.motions[key]);assert.equal(reopened[key],s[key]);
  assert.ok(Math.abs(sampleFrame(reopened,0)[key]-sampleFrame(reopened,Math.PI)[key])>.4);
 }
 const old=structuredClone(s);beginVeilTransform(old);old.pVeilMorph=.37;old.motions.pVeilMorph.enabled=true;
 const restored=normalizeCreation(old);
 assert.equal(restored.veilAmount,.37);assert.equal(restored.motions.veilAmount.enabled,true);
 assert.equal(restored.engine,s.engine);assert.equal(restored.pLiving,s.pLiving);assert.equal(restored.sceneGrains,s.sceneGrains);
 assert.equal(normalizeCreation(restored).veilAmount,.37);
}
const archived=JSON.parse(await readFile(new URL('../previews/veli-aureole.prisma.json',import.meta.url))).state;
const look=newCreation();applyVeilLook(look,'halo');
for(const raw of [archived,look]){
 const first=normalizeCreation(raw),second=normalizeCreation(JSON.parse(JSON.stringify(first)));
 assert.equal(first.structShell,1);assert.equal(first.pLiving,0);assert.equal(first.veilAmount,0);
 assert.deepEqual(second,first);
}
const tissue={...sphere,structWeaveFlex:1,structWeaveGrowth:.97,structWeaveFront:.07,structWeaveRelease:.12,structFlowPhase:.84,structWeaveReach:.93,structWeaveSpread:.8,_weaveLag:-.22};
const point=[.19,.21,.17];
const a=strainPoint(point,junctionPose(tissue).cage),b=strainPoint(point,junctionPose({...tissue,structWeaveReach:.22}).cage);
assert.ok(Math.hypot(...a.map((v,i)=>v-point[i]))>.004);
assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))>.002);
assert.deepEqual(a,strainPoint(point,junctionPose({...tissue,materialName:'Qualsiasi',name:'Altro progetto'}).cage));
if(!process.argv.includes('--model')){
 const server=await startCreativeServer(0);
 try{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
   const page=await browser.newPage();await page.goto(server.url+'moodboard/');
   const metrics=await page.evaluate(async url=>{
    const [{Renderer},{newCreation,normalizeCreation}]=await Promise.all(['renderer.js','creative-model.js'].map(n=>import(url+n)));
    const canvas=document.createElement('canvas'),r=new Renderer(canvas),out=[];
    const diff=(a,b)=>a.reduce((total,v,i)=>total+Math.abs(v-b[i]),0)/a.length;
    async function draw(s,phase=0){
     const ok=await r.drawTiled(s,phase,160,128,{quality:'fast'});
     if(!ok||r.gl.getError()!==r.gl.NO_ERROR)throw Error('Disegno WebGL incompleto');
     return r.pixels().slice();
    }
    for(const source of ['body','mixed','cloud']){
     const s={...newCreation(),baseForm:source==='body'?2:0,engine:source==='cloud'?'particles':'solid',grainSource:source==='cloud'?'cloud':'body',sceneGrains:source==='body'?0:source==='mixed'?.42:1,pCount:1500,pTrailCount:0,pLinks:0,pVeilLayers:3,pVeilMemory:.3,pVeilStyle:.6,scale:1.2};
     const initial=await draw(s);
     s.veilAmount=.56;const changed=await draw(s);
     const renamed=await draw({...s,materialName:'Qualsiasi',name:'Progetto rinominato'});
     if(diff(initial,changed)<.1||diff(changed,renamed)!==0)throw Error(source+' apertura o dipendenza dal nome');
     const reload=await draw(normalizeCreation(s));
     if(diff(changed,reload)>.02)throw Error(source+' riapertura '+diff(changed,reload));
     const opaque=await draw({...s,pVeilOpacity:.85}),moved=await draw(s,1.3);
     const result={source,effect:diff(initial,changed),opacity:diff(changed,opaque),motion:diff(changed,moved)};
     if(result.opacity<.02||result.motion<.02)throw Error(JSON.stringify(result));
     if(diff(initial,await draw({...s,veilAmount:0}))!==0)throw Error(source+' ritorno alla forma');
     if(diff(changed,await draw(s,2*Math.PI))>.012)throw Error(source+' chiusura loop');
     if(source==='cloud'){
      const frozen={...s,grainMotion:false,grainMotionPhase:.19,veilAmount:1};
      if(diff(await draw(frozen,0),await draw(frozen,1.3))<.02)throw Error('Veli congelati insieme ai granelli');
      const membrane={...s,pLiving:3,pSkin:.72,pStrands:64,pThreadOpacity:.12};
      await draw(membrane,.1);const program=r.impl.veils.program;
      await draw(membrane,.3);
      if(r.impl.veils.program!==program)throw Error('Ricompilazione della membrana a ogni fotogramma');
     }
     if(source==='body'){
      const open=await draw({...s,veilAmount:1}),web=await draw({...s,veilAmount:1,structWeaveNodes:.9,structWeaveCradle:.9,structWeaveMembrane:.6});
      result.web=diff(open,web);
      if(result.web<.02)throw Error('Reticolo sui veli '+result.web);
     }
     out.push(result);
    }
    r.dispose();return out;
   },server.url);
   console.log(metrics);
  }finally{await browser.close();}
 }finally{await new Promise(resolve=>server.server.close(resolve));}
}
console.log('Veli e deformazione elastica verificati su scene indipendenti.');
