import {makeLivingTopology,setLivingRest,relaxLiving,preserveLivingVolume} from './living-topology.js?v=643cf87c5a69';
import {excludeForcePositions} from './particle-forces.js?v=643cf87c5a69';

const controls=`uniform vec4 uLivingShape,uLivingFold;uniform float uLivingMode;uniform vec3 uLivingMotion;`;
export class LivingStructures{
 constructor(owner,common){
  this.owner=owner;this.gl=owner.gl;this.key='';this.builds=0;
  const gl=this.gl;
  this.capture=owner.program(`#version 300 es
precision highp float;precision highp int;layout(location=0) in vec4 aRandom;
${common}
${controls}
out vec3 targetPosition;
void main(){
 vec4 r=aRandom;
 if(uLivingMode<1.5){float groups=uLivingShape.x;float band=floor(r.x*groups);r.x=(band+.5+(fract(r.x*groups)-.5)*uLivingShape.y)/groups;}
 r.y=mix(uLivingShape.z*.48,1.,aRandom.y);if(r.y<.00001||r.y>.99999)r.x=.5;
 float delay=uLivingMotion.x*sin(r.x*TAU);
 vec3 p=position(r,uPhase-delay),origin=vec3(uFrame.yz,0.);
 vec3 radial=normalize(p-origin+vec3(.00001));
 float clock=(uPhase-delay)*TAU;
 float envelope=sin(aRandom.y*3.14159265);
 float fold=sin(r.x*TAU*uLivingFold.x+sin(aRandom.y*TAU+clock)*1.2+clock)*envelope;
 float contraction=1.-uLivingFold.w*(.5+.5*sin(clock))*envelope;
 p=origin+(p-origin)*contraction;
 float offset=(uLivingShape.w+fold*uLivingFold.y+uLivingFold.z*sin(clock+aRandom.y*TAU)*envelope
  +uLivingMotion.y*.04*sin(r.x*TAU*31.+clock)*sin(aRandom.y*TAU*3.+clock)*envelope)*uFrame.x;
 // Deep inward folds approach the centre smoothly instead of crossing it and
 // reversing their orientation. Outward expansion retains its original range.
 float inwardRoom=max(.0001,length(p-origin)*.7);
 if(offset<0.)offset=inwardRoom*tanh(offset/inwardRoom);
 p+=radial*offset;
 targetPosition=p;gl_Position=vec4(0.,0.,0.,1.);
}`,`#version 300 es
precision highp float;precision highp int;out vec4 color;void main(){color=vec4(0.);}`,['targetPosition']);
  this.constrain=owner.program(`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;layout(location=0) in vec4 aRandom;
${common}
${controls}
uniform sampler2D uConstraintPositions;uniform int uConstraintColumns;out vec3 targetPosition;
void main(){
 vec4 r=aRandom;if(uLivingMode<1.5){float groups=uLivingShape.x;float band=floor(r.x*groups);r.x=(band+.5+(fract(r.x*groups)-.5)*uLivingShape.y)/groups;}
 r.y=mix(uLivingShape.z*.48,1.,aRandom.y);if(r.y<.00001||r.y>.99999)r.x=.5;
 float phase=uPhase-uLivingMotion.x*sin(r.x*TAU);
 vec3 p=texelFetch(uConstraintPositions,ivec2(gl_VertexID%uConstraintColumns,gl_VertexID/uConstraintColumns),0).xyz;
 targetPosition=sceneBarriers(lockGuidePosition(p,r,phase),r,phase);gl_Position=vec4(0.,0.,0.,1.);
}`,`#version 300 es
precision highp float;out vec4 color;void main(){color=vec4(0.);}`,['targetPosition']);
  const sampling=`uniform sampler2D uLivingPositions;uniform ivec2 uLivingSize;
vec3 at(ivec2 q){q.x=(q.x+uLivingSize.x)%uLivingSize.x;q.y=clamp(q.y,0,uLivingSize.y-1);return texelFetch(uLivingPositions,q,0).xyz;}
vec3 curve(vec3 a,vec3 b,vec3 c,vec3 d,float t){return .5*((2.*b)+(-a+c)*t+(2.*a-5.*b+4.*c-d)*t*t+(-a+3.*b-3.*c+d)*t*t*t);}
vec3 column(ivec2 i,float t){return curve(at(i-ivec2(0,1)),at(i),at(i+ivec2(0,1)),at(i+ivec2(0,2)),t);}
vec3 surface(vec2 uv){vec2 q=uv*vec2(uLivingSize-ivec2(0,1));ivec2 i=ivec2(floor(q));vec2 t=fract(q);return sceneBarriers(mix(column(i,t.y),column(i+ivec2(1,0),t.y),t.x),vec4(uv,.5,.5),uPhase);}
vec3 surfaceNormal(vec2 uv){vec2 e=1./vec2(uLivingSize);return normalize(cross(surface(uv+vec2(e.x,0))-surface(uv-vec2(e.x,0)),surface(uv+vec2(0,e.y))-surface(uv-vec2(0,e.y)))+vec3(.000001));}`;
  this.skin=owner.program(`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
layout(location=0) in vec4 aRandom;
${common}
${sampling}
out vec3 vPosition,vNormal,vCoord;
void main(){vec2 vUV=aRandom.xy;vCoord=vec3(cos(vUV.x*TAU),sin(vUV.x*TAU),vUV.y);vPosition=at(ivec2(gl_VertexID%uLivingSize.x,gl_VertexID/uLivingSize.x));vNormal=surfaceNormal(vUV);gl_Position=project(vPosition);}
`,`#version 300 es
precision highp float;precision highp int;
${common}
in vec3 vPosition,vNormal,vCoord;out vec4 color;
uniform vec4 uLivingSurface;
void main(){
 vec2 vUV=vec2(fract(atan(vCoord.y,vCoord.x)/TAU),vCoord.z);
 if(insideForceCore(vPosition)||insideGuideCore(vPosition,vec4(vUV,.5,.5),uPhase))discard;
 float hole=length((fract(vUV*vec2(uLivingSurface.z,uLivingSurface.z*.65))-.5)*2.);
 float coverage=uLivingSurface.y<=0.?1.:1.-smoothstep(hole-fwidth(hole),hole+fwidth(hole),uLivingSurface.y);
 if(coverage<.05)discard;
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 vec3 base=particleColor(vec4(vUV,.5,.5),vPosition);
 float a=uLivingSurface.x*coverage;
 vec3 lit=shadeParticle(base,vPosition,n);
 color=vec4(lit*a,a);
}`);
  this.fibres=owner.program(`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
${common}
${sampling}
uniform vec4 uLivingThread;uniform float uWeft;
out vec3 vPosition,vNormal,vTangent;out vec2 vUV;out float vSide,vAlpha;
void main(){
 int k=gl_VertexID%6;float endPoint=(k==1||k==2||k==4)?1.:0.;float side=(k==0||k==1||k==3)?-1.:1.;
 float row=float(gl_VertexID/6)+endPoint;
 float u=(float(gl_InstanceID)+.5)/uLivingThread.x;
 if(uWeft<.5&&uLivingThread.w>0.){float g=uLivingThread.w;u=(floor(u*g)+fract(u*g)*(1.-g/float(uLivingSize.x)))/g;}
 vec2 uv=uWeft>.5?vec2(row/float(uLivingSize.x*3),u):vec2(u,row/float((uLivingSize.y-1)*3));
 vec2 e=uWeft>.5?vec2(.002,0):vec2(0,.002);
 vec3 p=surface(uv),tangent=surface(uv+e)-surface(uv-e);
 vec4 clip=project(p);vec2 line=(project(p+tangent).xy-project(p-tangent).xy)*uResolution;
 vec2 normal=vec2(-line.y,line.x)/max(.00001,length(line));
 float width=uLivingThread.y*uResolution.y/1080.;
 clip.xy+=normal*side*max(1.,width)/uResolution;clip.z-=.00015;
 gl_Position=clip;vPosition=p;vNormal=surfaceNormal(uv);vTangent=tangent;vUV=uv;vSide=side;vAlpha=uLivingThread.z*min(1.,width);
}`,`#version 300 es
precision highp float;precision highp int;
${common}
in vec3 vPosition,vNormal,vTangent;in vec2 vUV;in float vSide,vAlpha;out vec4 color;
void main(){if(insideForceCore(vPosition)||insideGuideCore(vPosition,vec4(vUV,.5,.5),uPhase))discard;float a=vAlpha*(1.-smoothstep(.25,1.,abs(vSide)));if(a<.003)discard;
 vec3 lit=shadeFibre(particleColor(vec4(vUV,.5,.5),vPosition),vPosition,normalize(vNormal),vTangent);
 color=vec4(lit*a,a);}`);
  this.feedback=gl.createTransformFeedback();this.captureBuffer=gl.createBuffer();this.seedBuffer=gl.createBuffer();this.indices=gl.createBuffer();this.vao=gl.createVertexArray();this.texture=gl.createTexture();
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.seedBuffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bindVertexArray(null);
 }
 capturePositions(s,phase,constrain=false){
  const o=this.owner,gl=this.gl,p=constrain?this.constrain:this.capture,t=this.topology;o.settings(p,s,phase);
  if(constrain){o.tex(p,'uConstraintPositions',this.texture,6);gl.uniform1i(o.loc(p,'uConstraintColumns'),t.columns);}
  o.u(p,'uLivingMode',s.pLiving);o.u(p,'uLivingMotion',s.pBundleDelay,s.pFray,0);o.u(p,'uLivingShape',s.pBundles,s.pBundleSpread,s.pSkinOpening,s.pSkinOffset);o.u(p,'uLivingFold',s.pFoldCount,s.pFoldDepth,s.pInflate,s.pContract);
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.captureBuffer);gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,t.columns*t.rows);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.captureBuffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,this.target);return this.target;
 }
 prepare(s){
  const topologyKey=[s.pLiving,s.pBundles].join(':');
  const gl=this.gl;
  if(this.topologyKey!==topologyKey){
   this.topology=makeLivingTopology(64,49,s.pLiving,s.pBundles);const t=this.topology;
   this.target=new Float32Array(t.columns*t.rows*3);this.pixels=new Float32Array(t.columns*t.rows*4);
   gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.seedBuffer);gl.bufferData(gl.ARRAY_BUFFER,t.seeds,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,t.triangles,gl.STATIC_DRAW);gl.bindVertexArray(null);
   gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,this.captureBuffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,this.target.byteLength,gl.DYNAMIC_READ);
   gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,t.columns,t.rows,0,gl.RGBA,gl.FLOAT,null);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);
   this.topologyKey=topologyKey;this.key='';this.builds++;
  }
  // Rest geometry changes only when its controls change, never with elapsed time.
  const key=JSON.stringify(Object.entries(s).filter(([k])=>k.startsWith('p')||['seed','volume','stretchX','stretchY','stretchZ','deform','twist','waves','waveScale','scale','rotateX','rotateY','rotateZ'].includes(k)));
  if(key!==this.key){const paths=this.owner.guides.paths;this.owner.guides.paths=[];try{setLivingRest(this.topology,this.capturePositions({...s,forcePoints:[],bodyForces:[],forcePaths:[]},0));}finally{this.owner.guides.paths=paths;}this.key=key;}
 }
 draw(s,phase){
  const start=performance.now();this.prepare(s);const gl=this.gl,o=this.owner,t=this.topology;
  this.positions=relaxLiving(t,this.capturePositions(s,phase),s.pElastic,s.pBend);
  // Weld the polar vertices after relaxation: a closed end must stay closed.
  for(const row of (s.pSkinOpening===0?[0,t.rows-1]:[t.rows-1])){const mean=[0,0,0];for(let x=0;x<t.columns;x++)for(let k=0;k<3;k++)mean[k]+=this.positions[(row*t.columns+x)*3+k]/t.columns;for(let x=0;x<t.columns;x++)this.positions.set(mean,(row*t.columns+x)*3);}
  preserveLivingVolume(t,this.positions,s.pVolumeHold);
  excludeForcePositions(this.positions,[...(s.forcePoints||[]).filter(f=>f.enabled).slice(0,8),...(s.bodyForces||[]).filter(f=>f.enabled).slice(0,3)]);
  for(let i=0;i<this.positions.length/3;i++)this.pixels.set(this.positions.subarray(i*3,i*3+3),i*4);
  gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,t.columns,t.rows,gl.RGBA,gl.FLOAT,this.pixels);
  if((s.forcePaths||[]).some(p=>p.enabled&&(p.mode==='avoid'?p.strength>1.2:p.strength>=2.99999))){
   this.positions.set(this.capturePositions(s,phase,true));
   for(let i=0;i<this.positions.length/3;i++)this.pixels.set(this.positions.subarray(i*3,i*3+3),i*4);
   gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,t.columns,t.rows,gl.RGBA,gl.FLOAT,this.pixels);
  }
  const setup=p=>{o.settings(p,s,phase);o.tex(p,'uLivingPositions',this.texture,6);gl.uniform2i(o.loc(p,'uLivingSize'),t.columns,t.rows);};
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  if(s.pSkin>0){
   setup(this.skin);o.u(this.skin,'uLivingSurface',s.pSkin,s.pPores,s.pPoreCount,0);gl.bindVertexArray(this.vao);
   // Nearest-surface prepass avoids accumulating the back of translucent folds.
   gl.depthMask(true);gl.colorMask(false,false,false,false);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.drawElements(gl.TRIANGLES,t.triangles.length,gl.UNSIGNED_INT,0);gl.disable(gl.POLYGON_OFFSET_FILL);gl.colorMask(true,true,true,true);gl.depthMask(false);gl.drawElements(gl.TRIANGLES,t.triangles.length,gl.UNSIGNED_INT,0);
  }
  if(s.pThreadOpacity>0){
   setup(this.fibres);gl.bindVertexArray(o.empty);gl.depthMask(s.pSkin===0);
   o.u(this.fibres,'uLivingThread',s.pStrands,s.pThreadWidth,s.pThreadOpacity,s.pLiving===1?s.pBundles:0);o.u(this.fibres,'uWeft',0);gl.drawArraysInstanced(gl.TRIANGLES,0,(t.rows-1)*18,s.pStrands);
   if(s.pWeft>0){o.u(this.fibres,'uLivingThread',Math.round(s.pStrands*.65),s.pThreadWidth,s.pThreadOpacity*s.pWeft,0);o.u(this.fibres,'uWeft',1);gl.drawArraysInstanced(gl.TRIANGLES,0,t.columns*18,Math.round(s.pStrands*.65));}
  }
  gl.depthMask(true);gl.disable(gl.DEPTH_TEST);gl.blendFunc(gl.ONE,gl.ONE);this.milliseconds=performance.now()-start;
 }
 dispose(){const gl=this.gl;for(const p of [this.capture,this.constrain,this.skin,this.fibres])gl.deleteProgram(p.program);for(const b of [this.captureBuffer,this.seedBuffer,this.indices])gl.deleteBuffer(b);gl.deleteTransformFeedback(this.feedback);gl.deleteVertexArray(this.vao);gl.deleteTexture(this.texture);}
}


