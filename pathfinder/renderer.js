import {palettes, randomSequence, wrap, motionTime} from './model.js';
import {samplePrisma,environments} from './prisma-controls.js';
import {prismaShadingGLSL} from './prisma-shading.js';

const pathGLSL = `
const float TAU=6.28318530718;
uniform float uTime,uRhythm,uPause,uCompact,uOpening,uTurbulence,uVortex,uTrail,uSeed,uDirection;
uniform vec2 uView;
uniform vec2 uOuter;
uniform vec2 uResolution;
uniform float uZoom,uExposure,uGrain;
uniform vec3 uLow,uHigh;
uniform vec4 uForm,uPrismaWarp,uPrismaFrame;
uniform vec2 uPrismaRotation;
${prismaShadingGLSL}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float clockAt(float t){
 float q=clamp((fract(t)-uPause*.5)/(1.-uPause),0.,1.);
 float r=.14,y=min(q,1.-q)/r;
 float ramp=r*y*y*y*(1.-.5*y);
 float area=q<r?ramp:q>1.-r?1.-r-ramp:q-r*.5;
 float e=uPause>0. ? area/(1.-r) : q;
 return TAU*e-.75*uRhythm*sin(TAU*e);
}
vec3 warp(vec3 p,float t){
 // Curl of a separable trigonometric vector potential: coherent, divergence free.
 vec3 c=vec3(cos(p.y*2.7+t)-sin(p.z*2.7-t),cos(p.z*2.7+t)-sin(p.x*2.7-t),cos(p.x*2.7+t)-sin(p.y*2.7-t));
 p+=c*(.12+.22*uTurbulence);
 p+=uTurbulence*.13*vec3(sin(p.y*7.+t*2.)*cos(p.z*6.-t),sin(p.z*7.-t)*cos(p.x*6.+t),sin(p.x*7.+t)*cos(p.y*6.-t));
 return p;
}
vec3 particle(vec4 r,float time){
 float t=clockAt(time),s=uSeed*.013;
 float a=r.x*TAU,tube=r.y*TAU;
 float angle=a+t*(1.+step(.65,r.w));
 float v=tube+t+uVortex*1.5*sin(angle*2.+s);
 float major=.48+uOpening*.42;
 float minor=(.42+.18*r.z)*(1.-uOpening*.18);
 float fold=.13*sin(angle*3.+t+s)+.1*cos(angle*5.-t*2.);
 float rad=major+minor*cos(v)+fold;
 vec3 p=vec3(rad*cos(angle),minor*sin(v),rad*sin(angle));
 p=warp(p,t+s);
 p.y+=.17*sin(angle*2.+t)*uTurbulence;
 p.xz=rot(uVortex*p.y*2.)*p.xz;
 p*=mix(1.35,.8,uCompact);
 if(r.w>.84){
   // Five curved stream families. Each is a closed orbit; there is no respawn.
   float family=floor(r.x*5.);
   float d=family/5.*TAU+s+sin(family*7.3)*.37;
   float q=t+tube;
   float excursion=pow(.5+.5*sin(q),3.);
   float reach=1.+excursion*(2.9+1.8*(1.-uCompact))*uOuter.y;
   float spread=(fract(r.x*5.)-.5)*.09;
   float b=d+spread+uVortex*(.28*cos(q)+.2*sin(t+family));
   vec3 jet=vec3(cos(b)*reach,sin(b)*reach*.8,(r.z-.5)*1.2+sin(q)*.5);
   jet.xy+=vec2(sin(q*2.+d),cos(q+d))*.3;
   p=mix(p,jet,smoothstep(0.,.32,excursion)*uOuter.x);
 }
 p.xy=rot(.15*sin(t))*p.xy;
 p*=vec3(uForm.xy,uForm.z*uForm.w);
 p.xz=rot(uPrismaWarp.y*p.y)*p.xz;
 p+=uPrismaWarp.x*.4*vec3(sin(p.y*2.6+t),cos(p.z*3.+t),sin(p.x*3.4-t));
 p+=uPrismaWarp.z*.3*sin(p.yzx*uPrismaWarp.w+vec3(t,-t,t));
 p.xy=rot(uPrismaFrame.w)*p.xy;
 p.yz=rot(uPrismaRotation.y)*p.yz;
 p.xz=rot(uPrismaRotation.x)*p.xz;
 p.yz=rot(uView.y)*p.yz;
 p.xz=rot(uView.x)*p.xz;
 p*=uPrismaFrame.x;p.xy+=uPrismaFrame.yz;
 return p;
}
vec4 project(vec3 p){
 float depth=max(3.,7.5-p.z);
 return vec4(p.xy*vec2(uResolution.y/uResolution.x,1.)*2.6*uZoom/depth,(depth-3.)/12.,1.);
}
vec3 tint(vec4 r,vec3 p){
 float light=.4+.6*smoothstep(-1.8,1.8,p.z);
 return prismaPalette(p,mix(uLow,uHigh,.28+.72*r.z))*light*uExposure;
}
`;

