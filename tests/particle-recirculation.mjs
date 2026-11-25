import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {newCreation,normalizeCreation} from '../creative-model.js';
import {particleCreation,SPHERE_FORM} from '../particle-model.js';
import {presetDocument,readPreset} from '../preset-files.js';

// Ordinary user projects, created entirely with editor controls. No reference footage or baked frames.
const ordinary=normalizeCreation(particleCreation(newCreation(),2,321));
const common={...newCreation(),...SPHERE_FORM,sceneGrains:1,grainMotion:true,grainDispersal:1,
  pCount:17500,pSize:4.5,pSizeVar:.25,pOpacity:.65,pSoftness:1,pFill:.08,pThickness:.58,
  pOpening:.15,pCounterflow:.65,pTravel:.7,pVortex:.18,pCycles:1,pSignal:0,pSpeedSpread:0,
  pTrailCount:0,pTrailLength:0,pLinks:0,pLiving:0,pRhythm:0,pPause:0,pSizeSpread:0,
  rotateX:33,rotateY:18,rotateZ:9,scale:1.25,palette:['#c2af9e','#efe3da'],
  seed:4103,duration:10,motionPeriod:10,perfectLoop:true,animateRotation:false,animateShape:false,
  animateColor:false,animateLight:false,background:'#000000',background2:'#000000'};
const scenes={cloud:normalizeCreation({...common,engine:'particles',grainSource:'cloud'}),
  cube:normalizeCreation({...common,engine:'solid',grainSource:'body',baseForm:2,grainDispersal:.72})};
const reopened=state=>readPreset(JSON.stringify(presetDocument({state,name:'Independent material study'}))).state;
const animated=reopened({...scenes.cloud,pReentry:1.5,pSoftness:1.82,motions:{...scenes.cloud.motions,
  pReentry:{...scenes.cloud.motions.pReentry,enabled:true,mode:'points',points:[{at:0,offset:-.4},{at:.5,offset:.4}]}}});
