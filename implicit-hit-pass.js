// Exact primary intersections, isolated from lighting and refraction shaders.
// Marching, root refinement and normal differences share one field callsite;
// the driver never has to inline the complete procedural form at each stage.
export const IMPLICIT_HIT_MAIN=`
uniform vec4 uHitBudget;
uniform vec2 uHitJitter;
uniform sampler2D uHitPrevious;
uniform float uHitContinue;
uniform int uHitCount;
layout(location=1) out vec4 hitLayer1;
layout(location=2) out vec4 hitLayer2;
layout(location=3) out vec4 hitLayer3;
void main(){
 vec4 hits[4];for(int i=0;i<4;i++)hits[i]=vec4(0.,0.,1.,-1.);
 vec2 originalUV=(gl_FragCoord.xy+uHitJitter-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;
 vec2 uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);
 vec3 origin=vec3(uv,4.8),direction=vec3(0.,0.,-1.);
 vec2 interval=objectInterval(origin,direction);
 float t=max(0.,interval.x),end=min(40.,interval.y),epsilon=uHitBudget.z;
 float previousT=t,previousD=0.,a=t,b=t,da=0.,db=0.,hitT=t,hitD=0.,rejectUntil=-1.,closest=10.;
 bool awaitExit=false,sawInside=false;
 if(uHitContinue>.5){float last=texelFetch(uHitPrevious,ivec2(gl_FragCoord.xy),0).w;if(last<0.)t=end+1.;else{t=max(t,last+epsilon*.5);awaitExit=true;}}
 vec3 samplePoint=origin+direction*t,gradient=vec3(0.),entryNormal=vec3(0.,0.,1.);
 int mode=0,refinement=0,normalSample=0,layer=0;
 bool previousValid=false;
 for(int step=0;step<int(uHitBudget.x);step++){
  if(t>end||layer>=uHitCount)break;
#ifdef WEAVE_HIT_TAG
  weaveSurface=vec3(0.);weaveFacing=0.;weaveContactShade=0.;
  weaveEvaluateMaterial=mode==3;
#endif
  float distance=field(samplePoint);
  if(mode==0){
   closest=min(closest,abs(distance));
   if(awaitExit){
    if(distance<-epsilon*.1)sawInside=true;
    if(sawInside&&distance>epsilon*.1){awaitExit=false;previousValid=false;}
    else{t+=clamp(abs(distance)*uHitBudget.y,epsilon*.6,.12*uFrame.x);samplePoint=origin+direction*t;continue;}
   }
   if(previousValid&&previousD*distance<0.){
    if(previousD<0.){t+=epsilon*8.;rejectUntil=t+epsilon*3.;previousValid=false;samplePoint=origin+direction*t;continue;}
    a=previousT;b=t;da=previousD;db=distance;refinement=0;mode=1;
    t=.5*(a+b);samplePoint=origin+direction*t;continue;
   }
   if(abs(distance)<epsilon&&t>rejectUntil){
    hitT=t;hitD=distance;gradient=vec3(0.);normalSample=0;mode=2;
    samplePoint=origin+direction*hitT+vec3(uHitBudget.w,0.,0.);continue;
   }
   previousT=t;previousD=distance;previousValid=true;
   t+=clamp(abs(distance)*uHitBudget.y,epsilon*.6,.12*uFrame.x);
   samplePoint=origin+direction*t;
  }else if(mode==1){
   if(da*distance<=0.){b=t;db=distance;}else{a=t;da=distance;}
   refinement++;
   if(refinement>=9||b-a<epsilon){
    hitT=mix(a,b,clamp(da/(da-db),0.,1.));hitD=0.;t=hitT;
    gradient=vec3(0.);normalSample=0;mode=2;
    samplePoint=origin+direction*hitT+vec3(uHitBudget.w,0.,0.);
   }else{t=.5*(a+b);samplePoint=origin+direction*t;}
  }else if(mode==2){
   int axis=normalSample/2;float sign=normalSample%2==0?1.:-1.;
   gradient[axis]+=distance*sign;normalSample++;
   if(normalSample>=6){
    vec3 normal=length(gradient)>.00000001?normalize(gradient):vec3(0.,0.,1.);
    if(dot(normal,direction)<0.){
     float derivative=max(.002,-dot(gradient,direction)/(2.*uHitBudget.w));
     float correction=max(0.,hitD)/derivative;hitT+=correction;entryNormal=normal;
     t=hitT+clamp(epsilon*2./derivative,epsilon*8.,.02*uFrame.x);mode=3;
     samplePoint=origin+direction*t;
    }else{t=hitT+epsilon*8.;rejectUntil=t+epsilon*3.;previousValid=false;mode=0;samplePoint=origin+direction*t;}
   }else{
    vec3 offset=vec3(0.);offset[normalSample/2]=(normalSample%2==0?1.:-1.)*uHitBudget.w;
    samplePoint=origin+direction*hitT+offset;
   }
  }else{
   // A near-zero distance alone is insufficient: a shallow field can stay
   // in that tolerance band for many steps on the same sheet. Confirm an
   // actual interior, then ignore all candidates until its next exit.
   if(distance<-epsilon*.1){
#ifdef WEAVE_HIT_TAG
    // Entry normals face the camera. Store their octahedral coordinates
    // beside a 4-bit surface tag and two 10-bit material coordinates.
    vec2 oct=entryNormal.xy/dot(abs(entryNormal),vec3(1.));
    vec2 terminal=floor(weaveSurface.yz*1023.+.5);
    float packed=weaveSurface.x*1048576.+terminal.x*1024.+terminal.y;
    // An optional 8-bit silk coverage shares a float with a 16-bit
    // normal coordinate. The remaining material coordinates stay intact.
    if(weaveFacing>.002)oct.x=2.+floor((oct.x*.5+.5)*65535.+.5)+65536.*floor(254.*clamp(weaveFacing,0.,1.)+.5);
    if(weaveContactShade>.002)oct.y=2.+floor((oct.y*.5+.5)*65535.+.5)+65536.*floor(254.*clamp(weaveContactShade,0.,1.)+.5);
    hits[layer]=vec4(oct,packed,hitT);
#else
    hits[layer]=vec4(entryNormal,hitT);
#endif
    layer++;awaitExit=true;sawInside=true;
   }
   rejectUntil=t+epsilon*3.;previousValid=false;mode=0;samplePoint=origin+direction*t;
  }
 }
 if(hits[0].w<0.)hits[0].w=-1.-closest;
 fragColor=hits[0];hitLayer1=hits[1];hitLayer2=hits[2];hitLayer3=hits[3];
}
`;

