// Exercise the geometry produced by the real web shader, independently of
// image colour or visibility. Run with node checks/web-surface-contact.mjs.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const source=new URL('../surface-web.js',import.meta.url);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({serviceWorkers:'block'});
 await page.route('http://localhost:8271/**',route=>{
  const path=new URL(route.request().url()).pathname;
  return path==='/'?route.fulfill({body:'<!doctype html>'}):route.fulfill({path:fileURLToPath(new URL(path.slice(1),source))});
 });
 await page.goto('http://localhost:8271');
 const results=await page.evaluate(async()=>{
  const {Renderer}=await import('/renderer.js'),{newCreation}=await import('/creative-model.js');
  const r=new Renderer(document.createElement('canvas')),gl=r.gl;
  const programs=new WeakSet(),geometry=new Map();
  const link=gl.linkProgram.bind(gl),draw=gl.drawArraysInstanced.bind(gl);
  gl.linkProgram=p=>{
   if(gl.getAttachedShaders(p).some(s=>gl.getShaderSource(s).includes('Anchor sampleAnchor('))){
    programs.add(p);
    gl.transformFeedbackVaryings(p,['vPosition'],gl.INTERLEAVED_ATTRIBS);
   }
   link(p);
  };
  gl.drawArraysInstanced=(mode,first,count,instances)=>{
   draw(mode,first,count,instances);
   const program=gl.getParameter(gl.CURRENT_PROGRAM);
   if(!instances||!programs.has(program))return;
   const kind=gl.getUniform(program,gl.getUniformLocation(program,'uDrawKind'));
   const previous=gl.getParameter(gl.ARRAY_BUFFER_BINDING);
   const feedback=gl.createTransformFeedback(),buffer=gl.createBuffer();
   const xyz=new Float32Array(3*count*instances);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,xyz.byteLength,gl.STREAM_READ);
   gl.bindBuffer(gl.ARRAY_BUFFER,null);
   gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);
   gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
   gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(mode);
   draw(mode,first,count,instances);
   gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);
   gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,xyz);
   gl.deleteBuffer(buffer);gl.deleteTransformFeedback(feedback);gl.bindBuffer(gl.ARRAY_BUFFER,previous);
   geometry.set(kind,{xyz,count,instances});
  };
  const results=[];
  for(const [name,shape] of [['sphere',{}],['cube',{baseForm:2}],['hole',{hole:.53}]]){
   const s={...newCreation(),baseForm:0,grainSource:'body',sceneGrains:0,scale:1,volume:1,stretchX:1,stretchY:1,stretchZ:1,
    rotateX:0,rotateY:0,rotateZ:0,positionX:0,positionY:0,deform:0,waves:0,twist:0,asymmetry:0,hole:0,holeAspect:1,
    holeX:0,holeY:0,holeShape:0,rimRound:0,cut:0,grainDispersal:0,structDensity:28,structWeaveCradle:.88,
    structWeaveNodes:0,structWeaveGrowth:0,structWeaveTension:.5,structWeaveArch:0,structWeaveFlex:0,structWeaveBranching:1,...shape};
   if(!await r.drawAccumulated(s,0,244,224,{quality:'full',samples:1}))throw Error('Incomplete frame');
   const web=r.implementations.particles.surfaceWeb,anchors=new Float32Array(8*web.capacity);
   gl.bindBuffer(gl.ARRAY_BUFFER,web.positions);gl.getBufferSubData(gl.ARRAY_BUFFER,0,anchors);
   const distance=(x,y,z)=>{
    if(s.baseForm===2)return Math.max(Math.abs(x),Math.abs(y),Math.abs(z))-1/Math.sqrt(3);
    const sphere=Math.hypot(x,y,z)-1;
    return s.hole>0?Math.max(sphere,s.hole-Math.hypot(x,y)):sphere;
   };
   let maxAnchorError=0,anchorCount=0;
   for(let i=0;i<anchors.length;i+=8)if(anchors[i+3]>.5){
    maxAnchorError=Math.max(maxAnchorError,Math.abs(distance(...anchors.subarray(i,i+3))));anchorCount++;
   }
   const ribbon=geometry.get(2),membrane=geometry.get(0),bridges=[];
   // Each segment comprises two raster triangles. Vertex 1 lies at its
   // distal centreline location, before screen-space width is applied.
   for(let i=0;i<ribbon.instances;i++)for(let j=1;j<ribbon.count-6;j+=6){
    const k=3*(i*ribbon.count+j);bridges.push(distance(...ribbon.xyz.subarray(k,k+3)));
   }
   bridges.sort((a,b)=>a-b);
   let membraneMin=Infinity;
   for(let i=0;i<membrane.xyz.length;i+=3)membraneMin=Math.min(membraneMin,distance(...membrane.xyz.subarray(i,i+3)));
   results.push({name,anchorCount,maxAnchorError,bridgeCount:bridges.length,bridgeMin:bridges[0],bridgeMedian:bridges[bridges.length>>1],
    membraneCount:membrane.xyz.length/3,membraneMin,glError:gl.getError()});
  }
  r.dispose();return results;
 });
 for(const s of results){
  assert.equal(s.glError,0,s.name);
  assert(s.anchorCount>100&&s.maxAnchorError<.005,s.name+' / surface anchors');
  assert(s.bridgeCount>1000&&s.bridgeMin>-.005,s.name+' / fibre '+s.bridgeMin);
  assert(s.membraneCount>10000&&s.membraneMin>-.005,s.name+' / membrane '+s.membraneMin);
  if(s.name==='sphere')assert(s.bridgeMedian>.01&&s.bridgeMedian<.019,'suspended arches changed');
 }
 console.table(results);
}finally{await browser.close();}
