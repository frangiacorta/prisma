import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
const dir='reports/material-surface-v96'+(process.argv.includes('--half')?'-half':'')+(process.argv.includes('--dense')?'-dense':'');await mkdir(dir,{recursive:true});
const service=await startCreativeServer(0),browser=await chromium.launch({channel:'chrome',headless:true});
const timeout=setTimeout(()=>browser.close().catch(()=>{}),240000);
try{
 const page=await browser.newPage();if(process.argv.includes('--half'))await page.addInitScript(()=>{const get=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='EXT_float_blend'?null:get.call(this,name);};});page.on('console',m=>{if(['warning','error'].includes(m.type()))console.log(m.text());});await page.goto(service.url+'moodboard/');
 const result=await page.evaluate(async({base,dense})=>{
  const {Renderer,sampleFrame}=await import(base+'renderer.js'),{newCreation,normalizeCreation}=await import(base+'creative-model.js'),{particleCreation}=await import(base+'particle-model.js');
  const {grainFrame,grainPhaseRadians,freezeGrainMotion,resumeGrainMotion}=await import(base+'body-layers.js');
  const r=new Renderer(document.createElement('canvas')),rows=[],images={};
  const seed=normalizeCreation({...particleCreation(newCreation()),sceneGrains:0,pCount:dense?100000:6000,pSize:5,pOpening:0,pOrganic:.35,pTravel:.4,pVortex:.6,pTrailCount:0,pLinks:0,scale:1,glow:0,emission:.08,rotateX:15,pLighting:1,metal:.3,background:'#000000',palette:['#2c95c2','#edca93']});
  const diff=(a,b)=>{let max=0,sum=0;for(let i=0;i<a.length;i++){let d=Math.abs(a[i]-b[i]);max=Math.max(max,d);sum+=d;}return {max,mean:sum/a.length};};
  const samplePixels=()=>{const p=r.impl.cloudSurface.samples,g=r.gl,f=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,p.positionTexture,0);const out=new Float32Array(p.width*p.height*4);g.readPixels(0,0,p.width,p.height,g.RGBA,g.FLOAT,out);g.bindFramebuffer(g.FRAMEBUFFER,null);g.deleteFramebuffer(f);return {points:out.slice(0,p.count*4),count:p.count};};
  const draw=async(s,t,name)=>{let start=performance.now();if(!await r.drawAccumulated(s,t,320,240,{preview:false,quality:'full',samples:1}))throw Error('Interrupted');const error=r.gl.getError();if(error)throw Error('WebGL '+error+' '+name);const pixels=r.pixels();if(name)images[name]=r.canvas.toDataURL().split(',')[1];return {pixels,ms:Math.round(performance.now()-start),...samplePixels()};};
  const directGrains=(s,t)=>{
   const o=r.impl,g=r.gl,point=o.grainProgram();o.finishProgram(point);const v=g.getAttachedShaders(point.program).find(shader=>g.getShaderParameter(shader,g.SHADER_TYPE)===g.VERTEX_SHADER);
   const probe=o.program(g.getShaderSource(v),'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}', ['vPosition']);o.settings(probe,grainFrame(s,t,sampleFrame),grainPhaseRadians(s,t)/(2*Math.PI)*s.pDirection);o.u(probe,'uPointQuad',0);
   const feedback=g.createTransformFeedback(),buffer=g.createBuffer();g.bindVertexArray(o.pointVAO);g.bindBuffer(g.TRANSFORM_FEEDBACK_BUFFER,buffer);g.bufferData(g.TRANSFORM_FEEDBACK_BUFFER,s.pCount*3*4,g.STREAM_READ);g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,feedback);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,buffer);g.enable(g.RASTERIZER_DISCARD);g.beginTransformFeedback(g.POINTS);g.drawArrays(g.POINTS,0,s.pCount);g.endTransformFeedback();g.disable(g.RASTERIZER_DISCARD);g.bindBufferBase(g.TRANSFORM_FEEDBACK_BUFFER,0,null);g.bindTransformFeedback(g.TRANSFORM_FEEDBACK,null);const points=new Float32Array(s.pCount*3);g.bindBuffer(g.ARRAY_BUFFER,buffer);g.getBufferSubData(g.ARRAY_BUFFER,0,points);g.deleteBuffer(buffer);g.deleteTransformFeedback(feedback);g.useProgram(null);g.deleteProgram(probe.program);o.pendingPrograms.delete(probe);g.bindVertexArray(null);return points;
  };
  for(const [name,patch]of [['cloud',{}],['outer',{pOuter:.8,pReach:3}],['cells',{pCellAmount:.85,pCellDensity:3}],['body',{engine:'solid',grainSource:'body',grainDispersal:.45,pFill:0,volume:1}]]){
   const s=normalizeCreation({...seed,...patch}),a=await draw(s,.8,name),direct=directGrains(s,.8);let identity=0;for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)identity=Math.max(identity,Math.abs(a.points[i*4+k]-direct[i*3+k]));
   const middle=await draw({...s,sceneGrains:.5},.8),moved=await draw(s,1.9);const still=structuredClone(s);freezeGrainMotion(still,.8);const paused=await draw(still,1.9);resumeGrainMotion(still,1.9);const resumed=await draw(still,1.9);
   const seam=await draw(s,.8+2*Math.PI);rows.push({name,count:a.count,identity,mix:diff(a.points,middle.points),motion:diff(a.points,moved.points),freeze:diff(a.points,paused.points),resume:diff(paused.points,resumed.points),seam:diff(a.points,seam.points),ms:a.ms,visible:a.pixels.filter((v,i)=>i%4!==3&&v>25).length,stats:r.impl.cloudSurface.stats});
  }
  const hair=normalizeCreation({...seed,engine:'solid',grainSource:'body',grainDispersal:.45,pFill:0,filLength:0,filCount:160,filWidth:.012});
  await r.drawAccumulated(hair,.8,240,240,{samples:1,preview:false,quality:'full'});const bare=r.pixels();
  await r.drawAccumulated({...hair,filLength:.3},.8,240,240,{samples:1,preview:false,quality:'full'});const hairy=r.pixels();
  const filaments={difference:diff(bare,hairy),error:r.gl.getError()};
  r.dispose();return {rows,images,filaments};
 },{base:service.url,dense:process.argv.includes('--dense')});
 for(const [name,img]of Object.entries(result.images))await writeFile(dir+'/'+name+'.png',Buffer.from(img,'base64'));delete result.images;
 console.log(JSON.stringify(result,null,2));await writeFile(dir+'/result.json',JSON.stringify(result,null,2));
 assert.equal(result.filaments.error,0);assert(result.filaments.difference.mean>.01);
 assert(result.rows.every(x=>x.count===(process.argv.includes('--dense')?100000:6000)&&x.identity<.00002&&x.mix.max===0&&x.motion.max>.01&&x.freeze.max<.00002&&x.resume.max<.00002&&x.seam.max<.00002&&x.visible>100));
}finally{clearTimeout(timeout);await browser.close().catch(()=>{});service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
