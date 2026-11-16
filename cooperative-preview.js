// Render a complete frame on a private surface. The visible canvas changes
// only after the frame and all its filters have finished successfully.
export class CooperativePreview{
 constructor(owner,createRenderer){this.owner=owner;this.canvas=document.createElement('canvas');this.worker=createRenderer(this.canvas);this.generation=0;this.job=null;this.disposed=false;this.error=null;}
 get busy(){return!!this.job;}
 checkError(){if(this.error){const error=this.error;this.error=null;throw error;}}
 prepare(source,phase,options){this.checkError();return this.worker.prepare(source,phase,{...options,cooperative:false});}
 cancel(){this.generation++;if(this.job)this.job.cancelled=true;this.error=null;}
 async stop(){this.cancel();if(this.job)await this.job.promise;}
 submit(source,phase,width,height,options){
  this.checkError();if(this.job||this.disposed)return false;
  const generation=this.generation,ownerWidth=this.owner.canvas.width,ownerHeight=this.owner.canvas.height,job={cancelled:false,source:structuredClone(source),phase,width,height,promise:null};this.job=job;
  const cancelled=()=>this.disposed||job.cancelled||generation!==this.generation||this.owner.canvas.width!==ownerWidth||this.owner.canvas.height!==ownerHeight||options.cancelled?.();
  job.promise=Promise.resolve().then(async()=>{const started=performance.now();try{
   const complete=await this.worker.drawAccumulated(job.source,phase,width,height,{...options,cooperative:false,samples:1,cancelled});
   if(complete&&!cancelled()&&!this.owner.gl.isContextLost()){
    this.worker.pollGpuTime();this.stats={phase,width,height,wallMs:performance.now()-started,gpuMs:this.worker.impl?.gpuMilliseconds??null};
    this.present(job);this.owner.lastPreviewDynamicsFrame=this.worker.dynamicsFrame;
    if(Number.isFinite(this.stats.gpuMs)){this.owner.frameGpuMs=this.stats.gpuMs;this.owner.frameGpuSample++;}
   }
  }catch(error){if(!cancelled())this.error=error;}finally{try{if(!this.disposed&&!this.worker.gl.isContextLost())await this.worker.waitForGpu();}catch{}if(this.job===job)this.job=null;}});
  return true;
 }
 present(job){
  const owner=this.owner,g=owner.gl;owner.select({engine:'solid',pLiving:0});
  if(!this.program){
   const compile=(type,source)=>{const shader=g.createShader(type);g.shaderSource(shader,source);g.compileShader(shader);if(!g.getShaderParameter(shader,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(shader));return shader;};
   const vertex=compile(g.VERTEX_SHADER,'#version 300 es\nout vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}');
   const fragment=compile(g.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;uniform sampler2D uImage;in vec2 uv;out vec4 color;void main(){color=texture(uImage,uv);}');
   this.program=g.createProgram();g.attachShader(this.program,vertex);g.attachShader(this.program,fragment);g.linkProgram(this.program);g.deleteShader(vertex);g.deleteShader(fragment);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.program));this.imageUniform=g.getUniformLocation(this.program,'uImage');this.texture=g.createTexture();
  }
  if(owner.canvas.width!==job.width||owner.canvas.height!==job.height){owner.canvas.width=job.width;owner.canvas.height=job.height;}
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,job.width,job.height);g.disable(g.DEPTH_TEST);g.disable(g.SCISSOR_TEST);g.disable(g.BLEND);g.disable(g.DITHER);g.bindVertexArray(null);g.useProgram(this.program);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.texture);
  const flip=g.getParameter(g.UNPACK_FLIP_Y_WEBGL),premultiply=g.getParameter(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL),colorspace=g.getParameter(g.UNPACK_COLORSPACE_CONVERSION_WEBGL);
  g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL,g.NONE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,this.canvas);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,flip);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL,colorspace);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.uniform1i(this.imageUniform,0);g.drawArrays(g.TRIANGLES,0,3);owner.fence();
 }
 dispose(){this.cancel();this.disposed=true;this.worker.dispose();const g=this.owner.gl;if(!g.isContextLost()){if(this.texture)g.deleteTexture(this.texture);if(this.program)g.deleteProgram(this.program);}this.texture=null;this.program=null;}
}
