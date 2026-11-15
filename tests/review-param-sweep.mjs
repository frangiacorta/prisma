import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);

const out='reports/review-v86';
await mkdir(out,{recursive:true});
const server=await startCreativeServer(0);
const browser=await chromium.launch({channel:'chrome',headless:true});
const search=process.argv.find(arg=>arg.startsWith('--key='))?.slice(6)||'';
const lastPass=process.argv.includes('--last-pass'),unresolved=lastPass||process.argv.includes('--unresolved');
const former=unresolved?JSON.parse(await readFile(out+'/parametri'+(lastPass?'-ripetuti':'')+'.json','utf8')).rows:[];
try{
 const page=await browser.newPage();
 page.on('console',entry=>{if(entry.type()==='log')console.log(entry.text());});
 await page.goto(server.url+'moodboard/');
 const rows=[];
 for(const engine of ['solid','particles']){
  const result=await page.evaluate(async ({base,engine,search,unresolved})=>{
   const {newCreation}=await import(base+'creative-model.js');
   const {particleCreation}=await import(base+'particle-model.js');
   const {Renderer}=await import(base+'renderer.js');
   const {parameterCatalog,writeParameter}=await import(base+'playground-model.js');
   const {controlCondition,conditionActivation}=await import(base+'control-help.js');
   const s=newCreation(),p=particleCreation(s);
   const start={...(engine==='solid'?s:p),renderVersion:2,
    palette:['#bf704e','#59b1cb','#c9c5ae'],background:'#262734',background2:'#080c13',bgMode:'gradient',
    pCount:2600,pTrailCount:0,pLinks:0,pLighting:1,pOpacity:.78,pSize:3,duration:4,motionPeriod:4,
    light2:false,exposure:.1};
   const r=new Renderer(document.createElement('canvas'));
   const outcomes=[];
   const meaningful=(a,b)=>{
    let sum=0,visible=0,max=0;
    for(let i=0;i<a.length;i+=4){
     const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]),Math.abs(a[i+3]-b[i+3]));
     sum+=d;max=Math.max(max,d);if(d>=3)visible++;
    }
    return [Math.round(1000*sum/(a.length/4))/1000,Math.round(10000*visible/(a.length/4))/100,max];
   };
   const retry=unresolved&&new Set(unresolved);
   const vars=parameterCatalog(start).filter(p=>!p.path.includes('.')&&(!search||new RegExp(search,'i').test(p.path))&&(!retry||retry.has(p.path)));
   const draw=async (sc,phase,size)=>{
    const begun=performance.now(),options={preview:true,quality:'fast',trackTiming:false,geometryBudget:.45,liveDynamics:!!sc.finishFeedback,cancelled:()=>performance.now()-begun>95000};
    if(!await r.prepareAsync(sc,phase,options)||!r.draw(sc,phase,size,size,options)||!await r.waitForGpu(options))throw Error('Tempo di preparazione');
    const error=r.gl.getError();if(error)throw Error('WebGL '+error);
    return r.pixels();
   };
   const models={
    film:{thinFilm:.72,pFilm:.72,filmPattern:.57,filmFlow:.4,filmSwirl:.3,filmDuo:.55,filmChroma:.7,iridescence:.54},
    fil:{filLength:.42,filCount:1600,filWidth:.024,filWind:.45,filPulse:.8,filClump:.51,filPhase:.19,filBranchAmount:.44,filBaseWidth:.45,filColor:.8,transparency:.18},
    struct:{structShell:.79,structThickness:.14,structFibres:.61,structWeft:.64,structWeaveVariation:.55,structWeaveNodes:.55,structWeave:.045,structScallop:.3,structRadial:.55,structLayers:.48,structSlices:.5,structCoreDark:.6,structBreath:.24,structFlap:.26,structFold:.28,structStagger:.28},
    cell:{cellMorph:.8,cellBubbles:.74,cellSpines:.76,cellClarity:.53,cellPearl:.66,cellBreath:.44,cellFlex:.45},
    loop:{loopAmount:1,loopKnot:.61,loopTube:.19,loopTwist:.4,loopFlat:.47,loopBands:.7},
    pTrail:{pTrailCount:150,pTrailOpacity:.85,pTrailWidth:2,pTrailFork:.68,pTrailPulse:1.2,pTravel:.6},
    pLink:{pLinks:.78,pLinkNodes:160,pLinkNeighbors:3,pLinkReach:1.3,pLinkSurface:.8,pLinkWidth:2,pLinkCurve:.32,grainDispersal:.18},
    pCell:{pCellAmount:.75,pCellRelief:.52,pCellLight:.5,pOrganic:.28,grainDispersal:.22,pSize:6},
    pSkin:{pLiving:3,pSkin:.84,pSkinFollow:.5,pPores:.35,pThreadOpacity:.4},
    growth:{growthAmount:.7,growthFlow:.5,growthDepth:.6,growthScale:1.7},
    petal:{petalAmount:.65,petalLength:.67,petalCoil:.47,petalFlow:.62,petalRandom:.55},
    dyn:{dynAmount:.73,dynNoise:.48},
    finish:{finishEnabled:true,finishCompare:false}
   };
   const cap={pCount:24000,pTrailCount:1400,filCount:3000,pLinkNodes:420};
   const colliders={dynAmount:.72,dynFloor:1,dynFloorY:-.45,dynObstacle:2,dynObstacleSize:.52};
   const filmVisual={thinFilm:.75,filmPattern:.67,filmPatternWarp:.55,filmChroma:.6,iridescence:.52,iridScale:1.5,filmFlow:.42,filmSwirl:.38};
   const organic={textureWrinkles:.68,textureFolds:.59,textureRipples:.3,textureRandomness:.48,textureWarp:.64,textureLink:.57,texturePatch:.33,textureDepth:.52};
   const phaseKey=/(phase|angle|^rotate[XYZ]$|^gradientOffset$|^iridShift$|^colorLayerShift$|^petal.*phase$)/i;
   const semantic=new Set(['perfectLoop','keepMotionSpeed','speed','motion','bgMode','guideMode','finishCompare','finishEnabled','finishTone','photoAll','pCacheMode','pEngine','pDirection','finishBrushRadius','finishBrushStrength']);
   try{
    const groups=[...Object.keys(models)].sort((a,b)=>b.length-a.length);
    for(const [i,entry] of vars.entries()){
     const key=entry.path,workspace=/^p[A-Z]/.test(key);
     const result={engine,key,label:entry.name};
     if(semantic.has(key)){outcomes.push({...result,state:'tempo, composizione o interfaccia'});continue;}
     const model=groups.find(prefix=>key.startsWith(prefix));
     const scene={...start,...models[model]};
     if(workspace){scene.sceneGrains=1;scene.grainSource='cloud';scene.grainDispersal=.44;}
     else if(engine==='particles'){scene.sceneGrains=.5;scene.grainSource='body';}
     if(/^(pBundle|pSelfContact|pVolumeHold|pFray|pPores?|pElastic|pBend|pFold|pInflate|pContract|pSurfaceBind|pLiving(Blend|Occlusion)|pStrands|pThread|pWeft|pFiber|pSkin)/.test(key)){
      Object.assign(scene,{pLiving:3,pSkin:.82,pSkinThickness:.1,pSkinOpening:.33,pCount:1800,pOpacity:.47,pThreadOpacity:.65,pWeft:.75,pBundleAmount:.67,pSelfContact:.6,pPores:.56,pFoldDepth:.52,pTrailCount:120,pTrailOpacity:.8,pTrailWidth:2});
     }
     if(/^dyn/.test(key)){
      Object.assign(scene,colliders,{positionY:-.25,dynObstacleX:.12,dynObstacleY:.12,dynObstacleZ:.55,forcePoints:[{id:1,kind:'point',enabled:true,x:0,y:.55,z:.1,strength:1.7,swirl:.2,radius:1.4}],dynFields:.7});
     }
     if(/^texture[A-Z]/.test(key))Object.assign(scene,organic);
     if(/^p(Film|Shadow|Caustic)|^ground(Shadow|Caustic)$/.test(key))Object.assign(scene,{pShadow:.82,pCaustic:.86,grounding:.79,transparency:.63,refraction:1.72,thinFilm:.65,pFilm:.65});
     if(/^film[A-Z]|^irid|^thinFilm$/.test(key))Object.assign(scene,filmVisual);
     if(/^petal[A-Z]/.test(key))Object.assign(scene,{petalContactGap:.045,petalCollision:.58,petalCoverage:.85,petalWeave:.6});
     if(/^finish(Brush|Region|Feather|Feedback|Print)/.test(key)){
      scene.finishFeedback=true;scene.finishFeedbackMix=.88;
      Object.assign(scene,{finishRegionsEnabled:true,finishRegionMosaic:true,finishRegionRgb:true,finishRegionGlitch:true,
        finishRegions:[{x:20,y:16,w:36,h:49}],finishMosaic:true,finishRgb:true,finishEdge:true,finishGlass:true,finishWarp:true,finishFeedback:true,
        finishGlyph:true,finishScan:true,finishGlitch:true,finishBrushStrokes:[{radius:.1,strength:.65,points:[[.28,.47,.63],[.59,.61,.9],[.7,.4,.72]]}]});
     }
     if(!workspace&&engine==='particles'&&/^(fil[A-Z]|struct|cell|petal|stem|loop|growth|baseForm|fractal|hole|cut)/.test(key))scene.sceneGrains=.55;
     if(/^finish/.test(key)){
      const effect=key.match(/^finish(Rgb|Mosaic|Cell|Glyph|Edge|Glitch|Warp|Glass|Scan|Feedback|Print|Brush)/)?.[1];
      const family={Cell:'Mosaic',Print:'Feedback',Brush:'Feedback'}[effect]||effect;
      if(family&&key!=='finish'+family)scene['finish'+family]=true;
      Object.assign(scene,{finishGlyphVariation:.68,finishGlyphRandom:.55,finishGlitchAnimate:true,finishGlitchAmount:96,finishGlitchCycles:3,finishScanWave:.6,finishWarpMotion:.6,finishGlassMotion:.6,finishFeedbackLumen:.7});
     }
     if(/^pSelfShadow|^pOpticalExtent|^pVolumeShadow/.test(key))Object.assign(scene,{pSelfShadow:1,pLighting:1,pCount:14000,pSize:5.4,pFill:.8,pOpticalExtent:1.55});
     if(key==='pContactClearance')Object.assign(scene,{pSelfContact:.92,pFoldCount:8,pFoldDepth:.45,pSkinOpening:.1,pVolumeHold:.3});
     if(/^finishGlitch(Horizontal|Cross|Width|Release|FlashMs)$/.test(key))Object.assign(scene,{finishGlitchShape:3,finishGlitchMix:1,finishGlitchFlash:key==='finishGlitchFlashMs',finishGlitchScatter:.68,finishGlitchDuty:.82});
     if(key==='finishGlyphSet')Object.assign(scene,{finishGlyphStyle:0,finishGlyphChars:' .:+=@MW'});
     if(/^irid(Scale|Shift)$/.test(key))Object.assign(scene,{iridescence:.91,thinFilm:0,pFilm:0,filmPattern:0,gloss:.9,transparency:.11});
     if(key==='thickness'||key==='internalColor')Object.assign(scene,{transparency:.68,absorption:.62,tintStrength:.72,scattering:.43,refraction:1.43,thinShell:.28,colorLayers:0,colorWaveAmount:0});
     if(/^fractal/.test(key)){scene.fractalAmount=.9;scene.fractalKind=key==='fractalFold'?1:0;}
     if(/^(translucency|scattering|fullness|wallThickness|hollow|refraction|dispersion|absorption|scatter|tintStrength)/.test(key)&&key!=='transparency')Object.assign(scene,{transparency:.52,scattering:.53,subsurface:.3,thinShell:0,hollow:.65});
     if(/^(fil|loop|struct|cell|fractal|pTrail|pLink|pSkin)[A-Z]/.test(key))scene.scale=1.17;
     for(let n=0;n<4;n++){const patch=conditionActivation(scene,key);if(!patch)break;Object.assign(scene,patch);}
     const condition=controlCondition(scene,key);
     const a=structuredClone(scene),b=structuredClone(scene);
     const phaseRange=entry.kind==='number'&&phaseKey.test(key),width=phaseRange?entry.max-entry.min:0;
     const min=entry.kind==='boolean'?false:entry.kind==='color'?'#087eaf':entry.kind==='enum'?entry.values[0]:entry.min+width*.19;
     const max=entry.kind==='boolean'?true:entry.kind==='color'?'#feb95b':entry.kind==='enum'?entry.values.at(-1):Math.min(entry.max-width*.31,cap[key]??Infinity);
     const pairs={dynObstacleX:[.12,1.6],dynObstacleY:[-.13,1.5],dynObstacleZ:[.35,1.85],focusDepth:[-.35,.8],cutX:[-.44,.38],cutY:[-.44,.38],fractalLevels:[2,14]};
     const [low,high]=pairs[key]||[min,max];
     if(!writeParameter(a,entry,low)||!writeParameter(b,entry,high)){outcomes.push({...result,condition,state:'controllo non applicato'});continue;}
     if(i%25===0)console.log(engine+' · '+i+'/'+vars.length+' · '+key);
     const size=/^finish/.test(key)?288:160;
     try{
      let diff=[0,0,0];
      for(const phase of (/^finishGlitch/.test(key)?[.63,.86,1.25,1.88]:[.63,1.88])){
       const test=async sc=>{
        r.resetLiveDynamics();
        if(/^finish(Feedback|Print|Brush)/.test(key))for(let j=4;j>0;j--)await draw(sc,phase-j*.045,size);
        return draw(sc,phase,size);
       };
       const lo=await test(a),hi=await test(b);
       diff=meaningful(lo,hi);
       if(diff[1]>=.1||diff[0]>=.03)break;
      }
      outcomes.push({...result,condition,min:low,max:high,diff,state:diff[1]>=.1||diff[0]>=.03?'visibile':diff[2]>0?'debole':'nessuna differenza'});
     }catch(error){outcomes.push({...result,condition,state:'prova interrotta',error:error.message});}
    }
   }finally{r.dispose();}
   return outcomes;
  },{base:server.url,engine,search,unresolved:unresolved?former.filter(row=>row.engine===engine&&row.state!=='visibile').map(row=>row.key):null});
  rows.push(...result);
  const count=Object.fromEntries([...new Set(rows.map(row=>row.state))].map(state=>[state,rows.filter(row=>row.state===state).length]));
  await writeFile(out+'/parametri'+(lastPass?'-riprova':unresolved?'-ripetuti':search?'-mirati':'')+'.json',JSON.stringify({count,rows},null,2));
  console.log(JSON.stringify(count));
 }
 assert(rows.length>0,'Inventario vuoto');
 assert.equal(rows.filter(row=>row.error?.startsWith('WebGL')).length,0,'Errori durante il disegno');
}finally{await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));}
