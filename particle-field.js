// Analytic periodic fields, not an accumulating particle simulation: any frame is seekable.
import {guideGLSL} from './particle-path-field.js?v=87dc341942b4';
import {forceBarrierGLSL} from './particle-forces.js?v=87dc341942b4';
export const fieldGLSL=`
${guideGLSL}
${forceBarrierGLSL}
const float TAU=6.28318530718;
uniform float uPhase,uSeed,uBreath,uPoleRadius,uPoleField;
uniform vec2 uResolution;
uniform vec4 uShape,uStructure,uNoise,uFlow,uDynamics,uPoles,uOuter,uClock,uPoints,uTrails,uTail,uColor;
uniform vec4 uForm,uWarp,uFrame,uRotation;
uniform vec4 uLife,uNetwork;uniform float uSymmetry;
uniform vec4 uOrbit,uDrift,uWander,uTentacle,uTentacleMotion,uSpaceWarp;
uniform vec2 uMotionQuality;uniform float uMotionSeed;
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float clockAt(float q){
 q=clamp((fract(q)-uClock.z*.5)/(1.-uClock.z),0.,1.);
 float r=.14,y=min(q,1.-q)/r,ramp=r*y*y*y*(1.-.5*y);
 float area=q<r?ramp:q>1.-r?1.-r-ramp:q-r*.5;
 float e=uClock.z>0.?area/(1.-r):q;
 return TAU*e-.92*uClock.y*(1.-.55*uMotionQuality.x)*sin(TAU*e);
}
vec3 curl(vec3 p,float t){return vec3(cos(p.y+t)-sin(p.z-t),cos(p.z+t)-sin(p.x-t),cos(p.x+t)-sin(p.y-t));}
vec3 shape(vec4 r,float t,float family){
 float cell=floor(r.x*uNetwork.y),local=fract(r.x*uNetwork.y);
 // A continuous sphere-to-ring nucleus. Zero opening has no hidden major radius.
 float a=(cell+local*mix(1.,.12,uNetwork.x))/uNetwork.y*TAU+t;
 float b=r.y*TAU+t+uNetwork.x*uNetwork.z*sin(a*3.+t)*2.;
 float th=uShape.w*mix(1.,sqrt(r.z),uStructure.x);
 float lobe=uStructure.z*(.5+.5*sin(a*uStructure.y+t))*.4;
 float radius=.36+uShape.z*.8+th*cos(b)+lobe;
 vec3 ring=vec3(radius*cos(a),th*sin(b),radius*sin(a));
 // Equal-area sphere sampling; cube-root radius gives uniform volume at Fill = 1.
 float latitude=1.-2.*r.y,parallel=sqrt(max(0.,1.-latitude*latitude));
 float shell=mix(1.,pow(r.z,1./3.),uStructure.x);
 vec3 sphere=vec3(parallel*cos(a),latitude,parallel*sin(a))*(uShape.w*2.+lobe)*shell;
 sphere.yz=rot(t+uNetwork.x*uNetwork.z*sin(a*3.+t))*sphere.yz;
 vec3 p=mix(sphere,ring,smoothstep(0.,.45,uShape.z));
 // Density concentrates around lobes without changing the kernel into a different effect.
 float cluster=.6+.4*cos(a*uStructure.y+t)*cos(b*2.-t);
 p*=mix(1.,cluster,uStructure.w*.6);
 return p;
}
vec3 restPoint(vec4 r){return mix(shape(r,0.,uShape.x),shape(r,0.,uShape.y),uDynamics.w);}
// Repulsive volumes have priority over positive routes. Final depth escape
// resolves intersections between point spheres and path tubes without undoing either.
vec3 sceneBarriers(vec3 p,vec4 r,float phase){
 p=excludeForceCores(excludeGuideCores(p,r,phase));
 if(insideGuideCore(p,r,phase)){
  float upper=p.z,lower=p.z;
  for(int i=0;i<4;i++){if(i>=uGuideCount)break;float core=guideCore(i,r,phase),xy=guideClearance(i,p.xy);if(core<=0.||xy>=core)continue;
   float dz=sqrt(max(0.,core*core-xy*xy))+.00002;upper=max(upper,uGuideA[i].w+dz);lower=min(lower,uGuideA[i].w-dz);
  }
  for(int i=0;i<11;i++){if(i>=uForceCount)break;float core=forceCore(i),xy=distance(p.xy,uForcePoints[i].xy);if(core<=0.||xy>=core)continue;
   float dz=sqrt(max(0.,core*core-xy*xy))+.00002;upper=max(upper,uForcePoints[i].z+dz);lower=min(lower,uForcePoints[i].z-dz);
  }p.z=upper-p.z<=p.z-lower?upper:lower;
 }return p;
}
vec3 position(vec4 r,float phase){
 float global=clockAt(phase*uClock.x),c=1.+floor(r.z*3.)*step(1.-uClock.w,r.w);
 float seedPhase=(uMotionSeed-417.)*.013;
 float t=global*c+(r.w-.5)*uFlow.y*TAU+seedPhase+uOrbit.w*r.z*TAU-uMotionQuality.y*r.x*2.;
 vec3 rest=restPoint(r),p=mix(shape(r,t,uShape.x),shape(r,t,uShape.y),uDynamics.w);
 p=mix(rest,p,uDynamics.z);
 // Ellipses and rotating orbital planes affect the existing trajectories.
 p.xz*=vec2(1.+uOrbit.x*.45,1.-uOrbit.x*.65);
 p.yz=rot(uOrbit.y+uOrbit.z*.9*sin(global+r.x*TAU+seedPhase))*p.yz;
 vec3 drift=vec3(cos(global+r.y*TAU+seedPhase),.5*sin(global*2.+r.x*TAU),sin(global+r.y*TAU+seedPhase));
 p+=uDrift.x*.4*drift;
 float gain=1.,freq=uNoise.y;
 for(int i=0;i<5;i++){if(float(i)>=uNoise.z)break;
  vec3 q=p*freq+uSeed+float(i)*13.7;
  q+=uNoise.w*.8*curl(q*.8,global);
  vec3 flow=mix(curl(q,global),curl(rest*freq*.35+uSeed,global),uFlow.x*.75);
  p+=flow*uNoise.x*.13*gain;
  gain*=uFlow.w*(1.-uMotionQuality.x*.7);freq*=1.93;
 }
 vec3 wandering=vec3(sin(t+r.z*TAU),cos(t*2.+r.x*TAU),sin(t*3.+r.y*TAU));
 vec3 softWandering=vec3(sin(t+r.z*TAU),cos(t+r.x*TAU),sin(t+r.y*TAU));
 p+=uFlow.y*.25*mix(wandering,softWandering,uMotionQuality.x);
 p+=uFlow.z*.04*mix(vec3(sin(global*13.+r.x*91.),sin(global*17.+r.y*97.),cos(global*19.+r.z*83.)),softWandering,uMotionQuality.x);
 // Seeded periodic harmonics, with a blend from shared currents to individual drift.
 vec3 q=mix(rest*uWander.y,r.xyz*TAU,uWander.w)+seedPhase;
 float wt=global*uWander.z;
 p+=uWander.x*.32*(curl(q,wt)+mix(.38,.08,uMotionQuality.x)*curl(q*1.93+7.1,wt*2.));
 // The same nucleus elongates into soft arms; no separate particles or emitter.
 float ta=atan(p.z,p.x),ridge=pow(max(0.,.5+.5*cos(ta*uTentacle.y+seedPhase)),uTentacle.w);
 float extension=uTentacle.x*uTentacle.z*ridge;
 float tentaclePhase=global*uTentacleMotion.z-ridge*3.+seedPhase;
 vec3 radial=normalize(vec3(p.x,0.,p.z)+vec3(.00001,0.,0.));
 p+=radial*extension;
 p.y+=extension*(uTentacleMotion.y*sin(tentaclePhase)+.35*sin(ta*uTentacle.y+seedPhase));
 p.xz=rot(extension*uTentacleMotion.x+uTentacle.x*uTentacleMotion.y*ridge*.35*cos(tentaclePhase))*p.xz;
 // Periodic space deformation, independent of the fine organic noise domain warp.
 float st=global*uSpaceWarp.z;
 p+=uSpaceWarp.x*.38*curl(p*uSpaceWarp.y+seedPhase,st);
 p.xz=rot(uSpaceWarp.x*uSpaceWarp.w*sin(p.y*uSpaceWarp.y+st))*p.xz;
 p.xz=rot(uDynamics.x*p.y+uDynamics.x*sin(global)*.3)*p.xz;
 p*=1.-uDynamics.y*(.5+.5*sin(t+r.y*TAU))*.78;
 p*=1.+uBreath*.35*sin(global+uSeed);
 float pulse=global*uLife.y-r.x*TAU*uLife.w;
 p*=1.+uLife.x*(.16*sin(pulse)+.065*sin(2.*pulse));
 if(uSymmetry>1.5){float a=atan(p.z,p.x),sector=TAU/uSymmetry;float mirrored=abs(mod(a+sector*.5,sector)-sector*.5);a=floor(r.w*uSymmetry)*sector+mirrored;float radius=length(p.xz);p.xz=vec2(cos(a),sin(a))*radius;}
 // Bounded radial and tangential force deformations around orbiting poles.
 vec3 force=vec3(0.);
 for(int i=0;i<6;i++){if(float(i)>=uPoles.w)break;
  float a=float(i)/uPoles.w*TAU+global;
  vec3 center=vec3(cos(a),sin(a),sin(a*2.+uSeed)*.5)*uPoleRadius;
  vec3 delta=p-center;float d=length(delta),weight=exp(-d*d/max(.01,uPoleField*uPoleField));
  force+=(delta/max(.15,d)*(uPoles.y-uPoles.x)*.48+cross(normalize(vec3(.3,1.,.2)),delta)*uPoles.z*.55)*weight;
 }
 p+=force;
 if(r.w>.86){float branch=floor(r.x*uOuter.z),q=global+r.y*TAU,exc=pow(.5+.5*sin(q),2.);float a=branch/uOuter.z*TAU+uSeed+uDynamics.x*.3*cos(q);
  vec3 jet=vec3(cos(a),sin(a)*.85,sin(a*2.)*.3)*(1.+exc*uOuter.y)+.18*vec3(sin(q*2.),cos(q),sin(q));
  p=mix(p,jet,uOuter.x*smoothstep(0.,.4,exc));
 }
 p*=vec3(uForm.xy,uForm.z*uForm.w);p.xz=rot(uWarp.y*p.y)*p.xz;
 p+=uWarp.x*.4*vec3(sin(p.y*2.6+global),cos(p.z*3.+global),sin(p.x*3.4-global));
 p+=uWarp.z*.3*sin(p.yzx*uWarp.w+vec3(global,-global,global));
 p.xy=rot(uRotation.z)*p.xy;p.yz=rot(uRotation.x)*p.yz;p.xz=rot(uRotation.y)*p.xz;
 p*=uFrame.x;p.xy+=uFrame.yz;
 // Static scene-space fields preserve periodicity and work equally on points and tails.
 vec3 pull=vec3(0.);float influence=0.;
 for(int i=0;i<11;i++){if(i>=uForceCount)break;vec3 d=uForcePoints[i].xyz-p;
  float radius=uForceOptions[i].x,weight=exp(-dot(d,d)/(2.*radius*radius));
  float strength=uForcePoints[i].w,gain=1.-exp(-abs(strength));
  pull+=(sign(strength)*d*gain+cross(vec3(0.,0.,1.),d)*uForceOptions[i].y*.5)*weight;
  influence+=gain*weight;
 }
 p+=pull/max(1.,influence);return sceneBarriers(guidePosition(p,r,phase),r,phase);
}
vec4 project(vec3 p){float depth=max(2.,7.5-p.z);return vec4(p.xy*vec2(uResolution.y/uResolution.x,1.)*2.6/depth,(depth-3.)/12.,1.);}
vec3 particleColor(vec4 r,vec3 p){
 vec3 rest=restPoint(r),coord=uColor.x<.5?rest:uColor.x<1.5?vec3((r.z-.5)*4.5,0.,0.):uColor.x<2.5?vec3((floor(r.x*uOuter.z)/uOuter.z-.5)*4.5,0.,0.):p;
 vec3 base=prismaPalette(coord,vec3(1.));
 base=mix(base,prismaPalette(vec3((r.w-.5)*5.,0.,0.),vec3(1.)),uColor.y);
 base*=mix(1.,.25+r.z*1.5,uColor.z)*mix(1.,.2+.8*smoothstep(-2.,2.,p.z),uColor.w);
 float wave=pow(.5+.5*sin(r.y*TAU-clockAt(uPhase*uClock.x)*uLife.y-r.x*TAU*uLife.w),8.);
 base*=mix(1.,.2+wave*4.,uLife.z);
 return base;
}
`;
