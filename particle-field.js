import {bodySampleGLSL} from './body-samples.js?v=88d17b3ed245';
import {DYNAMICS_GLSL} from './dynamics.js?v=88d17b3ed245';
// Analytic periodic fields, not an accumulating particle simulation: any frame is seekable.
import {guideGLSL} from './particle-path-field.js?v=88d17b3ed245';
import {forceBarrierGLSL} from './particle-forces.js?v=88d17b3ed245';
export const grainSizingGLSL=`
uniform vec2 uNodeStyle,uLargeGrains,uGrainDistribution;
float grainDiameter(vec4 seed,int index){
 float diameter=uNodeStyle.y>0.&&float(index)<uNodeStyle.x?uNodeStyle.y:float(index)<uLargeGrains.x?uLargeGrains.y:uPoints.x;
 float sizeRandom=fract(seed.w*73.17+seed.x*19.73);
 float distributed=pow(max(.00001,sizeRandom),exp2(uGrainDistribution.y*6.));
 float spread=exp2(mix(-uGrainDistribution.x,uGrainDistribution.x,distributed));
 return min(1024.,diameter*mix(1.,.15+seed.z*1.7,uPoints.y)*spread);
}`;

export const fieldGLSL=`
${DYNAMICS_GLSL}
${guideGLSL}
${forceBarrierGLSL}
const float TAU=6.28318530718;
uniform float uPhase,uSeed,uBreath,uPoleRadius,uPoleField;
uniform vec2 uResolution;uniform vec3 uSpacing;
uniform vec4 uCloudShape,uCloudCells;
uniform vec3 uCellDetail;
uniform float uCounterflow,uGrainMotionAmount;
uniform vec4 uShape,uStructure,uNoise,uFlow,uDynamics,uPoles,uOuter,uClock,uPoints,uTrails,uTail,uColor;
uniform vec4 uForm,uWarp,uFrame,uRotation;
uniform vec4 uLife,uNetwork;uniform float uSymmetry;
uniform vec4 uOrbit,uDrift,uWander,uTentacle,uTentacleMotion,uSpaceWarp;
uniform vec2 uMotionQuality;uniform float uMotionSeed;
uniform highp uint uGrainSeed;
uint hashGrain(uint value){
 value^=value>>16u;value*=0x7feb352du;value^=value>>15u;value*=0x846ca68bu;return value^(value>>16u);
}
vec4 generatedGrain(int index){
 uint h=hashGrain(uint(index)^uGrainSeed),a=hashGrain(h+0x9e3779b9u),b=hashGrain(a),c=hashGrain(b);
 return vec4(uvec4(h,a,b,c)>>8u)/16777216.;
}
vec4 grainSeed(sampler2D stored,int index){
 ivec2 size=textureSize(stored,0);
 if(index>=size.x*size.y)return generatedGrain(index);
 return texelFetch(stored,ivec2(index%size.x,index/size.x),0);
}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
${bodySampleGLSL}
float clockAt(float q){
 q=clamp((fract(q)-uClock.z*.5)/(1.-uClock.z),0.,1.);
 float r=.14,y=min(q,1.-q)/r,ramp=r*y*y*y*(1.-.5*y);
 float area=q<r?ramp:q>1.-r?1.-r-ramp:q-r*.5;
 float e=uClock.z>0.?area/(1.-r):q;
 return TAU*e-.92*uClock.y*(1.-.55*uMotionQuality.x)*sin(TAU*e);
}
vec3 curl(vec3 p,float t){return vec3(cos(p.y+t)-sin(p.z-t),cos(p.z+t)-sin(p.x-t),cos(p.x+t)-sin(p.y-t));}
vec3 shapeBase(vec4 r,float t,float family){
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
 float radial=pow(r.z,1./3.);
 if(abs(uCloudShape.x)>.00001)radial=pow(r.z,exp2(2.*uCloudShape.x)/3.);
 float shell=mix(1.,radial,uStructure.x);
 vec3 sphere=vec3(parallel*cos(a),latitude,parallel*sin(a))*(uShape.w*2.+lobe)*shell;
 sphere.yz=rot(t+uNetwork.x*uNetwork.z*sin(a*3.+t))*sphere.yz;
 vec3 p=mix(sphere,ring,smoothstep(0.,.45,uShape.z));
 // Density concentrates around lobes without changing the kernel into a different effect.
 float cluster=.6+.4*cos(a*uStructure.y+t)*cos(b*2.-t);
 p*=mix(1.,cluster,uStructure.w*.6);
 if(uCloudShape.y>0.){
  float haze=step(1.-uCloudShape.y,r.w)*(.35+.65*r.z);
  if(uDynamics.y>1.){
   // For a returning sheet, fibres shed progressively from the trailing cap.
   // The inner end of its halo stays in contact with the denser material.
   float mass=clamp((r.w-1.+uCloudShape.y)/uCloudShape.y,0.,1.);
   float lee=.24+.76*smoothstep(-.8,.8,dot(p,vec3(.36,.82,-.45))/max(.001,length(p)));
   haze=mix(haze,mass*mass*lee,smoothstep(1.,2.,uDynamics.y));
  }
  p*=1.+haze*uCloudShape.z;
 }
 return p;
}
float cellIdentity(vec3 index){return fract(dot(index,vec3(.1739,.2738,.3272)));}
vec3 cellAnchor(vec3 index,float seed){
 vec3 offset=fract(seed*vec3(2.514,4.942,7.146))-.5;
 return (index+.5+offset*.65*uCloudCells.w)/uCloudCells.y;
}
vec3 cellProfile(vec3 unit,float seed){
 vec3 profile=unit;
 if(uCellDetail.y>0.){
  float phase=seed*TAU;
  float folds=.64*sin(dot(unit,vec3(4.7,3.9,2.8))+phase)+.36*cos(dot(unit,vec3(7.2,-4.2,5.1))-2.*phase);
  profile*=1.+.51*uCellDetail.y*folds;
 }
 if(abs(uCellDetail.x)>.00001){
  float angle=seed*TAU,latitude=2.*fract(seed*7.193)-1.;
  vec3 axis=normalize(vec3(cos(angle),latitude,sin(angle)));
  // Expand along one axis and compensate across it to keep the cell's volume.
  float longitudinal=exp2(2.15*uCellDetail.x),transverse=inversesqrt(longitudinal);
  profile=profile*transverse+axis*dot(profile,axis)*(longitudinal-transverse);
 }
 return profile;
}
vec3 shape(vec4 r,float t,float family){
 vec3 p=shapeBase(r,t,family);
 if(abs(uSpacing.x-1.)+abs(uSpacing.y-1.)>.00001){
  float cells=max(2.,floor(uSpacing.z+.5));
  vec4 anchor=vec4((floor(r.xyz*cells)+.5)/cells,r.w);
  vec3 center=shapeBase(anchor,t,family);
  p=center*uSpacing.y+(p-center)*uSpacing.x;
 }
 if(uCloudCells.x>0.){
  float cells=uCloudCells.y;
  vec3 index=floor(r.xyz*cells);
  float seed=cellIdentity(index);
  vec3 anchor=cellAnchor(index,seed);
  vec3 center=shapeBase(vec4(anchor,.5),t,family);
  float z=1.-2.*fract(r.x*cells),angle=TAU*fract(r.y*cells),circle=sqrt(max(0.,1.-z*z));
  float breath=1.+.15*sin(t+seed*TAU)*uCloudCells.w;
  vec3 unit=vec3(circle*cos(angle),z,circle*sin(angle));
  vec3 profile=cellProfile(unit,seed)*uCloudCells.z*breath*pow(fract(r.z*cells),.333333);
  p=mix(p,center+profile,uCloudCells.x);
 }
 return p;
}
// Shape families share the same continuous sphere/ring kernel. Evaluate it once.
vec3 cloudRestPoint(vec4 r){return shape(r,0.,uShape.x);}
vec3 restPoint(vec4 r){return uStudioBody.x>0.?studioRestPoint(r):cloudRestPoint(r);}
// Repulsive volumes have priority over positive routes. Final depth escape
// resolves intersections between point spheres and path tubes without undoing either.
vec3 sceneBarriers(vec3 p,vec4 r,float phase){
 p=excludeForceCores(excludeGuideCores(p,r,phase));
 if(insideGuideCore(p,r,phase)){
  float upper=p.z,lower=p.z;
  for(int i=0;i<uGuideCount;i++){float core=guideCore(i,r,phase),xy=guideClearance(i,p.xy);if(core<=0.||xy>=core)continue;
   float dz=sqrt(max(0.,core*core-xy*xy))+.00002;upper=max(upper,uGuideA[i].w+dz);lower=min(lower,uGuideA[i].w-dz);
  }
  for(int i=0;i<uForceCount;i++){float core=forceCore(i),xy=distance(p.xy,uForcePoints[i].xy);if(core<=0.||xy>=core)continue;
   float dz=sqrt(max(0.,core*core-xy*xy))+.00002;upper=max(upper,uForcePoints[i].z+dz);lower=min(lower,uForcePoints[i].z-dz);
  }p.z=upper-p.z<=p.z-lower?upper:lower;
 }return containGuidePosition(p,r,phase);
}
vec3 cloudMotion(vec4 r,float phase,vec3 rest){
 float global=clockAt(phase*uClock.x),c=1.+floor(r.z*3.)*step(1.-uClock.w,r.w);
 float seedPhase=(uMotionSeed-417.)*.013;
 float t=global*c+(r.w-.5)*uFlow.y*TAU+seedPhase+uOrbit.w*r.z*TAU-uMotionQuality.y*r.x*2.;
 vec3 p=shape(r,t,uShape.x);
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
 if(abs(uCounterflow)>.00001){
  float shell=2.*smoothstep(.18,.82,r.z)-1.;
  float twist=sin(global)*shell+.35*cos(global)*sin(2.*p.y);
  p.xz=rot(uCounterflow*twist)*p.xz;
 }
 float radialReturn=uDynamics.y<=1.?uDynamics.y:2.-uDynamics.y;
 p*=1.-radialReturn*(.5+.5*sin(t+r.y*TAU))*.78;
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
 if(r.w>.86){
  float branch=floor(r.x*uOuter.z),q=global+branch/uOuter.z*TAU+(r.y-.5)*.55;
  float excursion=pow(.5+.5*sin(q),2.5),a=branch/uOuter.z*TAU+uSeed+sin(branch*7.17+uSeed)*.36+uDynamics.x*.07*cos(q);
  vec3 direction=normalize(vec3(cos(a),sin(a)*.85,sin(a*2.)*.3));
  float radius=.2+excursion*uOuter.y;
  vec3 transverse=cross(direction,vec3(0.,0.,1.));
  vec3 jet=direction*radius+transverse*(sin(radius*1.8+q)*.045+(r.z-.5)*.11)*radius;
  jet.z+=(r.y-.5)*.08*radius;
  p=mix(p,jet,uOuter.x);
 }
 return p;
}
#ifdef RETURN_FLOW_NORMAL
vec3 returnFlowNormal=vec3(0.,0.,1.);
float returnFlowWeight=0.,returnFlowCompression=0.;
// Inverse-transpose of the local shear p += (f(y), g(z), h(x)), up to scale.
vec3 shearNormal(vec3 n,vec3 slopes){
 vec3 jx=vec3(1.,0.,slopes.z),jy=vec3(slopes.x,1.,0.),jz=vec3(0.,slopes.y,1.);
 return mat3(cross(jy,jz),cross(jz,jx),cross(jx,jy))*n;
}
#endif
// A material band returns across its incoming latitude. Radial displacement
// separates its two sides, and advection moves the trailing cap off axis.
vec3 rollReturnFlow(vec3 point,float phase,float mobility){
 if(uDynamics.y<=1.||mobility<=0.)return point;
 float strength=smoothstep(1.,2.,uDynamics.y)*mobility;
 float radius=length(point);
 if(radius<.00001)return point;
 float time=clockAt(phase*uClock.x),offset=(uMotionSeed-417.)*.013,tide=sin(time+offset);
 float rho=length(point.xz),lat=atan(point.y,rho),side=clamp(rho/radius,0.,1.);
 vec2 radial=rho>.00001?point.xz/rho:vec2(1.,0.);
 float bearing=atan(radial.y,radial.x)+offset,asym=.24+.11*uCounterflow;
 float bend=asym*sin(bearing+time)+.12*sin(2.*bearing-time);
 float inlet=lat+.19+.13*tide+bend*side;
 float span=TAU*.5*(1.04+.16*uShape.z),band=span*(.5+.5*sin(inlet));
 float waveform=2.*band+.18*cos(bearing-time)*side;
 float reach=1.17+.27*tide+.18*uDynamics.x+.28*sin(time+bearing)*side;
 float envelope=pow(side,1.6),latitude=lat+strength*reach*sin(waveform)*envelope;
 float waveCos=cos(2.*band),returnSide=.5+.5*waveCos;
 float extent=1.+strength*(.18*waveCos*side-.36*returnSide*returnSide);
 float crown=smoothstep(-.18,.92,point.y/radius);
 vec2 dRuffleAngle=vec2(0.),dRuffleRadius=vec2(0.);
 float radialExpansion=1.;
 float back=smoothstep(-.64,.72,point.y/radius);
 if(uNoise.x>0.&&uFlow.w>0.&&back>0.){
  // Connected filaments are transported by a smooth curl on the cap.
  // Their ridge rolls sideways at the same time as it rises from the sheet.
  vec3 unit=point/radius;
  vec3 eddyAxis=vec3(4.6,-3.4,2.8),sweepAxis=vec3(-4.1,6.4,3.65),ridgeAxis=vec3(8.2,10.7,-5.5);
  float eddy=dot(unit,eddyAxis)+.42*sin(time+offset);
  float sweep=dot(unit,sweepAxis)+.38*cos(time+offset);
  float turn=eddy+1.28*cos(sweep),branch=sweep-.72*sin(eddy);
  float driftAmount=1.3+2.8*uFlow.w;
  float ridge=dot(unit,ridgeAxis)+driftAmount*sin(turn);
  float split=2.13*ridge+1.45*cos(branch);
  float ribbon=.58+.42*cos(sweep+.46*sin(eddy));
  float tuft=.24+.76*ribbon*ribbon;
  float organic=2.*uNoise.x/(1.4+uNoise.x);
  float gain=strength*organic*uFlow.w*(.544-.204*uFlow.x);
  float crest=gain*back*tuft;
  vec2 corrugation=vec2(.48*cos(ridge)+.22*uFlow.w*cos(split),.70*sin(ridge)+.24*uFlow.w*sin(split));
  latitude+=crest*corrugation.x;
  radialExpansion=exp(crest*corrugation.y);
  extent*=radialExpansion;
#ifdef RETURN_FLOW_NORMAL
  vec3 gTurn=eddyAxis-1.28*sin(sweep)*sweepAxis;
  vec3 gRidge=ridgeAxis+driftAmount*cos(turn)*gTurn;
  vec3 gBranch=sweepAxis-.72*cos(eddy)*eddyAxis;
  vec3 gSplit=2.13*gRidge-1.45*sin(branch)*gBranch;
  vec3 gTuft=-.6384*ribbon*sin(sweep+.46*sin(eddy))*(sweepAxis+.46*cos(eddy)*eddyAxis);
  float capT=clamp((unit.y+.64)/1.36,0.,1.);
  vec3 gCrest=gain*(tuft*vec3(0.,6.*capT*(1.-capT)/1.36,0.)+back*gTuft);
  vec3 gLatitude=gCrest*corrugation.x-crest*(.48*sin(ridge)*gRidge+.22*uFlow.w*sin(split)*gSplit);
  vec3 gExtent=gCrest*corrugation.y+crest*(.70*cos(ridge)*gRidge+.24*uFlow.w*cos(split)*gSplit);
  vec3 dUnitLat=vec3(-radial.x*unit.y,side,-radial.y*unit.y);
  vec3 dUnitAz=vec3(-unit.z,0.,unit.x);
  dRuffleAngle=vec2(dot(gLatitude,dUnitLat),dot(gLatitude,dUnitAz));
  dRuffleRadius=extent*vec2(dot(gExtent,dUnitLat),dot(gExtent,dUnitAz));
#endif
 }
 float radialExtent=extent*cos(latitude);
 vec2 capDrift=(.17+.25*uCounterflow)*vec2(.65+.72*cos(time+offset),.71*sin(time+offset));
 vec2 drift=vec2(.23*sin(band-.5)*sin(band-.5),.14*cos(band-time))+crown*capDrift;
 vec2 horizontal=radius*(radialExtent*radial+strength*drift);
 float height=radius*(extent*sin(latitude)+strength*crown*(.28+.18*tide));
#ifdef RETURN_FLOW_NORMAL
 // Both derivatives of this same map. Components are (latitude, azimuth);
 // no neighbour searches or repeated calls to the turbulence field.
 vec2 dSide=vec2(-point.y/radius,0.);
 vec2 dBend=vec2(0.,asym*cos(bearing+time)+.24*cos(2.*bearing-time));
 vec2 dBand=.5*span*cos(inlet)*(vec2(1.,0.)+bend*dSide+side*dBend);
 vec2 dWave=2.*dBand+.18*(cos(bearing-time)*dSide-vec2(0.,sin(bearing-time)*side));
 vec2 dReach=.28*(sin(time+bearing)*dSide+vec2(0.,cos(time+bearing)*side));
 vec2 dLatitude=dRuffleAngle+vec2(1.,0.)+strength*(envelope*(dReach*sin(waveform)+reach*cos(waveform)*dWave)
                           +reach*sin(waveform)*1.6*pow(side,.6)*dSide);
 vec2 dWaveCos=-2.*sin(2.*band)*dBand;
 vec2 dExtent=dRuffleRadius+radialExpansion*strength*(.18*waveCos*dSide+(.18*side-.36*returnSide)*dWaveCos);
 vec2 dRadial=dExtent*cos(latitude)-extent*sin(latitude)*dLatitude;
 float capT=clamp((point.y/radius+.18)/1.1,0.,1.);
 float dCrown=6.*capT*(1.-capT)*side/1.1;
 vec2 dHeight=dExtent*sin(latitude)+extent*cos(latitude)*dLatitude+vec2(strength*(.28+.18*tide)*dCrown,0.);
 vec2 dDrift=strength*vec2(.23*sin(2.*band-1.),-.14*sin(band-time));
 vec2 meridian=radial*dRadial.x+dDrift*dBand.x+strength*dCrown*capDrift;
 vec2 parallel=radial*dRadial.y+dDrift*dBand.y+radialExtent*vec2(-radial.y,radial.x);
 vec3 normal=cross(vec3(meridian.x,dHeight.x,meridian.y),vec3(parallel.x,dHeight.y,parallel.y));
 float normalSize=length(normal);
 returnFlowNormal=normalSize>.00001?normal/normalSize:point/radius;
 returnFlowWeight=clamp(strength,0.,1.);
 // Relative to an undeformed unit sphere cell (area cos(latitude)).
 // A tight turning meridian can also focus light without losing total area.
 float crowded=1.-smoothstep(.38,.98,normalSize/max(.01,side));
 float turning=1.-smoothstep(.10,.76,abs(dLatitude.x));
 returnFlowCompression=strength*smoothstep(.02,.10,side)*max(crowded,.76*turning);
#endif
 return vec3(horizontal.x,height,horizontal.y);
}
vec3 positionUnconstrained(vec4 r,float phase){
 vec3 p;
 if(uStudioBody.x>0.){
  vec3 anchor=studioRestPoint(r);
  if(anchor.z< -100.)return anchor;
  if(uStudioBody.y>0.){
   vec3 rest=cloudRestPoint(r);
   anchor+=(cloudMotion(r,phase,rest)-rest)*uStudioBody.y;
  }
  p=studioTransform(rollReturnFlow(anchor,phase,uStudioBody.y));
#ifdef RETURN_FLOW_NORMAL
  if(returnFlowWeight>0.){
   vec3 n=returnFlowNormal/vec3(uForm.xy,max(.06,uForm.z*uForm.w));
   n.yz=rot(-uRotation.x)*n.yz;n.xz=rot(-uRotation.y)*n.xz;n.xy=rot(-uRotation.z)*n.xy;
   returnFlowNormal=normalize(n);
  }
#endif
 }else{
  float global=clockAt(phase*uClock.x);
  vec3 rest=cloudRestPoint(r);p=mix(rest,cloudMotion(r,phase,rest),uGrainMotionAmount);
  p=rollReturnFlow(p,phase,uGrainMotionAmount);
  p*=vec3(uForm.xy,uForm.z*uForm.w);p.xz=rot(uWarp.y*p.y)*p.xz;
#ifdef RETURN_FLOW_NORMAL
  if(returnFlowWeight>0.){
   vec3 n=returnFlowNormal/max(vec3(.0001),vec3(uForm.xy,uForm.z*uForm.w));
   n.xz=rot(uWarp.y*p.y)*n.xz;
   n.y-=uWarp.y*dot(n.xz,vec2(p.z,-p.x));
   if(uWarp.x!=0.)n=shearNormal(n,uWarp.x*.4*vec3(2.6*cos(p.y*2.6+global),-3.*sin(p.z*3.+global),3.4*cos(p.x*3.4-global)));
   returnFlowNormal=n;
  }
#endif
  p+=uWarp.x*.4*vec3(sin(p.y*2.6+global),cos(p.z*3.+global),sin(p.x*3.4-global));
#ifdef RETURN_FLOW_NORMAL
  if(returnFlowWeight>0.){
   vec3 n=returnFlowNormal;
   if(uWarp.z!=0.)n=shearNormal(n,uWarp.z*.3*uWarp.w*cos(p.yzx*uWarp.w+vec3(global,-global,global)));
   n.xy=rot(uRotation.z)*n.xy;n.yz=rot(uRotation.x)*n.yz;n.xz=rot(uRotation.y)*n.xz;
   returnFlowNormal=n/max(.00001,length(n));
  }
#endif
  p+=uWarp.z*.3*sin(p.yzx*uWarp.w+vec3(global,-global,global));
  p.xy=rot(uRotation.z)*p.xy;p.yz=rot(uRotation.x)*p.yz;p.xz=rot(uRotation.y)*p.xz;
  p*=uFrame.x;p.xy+=uFrame.yz;
 }
 // Static scene-space fields preserve periodicity and work equally on points and tails.
 vec3 pull=vec3(0.);float influence=0.;
 for(int i=0;i<uForceCount;i++){vec3 d=uForcePoints[i].xyz-p;
  float radius=uForceOptions[i].x,weight=exp(-dot(d,d)/(2.*radius*radius));
  float strength=uForcePoints[i].w,gain=1.-exp(-abs(strength));
  pull+=(sign(strength)*d*gain+cross(vec3(0.,0.,1.),d)*uForceOptions[i].y*.5)*weight;
  influence+=gain*weight;
 }
 p+=pull/max(1.,influence);return guidePosition(p,r,phase);
}
vec3 positionRaw(vec4 r,float phase){return sceneBarriers(positionUnconstrained(r,phase),r,phase);}
vec3 constrainedDynamics(vec3 p,vec4 r,float phase){
 p=dynamicsForward(p);
 // Reapply hard manual constraints after inertia: it must not carry a grain
 // back into a repulsive sphere or outside its containing path.
 p=dynamicsContact(sceneBarriers(p,r,phase));
 return p;
}
vec3 position(vec4 r,float phase){return constrainedDynamics(positionUnconstrained(r,phase),r,phase);}
vec4 project(vec3 p){float depth=max(2.,7.5-p.z);float fit=min(uResolution.x,uResolution.y);vec2 scale=mix(vec2(uResolution.y/uResolution.x,1.)*2.6/depth,vec2(fit)/uResolution*(2./3.4),uStudioPerspective);return vec4(p.xy*scale,(depth-3.)/12.,1.);}
float cellLightFactor(vec4 r){
 if(uCloudCells.x<=0.||abs(uCellDetail.z)<.00001)return 1.;
 vec3 index=floor(r.xyz*uCloudCells.y);
 vec3 center=shapeBase(vec4(cellAnchor(index,cellIdentity(index)),.5),0.,uShape.x);
 vec2 direction=vec2(cos(uGradient.x),sin(uGradient.x));
 float signedPosition=clamp(dot(center.xy,direction)/max(.15,uShape.w*2.+uShape.z*.8),-1.,1.);
 return exp2(2.5*signedPosition*uCellDetail.z*uCloudCells.x);
}
vec3 particleColor(vec4 r,vec3 p){
 vec3 rest=restPoint(r),coord=uColor.x<.5?rest:uColor.x<1.5?vec3((r.z-.5)*4.5,0.,0.):uColor.x<2.5?vec3((floor(r.x*uOuter.z)/uOuter.z-.5)*4.5,0.,0.):p;
 vec3 base=prismaPaletteBase(coord,vec3(1.));
 base=mix(base,prismaPaletteBase(vec3((r.w-.5)*5.,0.,0.),vec3(1.)),uColor.y);
 base=prismaKnotBands(p,prismaColorLayersAt(uColor.x>2.5?p:rest,base,uColor.x>2.5?p:rest,uStudioBody.x>0.));
 base*=mix(1.,.25+r.z*1.5,uColor.z)*mix(1.,.2+.8*smoothstep(-2.,2.,p.z),uColor.w);
 float wave=pow(.5+.5*sin(r.y*TAU-clockAt(uPhase*uClock.x)*uLife.y-r.x*TAU*uLife.w),8.);
 if(r.w>.86&&uOuter.x>0.){
  float branch=floor(r.x*uOuter.z),event=clockAt(uPhase*uClock.x)+branch/uOuter.z*TAU*uLife.w;
  float surge=pow(.5+.5*sin(event),10.);
  wave=mix(wave,.025+surge*4.,uOuter.x);
 }
 base*=mix(1.,.2+wave*4.,uLife.z);
 return base;
}
`;
