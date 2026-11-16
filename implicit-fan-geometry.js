// Shared component geometry and transport for overlapping procedural sheets.
// All string transformations are checked so changes to a shader cannot silently
// select a different geometry or lose a continuation boundary.
export const FAN_COMPONENT_GLSL=`// Component IDs are stable across count changes: leaves 0..19, core 20, drape 21.
int fanQuery=-1,fanSurfaceId=-1;
bool fanComponentIncluded(int id){
 float blend=fanDrapeBlend();
 return uStructureFan<=0.?id==0:((id<int(uStructureC.w+.5)||id==20)&&blend<1.)||(id==21&&blend>0.);
}
// The same unrolled coordinates drive the boundary and its material. The
// first two values are longitudinal distance and across-sheet distance.
vec4 fanSheetCoordinates(vec3 p,int id){
 vec4 axis=uFanAxes[id],profile=uFanProfiles[id];
 vec2 plane=vec2(dot(p.xy,axis.xy),dot(p.xy,vec2(-axis.y,axis.x)));
 float along=clamp(plane.x/axis.z,0.,1.2),across=plane.y-along*along*profile.x;
 float width=axis.w*(.58+.42*smoothstep(0.,.75,along));
 float sheet=along*(profile.y+sin(profile.w-along*2.4)*uStructureF.y*.42)+across*along*(.8*profile.z+uStructureE.y*.74)+across*across*(.45+.26*profile.z)
  +uFanBias*pow(along,1.25)*uStructureE.z*sin(across*(3.2+uStructureE.w*.7)-along*2.1+profile.w)*.58;
 return vec4(plane.x,across,p.z-sheet,width);
}
vec4 fanLeafCoordinates(vec3 p,int id){
 if(id==21)return fanDrapeCoordinates(p);
 if(id<0||id>=20)return vec4(p.xy,p.z,1.);
 float size=sqrt(max(.0000001,1.-fanDrapeBlend()));
 vec4 q=fanSheetCoordinates(p/size,id);
 return vec4(q.y/q.w,q.x/uFanAxes[id].z,q.z*size,q.w*size);
}
void fanSurfaces(vec3 p,out float fields[22]){
 float blend=fanDrapeBlend(),drapeSize=sqrt(blend),fanSize=sqrt(1.-blend);
 for(int i=0;i<22;i++)fields[i]=10000.;
 if(blend>0.)fields[21]=drapeField(p/drapeSize)*drapeSize;
 if(blend<1.){
  p/=fanSize;
  if(fanQuery<0||fanQuery==20||blend>0.)fields[20]=max(length(p.xy)-.115*(1.-uFanBias*.82),abs(p.z)-uStructureA.y*.58)*fanSize;
  for(int i=0;i<int(uStructureC.w+.5);i++){
   if(fanQuery>=0&&fanQuery!=i&&blend<=0.)continue;
   vec4 axis=uFanAxes[i],profile=uFanProfiles[i],q=fanSheetCoordinates(p,i);
   float reach=axis.z,halfWidth=axis.w;
   float outline=(length(vec2((q.x-.43*reach)/(.63*reach),q.y/q.w))-1.)*min(.3,q.w)
    +uStructureG.w*(.4*sin(q.x*17.+q.y*22.+profile.w)+.16*sin(q.x*41.-q.y*37.+profile.w*2.));
   float edge=clamp(1.+outline/(.6*halfWidth),0.,1.);
   float thickness=uStructureA.y*(.33-.25*uStructureH.x*edge);
   fields[i]=max(outline,abs(q.z)-thickness)*.59*fanSize;
  }
 }
 if(blend>0.&&blend<1.){
  float minimum=fields[20];for(int i=0;i<int(uStructureC.w+.5);i++)minimum=min(minimum,fields[i]);
  float rounding=.015*sin(3.14159265359*blend),h=max(0.,rounding-abs(minimum-fields[21]))/max(.0000001,rounding);
  for(int i=0;i<22;i++)fields[i]-=h*h*rounding*.25;
 }
}

float fanField(vec3 p){
 float fields[22];fanSurfaces(p,fields);
 if(fanQuery>=0)return fields[fanQuery];
 float distance=fields[20];for(int i=0;i<int(uStructureC.w+.5);i++)distance=min(distance,fields[i]);
 return min(distance,fields[21]);
}
#ifdef FAN_TRANSPORT
int fanNearestId=-1;
uint fanInsideMask=0u,fanIgnoreMask=0u;
float fanStepDistance=10.,fanBoundaryEpsilon=.000001;
float fanSelectBoundary(float fields[22],float scale){
 fanNearestId=-1;fanStepDistance=10000.;float nearest=10000.;
 for(int i=0;i<22;i++){
  float value=fields[i]*scale,magnitude=abs(value);uint bit=1u<<uint(i);
  if(value>fanBoundaryEpsilon)fanInsideMask&=~bit;
  if(magnitude>fanBoundaryEpsilon*4.)fanIgnoreMask&=~bit;
  fanStepDistance=min(fanStepDistance,magnitude);
  if(((fanInsideMask|fanIgnoreMask)&bit)==0u&&magnitude<abs(nearest)){nearest=value;fanNearestId=i;}
 }
 return nearest;
}
float fanTransportField(float base,vec3 p){
 if(uStructureFan<=0.&&fanQuery>=0)return base;
 float fields[22];fanSurfaces(p,fields);
 for(int i=0;i<22;i++){
  if(uStructureFan<=0.)fields[i]=i==0?base:10000.;
  else if(fields[i]<1000.)fields[i]=mix(base,fields[i],uStructureFan);
 }
 if(fanQuery>=0)return fields[fanQuery];
 float scale=min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*.5;
 return fanSelectBoundary(fields,scale)/scale;
}
#endif`;
export const INDEPENDENT_FAN_HIT_MAIN=`
uniform vec4 uHitBudget;
uniform vec2 uHitJitter;
uniform sampler2D uHitPrevious,uHitThrough;
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
 float previousT=t,previousD=0.,a=t,b=t,da=0.,db=0.,hitT=t,hitD=0.,rejectUntil=-1.,closest=10.,lastAccepted=-1.;
 fanQuery=-1;fanNearestId=-1;fanInsideMask=0u;fanIgnoreMask=0u;fanBoundaryEpsilon=epsilon;
 if(uHitContinue>.5){
  vec4 continuation=texelFetch(uHitPrevious,ivec2(gl_FragCoord.xy),0);fanInsideMask=uint(continuation.z+.5);
  if(continuation.w<=-100.){t=max(t,continuation.y);lastAccepted=continuation.x>=0.?continuation.x:-1.;closest=continuation.x<0.?max(0.,-continuation.x-1.):0.;fanIgnoreMask=uint(round(-continuation.w-100.));}
  else if(continuation.w<0.)t=end+1.;else{t=max(t,continuation.w);lastAccepted=continuation.w;}
 }
 if(uHitContinue>.5){vec3 through=texelFetch(uHitThrough,ivec2(gl_FragCoord.xy),0).rgb;if(max(max(through.r,through.g),through.b)<.001)t=end+1.;}
 vec3 samplePoint=origin+direction*t,gradient=vec3(0.),entryNormal=vec3(0.,0.,1.);
 int mode=0,refinement=0,normalSample=0,layer=0,previousComponent=-1,hitComponent=-1;
 bool previousValid=false;
 for(int step=0;step<int(uHitBudget.x)||mode!=0;step++){
  if(t>end||layer>=uHitCount)break;
  fanQuery=mode==0?-1:hitComponent;float distance=field(samplePoint);int component=fanNearestId;
  if(mode==0){
   closest=min(closest,abs(distance));
   if(previousValid&&previousComponent==component&&component>=0&&previousD*distance<0.){
    if(previousD<0.){t+=epsilon*8.;rejectUntil=t+epsilon*3.;previousValid=false;samplePoint=origin+direction*t;continue;}
    hitComponent=component;a=previousT;b=t;da=previousD;db=distance;refinement=0;mode=1;
    t=.5*(a+b);samplePoint=origin+direction*t;continue;
   }
   if(component>=0&&abs(distance)<epsilon){
    hitComponent=component;hitT=t;hitD=distance;gradient=vec3(0.);normalSample=0;mode=2;
    samplePoint=origin+direction*hitT+vec3(uHitBudget.w,0.,0.);continue;
   }
   previousComponent=component;previousT=t;previousD=distance;previousValid=true;
   t+=clamp(min(abs(distance),fanStepDistance)*uHitBudget.y,epsilon*.6,.12*uFrame.x);
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
    }else{fanIgnoreMask|=1u<<uint(hitComponent);t=hitT+epsilon*.5;previousValid=false;mode=0;samplePoint=origin+direction*t;}
   }else{
    vec3 offset=vec3(0.);offset[normalSample/2]=(normalSample%2==0?1.:-1.)*uHitBudget.w;
    samplePoint=origin+direction*hitT+offset;
   }
  }else{
   // Confirm the interior of this component, then retain its mask until its
   // exit. Return to the exact entry depth so coincident leaves are retained.
   if(distance<-epsilon*.1){fanInsideMask|=1u<<uint(hitComponent);vec3 oct=entryNormal/(abs(entryNormal.x)+abs(entryNormal.y)+abs(entryNormal.z));hits[layer]=vec4(2.*float(hitComponent)+.5*(oct.x+1.),oct.y,float(fanInsideMask),hitT);lastAccepted=hitT;layer++;}else fanIgnoreMask|=1u<<uint(hitComponent);
   t=hitT;
   rejectUntil=t+epsilon*3.;previousValid=false;mode=0;samplePoint=origin+direction*t;
  }
 }
 // An exhausted query is resumable, not an empty ray. Ordinary misses
 // retain their existing representation; the sentinel has a disjoint range.
 if(t<=end&&layer<uHitCount){
  float resumeT=previousValid?previousT:t;
  for(int i=layer;i<4;i++)hits[i]=vec4(lastAccepted>=0.?lastAccepted:-1.-closest,resumeT,float(fanInsideMask),-100.-float(fanIgnoreMask));
 }
 if(hits[0].w<0.&&hits[0].w>-100.)hits[0].w=-1.-closest;
 fragColor=hits[0];hitLayer1=hits[1];hitLayer2=hits[2];hitLayer3=hits[3];
}
`;
export const INDEPENDENT_FAN_ACCUMULATE_MAIN=`uniform sampler2D uImplicitPreviousHit;

layout(location=1) out vec4 implicitThroughColor;
void main(){
 vec2 originalUV=(gl_FragCoord.xy+uSampling.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;
 vec2 uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);
 vec3 origin=vec3(uv,4.8),direction=vec3(0.,0.,-1.);
 ivec2 pixel=ivec2(gl_FragCoord.xy);vec4 first=implicitLayer(0,pixel);
 vec4 color=uImplicitContinue>.5?texelFetch(uImplicitColor,pixel,0):vec4(0.,0.,0.,first.w);
 vec4 through=uImplicitContinue>.5?texelFetch(uImplicitThrough,pixel,0):vec4(1.,1.,1.,first.w>=0.?1.:0.);
 vec4 previousHit=uImplicitContinue>.5?texelFetch(uImplicitPreviousHit,pixel,0):vec4(0.,0.,0.,-1.);
 float lastDepth=previousHit.w<=-100.?max(-1.,previousHit.x):previousHit.w;
 if(through.a<.5){
  if(first.w>=0.){color.a=first.w;through.a=1.;}
  else color.a=max(color.a,first.w<=-100.?min(-1.,first.x):first.w);
 }
 for(int layer=0;layer<int(min(4.,uRuntime.w*.25));layer++){
  vec4 intersection=implicitLayer(layer,pixel);if(intersection.w<0.||max(max(through.r,through.g),through.b)<.001)break;
  fanSurfaceId=int(floor(intersection.x*.5));
  vec2 oct=vec2((intersection.x-2.*float(fanSurfaceId))*2.-1.,intersection.y);
  vec3 p=origin+direction*intersection.w,n=normalize(vec3(oct,1.-abs(oct.x)-abs(oct.y)));if(dot(n,direction)>0.)n=-n;
  implicitBehind=vec4(0.);implicitTransmission=vec3(0.);float issue;
  vec4 surface=shade(p,n,direction,true,issue);
  float fanBirth=smoothstep(.75,1.,uStructureFan);
  float fanScale=min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*.5;
  float coalescence=max(.0000001,3.*max(.02,uStructureA.y)*fanScale*(1.-uStructureFan));
  float gap=max(0.,intersection.w-lastDepth);
  float weight=lastDepth>=0.?mix(smoothstep(0.,coalescence,gap),1.,fanBirth):1.;
  vec3 beta=clamp(implicitTransmission,vec3(0.),vec3(1.));
  vec3 weightedBeta=weight>=1.?beta:pow(max(beta,vec3(.00000001)),vec3(weight));
  vec3 gain=(vec3(1.)-weightedBeta)/max(vec3(.000001),vec3(1.)-beta);
  gain=mix(gain,vec3(weight),greaterThan(beta,vec3(.99999)));
  color.rgb+=through.rgb*surface.rgb*gain;through.rgb*=weightedBeta;lastDepth=intersection.w;
 }
 fragColor=color;implicitThroughColor=through;
}`;
const FULL_FIELD_WRAPPER=`float field(vec3 world){
 float fields[22];for(int i=0;i<22;i++)fields[i]=10000.;
 int requested=fanQuery,count=int(uStructureC.w+.5),iterations=requested>=0?1:count+2;
 for(int slot=0;slot<iterations;slot++){
  int id=requested>=0?requested:slot<count?slot:20+slot-count;
  if(!fanComponentIncluded(id))continue;
  fanQuery=id;float value=fanCompleteField(world);
  if(requested>=0)return value;fields[id]=value;
 }
 fanQuery=-1;return fanSelectBoundary(fields,1.);
}`;
export function independentFanGeometry(shader,compact){
 shader=shader.replace('#version 300 es','#version 300 es\n#define FAN_TRANSPORT');
 if(compact){
  const from='if(uStructureFan>0.)d=mix(d,fanField(p),uStructureFan);';
  if(!shader.includes(from))throw new Error('Missing compact sheet geometry.');
  return shader.replace(from,'d=fanTransportField(d,p);');
 }
 // Prepare the common base at this exact query point, never across calls.
 // A selected leaf and its normal samples use the same path independently.
 let prepared=false;
 const partStart=shader.indexOf('vec3 fieldParts(vec3 world){');
 if(partStart>=0){
  let partEnd=shader.indexOf('{',partStart),partDepth=1;
  const bodyStart=partEnd+1;
  for(partEnd++;partDepth;partEnd++){if(shader[partEnd]==='{')partDepth++;else if(shader[partEnd]==='}')partDepth--;}
  const body=shader.slice(bodyStart,partEnd-1),split=body.indexOf('d=structureField(d,p);');
  if(split>=0){
   const prefix=body.slice(0,split),tail=body.slice(split);
   if(/\breturn\b|fanQuery/.test(prefix))throw new Error('Sheet base is no longer common.');
   const replacement='vec4 fanPreparedPoint;float fanPreparedVolume;\nvoid fanPrepareWorld(vec3 world){'+prefix+'fanPreparedPoint=vec4(p,d);fanPreparedVolume=volume;}\nvec3 fieldParts(vec3 world){vec3 p=fanPreparedPoint.xyz;float d=fanPreparedPoint.w,volume=fanPreparedVolume;'+tail+'}';
   shader=shader.slice(0,partStart)+replacement+shader.slice(partEnd);prepared=true;
  }
 }
 const start=shader.indexOf('float field(vec3 world){');
 if(start<0)throw new Error('Missing complete sheet geometry.');
 let end=shader.indexOf('{',start),depth=1;
 for(end++;depth;end++){if(shader[end]==='{')depth++;else if(shader[end]==='}')depth--;}
 const complete=shader.slice(start,end).replace('float field(','float fanCompleteField(');
 const wrapper=prepared?FULL_FIELD_WRAPPER.replace('float fields[22];','fanPrepareWorld(world);float fields[22];'):FULL_FIELD_WRAPPER;
 return shader.slice(0,start)+complete+'\n'+wrapper+shader.slice(end);
}

// Derive material coordinates from the exact geometry prefix. Base twist,
// bends, scaling and force deformations therefore cannot diverge from the
// sheet's coordinate chart when another control is enabled.
export function independentFanMaterialPoint(shader){
 const marker='vec3 fieldParts(vec3 world){',start=shader.indexOf(marker);
 if(start<0)throw new Error('Missing sheet coordinate transform.');
 const bodyStart=start+marker.length;
 let end=bodyStart,depth=1;
 for(;depth;end++){if(shader[end]==='{')depth++;else if(shader[end]==='}')depth--;}
 const body=shader.slice(bodyStart,end-1);
 let split=body.indexOf('float w=');
 if(split<0)split=body.indexOf('float d=');
 if(split<0)throw new Error('Missing sheet coordinate boundary.');
 const prefix=body.slice(0,split);
 if(/\breturn\b|fanQuery/.test(prefix))throw new Error('Sheet coordinates depend on a component.');
 const helper='vec3 fanMaterialPoint(vec3 world){'+prefix+'return p;}\n';
 return shader.slice(0,start)+'#define FAN_MATERIAL_COORDS 1\n'+helper+shader.slice(start);
}
