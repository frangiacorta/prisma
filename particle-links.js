import {buildLinks3D,makeLinkBuffers} from './vendor/particle-hero/links-3d.js?v=336f6e73d149';
import {guideGLSL} from './particle-path-field.js?v=336f6e73d149';
import {forceBarrierGLSL} from './particle-forces.js?v=336f6e73d149';

// Stable topology in the nucleus rest configuration. Movement, fields and
// materials are evaluated by the same GLSL as the visible particles each frame.
const GRAPH_KEYS=['seed','pLinkNodes','pLinkReach','pLinkNeighbors','pOpening','pThickness','pFill','pClumps','pLobes','pLobeDepth','pNeural','pNodes','pConnect','stretchX','stretchY','stretchZ','volume'];
export class ParticleLinks {
 constructor(owner,common){
  this.owner=owner;this.gl=owner.gl;this.count=0;this.builds=0;this.key='';
  const gl=this.gl;
  this.capture=owner.program(`#version 300 es
precision highp float;layout(location=0) in vec4 aRandom;
${common}
out vec3 linkRest;
void main(){linkRest=restPoint(aRandom)*vec3(uForm.xy,uForm.z*uForm.w);gl_Position=vec4(0.,0.,0.,1.);}`,`#version 300 es
precision highp float;out vec4 color;void main(){color=vec4(0.);}`,['linkRest']);
  this.program=owner.program(`#version 300 es
precision highp float;precision highp sampler2D;
layout(location=0) in vec3 aPair;
${common}
uniform sampler2D uSeeds;uniform vec4 uLinks;uniform vec3 uShadeOrigin;
out vec3 vColor,vPosition;flat out vec4 vForceSeed;out float vOpacity,vSide;
vec4 seedAt(int i){return texelFetch(uSeeds,ivec2(i%1024,i/1024),0);}
void main(){
 // Eight short ribbons per connection, with endpoints exactly on the particles.
 int triangle=gl_VertexID%6,segment=gl_VertexID/6;
 bool endPoint=triangle==1||triangle==2||triangle==4;
 float t=(float(segment)+(endPoint?1.:0.))/8.;
 float side=(triangle==0||triangle==1||triangle==3)?-1.:1.;
 vec4 ra=seedAt(int(aPair.x)),rb=seedAt(int(aPair.y));
 vec3 a=position(ra,uPhase),b=position(rb,uPhase),delta=b-a;
 float len=length(delta),reference=max(.001,aPair.z*uFrame.x);
 vec3 outward=(a+b)*.5-uShadeOrigin;
 vec3 bend=outward-delta*dot(outward,delta)/max(.000001,dot(delta,delta));
 bend=normalize(bend+vec3(.00001))*len*uLinks.z;
 vec3 p=sceneBarriers(mix(a,b,t)+bend*(4.*t*(1.-t)),ra,uPhase);vPosition=p;vForceSeed=ra;
 vec3 tangent=delta+bend*(4.-8.*t);
 vec4 clip=project(p);vec2 line=(project(p+tangent*.01).xy-project(p-tangent*.01).xy)*uResolution;
 vec2 normal=vec2(-line.y,line.x)/max(.00001,length(line));
 float width=uLinks.y*uResolution.y/1080.;
 clip.xy+=normal*side*max(1.,width)/uResolution;gl_Position=clip;vSide=side;
 vec3 base=mix(particleColor(ra,a),particleColor(rb,b),t);
 vColor=shadeFibre(base,p,normalize(p-uShadeOrigin+vec3(.00001)),tangent);
 float tension=1.-smoothstep(uLinks.w*.7,uLinks.w,len/reference);
 vOpacity=uLinks.x*min(1.,width)*tension;
}`,`#version 300 es
precision highp float;in vec3 vColor,vPosition;flat in vec4 vForceSeed;in float vOpacity,vSide;out vec4 color;
${forceBarrierGLSL}
${guideGLSL}
uniform float uPhase;
void main(){if(insideForceCore(vPosition)||insideGuideCore(vPosition,vForceSeed,uPhase))discard;float a=vOpacity*(1.-smoothstep(.1,1.,abs(vSide)));color=vec4(vColor*a,a);}`);
  this.feedback=gl.createTransformFeedback();this.captureBuffer=gl.createBuffer();
  this.buffer=gl.createBuffer();this.vao=gl.createVertexArray();
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,1);gl.bindVertexArray(null);
  this.links=makeLinkBuffers(20000);
 }
 prepare(s){
  const key=JSON.stringify(GRAPH_KEYS.map(k=>s[k]));if(key===this.key)return;
  const start=performance.now(),o=this.owner,gl=this.gl,n=Math.max(2,Math.min(4000,Math.round(s.pLinkNodes)));
  o.settings(this.capture,s,0);
  gl.bindVertexArray(o.pointVAO);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.feedback);
  gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.captureBuffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,n*12,gl.DYNAMIC_READ);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.captureBuffer);gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,n);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
  const xyz=new Float32Array(n*3);gl.bindBuffer(gl.ARRAY_BUFFER,this.captureBuffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,xyz);
  const x=new Float32Array(n),y=new Float32Array(n),z=new Float32Array(n);
  for(let i=0;i<n;i++){x[i]=xyz[i*3];y[i]=xyz[i*3+1];z[i]=xyz[i*3+2];}
  buildLinks3D(x,y,z,n,s.pLinkReach,s.pLinkNeighbors,this.links);
  const pairs=new Float32Array(this.links.m*3);
  for(let i=0;i<this.links.m;i++)pairs.set([this.links.pairs[i*2],this.links.pairs[i*2+1],this.links.dists[i]],i*3);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,pairs,gl.STATIC_DRAW);gl.bindVertexArray(null);
  this.count=this.links.m;this.key=key;this.builds++;this.buildMilliseconds=performance.now()-start;
 }
 draw(s,phase){
  if(!(s.pLinks>0))return;
  this.prepare(s);if(!this.count)return;
  const o=this.owner,gl=this.gl,p=this.program;o.settings(p,s,phase);o.tex(p,'uSeeds',o.seedTexture,2);
  o.u(p,'uLinks',s.pLinks,s.pLinkWidth,s.pLinkCurve,s.pLinkStretch);
  gl.bindVertexArray(this.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,48,this.count);
 }
 dispose(){const gl=this.gl;gl.deleteProgram(this.program.program);gl.deleteProgram(this.capture.program);gl.deleteTransformFeedback(this.feedback);gl.deleteBuffer(this.captureBuffer);gl.deleteBuffer(this.buffer);gl.deleteVertexArray(this.vao);}
}
