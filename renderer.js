import {Renderer as SolidRenderer} from './solid-renderer.js?v=81754f9bfd99';
import {ParticleRenderer} from './particle-renderer.js?v=81754f9bfd99';
import {FinishingPass,GlyphPass,DetailPass,FINISH_DEFAULTS,finishingOff,finishingSource} from './finishing.js?v=81754f9bfd99';
export {fieldAt,sampleFrame} from './solid-renderer.js?v=81754f9bfd99';
// One editor and export contract; the saved creation chooses its renderer.
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.context)throw Error('WebGL 2 non disponibile.');}
 select(s){const kind=(s?.engine==='particles'||s?.pLiving>0)?'particles':'solid';if(this.kind!==kind){this.impl?.dispose({loseContext:false});this.context.bindVertexArray(null);this.context.bindFramebuffer(this.context.FRAMEBUFFER,null);this.context.disable(this.context.BLEND);this.impl=kind==='particles'?new ParticleRenderer(this.canvas):new SolidRenderer(this.canvas);this.kind=kind;}return this.impl;}
 get gl(){return this.context;}get maxSize(){return Math.min(4096,this.context.getParameter(this.context.MAX_TEXTURE_SIZE));}
 get recoveryExtension(){return this.context.getExtension('WEBGL_lose_context');}
 get completionSync(){return this.impl?.completionSync;}get completedFrames(){return this.impl?.completedFrames||0;}
 get gpuSample(){return this.impl?.gpuSample||0;}get gpuMilliseconds(){return this.impl?.gpuMilliseconds;}get timerExtension(){return this.impl?.timerExtension;}get bakeUploads(){return this.impl?.bakeUploads||0;}
 prepare(s,p,o){return this.select(s).prepare(s,p,o);}prepareAsync(s,p,o){return this.select(s).prepareAsync(s,p,o);}
 finish(s,o={},phase=0){if(finishingOff(s,o))return;const base=(s.finishRgb&&s.finishRgbMix>0)||(s.finishMosaic&&s.finishMosaicMix>0),glyph=s.finishGlyph&&s.finishGlyphMix>0;const edge=s.finishEdge&&s.finishEdgeMix>0,glitch=s.finishGlitch&&s.finishGlitchMix>0&&s.finishGlitchCoverage>0&&(s.finishGlitchAmount>0||s.finishGlitchSplit>0);if(!base&&!glyph&&!edge&&!glitch)return;const values={...FINISH_DEFAULTS,...s},w=this.canvas.width,h=this.canvas.height;if(base){this.finishing??=new FinishingPass(this.gl);this.finishing.draw(values,w,h);}if(edge){this.detailFinishing??=new DetailPass(this.gl);this.detailFinishing.draw(values,w,h,phase,0);}if(glyph){this.glyphFinishing??=new GlyphPass(this.gl);this.glyphFinishing.draw(values,w,h,phase);}if(glitch){this.detailFinishing??=new DetailPass(this.gl);this.detailFinishing.draw(values,w,h,phase,1);}if(this.impl.completionSync)this.gl.deleteSync(this.impl.completionSync);this.impl.completionSync=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);this.gl.flush();}
 draw(s,p,w,h,o={}){const ok=this.select(s).draw(finishingSource(s,o),p,w,h,o);if(ok)this.finish(s,o,p);return ok;}
 async drawAccumulated(s,p,w,h,o={}){const ok=await this.select(s).drawAccumulated(finishingSource(s,o),p,w,h,o);if(!ok||o.cancelled?.())return false;this.finish(s,o,p);return this.waitForGpu(o);}
 async drawTiled(s,p,w,h,o={}){const ok=await this.select(s).drawTiled(finishingSource(s,o),p,w,h,o);if(!ok||o.cancelled?.())return false;this.finish(s,o,p);return this.waitForGpu(o);}
 pollGpuTime(){return this.impl?.pollGpuTime();}pollCompletion(){return this.impl?.pollCompletion();}async waitForGpu(o){return this.impl?this.impl.waitForGpu(o):true;}
 hardwareInfo(){if(this.impl)return this.impl.hardwareInfo();const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name)};}
 pixels(){return this.impl.pixels();}releaseSurface(){const ok=this.impl?.releaseSurface()??true;if(ok){this.finishing?.release();this.glyphFinishing?.release();this.detailFinishing?.release();}return ok;}
 dispose(o){this.detailFinishing?.dispose();this.detailFinishing=null;this.finishing?.dispose();this.finishing=null;this.glyphFinishing?.dispose();this.glyphFinishing=null;this.impl?.dispose(o);this.impl=null;this.kind=null;}
}
