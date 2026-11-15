import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
import {newCreation,normalizeCreation} from '../creative-model.js';
import {parameterCatalog,writeParameter} from '../playground-model.js';
import {fieldAt,sampleFrame} from '../solid-renderer.js';
import {loopField} from '../structure-model.js';

const imported=normalizeCreation({renderVersion:2,fullness:.19});
assert.equal(imported.hollow,1);assert.equal(imported.wallThickness,.19);
const macro={...newCreation(),scale:4.08};
Object.assign(macro.motions.scale,{enabled:true,amplitude:.2,phase:90});
assert(sampleFrame(macro,0).scale>4.2);assert(sampleFrame(macro,Math.PI).scale<4);
Object.assign(macro.motions.structFlowPhase,{enabled:true,mode:'cycle',cycles:1,phase:21});
assert.notEqual(sampleFrame(macro,0).structFlowPhase,sampleFrame(macro,Math.PI).structFlowPhase);
assert.equal(sampleFrame(macro,0).structFlowPhase,sampleFrame(macro,Math.PI*2).structFlowPhase);
const material=newCreation(),entry=parameterCatalog(material).find(p=>p.path==='fullness');
assert(writeParameter(material,entry,.09));assert.equal(material.wallThickness,.09);
const fractal={...newCreation(),fractalAmount:1,fractalKind:0};
let iterations=0;
for(let x=-8;x<=8;x++)for(let y=-8;y<=8;y++)for(let z=-8;z<=8;z++){
 const p=[x/9,y/9,z/9];if(Math.abs(fieldAt({...fractal,fractalLevels:3},p)-fieldAt({...fractal,fractalLevels:14},p))>1e-7)iterations++;
}
assert(iterations>15);
for(const turns of [3,5,7,9,11]){
 const node={loopKnot:1,loopTurns:turns,loopRadius:.76,loopTube:.18,loopFlat:.3};
 assert(Math.abs(loopField(node,[-.9,-1e-8,.2])-loopField(node,[-.9,1e-8,.2]))<1e-6);
}
const selected=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7)||'';
const server=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();page.on('console',entry=>{if(entry.type()==='log')console.log(entry.text());});await page.goto(server.url+'moodboard/');
 const measures=await page.evaluate(async ({base,selected})=>{
  const {Renderer}=await import(base+'renderer.js'),{newCreation}=await import(base+'creative-model.js'),{particleCreation,SPHERE_FORM}=await import(base+'particle-model.js');
  const solid={...newCreation(),background:'#1a1b23',palette:['#cd531f','#2475be','#cfd5eb'],scale:1.12};
  const glass={...solid,transparency:.92,thinShell:1,absorption:.66,tintStrength:.49,environmentRefraction:.38,subsurface:0};
  const p={...particleCreation(solid),...SPHERE_FORM,pCount:18000,pSize:3.1,pOpacity:.58,pTrailCount:0,pLinks:0,scale:1.28,gloss:.95,metal:.08,pLighting:1,pSelfShadow:0,pVolumeShadow:0};
  p.lights=p.lights.map((l,i)=>({...l,x:i?.45:-.42,y:i?1.8:2.3,z:2.8,power:i?.65:3}));
  const weave={...solid,structShell:1,structThickness:.075,structFibres:1,structDensity:12,structWeft:.75,structThreadWidth:.27};
  const trails={...p,pCount:0,pTrailCount:160,pTrailLength:.36,pTrailOpacity:1,pTrailFork:1,pTrailWidth:2,pTravel:1,pWander:.5};
  const link={...solid,sceneGrains:.9,pCount:3800,pSize:2,pOpacity:.19,pLinks:.69,pTrailCount:0,pLinkNodes:130,pLinkNeighbors:2,pLinkReach:1,pLinkCurve:.17,pLinkSurface:1,pLinkWidth:2};
  const glyph={...solid,finishGlyph:true,finishGlyphCell:18,finishGlyphMix:1,finishGlyphSource:true,finishGlyphSeed:334};
  const cavity={...p,transparency:.86,thinShell:0,absorption:.63,tintStrength:.79,refraction:1.64,gloss:.9,wallThickness:.11,scattering:.27,pCount:6400,pSize:13,pOpacity:.36};
  const continuous={...p,engine:'solid',sceneGrains:.88,grainSource:'body',pVolumeContinuity:1,pVolumeTurbulence:.63,pCount:0,scattering:.8,pVolumeShadow:.8,pFill:.61};
  const reaction={...solid,growthAmount:1,growthExtrusion:.5,growthOpening:.91,growthCoverage:.86,growthScale:.74,structShell:1,structThickness:.15};
  const sprout={...weave,structDensity:7,structWeaveVariation:.8,structWeaveNodes:.8,scale:1.35};
  const denseTrails={...trails,pTrailCount:5500,pTrailLength:.62,pTrailPersistence:.79,pOpacity:.51};
  const knot={...solid,loopAmount:1,loopKnot:1,loopTurns:5,loopBands:1,loopBandCount:2};
  const cases=[
   ['Dispersione',glass,'dispersion',0,1],
   ['Spessore ottico',glass,'thickness',.05,3.8],
   ['Direzione diffusione',{...p,scattering:.85,translucency:.42},'scatterDirection',-.78,.78],
   ['Iridescenza su 1,1 px',{...p,pSize:1.1,pCount:72000},'iridescence',0,1],
   ['Rifrazione su 3 px',{...p,transparency:.78,pCaustic:0},'refraction',1.02,2.3],
   ['Cavità della superficie',{...glass,thinShell:0,wallThickness:.08,refraction:1.64},'hollow',0,1],
   ['Cavità dei granelli',cavity,'hollow',0,1],
   ['Spessore ottico dei granelli',cavity,'thickness',.04,3.8],
   ['Dispersione dei granelli',{...cavity,pCount:4400,pSize:19,scattering:.1,metal:0,gloss:1},'dispersion',0,1],
   ['Rugosità del motivo',{...solid,growthAmount:1,growthDepth:.62,growthContrast:.86,growthCoverage:.92,growthRoughness:.2,roughness:.13,gloss:.95},'growthRoughness',0,1],
   ['Parete dei granelli',{...cavity,hollow:1},'wallThickness',.04,.92],
   ['Cavità dei granelli in scena mista',{...cavity,engine:'solid',sceneGrains:.68,grainSource:'body'},'hollow',0,1],
   ['Densità delle scie',denseTrails,'pTrailDensity',0,1],
   ['Percorso dei fili',{...link,pLinkTurns:1},'pLinkSurface',0,.95],
   ['Caustica su granelli',{...p,transparency:.75,refraction:1.65,pSize:1.6,pCount:62000},'pCaustic',0,4],
   ['Distanza delle ombre',{...p,pSelfShadow:1,pCount:36000,pSize:5.5,pOpacity:.8,pFill:.85},'pSelfShadowBias',.002,.1],
   ['Apertura rami',trails,'pTrailForkSpread',.1,1],
   ['Irregolarità del reticolo',weave,'structWeaveVariation',0,1],
   ['Rilievo alle giunzioni',weave,'structWeaveNodes',0,1],
   ['Giri dei fili',link,'pLinkTurns',0,2],
   ['Da granelli a volume',continuous,'pVolumeContinuity',0,1],
   ['Turbolenza della densità',continuous,'pVolumeTurbulence',0,1],
   ['Reticolo luminoso nella densità',continuous,'pVolumeFilaments',0,1],
   ['Da orbita a linea',trails,'pTrailStraighten',0,1],
   ['Steli nel reticolo',sprout,'structWeaveGrowth',0,1],
   ['Coppe nel reticolo',{...sprout,structWeaveGrowth:1},'structWeaveCup',0,1],
   ['Dalla sfera alle lamine',{...solid,structThickness:.11,stretchY:1.2},'structFan',0,1],
   ['Apertura delle lamine',{...glass,structThickness:.12,structFan:1,structPetalCount:4,stretchY:1.2},'structFanBias',0,1],
   ['Membrana tra i rami',{...sprout,structWeaveVariation:.98,structWeaveGrowth:.56},'structWeaveMembrane',0,1],
   ['Fasce orientabili sulla forma',knot,'loopBandAxis',0,1],
   ['Fasce orientabili sui granelli',{...p,...knot,engine:'solid',sceneGrains:1,grainSource:'body',pCount:7000,pTrailCount:0},'loopBandAxis',0,1],
   ['Fori della trama',reaction,'growthOpening',0,1],
   ['Estrusione della trama',{...reaction,sceneGrains:.64,pCount:9000,pTrailCount:0},'growthExtrusion',0,1],
   ['Densità sopra 300.000',{...p,pSize:.58,pOpacity:.16,pTrailCount:0},'pCount',300000,2000000],
   ['Mescola font',{...glyph,finishGlyphFont:0},'finishGlyphFontRandom',0,1]
  ];
  const r=new Renderer(document.createElement('canvas')),results=[];
  try{
   for(const [name,s,key,low,high] of cases){
    if(selected&&!new RegExp(selected,'i').test(key))continue;
    console.log(name);
    const images=[];
    for(const value of [low,high]){
     const t=performance.now();
     if(!await r.drawAccumulated({...s,[key]:value},.69,640,400,{samples:1,cancelled:()=>performance.now()-t>150000}))throw Error(name+' non completato');
     const error=r.gl.getError();if(error)throw Error(name+' WebGL '+error);
     images.push(r.pixels());
    }
    let pixels=0,sum=0;
    for(let i=0;i<images[0].length;i+=4){
     const delta=Math.max(...[0,1,2].map(c=>Math.abs(images[0][i+c]-images[1][i+c])));
     pixels+=delta>=3;sum+=delta;
    }
    const count=images[0].length/4,measure={name,changedPercent:pixels/count*100,mean:sum/count};
    results.push(measure);console.log(JSON.stringify(measure));
   }
   return {results,hardware:r.hardwareInfo().name};
  }finally{r.dispose();}
 },{base:server.url,selected});
 assert(measures.results.length>0,'Nessun caso selezionato');
 const dir='reports/unified-studio';await mkdir(dir,{recursive:true});
 await writeFile(dir+(selected?'/controls-focused.json':'/controls.json'),JSON.stringify({iterations,...measures},null,2));
 console.log(JSON.stringify({iterations,...measures}));
 assert.deepEqual(measures.results.filter(r=>r.changedPercent<.2).map(r=>r.name),[]);
}finally{await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));}
