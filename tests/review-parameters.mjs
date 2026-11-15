import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
import {newCreation,normalizeCreation} from '../creative-model.js';
import {parameterCatalog,writeParameter} from '../playground-model.js';
import {fieldAt} from '../solid-renderer.js';
import {loopField} from '../structure-model.js';

const imported=normalizeCreation({renderVersion:2,fullness:.19});
assert.equal(imported.hollow,1);assert.equal(imported.wallThickness,.19);
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
const server=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto(server.url+'moodboard/');
 const measures=await page.evaluate(async base=>{
  const {Renderer}=await import(base+'renderer.js'),{newCreation}=await import(base+'creative-model.js'),{particleCreation,SPHERE_FORM}=await import(base+'particle-model.js');
  const solid={...newCreation(),background:'#1a1b23',palette:['#cd531f','#2475be','#cfd5eb'],scale:1.12};
  const glass={...solid,transparency:.92,thinShell:1,absorption:.66,tintStrength:.49,environmentRefraction:.38,subsurface:0};
  const p={...particleCreation(solid),...SPHERE_FORM,pCount:18000,pSize:3.1,pOpacity:.58,pTrailCount:0,pLinks:0,scale:1.28,gloss:.95,metal:.08,pLighting:1,pSelfShadow:0,pVolumeShadow:0};
  p.lights=p.lights.map((l,i)=>({...l,x:i?.45:-.42,y:i?1.8:2.3,z:2.8,power:i?.65:3}));
  const weave={...solid,structShell:1,structThickness:.075,structFibres:1,structDensity:12,structWeft:.75,structThreadWidth:.27};
  const trails={...p,pCount:0,pTrailCount:160,pTrailLength:.36,pTrailOpacity:1,pTrailFork:1,pTrailWidth:2,pTravel:1,pWander:.5};
  const link={...solid,sceneGrains:.9,pCount:3800,pSize:2,pOpacity:.19,pLinks:.69,pTrailCount:0,pLinkNodes:130,pLinkNeighbors:2,pLinkReach:1,pLinkCurve:.17,pLinkSurface:1,pLinkWidth:2};
  const glyph={...solid,finishGlyph:true,finishGlyphCell:18,finishGlyphMix:1,finishGlyphSource:true,finishGlyphSeed:334};
  const cases=[
   ['Dispersione',glass,'dispersion',0,1],
   ['Spessore ottico',glass,'thickness',.05,3.8],
   ['Direzione diffusione',{...p,scattering:.85,translucency:.42},'scatterDirection',-.78,.78],
   ['Iridescenza su 1,1 px',{...p,pSize:1.1,pCount:72000},'iridescence',0,1],
   ['Rifrazione su 3 px',{...p,transparency:.78,pCaustic:0},'refraction',1.02,2.3],
   ['Caustica su granelli',{...p,transparency:.75,refraction:1.65,pSize:1.6,pCount:62000},'pCaustic',0,4],
   ['Distanza delle ombre',{...p,pSelfShadow:1,pCount:36000,pSize:5.5,pOpacity:.8,pFill:.85},'pSelfShadowBias',.002,.1],
   ['Apertura rami',trails,'pTrailForkSpread',.1,1],
   ['Irregolarità del reticolo',weave,'structWeaveVariation',0,1],
   ['Rilievo alle giunzioni',weave,'structWeaveNodes',0,1],
   ['Giri dei fili',link,'pLinkTurns',0,2],
   ['Mescola font',{...glyph,finishGlyphFont:0},'finishGlyphFontRandom',0,1]
  ];
  const r=new Renderer(document.createElement('canvas')),results=[];
  try{
   for(const [name,s,key,low,high] of cases){
    console.log(name);
    const images=[];
    for(const value of [low,high]){
     const t=performance.now();
     if(!await r.drawAccumulated({...s,[key]:value},.69,640,400,{samples:1,cancelled:()=>performance.now()-t>100000}))throw Error(name+' non completato');
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
 },server.url);
 const dir='reports/unified-studio';await mkdir(dir,{recursive:true});
 await writeFile(dir+'/controls.json',JSON.stringify({iterations,...measures},null,2));
 console.log(JSON.stringify({iterations,...measures}));
 assert.deepEqual(measures.results.filter(r=>r.changedPercent<.2).map(r=>r.name),[]);
}finally{await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));}