assert.equal(animated.pSoftness,1.82);
assert.deepEqual(animated.motions.pReentry.points,[{at:0,offset:-.4},{at:.5,offset:.4}]);
const root=new URL('../',import.meta.url);
const origin='http://localhost:8453/';
const executablePath=process.env.PRISMA_BROWSER_EXECUTABLE;
const browser=await chromium.launch(executablePath?{executablePath}:{channel:'chrome'});
try{
    const page=await browser.newPage({serviceWorkers:'block'});
    await page.route(origin+'**',route=>{
      const {pathname}=new URL(route.request().url());
      if(pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html>'});
      if(!/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.js$/.test(pathname))return route.abort();
      return route.fulfill({path:fileURLToPath(new URL(pathname.slice(1),root)),contentType:'text/javascript'});
    });
    await page.goto(origin);
    const report=await page.evaluate(async ({scenes,ordinary,ordinaryReloaded,animated})=>{
      const {Renderer,sampleFrame}=await import('/renderer.js');
      const renderer=new Renderer(document.createElement('canvas'));
      const T=2*Math.PI,w=192,h=224;
      const expect=(condition,message)=>{if(!condition)throw Error(message);};
      async function render(state,phase=0){
        const ok=await renderer.drawAccumulated(state,phase,w,h,{quality:'full',samples:1});
        const pixels=renderer.pixels();
        expect(ok&&!renderer.gl.isContextLost()&&renderer.gl.getError()===renderer.gl.NO_ERROR,'WebGL draw failed');
        return Float32Array.from({length:w*h},(_,i)=>.2126*pixels[4*i]+.7152*pixels[4*i+1]+.0722*pixels[4*i+2]);
      }
      const difference=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
      const energy=frame=>frame.reduce((sum,v)=>sum+v,0)/frame.length;
      // Neutral test grains: decode display sRGB before comparing integrated light.
      const linearLight=frame=>frame.reduce((sum,v)=>{
        const value=v/255;
        return sum+(value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4));
      },0);
      function roughness(frame){
        let variation=0;
        for(let y=1;y<h;y++)for(let x=1;x<w;x++){
          const i=y*w+x;
          variation+=Math.abs(frame[i]-frame[i-1])+Math.abs(frame[i]-frame[i-w]);
        }
        return variation/(2*frame.length*energy(frame));
      }
      try{
        const stock=await render(ordinary,.7),results={};
        for(const [name,scene] of Object.entries(scenes)){
          const rolled={...scene,pReentry:2},off=await render({...scene,pReentry:0});
          const threshold=await render({...scene,pReentry:1});
          const start=await render(rolled),later=await render(rolled,T*.25);
          // Use a sparse field to measure edge filtering without overlapping bright points clipping to white.
          const sparse={...rolled,pCount:4500,pOpacity:.36,pLighting:0,palette:['#eeeeee']};
          const sharp=await render({...sparse,pSoftness:1},T*.25),soft=await render({...sparse,pSoftness:1.85},T*.25);
          const diffuse=await render({...sparse,pSoftness:1.65},T*.25);
          const directional={...sparse,pSoftness:1.85,anisotropy:.55,anisotropyAngle:0};
          const aligned=await render(directional,T*.25);
          const seam=difference(start,await render(rolled,T));
          const step=T/240;
          const beforeSeam=difference(await render(rolled,T-step),start);
          const afterSeam=difference(await render(rolled,step),start);
          const frozen={...rolled,grainMotion:false,grainMotionPhase:.25};
          const frozenDiff=difference(await render(frozen,0),await render(frozen,T*.45));
          const fixed={...rolled,grainDispersal:0};
          const pinnedDiff=difference(await render(fixed,.9),await render({...fixed,pReentry:0},.9));
          const result={activation:difference(off,start),extendedRange:difference(threshold,start),
            opening:difference(later,await render({...rolled,pOpening:.7},T*.25)),
            motion:difference(start,later),seam,beforeSeam,afterSeam,frozenDiff,pinnedDiff,
            softness:difference(sharp,soft),detailRatio:roughness(soft)/roughness(sharp),
            extendedSoftness:difference(diffuse,soft),softEnergyRatio:linearLight(soft)/linearLight(diffuse),
            anisotropy:difference(soft,aligned),orientation:difference(aligned,await render({...directional,anisotropyAngle:90},T*.25))};
          results[name]=result;
          const reason=()=>`${name}: ${JSON.stringify(result)}`;
          expect(energy(start)>1&&energy(soft)>1,reason());
          expect(result.activation>.5&&result.extendedRange>.5&&result.opening>.5&&result.motion>.5,reason());
          expect(seam<.04&&Math.max(beforeSeam,afterSeam)<result.motion*.65&&
            Math.max(beforeSeam,afterSeam)<2.5*Math.min(beforeSeam,afterSeam)+.1,reason());
          expect(frozenDiff<.025&&pinnedDiff<.025,reason());
          expect(result.softness>.1&&result.extendedSoftness>.1&&result.detailRatio<.94&&
            result.softEnergyRatio>.8&&result.softEnergyRatio<1.2,reason());
          expect(result.anisotropy>.1&&result.orientation>.1,reason());
        }
        const staticTrack={...animated,motions:{...animated.motions,pReentry:{...animated.motions.pReentry,enabled:false}}};
        const animatedMetrics=[];
        for(const phase of [0,Math.PI]){
          const expected=sampleFrame(animated,phase).pReentry;
          expect(Math.abs(expected-(phase===0?1.1:1.9))<1e-6,'Track sampling '+expected);
          const image=await render(animated,phase);
          const baked=difference(image,await render({...staticTrack,pReentry:expected},phase));
          const disabled=difference(image,await render(staticTrack,phase));
          expect(baked<.025&&disabled>.3,`Parameter animation: baked=${baked} disabled=${disabled}`);
          animatedMetrics.push({phase,expected,baked,disabled});
        }
        const stockDrift=difference(stock,await render(ordinaryReloaded,.7));
        expect(energy(stock)>1&&stockDrift<.025,'Existing preset save/reload or renderer-state leak: '+stockDrift);
        return {scenes:results,animated: animatedMetrics,ordinaryPresetDrift:stockDrift};
      }finally{renderer.dispose();}
    },{scenes,ordinary,ordinaryReloaded:reopened(ordinary),animated});
    console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
