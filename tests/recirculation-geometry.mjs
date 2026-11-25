import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

// Capture the world coordinates emitted by the studio's actual point pass.
// Particle identity, loop closure and freeze are independent of raster opacity.
const studio=new URL('../',import.meta.url);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({serviceWorkers:'block'});
 await page.route('http://localhost:8247/**',route=>{
  const name=new URL(route.request().url()).pathname.slice(1);
  return name?route.fulfill({path:fileURLToPath(new URL(name,studio))}):route.fulfill({body:'<!doctype html>'});
 });
 await page.goto('http://localhost:8247/');
 const results=await page.evaluate(async()=>{
  const {Renderer}=await import('/renderer.js'),{newCreation,normalizeCreation}=await import('/creative-model.js');
  const {freezeGrainMotion}=await import('/body-layers.js');
  const renderer=new Renderer(document.createElement('canvas')),gl=renderer.gl;
  const programs=new WeakSet(),link=gl.linkProgram.bind(gl),draw=gl.drawArrays.bind(gl);
  gl.linkProgram=program=>{
   const isPoint=gl.getAttachedShaders(program).some(shader=>gl.getShaderSource(shader).includes('vPosition=p;vColor=particleColor'));
   if(isPoint){
    programs.add(program);
    gl.transformFeedbackVaryings(program,['vPosition'],gl.INTERLEAVED_ATTRIBS);
   }
   link(program);
  };
  const feedback=gl.createTransformFeedback(),buffer=gl.createBuffer(),sampleCount=1024;
  let latest=null;
  gl.drawArrays=(mode,first,count)=>{
   draw(mode,first,count);
   if(mode!==gl.POINTS||!programs.has(gl.getParameter(gl.CURRENT_PROGRAM)))return;
   const previous=gl.getParameter(gl.ARRAY_BUFFER_BINDING),size=Math.min(count,sampleCount);
   latest=new Float32Array(size*3);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,latest.byteLength,gl.STREAM_READ);
   gl.bindBuffer(gl.ARRAY_BUFFER,null);
   gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);
   gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.enable(gl.RASTERIZER_DISCARD);
   gl.beginTransformFeedback(mode);draw(mode,first,size);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);
   gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,latest);gl.bindBuffer(gl.ARRAY_BUFFER,previous);
  };
  const rms=(a,b)=>Math.sqrt(a.reduce((sum,value,i)=>sum+(value-b[i])**2,0)/a.length);
  const sample=async(s,phase)=>{
   latest=null;
   if(!await renderer.drawAccumulated(s,phase,160,180,{quality:'full',samples:1}))throw Error('Incomplete frame');
   if(latest?.length!==sampleCount*3||!latest.every(Number.isFinite))throw Error('Invalid GPU sample');
   return latest;
  };
  const results=[];
  for(const grainSource of ['cloud','body']){
   const s=normalizeCreation({...newCreation(),engine:grainSource==='body'?'solid':'particles',grainSource,baseForm:2,
    sceneGrains:1,grainDispersal:.87,grainMotion:true,pCount:4000,pReentry:2,pFill:.04,pOpening:.13,pLiving:0,
    pCloudHalo:.35,pCloudRadius:.9,pOrganic:.65,pVortex:.35,pCounterflow:.82,pSize:2,pLargeCount:0,pNodeRatio:0,
    pTrailOpacity:0,pTrailCount:0,perfectLoop:true,animateRotation:false,animateShape:false,animateLight:false});
   const zero=await sample(s,0),end=await sample(s,Math.PI*2),mid=await sample(s,1.14);
   const epsilon=.00035,left=await sample(s,Math.PI*2-epsilon),right=await sample(s,epsilon);
   const firstOrder=new Float32Array(right.length);
   for(let i=0;i<right.length;i++)firstOrder[i]=2*zero[i]-left[i];
   const legacy=await sample({...s,pReentry:1},1.14);
   const threshold=await sample({...s,pReentry:1.0001},1.14);
   const more=await sample({...s,pReentry:1.60},1.14);
   const anchored=await sample({...s,grainDispersal:0},0);
   const still=await sample({...s,grainDispersal:0},2.2);
   freezeGrainMotion(s,1.14);
   const frozen=await sample(s,3.2);
   results.push({grainSource,seam:rms(zero,end),seamStep:rms(left,right),seamAcceleration:rms(firstOrder,right),
    movement:rms(zero,mid),transition:rms(legacy,threshold),sculpt:rms(more,mid),stationary:rms(anchored,still),frozen:rms(mid,frozen),glError:gl.getError()});
  }
  gl.deleteBuffer(buffer);gl.deleteTransformFeedback(feedback);renderer.dispose();return results;
 });
 for(const row of results){
  assert.equal(row.glError,0,row.grainSource);
  assert(row.seam<.0001&&row.seamStep<.004&&row.seamAcceleration<.0001,'discontinuous loop '+JSON.stringify(row));
  assert(row.movement>.01&&row.sculpt>.01&&row.transition<.0002,'ineffective or discontinuous roll '+JSON.stringify(row));
  assert(row.stationary<.00001&&row.frozen<.00001,'inconsistent motion state '+JSON.stringify(row));
 }
 console.table(results);
}finally{await browser.close();}