// Opaque fractal intersections use true sign brackets, including an inside
// camera, and retain the marching state until every primary ray is complete.
export const FRACTAL_HIT_MAIN=`
uniform vec4 uHitBudget;
uniform vec2 uHitJitter;
uniform sampler2D uHitPrevious,uHitStatePrevious;
uniform float uHitContinue;
uniform int uHitCount;
layout(location=1) out vec4 hitLayer1;
layout(location=2) out vec4 hitLayer2;
layout(location=3) out vec4 hitLayer3;
void main(){
 vec4 result=vec4(0.,0.,1.,-1.);
 vec2 originalUV=(gl_FragCoord.xy+uHitJitter-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;
 vec2 uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);
 vec3 origin=vec3(uv,4.8),direction=vec3(0.,0.,-1.);
 vec2 interval=objectInterval(origin,direction);
 float t=max(0.,interval.x),end=min(40.,interval.y),a=t,b=t,da=0.,db=0.,hitT=t,closest=10.;
 vec3 gradient=vec3(0.);
 int mode=0,refinement=0,normalSample=0;bool previousValid=false;

 if(uHitContinue>.5){
  vec4 previous=texelFetch(uHitPrevious,ivec2(gl_FragCoord.xy),0);
  if(previous.w>-100.){fragColor=previous;hitLayer1=texelFetch(uHitStatePrevious,ivec2(gl_FragCoord.xy),0);hitLayer2=vec4(1.,1.,1.,-1.);hitLayer3=vec4(0.);return;}
  vec4 carry=texelFetch(uHitStatePrevious,ivec2(gl_FragCoord.xy),0);
  t=carry.x;a=carry.y;da=carry.z;closest=carry.w;previousValid=true;
 }
 vec3 samplePoint=origin+direction*t;int used=0;
 // Finish a bracket/normal once started, then yield only between ray steps.
 for(int step=0;step<int(uHitBudget.x)+32;step++){
  if(step>=int(uHitBudget.x)&&mode==0)break;used=step+1;
  if(t>end)break;
  float d=field(samplePoint);
  if(mode==0){
   closest=min(closest,abs(d));
   if(previousValid&&da*d<=0.&&da!=0.){b=t;db=d;mode=1;refinement=0;t=.5*(a+b);samplePoint=origin+direction*t;continue;}
   a=t;da=d;previousValid=true;
   // The next representable travel grows with distance, particularly when
   // the camera is inside a magnified structure. A fixed minimum can stall.
   t+=clamp(abs(d)*uHitBudget.y,max(.00000035,abs(t)*.00000013),.02*uFrame.x);
   samplePoint=origin+direction*t;
  }else if(mode==1){
   if(da*d<=0.){b=t;db=d;}else{a=t;da=d;}
   float next=.5*(a+b);refinement++;
   if(refinement>=20||next==a||next==b){
    hitT=mix(a,b,clamp(da/(da-db),0.,1.));t=hitT;
    gradient=vec3(0.);normalSample=0;mode=2;
    samplePoint=origin+direction*hitT+vec3(uHitBudget.w,0.,0.);
   }else{t=next;samplePoint=origin+direction*t;}
  }else{
   gradient[normalSample/2]+=d*(normalSample%2==0?1.:-1.);normalSample++;
   if(normalSample>=6){result=vec4(length(gradient)>.00000001?normalize(gradient):vec3(0.,0.,1.),hitT);break;}
   vec3 offset=vec3(0.);offset[normalSample/2]=(normalSample%2==0?1.:-1.)*uHitBudget.w;
   samplePoint=origin+direction*hitT+offset;
  }
 }

 bool pending=result.w<0.&&t<=end;
 if(result.w<0.)result.w=pending?-101.:-1.-closest;
 fragColor=result;hitLayer1=vec4(t,a,da,closest);
 hitLayer2=vec4(1.,1.,1.,pending?-101.:-1.);hitLayer3=vec4(float(used),float(mode),end-t,float(pending));
}`;

