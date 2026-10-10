import {Renderer as SolidRenderer} from './solid-renderer.js?v=a9f986a8d913';
import {ParticleRenderer} from './particle-renderer.js?v=a9f986a8d913';
export {fieldAt,sampleFrame} from './solid-renderer.js?v=a9f986a8d913';
// One editor and export contract; the saved creation chooses its renderer.
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.context)throw Error('WebGL 2 non disponibile.');}
 select(s){const kind=s?.engine==='particles'?'particles':'solid';if(this.kind!==kind){this.impl?.dispose({loseContext:false});this.context.bindVertexArray(null);this.context.bindFramebuffer(this.context.FRAMEBUFFER,null);this.context.disable(this.context.BLEND);this.impl=kind==='particles'?new ParticleRenderer(this.canvas):new SolidRenderer(this.canvas);this.kind=kind;}return this.impl;}
 get gl(){return this.context;}get maxSize(){return Math.min(4096,this.context.getParameter(this.context.MAX_TEXTURE_SIZE));}
 get recoveryExtension(){return this.context.getExtension('WEBGL_lose_context');}
 get completionSync(){return this.impl?.completionSync;}get completedFrames(){return this.impl?.completedFrames||0;}
 get gpuSample(){return this.impl?.gpuSample||0;}get gpuMilliseconds(){return this.impl?.gpuMilliseconds;}get timerExtension(){return this.impl?.timerExtension;}get bakeUploads(){return this.impl?.bakeUploads||0;}
 prepare(s,p,o){return this.select(s).prepare(s,p,o);}prepareAsync(s,p,o){return this.select(s).prepareAsync(s,p,o);}
 draw(s,...args){return this.select(s).draw(s,...args);}drawAccumulated(s,...args){return this.select(s).drawAccumulated(s,...args);}drawTiled(s,...args){return this.select(s).drawTiled(s,...args);}
 pollGpuTime(){return this.impl?.pollGpuTime();}pollCompletion(){return this.impl?.pollCompletion();}async waitForGpu(o){return this.impl?this.impl.waitForGpu(o):true;}
 hardwareInfo(){if(this.impl)return this.impl.hardwareInfo();const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name)};}
 pixels(){return this.impl.pixels();}releaseSurface(){return this.impl?.releaseSurface()??true;}
 dispose(o){this.impl?.dispose(o);this.impl=null;this.kind=null;}
}
