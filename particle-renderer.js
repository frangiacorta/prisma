import {sampleFrame} from './solid-renderer.js?v=94ae8e7aefbb';
import {PARTICLE_DEFAULTS,rng} from './particle-model.js?v=94ae8e7aefbb';
import {fieldGLSL} from './particle-field.js?v=94ae8e7aefbb';
import {prismaShadingGLSL} from './particle-shading.js?v=94ae8e7aefbb';
const common=`${prismaShadingGLSL}\n${fieldGLSL}`;
const pointVert=`#version 300 es
precision highp float;
layout(location=0) in vec4 aRandom;
${common}
out vec3 vColor,vPosition;out float vOpacity;
void main(){vec3 p=position(aRandom,uPhase);gl_Position=project(p);
 float px=uPoints.x*mix(1.,.15+aRandom.z*1.7,uPoints.y)*uResolution.y/1080.;
 gl_PointSize=clamp(px,2.,64.);
 vOpacity=uPoints.z*3.*min(1.,px*px/4.);vPosition=p;vColor=particleColor(aRandom,p);
}`;
const pointFrag=`#version 300 es
precision highp float;
in vec3 vColor,vPosition;in float vOpacity;out vec4 color;
${prismaShadingGLSL}
uniform vec4 uPoints;uniform float uSprite;
void main(){vec2 xy=gl_PointCoord*2.-1.;float d=length(xy),aa=max(fwidth(d),.04);
 float coverage=1.-smoothstep(1.-aa,1.,d);
 if(uSprite>1.5&&uSprite<2.5)coverage*=smoothstep(.35,.55,d);
 if(uSprite>2.5)coverage*=exp(-min(abs(xy.x),abs(xy.y))*12.);
 float profile=uSprite<.5?exp(-d*d*mix(.2,3.,uPoints.w)):mix(1.,exp(-d*d*3.),uPoints.w);
 float a=coverage*profile*vOpacity;
 vec3 n=normalize(vec3(xy.x,-xy.y,sqrt(max(.01,1.-d*d))));
 color=vec4(shadeParticle(vColor,vPosition,n)*a,a);
}`;
const trailVert=`#version 300 es
precision highp float;
layout(location=0) in vec4 aRandom;
${common}
out vec3 vColor;out float vOpacity,vSide;
void main(){
 int segment=gl_VertexID/6,k=gl_VertexID%6;
 float end=(k==1||k==2||k==4)?1.:0.,side=(k==2||k==4||k==5)?1.:-1.;
 float age=(float(segment)+end)/48.;
 vec4 r=aRandom;r.w=fract(r.w+uTail.w*.618);
 float at=uPhase-age*uTrails.x;
 vec3 p=position(r,at),next=position(r,at-.001);
 vec4 clip=project(p),adj=project(next);
 vec2 tangent=(adj.xy-clip.xy)*uResolution;
 vec2 normal=vec2(-tangent.y,tangent.x)/max(.00001,length(tangent));
 float width=uTrails.y*mix(1.,pow(max(.001,1.-age),.7),uTail.y)*uResolution.y/1080.;
 clip.xy+=normal*side*max(1.,width)/uResolution;
 gl_Position=clip;vSide=side;
 vColor=shadeParticle(particleColor(r,p),p,normalize(p+vec3(0.,0.,1.5)));
 vOpacity=uTrails.z*pow(max(0.,1.-age),uTail.x)*min(1.,width);
}`;
const trailFrag=`#version 300 es
precision highp float;in vec3 vColor;in float vOpacity,vSide;out vec4 color;
void main(){float a=vOpacity*(1.-smoothstep(.3,1.,abs(vSide)));color=vec4(vColor*a,a);}`;
const screenVert=`#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const blurFrag=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D uImage;uniform vec2 uStep;
void main(){vec4 c=texture(uImage,uv)*.227027;c+=texture(uImage,uv+uStep*1.384615)*.316216;c+=texture(uImage,uv-uStep*1.384615)*.316216;c+=texture(uImage,uv+uStep*3.230769)*.070270;c+=texture(uImage,uv-uStep*3.230769)*.070270;color=c;}`;
const composeFrag=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D uImage,uBloom;uniform float uGlow,uBgMode,uPhotoAll;
uniform vec4 uGrade,uPhoto,uTone,uLens,uBg;uniform vec3 uBackground,uBackground2;
vec3 grade(vec3 c){c=(c*exp2(uGrade.x)+uGrade.y-.5)*uGrade.z+.5;float grey=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(grey),c,uGrade.w);c*=vec3(1.+uPhoto.x*.25,1.+uPhoto.y*.2,1.-uPhoto.x*.25);c+=uTone.x*pow(1.-clamp(c,0.,1.),vec3(2.))+uTone.y*pow(clamp(c,0.,1.),vec3(2.));return pow(max(c,0.),vec3(1./max(.1,uPhoto.z)));}
void main(){vec2 p=uv-.5,q=.5+p*(1.+uLens.x*dot(p,p));vec4 src=texture(uImage,q),bloom=texture(uBloom,q);
 vec3 c=1.-exp(-(src.rgb+bloom.rgb*uGlow*2.2)*1.7);
 float bgT=dot(uv-.5,vec2(cos(uBg.x),sin(uBg.x)))+.5;
 if(uBgMode>1.5)bgT=smoothstep(-uBg.z,uBg.z,(uv.y-.5)*2.+uBg.y);
 vec3 bg=uBgMode<.5?uBackground:mix(uBackground,uBackground2,clamp(bgT,0.,1.));
 if(uBgMode>1.5)bg*=1.+uBg.w*exp(-dot(p,p)*5.);
 float alpha=clamp(1.-exp(-(src.a+bloom.a*uGlow)),0.,1.);
 if(uBgMode>2.5)bg=vec3(0.);
 c=uPhotoAll>.5?grade(c+bg*(1.-alpha)):grade(c)+bg*(1.-alpha);
 c*=1.-uPhoto.w*dot(p,p)*1.5;
 vec2 cell=floor(gl_FragCoord.xy/max(1.,uLens.z));float noise=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453)-.5;
 c+=noise*uLens.y;
 color=vec4(clamp(c,0.,1.),uBgMode>2.5?alpha:1.);
}`;
const rad=Math.PI/180,rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const environments=['studio','sunset','neon','sky','aquarium','aurora','city'];
export class ParticleRenderer{
 constructor(canvas){
  this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl)throw Error('WebGL 2 non disponibile.');this.float=!!gl.getExtension('EXT_color_buffer_float');
  this.points=this.program(pointVert,pointFrag);this.lines=this.program(trailVert,trailFrag);this.blur=this.program(screenVert,blurFrag);this.compose=this.program(screenVert,composeFrag);
  this.empty=gl.createVertexArray();this.targets=[];this.width=0;this.height=0;this.seed=null;this.completedFrames=0;this.gpuSample=0;this.gpuMilliseconds=null;
  this.maxSize=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));this.recoveryExtension=gl.getExtension('WEBGL_lose_context');
  this.timerExtension=gl.getExtension('EXT_disjoint_timer_query_webgl2');this.queries=[];
 }
 program(v,f){const gl=this.gl,program=gl.createProgram();for(const [type,source]of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);gl.deleteShader(shader);}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));return {program,uniforms:new Map()};}
 loc(p,k){if(!p.uniforms.has(k))p.uniforms.set(k,this.gl.getUniformLocation(p.program,k));return p.uniforms.get(k);}
 u(p,k,...v){const loc=this.loc(p,k);if(loc!==null)this.gl['uniform'+v.length+'f'](loc,...v);}
 geometry(seed){const gl=this.gl;if(this.buffer)gl.deleteBuffer(this.buffer);for(const vao of [this.pointVAO,this.lineVAO])if(vao)gl.deleteVertexArray(vao);
  const r=rng(seed),random=new Float32Array(300000*4);for(let i=0;i<random.length;i++)random[i]=r();
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,random,gl.STATIC_DRAW);
  this.pointVAO=gl.createVertexArray();this.lineVAO=gl.createVertexArray();for(const [vao,div]of [[this.pointVAO,0],[this.lineVAO,1]]){gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,div);}gl.bindVertexArray(null);this.seed=seed;
 }
 target(w,h){const gl=this.gl,texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,this.float?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,this.float?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Buffer grafico non disponibile.');return {texture,fbo,w,h};}
 releaseSurface(){for(const t of this.targets){this.gl.deleteTexture(t.texture);this.gl.deleteFramebuffer(t.fbo);}this.targets=[];this.width=0;this.height=0;this.canvas.width=1;this.canvas.height=1;return true;}
 resize(w,h){if(this.width===w&&this.height===h)return;this.releaseSurface();this.width=w;this.height=h;this.canvas.width=w;this.canvas.height=h;this.targets=[this.target(w,h),this.target(Math.ceil(w/4),Math.ceil(h/4)),this.target(Math.ceil(w/4),Math.ceil(h/4))];}
 bind(t){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,t?.fbo||null);gl.viewport(0,0,t?.w||this.width,t?.h||this.height);}
 tex(p,key,texture,unit){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.loc(p,key),unit);}
 settings(p,s,phase){const gl=this.gl;gl.useProgram(p.program);
  this.u(p,'uPhase',phase);this.u(p,'uSeed',(s.seed%997)*.013);this.u(p,'uResolution',this.width,this.height);
  this.u(p,'uShape',s.pFamily,s.pTarget,s.pOpening,s.pThickness);this.u(p,'uStructure',s.pFill,s.pLobes,s.pLobeDepth,s.pClumps);
  this.u(p,'uNoise',s.pOrganic,s.pFrequency,s.pDetail,s.pWarp);this.u(p,'uFlow',s.pCohesion,s.pRandom,s.pJitter,s.pRough);
  this.u(p,'uDynamics',s.pVortex,s.pReentry,s.pTravel,s.pMorph);this.u(p,'uPoles',s.pAttract,s.pRepel,s.pMagnet,s.pPoles);this.u(p,'uPoleRadius',s.pRadius);this.u(p,'uPoleField',s.pField);this.u(p,'uBreath',s.pBreath);
  this.u(p,'uOuter',s.pOuter,s.pReach,s.pBranches,0);this.u(p,'uClock',s.pCycles,s.pRhythm,s.pPause,s.pSpeedSpread);
  this.u(p,'uPoints',s.pSize,s.pSizeVar,s.pOpacity,s.pSoftness);this.u(p,'uSprite',s.pSprite);
  this.u(p,'uTrails',s.pTrailLength*s.pDirection,s.pTrailWidth,s.pTrailOpacity,0);this.u(p,'uTail',s.pTrailFade,s.pTrailTaper,0,s.pTrailScatter);
  this.u(p,'uColor',s.pColorMode,s.pColorScatter,s.pLumaVar,s.pDepthFade);
  this.u(p,'uLife',s.pLife,s.pPulse,s.pSignal,s.pPropagation);this.u(p,'uNetwork',s.pNeural,s.pNodes,s.pConnect,0);this.u(p,'uSymmetry',s.pSymmetry);
  this.u(p,'uMotionQuality',s.pMotionSoftness,s.pFollow);this.u(p,'uMotionSeed',s.pMotionSeed);
  this.u(p,'uOrbit',s.pOrbitOval,s.pOrbitTilt*rad,s.pOrbitPrecession,s.pOrbitSpread);this.u(p,'uDrift',s.pOrbitDrift,0,0,0);
  this.u(p,'uWander',s.pWander,s.pWanderScale,s.pWanderCycles,s.pFlowBalance);
  this.u(p,'uTentacle',s.pTentacle,s.pTentacleCount,s.pTentacleLength,s.pTentacleTaper);this.u(p,'uTentacleMotion',s.pTentacleCurl,s.pTentacleWave,s.pTentacleCycles,0);
  this.u(p,'uSpaceWarp',s.pSpaceWarp,s.pWarpScale,s.pWarpCycles,s.pWarpTwist);
  this.u(p,'uForm',s.stretchX,s.stretchY,s.stretchZ,s.volume);this.u(p,'uWarp',s.deform,s.twist,s.waves,s.waveScale);this.u(p,'uFrame',s.scale,s.positionX,s.positionY,0);this.u(p,'uRotation',s.rotateX*rad,s.rotateY*rad,s.rotateZ*rad,0);
  this.u(p,'uMaterial',s.metal,s.roughness,s.gloss,s.iridescence);this.u(p,'uFinish',s.emission,s.pLighting,1-s.transparency,1);
  this.u(p,'uEnvironment',environments.indexOf(s.environment),s.environmentAngle*rad,s.environmentPower,0);
  this.u(p,'uGradient',s.gradientAngle*rad,s.gradientScale,s.gradientOffset,1);this.u(p,'uColorSoftness',s.colorSoftness);
  this.u(p,'uColorWave',s.colorWaveAmount,s.colorWaveBands,s.colorWavePhase*Math.PI*2,0);this.u(p,'uColorWave2',s.colorWaveHeight,s.colorWaveRadius,s.colorWaveSwirl,s.colorWaveWarp);
  gl.uniform1i(this.loc(p,'uPaletteCount'),s.palette.length);gl.uniform3fv(this.loc(p,'uPalette'),s.palette.flatMap(rgb));
  const lights=s.lights.filter(l=>l.enabled).slice(0,8);gl.uniform1i(this.loc(p,'uLightCount'),lights.length);
  if(lights.length){gl.uniform4fv(this.loc(p,'uLights'),lights.flatMap(l=>[l.x,l.y,l.z,l.power]));gl.uniform3fv(this.loc(p,'uLightColors'),lights.flatMap(l=>rgb(l.color)));gl.uniform1fv(this.loc(p,'uLightSizes'),lights.map(l=>l.size));}
 }
 prepare(){return true;}async prepareAsync(s,p,o={}){return !o.cancelled?.();}
 draw(source,phase=0,w=this.canvas.width,h=this.canvas.height){
  const gl=this.gl;if(gl.isContextLost())throw Error('La GPU è stata interrotta. Ricarica Prisma.');
  phase=((phase/(Math.PI*2))%1+1)%1;const s={...PARTICLE_DEFAULTS,...sampleFrame(source,phase*Math.PI*2)};
  if(this.seed!==s.seed)this.geometry(s.seed);this.resize(w,h);this.pollGpuTime();const query=this.timerExtension&&this.queries.length<3?gl.createQuery():null;
  if(query)gl.beginQuery(this.timerExtension.TIME_ELAPSED_EXT,query);
  const [scene,a,b]=this.targets;this.bind(scene);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,gl.ONE);
  if(s.pTrailCount>0&&s.pTrailLength>0&&s.pTrailOpacity>0){this.settings(this.lines,s,phase*s.pDirection);gl.bindVertexArray(this.lineVAO);gl.drawArraysInstanced(gl.TRIANGLES,0,48*6,Math.round(s.pTrailCount));}
  if(s.pCount>0&&s.pOpacity>0){this.settings(this.points,s,phase*s.pDirection);gl.bindVertexArray(this.pointVAO);gl.drawArrays(gl.POINTS,0,Math.round(s.pCount));}
  gl.disable(gl.BLEND);gl.bindVertexArray(this.empty);gl.useProgram(this.blur.program);
  for(const [dst,src,step]of [[a,scene,[2/w,0]],[b,a,[0,1/a.h]],[a,b,[1/a.w,0]]]){this.bind(dst);this.tex(this.blur,'uImage',src.texture,0);this.u(this.blur,'uStep',...step);gl.drawArrays(gl.TRIANGLES,0,3);}
  this.bind(null);const c=this.compose;gl.useProgram(c.program);this.tex(c,'uImage',scene.texture,0);this.tex(c,'uBloom',a.texture,1);this.u(c,'uGlow',s.glow);
  this.u(c,'uGrade',s.exposure,s.brightness,s.contrast,s.saturation);this.u(c,'uPhoto',s.temperature,s.photoTint,s.gamma,s.vignette);this.u(c,'uTone',s.blacks,s.highlights,0,0);this.u(c,'uLens',s.lensDistortion,s.grain,s.grainSize,0);this.u(c,'uPhotoAll',+s.photoAll);
  this.u(c,'uBackground',...rgb(s.background));this.u(c,'uBackground2',...rgb(s.background2));this.u(c,'uBgMode',['solid','gradient','studio','transparent'].indexOf(s.bgMode));this.u(c,'uBg',s.bgAngle*rad,s.bgHeight,s.bgSoftness,s.bgWash);
  gl.drawArrays(gl.TRIANGLES,0,3);gl.bindVertexArray(null);
  if(query){gl.endQuery(this.timerExtension.TIME_ELAPSED_EXT);this.queries.push(query);}
  if(this.completionSync)gl.deleteSync(this.completionSync);this.completionSync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();return true;
 }
 async drawAccumulated(s,p,w,h,o={}){if(o.cancelled?.())return false;this.draw(s,p,w,h);const ok=await this.waitForGpu(o);o.progress?.(1);return ok;}
 async drawTiled(...args){return this.drawAccumulated(...args);}
 pollCompletion(){if(!this.completionSync)return true;const gl=this.gl,result=gl.clientWaitSync(this.completionSync,0,0);if(result===gl.WAIT_FAILED)throw Error('Sincronizzazione GPU interrotta.');if(result===gl.TIMEOUT_EXPIRED)return false;gl.deleteSync(this.completionSync);this.completionSync=null;this.completedFrames++;return true;}
 async waitForGpu(o={}){const start=performance.now();while(!this.pollCompletion()){if(this.gl.isContextLost()||performance.now()-start>120000)throw Error('La GPU non risponde.');await new Promise(r=>setTimeout(r,4));}return !o.cancelled?.();}
 pollGpuTime(){const gl=this.gl,e=this.timerExtension;if(!e)return;const disjoint=gl.getParameter(e.GPU_DISJOINT_EXT);while(this.queries.length&&(disjoint||gl.getQueryParameter(this.queries[0],gl.QUERY_RESULT_AVAILABLE))){const q=this.queries.shift();if(!disjoint){this.gpuMilliseconds=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;this.gpuSample++;}gl.deleteQuery(q);}}
 hardwareInfo(){const gl=this.gl,e=gl.getExtension('WEBGL_debug_renderer_info'),name=gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);return {name,software:/swiftshader|llvmpipe/i.test(name),timingAvailable:!!this.timerExtension};}
 pixels(){const gl=this.gl,a=new Uint8Array(this.width*this.height*4),out=new Uint8Array(a.length),stride=this.width*4;gl.readPixels(0,0,this.width,this.height,gl.RGBA,gl.UNSIGNED_BYTE,a);for(let y=0;y<this.height;y++)out.set(a.subarray(y*stride,(y+1)*stride),(this.height-y-1)*stride);return out;}
 dispose({loseContext=false}={}){const gl=this.gl;if(this.completionSync)gl.deleteSync(this.completionSync);for(const q of this.queries)gl.deleteQuery(q);this.releaseSurface();if(this.buffer)gl.deleteBuffer(this.buffer);for(const p of [this.points,this.lines,this.blur,this.compose])gl.deleteProgram(p.program);for(const v of [this.pointVAO,this.lineVAO,this.empty])if(v)gl.deleteVertexArray(v);gl.bindVertexArray(null);if(loseContext)this.recoveryExtension?.loseContext();}
}