const VERTEX=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;

export class ImplicitHitPass{
 constructor(gl,source){
  this.gl=gl;this.source=source.replace(/(?:layout\s*\(\s*location\s*=\s*0\s*\)\s*)?out vec4 fragColor;/,'layout(location=0) out vec4 fragColor;');this.extension=gl.getExtension('KHR_parallel_shader_compile');
  if(!gl.getExtension('EXT_color_buffer_float'))throw new Error('Le superfici esatte richiedono destinazioni colore in virgola mobile.');
  const shader=(kind,text)=>{const handle=gl.createShader(kind);gl.shaderSource(handle,text);gl.compileShader(handle);return handle;};
  this.vertex=shader(gl.VERTEX_SHADER,VERTEX);this.fragment=shader(gl.FRAGMENT_SHADER,this.source);this.program=gl.createProgram();
  gl.attachShader(this.program,this.vertex);gl.attachShader(this.program,this.fragment);gl.linkProgram(this.program);
  this.vao=gl.createVertexArray();this.banks=[{framebuffer:gl.createFramebuffer(),textures:[],width:0,height:0},{framebuffer:gl.createFramebuffer(),textures:[],width:0,height:0}];
  this.framebuffer=this.banks[0].framebuffer;this.textures=this.banks[0].textures;this.width=0;this.height=0;
 }
 ready(){
  const g=this.gl;if(this.locations)return true;
  if(this.extension&&!g.getProgramParameter(this.program,this.extension.COMPLETION_STATUS_KHR))return false;
  for(const shader of [this.vertex,this.fragment])if(!g.getShaderParameter(shader,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(shader)||'Preparazione della superficie non riuscita.');
  if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(this.program)||'Preparazione della superficie non riuscita.');
  this.locations={};for(let i=0;i<g.getProgramParameter(this.program,g.ACTIVE_UNIFORMS);i++){const uniform=g.getActiveUniform(this.program,i);this.locations[uniform.name.replace('[0]','')]=g.getUniformLocation(this.program,uniform.name);}
  g.deleteShader(this.vertex);g.deleteShader(this.fragment);this.vertex=null;this.fragment=null;return true;
 }
 async prepare(options={}){
  while(!this.ready()){if(options.cancelled?.())return false;if(this.gl.isContextLost())throw new Error('La grafica è temporaneamente sospesa.');await new Promise(resolve=>setTimeout(resolve,16));}return true;
 }
 draw(width,height,{upload,budget=1600,safety=.42,epsilon=.00004,normalOffset=.00024,featureSize=Infinity,jitter=[0,0],startTexture=null,maxLayers=4}={}){
  if(!this.ready())return false;
  // Normal differences and the confirming interior probe must fit inside
  // the smallest sheet. Otherwise a compressed membrane is sampled only
  // on its two outside faces and a valid entry is discarded.
  if(Number.isFinite(featureSize)&&featureSize>0){epsilon=Math.min(epsilon,Math.max(.0000006,featureSize*.04));normalOffset=Math.min(normalOffset,Math.max(.0000012,featureSize*.35));}
  const g=this.gl,previous={framebuffer:g.getParameter(g.DRAW_FRAMEBUFFER_BINDING),program:g.getParameter(g.CURRENT_PROGRAM),vao:g.getParameter(g.VERTEX_ARRAY_BINDING),viewport:g.getParameter(g.VIEWPORT),active:g.getParameter(g.ACTIVE_TEXTURE),blend:g.isEnabled(g.BLEND),scissor:g.isEnabled(g.SCISSOR_TEST),dither:g.isEnabled(g.DITHER)};
  const bank=this.banks[startTexture&&this.banks[0].textures.includes(startTexture)?1:0];
  if(!bank.framebuffer)bank.framebuffer=g.createFramebuffer();
  this.framebuffer=bank.framebuffer;this.textures=bank.textures;
  try{
   g.bindFramebuffer(g.DRAW_FRAMEBUFFER,this.framebuffer);g.activeTexture(g.TEXTURE0);
   if(width!==bank.width||height!==bank.height){
    for(const texture of this.textures)g.deleteTexture(texture);this.textures=[];
    for(let layer=0;layer<4;layer++){
     const texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,texture);g.texStorage2D(g.TEXTURE_2D,1,g.RGBA32F,width,height);
     g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
     g.framebufferTexture2D(g.DRAW_FRAMEBUFFER,g.COLOR_ATTACHMENT0+layer,g.TEXTURE_2D,texture,0);this.textures.push(texture);
    }
    bank.width=width;bank.height=height;bank.textures=this.textures;
   }
   this.width=width;this.height=height;
   g.drawBuffers([g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1,g.COLOR_ATTACHMENT2,g.COLOR_ATTACHMENT3]);
   if(g.checkFramebufferStatus(g.DRAW_FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw new Error('Impossibile preparare gli strati della superficie.');
   g.viewport(0,0,width,height);g.disable(g.SCISSOR_TEST);g.disable(g.BLEND);g.disable(g.DITHER);g.bindVertexArray(this.vao);g.useProgram(this.program);
   upload?.(g,this.locations,this.program);
   g.uniform4fv(this.locations.uHitBudget,[budget,safety,epsilon,normalOffset]);g.uniform2fv(this.locations.uHitJitter,jitter);
   g.uniform1i(this.locations.uHitCount,Math.max(1,Math.min(4,Math.round(maxLayers))));
   g.activeTexture(g.TEXTURE13);
   if(!startTexture&&!this.emptyTexture){this.emptyTexture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.emptyTexture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA32F,1,1,0,g.RGBA,g.FLOAT,new Float32Array([0,0,1,-1]));g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);}
   g.bindTexture(g.TEXTURE_2D,startTexture||this.emptyTexture);g.uniform1i(this.locations.uHitPrevious,13);g.uniform1f(this.locations.uHitContinue,startTexture?1:0);g.activeTexture(g.TEXTURE0);
   g.drawArrays(g.TRIANGLES,0,3);return {textures:this.textures,width,height,layers:4};
  }finally{
   g.bindFramebuffer(g.DRAW_FRAMEBUFFER,previous.framebuffer);g.viewport(...previous.viewport);g.bindVertexArray(previous.vao);g.useProgram(previous.program);g.activeTexture(previous.active);
   for(const key of ['blend','scissor','dither'])g[previous[key]?'enable':'disable'](g[key.toUpperCase()==='SCISSOR'?'SCISSOR_TEST':key.toUpperCase()]);
  }
 }
 releaseTargets(){
  const g=this.gl;for(const bank of this.banks){for(const texture of bank.textures)g.deleteTexture(texture);if(bank.framebuffer)g.deleteFramebuffer(bank.framebuffer);bank.textures=[];bank.framebuffer=null;bank.width=0;bank.height=0;}
  if(this.emptyTexture)g.deleteTexture(this.emptyTexture);this.emptyTexture=null;this.framebuffer=null;this.textures=[];this.width=0;this.height=0;
 }
 dispose(){const g=this.gl;this.releaseTargets();if(this.vertex)g.deleteShader(this.vertex);if(this.fragment)g.deleteShader(this.fragment);g.deleteProgram(this.program);g.deleteVertexArray(this.vao);this.banks=[];}
}