const pointVert=`#version 300 es
precision highp float;
layout(location=0) in vec4 aRandom;
${pathGLSL}
out vec3 vColor;out vec3 vPosition;out float vOpacity;
void main(){
 vec3 p=particle(aRandom,uTime);
 gl_Position=project(p);
 float size=mix(.75,1.7,aRandom.z)*uResolution.y/720.;
 gl_PointSize=clamp(size*(1.+uGrain*.8)*uFinish.w,1.,24.);
 vColor=tint(aRandom,p);vPosition=p;
 float ridge=pow(.5+.5*sin(aRandom.y*TAU*5.+clockAt(uTime)*2.),5.);
 vOpacity=mix(.22,.6,uGrain)*(.4+ridge*2.8)*(aRandom.w>.84?mix(1.,.65,uOuter.x):1.);
}`;
const pointFrag=`#version 300 es
precision highp float;
in vec3 vColor;in vec3 vPosition;in float vOpacity;out vec4 color;
${prismaShadingGLSL}
void main(){vec2 xy=(gl_PointCoord-.5)*2.;float d=length(xy);if(d>1.)discard;
vec3 n=normalize(vec3(xy.x,-xy.y,sqrt(max(0.,1.-d*d))));
float a=exp(-d*d*3.)*vOpacity;color=vec4(shadeParticle(vColor,vPosition,n)*a,a);}`;

