import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
const membrane=readPreset(await readFile(new URL('previews/membrana-ricircolo.prisma.json',root),'utf8')).state;
const origin='http://localhost:8453/';
const executablePath=process.env.PRISMA_BROWSER_EXECUTABLE;
const browser=await chromium.launch(executablePath?{executablePath}:{channel:'chrome'});
try{
    const page=await browser.newPage({serviceWorkers:'block'});
    page.on('console',msg=>{if(/GL_INVALID|WebGL:.*INVALID/.test(msg.text()))console.error(msg.text());});
    await page.route(origin+'**',route=>{
      const {pathname}=new URL(route.request().url());
      if(pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html>'});
      if(!/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.js$/.test(pathname))return route.abort();
      return route.fulfill({path:fileURLToPath(new URL(pathname.slice(1),root)),contentType:'text/javascript'});
    });
    await page.goto(origin);
    const report=await page.evaluate(async ({scenes,ordinary,ordinaryReloaded,animated,membrane})=>{
      const {Renderer,sampleFrame}=await import('/renderer.js');
      const {presetDocument,readPreset}=await import('/preset-files.js');
      const renderer=new Renderer(document.createElement('canvas'));
      const T=2*Math.PI,w=192,h=224;
      const expect=(condition,message)=>{if(!condition)throw Error(message);};
      async function renderPixels(state,phase=0,width=w,height=h){
        const ok=await renderer.drawAccumulated(state,phase,width,height,{quality:'full',samples:1});
        const glError=renderer.gl.getError(),lost=renderer.gl.isContextLost();
        expect(ok&&!lost&&glError===renderer.gl.NO_ERROR,
          `WebGL draw failed (complete=${ok}, lost=${lost}, error=${glError}, origin=${state.grainSource}, return=${state.pReentry}, spread=${state.dispersion}, phase=${phase})`);
        return renderer.pixels();
      }
      async function render(state,phase=0){
        const pixels=await renderPixels(state,phase);
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
      // R-G and B-G remove changes that only brighten or move a neutral scene.
      // Compare each illuminated pose with the same pose rendered without optics.
      function chroma(pixels){
        const values=new Float32Array(pixels.length/2);
        for(let i=0;i<pixels.length;i+=4){
          values[i/2]=pixels[i]-pixels[i+1];
          values[i/2+1]=pixels[i+2]-pixels[i+1];
        }
        return values;
      }
      function upperChroma(a,b){
        const values=a.map((v,i)=>Math.abs(v-b[i])).sort();
        return values[Math.floor(.997*values.length)];
      }
      async function denseFoldResponse(state){
        // Reproduce the thin black line seen at 8.125 s. Along the same lit
        // crease, doubling grain opacity must not extinguish overlapping emitters.
        const width=592,height=732,phase=8.125/state.duration*T;
        const thin=await renderPixels({...state,pOpacity:state.pOpacity/2},phase,width,height);
        const thick=await renderPixels(state,phase,width,height);
        // Image coordinates of the affected diagonal in the authored camera.
        const trace=[[389,326],[411,356],[427,385],[442,414],[457,445],[473,475]];
        let minimum=Infinity,total=0,patches=0;
        for(let k=1;k<trace.length;k++){
          const [x0,y0]=trace[k-1],[x1,y1]=trace[k];
          for(let y=y0;y<y1;y+=2){
            const center=Math.round(x0+(x1-x0)*(y-y0)/(y1-y0));
            for(let x=center-8;x<=center+8;x+=2){
              let gain=0;
              for(let iy=y-1;iy<=y+1;iy++)for(let ix=x-1;ix<=x+1;ix++){
                const i=(iy*width+ix)*4;
                gain+=.2126*(thick[i]-thin[i])+.7152*(thick[i+1]-thin[i+1])+.0722*(thick[i+2]-thin[i+2]);
              }
              gain/=9;minimum=Math.min(minimum,gain);total+=gain;patches++;
            }
          }
        }
        const mean=total/patches;
        expect(minimum>=-1.5&&mean>1,'Local brightness inversion on overlapping grains: '+JSON.stringify({minimum,mean,patches}));
        return {minimum,mean,patches};
      }
      async function savedColorTracks(scene){
        // Fixed geometry and an intrinsically coloured material let each track
        // prove its own visible contribution even if the other one works.
        const base={...scene,grainMotion:false,grainMotionPhase:.17,pReentry:2,pLighting:1,
          palette:['#5188cd','#dba46e'],metal:0,transparency:.45,finishEnabled:true,finishTone:true,
          saturation:.8,iridescence:.45,iridScale:2};
        const offsets={saturation:[-.55,.75],iridescence:[-.4,.5]};
        const tracks={...base.motions};
        for(const [key,[low,high]] of Object.entries(offsets)){
          tracks[key]={...tracks[key],enabled:true,mode:'points',points:[{at:.125,offset:low},{at:.625,offset:high}]};
        }
        const doc=presetDocument({state:{...base,motions:tracks},name:'Colour on a stationary fold'});
        const saved=readPreset(JSON.stringify(doc)).state;
        const manual={...saved,motions:{...saved.motions}};
        for(const key of Object.keys(offsets)){
          const track=saved.motions[key];
          expect(track?.enabled&&track.mode==='points'&&JSON.stringify(track.points)===JSON.stringify(tracks[key].points),
            key+' motion points lost after reopening '+scene.grainSource);
          manual.motions[key]={...track,enabled:false};
        }
        const values=[],peaks={};
        for(const [i,time] of [.125,.375,.625].entries()){
          const phase=time*T,frame=sampleFrame(saved,phase),patch={};
          for(const [key,[low,high]] of Object.entries(offsets)){
            patch[key]=base[key]+[low,(low+high)/2,high][i];
            expect(Math.abs(frame[key]-patch[key])<1e-6,key+' at '+time+' was '+frame[key]);
          }
          const actual=await renderPixels(saved,phase);
          expect(difference(actual,await renderPixels({...manual,...patch},phase))<.03,
            'Reopened tracks differ from manual material at '+time);
          if(i===2)for(const [key,[low]] of Object.entries(offsets)){
            const oneLow=await renderPixels({...manual,...patch,[key]:base[key]+low},phase);
            peaks[key]=difference(chroma(actual),chroma(oneLow));
            expect(peaks[key]>.06,key+' changed the number but not the colour of '+scene.grainSource);
          }
          values.push(patch);
        }
        return {values,peaks};
      }
      async function optics(scene){
        const key={...scene.lights[0],enabled:true,visible:false,type:'circle',color:'#ffffff',x:-2.4,y:1,z:2.1,power:4,size:.55};
        const side={...key,id:2,x:2.6,y:-1.3,z:-1.65,power:2.4};
        const glass={...scene,palette:['#909090'],internalColor:'#ffffff',sssColor:'#ffffff',background:'#000000',
          pReentry:2,pSoftness:1.45,pColorScatter:0,pLighting:1,transparency:.68,metal:0,roughness:.23,gloss:.82,
          refraction:1.53,dispersion:0,iridescence:0,iridScale:2,pFilm:0,thinFilm:0,emission:0,
          environmentPower:0,environmentRefraction:0,pFiberSheen:0,finishEnabled:false,lights:[key]};
        const frozen={...glass,grainMotion:false,grainMotionPhase:.17};
        async function spectral(s,phase){
          const off=await renderPixels(s,phase);
          const base=chroma(off);
          const delta=async patch=>{
            const pixels=await renderPixels({...s,...patch},phase);
            return chroma(pixels).map((value,i)=>value-base[i]);
          };
          return {off,base,disp:await delta({dispersion:.82}),irid:await delta({iridescence:1})};
        }
        const neutral=new Float32Array(w*h*2);
        const front=await spectral(frozen,0);
        const back=await spectral({...frozen,lights:[side]},0);
        const rotated=await spectral({...frozen,rotateX:-47,rotateY:82},0);
        // The spectral response marks pixels on the illuminated return lip.
        // Compare absorption at a fixed pose under a neutral, rear-side lamp.
        const transmission={...frozen,lights:[side],dispersion:.82,thickness:1.8};
        const mixing=[];
        for(const [portion,yaw] of [[1,0],[1,48],[.5,0],[.995,48]]){
          const s={...transmission,absorption:1,sceneGrains:portion,rotateY:transmission.rotateY+yaw};
          const light=await renderPixels(s);
          // Isolate the attenuation of stacked grains. Single-grain shading
          // and any opaque surface in the transition stay in both renders.
          const impl=renderer.select({engine:'particles'}),set=impl.u;
          let suppressed=0;
          try{
            impl.u=function(program,key,...values){
              if(key==='uSheetResolve'&&values[0]>0){values[0]=0;suppressed++;}
              return set.call(this,program,key,...values);
            };
            const direct=await renderPixels(s);
            const signal=difference(light,direct);
            expect(suppressed&&signal>.01,'Missing optical accumulation: '+JSON.stringify({origin:scene.grainSource,portion,yaw,signal}));
            mixing.push({portion,yaw,signal});
          }finally{impl.u=set;}
        }
        const absorptionFrames=[];
        for(const absorption of [0,.5,1])absorptionFrames.push(await renderPixels({...transmission,absorption}));
        let foldPixels=0;
        const foldLuminance=[0,0,0];
        for(let i=0;i<w*h;i++){
          if(Math.max(Math.abs(back.disp[i*2]),Math.abs(back.disp[i*2+1]))<8)continue;
          for(const [j,image] of absorptionFrames.entries()){
            foldLuminance[j]+=.2126*image[i*4]+.7152*image[i*4+1]+.0722*image[i*4+2];
          }
          foldPixels++;
        }
        for(let i=0;i<foldLuminance.length;i++)foldLuminance[i]/=Math.max(1,foldPixels);
        const movingA=await spectral(glass,.58),movingB=await spectral(glass,2.4);
        const combined={...frozen,dispersion:.82,iridescence:.9};
        const ordered=await renderPixels({...combined,lights:[key,side]});
        const reversed=await renderPixels({...combined,lights:[side,key]});
        const sideOnly=await renderPixels({...combined,lights:[side]});
        const darkFirst=await renderPixels({...combined,lights:[{...key,power:0},side]});
        const sharedPower=[{...side,power:side.power/2},{...side,id:3,power:side.power/2}];
        const splitPower=await renderPixels({...combined,lights:sharedPower});
        const sameFrozen=await renderPixels(combined,T*.41);
        const afterEdits=await renderPixels(combined,0);
        const reset=await renderPixels(frozen,0);
        const unlit={...frozen,pLighting:0};
        const unlitChange=difference(await renderPixels(unlit),await renderPixels({...unlit,iridescence:1,dispersion:.82}));
        const opaque={...frozen,transparency:0};
        const opaqueDispersion=difference(await renderPixels(opaque),await renderPixels({...opaque,dispersion:.82}));
        const dark={...frozen,lights:[{...key,power:0}]};
        const darkBase=await renderPixels(dark);
        const darkDispersion=difference(darkBase,await renderPixels({...dark,dispersion:.82}));
        const redRig={...frozen,lights:[{...side,color:'#ff0000'}]};
        const redOff=await renderPixels(redRig),redLight=await renderPixels({...redRig,dispersion:.82});
        let redEnergy=0,offBandEnergy=0;
        for(let i=0;i<redLight.length;i+=4){
          redEnergy+=Math.abs(redLight[i]-redOff[i]);
          offBandEnergy+=Math.abs(redLight[i+1]-redOff[i+1])+Math.abs(redLight[i+2]-redOff[i+2]);
        }
        // Measure light deposited into the dust, including dust seen through an
        // opening. A silhouette mask cannot distinguish it from foreground grains.
        const dust={...frozen,lights:[side],pCloudHalo:.22,pCloudRadius:.65,pSprite:0,pCaustic:0,pShadow:0,
          scattering:.08,thickness:1.8,refraction:1.35,transparency:.48};
        async function projected(state){
          const actual=await renderPixels(state),gl=renderer.gl;
          const draw=gl.drawArraysInstanced,locations=new WeakMap();
          let passes=0;
          try{
            gl.drawArraysInstanced=function(...args){
              const program=gl.getParameter(gl.CURRENT_PROGRAM);
              if(!locations.has(program))locations.set(program,gl.getUniformLocation(program,'uFoldScatter'));
              const location=locations.get(program);
              if(location&&gl.getUniform(program,location)>0){passes++;return;}
              return draw.apply(gl,args);
            };
            const control=await renderPixels(state);
            return {passes,light:Float32Array.from(actual,(value,i)=>value-control[i])};
          }finally{gl.drawArraysInstanced=draw;}
        }
        const photons=await projected({...dust,dispersion:1});
        const clear=await projected({...dust,dispersion:1,scattering:0});
        const red=await projected({...dust,dispersion:1,lights:redRig.lights});
        const zero=await projected(dust),darkProjection=await projected({...dust,lights:[],dispersion:1});
        const dustDark=await renderPixels({...dust,lights:[],dispersion:1});
        const darkDustControl=await renderPixels({...dust,lights:[]});
        let dustPixels=0,dustChroma=0,dustScattering=0,dustRedEnergy=0,dustOtherEnergy=0;
        for(let i=0;i<photons.light.length;i+=4){
          const [rr,gg,bb]=photons.light.subarray(i,i+3);
          if(Math.max(Math.abs(rr),Math.abs(gg),Math.abs(bb))<3)continue;
          dustChroma+=(Math.abs(rr-gg)+Math.abs(bb-gg))/2;
          const r=rr-clear.light[i],g=gg-clear.light[i+1],b=bb-clear.light[i+2];
          dustScattering+=(Math.abs(r-g)+Math.abs(b-g))/2;
          dustRedEnergy+=Math.abs(red.light[i]);
          dustOtherEnergy+=Math.abs(red.light[i+1])+Math.abs(red.light[i+2]);
          dustPixels++;
        }
        // Author an editable 0→peak→0 cycle. A manual pair of control values
        // at each endpoint must give the same pixels, even while grains move.
        const crest={dispersion:.82,iridescence:.92};
        const tracks={...glass.motions};
        for(const [k,peak] of Object.entries(crest)){
          tracks[k]={...tracks[k],enabled:true,mode:'points',points:[{at:0,offset:0},{at:.5,offset:peak}]};
        }
        const keyed={...glass,motions:tracks};
        const start=await renderPixels(keyed,0),peak=await renderPixels(keyed,T*.5),end=await renderPixels(keyed,T);
        const manual=await renderPixels({...glass,...crest},T*.5);
        return {neutralChroma:difference(front.base,neutral),frozenDispersion:difference(front.disp,neutral),
          frozenIridescence:difference(front.irid,neutral),lightDispersion:difference(front.disp,back.disp),
          lightIridescence:difference(front.irid,back.irid),viewDispersion:difference(front.disp,rotated.disp),
          lightFringe:upperChroma(front.disp,back.disp),viewFringe:upperChroma(front.disp,rotated.disp),
          viewIridescence:difference(front.irid,rotated.irid),motionDispersion:difference(movingA.disp,movingB.disp),
          motionIridescence:difference(movingA.irid,movingB.irid),lightOrder:difference(ordered,reversed),
          zeroPowerLight:difference(sideOnly,darkFirst),powerSplit:difference(sideOnly,splitPower),paused:difference(sameFrozen,afterEdits),
          zeroReset:difference(front.off,reset),unlitChange,opaqueDispersion,darkDispersion,
          foldPixels,foldLuminance,mixing,
          redLampSignal:redEnergy/(w*h),redLampLeak:offBandEnergy/Math.max(1,redEnergy),dustPixels,
          dustPasses:photons.passes,zeroDustPasses:zero.passes,darkDustPasses:darkProjection.passes,
          dustChroma:dustChroma/Math.max(1,dustPixels),dustScattering:dustScattering/Math.max(1,dustPixels),
          redDustSignal:dustRedEnergy/Math.max(1,dustPixels),redDustLeak:dustOtherEnergy/Math.max(1,dustRedEnergy),
          darkDustDispersion:difference(dustDark,darkDustControl),
          keyedZero:difference(start,await renderPixels(glass,0)),
          keyedPeak:difference(peak,manual),keyedSeam:difference(start,end),keyedChange:difference(peak,await renderPixels(glass,T*.5))};
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
          result.optics=await optics(scene);
          result.savedColor=await savedColorTracks(scene);
          const optical=result.optics;
          expect(optical.neutralChroma<.1&&optical.paused<.03&&optical.zeroReset<.03,reason());
          expect(optical.unlitChange<.03&&optical.opaqueDispersion<.03&&optical.darkDispersion<.03&&optical.keyedZero<.03&&
            optical.keyedPeak<.03&&optical.keyedSeam<.03&&optical.keyedChange>.08,reason());
          for(const k of ['frozenDispersion','frozenIridescence','lightDispersion','lightIridescence','viewDispersion',
            'viewIridescence','motionDispersion','motionIridescence'])expect(optical[k]>.06,reason());
          expect(optical.lightFringe>5&&optical.viewFringe>5,reason());
          const [bright,medium,absorbed]=optical.foldLuminance;
          expect(optical.foldPixels>25&&bright>medium+.2&&medium>absorbed+.2,reason());
          expect(optical.redLampSignal>.05&&optical.redDustSignal>.3&&optical.redLampLeak<.1&&optical.redDustLeak<.1,reason());
          expect(optical.dustPixels>20&&optical.dustChroma>.5&&optical.dustScattering>.1&&optical.darkDustDispersion<.03,reason());
          expect(optical.dustPasses>0&&optical.zeroDustPasses===0&&optical.darkDustPasses===0,reason());
          expect(optical.lightOrder<.04&&optical.zeroPowerLight<.04&&optical.powerSplit<.04,reason());
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
        return {scenes:results,animated:animatedMetrics,ordinaryPresetDrift:stockDrift,denseFold:await denseFoldResponse(membrane)};
      }finally{renderer.dispose();}
    },{scenes,ordinary,ordinaryReloaded:reopened(ordinary),animated,membrane});
    console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
