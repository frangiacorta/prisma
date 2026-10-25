// One bounded light-space visibility map shared by shadowing and refraction.
// Parallel-ray approximation; records the first surface, not multiple scattering.
export const opticalGLSL=`
uniform highp sampler2D uOpticalMap;
uniform vec3 uOpticalOrigin,uOpticalRight,uOpticalUp,uOpticalForward;
uniform vec4 uOpticalView,uOpticalShadow;
uniform highp int uOpticalLight;
float opticalDepth(vec3 c){return dot(c,vec3(1.,1./255.,1./65025.));}
vec3 opticalCoordinate(vec3 p){vec3 d=p-uOpticalOrigin;return vec3(dot(d,uOpticalRight)/uOpticalView.x*.5+.5,dot(d,uOpticalUp)/uOpticalView.x*.5+.5,dot(d,uOpticalForward)/uOpticalView.y);}
vec4 opticalProject(vec3 p){return vec4(opticalCoordinate(p)*2.-1.,1.);}
float opticalVisibility(vec3 p,int light){
 if(uOpticalShadow.x<=0.||light!=uOpticalLight)return 1.;
 vec3 q=opticalCoordinate(p);
 if(any(lessThan(q,vec3(0.)))||any(greaterThan(q,vec3(1.))))return 1.;
 float blocked=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 uv=q.xy+vec2(x,y)*uOpticalShadow.z/uOpticalView.z;
  if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))continue;
  vec4 s=texture(uOpticalMap,uv);
  blocked+=s.a*step(opticalDepth(s.rgb)+uOpticalShadow.y/uOpticalView.y,q.z);
 }
 return 1.-clamp(blocked/9.*uOpticalShadow.x,0.,1.);
}
`;
const photonVertex=`#version 300 es
precision highp float;precision highp int;
${opticalGLSL}
uniform vec4 uCaustic;uniform vec2 uOutputSize;uniform float uPlane;
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
 if(a<.01||min(min(b,c),min(d,e))<.01||p.y<=uPlane||max(length(dx),length(dy))>uOpticalView.x*.2)return;
 vec3 n=normalize(cross(dx,dy));if(dot(n,uOpticalForward)>0.)n=-n;
 vec3 ray=refract(uOpticalForward,n,1./uCaustic.y);
 if(ray.y>=-.001)return;
 float travel=(uPlane-p.y)/ray.y;if(travel<=0.||travel>40.)return;
 vec3 hit=p+ray*travel;float depth=max(2.,7.5-hit.z);
 gl_Position=vec4(hit.xy*vec2(uOutputSize.y/uOutputSize.x,1.)*2.6/depth,(depth-3.)/12.,1.);
 float size=max(2.,(2.5+uCaustic.z*8.)*uOutputSize.y/512.);gl_PointSize=size;
 // Photon energy is normalized by map sampling area and splat area.
 vEnergy=a*uCaustic.x*pow(uOpticalView.x/4.,2.)*pow(uOutputSize.y/512.,2.)/(size*size)*.8888889;
}`;
const photonFragment=`#version 300 es
precision highp float;in float vEnergy;uniform vec3 uCausticColor;out vec4 color;
void main(){float d=dot(gl_PointCoord*2.-1.,gl_PointCoord*2.-1.);if(d>=1.)discard;float a=vEnergy*exp(-d*3.);color=vec4(uCausticColor*a,a);}`;
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const rgb=h=>[1,3,5].map(i=>{const v=parseInt(h.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
export class ParticleOptics{
 constructor(owner){this.owner=owner;this.width=this.height=768;this.softTargets=[];this.mode=2;this.frames=0;this.ready=false;}
 release(){const g=this.owner.gl;for(const t of [this.map,this.caustic,...this.softTargets])if(t){g.deleteTexture(t.texture);g.deleteFramebuffer(t.fbo);if(t.depth)g.deleteRenderbuffer(t.depth);}this.map=this.caustic=null;this.softTargets=[];this.ready=false;}
 dispose(){this.release();if(this.photons)this.owner.gl.deleteProgram(this.photons.program);}
 configure(s,light){this.light=light;this.origin=[light.x,light.y,light.z];const d=[s.positionX-light.x,s.positionY-light.y,-light.z];this.forward=norm(d);this.right=norm(cross(this.forward,Math.abs(this.forward[1])>.95?[0,0,1]:[0,1,0]));this.up=cross(this.right,this.forward);this.span=s.pOpticalExtent;this.far=Math.max(8,Math.hypot(...d)+this.span*3);}
 uniforms(p,s){const o=this.owner,g=o.gl;const enabled=this.ready&&!o.shadowPass;
  o.tex(p,'uOpticalMap',enabled?this.map.texture:o.seedTexture,8);
  o.u(p,'uOpticalShadow',enabled?s.pSelfShadow*(1-(s.pLiving===4?0:s.transparency)):0,s.pSelfShadowBias,s.pSelfShadowSoftness,0);
  g.uniform1i(o.loc(p,'uOpticalLight'),s.lights.filter(l=>l.enabled).slice(0,8).findIndex(l=>l.id===this.light?.id));
  if(!this.light)return;
  for(const [key,v]of Object.entries({Origin:this.origin,Right:this.right,Up:this.up,Forward:this.forward}))o.u(p,'uOptical'+key,...v);
  o.u(p,'uOpticalView',this.span,this.far,768,0);
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
  this.causticActive=false;if(!(s.pCaustic>0&&transmission>0&&s.refraction>1&&s.metal<1&&this.ready))return null;
  const scale=Math.min(1,1024/Math.max(o.width,o.height)),w=Math.round(o.width*scale),h=Math.round(o.height*scale);
  if(this.caustic&&(this.caustic.w!==w||this.caustic.h!==h)){g.deleteTexture(this.caustic.texture);g.deleteFramebuffer(this.caustic.fbo);this.caustic=null;}
  this.caustic??=o.target(w,h);if(this.softTargets[0]?.w!==w||this.softTargets[0]?.h!==h){for(const t of this.softTargets){g.deleteTexture(t.texture);g.deleteFramebuffer(t.fbo);}this.softTargets=[o.target(w,h),o.target(w,h)];}this.photons??=o.program(photonVertex,photonFragment);
  o.bind(this.caustic);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.disable(g.DEPTH_TEST);g.depthMask(false);g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE);g.bindVertexArray(o.empty);g.useProgram(this.photons.program);this.uniforms(this.photons,s);
  o.u(this.photons,'uCaustic',s.pCaustic*this.light.power*transmission*(1-s.metal),s.refraction,s.roughness+this.light.size*.2,0);
  o.u(this.photons,'uOutputSize',w,h);o.u(this.photons,'uPlane',s.pShadowHeight);const palette=s.palette.map(rgb),tint=[0,1,2].map(i=>palette.reduce((v,c)=>v+c[i],0)/palette.length),peak=Math.max(.01,...tint);o.u(this.photons,'uCausticColor',...rgb(this.light.color).map((v,i)=>v*(.15+.85*tint[i]/peak)));
  g.drawArrays(g.POINTS,0,384*384);g.depthMask(true);this.causticActive=true;
  g.disable(g.BLEND);g.useProgram(o.blur.program);let src=this.caustic;const radius=s.pCausticSoftness/512;
  for(const [dst,step]of [[this.softTargets[0],[radius,0]],[this.softTargets[1],[0,radius]]]){o.bind(dst);o.tex(o.blur,'uImage',src.texture,0);o.u(o.blur,'uStep',...step);g.drawArrays(g.TRIANGLES,0,3);src=dst;}return src.texture;
 }
}

