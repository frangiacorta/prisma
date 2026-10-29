import {packPathCurves,PATH_SAMPLES} from './particle-paths.js?v=38e810dd65ce';

export const guideGLSL=`
uniform highp sampler2D uGuideCurves,uGuideMap;
uniform highp int uGuideCount,uGuideSamples,uGuidePasses;uniform bool uGuideBaked;
uniform vec2 uGuideScreenSize;uniform float uGuideDrawPass;
uniform vec4 uGuideBounds[4],uGuideA[4],uGuideB[4],uGuideC[4],uGuideD[4];
vec4 guideCurve(int row,float progress){
 bool closed=uGuideC[row].w>.5;float f=(closed?fract(progress):clamp(progress,0.,1.))*(closed?128.:127.);
 int i=int(floor(f)),j=closed?(i+1)%128:min(i+1,127);float t=fract(f);
 vec4 a=texelFetch(uGuideCurves,ivec2(i,row),0),b=texelFetch(uGuideCurves,ivec2(j,row),0);
 float t2=t*t,t3=t2*t;
 vec2 p=(2.*t3-3.*t2+1.)*a.xy+(t3-2.*t2+t)*a.zw+(-2.*t3+3.*t2)*b.xy+(t3-t2)*b.zw;
 vec2 tangent=(6.*t2-6.*t)*a.xy+(3.*t2-4.*t+1.)*a.zw+(-6.*t2+6.*t)*b.xy+(3.*t2-2.*t)*b.zw;
 return vec4(p,normalize(tangent+vec2(.0000001,0.)));
}
vec4 nearestGuide(int row,vec2 p){
 if(uGuideBaked){
  vec4 box=uGuideBounds[row];vec2 uv=clamp((p-box.xy)/box.zw,0.,1.),at=uv*256.-.5;ivec2 i=ivec2(floor(at));vec2 f=fract(at);
  ivec2 a=clamp(i,ivec2(0),ivec2(255)),b=clamp(i+1,ivec2(0),ivec2(255));int y=row*256;
  return mix(mix(texelFetch(uGuideMap,ivec2(a.x,a.y+y),0),texelFetch(uGuideMap,ivec2(b.x,a.y+y),0),f.x),mix(texelFetch(uGuideMap,ivec2(a.x,b.y+y),0),texelFetch(uGuideMap,ivec2(b.x,b.y+y),0),f.x),f.y);
 }
 // Same behavior on GPUs without floating point render targets; slower fallback.
 vec4 best=vec4(0.,0.,0.,1e10);bool closed=uGuideC[row].w>.5,inside=false;
 for(int j=0;j<uGuideSamples;j++){if(!closed&&j==127)break;vec2 a=texelFetch(uGuideCurves,ivec2(j,row),0).xy,b=texelFetch(uGuideCurves,ivec2((j+1)%128,row),0).xy;
  if((a.y>p.y)!=(b.y>p.y))if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  vec2 v=b-a;float t=clamp(dot(p-a,v)/max(dot(v,v),1e-9),0.,1.);vec2 q=a+v*t;float d=length(p-q);if(d<best.w)best=vec4(q,(float(j)+t)/(closed?128.:127.),d);
 }if(uGuideD[row].z>1.5&&closed&&inside)best.w=-best.w;return best;
}
float guideHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float guideParticipation(int i,vec4 r,float phase){
 vec4 a=uGuideA[i],b=uGuideB[i],c=uGuideC[i],d=uGuideD[i];
 if(a.y<=0.||guideHash(r.xy+vec2(d.w*.017,4.13))>=a.x||c.y>=.99999)return 0.;
 if(c.y<=0.)return 1.;float h=guideHash(r.xy+vec2(d.w*.031,8.71));
 float edge=c.y*.5,feather=max(.00001,min(min(edge,(1.-c.y)*.5),.005+.12*c.z));
 return smoothstep(edge-feather,edge+feather,abs(fract(phase*b.w+h+d.y)-.5));
}
vec3 guideDestination(int i,vec4 r,float phase){
 vec4 a=uGuideA[i],b=uGuideB[i],c=uGuideC[i],d=uGuideD[i];
 float h=guideHash(r.xy+vec2(d.w*.031,8.71)),progress=phase*b.w*d.x+h+d.y;
 float u=c.w>.5?fract(progress):.5-.5*cos(6.28318530718*progress);
 vec4 curve=guideCurve(i,u);vec3 normal=vec3(-curve.w,curve.z,0.);
 float angle=6.28318530718*(phase*c.x+h+d.y);
 vec3 satellite=(normal*cos(angle)+vec3(0.,0.,sin(angle)))*b.z;
 vec3 freedom=(normal*sin(6.28318530718*(phase*b.w+h*3.))+vec3(0.,0.,cos(6.28318530718*(phase+h*7.))))*(1.-b.x)*min(a.z*.45,.8);
 return vec3(curve.xy,a.w)+satellite+freedom;
}
vec3 lockGuidePosition(vec3 p,vec4 r,float phase){
 // First eligible maximum-strength guide owns the particle; competing routes
 // are not averaged into a position that belongs to neither of them.
 for(int i=0;i<uGuideCount;i++){if(uGuideD[i].z>.5||uGuideA[i].y<2.99999)continue;
  float participation=guideParticipation(i,r,phase);if(participation>0.)return mix(p,guideDestination(i,r,phase),participation);
 }return p;
}
float guideCore(int i,vec4 r,float phase){return uGuideD[i].z>.5&&uGuideD[i].z<1.5?uGuideA[i].z*smoothstep(1.2,3.,uGuideA[i].y)*guideParticipation(i,r,phase):0.;}
float perimeterDistance(int i,vec2 p){
 vec4 box=uGuideBounds[i];vec2 uv=(p-box.xy)/box.zw;vec4 near=nearestGuide(i,p);
 return any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))?length(p-near.xy):near.w;
}
vec2 perimeterPlane(vec3 p,int i){return p.xy*(7.5-uGuideA[i].w)/max(2.,7.5-p.z);}
bool outsideGuidePerimeter(vec3 p,vec4 r,float phase){
 for(int i=0;i<uGuideCount;i++){if(uGuideD[i].z<1.5||uGuideC[i].w<.5||uGuideA[i].y<2.99999||guideParticipation(i,r,phase)<.99999)continue;
  if(perimeterDistance(i,perimeterPlane(p,i))>0.)return true;
 }return false;
}
// The perimeter is a boundary in the view, extruded through depth along camera rays.
// Test actual fragments as well as centers, so large sprites and thick ribbons cannot leak.
vec3 guidePixelPosition(vec2 pixel,vec3 world){
 if(uGuideDrawPass>.5)return world;
 return vec3((pixel/uGuideScreenSize*2.-1.)*vec2(uGuideScreenSize.x/uGuideScreenSize.y,1.)*max(2.,7.5-world.z)/2.6,world.z);
}
bool outsideGuidePixel(vec2 pixel,vec3 world,vec4 r,float phase){
 if(uGuideDrawPass>.5)return outsideGuidePerimeter(world,r,phase);
 for(int i=0;i<uGuideCount;i++){if(uGuideD[i].z<1.5||uGuideC[i].w<.5||uGuideA[i].y<2.99999||guideParticipation(i,r,phase)<.99999)continue;
  vec2 p=(pixel/uGuideScreenSize*2.-1.)*vec2(uGuideScreenSize.x/uGuideScreenSize.y,1.)*(7.5-uGuideA[i].w)/2.6;
  if(perimeterDistance(i,p)>0.)return true;
 }return false;
}
vec3 containGuidePosition(vec3 p,vec4 r,float phase){
 for(int pass=0;pass<uGuidePasses;pass++)for(int i=0;i<uGuideCount;i++){if(uGuideD[i].z<1.5||uGuideC[i].w<.5)continue;
  float gain=smoothstep(0.,3.,uGuideA[i].y)*guideParticipation(i,r,phase);if(gain<=0.)continue;
  vec2 plane=perimeterPlane(p,i);if(perimeterDistance(i,plane)<=0.)continue;
  vec4 near=nearestGuide(i,plane),curve=guideCurve(i,near.z);vec2 n=vec2(-curve.w,curve.z);
  float pad=uGuideBaked?length(uGuideBounds[i].zw)/256.*1.5:.002;
  if(perimeterDistance(i,near.xy+n*pad)>0.)n=-n;
  vec2 target=near.xy+n*pad;
  p.xy=mix(p.xy,target*max(2.,7.5-p.z)/(7.5-uGuideA[i].w),pass==0?gain:step(.99999,gain));
 }return p;
}
float guideClearance(int i,vec2 p){
 vec4 box=uGuideBounds[i];vec2 uv=(p-box.xy)/box.zw;
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return 1e10;
 // Distance is 1-Lipschitz. Subtract one atlas cell diagonal to obtain a
 // conservative lower bound even around intersections and sharp bends.
 return max(0.,nearestGuide(i,p).w-(uGuideBaked?length(box.zw)/256.:0.));
}
bool insideGuideCore(vec3 p,vec4 r,float phase){
 for(int i=0;i<uGuideCount;i++){float core=guideCore(i,r,phase);if(core<=0.)continue;
  if(length(vec2(guideClearance(i,p.xy),p.z-uGuideA[i].w))<core*.99999)return true;
 }return false;
}
vec3 excludeGuideCores(vec3 p,vec4 r,float phase){
 for(int pass=0;pass<uGuidePasses-1;pass++)for(int i=0;i<4;i++){
  if(i>=uGuideCount)break;float core=guideCore(i,r,phase);if(core<=0.)continue;
  float xy=guideClearance(i,p.xy);if(length(vec2(xy,p.z-uGuideA[i].w))>=core)continue;
  vec4 near=nearestGuide(i,p.xy);vec3 center=vec3(near.xy,uGuideA[i].w),away=p-center;
  float len=length(away),padding=uGuideBaked?length(uGuideBounds[i].zw)/256.:0.;
  vec3 normal=len>.00001?away/len:vec3(0.,0.,1.);
  p=center+normal*(core+padding+.00002);
 }
 // Curves lie in editable parallel depth planes. Exiting along depth preserves
 // longitudinal motion and cannot be trapped between overlapping path tubes.
 float upper=p.z,lower=p.z;bool inside=false;
 for(int i=0;i<uGuideCount;i++){float core=guideCore(i,r,phase);if(core<=0.)continue;
  float xy=guideClearance(i,p.xy);if(xy>=core)continue;float dz=sqrt(max(0.,core*core-xy*xy))+.00002;
  float z=uGuideA[i].w;upper=max(upper,z+dz);lower=min(lower,z-dz);if(abs(p.z-z)<dz)inside=true;
 }
 if(inside)p.z=(upper-p.z<=p.z-lower)?upper:lower;return p;
}
vec3 guidePosition(vec3 base,vec4 r,float phase){
 vec3 change=vec3(0.);float total=0.;
 for(int i=0;i<uGuideCount;i++){
  vec4 a=uGuideA[i],b=uGuideB[i],c=uGuideC[i],d=uGuideD[i],box=uGuideBounds[i];
  if(d.z>1.5)continue;
  if(guideHash(r.xy+vec2(d.w*.017,4.13))>=a.x||a.y<=0.)continue;
  vec2 uv=(base.xy-box.xy)/box.zw;if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))continue;
  vec4 near=nearestGuide(i,base.xy);float distance=length(vec2(near.w,base.z-a.w));
  float weight=1.-smoothstep(a.z*(1.-.85*c.z),a.z,distance);
  float h=guideHash(r.xy+vec2(d.w*.031,8.71));
  if(c.y>=.99999)weight=0.;else if(c.y>0.){float edge=c.y*.5,feather=max(.00001,min(min(edge,(1.-c.y)*.5),.005+.12*c.z));weight*=smoothstep(edge-feather,edge+feather,abs(fract(phase*b.w+h+d.y)-.5));}
  if(weight<.00001)continue;
  float gain=(1.-exp(-a.y*2.))*weight;vec3 delta;
  if(d.z>.5){
   vec3 away=base-vec3(near.xy,a.w);vec2 tangent=guideCurve(i,near.z).zw;
   vec3 normal=length(away)<.0001?vec3(-tangent.y,tangent.x,0.)*(h<.5?-1.:1.):normalize(away);
   delta=normal*(a.z-distance+.02)*a.y;
  }else{
   float progress=phase*b.w*d.x+h+d.y;float u=c.w>.5?fract(progress):.5-.5*cos(6.28318530718*progress);
   vec4 curve=guideCurve(i,u);vec3 normal=vec3(-curve.w,curve.z,0.);
   float angle=6.28318530718*(phase*c.x+h+d.y);
   vec3 satellite=(normal*cos(angle)+vec3(0.,0.,sin(angle)))*b.z;
   vec3 freedom=(normal*sin(6.28318530718*(phase*b.w+h*3.))+vec3(0.,0.,cos(6.28318530718*(phase+h*7.))))*(1.-b.x)*min(a.z*.45,.8);
   delta=vec3(curve.xy,a.w)+satellite+freedom-base;
  }
  change+=delta*gain;total+=gain;
 }
 vec3 p=base+change/max(1.,total);
 for(int i=0;i<uGuideCount;i++){if(uGuideD[i].z>.5)continue;
  float lock=smoothstep(2.4,3.,uGuideA[i].y)*guideParticipation(i,r,phase);
  if(lock>0.)return mix(p,guideDestination(i,r,phase),lock);
 }return p;
}
`;
const vertex=`#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;precision highp sampler2D;
uniform sampler2D uCurve;uniform int uRow;uniform bool uClosed,uContain;uniform vec4 uBounds;out vec4 color;
void main(){vec2 p=uBounds.xy+(gl_FragCoord.xy-vec2(0.,float(uRow)*256.))/256.*uBounds.zw;vec4 best=vec4(0.,0.,0.,1e10);
 bool inside=false;for(int i=0;i<128;i++){if(!uClosed&&i==127)break;vec2 a=texelFetch(uCurve,ivec2(i,uRow),0).xy,b=texelFetch(uCurve,ivec2((i+1)%128,uRow),0).xy,v=b-a;
  if((a.y>p.y)!=(b.y>p.y))if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  float t=clamp(dot(p-a,v)/max(dot(v,v),1e-9),0.,1.);vec2 q=a+v*t;float d=length(p-q);if(d<best.w)best=vec4(q,(float(i)+t)/(uClosed?128.:127.),d);
 }if(uContain&&uClosed&&inside)best.w=-best.w;color=best;}`;

