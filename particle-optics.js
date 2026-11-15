// Light-space projections for surfaces and for the mass of a cloud in four depth slices.
export const opticalGLSL=`
uniform highp sampler2D uOpticalMap,uVolumeMap;
uniform vec3 uOpticalOrigin,uOpticalRight,uOpticalUp,uOpticalForward;
uniform vec4 uOpticalView,uOpticalShadow,uOpticalVolume;
uniform highp int uOpticalLight;
float opticalDepth(vec3 c){return dot(c,vec3(1.,1./255.,1./65025.));}
vec3 opticalCoordinate(vec3 p){vec3 d=p-uOpticalOrigin;return vec3(dot(d,uOpticalRight)/uOpticalView.x*.5+.5,dot(d,uOpticalUp)/uOpticalView.x*.5+.5,dot(d,uOpticalForward)/uOpticalView.y);}
vec4 opticalProject(vec3 p){return vec4(opticalCoordinate(p)*2.-1.,1.);}
float volumeTransmission(vec3 q){
 if(uOpticalVolume.x<=0.)return 1.;
 float layers=clamp((q.z-uOpticalVolume.y-uOpticalShadow.y/uOpticalView.y)/uOpticalVolume.z*4.,0.,4.);
 vec4 covered=clamp(vec4(layers)-vec4(0.,1.,2.,3.),0.,1.);
 vec4 density=texture(uVolumeMap,q.xy);
 float softness=uOpticalShadow.z*uOpticalVolume.w;
 if(softness>0.){
  vec2 dx=vec2(softness,0.),dy=dx.yx;
  density=(4.*density+texture(uVolumeMap,q.xy-dx)+texture(uVolumeMap,q.xy+dx)
    +texture(uVolumeMap,q.xy-dy)+texture(uVolumeMap,q.xy+dy))*.125;
 }
 return exp(-uOpticalVolume.x*dot(density,covered));
}
float opticalVisibility(vec3 p,int light){
 if(uOpticalShadow.x<=0.||light!=uOpticalLight)return 1.;
 vec3 q=opticalCoordinate(p);
 if(any(lessThan(q,vec3(0.)))||any(greaterThan(q,vec3(1.))))return 1.;
 float transmitted=volumeTransmission(q);
 if(uOpticalShadow.w<=0.)return mix(1.,transmitted,uOpticalShadow.x);
 float blocked=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 uv=q.xy+vec2(x,y)*uOpticalShadow.z/uOpticalView.z;
  if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))continue;
  vec4 s=texture(uOpticalMap,uv);
  float delta=(q.z-opticalDepth(s.rgb))*uOpticalView.y;
  blocked+=s.a*smoothstep(uOpticalShadow.y*.75,uOpticalShadow.y*1.25,delta);
 }
 return mix(1.,(1.-clamp(blocked/9.,0.,1.)*uOpticalShadow.w)*transmitted,uOpticalShadow.x);
}
`;
const volumeVertex=common=>`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
${common}
uniform vec2 uDeposit;
uniform sampler2D uSeeds;
uniform ivec2 uVolumeSamples;
flat out int vSlice;
out float vDeposit;
void main(){
 int sampleIndex=int((float(gl_VertexID)+.5)*float(uVolumeSamples.x)/float(uVolumeSamples.y));
 vec4 seed=grainSeed(uSeeds,sampleIndex);
 vec3 q=opticalCoordinate(attachedPosition(seed,uPhase));
 float depth=(q.z-uOpticalVolume.y)/uOpticalVolume.z;
 vSlice=int(clamp(depth*4.,0.,3.));
 gl_Position=vec4(q.xy*2.-1.,0.,1.);
 if(q.z<0.||q.z>1.)gl_Position=vec4(2.,2.,0.,1.);
 gl_PointSize=uDeposit.x;
 float diameter=grainDiameter(seed,sampleIndex);
 vDeposit=uDeposit.y*clamp(diameter*diameter,.03,28.);
}`;
const volumeFragment=`#version 300 es
precision highp float;precision highp int;
flat in int vSlice;
in float vDeposit;
out vec4 color;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);
 if(d>=1.)discard;
 vec4 mask=vec4(equal(ivec4(vSlice),ivec4(0,1,2,3)));
 color=mask*vDeposit*(1.-d)*(1.-d);
}`;
const photonVertex=`#version 300 es
precision highp float;precision highp int;
${opticalGLSL}
uniform vec4 uCaustic,uGrainCaustic;uniform vec2 uOutputSize;uniform float uPlane;
out float vEnergy;
vec3 worldAt(ivec2 cell,out float coverage){
 ivec2 size=textureSize(uOpticalMap,0);cell=clamp(cell,ivec2(0),size-1);
 vec4 s=texelFetch(uOpticalMap,cell,0);coverage=s.a;
 vec2 xy=((vec2(cell)+.5)/vec2(size)*2.-1.)*uOpticalView.x;
 return uOpticalOrigin+uOpticalRight*xy.x+uOpticalUp*xy.y+uOpticalForward*opticalDepth(s.rgb)*uOpticalView.y;
}
void main(){
 int grid=384;ivec2 cell=ivec2(gl_VertexID%grid,gl_VertexID/grid)*2;
 float jitter=fract(sin(float(gl_VertexID)*12.9898)*43758.5453);cell+=ivec2(jitter>.5?1:0,fract(jitter*7.31)>.5?1:0);
 float a,b,c,d,e;vec3 p=worldAt(cell,a);
 vec3 dx=worldAt(cell+ivec2(3,0),b)-worldAt(cell-ivec2(3,0),c);
 vec3 dy=worldAt(cell+ivec2(0,3),d)-worldAt(cell-ivec2(0,3),e);
 vEnergy=0.;gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=1.;
 if(a<.01||p.y<=uPlane)return;
 bool continuous=min(min(b,c),min(d,e))>=.01&&max(length(dx),length(dy))<=uOpticalView.x*.2;
 if(!continuous&&uGrainCaustic.z<=0.)return;
 vec3 normal=cross(dx,dy);
 if(!continuous||dot(normal,normal)<1e-10)normal=p-vec3(uGrainCaustic.xy,0.);
 vec3 n=normalize(normal+vec3(0.,.000001,0.));if(dot(n,uOpticalForward)>0.)n=-n;
 vec3 ray=refract(uOpticalForward,n,1./uCaustic.y);
 if(ray.y>=-.001)return;
 float travel=(uPlane-p.y)/ray.y;if(travel<=0.||travel>40.)return;
 vec3 hit=p+ray*travel;float depth=max(2.,7.5-hit.z);
 vec2 projection=mix(vec2(uOutputSize.y/uOutputSize.x,1.)*2.6/depth,min(uOutputSize.x,uOutputSize.y)/uOutputSize*(2./3.4),uGrainCaustic.w);
 gl_Position=vec4(hit.xy*projection,(depth-3.)/12.,1.);
 float size=max(2.,(2.5+uCaustic.z*8.)*uOutputSize.y/512.);gl_PointSize=size;
 // Photon energy is normalized by map sampling area and splat area.
 vEnergy=a*uCaustic.x*pow(uOpticalView.x/4.,2.)*pow(uOutputSize.y/512.,2.)/(size*size)*.8888889
    *(continuous?1.:uGrainCaustic.z);
}`;
const photonFragment=`#version 300 es
precision highp float;in float vEnergy;uniform vec3 uCausticColor;out vec4 color;
void main(){float d=dot(gl_PointCoord*2.-1.,gl_PointCoord*2.-1.);if(d>=1.)discard;float a=vEnergy*exp(-d*3.);color=vec4(uCausticColor*a,a);}`;
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const rgb=h=>[1,3,5].map(i=>{const v=parseInt(h.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
export function usesCloudAbsorption(s,float){return float&&s.pLiving!==4&&s.pCount>0&&s.pOpacity>0&&s.pSelfShadow>0&&s.pVolumeShadow>0;}
export class ParticleOptics{
 constructor(owner){this.owner=owner;this.width=this.height=768;this.softTargets=[];this.mode=2;this.frames=0;this.ready=false;this.volumeReady=false;}
 releaseTarget(t){if(!t)return;const g=this.owner.gl;g.deleteTexture(t.texture);g.deleteFramebuffer(t.fbo);if(t.depth)g.deleteRenderbuffer(t.depth);}
 release(){for(const t of [this.map,this.volumeMap,this.caustic,...this.softTargets])this.releaseTarget(t);this.map=this.volumeMap=this.caustic=null;this.softTargets=[];this.ready=this.volumeReady=false;}
 dispose(){this.release();for(const p of [this.photons,this.volumeProgram])if(p){this.owner.pendingPrograms.delete(p);this.owner.gl.deleteProgram(p.program);}}
 configure(s,light){
  this.light=light;this.origin=[light.x,light.y,light.z];
  const d=[s.positionX-light.x,s.positionY-light.y,-light.z],distance=Math.hypot(...d);
  this.forward=distance>1e-6?norm(d):[0,0,-1];
  this.right=norm(cross(this.forward,Math.abs(this.forward[1])>.95?[0,0,1]:[0,1,0]));this.up=cross(this.right,this.forward);
  this.span=s.pOpticalExtent;this.far=Math.max(8,distance+this.span*3);
  const reach=Math.max(.25,Math.min(this.span*1.5,Math.max(s.stretchX,s.stretchY,s.volume*s.stretchZ)*s.scale*(.5+2*s.pThickness)*(1+.72*s.pCloudHalo*s.pCloudRadius)+.3));
  this.volumeNear=Math.max(0,distance-reach)/this.far;
  this.volumeRange=((distance+reach)/this.far)-this.volumeNear;
 }
 prepareVolume(common){return this.volumeProgram??=this.owner.program(volumeVertex(common),volumeFragment);}
 uniforms(p,s){const o=this.owner,g=o.gl;const enabled=this.ready&&!o.shadowPass;
  o.tex(p,'uOpticalMap',enabled?this.map.texture:o.seedTexture,8);
  const volume=this.volumeReady&&!o.shadowPass;
  o.tex(p,'uVolumeMap',volume?this.volumeMap.texture:o.seedTexture,9);
  const surface=enabled&&this.surfaceShadow;
  o.u(p,'uOpticalShadow',surface||volume?s.pSelfShadow*(1-(s.pLiving===4?0:s.transparency)):0,s.pSelfShadowBias,s.pSelfShadowSoftness,surface?this.surfaceShadow:0);
  g.uniform1i(o.loc(p,'uOpticalLight'),s.lights.filter(l=>l.enabled).slice(0,8).findIndex(l=>l.id===this.light?.id));
  if(!this.light)return;
  for(const [key,v]of Object.entries({Origin:this.origin,Right:this.right,Up:this.up,Forward:this.forward}))o.u(p,'uOptical'+key,...v);
  o.u(p,'uOpticalView',this.span,this.far,768,0);
  o.u(p,'uOpticalVolume',volume?s.pVolumeShadow:0,this.volumeNear,this.volumeRange,1/(this.volumeMap?.w||1));
 }
 captureVolume(s,phase,options){
  const o=this.owner,g=o.gl,p=this.volumeProgram;
  const fast=options.preview&&options.quality==='fast';
  const size=fast?(o.geometryBudget<.6?192:256):512;
  if(this.volumeMap?.w!==size){this.releaseTarget(this.volumeMap);this.volumeMap=o.target(size,size);}
  const count=Math.min(Math.round(s.pCount),fast?Math.max(10000,Math.round(52000*o.geometryBudget)):300032);
  const diameter=Math.max(2,Math.round(size*.017));
  const screenDensity=(size/(2*this.span))**2;
  const deposit=s.pOpacity*screenDensity*.00008/(Math.PI*diameter*diameter/12)*s.pCount/count;
  o.bind(this.volumeMap);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.disable(g.DEPTH_TEST);g.disable(g.SCISSOR_TEST);
  o.settings(p,s,phase*s.pDirection);o.u(p,'uDeposit',diameter,deposit);
  o.tex(p,'uSeeds',o.seedTexture,2);g.uniform2i(o.loc(p,'uVolumeSamples'),Math.round(s.pCount),count);
  g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE);g.bindVertexArray(o.empty);
  g.drawArrays(g.POINTS,0,count);g.bindVertexArray(null);g.disable(g.BLEND);
  this.volumeReady=true;this.volumeFrames=(this.volumeFrames||0)+1;this.volumeCount=count;
 }
 capture(s,phase,options,weights){
  const o=this.owner,g=o.gl;this.ready=false;
  if(!this.map){this.map=o.target(768,768);g.bindTexture(g.TEXTURE_2D,this.map.texture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,768,768,0,g.RGBA,g.UNSIGNED_BYTE,null);for(const k of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,k,g.NEAREST);o.bind(this.map);this.map.depth=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,this.map.depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT24,768,768);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,this.map.depth);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Mappa della luce non disponibile.');}
  const prior=o.occlusion;o.shadowPass=this;o.occlusion=0;
  try{o.drawGeometry(this.map,{...s,transparency:0},phase,options,weights);}finally{o.shadowPass=null;o.occlusion=prior;}
  this.ready=true;this.frames++;
 }
 drawCaustic(s){
  const o=this.owner,g=o.gl,transmission=s.pLiving===4?1-s.pVeilOpacity:s.transparency;
  this.causticActive=false;if(!(s.pCaustic>0&&transmission>0&&s.refraction>1&&s.metal<1&&this.ready&&this.light.y>s.pShadowHeight+.03))return null;
  const scale=Math.min(1,1024/Math.max(o.width,o.height)),w=Math.round(o.width*scale),h=Math.round(o.height*scale);
  if(this.caustic&&(this.caustic.w!==w||this.caustic.h!==h)){g.deleteTexture(this.caustic.texture);g.deleteFramebuffer(this.caustic.fbo);this.caustic=null;}
  this.caustic??=o.target(w,h);if(this.softTargets[0]?.w!==w||this.softTargets[0]?.h!==h){for(const t of this.softTargets){g.deleteTexture(t.texture);g.deleteFramebuffer(t.fbo);}this.softTargets=[o.target(w,h),o.target(w,h)];}this.photons??=o.program(photonVertex,photonFragment);
  o.bind(this.caustic);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.disable(g.DEPTH_TEST);g.depthMask(false);g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE);g.bindVertexArray(o.empty);g.useProgram(this.photons.program);this.uniforms(this.photons,s);
  o.u(this.photons,'uCaustic',s.pCaustic*this.light.power*transmission*(1-s.metal),s.refraction,s.roughness+this.light.size*.2,0);
  o.u(this.photons,'uGrainCaustic',s.positionX,s.positionY,s.pCount>0&&s.pOpacity>0?.9:0,o.studioLayer?.attachment?1:0);
  o.u(this.photons,'uOutputSize',w,h);o.u(this.photons,'uPlane',s.pShadowHeight);const palette=s.palette.map(rgb),tint=[0,1,2].map(i=>palette.reduce((v,c)=>v+c[i],0)/palette.length),peak=Math.max(.01,...tint);o.u(this.photons,'uCausticColor',...rgb(this.light.color).map((v,i)=>v*(.15+.85*tint[i]/peak)));
  g.drawArrays(g.POINTS,0,384*384);g.depthMask(true);this.causticActive=true;
  g.disable(g.BLEND);g.useProgram(o.blur.program);let src=this.caustic;const radius=s.pCausticSoftness/512;
  for(const [dst,step]of [[this.softTargets[0],[radius,0]],[this.softTargets[1],[0,radius]]]){o.bind(dst);o.tex(o.blur,'uImage',src.texture,0);o.u(o.blur,'uStep',...step);g.drawArrays(g.TRIANGLES,0,3);src=dst;}return src.texture;
 }
}

