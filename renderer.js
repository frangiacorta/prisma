import {VeilTransition} from './veil-transition.js?v=11e11510d06f';
import {sampleFrame,Renderer as SolidRenderer} from './solid-renderer.js?v=11e11510d06f';
import {ParticleRenderer} from './particle-renderer.js?v=11e11510d06f';
import {FinishingPass,GlyphPass,DetailPass,FINISH_DEFAULTS,normalizeFinishOrder,finishingOff,finishingSource} from './finishing.js?v=11e11510d06f';
export {fieldAt,sampleFrame} from './solid-renderer.js?v=11e11510d06f';
// One editor and export contract; the saved creation chooses its renderer.
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.context)throw Error('WebGL 2 non disponibile.');}
 sourceState(s){return {...s,pLiving:s.pVeilSourceKind===4?0:s.pVeilSourceKind||0,engine:s.pVeilSourceKind>0?'particles':'solid'};}
 endpoint(s,p=0){return s.pLiving===4&&s.pVeilFromForm&&sampleFrame(s,p).pVeilMorph<=0?this.sourceState(s):s;}
 select(s){const kind=(s?.engine==='particles'||s?.pLiving>0)?'particles':'solid';if(this.kind!==kind){this.implementations??={};if(this.impl)this.implementations[this.kind]=this.impl;this.context.bindVertexArray(null);this.context.bindFramebuffer(this.context.FRAMEBUFFER,null);this.context.disable(this.context.BLEND);this.impl=this.implementations[kind]||(kind==='particles'?new ParticleRenderer(this.canvas):new SolidRenderer(this.canvas));this.kind=kind;}if(kind==='solid'){const g=this.context;g.bindVertexArray(null);g.bindBuffer(g.ARRAY_BUFFER,this.impl.buffer);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);g.disableVertexAttribArray(1);g.disableVertexAttribArray(2);g.disableVertexAttribArray(3);g.disable(g.DEPTH_TEST);g.disable(g.BLEND);}return this.impl;}
 get gl(){return this.context;}get maxSize(){return Math.min(4096,this.context.getParameter(this.context.MAX_TEXTURE_SIZE));}
 get recoveryExtension(){return this.context.getExtension('WEBGL_lose_context');}
 get completionSync(){return this.impl?.completionSync;}get completedFrames(){return this.impl?.completedFrames||0;}
 get gpuSample(){return this.impl?.gpuSample||0;}get gpuMilliseconds(){return this.impl?.gpuMilliseconds;}get timerExtension(){return this.impl?.timerExtension;}get bakeUploads(){return this.impl?.bakeUploads||0;}
 prepare(s,p,o){s=this.endpoint(s,p);return this.select(s).prepare(s,p,o);}prepareAsync(s,p,o){s=this.endpoint(s,p);return this.select(s).prepareAsync(s,p,o);}
 finish(s,o={},phase=0){
  if(finishingOff(s,o))return;
  const values={...FINISH_DEFAULTS,...s},order=normalizeFinishOrder(s.finishOrder),w=this.canvas.width,h=this.canvas.height;
  const active={mosaic:values.finishMosaic&&values.finishMosaicMix>0,rgb:values.finishRgb&&values.finishRgbMix>0,edge:values.finishEdge&&values.finishEdgeMix>0,glyph:values.finishGlyph&&values.finishGlyphMix>0,glitch:values.finishGlitch&&values.finishGlitchMix>0&&values.finishGlitchCoverage>0&&(values.finishGlitchAmount>0||values.finishGlitchSplit>0)};
  let drawn=false;
  for(let i=0;i<order.length;i++){
   const kind=order[i];if(!active[kind])continue;drawn=true;
   if(kind==='mosaic'||kind==='rgb'){
    this.finishing??=new FinishingPass(this.gl);
    // Preserve the legacy fused pass when the two active filters remain adjacent.
    const fused=kind==='mosaic'&&order[i+1]==='rgb'&&active.rgb;
    this.finishing.draw({...values,finishMosaic:kind==='mosaic',finishRgb:kind==='rgb'||fused},w,h);if(fused)i++;
   }else if(kind==='glyph'){this.glyphFinishing??=new GlyphPass(this.gl);this.glyphFinishing.draw(values,w,h,phase);}
   else{this.detailFinishing??=new DetailPass(this.gl);this.detailFinishing.draw(values,w,h,phase,kind==='edge'?0:1);}
  }
  if(drawn){if(this.impl.completionSync)this.gl.deleteSync(this.impl.completionSync);this.impl.completionSync=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);this.gl.flush();}
 }

 transitionAmount(s,p){if(s.pLiving!==4||!s.pVeilFromForm)return 1;const m=sampleFrame(s,p).pVeilMorph/.12;return m<=0?0:m>=1?1:m*m*(3-2*m);}
 draw(s,p,w,h,o={}){const mix=this.transitionAmount(s,p);if(mix>0&&mix<1){const base=this.sourceState(s);if(!this.select(base).draw(finishingSource(base,o),p,w,h,o))return false;this.veilTransition??=new VeilTransition(this.gl);this.veilTransition.capture(0,w,h);}s=this.endpoint(s,p);const ok=this.select(s).draw(finishingSource(s,o),p,w,h,o);if(ok){if(mix>0&&mix<1)this.veilTransition.draw(w,h,mix);this.finish(s,o,p);this.fence();}return ok;}
 async drawWithTransition(method,s,p,w,h,o){const mix=this.transitionAmount(s,p);if(mix>0&&mix<1){const base=this.sourceState(s);if(!await this.select(base)[method](finishingSource(base,o),p,w,h,o)||o.cancelled?.())return false;this.veilTransition??=new VeilTransition(this.gl);this.veilTransition.capture(0,w,h);}s=this.endpoint(s,p);const ok=await this.select(s)[method](finishingSource(s,o),p,w,h,o);if(!ok||o.cancelled?.())return false;if(mix>0&&mix<1)this.veilTransition.draw(w,h,mix);this.finish(s,o,p);this.fence();return this.waitForGpu(o);}
 async drawAccumulated(s,p,w,h,o={}){return this.drawWithTransition('drawAccumulated',s,p,w,h,o);}
 async drawTiled(s,p,w,h,o={}){return this.drawWithTransition('drawTiled',s,p,w,h,o);}
 fence(){if(this.impl?.completionSync)this.gl.deleteSync(this.impl.completionSync);this.impl.completionSync=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);this.gl.flush();}
 pollGpuTime(){return this.impl?.pollGpuTime();}pollCompletion(){return this.impl?.pollCompletion();}async waitForGpu(o){return this.impl?this.impl.waitForGpu(o):true;}
 hardwareInfo(){if(this.impl)return this.impl.hardwareInfo();const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name)};}
 pixels(){return this.impl.pixels();}releaseSurface(){const ok=this.impl?.releaseSurface()??true;if(ok){this.finishing?.release();this.glyphFinishing?.release();this.detailFinishing?.release();}return ok;}
 dispose(o){this.veilTransition?.dispose();this.veilTransition=null;this.detailFinishing?.dispose();this.detailFinishing=null;this.finishing?.dispose();this.finishing=null;this.glyphFinishing?.dispose();this.glyphFinishing=null;const implementations=new Set([...Object.values(this.implementations||{}),this.impl].filter(Boolean));for(const renderer of implementations)renderer.dispose({loseContext:false});if(o?.loseContext!==false)this.recoveryExtension?.loseContext();this.implementations={};this.impl=null;this.kind=null;}
}
