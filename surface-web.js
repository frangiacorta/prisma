import {livingAttachmentGLSL,livingOcclusionGLSL} from './living-composition.js?v=1882d3ed81c1';
import {surfaceWebGraph,surfaceWebWeights} from './surface-web-model.js?v=1882d3ed81c1';

// Three fibres meet on one actual surface patch. Sampling the same stable
// anchor IDs for membranes, stalks and fruit keeps the junctions sewn in motion.
const capture=(common)=>`#version 300 es
precision highp float;precision highp int;
${common}
${livingAttachmentGLSL}
layout(location=0) in vec4 aSeed;layout(location=1) in vec4 aVeil;
uniform int uRest,uWebSource;
out vec4 point;out vec4 pigment;
void main(){
 vec3 p;
 if(uWebSource==2)p=dynamicsForward(aVeil.xyz);
 else p=attachedPosition(aSeed,uPhase);
 bool valid=uWebSource==2?aVeil.w>=0.:p.z> -100.;
 if(uRest==1){
  if(uWebSource>0)p=vec3(.67*cos(TAU*aSeed.x),aSeed.y*1.8,.67*sin(TAU*aSeed.x)+max(0.,aVeil.w)*3.);
  else p=restPoint(aSeed)*vec3(uForm.xy,uForm.z*uForm.w);
 }
 point=vec4(p,valid?1.:0.);pigment=vec4(particleColor(aSeed,p),aSeed.w);
 gl_Position=vec4(0.,0.,0.,1.);
}`;
const vertex=common=>`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
${common}
layout(location=0) in vec3 aIds;layout(location=1) in vec3 aCoord;
uniform sampler2D uAnchors;uniform vec4 uNet,uYarn,uStalk,uBranch,uBend,uGerm;
uniform vec3 uRear;uniform float uSceneTime,uVeilCamera;uniform int uDrawKind;
out vec3 vPosition,vDye,vNormal,vBary;out vec2 vBall;out float vSeed,vCoverage,vGrowth,vPixel,vRadius;
struct Anchor{vec3 p;vec3 dye;vec3 outward;vec3 tip;float seed;float radius;float growth;float valid;};
Anchor sampleAnchor(float index){
 int x=int(index)*2;vec4 location=texelFetch(uAnchors,ivec2(x,0),0),colour=texelFetch(uAnchors,ivec2(x+1,0),0);
 Anchor a;a.p=location.xyz;a.seed=colour.w;a.dye=colour.rgb;a.valid=location.w;
 vec3 origin=vec3(uFrame.yz,0.);a.outward=normalize(a.p-origin+vec3(.00001));
 float order=fract(a.seed*.618+index*.381966),lag=uGerm.z*(order-uGerm.y);
 a.growth=clamp(uStalk.x*(1.-lag),0.,1.);
 vec3 sideways=normalize(cross(a.outward,vec3(.31,.72,.46))+vec3(.001));
 vec3 crosswise=cross(a.outward,sideways);
 float sway=uBend.y*sin(uSceneTime+index*2.39996);
 float rear=smoothstep(.1,.9,-a.outward.z);
 float reach=a.growth*uStalk.y*uFrame.x;
 a.radius=uNet.w*uFrame.x*uStalk.z*(.65+.35*sqrt(uNet.y))*mix(1.,.45+1.1*a.seed,uYarn.z)*mix(1.,.35+1.25*order,uBranch.w);
 a.tip=a.p+a.outward*(a.radius*.40*(uNet.y+.28*uNet.x)+reach*(.15+.10*uGerm.x))+
   reach*(sideways*(.13*uBend.z+.12*uBend.w+.10*sway)+crosswise*(.11*uBend.x+.20*rear*uRear.y)+vec3(.18*rear*uRear.x,0,0));
 return a;
}
vec4 webProject(vec3 p){vec4 clip=project(p);if(uVeilCamera>=0.)clip.xy=mix(p.xy*min(uResolution.x,uResolution.y)/uResolution/1.7,clip.xy,uVeilCamera);return clip;}
void main(){
 Anchor a=sampleAnchor(aIds.x),b=sampleAnchor(aIds.y),c=sampleAnchor(aIds.z);
 float scale=uFrame.x;vBall=vec2(0.);vBary=aCoord;vNormal=a.outward;vDye=a.dye;vSeed=a.seed;vGrowth=a.growth;vCoverage=1.;vPixel=1.;vRadius=a.radius;
 if(min(a.valid,min(b.valid,c.valid))<.5){gl_Position=vec4(2.,2.,2.,1.);return;}
 if(uDrawKind==1){
  float open=a.growth*uStalk.w,extent=fiberGrainExtent()*(uFiberPile.z>1.5?a.growth:1.);
  vec2 spread=vec2(1.+.47*open*uGerm.w,1.-.24*open);
  vec2 axis=normalize(a.outward.xy+vec2(.00001)),lateral=vec2(axis.y,-axis.x);
  float r=a.radius*(1.+extent);vec2 uv=aCoord.xy*(1.+extent);
  vBall=uv.x*lateral+uv.y*axis;
  vPosition=a.tip;vPosition.xy+=a.radius*(uv.x*lateral*spread.x+uv.y*axis*spread.y);
  float px=abs(webProject(a.tip+vec3(r,0,0)).x-webProject(a.tip).x)*uResolution.x*.5;
  vPixel=1./max(.5,px);vCoverage=uNet.y;gl_Position=webProject(vPosition);return;
 }
 float t=aCoord.x;
 if(uDrawKind>=2){
  bool stalk=uDrawKind==3;vec3 from=stalk?a.p:a.tip,to=stalk?a.tip:b.tip;
  vec3 axis=to-from;vec3 outward=normalize(a.outward+(stalk?a.outward:b.outward)+vec3(.00001));
  vec3 slopeAxis=normalize(cross(axis,outward)+vec3(.00001));
  float len=length(axis);
  float bridge=stalk?.08*uBend.z:.035+.12*(1.-uYarn.w)+.16*uBend.x+.065*uBend.y*sin(uSceneTime+a.seed*TAU);
  vec3 bend=(outward*bridge+slopeAxis*uRear.z*.22)*len;
  vPosition=mix(from,to,t)+bend*4.*t*(1.-t);
  vec3 tangent=axis+bend*4.*(1.-2.*t);
  vec4 clip=webProject(vPosition);vec2 screen=(webProject(vPosition+tangent*.01).xy-clip.xy)*uResolution;
  vec2 normal=normalize(vec2(-screen.y,screen.x)+vec2(.000001));
  float width=uNet.w*scale*(stalk?.45:.10)*(.35+1.75*uYarn.y)*abs(webProject(vPosition+vec3(1,0,0)).x-clip.x)*uResolution.x;
  if(!stalk)width*=1.-.78*uBranch.x;
  clip.xy+=normal*aCoord.y*max(1.15,width)/uResolution;
  vBall.y=aCoord.y;vPixel=max(1.,width);vNormal=outward;vBary=tangent;
  vDye=mix(a.dye,stalk?a.dye:b.dye,t);vCoverage=(stalk?a.growth*uNet.y:uNet.x*(1.-.82*uBranch.x))*min(1.,width);gl_Position=clip;return;
 }
 vec3 weights=aCoord,normal=cross(b.tip-a.tip,c.tip-a.tip);
 vNormal=normalize(normal+vec3(.00001));
 vec3 outward=normalize(a.outward*weights.x+b.outward*weights.y+c.outward*weights.z+vec3(.00001));
 float span=min(length(b.tip-a.tip),min(length(c.tip-b.tip),length(a.tip-c.tip)));
 float pocket=27.*weights.x*weights.y*weights.z;
 vPosition=a.tip*weights.x+b.tip*weights.y+c.tip*weights.z;
 // Lift the chord of a convex surface back outside its body. The open
 // centre bows under its load while the three attachment points stay fixed.
 float sag=(.21+.16*uBend.x-.09*uYarn.w+.09*uBend.y*sin(uSceneTime+a.seed*TAU));
 vPosition+=outward*span*sag*(1.-dot(weights,weights));
 vPosition+=normalize(cross(b.tip-a.tip,outward)+vec3(.00001))*span*.25*uRear.z*pocket;
 vDye=a.dye*weights.x+b.dye*weights.y+c.dye*weights.z;vSeed=fract(a.seed+b.seed*.43+c.seed*.27);
 vCoverage=(1.-uBranch.x)*(1.-.18*pocket);gl_Position=webProject(vPosition);
}`;
const fragment=common=>`#version 300 es
precision highp float;precision highp int;
${common}
${livingOcclusionGLSL}
uniform int uDrawKind;uniform vec4 uNet,uYarn,uStalk,uBranch,uGerm;
in vec3 vPosition,vDye,vNormal,vBary;in vec2 vBall;in float vSeed,vCoverage,vGrowth,vPixel,vRadius;out vec4 color;
float filament(float phase,float width){
 float aa=max(.001,fwidth(phase));float d=abs(fract(phase+.5)-.5);
 return mix(1.-smoothstep(max(0.,width-aa*.65),width+aa*.65,d),min(.88,2.*width),smoothstep(.2,.8,aa));
}
void main(){
 float alpha=vCoverage;vec3 n=normalize(vNormal),light;float depth=vPosition.z;
 if(alpha<=0.||dynamicsBarrier(vPosition)>.0001)discard;
 if(uDrawKind==1){
  float radius=length(vBall),extent=fiberGrainExtent()*(uFiberPile.z>1.5?vGrowth:1.);
  float z=sqrt(max(.0001,1.-min(1.,radius*radius)));
  vec3 outer=vec3(vBall,z),cutCentre=n*.60;
  float opening=vGrowth*uStalk.w,innerRadius=.23+.65*opening,pit=0.;
  n=normalize(outer);
  if(opening>.001&&length(outer-cutCentre)<innerRadius){
   vec2 ray=vBall-cutCentre.xy;z=cutCentre.z-sqrt(max(0.,innerRadius*innerRadius-dot(ray,ray)));
   if(z< -outer.z)discard;
   n=normalize(cutCentre-vec3(vBall,z));pit=clamp((outer.z-z)/max(.001,innerRadius),0.,1.);
  }
  depth+=z*vRadius;
  vec3 coord=fiberGrainLocal(n)+vec3(2.7,4.1,1.3)*vSeed;
  float signal=extent>0.?fiberThreads(coord,vPixel):0.;
  alpha*=fiberEdgeOpacity(radius,extent,signal,max(vPixel*.64,.001));
  light=shadeNoduleSample(vDye,vec3(vPosition.xy,depth),n,signal,vGrowth);
  light*=1.-pit*.68;
  // Diffused light from the rig re-enters the socket through its thin lip.
  vec3 rimLight=shadeMatter(vDye,vPosition,normalize(vec3(-vBall.x,.7,.45)),vec3(0.),0.);
  light+=rimLight*uBranch.z*(.1+.48*opening*pit)*(.24+.76*(1.-z));
 }else if(uDrawKind>=2){
  alpha*=1.-smoothstep(.12,1.,abs(vBall.y));
  light=shadeFibre(vDye,vPosition,n,vBary);
 }else{
  float f=3.2+uYarn.x*4.;vec2 uv=vBary.xy;
  vec2 warp=vec2(sin(4.7*uv.y+6.28*vSeed),sin(6.3*uv.x+3.2*vSeed))*(.07+.19*uYarn.z);
  vec2 q=uv+warp;float bundle=filament((q.x+.34*q.y)*f,.045+.039*uYarn.y);
  float weft=filament((q.y-.62*q.x)*f*(1.-.30*uBranch.y),.035+.024*uYarn.y);
  float fine=filament((q.x+.42*q.y)*f*3.+.49*sin(f*q.y*2.),.042);
  float tension=clamp(1.6*min(vBary.x,min(vBary.y,vBary.z)),0.,1.);
  float gather=mix(1.,.35+.65*smoothstep(.25,.94,sin(19.*q.x+6.*q.y+3.9*vSeed)*.5+.5),tension);
  float depth=gather*(uNet.x*(.64*bundle+.55*weft*(1.-.80*uBranch.y)+.32*fine)+uNet.z*(.11+.25*fine));
  alpha*=1.-exp(-depth);if(n.z<0.)n=-n;
  light=shadeFibre(vDye,vPosition,n,normalize(vec3(1.,.45+.62*uBranch.y,.16)));
 }
 alpha=clamp(alpha*livingVisibility(depth)*uFinish.z,0.,.995);if(alpha<.001)discard;
 color=vec4(light*alpha,alpha);
}`;

