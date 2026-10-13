import {Renderer as SolidRenderer} from './solid-renderer.js?v=b8fddb013af6';
import {ParticleRenderer} from './particle-renderer.js?v=b8fddb013af6';
import {FinishingPass,GlyphPass,DetailPass,FINISH_DEFAULTS,normalizeFinishOrder,finishingOff,finishingSource} from './finishing.js?v=b8fddb013af6';
export {fieldAt,sampleFrame} from './solid-renderer.js?v=b8fddb013af6';
// One editor and export contract; the saved creation chooses its renderer.
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.context)throw Error('WebGL 2 non disponibile.');}
 select(s){const kind=(s?.engine==='particles'||s?.pLiving>0)?'particles':'solid';if(this.kind!==kind){this.impl?.dispose({loseContext:false});this.context.bindVertexArray(null);this.context.bindFramebuffer(this.context.FRAMEBUFFER,null);this.context.disable(this.context.BLEND);this.impl=kind==='particles'?new ParticleRenderer(this.canvas):new SolidRenderer(this.canvas);this.kind=kind;}return this.impl;}
 get gl(){return this.context;}get maxSize(){return Math.min(4096,this.context.getParameter(this.context.MAX_TEXTURE_SIZE));}
 get recoveryExtension(){return this.context.getExtension('WEBGL_lose_context');}
 get completionSync(){return this.impl?.completionSync;}get completedFrames(){return this.impl?.completedFrames||0;}
 get gpuSample(){return this.impl?.gpuSample||0;}get gpuMilliseconds(){return this.impl?.gpuMilliseconds;}get timerExtension(){return this.impl?.timerExtension;}get bakeUploads(){return this.impl?.bakeUploads||0;}
 prepare(s,p,o){return this.select(s).prepare(s,p,o);}prepareAsync(s,p,o){return this.select(s).prepareAsync(s,p,o);}
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

 draw(s,p,w,h,o={}){const ok=this.select(s).draw(finishingSource(s,o),p,w,h,o);if(ok)this.finish(s,o,p);return ok;}
 async drawAccumulated(s,p,w,h,o={}){const ok=await this.select(s).drawAccumulated(finishingSource(s,o),p,w,h,o);if(!ok||o.cancelled?.())return false;this.finish(s,o,p);return this.waitForGpu(o);}
 async drawTiled(s,p,w,h,o={}){const ok=await this.select(s).drawTiled(finishingSource(s,o),p,w,h,o);if(!ok||o.cancelled?.())return false;this.finish(s,o,p);return this.waitForGpu(o);}
 pollGpuTime(){return this.impl?.pollGpuTime();}pollCompletion(){return this.impl?.pollCompletion();}async waitForGpu(o){return this.impl?this.impl.waitForGpu(o):true;}
 hardwareInfo(){if(this.impl)return this.impl.hardwareInfo();const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name)};}
 pixels(){return this.impl.pixels();}releaseSurface(){const ok=this.impl?.releaseSurface()??true;if(ok){this.finishing?.release();this.glyphFinishing?.release();this.detailFinishing?.release();}return ok;}
 dispose(o){this.detailFinishing?.dispose();this.detailFinishing=null;this.finishing?.dispose();this.finishing=null;this.glyphFinishing?.dispose();this.glyphFinishing=null;this.impl?.dispose(o);this.impl=null;this.kind=null;}
}
