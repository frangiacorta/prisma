import {bindDynamics,DYNAMICS_GLSL} from './dynamics.js?v=02b214873299';
import {ParticleShadow,shadowProgram} from './particle-shadow.js?v=02b214873299';
import {ParticleOptics} from './particle-optics.js?v=02b214873299';
import {shadowLight} from './particle-shadow.js?v=02b214873299';
import {sampleFrame,FILM_SPECTRUM} from './solid-renderer.js?v=02b214873299';
import {PARTICLE_DEFAULTS,rng,grainDiameters,migrateGrainSizes} from './particle-model.js?v=02b214873299';
import {GuideField,guideGLSL} from './particle-path-field.js?v=02b214873299';
import {ParticleLinks} from './particle-links.js?v=02b214873299';
import {livingWeights,livingOcclusionGLSL,livingAttachmentGLSL} from './living-composition.js?v=02b214873299';
import {LayeredVeils} from './layered-veils.js?v=02b214873299';
import {LivingStructures} from './living-structures.js?v=02b214873299';
import {fieldGLSL} from './particle-field.js?v=02b214873299';
import {forceBarrierGLSL} from './particle-forces.js?v=02b214873299';
import {prismaShadingGLSL} from './particle-shading.js?v=02b214873299';
const common=`${prismaShadingGLSL}\n${fieldGLSL}`;
const trailSampling=`
uniform sampler2D uSeeds;uniform int uBatchStart,uSegments;
uniform vec4 uFiber;
vec4 seedAt(int i){return texelFetch(uSeeds,ivec2(i%1024,i/1024),0);}
vec4 fiberSeed(vec4 r){r.w=fract(r.w+uTail.w*.618);r.zw=mix(r.zw,vec2(.5),uFiber.z);return r;}
`;
const pointVert=`#version 300 es
precision highp float;
layout(location=0) in vec4 aRandom;
${common}
${livingAttachmentGLSL}
out vec3 vColor,vPosition;flat out vec4 vForceSeed;out float vOpacity;out vec2 vSpriteUV;uniform float uPointQuad;uniform vec2 uNodeStyle,uLargeGrains,uGrainDistribution;
void main(){vec3 p=attachedPosition(aRandom,uPhase);gl_Position=project(p);
 int index=uPointQuad>.5?gl_InstanceID:gl_VertexID;
 float diameter=uNodeStyle.y>0.&&float(index)<uNodeStyle.x?uNodeStyle.y:float(index)<uLargeGrains.x?uLargeGrains.y:uPoints.x;
 float sizeRandom=fract(aRandom.w*73.17+aRandom.x*19.73);
 float distributed=pow(max(.00001,sizeRandom),exp2(uGrainDistribution.y*6.));
 float spread=exp2(mix(-uGrainDistribution.x,uGrainDistribution.x,distributed));
 float px=min(1024.,diameter*mix(1.,.15+aRandom.z*1.7,uPoints.y)*spread)*uResolution.y/1080.;
 vSpriteUV=vec2(0.);
 if(uPointQuad>.5){
  int vertex=gl_VertexID%6;
  vec2 corner=vertex==0?vec2(-1.,-1.):vertex==1?vec2(1.,-1.):vertex==2?vec2(-1.,1.):vertex==3?vec2(-1.,1.):vertex==4?vec2(1.,-1.):vec2(1.,1.);
  gl_Position.xy+=corner*max(2.,px)/uResolution*gl_Position.w;
  vSpriteUV=vec2(corner.x,-corner.y)*.5+.5;
 }
 gl_PointSize=clamp(px,2.,64.);
 vForceSeed=aRandom;vOpacity=uPoints.z*3.*min(1.,px*px/4.);vPosition=p;vColor=particleColor(aRandom,p);
}`;
const pointFrag=`#version 300 es
precision highp float;
in vec3 vColor,vPosition;flat in vec4 vForceSeed;in float vOpacity;in vec2 vSpriteUV;uniform float uPointQuad;out vec4 color;
${prismaShadingGLSL}
${forceBarrierGLSL}
${guideGLSL}
${DYNAMICS_GLSL}
uniform float uPhase;
${livingOcclusionGLSL}
uniform vec4 uPoints;uniform float uSprite;uniform vec3 uShadeOrigin;
void main(){vec3 barrierPoint=guidePixelPosition(gl_FragCoord.xy,vPosition);if(dynamicsBarrier(barrierPoint)>.0001||insideForceCore(barrierPoint)||insideGuideCore(barrierPoint,vForceSeed,uPhase)||outsideGuidePixel(gl_FragCoord.xy,vPosition,vForceSeed,uPhase))discard;vec2 xy=(uPointQuad>.5?vSpriteUV:gl_PointCoord)*2.-1.;float d=length(xy),aa=max(fwidth(d),.04);
 float coverage=1.-smoothstep(1.-aa,1.,d);
 if(uSprite>1.5&&uSprite<2.5)coverage*=smoothstep(.35,.55,d);
 if(uSprite>2.5)coverage*=exp(-min(abs(xy.x),abs(xy.y))*12.);
 float profile=uSprite<.5?exp(-d*d*mix(.2,3.,uPoints.w)):mix(1.,exp(-d*d*3.),uPoints.w);
 float a=coverage*profile*vOpacity*livingVisibility();
 vec3 micro=vec3(xy.x,-xy.y,sqrt(max(.01,1.-d*d)));
 vec3 n=normalize(normalize(vPosition-uShadeOrigin+vec3(0.,0.,.0001))+micro*.28);
 color=vec4(shadeParticle(vColor,vPosition,n)*a,a);
}`;
const trailVert=`#version 300 es
precision highp float;
precision highp sampler2D;
${common}
${trailSampling}
uniform sampler2D uPaths;uniform bool uBaked;uniform vec3 uShadeOrigin;
out vec3 vColor,vPosition;flat out vec4 vForceSeed;out float vForcePhase;out float vOpacity,vSide;
vec3 pathAt(int j,vec4 r){return uBaked?texelFetch(uPaths,ivec2(j+1,gl_InstanceID),0).xyz:position(r,uPhase-float(j)/float(uSegments)*uTrails.x);}
void main(){
 int j=gl_VertexID/2;float side=gl_VertexID%2==0?-1.:1.,age=float(j)/float(uSegments);
 vec4 original=seedAt(gl_InstanceID+uBatchStart),r=fiberSeed(original);
 vec3 p=pathAt(j,r),next=pathAt(j+1,r),prev=pathAt(j-1,r);
 vec4 clip=project(p);vec2 tangent=(project(next).xy-project(prev).xy)*uResolution;
 vec2 normal=vec2(-tangent.y,tangent.x)/max(.00001,length(tangent));
 float width=uTrails.y*mix(1.,pow(max(.001,1.-age),.7),uTail.y)*uResolution.y/1080.;
 clip.xy+=normal*side*max(1.,width)/uResolution;
 gl_Position=clip;vSide=side;vPosition=p;vForceSeed=r;vForcePhase=uPhase-age*uTrails.x;
 vec3 strand=next-prev;if(dot(strand,strand)<1e-12)strand=next-p;
 vColor=shadeFibre(particleColor(original,p),p,normalize(p-uShadeOrigin+vec3(0.,0.,.0001)),strand);
 vOpacity=uTrails.z*mix(pow(max(0.,1.-age),uTail.x),1.,uFiber.x)*min(1.,width)*uFiber.w;
}`;
const trailFrag=`#version 300 es
precision highp float;in vec3 vColor,vPosition;flat in vec4 vForceSeed;in float vForcePhase;in float vOpacity,vSide;out vec4 color;uniform vec4 uFiber;
${forceBarrierGLSL}
${guideGLSL}
${DYNAMICS_GLSL}
${livingOcclusionGLSL}
void main(){vec3 barrierPoint=guidePixelPosition(gl_FragCoord.xy,vPosition);if(dynamicsBarrier(barrierPoint)>.0001||insideForceCore(barrierPoint)||insideGuideCore(barrierPoint,vForceSeed,vForcePhase)||outsideGuidePixel(gl_FragCoord.xy,vPosition,vForceSeed,vForcePhase))discard;float a=livingVisibility()*vOpacity*(1.-smoothstep(mix(.85,.05,uFiber.y),1.,abs(vSide)));color=vec4(vColor*a,a);}`;
const screenVert=`#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
// Bake each trajectory sample once, in bounded batches. Triangle vertices reuse the samples.
const pathFrag=`#version 300 es
precision highp float;precision highp sampler2D;
${common}
${trailSampling}
out vec4 color;
void main(){int row=int(gl_FragCoord.y),j=int(gl_FragCoord.x)-1;vec4 r=fiberSeed(seedAt(row+uBatchStart));color=vec4(position(r,uPhase-float(j)/float(uSegments)*uTrails.x),1.);}`;
const blurFrag=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D uImage;uniform vec2 uStep;
void main(){vec4 c=texture(uImage,uv)*.227027;c+=texture(uImage,uv+uStep*1.384615)*.316216;c+=texture(uImage,uv-uStep*1.384615)*.316216;c+=texture(uImage,uv+uStep*3.230769)*.070270;c+=texture(uImage,uv-uStep*3.230769)*.070270;color=c;}`;
const composeFrag=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D uImage,uBloom,uShadow,uCausticMap;uniform float uCausticOn,uShadowStrength;uniform float uGlow,uBgMode,uPhotoAll,uVeilCompose;
uniform vec4 uGrade,uPhoto,uTone,uLens,uBg;uniform vec3 uBackground,uBackground2;
uniform float uBgShade;uniform vec2 uOutputSize;
vec3 grade(vec3 c){c=(c*exp2(uGrade.x)+uGrade.y-.5)*uGrade.z+.5;float grey=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(grey),c,uGrade.w);c*=vec3(1.+uPhoto.x*.25,1.+uPhoto.y*.2,1.-uPhoto.x*.25);c+=uTone.x*pow(1.-clamp(c,0.,1.),vec3(2.))+uTone.y*pow(clamp(c,0.,1.),vec3(2.));return pow(max(c,0.),vec3(1./max(.1,uPhoto.z)));}
void main(){vec2 p=uv-.5,q=.5+p*(1.+uLens.x*dot(p,p));vec4 src=texture(uImage,q),bloom=texture(uBloom,q);
 // Compress accumulated light with a shared scale: channel-by-channel clipping
 // used to wash different palettes into the same pink/white highlights.
 vec3 radiance=max(vec3(0.),src.rgb+bloom.rgb*uGlow*2.2)*1.7;
 if(uVeilCompose>.5)radiance/=max(.00001,clamp(src.a,0.,1.));
 vec3 linear=radiance/(1.+max(radiance.r,max(radiance.g,radiance.b)));
 vec3 c=mix(linear*12.92,1.055*pow(linear,vec3(1./2.4))-.055,step(vec3(.0031308),linear));
 float bgT=dot(uv-.5,vec2(cos(uBg.x),sin(uBg.x)))+.5;
 if(uBgMode>1.5)bgT=smoothstep(-uBg.z,uBg.z,(uv.y-.5)*2.+uBg.y);
 vec3 bg=uBgMode<.5?uBackground:mix(uBackground,uBackground2,clamp(bgT,0.,1.));
 if(uBgMode>1.5)bg*=1.+uBg.w*exp(-dot(p,p)*5.);
 // Same world-space edge falloff as the solid backdrop; shade only the
 // studio background before compositing particles, shadows and caustics.
 if(uBgMode>1.5&&uBgMode<2.5){vec2 world=p*uOutputSize/min(uOutputSize.x,uOutputSize.y)*3.4;bg*=1.-uBgShade*smoothstep(.8,3.2,length(world/vec2(1.,1.3)));}
 float alpha=clamp(1.-exp(-(src.a+bloom.a*uGlow)),0.,1.);
 if(uVeilCompose>.5){alpha=clamp(src.a,0.,1.);c*=alpha;}
 float shadow=clamp(texture(uShadow,q).a*uShadowStrength,0.,1.);
 bg*=1.-shadow;
 if(uBgMode>2.5)bg=vec3(0.);
 c=uPhotoAll>.5?grade(c+bg*(1.-alpha)):grade(c)+bg*(1.-alpha);
 c*=1.-uPhoto.w*dot(p,p)*1.5;
 vec2 cell=floor(gl_FragCoord.xy/max(1.,uLens.z));float noise=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453)-.5;
 c+=noise*uLens.y;
 if(uVeilCompose>.5&&uBgMode>2.5)c=alpha>.00001?c/alpha:vec3(0.);
 if(uBgMode>2.5&&shadow>0.){float combined=alpha+(1.-alpha)*shadow;c*=alpha/max(.00001,combined);alpha=combined;}
 if(uCausticOn>.5){
  vec4 flux=texture(uCausticMap,q);vec3 light=1.-exp(-max(vec3(0.),flux.rgb));float coverage=1.-exp(-max(0.,flux.a));
  if(uPhotoAll>.5)light=clamp(grade(light)-grade(vec3(0.)),0.,1.);
  if(uBgMode>2.5){float combined=alpha+(1.-alpha)*coverage;c=(c*alpha+light*(1.-alpha))/max(.00001,combined);alpha=combined;}
  else c+=light*(1.-alpha);
 }
 color=vec4(clamp(c,0.,1.),uBgMode>2.5?alpha:1.);
}`;
const rad=Math.PI/180,rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const linearRgb=hex=>rgb(hex).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
const environments=['studio','sunset','neon','sky','aquarium','aurora','city'];
// A long persistent tail deposits much more light than a short fading trail.
// Normalize coverage, including length and persistence, without changing thin raster widths.
const fiberGain=s=>Math.pow(Math.min(1,4000/Math.max(1,s.pTrailCount*Math.max(1,s.pTrailLength/.2)*(1+s.pTrailPersistence))),s.pTrailDensity*.8);
export class ParticleRenderer{
 constructor(canvas){
  this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl)throw Error('WebGL 2 non disponibile.');this.parallelExtension=gl.getExtension('KHR_parallel_shader_compile');this.pendingPrograms=new Set();this.float=!!gl.getExtension('EXT_color_buffer_float');this.pointSizeLimit=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
  this.points=this.program(pointVert,pointFrag);this.lines=null;this.pathProgram=null;this.blur=this.program(screenVert,blurFrag);this.compose=this.program(screenVert,composeFrag);
  this.empty=gl.createVertexArray();this.guides=new GuideField(this);this.targets=[];this.width=0;this.height=0;this.seed=null;this.completedFrames=0;this.gpuSample=0;this.gpuMilliseconds=null;
  this.maxSize=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));this.recoveryExtension=gl.getExtension('WEBGL_lose_context');
  this.timerExtension=gl.getExtension('EXT_disjoint_timer_query_webgl2');this.queries=[];
 }
 program(v,f,varyings=null,materialAlpha=false){const shaders=shadowProgram(v,f,varyings);v=shaders.vertex;f=shaders.fragment;const gl=this.gl,program=gl.createProgram();for(const [type,source]of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);gl.attachShader(program,shader);gl.deleteShader(shader);}if(varyings)gl.transformFeedbackVaryings(program,varyings,gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);const result={program,uniforms:new Map(),materialAlpha,ready:false};this.pendingPrograms.add(result);return result;}
 finishProgram(p){if(p.ready)return;if(!this.gl.getProgramParameter(p.program,this.gl.LINK_STATUS))throw Error(this.gl.getProgramInfoLog(p.program)||'Impossibile preparare le particelle.');p.ready=true;this.pendingPrograms.delete(p);}
 loc(p,k){this.finishProgram(p);if(!p.uniforms.has(k))p.uniforms.set(k,this.gl.getUniformLocation(p.program,k));return p.uniforms.get(k);}
 u(p,k,...v){const loc=this.loc(p,k);if(loc!==null)this.gl['uniform'+v.length+'f'](loc,...v);}
 geometry(seed){const gl=this.gl;if(this.buffer)gl.deleteBuffer(this.buffer);if(this.seedTexture)gl.deleteTexture(this.seedTexture);if(this.pointVAO)gl.deleteVertexArray(this.pointVAO);if(this.quadVAO)gl.deleteVertexArray(this.quadVAO);
  const r=rng(seed),random=new Float32Array(1024*293*4);for(let i=0;i<random.length;i++)random[i]=r();
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,random,gl.STATIC_DRAW);
  this.pointVAO=gl.createVertexArray();gl.bindVertexArray(this.pointVAO);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);gl.bindVertexArray(null);this.quadVAO=gl.createVertexArray();gl.bindVertexArray(this.quadVAO);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,1);gl.bindVertexArray(null);
  this.seedTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.seedTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,1024,293,0,gl.RGBA,gl.FLOAT,random);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);this.seed=seed;this.random=random;
 }
 trailGeometry(segments){const gl=this.gl;if(this.segments===segments)return;this.segments=segments;
  if(this.lineVAO)gl.deleteVertexArray(this.lineVAO);if(this.lineIndices)gl.deleteBuffer(this.lineIndices);if(this.pathTarget){gl.deleteTexture(this.pathTarget.texture);gl.deleteFramebuffer(this.pathTarget.fbo);}
  const indices=new Uint16Array(segments*6);for(let i=0;i<segments;i++)indices.set([i*2,i*2+2,i*2+3,i*2,i*2+3,i*2+1],i*6);
  this.lineVAO=gl.createVertexArray();gl.bindVertexArray(this.lineVAO);this.lineIndices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.lineIndices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);
  if(this.float){this.pathTarget=this.target(segments+3,1024);gl.bindTexture(gl.TEXTURE_2D,this.pathTarget.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,segments+3,1024,0,gl.RGBA,gl.FLOAT,null);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);}
 }
 target(w,h){const gl=this.gl,texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,this.float?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,this.float?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Buffer grafico non disponibile.');return {texture,fbo,w,h};}
 releaseSurface(){this.optics?.release();this.shadow?.release();if(this.depthCopy){this.gl.deleteTexture(this.depthCopy.texture);this.gl.deleteFramebuffer(this.depthCopy.fbo);this.depthCopy=null;}for(const t of this.targets){this.gl.deleteTexture(t.texture);this.gl.deleteFramebuffer(t.fbo);if(t.depth)this.gl.deleteRenderbuffer(t.depth);}this.targets=[];this.width=0;this.height=0;this.canvas.width=1;this.canvas.height=1;return true;}
 resize(w,h){if(this.width===w&&this.height===h){if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;return;}this.releaseSurface();this.width=w;this.height=h;this.canvas.width=w;this.canvas.height=h;this.targets=[this.target(w,h),this.target(Math.ceil(w/4),Math.ceil(h/4)),this.target(Math.ceil(w/4),Math.ceil(h/4))];}
 bind(t){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,t?.fbo||null);gl.viewport(0,0,t?.w||this.width,t?.h||this.height);}
 tex(p,key,texture,unit){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.loc(p,key),unit);}
 settings(p,s,phase){const gl=this.gl;gl.useProgram(p.program);bindDynamics(gl,p.program,s);this.guides.bind(p);
  this.u(p,'uShadowPass',this.shadowPass?(this.shadowPass.mode||1):0);if(this.optics)this.optics.uniforms(p,s);else{this.u(p,'uOpticalShadow',0,0,0,0);this.tex(p,'uOpticalMap',this.seedTexture,8);}this.u(p,'uShadowHeight',s.pShadowHeight??-1.6);this.u(p,'uShadowOpacity',p.materialAlpha?1:Math.max(0,1-s.transparency));if(this.shadowPass)this.u(p,'uShadowLight',this.shadowPass.light.x,this.shadowPass.light.y,this.shadowPass.light.z);
  this.u(p,'uLivingOcclusion',this.occlusion||0);this.u(p,'uLivingDepthSize',this.width,this.height);this.tex(p,'uLivingDepth',this.depthCopy?.texture||this.seedTexture,7);
  this.u(p,'uSurfaceBind',s.pLiving>0&&s.pLiving!==4&&this.living?.texture?s.pSurfaceBind:0);this.tex(p,'uAttachedSurface',s.pLiving>0&&s.pLiving!==4&&this.living?.topology?this.living.texture:this.seedTexture,6);if(s.pLiving>0&&s.pLiving!==4&&this.living?.topology)gl.uniform2i(this.loc(p,'uAttachedSize'),this.living.topology.columns,this.living.topology.rows);
  this.u(p,'uAttachedBundles',0); // One continuous material surface, including grouped fibres.
  this.u(p,'uGuideScreenSize',this.shadowPass?.width||this.width,this.shadowPass?.height||this.height);this.u(p,'uGuideDrawPass',this.shadowPass?(this.shadowPass.mode||1):0);this.u(p,'uPhase',phase);this.u(p,'uSeed',(s.seed%997)*.013);this.u(p,'uResolution',this.shadowPass?.width||this.width,this.shadowPass?.height||this.height);
  this.u(p,'uShape',s.pFamily,s.pTarget,s.pOpening,s.pThickness);this.u(p,'uStructure',s.pFill,s.pLobes,s.pLobeDepth,s.pClumps);
  this.u(p,'uNoise',s.pOrganic,s.pFrequency,s.pDetail,s.pWarp);this.u(p,'uFlow',s.pCohesion,s.pRandom,s.pJitter,s.pRough);
  this.u(p,'uDynamics',s.pVortex,s.pReentry,s.pTravel,s.pMorph);this.u(p,'uPoles',s.pAttract,s.pRepel,s.pMagnet,s.pPoles);this.u(p,'uPoleRadius',s.pRadius);this.u(p,'uPoleField',s.pField);this.u(p,'uBreath',s.pBreath);
  this.u(p,'uOuter',s.pOuter,s.pReach,s.pBranches,0);this.u(p,'uClock',s.pCycles,s.pRhythm,s.pPause,s.pSpeedSpread);
  this.u(p,'uSpacing',s.pGrainSpacing??1,s.pGroupSpacing??1,s.pDistributionCells??4);this.u(p,'uPoints',s.pSize,s.pSizeVar,s.pOpacity,s.pSoftness);this.u(p,'uSprite',s.pSprite);this.u(p,'uLargeGrains',s.pLargeCount||0,grainDiameters(s).large);this.u(p,'uGrainDistribution',s.pSizeSpread||0,s.pSizeBias||0);this.u(p,'uNodeStyle',s.pLinks>0?s.pLinkNodes:0,grainDiameters(s).node);
  this.u(p,'uTrails',s.pTrailLength*s.pDirection,s.pTrailWidth,s.pTrailOpacity,0);this.u(p,'uTail',s.pTrailFade,s.pTrailTaper,0,s.pTrailScatter);
  this.u(p,'uFiber',s.pTrailPersistence,s.pTrailSoftness,s.pTrailCoherence,fiberGain(s));
  this.u(p,'uFiberLight',s.pFiberSheen,s.pFiberSpread);
  const forces=[...(s.forcePoints||[]).filter(f=>f.enabled).slice(0,8),...(s.bodyForces||[]).filter(f=>f.enabled).slice(0,3)];gl.uniform1i(this.loc(p,'uForcePasses'),3);gl.uniform1i(this.loc(p,'uForceCount'),forces.length);if(forces.length){gl.uniform4fv(this.loc(p,'uForcePoints'),forces.flatMap(f=>[f.x,f.y,f.z,f.strength]));gl.uniform2fv(this.loc(p,'uForceOptions'),forces.flatMap(f=>[f.radius,f.swirl]));}
  this.u(p,'uColor',s.pColorMode,s.pColorScatter,s.pLumaVar,s.pDepthFade);
  this.u(p,'uLife',s.pLife,s.pPulse,s.pSignal,s.pPropagation);this.u(p,'uNetwork',s.pNeural,s.pNodes,s.pConnect,0);this.u(p,'uSymmetry',s.pSymmetry);
  this.u(p,'uMotionQuality',s.pMotionSoftness,s.pFollow);this.u(p,'uMotionSeed',s.pMotionSeed);
  this.u(p,'uOrbit',s.pOrbitOval,s.pOrbitTilt*rad,s.pOrbitPrecession,s.pOrbitSpread);this.u(p,'uDrift',s.pOrbitDrift,0,0,0);
  this.u(p,'uWander',s.pWander,s.pWanderScale,s.pWanderCycles,s.pFlowBalance);
  this.u(p,'uTentacle',s.pTentacle,s.pTentacleCount,s.pTentacleLength,s.pTentacleTaper);this.u(p,'uTentacleMotion',s.pTentacleCurl,s.pTentacleWave,s.pTentacleCycles,0);
  this.u(p,'uSpaceWarp',s.pSpaceWarp,s.pWarpScale,s.pWarpCycles,s.pWarpTwist);
  this.u(p,'uForm',s.stretchX,s.stretchY,s.stretchZ,s.volume);this.u(p,'uWarp',s.deform,s.twist,s.waves,s.waveScale);this.u(p,'uFrame',s.scale,s.positionX,s.positionY,0);this.u(p,'uRotation',s.rotateX*rad,s.rotateY*rad,s.rotateZ*rad,0);
  this.u(p,'uMaterial',s.metal,s.roughness,s.gloss,s.iridescence);this.u(p,'uFinish',s.emission,s.pLighting,1-s.transparency,1);
  this.u(p,'uFilmPattern',s.filmPattern||0,s.filmPatternScale??1.5,s.filmPatternWarp??.8,s.filmPatternDetail??.5);this.u(p,'uFilmAccent',s.filmChroma||0,s.filmDuo||0);
  this.u(p,'uFilmLayer',s.pFilm,s.pFilmScale,s.pFilmVariation,0);
  const filmCycles=s.perfectLoop!==false?Math.max(1,Math.round(s.filmCycles||1)):(s.filmCycles||1);
  this.u(p,'uParticleFilmMotion',phase*Math.PI*2*filmCycles,s.filmFlow||0,s.filmSwirl||0,0);
  this.u(p,'uParticleCore',s.structCoreDark||0,s.structCoreRadius??.3,Math.max(.02,s.pThickness*2)*s.stretchX,Math.max(.02,s.pThickness*2)*s.stretchY);this.u(p,'uFilmObject',s.scale,s.positionX,s.positionY,0);this.u(p,'uFilmRotation',s.rotateX*rad,s.rotateY*rad,s.rotateZ*rad);
  gl.uniform3fv(this.loc(p,'uFilmResponse'),FILM_SPECTRUM.data);gl.uniform3fv(this.loc(p,'uFilmWhite'),FILM_SPECTRUM.white);
  this.u(p,'uPearl',s.iridShift??0,s.filmThickness??420);this.u(p,'uShadeOrigin',s.positionX,s.positionY,0);
  this.u(p,'uEnvironment',environments.indexOf(s.environment),s.environmentAngle*rad,s.environmentPower,0);
  this.u(p,'uGradient',s.gradientAngle*rad,s.gradientScale,s.gradientOffset,1);this.u(p,'uColorSoftness',s.colorSoftness);this.u(p,'uColorLayers',s.colorLayers||0,s.colorLayerScale??1,s.colorLayerShift||0,s.colorLayerMix||0);
  this.u(p,'uColorWave',s.colorWaveAmount,s.colorWaveBands,s.colorWavePhase*Math.PI*2,0);this.u(p,'uColorWave2',s.colorWaveHeight,s.colorWaveRadius,s.colorWaveSwirl,s.colorWaveWarp);
  gl.uniform1i(this.loc(p,'uPaletteCount'),s.palette.length);gl.uniform3fv(this.loc(p,'uPalette'),s.palette.flatMap(linearRgb));
  const lights=s.lights.filter(l=>l.enabled).slice(0,8);gl.uniform1i(this.loc(p,'uLightCount'),lights.length);
  if(lights.length){gl.uniform4fv(this.loc(p,'uLights'),lights.flatMap(l=>[l.x,l.y,l.z,l.power]));gl.uniform3fv(this.loc(p,'uLightColors'),lights.flatMap(l=>linearRgb(l.color)));gl.uniform1fv(this.loc(p,'uLightSizes'),lights.map(l=>l.size));}
 }
 ensureTrails(s){
  if(!(s.pTrailCount>0&&s.pTrailLength>0))return;
  // Float trajectories are always baked before drawing: do not compile a second
  // copy of the full simulation into each of the three ribbon samples.
  this.lines??=this.program(this.float?trailVert.replace('uBaked?texelFetch(uPaths,ivec2(j+1,gl_InstanceID),0).xyz:position(r,uPhase-float(j)/float(uSegments)*uTrails.x)','texelFetch(uPaths,ivec2(j+1,gl_InstanceID),0).xyz'):trailVert,trailFrag);
  if(this.float)this.pathProgram??=this.program(screenVert,pathFrag);
 }
 prepare(source,phase=0){
  if(this.gl.isContextLost())throw Error('La GPU è stata interrotta. Ricarica Prisma.');
  const s={...PARTICLE_DEFAULTS,...sampleFrame(source,phase)};migrateGrainSizes(s,source);this.ensureTrails(s);
  // Queue optional geometry programs before drawing, without blocking the UI
  // on LINK_STATUS while the driver is still compiling them.
  if(s.pLiving===4)this.veils??=new LayeredVeils(this,common);
  else if(s.pLiving>0)this.living??=new LivingStructures(this,common);
  if(s.pLinks>0&&s.pLiving!==4)this.connections??=new ParticleLinks(this,common);
  const required=new Set([this.points,this.blur,this.compose]);
  if(s.pTrailCount>0&&s.pTrailLength>0){required.add(this.lines);if(this.pathProgram)required.add(this.pathProgram);}
  if(this.guides.program&&s.forcePaths?.some(p=>p.enabled&&p.points?.length>=2))required.add(this.guides.program);
  for(const effect of [s.pLiving===4?this.veils:s.pLiving>0?this.living:null,s.pLinks>0&&s.pLiving!==4?this.connections:null])if(effect)for(const p of Object.values(effect))if(p?.uniforms instanceof Map)required.add(p);
  // An effect switched off while it compiles must not hold up the active scene.
  let ready=true;for(const p of required){if(p.ready)continue;if(this.parallelExtension&&!this.gl.getProgramParameter(p.program,this.parallelExtension.COMPLETION_STATUS_KHR)){ready=false;continue;}this.finishProgram(p);}return ready;
 }
 async prepareAsync(s,p,o={}){let slow=false;const start=performance.now();o.onStage?.('preparing');while(!o.cancelled?.()){if(this.prepare(s,p)){o.onStage?.('rendering');return true;}if(!slow&&performance.now()-start>30000){slow=true;o.onStage?.('preparing-slow');}await new Promise(r=>setTimeout(r,16));}return false;}
 draw(source,phase=0,w=this.canvas.width,h=this.canvas.height,options={}){
  const gl=this.gl;if(gl.isContextLost())throw Error('La GPU è stata interrotta. Ricarica Prisma.');if(options.preview&&!this.prepare(source,phase))return false;
  phase=((phase/(Math.PI*2))%1+1)%1;const s={...PARTICLE_DEFAULTS,...sampleFrame(source,phase*Math.PI*2)};migrateGrainSizes(s,source);this.ensureTrails(s);
  if(s.pLiving===4){s.pCount=0;s.pTrailCount=0;s.pLinks=0;s.pLivingBlend=1;}
  this.geometryBudget=options.preview&&options.quality==='fast'?Math.max(1/16,Math.min(1,options.geometryBudget??1)):1;this.previewCounts={};this.linkRestState={...s};for(const k of ['volume','stretchX','stretchY','stretchZ'])this.linkRestState[k]=source[k]??s[k];
  const weights=livingWeights(s);s.pOpacity*=weights.core;s.pTrailOpacity*=weights.core;s.pLinks*=weights.core;s.pSkin*=weights.structure;s.pThreadOpacity*=weights.structure;this.occlusion=0;
  if(this.seed!==s.seed)this.geometry(s.seed);this.resize(w,h);this.guides.update(s);this.pollGpuTime();const query=options.trackTiming!==false&&this.timerExtension&&this.queries.length<3?gl.createQuery():null;
  if(query)gl.beginQuery(this.timerExtension.TIME_ELAPSED_EXT,query);
  const [scene,a,b]=this.targets;let sceneDrawn=false;
  const transmission=s.pLiving===4?1-s.pVeilOpacity:s.transparency;
  const opticalLight=(s.pSelfShadow>0||(s.pCaustic>0&&transmission>0&&s.refraction>1&&s.metal<1))?shadowLight(s):null;
  if(this.optics){this.optics.ready=false;this.optics.causticActive=false;}
  // Prepare living geometry once. The light pass and shaded pass reuse it.
  if(opticalLight){
   this.optics??=new ParticleOptics(this);this.optics.configure(s,opticalLight);
   if(s.pLiving>0){this.drawGeometry(scene,s,phase,options,weights);sceneDrawn=true;}
   this.optics.capture(s,phase,options,weights);
   this.reuseGeometry=true;
  }
  try{if(!sceneDrawn||s.pSelfShadow>0)this.drawGeometry(scene,s,phase,options,weights);}finally{this.reuseGeometry=false;}
  const causticTexture=opticalLight?this.optics.drawCaustic(s):null;
  let shadowTexture=null;if(s.pShadow>0){this.shadow??=new ParticleShadow(this);shadowTexture=this.shadow.draw(s,phase,options,weights);}
  gl.depthMask(true);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.bindVertexArray(this.empty);gl.useProgram(this.blur.program);
  for(const [dst,src,step]of [[a,scene,[2/w,0]],[b,a,[0,1/a.h]],[a,b,[1/a.w,0]]]){this.bind(dst);this.tex(this.blur,'uImage',src.texture,0);this.u(this.blur,'uStep',...step);gl.drawArrays(gl.TRIANGLES,0,3);}
  this.bind(null);const c=this.compose;gl.useProgram(c.program);this.tex(c,'uImage',scene.texture,0);this.tex(c,'uBloom',a.texture,1);this.tex(c,'uShadow',shadowTexture||scene.texture,4);this.u(c,'uShadowStrength',shadowTexture?this.shadow.strength:0);this.tex(c,'uCausticMap',causticTexture||scene.texture,5);this.u(c,'uCausticOn',causticTexture?1:0);this.u(c,'uGlow',s.glow);this.u(c,'uVeilCompose',s.pLiving===4?1:0);
  this.u(c,'uGrade',s.exposure,s.brightness,s.contrast,s.saturation);this.u(c,'uPhoto',s.temperature,s.photoTint,s.gamma,s.vignette);this.u(c,'uTone',s.blacks,s.highlights,0,0);this.u(c,'uLens',s.lensDistortion,s.grain,s.grainSize,0);this.u(c,'uPhotoAll',+s.photoAll);
  this.u(c,'uBackground',...rgb(s.background));this.u(c,'uBackground2',...rgb(s.background2));this.u(c,'uBgMode',['solid','gradient','studio','transparent'].indexOf(s.bgMode));this.u(c,'uBg',s.bgAngle*rad,s.bgHeight,s.bgSoftness,s.bgWash);
  this.u(c,'uBgShade',s.bgShade??.06);this.u(c,'uOutputSize',w,h);
  gl.drawArrays(gl.TRIANGLES,0,3);gl.bindVertexArray(null);
  if(query){gl.endQuery(this.timerExtension.TIME_ELAPSED_EXT);this.queries.push(query);}
  if(!options.deferCompletion){if(this.completionSync)gl.deleteSync(this.completionSync);this.completionSync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();}return true;
 }
 drawGeometry(scene,s,phase,options,weights){
  const gl=this.gl,w=this.width,h=this.height;this.bind(scene);if(!this.shadowPass&&s.pLiving>0&&!scene.depth){scene.depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,scene.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,scene.depth);}gl.depthMask(true);gl.clearDepth(1);gl.clearColor(this.shadowPass?.mode===2?1:0,this.shadowPass?.mode===2?1:0,this.shadowPass?.mode===2?1:0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,this.shadowPass?gl.ONE_MINUS_SRC_ALPHA:gl.ONE);
  if(s.pLiving===4){this.veils??=new LayeredVeils(this,common);this.veils.draw({...s,pVeilOpacity:s.pVeilOpacity*weights.structure},phase*s.pDirection,options);}
  else if(s.pLiving>0){this.living??=new LivingStructures(this,common);this.living.draw(s,phase*s.pDirection);}
  if(!this.shadowPass&&s.pLiving>0&&s.pLiving!==4&&s.pSkin>0){
   if(!this.depthCopy){const texture=gl.createTexture(),fbo=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,texture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Profondità struttura non disponibile');this.depthCopy={texture,fbo};}
   gl.bindFramebuffer(gl.READ_FRAMEBUFFER,scene.fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.depthCopy.fbo);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.DEPTH_BUFFER_BIT,gl.NEAREST);this.bind(scene);
   this.occlusion=s.pSkin*(1-s.transparency)*s.pLivingOcclusion;
  }
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
  if(s.pTrailCount>0&&s.pTrailLength>0&&s.pTrailOpacity>0){
   const total=Math.round(s.pTrailCount),count=options.preview&&options.quality==='fast'?Math.min(total,Math.max(128,Math.round(8000*this.geometryBudget))):total,segments=Math.round(options.preview&&options.quality==='fast'?Math.min(s.pTrailQuality,Math.max(24,Math.round(96*Math.sqrt(this.geometryBudget)/8)*8)):s.pTrailQuality);
   this.trailGeometry(segments);this.previewTrailCount=count;this.previewCounts.trails=count;
   const setup=p=>{this.settings(p,s,phase*s.pDirection);this.tex(p,'uSeeds',this.seedTexture,2);gl.uniform1i(this.loc(p,'uSegments'),segments);};
   for(let start=0;start<count;start+=1024){const batch=Math.min(1024,count-start);
    if(this.pathProgram){gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);this.bind(this.pathTarget);gl.viewport(0,0,segments+3,batch);gl.bindVertexArray(this.empty);setup(this.pathProgram);gl.uniform1i(this.loc(this.pathProgram,'uBatchStart'),start);gl.drawArrays(gl.TRIANGLES,0,3);}
    this.bind(scene);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);setup(this.lines);gl.uniform1i(this.loc(this.lines,'uBatchStart'),start);gl.uniform1i(this.loc(this.lines,'uBaked'),this.float?1:0);this.tex(this.lines,'uPaths',this.pathTarget?.texture||this.seedTexture,3);
    // Preview uses a representative subset; compensate coverage so density remains readable.
    this.u(this.lines,'uFiber',s.pTrailPersistence,s.pTrailSoftness,s.pTrailCoherence,fiberGain(s)*total/count);
    gl.bindVertexArray(this.lineVAO);this.opticalDrawState();gl.drawElementsInstanced(gl.TRIANGLES,segments*6,gl.UNSIGNED_SHORT,0,batch);
   }
  }else this.previewTrailCount=0;
  if(s.pLinks>0){this.connections??=new ParticleLinks(this,common);this.connections.draw(s,phase*s.pDirection);}
  if(s.pCount>0&&s.pOpacity>0){
   const count=Math.min(Math.round(s.pCount),Math.max(s.pLinks>0?s.pLinkNodes:256,Math.round(s.pCount*this.geometryBudget)));this.previewCounts.points=count;this.settings(this.points,{...s,pOpacity:s.pOpacity*Math.min(16,s.pCount/count)},phase*s.pDirection);
   const size=Math.max(s.pSize,s.pLargeCount>0?grainDiameters(s).large:0,s.pLinks>0?grainDiameters(s).node:0),quad=Math.min(1024,size*(1+s.pSizeVar*.85)*Math.pow(2,s.pSizeSpread||0))*(this.shadowPass?.height||this.height)/1080>Math.min(64,this.pointSizeLimit);
   this.u(this.points,'uPointQuad',quad?1:0);gl.bindVertexArray(quad?this.quadVAO:this.pointVAO);this.opticalDrawState();
   if(quad)gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);else gl.drawArrays(gl.POINTS,0,count);
  }
 }
 opticalDrawState(){if(this.shadowPass?.mode===2){const g=this.gl;g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.depthMask(true);g.disable(g.BLEND);}}
 async drawAccumulated(s,p,w,h,o={}){if(!await this.prepareAsync(s,p,o))return false;this.draw(s,p,w,h,o);const ok=await this.waitForGpu(o);o.progress?.(1);return ok;}
 async drawTiled(...args){return this.drawAccumulated(...args);}
 pollCompletion(){if(!this.completionSync)return true;const gl=this.gl,result=gl.clientWaitSync(this.completionSync,0,0);if(result===gl.WAIT_FAILED)throw Error('Sincronizzazione GPU interrotta.');if(result===gl.TIMEOUT_EXPIRED)return false;gl.deleteSync(this.completionSync);this.completionSync=null;this.completedFrames++;return true;}
 async waitForGpu(o={}){const start=performance.now();while(!this.pollCompletion()){if(this.gl.isContextLost()||performance.now()-start>120000)throw Error('La GPU non risponde.');await new Promise(r=>setTimeout(r,4));}return !o.cancelled?.();}
 pollGpuTime(){const gl=this.gl,e=this.timerExtension;if(!e)return;const disjoint=gl.getParameter(e.GPU_DISJOINT_EXT);while(this.queries.length&&(disjoint||gl.getQueryParameter(this.queries[0],gl.QUERY_RESULT_AVAILABLE))){const q=this.queries.shift();if(!disjoint){this.gpuMilliseconds=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;this.gpuSample++;}gl.deleteQuery(q);}}
 hardwareInfo(){const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name),timingAvailable:!!this.timerExtension};}
 pixels(){const gl=this.gl,a=new Uint8Array(this.width*this.height*4),out=new Uint8Array(a.length),stride=this.width*4;gl.readPixels(0,0,this.width,this.height,gl.RGBA,gl.UNSIGNED_BYTE,a);for(let y=0;y<this.height;y++)out.set(a.subarray(y*stride,(y+1)*stride),(this.height-y-1)*stride);return out;}
 dispose({loseContext=false}={}){const gl=this.gl;if(this.completionSync)gl.deleteSync(this.completionSync);for(const q of this.queries)gl.deleteQuery(q);this.living?.dispose();this.veils?.dispose();this.connections?.dispose();this.guides.dispose();this.optics?.dispose();this.releaseSurface();if(this.buffer)gl.deleteBuffer(this.buffer);if(this.lineIndices)gl.deleteBuffer(this.lineIndices);if(this.seedTexture)gl.deleteTexture(this.seedTexture);if(this.pathTarget){gl.deleteTexture(this.pathTarget.texture);gl.deleteFramebuffer(this.pathTarget.fbo);}for(const p of [this.points,this.lines,this.pathProgram,this.blur,this.compose])if(p)gl.deleteProgram(p.program);for(const v of [this.pointVAO,this.quadVAO,this.lineVAO,this.empty])if(v)gl.deleteVertexArray(v);gl.bindVertexArray(null);if(loseContext)this.recoveryExtension?.loseContext();}
}
