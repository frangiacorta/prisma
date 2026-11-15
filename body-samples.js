// Sample the same local distance field the surface uses, before the camera
// transform. Sampling is deterministic at any phase, including export seeks.
import {BASE_FORM_GLSL} from './base-forms.js?v=0049c9863913';

export const bodyFieldGLSL = `
uniform highp sampler2D uField;
uniform vec4 uAtlas;
uniform vec3 uMin,uMax;
uniform vec2 uWarp;
uniform float uFloat,uPrimitive,uDeferred,uCavity;
${BASE_FORM_GLSL}
vec2 sliceAt(vec2 xy,float z){
 vec2 tile=vec2(mod(z,uAtlas.y),floor(z/uAtlas.y));
 vec4 a=texture(uField,(tile*(uAtlas.x+2.)+xy+1.5)/uAtlas.z);
 if(uFloat>.5)return a.rg;
 return (vec2(dot(a.rg,vec2(1.,1./255.)),dot(a.ba,vec2(1.,1./255.)))-.5)*2.*uAtlas.w;
}
float outerDistance(vec3 p){
 if(uPrimitive>.5)return baseFormField(p);
 if(any(notEqual(uWarp,vec2(0.)))){float a=uWarp.x*p.y*.7+uWarp.y;p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;}
 vec3 clamped=clamp(p,uMin,uMax);
 vec3 index=(clamped-uMin)/(uMax-uMin)*(uAtlas.x-1.);
 float slice=floor(index.z);
 vec2 d=mix(sliceAt(index.xy,slice),sliceAt(index.xy,min(slice+1.,uAtlas.x-1.)),fract(index.z));
 return (uDeferred>.5?max(d.x,d.y):d.x)+length(clamped-p);
}
float distanceAt(vec3 p){
 float d=outerDistance(p);
 return uCavity>0.?max(d,-d-(1.-uCavity)):d;
}
`;

export function bindBodyField(gl,field,placeholder,loc){
 gl.activeTexture(gl.TEXTURE0);
 gl.bindTexture(gl.TEXTURE_2D,field?.texture||placeholder);
 gl.uniform1i(loc('uField'),0);
 gl.uniform3fv(loc('uMin'),field?.lo||[-1,-1,-1]);gl.uniform3fv(loc('uMax'),field?.hi||[1,1,1]);
 gl.uniform4fv(loc('uAtlas'),field?.atlas||[1,1,1,1]);gl.uniform2fv(loc('uWarp'),field?.warp||[0,0]);
 gl.uniform1f(loc('uFloat'),+!!field?.float);gl.uniform1f(loc('uPrimitive'),field?.sphere||field?.primitive?1:0);
 gl.uniform1f(loc('uBaseForm'),field?.form||0);gl.uniform1f(loc('uDeferred'),+!!field?.deferred);
 gl.uniform1f(loc('uCavity'),field?.inner||0);
}

const vertex = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;

const fragment = `#version 300 es
precision highp float;
precision highp int;
${bodyFieldGLSL}
uniform vec2 uProfile;
out vec4 samplePoint;
uint scramble(uint x){x^=x>>16u;x*=0x7feb352du;x^=x>>15u;x*=0x846ca68bu;return x^(x>>16u);}
float random(inout uint x){x=scramble(x);return float(x>>8u)/16777216.;}
float refine(vec3 start,vec3 axis,float lo,float hi,bool inside){
 for(int i=0;i<6;i++){float mid=(lo+hi)*.5;if((distanceAt(start+axis*mid)<0.)==inside)lo=mid;else hi=mid;}
 return (lo+hi)*.5;
}
void main(){
 uint randomState=uint(int(gl_FragCoord.x)+512*int(gl_FragCoord.y))+1u;
 int normalAxis=int(floor(random(randomState)*3.));
 vec3 start=mix(uMin,uMax,vec3(random(randomState),random(randomState),random(randomState)));
 float direction=random(randomState)<.5?-1.:1.;
 vec3 axis=vec3(0.);axis[normalAxis]=direction;
 float span=uMax[normalAxis]-uMin[normalAxis];
 start[normalAxis]=direction>0.?uMin[normalAxis]:uMax[normalAxis];
 float stepSize=span/max(96.,uAtlas.x*1.4),end=0.,entry=-1.,t=0.,last=0.;
 // Skip empty space conservatively and keep sub-voxel steps near boundaries.
 // Entry and exit both contribute, so the sides of holes also seed particles.
 for(int i=0;i<300;i++){
  float d=distanceAt(start+axis*t);
  if(d<0.&&entry<0.){
   entry=refine(start,axis,last,t,false);
  }else if(d>=0.&&entry>=0.){end=refine(start,axis,last,t,true);break;}
  if(t>=span){end=t;break;}
  last=t;t=min(span,t+clamp(abs(d)*.55,stepSize,span*.15));
 }
 if(entry<0.){samplePoint=vec4(0.);return;}
 end=max(entry,end);
 float along=random(randomState),shell=along>.5?end:entry;
 float inside=mix(shell,mix(entry,end,pow(random(randomState),exp2(uProfile.y*2.))),uProfile.x);
 vec3 q=start+axis*inside;
 samplePoint=vec4(clamp((q-uMin)/(uMax-uMin),0.,1.),1.);
}`;