// A distance atlas is rebuilt only when a guide's geometry/influence changes.
// Every particle and every fibre sample then uses four texture reads, not 128 segments.
export class GuideField{
 constructor(renderer){this.r=renderer;this.gl=renderer.gl;this.key=null;this.paths=[];this.bounds=[];this.program=renderer.float?renderer.program(vertex,fragment):null;}
 update(state){
  const paths=(state.forcePaths||[]).filter(p=>p.enabled&&p.points?.length>=2).slice(0,4);this.paths=paths;
  const key=JSON.stringify(paths.map(p=>[p.points,p.closed,p.radius,p.mode]));if(this.key===key)return;this.key=key;
  const r=this.r,gl=this.gl,{data,bounds}=packPathCurves(paths);this.bounds=bounds;
  if(!this.curves)this.curves=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.curves);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,PATH_SAMPLES,4,0,gl.RGBA,gl.FLOAT,data);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);
  if(!this.program||!paths.length)return;
  if(!this.atlas)this.atlas=r.target(256,1024);gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,this.atlas.texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,256,1024,0,gl.RGBA,gl.FLOAT,null);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.atlas.fbo);gl.disable(gl.BLEND);gl.bindVertexArray(r.empty);gl.useProgram(this.program.program);r.tex(this.program,'uCurve',this.curves,4);
  paths.forEach((p,i)=>{gl.viewport(0,i*256,256,256);gl.uniform1i(r.loc(this.program,'uRow'),i);gl.uniform1i(r.loc(this.program,'uClosed'),p.closed?1:0);gl.uniform1i(r.loc(this.program,'uContain'),p.mode==='contain'?1:0);r.u(this.program,'uBounds',...bounds[i]);gl.drawArrays(gl.TRIANGLES,0,3);});
 }
 bind(program){
  const r=this.r,gl=this.gl,ps=this.paths;gl.uniform1i(r.loc(program,'uGuideCount'),ps.length);gl.uniform1i(r.loc(program,'uGuideSamples'),PATH_SAMPLES);gl.uniform1i(r.loc(program,'uGuidePasses'),3);gl.uniform1i(r.loc(program,'uGuideBaked'),this.program?1:0);
  // Bind distinct units even with no guides: active sampler types must be valid.
  r.tex(program,'uGuideCurves',this.curves,4);r.tex(program,'uGuideMap',this.atlas?.texture||this.curves,5);
  if(!ps.length)return;gl.uniform4fv(r.loc(program,'uGuideBounds'),this.bounds.flat());
  gl.uniform4fv(r.loc(program,'uGuideA'),ps.flatMap(p=>[p.coverage/100,p.strength,p.radius,p.z]));
  gl.uniform4fv(r.loc(program,'uGuideB'),ps.flatMap(p=>[p.adherence,0,p.orbitRadius,p.cycles]));
  gl.uniform4fv(r.loc(program,'uGuideC'),ps.flatMap(p=>[p.orbitTurns,p.release/100,p.softness,p.closed?1:0]));
  gl.uniform4fv(r.loc(program,'uGuideD'),ps.flatMap(p=>[p.direction,p.phase,p.mode==='contain'?2:p.mode==='avoid'?1:0,p.id]));
 }
 dispose(){const gl=this.gl;if(this.curves)gl.deleteTexture(this.curves);if(this.atlas){gl.deleteTexture(this.atlas.texture);gl.deleteFramebuffer(this.atlas.fbo);}if(this.program)gl.deleteProgram(this.program.program);}
}
