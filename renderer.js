import {FilamentPass} from './filament-renderer.js?v=eae52296f762';
import {VeilTransition} from './veil-transition.js?v=eae52296f762';
import {sampleFrame,Renderer as SolidRenderer} from './solid-renderer.js?v=eae52296f762';
import {ParticleRenderer} from './particle-renderer.js?v=eae52296f762';
import {FinishingPass,GlyphPass,DetailPass,OpticalPass,FINISH_DEFAULTS,normalizeFinishOrder,finishingOff,finishingSource} from './finishing.js?v=eae52296f762';
export {fieldAt,sampleFrame} from './solid-renderer.js?v=eae52296f762';
// One editor and export contract; the saved creation chooses its renderer.
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.context)throw Error('WebGL 2 non disponibile.');this.frameTimer=this.context.getExtension('EXT_disjoint_timer_query_webgl2');this.frameQueries=[];this.frameGpuSample=0;this.frameGpuMs=null;}
 sourceState(s){return {...s,pLiving:s.pVeilSourceKind===4?0:s.pVeilSourceKind||0,engine:s.pVeilSourceKind>0?'particles':'solid'};}
 endpoint(s,p=0){return s.pLiving===4&&s.pVeilFromForm&&sampleFrame(s,p).pVeilMorph<=0?this.sourceState(s):s;}
 select(s){const kind=(s?.engine==='particles'||s?.pLiving>0)?'particles':'solid';if(this.kind!==kind){this.implementations??={};if(this.impl)this.implementations[this.kind]=this.impl;this.context.bindVertexArray(null);this.context.bindFramebuffer(this.context.FRAMEBUFFER,null);this.context.disable(this.context.BLEND);this.impl=this.implementations[kind]||(kind==='particles'?new ParticleRenderer(this.canvas):new SolidRenderer(this.canvas));this.kind=kind;}if(kind==='solid'){const g=this.context;g.bindVertexArray(null);g.bindBuffer(g.ARRAY_BUFFER,this.impl.buffer);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);g.disableVertexAttribArray(1);g.disableVertexAttribArray(2);g.disableVertexAttribArray(3);g.disable(g.DEPTH_TEST);g.disable(g.BLEND);}return this.impl;}
 get gl(){return this.context;}get maxSize(){return Math.min(4096,this.context.getParameter(this.context.MAX_TEXTURE_SIZE));}
 get recoveryExtension(){return this.context.getExtension('WEBGL_lose_context');}
 get completionSync(){return this.impl?.completionSync;}get completedFrames(){return this.impl?.completedFrames||0;}
 get gpuSample(){return this.frameGpuSample;}get gpuMilliseconds(){return this.frameGpuMs;}get timerExtension(){return this.frameTimer;}get bakeUploads(){return this.impl?.bakeUploads||0;}
 prepare(s,p,o){s=this.endpoint(s,p);return this.select(s).prepare(s,p,o);}prepareAsync(s,p,o){s=this.endpoint(s,p);return this.select(s).prepareAsync(s,p,o);}
 filaments(s,p,w,h,o){if(this.kind==='solid'&&sampleFrame(s,p).filLength>0){this.filamentPass??=new FilamentPass(this.gl);this.filamentPass.draw(sampleFrame(finishingSource(s,o),p),p,w,h,this.impl,o);}}
 finish(s,o={},phase=0){
  if(finishingOff(s,o))return;
  const values={...FINISH_DEFAULTS,...s},order=normalizeFinishOrder(s.finishOrder),w=this.canvas.width,h=this.canvas.height;
  const active={warp:values.finishWarp&&values.finishWarpMix>0,glass:values.finishGlass&&values.finishGlassMix>0,mosaic:values.finishMosaic&&values.finishMosaicMix>0,rgb:values.finishRgb&&values.finishRgbMix>0,edge:values.finishEdge&&values.finishEdgeMix>0,glyph:values.finishGlyph&&values.finishGlyphMix>0,glitch:values.finishGlitch&&values.finishGlitchMix>0&&values.finishGlitchCoverage>0&&(values.finishGlitchAmount>0||values.finishGlitchSplit>0)};
  let drawn=false;
  for(let i=0;i<order.length;i++){
   const kind=order[i];if(!active[kind])continue;drawn=true;
   if(kind==='mosaic'||kind==='rgb'){
    this.finishing??=new FinishingPass(this.gl);
    // Preserve the legacy fused pass when the two active filters remain adjacent.
    const fused=kind==='mosaic'&&order[i+1]==='rgb'&&active.rgb;
    this.finishing.draw({...values,finishMosaic:kind==='mosaic',finishRgb:kind==='rgb'||fused},w,h);if(fused)i++;
   }else if(kind==='warp'||kind==='glass'){this.opticalFinishing??=new OpticalPass(this.gl);this.opticalFinishing.draw(values,w,h,phase,kind==='glass'?1:0);}
   else if(kind==='glyph'){this.glyphFinishing??=new GlyphPass(this.gl);this.glyphFinishing.draw(values,w,h,phase);}
   else{this.detailFinishing??=new DetailPass(this.gl);this.detailFinishing.draw(values,w,h,phase,kind==='edge'?0:1);}
  }
 }

 transitionAmount(s,p){if(s.pLiving!==4||!s.pVeilFromForm)return 1;const m=sampleFrame(s,p).pVeilMorph/.12;return m<=0?0:m>=1?1:m*m*(3-2*m);}
 draw(s,p,w,h,o={}){
  // Measure the complete composed frame, including filters and transitions.
  // Inner timers must be disabled: WebGL forbids nested elapsed-time queries.
  this.pollGpuTime();const g=this.gl,q=o.preview&&o.trackTiming!==false&&this.frameTimer&&this.frameQueries.length<3?g.createQuery():null;
  if(q)g.beginQuery(this.frameTimer.TIME_ELAPSED_EXT,q);
  const inner={...o,trackTiming:false,deferCompletion:true};let completed=false;
  try{const mix=this.transitionAmount(s,p);if(mix>0&&mix<1){const base=this.sourceState(s);if(!this.select(base).draw(finishingSource(base,o),p,w,h,inner))return false;this.veilTransition??=new VeilTransition(this.gl);this.veilTransition.capture(0,w,h);}s=this.endpoint(s,p);const ok=this.select(s).draw(finishingSource(s,o),p,w,h,inner);if(ok){if(mix>0&&mix<1)this.veilTransition.draw(w,h,mix);this.filaments(s,p,w,h,o);this.finish(s,o,p);completed=true;}return ok;}
  finally{if(q){g.endQuery(this.frameTimer.TIME_ELAPSED_EXT);this.frameQueries.push(q);}if(completed)this.fence();else if(q)g.flush();}
 }
 async drawWithTransition(method,s,p,w,h,o){const mix=this.transitionAmount(s,p);if(mix>0&&mix<1){const base=this.sourceState(s);if(!await this.select(base)[method](finishingSource(base,o),p,w,h,o)||o.cancelled?.())return false;this.veilTransition??=new VeilTransition(this.gl);this.veilTransition.capture(0,w,h);}s=this.endpoint(s,p);const ok=await this.select(s)[method](finishingSource(s,o),p,w,h,o);if(!ok||o.cancelled?.())return false;if(mix>0&&mix<1)this.veilTransition.draw(w,h,mix);this.filaments(s,p,w,h,o);this.finish(s,o,p);this.fence();return this.waitForGpu(o);}
 async drawAccumulated(s,p,w,h,o={}){return this.drawWithTransition('drawAccumulated',s,p,w,h,o);}
 async drawTiled(s,p,w,h,o={}){return this.drawWithTransition('drawTiled',s,p,w,h,o);}
 fence(){if(this.impl?.completionSync)this.gl.deleteSync(this.impl.completionSync);this.impl.completionSync=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);this.gl.flush();}
 pollGpuTime(){this.impl?.pollGpuTime();const g=this.gl,e=this.frameTimer;if(!e||g.isContextLost())return;const disjoint=g.getParameter(e.GPU_DISJOINT_EXT);while(this.frameQueries.length&&(disjoint||g.getQueryParameter(this.frameQueries[0],g.QUERY_RESULT_AVAILABLE))){const q=this.frameQueries.shift();if(!disjoint){const ms=g.getQueryParameter(q,g.QUERY_RESULT)/1e6;if(Number.isFinite(ms)&&ms>0){this.frameGpuMs=ms;this.frameGpuSample++;}}g.deleteQuery(q);}if(disjoint)this.frameGpuMs=null;}pollCompletion(){return this.impl?.pollCompletion();}async waitForGpu(o){return this.impl?this.impl.waitForGpu(o):true;}
 hardwareInfo(){if(this.impl)return this.impl.hardwareInfo();const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name)};}
 pixels(){return this.impl.pixels();}releaseSurface(){const ok=this.impl?.releaseSurface()??true;if(ok){this.filamentPass?.release();this.finishing?.release();this.glyphFinishing?.release();this.detailFinishing?.release();this.opticalFinishing?.release();}return ok;}
 dispose(o){if(!this.gl.isContextLost())for(const q of this.frameQueries)this.gl.deleteQuery(q);this.frameQueries=[];this.filamentPass?.dispose();this.filamentPass=null;this.veilTransition?.dispose();this.veilTransition=null;this.opticalFinishing?.dispose();this.opticalFinishing=null;this.detailFinishing?.dispose();this.detailFinishing=null;this.finishing?.dispose();this.finishing=null;this.glyphFinishing?.dispose();this.glyphFinishing=null;const implementations=new Set([...Object.values(this.implementations||{}),this.impl].filter(Boolean));for(const renderer of implementations)renderer.dispose({loseContext:false});if(o?.loseContext!==false)this.recoveryExtension?.loseContext();this.implementations={};this.impl=null;this.kind=null;}
}