export const bodySampleGLSL = `
uniform highp sampler2D uStudioSamples;
uniform vec3 uStudioMin,uStudioMax;
uniform vec4 uStudioBody; // source, scatter, grain fill, radial density
uniform ivec2 uStudioSampleSize;
uniform float uStudioPerspective,uStudioInner;
vec3 studioRestPoint(vec4 r){
 if(uStudioBody.x<1.5){
  float y=1.-2.*r.y,angle=TAU*r.x,parallel=sqrt(max(0.,1.-y*y));
  float central=pow(r.z,exp2(2.*uStudioBody.w)),inner=uStudioInner*uStudioInner*uStudioInner;
  float radius=mix(1.,pow(mix(inner,1.,central),1./3.),uStudioBody.z);
  return radius*vec3(parallel*cos(angle),y,parallel*sin(angle));
 }
 vec4 v=vec4(0.);uint h=floatBitsToUint(r.x)^floatBitsToUint(r.y)*1664525u^floatBitsToUint(r.w);
 for(int i=0;i<20;i++){
  h=(h^uint(i+1))*747796405u+2891336453u;
  uint x=h>>8u;
  ivec2 at=ivec2(int(x%uint(uStudioSampleSize.x)),int((x/uint(uStudioSampleSize.x))%uint(uStudioSampleSize.y)));
  v=texelFetch(uStudioSamples,at,0);
  if(v.a>.5)return mix(uStudioMin,uStudioMax,v.xyz);
 }
 // Keep a sample that missed every interval out of the projection.
 return vec3(0.,0.,-1200.);
}
vec3 studioTransform(vec3 p){
 p*=vec3(uForm.xy,max(.06,uForm.z*uForm.w));
 p.yz=rot(-uRotation.x)*p.yz;p.xz=rot(-uRotation.y)*p.xz;p.xy=rot(-uRotation.z)*p.xy;
 return p*uFrame.x+vec3(uFrame.yz,0.);
}
`;

export class BodySamples {
 constructor(gl){this.gl=gl;this.vao=gl.createVertexArray();this.width=512;this.height=96;this.key='';}
 prepare(){
  const gl=this.gl;
  if(this.program)return;
  this.program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
   const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
   gl.attachShader(this.program,shader);gl.deleteShader(shader);
  }
  gl.linkProgram(this.program);
  this.parallel=gl.getExtension('KHR_parallel_shader_compile');
 }
 ready(){
  this.prepare();
  if(this.linked)return true;
  const gl=this.gl;
  if(this.parallel&&!gl.getProgramParameter(this.program,this.parallel.COMPLETION_STATUS_KHR))return false;
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS)){
   const error=gl.getAttachedShaders(this.program).map(s=>gl.getShaderInfoLog(s)).filter(Boolean).join('\n');
   throw Error(error||gl.getProgramInfoLog(this.program)||'Impossibile distribuire i granelli.');
  }
  this.linked=true;return true;
 }
 update(field,s,options){
  if(field.sphere)return {kind:1,inner:field.inner,texture:null,lo:field.lo,hi:field.hi};
  const gl=this.gl, height=options.preview&&options.quality==='fast'?96:192;
  const key=[field.key,field.inner,s.pFill,s.pCloudCore,height].join('|');
  if(this.key!==key){
   if(!this.framebuffer){this.framebuffer=gl.createFramebuffer();this.texture=gl.createTexture();}
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
   if(this.height!==height||!this.allocated){
    this.height=height;this.allocated=true;
    const float=!!gl.getExtension('EXT_color_buffer_float');
    gl.texImage2D(gl.TEXTURE_2D,0,float?gl.RGBA16F:gl.RGBA8,this.width,height,0,gl.RGBA,float?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
   }
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Buffer dei granelli non disponibile.');
   gl.viewport(0,0,this.width,height);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
   gl.bindVertexArray(this.vao);gl.useProgram(this.program);
   const loc=name=>gl.getUniformLocation(this.program,name);
   bindBodyField(gl,field,null,loc);
   gl.uniform2f(loc('uProfile'),s.pFill??0,s.pCloudCore??0);
   gl.drawArrays(gl.TRIANGLES,0,3);gl.bindVertexArray(null);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   this.key=key;
  }
  return {kind:2,texture:this.texture,lo:field.lo,hi:field.hi,width:this.width,height:this.height,key};
 }
 dispose(){
  const gl=this.gl;gl.deleteTexture(this.texture);gl.deleteFramebuffer(this.framebuffer);gl.deleteProgram(this.program);gl.deleteVertexArray(this.vao);
 }
}