const emptyFragment='#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}';
function patchCoordinates(){
 const triangles=[],n=4;
 const put=(x,y)=>triangles.push(x/n,y/n,1-(x+y)/n);
 for(let x=0;x<n;x++)for(let y=0;y<n-x;y++){
  put(x,y);put(x+1,y);put(x,y+1);
  if(x+y+2<=n){put(x+1,y);put(x+1,y+1);put(x,y+1);}
 }
 return triangles;
}
const ribbon=[];
for(let i=0;i<5;i++){const a=i/5,b=(i+1)/5;ribbon.push(a,-1,0,b,-1,0,b,1,0,a,-1,0,b,1,0,a,1,0);}
const quad=[-1,-1,0,1,-1,0,1,1,0,-1,-1,0,1,1,0,-1,1,0];
const graphKeys=['seed','baseForm','pLiving','pFamily','pTarget','pMorph','pOpening','pThickness','pFill','pClumps','pGrainSpacing','pGroupSpacing','pVeilLayers','volume','stretchX','stretchY','stretchZ'];

export class SurfaceWeb{
 constructor(owner,common){
  this.owner=owner;const gl=this.gl=owner.gl;
  this.capture=owner.program(capture(common),emptyFragment,['point','pigment']);
  this.render=owner.program(vertex(common),fragment(common),null,true);
  this.feedback=gl.createTransformFeedback();this.positions=gl.createBuffer();
  this.texture=gl.createTexture();this.captureVAO=gl.createVertexArray();this.veilBuffer=gl.createBuffer();
  this.meshes=[patchCoordinates(),quad,ribbon].map(coords=>{
   const vao=gl.createVertexArray(),buffer=gl.createBuffer(),instances=gl.createBuffer();
   gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coords),gl.STATIC_DRAW);
   gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
   gl.bindBuffer(gl.ARRAY_BUFFER,instances);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,1);
   return {vao,buffer,instances,vertices:coords.length/3,count:0};
  });
  this.stems={...this.meshes[2],vao:gl.createVertexArray()};
  gl.bindVertexArray(this.stems.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.stems.buffer);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.meshes[1].instances);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,1);gl.bindVertexArray(null);
 }
 bindLayer(w,h){
  const gl=this.gl,o=this.owner;
  if(!this.layer||this.layer.w!==w||this.layer.h!==h){
   this.releaseLayer();this.layer=o.target(w,h);
   this.layer.depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,this.layer.depth);
   gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);
   gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.layer.depth);
  }
  o.bind(this.layer);gl.depthMask(true);gl.clearDepth(1.);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.depthMask(false);
  return this.layer.texture;
 }
 releaseLayer(){
  if(!this.layer)return;const gl=this.gl;gl.deleteRenderbuffer(this.layer.depth);gl.deleteTexture(this.layer.texture);gl.deleteFramebuffer(this.layer.fbo);this.layer=null;
 }
 resize(s,n){
  const gl=this.gl,o=this.owner;
  if(n!==this.capacity){
   gl.bindBuffer(gl.ARRAY_BUFFER,this.positions);gl.bufferData(gl.ARRAY_BUFFER,n*32,gl.DYNAMIC_COPY);
   gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,n*2,1,0,gl.RGBA,gl.FLOAT,null);
   for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);
   this.veilData=new Float32Array(n*4);this.capacity=n;this.key='';
  }
  gl.bindVertexArray(this.captureVAO);gl.bindBuffer(gl.ARRAY_BUFFER,o.buffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);
  const mesh=s.pLiving===4?o.veils?.mesh:null;
  if(mesh){
   for(let i=0;i<n;i++){
    const x=Math.round(o.random[i*4]*mesh.columns),y=Math.round(o.random[i*4+1]*mesh.rows),layer=Math.min(mesh.layers-1,Math.floor(o.random[i*4+2]*mesh.layers));
    const id=(layer*(mesh.rows+1)+y)*(mesh.columns+1)+x,at=id*9;
    this.veilData.set(mesh.vertices.subarray(at,at+3),i*4);this.veilData[i*4+3]=mesh.valid&&Math.abs(mesh.valid[id])<.01?-1:layer;
   }
   gl.bindBuffer(gl.ARRAY_BUFFER,this.veilBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.veilData,gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,0,0);
  }else{gl.disableVertexAttribArray(1);gl.vertexAttrib4f(1,0,0,0,0);}
  gl.bindVertexArray(null);
 }
 sample(s,phase,rest){
  const gl=this.gl,o=this.owner,p=this.capture,layer=o.studioLayer,attachment=(rest&&layer?.webRestAttachment)||layer?.webAttachment;
  // Grain fill may reach the centre of the body. The jacket has its own
  // surface-only sample texture; never mutate or redistribute the grains.
  if(attachment)o.studioLayer={...layer,attachment};
  try{o.settings(p,s,phase);}finally{o.studioLayer=layer;}
  if(attachment)o.u(p,'uStudioBody',attachment.kind,s.grainDispersal||0,0,s.pCloudCore||0);
  if(s.pLiving>0&&s.pLiving!==4&&o.living?.texture)o.u(p,'uSurfaceBind',1);
  gl.uniform1i(o.loc(p,'uRest'),rest?1:0);gl.uniform1i(o.loc(p,'uWebSource'),s.pLiving===4?2:s.pLiving>0?1:0);
  gl.bindVertexArray(this.captureVAO);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,this.feedback);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,this.positions);gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,this.capacity);gl.endTransformFeedback();
  gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindVertexArray(null);
  if(rest){
   const data=new Float32Array(this.capacity*8);gl.bindBuffer(gl.ARRAY_BUFFER,this.positions);gl.getBufferSubData(gl.ARRAY_BUFFER,0,data);return data;
  }
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,this.positions);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.capacity*2,1,gl.RGBA,gl.FLOAT,0);gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER,null);
 }
 draw(s,phase){
  const gl=this.gl,o=this.owner,[web,nodes,sheet]=surfaceWebWeights(s);
  if(Math.max(web,nodes,sheet)<=.00001||s.pLiving===4&&!o.veils?.mesh)return;
  const density=s.structDensity??20,pitch=s.structWeavePitch??1;
  const attached=!!o.studioLayer?.webAttachment;
  if(!attached&&!(s.pLiving>0)&&!(s.pCount>0))return;
  // Map the full density slider to a bounded number of material anchors.
  const target=Math.round(12+638*Math.pow(density/256,.704));
  const n=Math.max(1,Math.min(650,target,attached||s.pLiving>0?650:s.pCount));
  this.resize(s,n);
  const reference=o.studioLayer?.webRestAttachment||o.studioLayer?.webAttachment,base=o.webRestSource||s;
  const connect=web>0||sheet>0;
  const key=JSON.stringify([n,attached,reference?.key||reference?.kind,s.structWeaveBranching,pitch,connect,...graphKeys.map(k=>base[k])]);
  if(this.key!==key){
   const coords=this.sample({...s,...base},0,true),graph=surfaceWebGraph(coords,n,s.structWeaveBranching||0,pitch,connect);
   [graph.faces,graph.points,graph.edges].forEach((ids,i)=>{gl.bindBuffer(gl.ARRAY_BUFFER,this.meshes[i].instances);gl.bufferData(gl.ARRAY_BUFFER,ids,gl.STATIC_DRAW);this.meshes[i].count=ids.length/3;});
   this.stems.count=this.meshes[1].count;this.key=key;
  }
  this.sample(s,phase,false);
  const p=this.render;o.settings(p,s,phase);o.tex(p,'uAnchors',this.texture,3);
  const radius=.057*Math.pow(118/n,.38);
  o.u(p,'uNet',web,nodes,sheet,radius);
  o.u(p,'uYarn',s.structWeaveFinesse??1,s.structThreadWidth??.32,s.structWeaveVariation||0,s.structWeaveTension||0);
  o.u(p,'uStalk',s.structWeaveGrowth||0,s.structWeaveReach??1,s.structWeaveCupSize??1,s.structWeaveCup??.65);
  o.u(p,'uBranch',s.structWeaveRelease||0,s.structWeaveAlignment||0,s.structWeaveCupLight||0,s.structWeaveHierarchy||0);
  o.u(p,'uBend',s.structWeaveArch||0,s.structWeaveFlex||0,s.structWeaveRootBend||0,s.structWeaveTipBend||0);
  o.u(p,'uGerm',s.structWeaveSpread??1,s.structWeaveFront??.5,s.structDelay??.35,s.structWeaveFlare??1);
  o.u(p,'uRear',s.structWeaveRearX||0,s.structWeaveRearY||0,s.structWeaveSlope||0);
  o.u(p,'uSceneTime',2*Math.PI*(phase+(s.structFlowPhase||0)));
  o.u(p,'uVeilCamera',s.pLiving===4?(s.pVeilFromForm&&!s.pVeilSourceKind?s.pVeilMorph:1):-1);
  gl.enable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);o.opticalDrawState();
  for(const [kind,mesh,enabled] of [[0,this.meshes[0],sheet||web],[2,this.meshes[2],web],[3,this.stems,nodes&&s.structWeaveGrowth],[1,this.meshes[1],nodes]]){
   if(!enabled||!mesh.count)continue;
   if(!o.shadowPass&&kind===1){gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);}
   gl.uniform1i(o.loc(p,'uDrawKind'),kind);gl.bindVertexArray(mesh.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.vertices,mesh.count);
  }
  if(!o.shadowPass){gl.disable(gl.DEPTH_TEST);gl.depthMask(false);}
  gl.bindVertexArray(null);gl.blendFunc(gl.ONE,o.shadowPass?gl.ONE_MINUS_SRC_ALPHA:gl.ONE);
 }
 dispose(){
  const gl=this.gl;this.releaseLayer();for(const p of [this.capture,this.render])gl.deleteProgram(p.program);
  for(const mesh of this.meshes){gl.deleteVertexArray(mesh.vao);gl.deleteBuffer(mesh.buffer);gl.deleteBuffer(mesh.instances);}
  gl.deleteVertexArray(this.stems.vao);gl.deleteVertexArray(this.captureVAO);gl.deleteBuffer(this.positions);gl.deleteBuffer(this.veilBuffer);gl.deleteTransformFeedback(this.feedback);gl.deleteTexture(this.texture);
 }
}
