import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir('reports/visual-parity',{recursive:true});
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
const server=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto(server.url+'moodboard/');
 const result=await page.evaluate(async url=>{
  const {Renderer,implicitGeometrySource,implicitGeometryKey}=await import(url+'solid-renderer.js');
  const {ImplicitHitPass,IMPLICIT_HIT_MAIN}=await import(url+'implicit-hit-pass.js');
  const {newCreation}=await import(url+'creative-model.js');
  const {STRUCTURE_DEFAULTS}=await import(url+'structure-model.js');
  const size=65,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  const renderer=new Renderer(canvas),gl=renderer.gl;
  const clean={...newCreation(),...STRUCTURE_DEFAULTS,renderVersion:2,thinShell:1,scale:1,positionX:0,positionY:0,rotateX:0,rotateY:0,rotateZ:0,volume:1,stretchX:1,stretchY:1,stretchZ:1,roundness:0,deform:0,asymmetry:0,twist:0,waves:0,taper:0,bendX:0,bendY:0,lobeAmount:0,pinch:0,hole:0,cut:0,petalAmount:0,stemAmount:0};
  const delta=Math.asin(.18)/(6*Math.PI),layered=[3.8];
  for(let n=5;n>=1;n--)layered.push(4.8-n/6-delta);layered.push(4.8-delta);
  for(let n=1;n<=6;n++)layered.push(4.8+n/6-delta);
  const thinX=4/size*3.4,thinEdge=(thinX/.28-.35)/.65,thinDepth=4.8-.005*(.22-.16*thinEdge);
  const tinyX=3.4/size/.2,tinyEdge=(tinyX/.28-.35)/.65,tinyDepth=4.8-.005*(.22-.16*tinyEdge)*.06*.2;
  const trials=[['sphere',{},[3.8]],['thin-shell',{structShell:1,structThickness:.035},[3.8,5.765]],['thirteen-entries',{structLayers:1,structLayerCount:6,structLayerWidth:.18},layered],['minimum-drape',{structFan:1,structFanBias:1,structThickness:.005,structTaper:1},[thinDepth],36],['minimum-compressed-drape',{structFan:1,structFanBias:1,structThickness:.005,structTaper:1,volume:.12},[4.8-(4.8-thinDepth)*.12],36],['minimum-tiny-drape',{structFan:1,structFanBias:1,structThickness:.005,structTaper:1,volume:.06,scale:.2},[tinyDepth],33]];
  const checks=[];
  for(const [name,patch,expected,probeX=32] of trials){
   const state={...clean,structPetalCount:4,...patch},key=implicitGeometryKey(state),pass=new ImplicitHitPass(gl,implicitGeometrySource(state,{main:IMPLICIT_HIT_MAIN}));await pass.prepare();
   const minimumAxis=Math.min(state.stretchX,state.stretchY,Math.max(.06,state.volume*state.stretchZ)),featureSize=state.structFan>0?state.scale*minimumAxis*state.structThickness*.06:state.structShell>0?state.scale*minimumAxis*state.structThickness*.15:Infinity;
   const depths=[];let startTexture=null;
   for(let batch=0;batch<4;batch++){
    pass.draw(size,size,{startTexture,featureSize,budget:2400,safety:.32,epsilon:.000025,normalOffset:.0002,upload:(g,locations,program)=>{renderer.program=program;renderer.locations=locations;renderer.bindFrame(state,state,0,size,size,{},key,false);}});
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,pass.framebuffer);
    for(let layer=0;layer<4;layer++){gl.readBuffer(gl.COLOR_ATTACHMENT0+layer);const pixel=new Float32Array(4);gl.readPixels(probeX,32,1,1,gl.RGBA,gl.FLOAT,pixel);if(pixel[3]>=0)depths.push(pixel[3]);}
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);startTexture=pass.textures[3];
   }
   const program=pass.program;pass.releaseTargets();
   const released=pass.banks.every(bank=>bank.framebuffer===null&&bank.textures.length===0)&&pass.program===program&&pass.ready();
   pass.draw(size,size,{maxLayers:1,featureSize,upload:(g,locations,handle)=>{renderer.program=handle;renderer.locations=locations;renderer.bindFrame(state,state,0,size,size,{},key,false);}});
   gl.bindFramebuffer(gl.READ_FRAMEBUFFER,pass.framebuffer);gl.readBuffer(gl.COLOR_ATTACHMENT0);const restored=new Float32Array(4);gl.readPixels(probeX,32,1,1,gl.RGBA,gl.FLOAT,restored);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);
   const lifecycle=released&&Math.abs(restored[3]-expected[0])<.0003;
   const errors=depths.map((depth,index)=>Math.abs(depth-(expected[index]??Infinity)));
   checks.push({name,expected,actual:depths,maximumError:Math.max(0,...errors),lifecycle,glError:gl.getError(),passed:lifecycle&&depths.length===expected.length&&errors.every(error=>error<.0003)});pass.dispose();
  }
  renderer.dispose();return checks;
 },server.url);
 await writeFile('reports/visual-parity/implicit-hit-analytic.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert(result.every(check=>check.passed&&check.glError===0));
}finally{await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));}
