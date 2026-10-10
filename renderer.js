import {Renderer as SolidRenderer} from './solid-renderer.js?v=c8567bd14506';
import {ParticleRenderer} from './particle-renderer.js?v=c8567bd14506';
import {FinishingPass,FINISH_DEFAULTS,finishingOff,finishingSource} from './finishing.js?v=c8567bd14506';
export {fieldAt,sampleFrame} from './solid-renderer.js?v=c8567bd14506';
// One editor and export contract; the saved creation chooses its renderer.
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.context)throw Error('WebGL 2 non disponibile.');}
 select(s){const kind=s?.engine==='particles'?'particles':'solid';if(this.kind!==kind){this.impl?.dispose({loseContext:false});this.context.bindVertexArray(null);this.context.bindFramebuffer(this.context.FRAMEBUFFER,null);this.context.disable(this.context.BLEND);this.impl=kind==='particles'?new ParticleRenderer(this.canvas):new SolidRenderer(this.canvas);this.kind=kind;}return this.impl;}
 get gl(){return this.context;}get maxSize(){return Math.min(4096,this.context.getParameter(this.context.MAX_TEXTURE_SIZE));}
 get recoveryExtension(){return this.context.getExtension('WEBGL_lose_context');}
 get completionSync(){return this.impl?.completionSync;}get completedFrames(){return this.impl?.completedFrames||0;}
 get gpuSample(){return this.impl?.gpuSample||0;}get gpuMilliseconds(){return this.impl?.gpuMilliseconds;}get timerExtension(){return this.impl?.timerExtension;}get bakeUploads(){return this.impl?.bakeUploads||0;}
 prepare(s,p,o){return this.select(s).prepare(s,p,o);}prepareAsync(s,p,o){return this.select(s).prepareAsync(s,p,o);}
 finish(s,o={}){if(finishingOff(s,o)||!((s.finishRgb&&s.finishRgbMix>0)||(s.finishMosaic&&s.finishMosaicMix>0)))return;this.finishing??=new FinishingPass(this.gl);this.finishing.draw({...FINISH_DEFAULTS,...s},this.canvas.width,this.canvas.height);if(this.impl.completionSync)this.gl.deleteSync(this.impl.completionSync);this.impl.completionSync=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);this.gl.flush();}
 draw(s,p,w,h,o={}){const ok=this.select(s).draw(finishingSource(s,o),p,w,h,o);if(ok)this.finish(s,o);return ok;}
 async drawAccumulated(s,p,w,h,o={}){const ok=await this.select(s).drawAccumulated(finishingSource(s,o),p,w,h,o);if(!ok||o.cancelled?.())return false;this.finish(s,o);return this.waitForGpu(o);}
 async drawTiled(s,p,w,h,o={}){const ok=await this.select(s).drawTiled(finishingSource(s,o),p,w,h,o);if(!ok||o.cancelled?.())return false;this.finish(s,o);return this.waitForGpu(o);}
 pollGpuTime(){return this.impl?.pollGpuTime();}pollCompletion(){return this.impl?.pollCompletion();}async waitForGpu(o){return this.impl?this.impl.waitForGpu(o):true;}
 hardwareInfo(){if(this.impl)return this.impl.hardwareInfo();const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name)};}
 pixels(){return this.impl.pixels();}releaseSurface(){const ok=this.impl?.releaseSurface()??true;if(ok)this.finishing?.release();return ok;}
 dispose(o){this.finishing?.dispose();this.finishing=null;this.impl?.dispose(o);this.impl=null;this.kind=null;}
}