const lineVert=`#version 300 es
precision highp float;
layout(location=0) in vec4 aRandom;
layout(location=1) in float aAge;
${pathGLSL}
out vec3 vColor;out float vOpacity;
void main(){
 float span=mix(.003,.11,uTrail);
 vec3 p=particle(aRandom,uTime-aAge*span*uDirection);
 gl_Position=project(p);
 vColor=shadeParticle(tint(aRandom,p),p,normalize(p+vec3(0.,0.,1.5)));
 float family=floor(aRandom.x*5.);
 float beam=.18+2.5*pow(.5+.5*sin(clockAt(uTime)+family*2.3),9.);
 vOpacity=pow(1.-aAge,1.4)*mix(.08,.28,aRandom.z)*(aRandom.w>.84?mix(.22,beam,uOuter.x):.22);
}`;
const lineFrag=`#version 300 es
precision highp float;
in vec3 vColor;in float vOpacity;out vec4 color;
void main(){color=vec4(vColor*vOpacity,vOpacity);}`;
const screenVert=`#version 300 es
precision highp float;out vec2 uv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const blurFrag=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D uImage;uniform vec2 uStep;
void main(){vec3 c=texture(uImage,uv).rgb*.227027;
c+=texture(uImage,uv+uStep*1.384615).rgb*.316216;c+=texture(uImage,uv-uStep*1.384615).rgb*.316216;
c+=texture(uImage,uv+uStep*3.230769).rgb*.070270;c+=texture(uImage,uv-uStep*3.230769).rgb*.070270;
color=vec4(c,1.);}`;
const composeFrag=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D uImage,uBloom;uniform float uGlow;
uniform vec4 uGrade;uniform vec3 uBackground,uBackground2;uniform float uBgMode;
void main(){vec3 c=texture(uImage,uv).rgb;vec3 bloom=texture(uBloom,uv).rgb;
c+=bloom*uGlow*2.2;c=1.-exp(-c*1.7);
vec3 bg=mix(vec3(.006,.009,.016),vec3(.014,.025,.036),exp(-dot(uv-.5,uv-.5)*6.));
if(uBgMode>.5)bg=uBgMode<1.5?uBackground:mix(uBackground,uBackground2,uv.y);
c=pow(c,vec3(.82))+bg;c=(c*exp2(uGrade.x)+uGrade.y-.5)*uGrade.z+.5;
float grey=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(grey),c,uGrade.w);color=vec4(clamp(c,0.,1.),1.);}`;

export class PathfinderRenderer {
  constructor(canvas) {
    this.canvas=canvas;
    const gl=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    if(!gl)throw new Error('Serve un browser con WebGL2. Apri Prisma in Chrome o Edge.');
    this.float=!!gl.getExtension('EXT_color_buffer_float');
    this.points=this.program(pointVert,pointFrag);
    this.lines=this.program(lineVert,lineFrag);
    this.blur=this.program(screenVert,blurFrag);
    this.compose=this.program(screenVert,composeFrag);
    this.empty=gl.createVertexArray();
    this.targets=[];this.buffers=[];this.seed=null;this.width=0;this.height=0;
    const info=gl.getExtension('WEBGL_debug_renderer_info');
    this.device=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  }
  program(v,f){const gl=this.gl,program=gl.createProgram();for(const [type,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);gl.deleteShader(shader);}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));return {program,uniforms:new Map()};}
  uniform(p,key,...values){const gl=this.gl;if(!p.uniforms.has(key))p.uniforms.set(key,gl.getUniformLocation(p.program,key));const loc=p.uniforms.get(key);if(loc===null)return;gl['uniform'+values.length+'f'](loc,...values);}
  geometry(seed) {
    const gl=this.gl;
    for(const b of this.buffers)gl.deleteBuffer(b);this.buffers=[];
    if(this.pointVAO)gl.deleteVertexArray(this.pointVAO);if(this.lineVAO)gl.deleteVertexArray(this.lineVAO);
    const rng=randomSequence(seed),n=96000,random=new Float32Array(n*4);
    for(let i=0;i<random.length;i++)random[i]=rng();
    const upload=(data,index,size)=>{const b=gl.createBuffer();this.buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,0,0);};
    this.pointVAO=gl.createVertexArray();gl.bindVertexArray(this.pointVAO);upload(random,0,4);
    const tracks=2400,segments=80,vertices=tracks*segments*2;
    const trailRandom=new Float32Array(vertices*4),age=new Float32Array(vertices);
    for(let i=0;i<tracks;i++)for(let j=0;j<segments;j++)for(let k=0;k<2;k++){
      const index=(i*segments+j)*2+k;age[index]=(j+k)/segments;
      trailRandom.set(random.subarray(i*4,i*4+4),index*4);
      if(i%3===0)trailRandom[index*4+3]=.85+random[i*4+3]*.15;
    }
    this.lineVAO=gl.createVertexArray();gl.bindVertexArray(this.lineVAO);upload(trailRandom,0,4);upload(age,1,1);
    gl.bindVertexArray(null);this.seed=seed;this.maxPoints=n;this.tracks=tracks;this.segments=segments;
  }
  target(w,h) {const gl=this.gl,texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,this.float?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,this.float?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Buffer grafico non disponibile.');return {texture,fbo,w,h};}
  resize(w,h){if(this.width===w&&this.height===h)return;const gl=this.gl;for(const t of this.targets){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.fbo);}this.width=w;this.height=h;this.canvas.width=w;this.canvas.height=h;this.targets=[this.target(w,h),this.target(Math.ceil(w/4),Math.ceil(h/4)),this.target(Math.ceil(w/4),Math.ceil(h/4))];}
  bind(target){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,target?.fbo||null);gl.viewport(0,0,target?.w||this.width,target?.h||this.height);}
  tex(p,key,texture,unit){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(gl.getUniformLocation(p.program,key),unit);}
  settings(program,p,seconds){const gl=this.gl;gl.useProgram(program.program);const values={uTime:wrap(motionTime(seconds,p)/p.duration),uRhythm:p.rhythm,uPause:p.pause,uCompact:p.compactness,uOpening:p.opening,uTurbulence:p.turbulence,uVortex:p.vortex,uTrail:p.trails,uSeed:p.seed,uZoom:p.zoom,uExposure:p.exposure,uGrain:p.grain};for(const [k,v] of Object.entries(values))this.uniform(program,k,v);this.uniform(program,'uOuter',p.outerStrength??1,p.outerReach??1);this.uniform(program,'uView',p.yaw*Math.PI/180,p.pitch*Math.PI/180);this.uniform(program,'uResolution',this.width,this.height);this.uniform(program,'uLow',...palettes[p.palette].low);this.uniform(program,'uHigh',...palettes[p.palette].high);}
  prismaSettings(program,s){
    const gl=this.gl,rad=Math.PI/180,rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),loc=key=>gl.getUniformLocation(program.program,key);
    this.uniform(program,'uForm',s.stretchX,s.stretchY,s.stretchZ,s.volume);
    this.uniform(program,'uPrismaWarp',s.deform,s.twist,s.waves,s.waveScale);
    this.uniform(program,'uPrismaFrame',s.scale,s.positionX,s.positionY,s.rotateZ*rad);
    this.uniform(program,'uPrismaRotation',s.rotateY*rad,s.rotateX*rad);
    this.uniform(program,'uMaterial',s.metal,s.roughness,s.gloss,s.iridescence);
    this.uniform(program,'uFinish',s.emission,s.lighting,1-s.transparency,s.pointSize);
    this.uniform(program,'uEnvironment',environments.indexOf(s.environment),s.environmentAngle*rad,s.environmentPower,0);
    this.uniform(program,'uGradient',s.gradientAngle*rad,s.gradientScale,s.gradientOffset,+s.usePalette);
    gl.uniform1i(loc('uPaletteCount'),s.palette.length);
    gl.uniform3fv(loc('uPalette'),s.palette.flatMap(rgb));
    const lights=s.lights.filter(l=>l.enabled).slice(0,8);
    gl.uniform1i(loc('uLightCount'),lights.length);
    if(lights.length){gl.uniform4fv(loc('uLights'),lights.flatMap(l=>[l.x,l.y,l.z,l.power]));gl.uniform3fv(loc('uLightColors'),lights.flatMap(l=>rgb(l.color)));gl.uniform1fv(loc('uLightSizes'),lights.map(l=>l.size));}
  }
  render(p,seconds,w=this.width||1280,h=this.height||720){
    if(this.gl.isContextLost())throw new Error('La GPU è stata interrotta. Ricarica Prisma.');
    if(this.seed!==p.seed)this.geometry(p.seed);this.resize(w,h);
    const gl=this.gl,[scene,a,b]=this.targets;this.bind(scene);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
    const s=samplePrisma(p,seconds);
    this.settings(this.lines,p,seconds);this.prismaSettings(this.lines,s);this.uniform(this.lines,'uDirection',p.direction??1);gl.bindVertexArray(this.lineVAO);gl.drawArrays(gl.LINES,0,Math.floor(this.tracks*p.density/1.5)*this.segments*2);
    this.settings(this.points,p,seconds);this.prismaSettings(this.points,s);gl.bindVertexArray(this.pointVAO);gl.drawArrays(gl.POINTS,0,Math.round(this.maxPoints*p.density/1.5));
    gl.disable(gl.BLEND);gl.bindVertexArray(this.empty);gl.useProgram(this.blur.program);
    this.bind(a);this.tex(this.blur,'uImage',scene.texture,0);this.uniform(this.blur,'uStep',2/this.width,0);gl.drawArrays(gl.TRIANGLES,0,3);
    this.bind(b);this.tex(this.blur,'uImage',a.texture,0);this.uniform(this.blur,'uStep',0,1/a.h);gl.drawArrays(gl.TRIANGLES,0,3);
    this.bind(a);this.tex(this.blur,'uImage',b.texture,0);this.uniform(this.blur,'uStep',1/a.w,0);gl.drawArrays(gl.TRIANGLES,0,3);
    this.bind(null);gl.useProgram(this.compose.program);this.tex(this.compose,'uImage',scene.texture,0);this.tex(this.compose,'uBloom',a.texture,1);this.uniform(this.compose,'uGlow',p.glow);
    this.uniform(this.compose,'uGrade',s.exposure,s.brightness,s.contrast,s.saturation);
    const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    this.uniform(this.compose,'uBackground',...rgb(s.background));this.uniform(this.compose,'uBackground2',...rgb(s.background2));this.uniform(this.compose,'uBgMode',['original','solid','gradient'].indexOf(s.bgMode));gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindVertexArray(null);
  }
  pixels(){const a=new Uint8Array(this.width*this.height*4);this.gl.readPixels(0,0,this.width,this.height,this.gl.RGBA,this.gl.UNSIGNED_BYTE,a);return a;}
  dispose(){const gl=this.gl;for(const t of this.targets){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.fbo);}for(const b of this.buffers)gl.deleteBuffer(b);for(const p of [this.points,this.lines,this.blur,this.compose])gl.deleteProgram(p.program);gl.deleteVertexArray(this.pointVAO);gl.deleteVertexArray(this.lineVAO);gl.deleteVertexArray(this.empty);}
}
