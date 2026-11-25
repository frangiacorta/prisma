import {ImplicitRayStatus} from './implicit-ray-status.js?v=b3646b8af04a';
import {INDEPENDENT_FAN_HIT_MAIN,INDEPENDENT_FAN_ACCUMULATE_MAIN,independentFanGeometry,independentFanMaterialPoint} from './implicit-fan-geometry.js?v=b3646b8af04a';
import {GROWTH_GLSL,GROWTH_GEOMETRY_KEYS,growthGeometryEnabled,growthFieldAt,growthNormalOffset,prepareGrowth,prepareGrowthAsync,bindGrowth,disposeGrowth} from './growth-material.js?v=b3646b8af04a';
import {IMPLICIT_SURFACE_UNIFORMS,IMPLICIT_SURFACE_MAIN,IMPLICIT_ACCUMULATE_MAIN} from './implicit-surface-pass.js?v=b3646b8af04a';
import {ImplicitHitPass,IMPLICIT_HIT_MAIN,FRACTAL_HIT_MAIN} from './implicit-hit-pass.js?v=b3646b8af04a';
import {hasSolidForces,solidForceSlope,solidForceMap,withSolidForces,uploadSolidForces} from './solid-forces.js?v=b3646b8af04a';
import {baseFormField,baseFormUniforms,BASE_FORM_GLSL,FIGURE_SCALE} from './base-forms.js?v=b3646b8af04a';
import {STRUCTURE_DEFAULTS,STRUCTURE_FIELD_KEYS,STRUCTURE_META,STRUCTURE_GLSL,hasStructure,structureMayChange,structureBounds,structureUniforms,structureWarp,structureField,loopBlend} from './structure-model.js?v=b3646b8af04a';
import {CELLULAR_FIELD_KEYS,CELLULAR_GLSL,CELLULAR_META,CELLULAR_PHASES,cellularBounds,cellularField,cellularMayChange,uploadCellular} from './cellular-form.js?v=b3646b8af04a';
import {FRACTAL_GLSL,FRACTAL_KEYS,FRACTAL_META,fractalBounds,fractalField,uploadFractal} from './fractal-form.js?v=b3646b8af04a';
import {META} from './model.js?v=b3646b8af04a';
import {hasMotionPoints,isMotionAngle,motionPointOffset,motionPointValue} from './motion-keyframes.js?v=b3646b8af04a';
import {motionPeriod} from './animation-clock.js?v=b3646b8af04a';
// This module is intentionally self-contained: exported HTML wallpapers run offline.
// Shared procedural coating; reuses Prisma's spectral thin-film reflection below.
// Periodic 3D domain warp changes optical thickness, never screen-space pigment.
export const FILM_PATTERN_GLSL=`
uniform vec4 uFilmPattern;
uniform vec3 uFilmAccent;
float coatingField(vec3 q,float phase,float flow,float swirl){
 q*=uFilmPattern.y;
 vec3 t=flow*vec3(sin(phase),cos(phase),sin(phase+.9));
 vec3 w=sin(q.yzx*1.7+t+vec3(.3,2.1,4.2));
 q+=uFilmPattern.z*(w+.4*sin(q.zxy*3.1-w*1.3+swirl*sin(phase)));
 float broad=sin(q.x*1.8+sin(q.y*1.7+t.x)+q.z*.8);
 // The zero endpoint retains the original field without arithmetic blending.
 // Islands change only the spatial distribution of optical thickness.
 if(uFilmAccent.z>0.){
  float islands=.78*sin(q.x*1.8+sin(q.z*1.3+t.x))*cos(q.y*1.7+sin(q.z*1.1+t.y))+.22*sin(q.z*1.9+sin(q.x*1.1+t.z));
  broad=mix(broad,islands,uFilmAccent.z);
 }
 float fine=sin(q.y*4.6+sin(q.z*3.8+t.y)+q.x*2.3);
 float micro=sin(q.z*9.1+q.y*6.7+sin(q.x*5.3-t.z));
 return (broad+.45*uFilmPattern.w*fine+.16*uFilmPattern.w*micro)/(1.+.61*uFilmPattern.w);
}
float coatingThickness(vec3 local,float phase,float flow,float swirl,float base,float original){
 if(uFilmPattern.x<=0.)return original;
 float field=coatingField(local,phase,flow,swirl);
 return mix(original,max(20.,base*(1.+.78*field)),uFilmPattern.x);
}
vec3 coatingContrast(vec3 film){
 float peak=max(max(film.r,film.g),film.b);
 if(uFilmAccent.x>0.){
  vec3 separated=pow(clamp(film/max(.0001,peak),0.,1.),vec3(1.+uFilmAccent.x*1.8));
  film=mix(film,separated*min(.98,peak*(1.+uFilmAccent.x*3.)),uFilmAccent.x);
 }
 if(uFilmAccent.y>0.){
  // Optional art direction of reflected colour only; not spectral accuracy.
  float balance=film.r/max(.0001,film.r+film.b);
  vec3 blue=vec3(.004,.035,1.),gold=vec3(1.,.38,.009),cyan=vec3(.005,.8,1.);
  vec3 duo=mix(blue,gold,smoothstep(.42,.64,balance));
  duo=mix(duo,cyan,exp(-pow((balance-.38)/.09,2.))*.85);
  film=mix(film,duo*max(max(film.r,film.g),film.b),uFilmAccent.y);
 }
 return film;
}
`;
const TAU=Math.PI*2;
const CELLULAR_LIMITS=Object.fromEntries(Object.entries(CELLULAR_META).map(([key,m])=>[key,m.slice(1,3)]));
const EXTRA_MOTION_LIMITS=Object.fromEntries(['pBreath','pSignal','pPropagation','pVortex','pTravel','stretchX','stretchY','stretchZ','exposure','focusBlur','focusDepth'].map(key=>[key,META[key].slice(1,3)]));
const MOTION_LIMITS={pOpening:[0,1],pThickness:[.02,1],pLobeDepth:[0,1],lobeAmount:[0,.4],filmIslands:[0,1],finishPaletteMap:[0,1],finishPaletteScale:[0,4],finishPaletteOffset:[-1,1],finishPaletteBlur:[0,1],finishPrintNegative:[0,1],sceneGrains:[0,1],grainDispersal:[0,1],...Object.fromEntries(Object.entries(FRACTAL_META).map(([key,m])=>[key,m.slice(1,3)])),...Object.fromEntries(Object.entries(STRUCTURE_META).map(([k,v])=>[k,v.slice(1,3)])),pCellAmount:[0,1],pCellAspect:[-1,1],pCellRelief:[0,1],pCellLight:[-1,1],pVeilStyle:[0,2],pVeilMorph:[0,1],pVeilSpread:[0,1],volume:[.08,1.5],deform:[0,.75],twist:[-2.5,2.5],waves:[0,.4],hole:[0,.95],cut:[0,1.6],scale:FIGURE_SCALE,positionX:[-4.5,4.5],positionY:[-4.5,4.5],iridescence:[0,1],roughness:[0,1],transparency:[0,1],petalOpen:[0,1],petalCurl:[-1,1],petalInflate:[0,1],petalSharp:[0,1],petalBlend:[0,1],petalRoot:[0,1],petalRandom:[0,1],petalGrowth:[0,1],petalWeave:[0,1],petalWander:[0,1],petalCoil:[-1,1],petalReentry:[0,1],petalKnots:[0,1],petalRidges:[0,1],petalDisorder:[0,1],stemBend:[-1,1]};
function motionCycles(value,source){const n=Math.max(.1,Number(value)||1);return source?.perfectLoop===false?n:Math.max(1,Math.round(n));}
export function motionClock(t,phase,source){
 const raw=phase/TAU*motionCycles(t.cycles,source)+(t.phase||0)/360*(t.direction||1),whole=Math.floor(raw);let u=raw-whole;
 const hold=Math.max(0,Math.min(.8,t.hold||0));
 if(hold>0){u=Math.max(0,Math.min(1,(u-hold/2)/(1-hold)));u-=Math.sin(TAU*u)/TAU;}
 const shift=(t.pacePhase||0)*Math.PI/180;u+=(t.pace||0)*(Math.sin(TAU*u-shift)+Math.sin(shift))/TAU;
 return (whole+u)*TAU*(t.direction||1);
}
function motionWave(t,phase,source){const a=motionClock(t,phase,source);const x=Math.sin(a);return t.curve==='triangle'?2/Math.PI*Math.asin(x):t.curve==='soft'?x*Math.abs(x):x}
// Inter-root contact branches are stable for material flow and rigid transforms.
// Keep independent path tracks saved, but suspend them until contacts are off.
export function rootMotionSuspended(s,key){return (s.petalCollision||0)>0&&key.startsWith('petal')&&key!=='petalFlowPhase';}
export function sampleFrame(source,phase=0){
 // Identical endpoints feed identical weights into thin boundaries. A full
 // turn in a GPU float can otherwise disturb grazing pixels at the splice.
 if(source.perfectLoop!==false&&Math.abs(phase-Math.round(phase/TAU)*TAU)<1e-9)phase=0;
 const s={...source,lights:(source.lights||[]).map(l=>({...l}))};

 for(const [key,t] of Object.entries(source.motions||{})){
  if(hasMotionPoints(t)&&META[key]&&!rootMotionSuspended(source,key)){
   const offset=motionPointOffset(t.points,phase/TAU,isMotionAngle(key));
   s[key]=motionPointValue(key,source[key]??0,offset,META[key]);
   continue;
  }
  if(!t.enabled||rootMotionSuspended(source,key))continue;const continuous=t.mode==='cycle'&&(key.startsWith('rotate')||key==='gradientOffset'||key==='colorWavePhase'||key==='petalPhase'||key==='petalFlowPhase'||key==='petalOrbitPhase'||key==='structFlowPhase'||key==='loopPhase'||key==='filPhase'||CELLULAR_PHASES.includes(key));
  const value=continuous?(motionClock(t,phase,source)/TAU)*(key.startsWith('rotate')||key==='petalPhase'?360:1):motionWave(t,phase,source)*(t.amplitude||0)*(key.startsWith('pVeil')||key.startsWith('pCell')||key==='cellMorph'?1:(source.motion??.3)/.3);
  const limits=MOTION_LIMITS[key]||CELLULAR_LIMITS[key]||EXTRA_MOTION_LIMITS[key];
  s[key]=(source[key]??(key==='petalGrowth'||key==='sceneGrains'&&source.engine==='particles'?1:0))+value;if(limits&&!continuous)s[key]=Math.max(limits[0],Math.min(limits[1],s[key]));
 }
 // Sample the growth that reached the upper shoot a moment earlier.
 // Absolute phase gives identical inertia when scrubbing, exporting or looping.
 if(s.structWeaveFlex>0&&s.structWeaveTension>0){
  const track=source.motions?.structWeaveGrowth,turns=phase/TAU;
  const lag=(.16+.32*s.structDelay)/motionPeriod(source);
  const prior=turn=>{
   if(hasMotionPoints(track))return motionPointValue('structWeaveGrowth',source.structWeaveGrowth,motionPointOffset(track.points,turn),META.structWeaveGrowth);
   if(track?.enabled)return Math.max(0,Math.min(1,source.structWeaveGrowth+motionWave(track,turn*TAU,source)*(track.amplitude||0)*(source.motion??.3)/.3));
   return s.structWeaveGrowth;
  };
  s._weaveLag=prior(turns-lag)-s.structWeaveGrowth;
  s._weaveRecoil=prior(turns-2*lag)-prior(turns-lag)-s._weaveLag;
 }
 if(!source.motions){if(source.animateRotation)s.rotateY+=phase*180/Math.PI;if(source.animateShape){s.volume*=1+Math.sin(phase)*source.motion*.4;s.deform+=Math.sin(phase)*source.motion*.16}if(source.animateColor)s.gradientOffset+=phase/TAU;}
 for(const l of s.lights){if(l.orbit?.enabled){const t=l.orbit,a=t.mode==='cycle'?motionClock(t,phase,source):motionWave(t,phase,source)*t.amplitude*Math.PI/180*(source.motion??.3)/.3;const cs=Math.cos(a),sn=Math.sin(a);if(t.axis==='x'){[l.y,l.z]=[l.y*cs-l.z*sn,l.y*sn+l.z*cs]}else if(t.axis==='z'){[l.x,l.y]=[l.x*cs-l.y*sn,l.x*sn+l.y*cs]}else{[l.x,l.z]=[l.x*cs-l.z*sn,l.x*sn+l.z*cs]}}if(l.pulse?.enabled)l.power=Math.max(0,l.power*(1+motionWave(l.pulse,phase,source)*l.pulse.amplitude*(source.motion??.3)/.3))}
 if(growthGeometryEnabled(source))s._growthPhase=((phase%TAU)+TAU)%TAU;
 if(source.environmentRotate)s.environmentAngle=(source.environmentAngle||0)+phase*180/Math.PI*motionCycles(source.environmentCycles,source);
 return s;
}
const VERT=`#version 300 es
layout(location=0) in vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const FRAG=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uFilCore;
uniform vec4 uShape,uWarp,uVoid,uCut,uMat,uSurface,uGradient,uFrame,uOther;
uniform vec4 uExtraShape,uExtraShape2,uExtraShape3,uCoat,uOptics,uTexture,uPhoto1,uPhoto2,uPhoto3,uPhoto4;
uniform vec4 uInterior,uScatter,uRuntime,uTransport;
uniform vec3 uSssColor;
uniform vec3 uPalette[12],uBg,uBg2;
uniform vec4 uBackdrop;
uniform vec4 uLights[8],uLightProps[8],uLightExtra[8];
uniform vec3 uLightColors[8];
uniform int uPaletteCount,uLightCount;
uniform vec3 uPaletteMean;
uniform float uBgMode,uBgAngle,uSeed;
const float PI=3.14159265359;
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 transform(vec3 p){p.xy-=uFrame.yz;p/=uFrame.x;p.xy=rot(uExtraShape3.z)*p.xy;p.xz=rot(uOther.x)*p.xz;p.yz=rot(uOther.y)*p.yz;return p;}
float smax(float a,float b,float k){if(k<.0001)return max(a,b);float h=max(k-abs(a-b),0.)/k;return max(a,b)+h*h*k*.25;}
vec3 fieldParts(vec3 world){
 vec3 p=transform(world);float volume=max(.06,uShape.x*uShape.w);p/=vec3(uShape.y,uShape.z,volume);
 p.xz=rot(uWarp.z*p.y*.7)*p.xz;
 p.x-=uWarp.y*(p.y*p.y-.25)+uExtraShape.z*(p.y*p.y-.3);p.y-=uExtraShape.w*(p.x*p.x-.3);
 p.x*=1.-uWarp.y*p.y*.18;p.xz/=max(.35,1.-uExtraShape.y*p.y*.45);
 p.x*=1.+uExtraShape2.z*exp(-p.y*p.y*4.);
 float w=sin(p.x*3.4+uSeed)*sin(p.y*2.6)*cos(p.z*3.+.6);
 float ripple=sin(p.x*uWarp.w*2.)*sin(p.y*uWarp.w*1.7)*sin(p.z*uWarp.w*1.6+1.);
 float exponent=2.+uExtraShape.x*6.;float norm=pow(pow(abs(p.x),exponent)+pow(abs(p.y),exponent)+pow(abs(p.z),exponent),1./exponent);
 float lobe=sin(atan(p.y,p.x)*uExtraShape2.y)*uExtraShape2.x*(1.-min(1.,abs(p.z))*.65);
 float d=norm-1.-uWarp.x*w-uOther.z*ripple*.17-lobe;
 float innerPower=2.+uVoid.w*5.;vec2 hp=abs((p.xy-uVoid.yz)/vec2(uExtraShape3.x,1.));
 float inner=pow(pow(hp.x,innerPower)+pow(hp.y,innerPower),1./innerPower)-uVoid.x;
 float hole=uVoid.x>.001?-inner:-10000.,cut=uCut.x>.001?uCut.x-length((p.xy-uCut.yz)/vec2(uExtraShape3.y,1.)):-10000.;
 return vec3(d,hole,cut)*min(min(uShape.y,uShape.z),volume)*uFrame.x*.5;
}
float field(vec3 world){vec3 parts=fieldParts(world);float k=uExtraShape2.w*min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*.5;return smax(smax(parts.x,parts.y,k),parts.z,k);}
// Shared solid/cavity field. No material or preset can replace this geometry.
float wallDepth(){return mix(1.,uInterior.y,uInterior.x)*min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*.5;}
bool hasCavity(){return uInterior.x*(1.-uInterior.y)>.0001;}
float materialField(vec3 p){float d=field(p);return hasCavity()?max(d,-d-wallDepth()):d;}
float traceField(vec3 p,bool outerOnly){float d=field(p);return !outerOnly&&hasCavity()?max(d,-d-wallDepth()):d;}
float rayEpsilon(){return min(.00003,max(.000002,wallDepth()*.02));}
vec3 axes(){return vec3(uShape.y,uShape.z,max(.06,uShape.x*uShape.w));}
// Pull the analytic derivatives of the shared field through every deformation Jacobian.
vec3 surfaceGradient(vec3 world){
 vec3 size=axes(),p=transform(world)/size;mat3 jacobian=mat3(1.);
 float angle=uWarp.z*p.y*.7,cs=cos(angle),sn=sin(angle),speed=uWarp.z*.7;p.xz=rot(angle)*p.xz;
 jacobian=mat3(vec3(cs,0,-sn),vec3(speed*p.z,1,-speed*p.x),vec3(sn,0,cs))*jacobian;
 float dxdy=-2.*p.y*(uWarp.y+uExtraShape.z);p.x-=uWarp.y*(p.y*p.y-.25)+uExtraShape.z*(p.y*p.y-.3);
 jacobian=mat3(vec3(1,0,0),vec3(dxdy,1,0),vec3(0,0,1))*jacobian;
 float dydx=-2.*uExtraShape.w*p.x;p.y-=uExtraShape.w*(p.x*p.x-.3);
 jacobian=mat3(vec3(1,dydx,0),vec3(0,1,0),vec3(0,0,1))*jacobian;
 float factor=1.-uWarp.y*p.y*.18;dxdy=-uWarp.y*.18*p.x;p.x*=factor;
 jacobian=mat3(vec3(factor,0,0),vec3(dxdy,1,0),vec3(0,0,1))*jacobian;
 float taper=max(.35,1.-uExtraShape.y*p.y*.45),taperDerivative=taper>.350001?uExtraShape.y*.45/(taper*taper):0.;
 jacobian=mat3(vec3(1./taper,0,0),vec3(p.x*taperDerivative,1,p.z*taperDerivative),vec3(0,0,1./taper))*jacobian;p.xz/=taper;
 float pinch=uExtraShape2.z*exp(-p.y*p.y*4.);factor=1.+pinch;dxdy=-8.*p.y*pinch*p.x;p.x*=factor;
 jacobian=mat3(vec3(factor,0,0),vec3(dxdy,1,0),vec3(0,0,1))*jacobian;
 float exponent=2.+uExtraShape.x*6.,norm=pow(dot(pow(abs(p),vec3(exponent)),vec3(1.)),1./exponent);
 vec3 gradient=sign(p)*pow(abs(p),vec3(exponent-1.))/pow(max(.00001,norm),exponent-1.);
 float sx=sin(p.x*3.4+uSeed),sy=sin(p.y*2.6),cz=cos(p.z*3.+.6);
 gradient-=uWarp.x*vec3(3.4*cos(p.x*3.4+uSeed)*sy*cz,2.6*sx*cos(p.y*2.6)*cz,-3.*sx*sy*sin(p.z*3.+.6));
 vec3 freq=vec3(2.,1.7,1.6)*uWarp.w,osc=p*freq+vec3(0,0,1),si=sin(osc),co=cos(osc);
 gradient-=uOther.z*.17*freq*vec3(co.x*si.y*si.z,si.x*co.y*si.z,si.x*si.y*co.z);
 float theta=atan(p.y,p.x),lobeWave=sin(theta*uExtraShape2.y),lobeFade=1.-min(1.,abs(p.z))*.65,lobeSlope=cos(theta*uExtraShape2.y)*uExtraShape2.y*uExtraShape2.x*lobeFade;
 gradient-=vec3(vec2(-p.y,p.x)/max(.000001,dot(p.xy,p.xy))*lobeSlope,abs(p.z)<1.?-lobeWave*uExtraShape2.x*.65*sign(p.z):0.);
 float innerPower=2.+uVoid.w*5.;vec2 hp=(p.xy-uVoid.yz)/vec2(uExtraShape3.x,1.);float innerNorm=pow(dot(pow(abs(hp),vec2(innerPower)),vec2(1.)),1./innerPower);
 vec3 holeGradient=vec3(-sign(hp)*pow(abs(hp),vec2(innerPower-1.))/pow(max(.00001,innerNorm),innerPower-1.)/vec2(uExtraShape3.x,1.),0.);
 vec2 cp=(p.xy-uCut.yz)/vec2(uExtraShape3.y,1.);vec3 cutGradient=vec3(-cp/max(.00001,length(cp))/vec2(uExtraShape3.y,1.),0.);
 vec3 parts=vec3(norm-1.-uWarp.x*sx*sy*cz-uOther.z*.17*si.x*si.y*si.z-lobeWave*uExtraShape2.x*lobeFade,uVoid.x>.001?uVoid.x-innerNorm:-10000.,uCut.x>.001?uCut.x-length(cp):-10000.)*min(min(size.x,size.y),size.z)*uFrame.x*.5;float k=uExtraShape2.w*min(min(size.x,size.y),size.z)*uFrame.x*.5;
 float h=k>.000001?clamp((parts.x-parts.y)/k*.5+.5,0.,1.):step(parts.y,parts.x),combined=smax(parts.x,parts.y,k),j=k>.000001?clamp((combined-parts.z)/k*.5+.5,0.,1.):step(parts.z,combined);
 gradient=transpose(jacobian)*(gradient*h*j+holeGradient*(1.-h)*j+cutGradient*(1.-j));gradient/=size;
 gradient.yz=rot(-uOther.y)*gradient.yz;gradient.xz=rot(-uOther.x)*gradient.xz;gradient.xy=rot(-uExtraShape3.z)*gradient.xy;
 return gradient*min(min(size.x,size.y),size.z)*.5;
}
vec3 surfaceNormal(vec3 p){vec3 n=surfaceGradient(p);return length(n)>.000001?normalize(n):vec3(0,0,1);}
vec3 offsetBoundary(vec3 p,vec3 direction,bool inside){float eps=rayEpsilon(),probe=.0001,derivative=abs((field(p+direction*probe)-field(p-direction*probe))/(2.*probe));float stepSize=clamp(eps*6./max(.0001,derivative),eps*6.,.001*uFrame.x);vec3 next=p+direction*stepSize;for(int i=0;i<int(uRuntime.w)/2;i++){if((materialField(next)<0.)==inside)break;stepSize*=.5;next=p+direction*stepSize;}return next;}
vec3 boundaryNormal(vec3 p){vec3 n=surfaceNormal(p);float d=field(p);return hasCavity()&&-d-wallDepth()>d?-n:n;}
vec2 ellipsoidRoots(vec3 origin,vec3 direction,float radius){vec3 o=transform(origin)/axes(),d=(transform(origin+direction)-transform(origin))/axes();float a=dot(d,d),b=dot(o,d),disc=b*b-a*(dot(o,o)-radius*radius);if(disc<0.)return vec2(100.,-100.);float root=sqrt(disc);return vec2((-b-root)/a,(-b+root)/a);}
float firstRoot(vec2 roots){float e=rayEpsilon()*2.;return roots.x>e?roots.x:roots.y>e?roots.y:100.;}
vec2 objectInterval(vec3 origin,vec3 direction){vec3 o=transform(origin),d=transform(origin+direction)-transform(origin),extent=axes()*4.5;vec3 inv=vec3(1.)/mix(vec3(.0000001),d,greaterThan(abs(d),vec3(.0000001)));vec3 a=(-extent-o)*inv,b=(extent-o)*inv;vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));}
bool traceBoundary(vec3 origin,vec3 direction,float maximum,bool outerOnly,out vec3 point,out float travel){
 float eps=rayEpsilon();
 if(uScatter.y>.5){float t=firstRoot(ellipsoidRoots(origin,direction,1.));if(!outerOnly&&hasCavity())t=min(t,firstRoot(ellipsoidRoots(origin,direction,uInterior.x*(1.-uInterior.y))));travel=t;point=origin+direction*t;return t<maximum;}
 vec2 interval=objectInterval(origin,direction);float t=max(0.,interval.x),end=min(maximum,interval.y);
 if(t>end){travel=end;point=origin+direction*end;return false;}
 float previousT=t,previousD=traceField(origin+direction*t,outerOnly);
 float a=t,b=t,da=previousD;bool found=false;
 for(int j=0;j<int(uRuntime.w)*14;j++){
  if(t>end)break;point=origin+direction*t;float d=traceField(point,outerOnly);
  if(j>0&&d*previousD<0.){a=previousT;b=t;da=previousD;found=true;break;}
  float derivative=(field(point+direction*.0005)-field(point-direction*.0005))/.001,outer=field(point);if(!outerOnly&&hasCavity()&&-outer-wallDepth()>outer)derivative=-derivative;
  if(abs(d)<eps&&t>eps*3.){
   float ahead=min(end-t,min(.18*uFrame.x,max(eps*12.,eps*8./max(.0001,abs(derivative))))),after=traceField(origin+direction*(t+ahead),outerOnly);
   if(previousD*after<0.){a=previousT;b=t+ahead;da=previousD;found=true;break;}
   previousT=t;if(abs(d)>eps*.001)previousD=d;t+=max(ahead,eps*12.);
  }else{float stepSize=abs(derivative)>.00001?abs(d/derivative)*.65:abs(d)*uRuntime.y;previousT=t;previousD=d;t+=max(min(stepSize,.18*uFrame.x),eps*1.5);}
 }
 if(found){for(int k=0;k<int(uRuntime.w);k++){float m=(a+b)*.5,dm=traceField(origin+direction*m,outerOnly);if(da*dm>0.){a=m;da=dm;}else b=m;}travel=(a+b)*.5;}else travel=end;
 point=origin+direction*travel;return found;
}
vec3 palette(float t){float v=fract(t)*float(uPaletteCount);int i=int(floor(v)),j=(i+1)%uPaletteCount;float f=smoothstep(.5-max(.012,min(1.,uGradient.w))*.5,.5+max(.012,min(1.,uGradient.w))*.5,fract(v));vec3 color=mix(uPalette[i],uPalette[j],f);if(uGradient.w>1.){color=mix(color,uPaletteMean,smoothstep(1.,3.,uGradient.w));}return color;}
vec3 bg(vec2 p){
 if(uBgMode==3.){
  float t=1.-smoothstep(uBackdrop.x-uBackdrop.y,uBackdrop.x+uBackdrop.y,p.y);
  vec3 color=mix(uBg,uBg2,t);
  float wash=exp(-dot(p/vec2(2.6,3.8),p/vec2(2.6,3.8))*1.8);
  color=mix(color,min(vec3(1.),color+vec3(.08)),wash*uBackdrop.z);
  return color*(1.-uBackdrop.w*smoothstep(.8,3.2,length(p/vec2(1.,1.3))));
 }
 float t=dot(p,vec2(cos(uBgAngle),sin(uBgAngle)))*.35+.5;return mix(uBg,uBg2,uBgMode==1.?clamp(t,0.,1.):0.);
}
bool transparentExport(){return uBgMode==2.&&uRuntime.x<.5;}
vec3 backdrop(vec3 origin,vec3 direction){float z=-max(3.,max(max(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*1.6+1.);float t=(z-origin.z)/(abs(direction.z)>.0001?direction.z:-.0001);vec2 p=(origin+direction*max(0.,t)).xy;if(uBgMode==2.){if(transparentExport())return vec3(1.);float cell=.17;vec2 square=p/cell,width=vec2(max(.02,3.4/min(uResolution.x,uResolution.y)/cell));vec2 a=square-width*.5,b=square+width*.5;vec2 stripe=((.5-abs(mod(b,2.)-1.))-(.5-abs(mod(a,2.)-1.)))/width;float checker=.5-.5*stripe.x*stripe.y;return mix(vec3(.57),vec3(.87),clamp(checker,0.,1.));}return bg(p);}
float fixture(vec2 q,vec4 props,vec4 extra){float width=max(.04,props.x),height=max(.04,props.y),soft=max(.015,extra.x),d;
 if(props.w<.5){d=length(q/width)-1.;return 1.-smoothstep(-soft,soft,d);}
 if(props.w<1.5){d=max(abs(q.x)/width,abs(q.y)/height)-1.;return 1.-smoothstep(-soft,soft,d);}
 if(props.w<2.5){d=length(q)/max(.06,extra.y);return pow(max(0.,1.-d*d),mix(6.,.7,soft));}
 if(props.w<3.5)return exp(-dot(q/vec2(width,height),q/vec2(width,height))*mix(2.5,.6,soft));
 if(props.w<4.5){float box=1.-smoothstep(-soft,soft,max(abs(q.x)/width,abs(q.y)/height)-1.);vec2 wave=abs(sin(q/vec2(width,height)*extra.z*PI*.5));return box*smoothstep(.25,.55,wave.x)*smoothstep(.25,.55,wave.y);}
 d=abs(length(q/width)-.8);return 1.-smoothstep(.05,.08+soft*.35,d);
}
vec4 sceneEmitters(vec3 origin,vec3 direction,float maximum,out float nearest){vec3 col=vec3(0.);float coverage=0.;nearest=100.;for(int i=0;i<uLightCount;i++){if(uLightExtra[i].w<.5||uLights[i].w<.001)continue;vec3 center=uLights[i].xyz,n=length(center)>.001?normalize(center):vec3(0,0,1);float den=dot(direction,n);if(abs(den)<.0001)continue;float t=dot(center-origin,n)/den;if(t<.001||t>=maximum)continue;vec3 right=normalize(cross(abs(n.y)>.98?vec3(1,0,0):vec3(0,1,0),n)),up=cross(n,right),off=origin+direction*t-center;vec2 q=rot(uLightProps[i].z)*vec2(dot(off,right),dot(off,up));vec4 props=uLightProps[i];if(props.w>1.5&&props.w<2.5)props.w=0.;float mask=fixture(q,props,uLightExtra[i]);if(mask<.001)continue;vec3 radiance=uLightColors[i]*uLights[i].w*1.5;if(t<nearest)col=col*(1.-mask)+radiance*mask;else col+=radiance*mask*(1.-coverage);coverage=1.-(1.-coverage)*(1.-mask);nearest=min(nearest,t);}return vec4(col,coverage);}
vec4 sceneRay(vec3 origin,vec3 direction,out float nearest){vec4 lights=sceneEmitters(origin,direction,100.,nearest);return vec4(lights.rgb+backdrop(origin,direction)*(1.-lights.a),lights.a);}
vec3 envLight(vec3 r,vec3 p,int i,float rough){vec3 offset=uLights[i].xyz-p;float distance=max(.25,length(offset));vec3 ld=offset/distance;float facing=dot(r,ld);if(facing<=.01)return vec3(0.);vec3 right=normalize(cross(abs(ld.y)>.98?vec3(1,0,0):vec3(0,1,0),ld)),up=cross(ld,right);vec2 q=rot(uLightProps[i].z)*vec2(dot(r,right),dot(r,up))/max(.1,facing)*distance;vec2 anis=rot(uTexture.y)*q;anis*=vec2(1.-uTexture.x*.75,1.+uTexture.x*.6);q=mix(q,anis,uTexture.x);vec4 props=uLightProps[i];props.xy+=rough*.9;vec4 extra=uLightExtra[i];extra.x=clamp(extra.x+rough*.5,.01,1.);if(props.w>1.5&&props.w<2.5)q/=distance;return uLightColors[i]*uLights[i].w*fixture(q,props,extra)*1.5;}
vec3 environment(vec3 direction,vec3 p,float rough){vec3 col=uBgMode==2.?vec3(.7):bg(p.xy+direction.xy*2.);for(int i=0;i<uLightCount;i++){col+=envLight(direction,p,i,rough);}return col;}
// Exact unpolarized dielectric Fresnel and Snell's law, for either direction across a boundary.
vec3 fresnel(float cosine,float n1,float n2,vec3 local){if(abs(n1-n2)<.000001)return vec3(0.);float ci=clamp(abs(cosine),0.,1.),eta=n1/n2,st2=eta*eta*(1.-ci*ci);if(st2>=1.)return vec3(1.);float ct=sqrt(max(0.,1.-st2));float rs=(n1*ci-n2*ct)/max(.000001,n1*ci+n2*ct),rp=(n1*ct-n2*ci)/max(.000001,n1*ct+n2*ci);float f=(rs*rs+rp*rp)*.5;if(abs(n1-n2)<.000001)f=0.;f=clamp(f*uCoat.z,0.,1.);float film=uScatter.w*(1.+sin(local.y*2.6+local.x*1.7)*.17+uCoat.w*.4);vec3 interference=.5+.5*cos(4.*PI*max(n1,n2)*film*ct/vec3(650.,510.,475.));return mix(vec3(f),clamp(vec3(f)*(.35+1.65*interference),0.,1.),uScatter.z);}
vec3 absorptionCoefficient(vec3 tint){return (vec3(uOptics.z*.7)+(vec3(1.)-tint)*uOptics.w*1.7+(vec3(1.)-uSssColor)*uTransport.x*.6/max(.03,uTransport.y))*max(.001,uSurface.y);}
float scatteringCoefficient(){
#if VOLUME_ENABLED
 return (uInterior.w*4.+uInterior.z*3.+uTransport.x*.5/max(.03,uTransport.y))*max(.001,uSurface.y);
#else
 return 0.;
#endif
}
float materialLength(vec3 a,vec3 b){vec3 delta=b-a;float lengthOfRay=length(delta);if(lengthOfRay<.0001)return 0.;vec3 direction=delta/lengthOfRay;if(uScatter.y>.5){vec2 outer=ellipsoidRoots(a,direction,1.);float distance=max(0.,min(lengthOfRay,outer.y)-max(0.,outer.x));if(hasCavity()){vec2 inner=ellipsoidRoots(a,direction,uInterior.x*(1.-uInterior.y));distance-=max(0.,min(lengthOfRay,inner.y)-max(0.,inner.x));}return max(0.,distance);}float occupied=0.;for(int k=0;k<int(uRuntime.w);k++){vec3 q=a+delta*(float(k)+.5)/16.;occupied+=materialField(q)<0.?1.:0.;}return occupied*lengthOfRay/16.;}
float phaseHG(float cosine,float g){return (1.-g*g)/(4.*PI*pow(max(.001,1.+g*g-2.*g*cosine),1.5));}
#if VOLUME_ENABLED
vec3 segmentScattering(vec3 origin,vec3 direction,float distance,vec3 sigmaA,float sigmaS){if(sigmaS<.0001||distance<.000001)return vec3(0.);vec3 integral=vec3(0.);for(int k=0;k<int(uRuntime.w)/4;k++){float s=distance*(float(k)+.5)/4.;vec3 q=origin+direction*s,incident=vec3(0.);for(int i=0;i<uLightCount;i++){vec3 off=uLights[i].xyz-q;float d=max(.05,length(off));float area=max(.02,uLightProps[i].x*uLightProps[i].y*4.);float path=materialLength(q,uLights[i].xyz);vec3 incoming=uLightColors[i]*uLights[i].w*1.5*area/(d*d+area)*exp(-(sigmaA+vec3(sigmaS))*path);float phase=phaseHG(dot(off/d,direction),uScatter.x);phase=mix(phase,1./(4.*PI),uTransport.x);incident+=incoming*phase;}integral+=exp(-(sigmaA+vec3(sigmaS))*s)*incident*sigmaS*distance/4.;}return integral;}
#else
vec3 segmentScattering(vec3 origin,vec3 direction,float distance,vec3 sigmaA,float sigmaS){return vec3(0.);}
#endif
// Diffusion dipole BSSRDF: a geometric entry point, reduced scattering and absorption profile.
vec3 dipoleProfile(float radius,vec3 sigmaA,float sigmaSp,float ior){vec3 sigmaT=sigmaA+sigmaSp,alpha=sigmaSp/sigmaT,zr=vec3(1.)/sigmaT;float fdr=clamp(-1.44/(ior*ior)+.71/ior+.668+.0636*ior,0.,.95),A=(1.+fdr)/(1.-fdr);vec3 zv=zr*(1.+4.*A/3.),sigmaTr=sqrt(3.*sigmaA*sigmaT),dr=sqrt(vec3(radius*radius)+zr*zr),dv=sqrt(vec3(radius*radius)+zv*zv);return alpha/(4.*PI)*(zr*(sigmaTr+vec3(1.)/dr)*exp(-sigmaTr*dr)/(dr*dr)+zv*(sigmaTr+vec3(1.)/dv)*exp(-sigmaTr*dv)/(dv*dv));}
#if SSS_ENABLED
vec3 subsurfaceLight(vec3 p,vec3 n,vec3 tint){if(uTransport.x<.001)return vec3(0.);vec3 total=vec3(0.),sigmaA=absorptionCoefficient(tint);float sigmaSp=1./max(.03,uTransport.y);for(int i=0;i<uLightCount;i++){vec3 target=p-n*rayEpsilon()*12.,direction=normalize(target-uLights[i].xyz),entry,normal;float travel;if(!traceBoundary(uLights[i].xyz,direction,length(target-uLights[i].xyz)+.01,true,entry,travel))continue;normal=surfaceNormal(entry);float incident=max(.03,dot(normal,-direction)),r=length(p-entry),area=max(.03,uLightProps[i].x*uLightProps[i].y*4.);vec3 flux=uLightColors[i]*uLights[i].w*1.5*incident*area/(.2+travel*travel);vec3 profile=dipoleProfile(r,sigmaA,sigmaSp,max(1.001,uMat.y));total+=flux*profile*4.*PI;}return total*uSssColor;}
#else
vec3 subsurfaceLight(vec3 p,vec3 n,vec3 tint){return vec3(0.);}
#endif
vec4 terminalScene(vec3 origin,vec3 direction,float rough){float unused;vec4 scene=sceneRay(origin,direction,unused);if(rough>.04){float spread=rough*rough*.18;vec3 tangent=normalize(cross(direction,abs(direction.y)>.98?vec3(1,0,0):vec3(0,1,0))),up=cross(direction,tangent);vec4 average=sceneRay(origin,normalize(direction+tangent*spread),unused)+sceneRay(origin,normalize(direction-tangent*spread),unused)+sceneRay(origin,normalize(direction+up*spread),unused)+sceneRay(origin,normalize(direction-up*spread),unused);scene=mix(scene,average*.25,min(1.,rough));}return scene;}
vec4 transmitted(vec3 p,vec3 n,vec3 rd,vec3 tint,vec3 irid,float ior,out float issue){
 issue=0.;float sigmaS=scatteringCoefficient();vec3 sigmaA=absorptionCoefficient(tint),f=fresnel(dot(n,-rd),1.,ior,transform(p));vec3 reflectTint=mix(vec3(1.),max(vec3(.15),irid),uSurface.x*.5);
 f*=reflectTint;vec3 radiance=environment(reflect(rd,n),p,uMat.w)*f,beta=vec3(1.)-f,direction=refract(rd,n,1./ior);if(length(direction)<.0001)direction=rd;vec3 origin=offsetBoundary(p,direction,true);bool inside=true,finished=false;float coverage=0.;vec4 endScene=vec4(0.);
 for(int bounce=0;bounce<int(uRuntime.w)*2;bounce++){
  float nearest;vec4 source=sceneEmitters(origin,direction,40.,nearest);vec3 point,normal;float distance;bool found=traceBoundary(origin,direction,min(40.,nearest),false,point,distance);
  if(!found){if(inside){float path=nearest<40.?nearest:max(0.,objectInterval(origin,direction).y);radiance+=beta*segmentScattering(origin,direction,path,sigmaA,sigmaS);beta*=exp(-(sigmaA+vec3(sigmaS))*path);issue=nearest<40.?0.:(materialField(origin)>0.?.375:.25);}endScene=terminalScene(origin,direction,uMat.w*clamp((ior-1.)*2.,0.,1.));coverage=endScene.a;radiance+=beta*endScene.rgb;finished=true;break;}
  if(inside){radiance+=beta*segmentScattering(origin,direction,distance,sigmaA,sigmaS);beta*=exp(-(sigmaA+vec3(sigmaS))*distance);}
  normal=boundaryNormal(point);vec3 facing=inside?-normal:normal;float n1=inside?ior:1.,n2=inside?1.:ior;vec3 refracted=abs(n1-n2)<.000001?direction:refract(direction,facing,n1/n2);
  if(length(refracted)<.00001){direction=reflect(direction,facing);origin=offsetBoundary(point,direction,inside);continue;}
  vec3 reflection=fresnel(dot(facing,-direction),n1,n2,transform(point))*reflectTint;radiance+=beta*reflection*environment(reflect(direction,facing),point,uMat.w);beta*=vec3(1.)-reflection;inside=!inside;direction=normalize(refracted);origin=offsetBoundary(point,direction,inside);
 }
 if(!finished){issue=inside?1.:.5;endScene=terminalScene(origin,direction,uMat.w*clamp((ior-1.)*2.,0.,1.));coverage=endScene.a;radiance+=beta*endScene.rgb;}
 // A bounded ray budget uses the environment for the residual of trapped TIR paths.
 float alpha=clamp(1.-min(min(beta.r,beta.g),beta.b)*(1.-coverage),0.,1.);
 return vec4(radiance,alpha);
}
vec4 shade(vec3 p,vec3 geometricNormal,vec3 rd,bool hit,out float issue){
 issue=0.;vec3 local=transform(p),n=geometricNormal;if(uTexture.z>.001)n=normalize(n+vec3(sin(local.y*84.),cos(local.x*71.),sin(local.z*69.))*uTexture.z*.045);
 float facing=max(dot(n,-rd),0.),edge=pow(1.-facing,5.),pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;vec3 base=palette(pos),irid=palette(pos+(edge*.55+n.x*.16+uSurface.y*.15)*uOptics.x+uCoat.w);
 float transmission=clamp(uMat.x+(1.-uMat.x)*uInterior.z,0.,1.);vec3 diffuse=vec3(.15);for(int i=0;i<uLightCount;i++){vec3 off=uLights[i].xyz-p;diffuse+=uLightColors[i]*max(dot(n,normalize(off)),0.)*uLights[i].w*.35/(1.+dot(off,off)*.08);}
 vec3 colorBase=mix(base,irid,uSurface.x),specular=environment(reflect(rd,n),p,uMat.w);vec3 opaque=colorBase*diffuse*(1.-uMat.z)+specular*mix(vec3(.04+.9*edge),colorBase+(vec3(1.)-colorBase)*edge,uMat.z)*(.25+.75*uSurface.z);
 if(uTransport.x>.001&&transmission<.999)opaque=mix(opaque,subsurfaceLight(p,geometricNormal,base)+specular*.04,uTransport.x*(1.-uMat.z));
 vec4 glass=vec4(0.);if(transmission>.0001){if(hit){
#if DISPERSION_ENABLED
 float redIssue,greenIssue,blueIssue,baseIndex=max(1.,uMat.y);
 vec4 red=transmitted(p,geometricNormal,rd,base,irid,max(1.,baseIndex+uOptics.y*.032*(1./(.650*.650)-1./(.510*.510))),redIssue),green=transmitted(p,geometricNormal,rd,base,irid,baseIndex,greenIssue),blue=transmitted(p,geometricNormal,rd,base,irid,max(1.,baseIndex+uOptics.y*.032*(1./(.475*.475)-1./(.510*.510))),blueIssue);
 glass=vec4(red.r,green.g,blue.b,max(max(red.a,green.a),blue.a));issue=max(max(redIssue,greenIssue),blueIssue);
#else
 glass=transmitted(p,geometricNormal,rd,base,irid,max(1.,uMat.y),issue);
#endif
 }else{float unused;glass=sceneRay(vec3(p.xy,4.8),rd,unused);}}
 vec4 result=mix(vec4(opaque,1.),glass,transmission);
 if(uCoat.x>.001){vec3 coatF=fresnel(facing,1.,1.5,local)*uCoat.x;result.rgb=result.rgb*(vec3(1.)-coatF)+environment(reflect(rd,n),p,uCoat.y)*coatF;result.a=1.-(1.-result.a)*(1.-max(max(coatF.r,coatF.g),coatF.b));}
 vec3 emission=base*uSurface.w*(1.-transmission+transmission*edge*2.);result.rgb+=emission;
 return result;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,greaterThan(c,vec3(.0031308)));}
vec3 photo(vec3 radiance,vec2 uv){vec3 c=toSRGB(max(vec3(0.),radiance*exp2(uPhoto1.x)));c+=uPhoto1.y;float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,uPhoto1.w);c=(c-.5)*uPhoto1.z+.5;c+=uPhoto3.x*pow(max(0.,1.-lum),2.)+uPhoto3.y*pow(max(0.,lum),2.);c*=vec3(1.+uPhoto2.x*.18+uPhoto2.y*.08,1.-uPhoto2.y*.14,1.-uPhoto2.x*.18+uPhoto2.y*.08);c=pow(max(c,vec3(0.)),vec3(1./uPhoto4.x));return c*(1.-uPhoto2.z*smoothstep(.3,2.4,length(uv)));}
void main(){
 vec2 originalUV=(gl_FragCoord.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4,uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);vec3 origin=vec3(uv,4.8),direction=vec3(0,0,-1),point,normal;float distance;bool hit=traceBoundary(origin,direction,40.,true,point,distance);normal=hit?surfaceNormal(point):vec3(0,0,1);
 float soft=uCut.w*.44,closest=10.;if(!hit){vec3 o=transform(origin)/axes(),d=(transform(origin+direction)-transform(origin))/axes();point=origin+direction*max(0.,-dot(o,d)/dot(d,d));closest=max(0.,field(point));normal=surfaceNormal(point);}
 float coverage=hit?1.:exp(-closest/max(.001,soft)),halo=hit?0.:exp(-closest/max(.008,.035+uOther.w*.16))*uOther.w*(.12+uSurface.w*.38);float unused;vec4 back=sceneRay(origin,direction,unused),surface=back;float issue=0.;if(hit||coverage>.001)surface=shade(point,normal,direction,hit,issue);
 float flatGeometry=1.-smoothstep(.1,.45,uShape.x),flatBlend=flatGeometry*(1.-uSurface.z)*(1.-uMat.x);
 if(flatGeometry>.001){float normalization=max(.025,min(min(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*.5),flatD=field(vec3(uv,0.))/normalization;float flatAlpha=1.-smoothstep(-max(.008,uCut.w*1.6),max(.008,uCut.w*1.6),flatD);vec3 p=transform(vec3(uv,0.));vec3 flatColor=palette(dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uGradient.y*.3+uGradient.z);surface.rgb=mix(surface.rgb,flatColor,flatBlend);coverage=mix(coverage,flatAlpha,flatGeometry);halo*=1.-flatGeometry;}
 if(hit){vec4 foreground=sceneEmitters(origin,direction,distance,unused);surface.rgb=surface.rgb*(1.-foreground.a)+foreground.rgb;surface.a=surface.a*(1.-foreground.a)+foreground.a;}
 coverage*=uFilCore;halo*=uFilCore;vec3 glow=palette(atan(uv.y,uv.x)/(2.*PI)+.5)*halo,linear=mix(back.rgb,surface.rgb,coverage)+glow;float alpha=clamp(mix(back.a,surface.a,coverage)+halo,0.,1.);float grain=(hash(floor(gl_FragCoord.xy/max(.5,uPhoto3.z))+uSeed)-.5)*uFrame.w;
 if(uRuntime.z>1.5){fragColor=vec4(normal*.5+.5,hit?1.:0.);return;}
 if(uRuntime.z>.5){fragColor=vec4(issue,hit?1.:0.,0.,1.);return;}
 if(transparentExport()){
  vec3 target=clamp(photo(mix(back.rgb,surface.rgb,coverage),originalUV),0.,1.);float bodyAlpha=clamp(mix(back.a,surface.a,coverage),0.,1.);
  bodyAlpha=max(bodyAlpha,1.-min(min(target.r,target.g),target.b));vec3 premultiplied=max(vec3(0.),target-vec3(1.-bodyAlpha));
  float glowAlpha=clamp(halo,0.,1.);premultiplied=premultiplied*(1.-glowAlpha)+toSRGB(palette(atan(uv.y,uv.x)/(2.*PI)+.5))*glowAlpha;alpha=1.-(1.-bodyAlpha)*(1.-glowAlpha);
  fragColor=vec4(clamp(premultiplied/max(alpha,.000001)+grain,0.,1.),alpha);
 }else{vec3 color=uPhoto4.y>.5?photo(linear,originalUV):mix(toSRGB(max(vec3(0.),back.rgb)),photo(surface.rgb,originalUV),coverage)+toSRGB(glow);fragColor=vec4(clamp(color+grain*(uPhoto4.y>.5?1.:coverage*surface.a),0.,1.),1.);}
}
`;

// Keep the previous shader intact for older creations. Both paths are self-contained.
function shaderFunction(source,name,replacement){
 const start=source.search(new RegExp('(?:vec[234]|float|bool|void)\\s+'+name+'\\s*\\('));
 let end=source.indexOf('{',start)+1,depth=1;
 while(depth){depth+=(source[end]==='{')-(source[end]==='}');end++;}
 return source.slice(0,start)+replacement+source.slice(end);
}
let MODERN_FRAG=FRAG.replace('precision highp float;','precision highp float;\nprecision highp int;').replace('uniform vec2 uResolution;','uniform vec2 uResolution;\nuniform vec4 uEnvironment,uFilmMotion,uSampling,uModern,uPetals,uPetalTip,uPetalSpread,uStem,uColorWave,uColorAxis,uOrganic,uBudget;\nuniform vec3 uInternalColor;\nuniform vec4 uMaterialDetail,uMaterialLayers,uOrganicDetail,uColorLayers;uniform float uTextureSeed;\nuniform highp sampler2D uGrowth;\nuniform vec2 uGrowthRows[8];\nuniform highp sampler2D uRootTree;\nuniform vec4 uRoots;');
MODERN_FRAG=MODERN_FRAG.replace('uniform vec2 uResolution;',GROWTH_GLSL+'\nuniform vec2 uResolution;');
MODERN_FRAG=MODERN_FRAG.replace('if(inside){radiance+=','if(inside){if(uColorLayers.x>0.)sigmaA=absorptionCoefficient(mix(tint,layeredPigment(transform(origin+direction*distance*.5)),uColorLayers.x));radiance+=');
const CROWN_GEOMETRY=`
#if CROWN_ENABLED
// Exact rounded-cone distance, including spherical end caps. Each petal is a
// continuous chain of tapered cones along a quadratic curve, never a texture.
float roundCone(vec3 p,vec3 a,vec3 b,float ra,float rb){
 vec3 ba=b-a,pa=p-a;float l2=dot(ba,ba),rr=ra-rb;
 if(l2<.000001||rr*rr>=l2)return min(length(pa)-ra,length(p-b)-rb);
 float a2=l2-rr*rr,il2=1./l2,y=dot(pa,ba),z=y-l2;
 vec3 radial=pa*l2-ba*y;float x2=dot(radial,radial),y2=y*y*l2,z2=z*z*l2,k=sign(rr)*rr*rr*x2;
 if(sign(z)*a2*z2>k)return sqrt(x2+z2)*il2-rb;
 if(sign(y)*a2*y2<k)return sqrt(x2+y2)*il2-ra;
 return (sqrt(max(0.,x2*a2*il2))+y*rr)*il2-ra;
}
vec3 petalCurve(vec3 a,vec3 b,vec3 c,float t){return mix(mix(a,b,t),mix(b,c,t),t);}
#if ROOTS_ENABLED
// Stackless, spatially accelerated curved roots. Nodes have an escape index:
// a distant subtree is skipped in one step, independent of the root count.
vec4 rootNode(int index,int lane){int q=index*4+lane;return texelFetch(uRootTree,ivec2(q%256,q/256),0);}
float rootsField(vec3 p){
 float core=.62+uPetals.z*.14,flattening=mix(.2,1.,uPetalSpread.x);
 float body=(length(p/vec3(1.,flattening,1.))-core)*flattening;
 if(uRoots.y<.000001||length(p)<core*flattening*.35)return body;
 float best=100.,blend=uRoots.z;int node=0;
 for(int visit=0;visit<int(uRoots.x);visit++){
  if(node>=int(uRoots.x))break;
  vec4 low=rootNode(node,0),high=rootNode(node,1);
  vec3 outside=max(max(low.xyz-p,p-high.xyz),vec3(0.));
  float bound=length(outside)+min(max(max(low.x-p.x,p.x-high.x),max(max(low.y-p.y,p.y-high.y),max(low.z-p.z,p.z-high.z))),0.);
  if(bound>min(best,body)+blend){node=int(low.w);continue;}
  if(high.w>.5){vec4 a=rootNode(node,2),b=rootNode(node,3);float d=roundCone(p,a.xyz,b.xyz,a.w,b.w);best=min(best,d);}
  node++;
 }
 return -smax(-body,-best,blend);
}
#endif
#if FLOWER_ENABLED || LEGACY_HEDGE_ENABLED
float curvedPetal(vec3 p,vec3 a,vec3 b,vec3 c){
 float width=uPetalTip.y*(.65+uPetalTip.z*.55),sharp=uPetalTip.w;
 float middle=width*mix(1.,.42,sharp),root=max(.025,width*.5),tip=max(.0015,middle*mix(.9,.008,sharp));
 vec3 p1=petalCurve(a,b,c,1./3.),p2=petalCurve(a,b,c,2./3.);
 float d=roundCone(p,a,p1,root,middle);
 d=-smax(-d,-roundCone(p,p1,p2,middle,middle*mix(.9,.45,sharp)),.025*(1.-sharp));
 return -smax(-d,-roundCone(p,p2,c,middle*mix(.9,.45,sharp),tip),.025*(1.-sharp));
}
#endif
#if FLOWER_ENABLED
float flowerField(vec3 p){
 float count=max(3.,floor(uPetals.y+.5)),step=2.*PI/count,angle=atan(p.z,p.x)-uPetalSpread.z;
 float folded=mod(angle+step*.5,step)-step*.5,r=length(p.xz);
 vec3 q=vec3(r*cos(folded),p.y,r*sin(folded));
 float opening=.28+uPetals.z*1.48,root=.17+uPetals.z*.25,lengthOfPetal=uPetalTip.x;
 vec3 a=vec3(root,-.12,0),b=a+vec3(sin(opening),cos(opening),0)*lengthOfPetal*.65;
 float curled=opening-uPetals.w*1.4;vec3 c=a+vec3(sin(curled),cos(curled),0)*lengthOfPetal;
 float petal=curvedPetal(q,a,b,c),collar=length(vec2(r-root,p.y+.12))-max(.035,uPetalTip.y*.47);
 return -smax(-petal,-collar,.035);
}
#endif
#if LEGACY_HEDGE_ENABLED
float legacyHedgeField(vec3 p){
 float radius=length(p),rows=max(2.,floor(uPetalSpread.y+.5)),step=PI/rows;
 float phi=acos(clamp(p.y/max(.00001,radius),-1.,1.)),theta=atan(p.z,p.x)-uPetalSpread.z;
 float nearest=floor(phi/step),core=.62+uPetals.z*.14,d=radius-core;
 if(radius<core*.45)return d;
 for(int j=-1;j<=1;j++){
  float row=clamp(nearest+float(j),0.,rows-1.),latitude=(row+.5)*step;
  float count=max(3.,floor(uPetals.y*sin(latitude)+.5)),sector=2.*PI/count;
  float longitude=floor((theta+sector*.5)/sector)*sector+uPetalSpread.z;
  vec3 axis=vec3(sin(latitude)*cos(longitude),cos(latitude),sin(latitude)*sin(longitude));
  vec3 tangent=vec3(cos(latitude)*cos(longitude),-sin(latitude),cos(latitude)*sin(longitude));
  vec3 a=axis*core*.92,b=a+axis*uPetalTip.x*.65;
  vec3 c=a+(axis*cos(uPetals.w*.65)+tangent*sin(uPetals.w*.65))*uPetalTip.x;
  d=-smax(-d,-curvedPetal(p,a,b,c),.035*(1.-uPetalTip.w));
 }
 return d;
}
#endif
// A buried, flared root joins the body with its own fillet. Tip sharpness
// never changes this blend. Search neighboring growth cells to avoid seams.
#if ORGANIC_ENABLED
// Growth transforms are cached once per shape update, not rebuilt per ray step.
float organicHedgeField(vec3 p){
 float radius=length(p),core=.62+uPetals.z*.14,body=radius-core;
 if(radius<core*.4)return body;
 float rows=max(2.,floor(uPetalSpread.y+.5)),step=PI/rows;
 float phi=acos(clamp(p.y/max(.00001,radius),-1.,1.)),theta=atan(p.z,p.x)-uPetalSpread.z,nearest=floor(phi/step);
 float width=uPetalTip.y*(.65+uPetalTip.z*.55),rootRadius=min(.42,max(.025,width*.5+uOrganic.y*.28+uOrganic.x*.04));
 float minLength=uPetalTip.x*(1.-uOrganic.z*.32);
 float rootBlend=min(.035*(1.-uPetalTip.w)+uOrganic.x*(.12+uOrganic.y*.32),max(.008,(minLength-core*.08)*.6)),spines=100.;
 for(int j=-1;j<=1;j++){
  float row=nearest+float(j);if(row<0.||row>=rows)continue;
  vec2 rowData=uGrowthRows[int(row)];float count=rowData.x,sector=2.*PI/count;
  float cell=floor(theta/sector-rowData.y+.5);
  for(int k=-1;k<=1;k++){
   int column=int(mod(cell+float(k)+count,count))*4;
   vec4 growth=texelFetch(uGrowth,ivec2(column,int(row)),0),root=texelFetch(uGrowth,ivec2(column+1,int(row)),0);
   vec4 tipData=texelFetch(uGrowth,ivec2(column+2,int(row)),0),bendData=texelFetch(uGrowth,ivec2(column+3,int(row)),0);
   vec3 axis=growth.xyz;float lengthOfSpine=growth.w,thickness=root.w;
   float height=clamp((dot(p,axis)-core)/max(.1,lengthOfSpine),0.,1.);
   vec3 bend=bendData.xyz;
   vec3 q=p-bend*lengthOfSpine*height*height;
   vec3 a=root.xyz,c=tipData.xyz;float tip=tipData.w;
   float lower=length(q-a-axis*clamp(dot(q-a,axis),0.,length(c-a)))-max(thickness,tip);
   float warpBound=bendData.w;
   if(lower/warpBound>min(body,spines)+rootBlend)continue;
   spines=-smax(-spines,-roundCone(q,a,c,thickness,tip)/warpBound,rootBlend*.4);
  }
 }
 return -smax(-body,-spines,rootBlend);
}
#endif
#if ORGANIC_ENABLED || LEGACY_HEDGE_ENABLED
float hedgeField(vec3 p){
 #if ORGANIC_ENABLED && LEGACY_HEDGE_ENABLED
 float amount=clamp((uOrganic.x+uOrganic.y+uOrganic.z)*20.,0.,1.);
 if(amount<.000001)return legacyHedgeField(p);
 float organic=organicHedgeField(p);if(amount>.999999)return organic;
 return mix(legacyHedgeField(p),organic,amount);
 #elif ORGANIC_ENABLED
 return organicHedgeField(p);
 #else
 return legacyHedgeField(p);
 #endif
}
#endif
float crownBase(vec3 p){
 #if FLOWER_ENABLED && (ORGANIC_ENABLED || LEGACY_HEDGE_ENABLED)
 float spread=uPetalSpread.x;return mix(flowerField(p),hedgeField(p),spread);
 #elif FLOWER_ENABLED
 return flowerField(p);
 #elif ORGANIC_ENABLED || LEGACY_HEDGE_ENABLED
 return hedgeField(p);
 #else
 return 0.;
 #endif
}
float crownField(vec3 p){
 #if ROOTS_ENABLED
 if(uRoots.w>.999999)return rootsField(p);
 if(uRoots.w>.000001)return mix(crownBase(p),rootsField(p),uRoots.w);
 #endif
 return crownBase(p);
}
#if STEM_ENABLED
float stemField(vec3 p){
 float len=uStem.x*3.,radius=uStem.y*min(1.,uStem.x*8.),bend=uStem.z;
 vec3 a=vec3(0,-.14,0),b=vec3(bend*.35,-.14-len*.45,0),c=vec3(-bend*.55,-.14-len,0);
 return curvedStem(p,a,b,c,radius);
}
#endif
#endif
`;
// Separate stem helper so petal taper never affects its thickness.
const STEM_GEOMETRY=`float curvedStem(vec3 p,vec3 a,vec3 b,vec3 c,float radius){vec3 m=petalCurve(a,b,c,.5);return min(roundCone(p,a,m,radius,radius),roundCone(p,m,c,radius,radius));}\n`;
MODERN_FRAG=MODERN_FRAG.replace('vec3 fieldParts(vec3 world){',CROWN_GEOMETRY.replace('float stemField',STEM_GEOMETRY+'float stemField')+'\nvec3 fieldParts(vec3 world){');
MODERN_FRAG=MODERN_FRAG.replace('float d=norm-1.-uWarp.x*w-uOther.z*ripple*.17-lobe;',`float d=norm-1.-uWarp.x*w-uOther.z*ripple*.17-lobe;
 #if CROWN_ENABLED
 if(uPetals.x>.000001)d=mix(d,crownField(p)-uWarp.x*w*.35-uOther.z*ripple*.08,uPetals.x);
 #if STEM_ENABLED
 if(uStem.x>.000001)d=-smax(-d,-stemField(p),.08*min(1.,uStem.x*8.));
 #endif
 #endif
`);
// Uniform zero controls should cost nothing in the common unwarped crown.
// Every nonzero value still follows the same continuous procedural field.
MODERN_FRAG=MODERN_FRAG.replace('p.xz=rot(uWarp.z*p.y*.7)*p.xz;','if(uWarp.z!=0.)p.xz=rot(uWarp.z*p.y*.7)*p.xz;');
MODERN_FRAG=MODERN_FRAG.replace('p.x*=1.+uExtraShape2.z*exp(-p.y*p.y*4.);','if(uExtraShape2.z!=0.)p.x*=1.+uExtraShape2.z*exp(-p.y*p.y*4.);');
MODERN_FRAG=MODERN_FRAG.replace('float w=sin(p.x*3.4+uSeed)*sin(p.y*2.6)*cos(p.z*3.+.6);','float w=0.;if(uWarp.x!=0.)w=sin(p.x*3.4+uSeed)*sin(p.y*2.6)*cos(p.z*3.+.6);');
MODERN_FRAG=MODERN_FRAG.replace('float ripple=sin(p.x*uWarp.w*2.)*sin(p.y*uWarp.w*1.7)*sin(p.z*uWarp.w*1.6+1.);','float ripple=0.;if(uOther.z!=0.)ripple=sin(p.x*uWarp.w*2.)*sin(p.y*uWarp.w*1.7)*sin(p.z*uWarp.w*1.6+1.);');
MODERN_FRAG=MODERN_FRAG.replace('float norm=pow(pow(abs(p.x),exponent)+pow(abs(p.y),exponent)+pow(abs(p.z),exponent),1./exponent);','float norm=exponent==2.?length(p):pow(pow(abs(p.x),exponent)+pow(abs(p.y),exponent)+pow(abs(p.z),exponent),1./exponent);');
MODERN_FRAG=MODERN_FRAG.replace('float lobe=sin(atan(p.y,p.x)*uExtraShape2.y)*uExtraShape2.x*(1.-min(1.,abs(p.z))*.65);','float lobe=0.;if(uExtraShape2.x!=0.)lobe=sin(atan(p.y,p.x)*uExtraShape2.y)*uExtraShape2.x*(1.-min(1.,abs(p.z))*.65);');
MODERN_FRAG=MODERN_FRAG.replace(`float innerPower=2.+uVoid.w*5.;vec2 hp=abs((p.xy-uVoid.yz)/vec2(uExtraShape3.x,1.));
 float inner=pow(pow(hp.x,innerPower)+pow(hp.y,innerPower),1./innerPower)-uVoid.x;
 float hole=uVoid.x>.001?-inner:-10000.,cut=uCut.x>.001?uCut.x-length((p.xy-uCut.yz)/vec2(uExtraShape3.y,1.)):-10000.;`,
 `float hole=-10000.,cut=-10000.;if(uVoid.x>.001){float innerPower=2.+uVoid.w*5.;vec2 hp=abs((p.xy-uVoid.yz)/vec2(uExtraShape3.x,1.));hole=uVoid.x-pow(pow(hp.x,innerPower)+pow(hp.y,innerPower),1./innerPower);}if(uCut.x>.001)cut=uCut.x-length((p.xy-uCut.yz)/vec2(uExtraShape3.y,1.));`);
MODERN_FRAG=MODERN_FRAG.replace('vec3 surfaceNormal(vec3 p){vec3 n=surfaceGradient(p);',`vec3 surfaceNormal(vec3 p){vec3 n;
 #if CROWN_ENABLED
 float e=.00012*uFrame.x;vec3 x=vec3(e,0,0),y=vec3(0,e,0),z=vec3(0,0,e);n=vec3(field(p+x)-field(p-x),field(p+y)-field(p-y),field(p+z)-field(p-z));
 #else
 n=surfaceGradient(p);
 #endif
`);
// A true SDF needs one distance lookup per step. Derivatives are only useful
// very close to the interface, where we bracket an accurate entry or exit.
MODERN_FRAG=MODERN_FRAG.replace('float derivative=(field(point+direction*.0005)-field(point-direction*.0005))/.001,outer=field(point);if(!outerOnly&&hasCavity()&&-outer-wallDepth()>outer)derivative=-derivative;',`float derivative=1.;
 #if CROWN_ENABLED
 if(abs(d)<eps){
 #endif
 derivative=(field(point+direction*.0005)-field(point-direction*.0005))/.001;
 float outer=field(point);if(!outerOnly&&hasCavity()&&-outer-wallDepth()>outer)derivative=-derivative;
 #if CROWN_ENABLED
 }
 #endif
`);
MODERN_FRAG=MODERN_FRAG.replace('previousT=t;previousD=d;t+=max(min(stepSize,.18*uFrame.x),eps*1.5);',`previousT=t;previousD=d;
 #if CROWN_ENABLED
 stepSize=abs(d)*uRuntime.y*2.;
 #endif
 t+=max(min(stepSize,.18*uFrame.x),eps*1.5);`);
MODERN_FRAG=MODERN_FRAG.replace('vec3 bg(vec2 p){',`float colorCoordinate(vec3 p){
 float phase=uColorWave.w*2.*PI,r=length(p.xz),angle=r>.00001?atan(p.z,p.x):0.;
 float spiral=sin(angle+r*2.-phase)*r/(r+.18)*uColorAxis.z*.32;
 float warp=sin(p.y*2.4+sin(p.x*2.1+phase))*uColorWave.z*.22;
 // Radial color follows the distance from the 3D centre. Keep the cylindrical
 // coordinate only for the separately controlled swirl around the vertical axis.
 return (p.y*uColorAxis.x*.35+length(p)*uColorAxis.y*.35+spiral+warp)*uColorWave.y+uColorWave.w;
}
vec3 layeredPigment(vec3 p){
 float t=dot(p,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
 vec3 a=palette(t+p.z*uColorLayers.y*.35+uColorLayers.z),b=palette(t-p.z*uColorLayers.y*.21+uColorLayers.z+.37);
 return mix(a,a*b*1.6,uColorLayers.w);
}
vec3 fractalMaterialPoint(vec3 world){return world;}
vec3 surfacePaletteMapped(vec3 p,vec3 base,vec3 world,bool worldKnown){
 base=mix(base,palette(colorCoordinate(p)),uColorWave.x);
 vec3 layers=uColorLayers.x>0.?layeredPigment(p):base;
 #ifdef FRACTAL_ENABLED
 #if FRACTAL_ENABLED
 if(worldKnown&&int(uFractal.y+.5)==3&&uFractal.x>0.&&uColorLayers.x>0.){
  float t=fractalColorCoordinate(fractalMaterialPoint(world))*uColorLayers.y+uColorLayers.z;
  vec3 recursiveA=palette(t),recursiveB=palette(t+.37);
  layers=mix(layers,mix(recursiveA,recursiveA*recursiveB*1.6,uColorLayers.w),uFractal.x);
 }
 #endif
 #endif
 #ifdef FAN_FIELD
 if(uStructureFan>0.&&uColorLayers.x>0.){
  vec2 plane=p.xy/axes().xy;
  float r=length(plane),core=max(.12,uStructureColor.y),radius=r/core;
  vec2 direction=vec2(cos(uGradient.x),sin(uGradient.x));
  float band=smoothstep(.45,.8,radius)*(1.-smoothstep(1.17,1.85,radius));
  float t=uColorLayers.z+dot(plane/max(.0001,r),direction)*.21*uColorLayers.y;
  vec3 inner=mix(palette(t),layers,uColorLayers.w);
  // A nearly-zero fan must retain the colour of the starting solid. Blend
  // the two distributions instead of switching off its existing layers.
  vec3 layeredBase=mix(base,layers,uColorLayers.x);
  vec3 fanBase=mix(base,inner,band*uColorLayers.x);
  base=mix(layeredBase,fanBase,uStructureFan);
 }else
 #endif
 if(uColorLayers.x>0.)base=mix(base,layers,uColorLayers.x);
 if(uGrowthShape.x>0.){float h=organicGrowth(p/axes()).x;base=mix(base,palette(h*float(uPaletteCount-1)/float(uPaletteCount)+uGradient.z),uGrowthShape.x*uGrowthLook.x);}
 return base;
}
vec3 surfacePalette(vec3 p,vec3 base){return surfacePaletteMapped(p,base,vec3(0.),false);}
vec3 surfacePalette(vec3 p,vec3 base,vec3 world){return surfacePaletteMapped(p,base,world,true);}
vec3 loopSurfacePalette(vec3 p,vec3 color){
 if(uLoopA.x*uLoopColor.x<.0001)return color;
 vec2 coordinates=loopBandCoordinates(p/axes(),uLoopA,uLoopB,uLoopColor,uStructureH.w);
 return mix(color,mix(palette(coordinates.x),palette(coordinates.y),uLoopColor.z),uLoopA.x*uLoopColor.x);
}
vec3 bg(vec2 p){`);
MODERN_FRAG=MODERN_FRAG.replaceAll('palette(dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uGradient.y*.3+uGradient.z)','surfacePalette(p,palette(dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uGradient.y*.3+uGradient.z))');
MODERN_FRAG=shaderFunction(MODERN_FRAG,'environment',`vec3 environment(vec3 direction,vec3 p,float rough){
 vec3 r=normalize(direction);r.xz=rot(uEnvironment.y)*r.xz;
 float blur=rough*rough*.85;vec3 a=palette(.12),b=palette(.57),white=vec3(1.);
 vec3 color=vec3(.035)+mix(a,b,clamp(r.y*.5+.5,0.,1.))*.08;
 float top=exp(-pow((r.y-.62)/(blur+.38),2.));
 float window=exp(-pow((r.x+.6)/(blur+.22),2.)-pow((r.y-.22)/(blur+.46),2.))*smoothstep(-.05,.3,r.z);
 float strip=exp(-pow((r.x-.72)/(blur+.085),2.)-pow((r.y+.03)/(blur+.75),2.))*smoothstep(-.2,.1,r.z);
 float back=exp(-pow((r.x+.2)/(blur+.5),2.)-pow((r.y-.12)/(blur+.22),2.))*smoothstep(.1,.45,-r.z);
 float mode=uEnvironment.x;
 if(mode<.5){color+=white*(window*3.4+strip*2.5+top*.22)+mix(white,b,.4)*back*1.5;}
 else if(mode<1.5){color+=mix(vec3(.28,.08,.22),vec3(1.8,.58,.16),exp(-pow((r.y+.15)/(blur+.32),2.)))*.5; color+=vec3(3.8,1.7,.6)*exp(-length(r-vec3(-.5,.12,.84))/(blur+.14))+mix(white,a,.2)*window;}
 else if(mode<2.5){color+=a*(strip*5.+back*2.)+b*(window*4.+top*.2)+white*top*.09;}
 else if(mode<3.5){color+=mix(vec3(.06,.22,.5),vec3(.7,1.15,1.7),smoothstep(-.4,.85,r.y))*.55; color+=white*(window*2.3+strip*1.8+back*.8);}
 else if(mode<4.5){float ripple=.5+.5*sin(r.x*12.+sin(r.z*7.)*2.);color+=vec3(.03,.35,.45)*(.3+top)+mix(vec3(.2,1.2,1.5),b,.25)*(window*2.+back*1.2)+white*strip*(.7+ripple*.5);}
 else if(mode<5.5){float ribbon=exp(-pow((r.y-.22-sin(r.x*4.+r.z*2.)*.22)/(blur+.12),2.));color+=mix(a,b,.5+.5*sin(r.x*3.))*ribbon*2.7+white*(window*.8+strip*.8);}
 else{float city=exp(-pow((r.y+.13)/(blur+.2),2.));float windows=.5+.5*cos(atan(r.x,r.z)*18.);windows=mix(windows,.5,smoothstep(.05,.35,rough));color+=mix(vec3(.9,.42,.13),b,.45)*city*windows*1.3+a*strip*3.+white*window*1.3;}
 color*=uEnvironment.z;
 for(int i=0;i<uLightCount;i++)color+=envLight(direction,p,i,rough);
 return color;
}`);
MODERN_FRAG=shaderFunction(MODERN_FRAG,'fresnel',`vec3 fresnel(float cosine,float n1,float n2,vec3 local){
 if(abs(n1-n2)<.000001)return vec3(0.);
 float ci=clamp(abs(cosine),0.,1.),eta=n1/n2,st2=eta*eta*(1.-ci*ci);
 if(st2>=1.)return vec3(1.);float ct=sqrt(max(0.,1.-st2));
 float rs=(n1*ci-n2*ct)/max(.000001,n1*ci+n2*ct),rp=(n1*ct-n2*ci)/max(.000001,n1*ct+n2*ci);
 return vec3(clamp((rs*rs+rp*rp)*.5*uCoat.z,0.,1.));
}
${FILM_PATTERN_GLSL}
float gaussian(float x,float center,float left,float right){float v=(x-center)*(x<center?left:right);return exp(-.5*v*v);}
vec3 cie(float wavelength){
 float x=1.056*gaussian(wavelength,599.8,.0264,.0323)+.362*gaussian(wavelength,442.,.0624,.0374)-.065*gaussian(wavelength,501.1,.049,.0382);
 float y=.821*gaussian(wavelength,568.8,.0213,.0247)+.286*gaussian(wavelength,530.9,.0613,.0322);
 float z=1.217*gaussian(wavelength,437.,.0845,.0278)+.681*gaussian(wavelength,459.,.0385,.0725);
 return vec3(x,y,z);
}
vec3 xyzRGB(vec3 xyz){return mat3(3.2406,-.9689,.0557,-1.5372,1.8758,-.204,-.4986,.0415,1.057)*xyz;}
vec3 soapFilm(vec3 local,float facing){
 float phase=uFilmMotion.x,flow=uFilmMotion.y,swirl=uFilmMotion.z;
 local*=max(.1,uOptics.x);
 float angle=atan(local.y,local.x);
 float thickness=uScatter.w*(1.+.09*sin(local.x*1.7+local.y*2.6)-.1*local.y
   +flow*.22*sin(local.y*4.8+phase+swirl*sin(angle*3.-phase)*1.2)
   +swirl*.17*sin(angle*3.-phase+local.y*2.)
   +uColorWave.x*.25*sin(colorCoordinate(local)*2.*PI));
 thickness=coatingThickness(local,phase,flow,swirl,uScatter.w,thickness)+uCoat.w*100.;
 float n1=1.333,n2=mix(mix(max(1.001,uMat.y),2.2,uMat.z*.55),1.,clamp(uModern.x,0.,1.));
 float ci=max(.001,facing),c1=sqrt(max(.001,1.-(1.-ci*ci)/(n1*n1))),c2=sqrt(max(.001,1.-(1.-ci*ci)/(n2*n2)));
 vec2 r01=vec2((ci-n1*c1)/(ci+n1*c1),(n1*ci-c1)/(n1*ci+c1));
 vec2 r12=vec2((n1*c1-n2*c2)/(n1*c1+n2*c2),(n2*c1-n1*c2)/(n2*c1+n1*c2));
 vec3 xyz=vec3(0.),white=vec3(0.);
 for(int j=0;j<24;j++){
  float wavelength=390.+float(j)*15.,interference=cos(4.*PI*n1*max(20.,thickness)*c1/wavelength);
  vec2 product=r01*r12,reflection=(r01*r01+r12*r12+2.*product*interference)/(vec2(1.)+product*product+2.*product*interference);
  vec3 response=cie(wavelength);xyz+=response*dot(reflection,vec2(.5));white+=response;
 }
 return coatingContrast(clamp(xyzRGB(xyz)/max(vec3(.001),xyzRGB(white)),0.,1.));
}`);
MODERN_FRAG=shaderFunction(MODERN_FRAG,'absorptionCoefficient',`vec3 absorptionCoefficient(vec3 tint){
 vec3 interiorTint=mix(uInternalColor,tint,max(uColorWave.x,uColorLayers.x));
 return (vec3(uOptics.z*.7)+(vec3(1.)-interiorTint)*uOptics.w*1.7
   +(vec3(1.)-uSssColor)*uTransport.x*.16/max(.08,uTransport.y))*max(.001,uSurface.y);
}`);
MODERN_FRAG=shaderFunction(MODERN_FRAG,'sceneEmitters',`vec4 sceneEmitters(vec3 origin,vec3 direction,float maximum,out float nearest){
 vec3 col=vec3(0.);float coverage=0.;nearest=100.;
 for(int i=0;i<uLightCount;i++){
  if(uLightExtra[i].w<.5||uLights[i].w<.001)continue;
  vec3 center=uLights[i].xyz;float t,mask;
  if(uLightProps[i].w>5.5){
   vec3 delta=origin-center;float radius=max(.015,uLightProps[i].x),b=dot(delta,direction),disc=b*b-dot(delta,delta)+radius*radius;
   if(disc<0.)continue;t=-b-sqrt(disc);if(t<.001)t=-b+sqrt(disc);mask=1.;
  }else{
   vec3 n=length(center)>.001?normalize(center):vec3(0,0,1);float den=dot(direction,n);if(abs(den)<.0001)continue;t=dot(center-origin,n)/den;
   vec3 right=normalize(cross(abs(n.y)>.98?vec3(1,0,0):vec3(0,1,0),n)),up=cross(n,right),off=origin+direction*t-center;
   vec2 q=rot(uLightProps[i].z)*vec2(dot(off,right),dot(off,up));vec4 props=uLightProps[i];if(props.w>1.5&&props.w<2.5)props.w=0.;mask=fixture(q,props,uLightExtra[i]);
  }
  if(t<.001||t>=maximum||mask<.001)continue;
  vec3 radiance=uLightColors[i]*uLights[i].w*1.5;
  if(t<nearest)col=col*(1.-mask)+radiance*mask;else col+=radiance*mask*(1.-coverage);
  coverage=1.-(1.-coverage)*(1.-mask);nearest=min(nearest,t);
 }
 return vec4(col,coverage);
}`);
MODERN_FRAG=shaderFunction(MODERN_FRAG,'subsurfaceLight',`vec3 subsurfaceLight(vec3 p,vec3 n,vec3 tint){
 vec3 total=vec3(0.),sigmaA=absorptionCoefficient(tint);float radius=max(.08,uTransport.y),sigmaSp=1./radius;
 vec3 sigmaTr=sqrt(3.*sigmaA*(sigmaA+sigmaSp));
 for(int i=0;i<uLightCount;i++){
  vec3 off=uLights[i].xyz-p;float distance=max(.03,length(off));vec3 ld=off/distance;
  float area=max(.08,uLightProps[i].x*uLightProps[i].y*4.),path=materialLength(p-n*rayEpsilon()*8.,uLights[i].xyz);
  vec3 flux=uLightColors[i]*uLights[i].w*1.5*area/(distance*distance+area);
  bool internal=field(uLights[i].xyz)<0.;
  if(internal){
   // Diffusion Green's function: an internal source contributes over the whole outer skin.
   float sourceRadius=max(.08,uLightProps[i].x),r=sqrt(distance*distance+sourceRadius*sourceRadius);
   vec3 diffusion=exp(-sigmaTr*path)/(r*(.3+radius));
   total+=flux*diffusion*1.7*uSssColor;
  }else{
   float cosine=dot(n,ld),wrap=clamp((cosine+radius*.75)/(1.+radius*.75),0.,1.);
   vec3 diffuse=exp(-sigmaTr*path)*wrap;
   // Smooth back illumination through measured material; no entry-point discontinuity at the terminator.
   diffuse+=exp(-sigmaTr*path)*max(0.,-cosine)*uInterior.z*.45;
   total+=flux*diffuse*uSssColor;
  }
 }
 return total+uSssColor*environment(n,p,1.)*.045;
}`);
MODERN_FRAG=shaderFunction(MODERN_FRAG,'terminalScene',`vec4 terminalScene(vec3 origin,vec3 direction,float rough){
 float unused;vec4 scene=sceneRay(origin,direction,unused);
 if(rough>.04){float spread=rough*rough*.2;vec3 tangent=normalize(cross(direction,abs(direction.y)>.98?vec3(1,0,0):vec3(0,1,0))),up=cross(direction,tangent);
  vec4 average=sceneRay(origin,normalize(direction+tangent*spread),unused)+sceneRay(origin,normalize(direction-tangent*spread),unused)+sceneRay(origin,normalize(direction+up*spread),unused)+sceneRay(origin,normalize(direction-up*spread),unused);
  scene=mix(scene,average*.25,min(1.,rough));
 }
 if(uBgMode!=2.)scene.rgb+=environment(direction,origin,rough)*uEnvironment.w*clamp((uMat.y-1.)*3.,0.,1.)*(1.-scene.a);
 return scene;
}`);
MODERN_FRAG=MODERN_FRAG.replace('vec4 shade(',`// Analytic, object-anchored height gradients: surface detail never changes the
// SDF, ray/interface normals, atlas cache, or the number of tracing steps.
float organicHash(vec3 q){return fract(sin(dot(q,vec3(127.1,311.7,74.7))+uTextureSeed*13.17)*43758.5453);}
vec4 organicNoise(vec3 p){
 vec3 cell=floor(p),f=fract(p),u=f*f*(3.-2.*f),du=6.*f*(1.-f);vec4 outValue=vec4(0.);
 for(int i=0;i<int(min(8.,uRuntime.w));i++){vec3 corner=vec3(float(i%2),float((i/2)%2),float(i/4));vec3 w=mix(1.-u,u,corner),dw=mix(-du,du,corner);float h=organicHash(cell+corner);outValue+=h*vec4(w.x*w.y*w.z,dw.x*w.y*w.z,w.x*dw.y*w.z,w.x*w.y*dw.z);}
 return outValue*2.-vec4(1.,0.,0.,0.);
}
vec4 materialRelief(vec3 local,vec3 geometricNormal,vec3 rd){
 vec3 size=axes(),q=local/size;float density=uMaterialDetail.y,organic=uMaterialDetail.z;
 q.xy=rot(uMaterialDetail.w)*q.xy;q*=density;
 mat3 mapping=mat3(1.);float organicMask=1.;
 if(uOrganicDetail.x+uOrganicDetail.y+uOrganicDetail.w>0.){
  vec4 nx=organicNoise(q*.85),ny=organicNoise(q*.85+vec3(17.2,5.7,3.9)),nz=organicNoise(q*.85+vec3(2.1,19.8,8.4));
  float amount=uOrganicDetail.x*1.4+uOrganicDetail.y*.75;
  mapping+=transpose(mat3(nx.yzw,ny.yzw,nz.yzw))*(amount*.85);
  q+=vec3(nx.x,ny.x,nz.x)*amount;
  organicMask=mix(1.,smoothstep(-.14,.32,nz.x)*(.45+.85*smoothstep(-.3,.28,nx.x)),uOrganicDetail.w);
 }

 vec3 ka=vec3(3.1,2.3,1.7),kb=vec3(-1.8,3.7,2.9),kc=vec3(2.7,-1.5,4.1);
 float seed=uSeed+uTextureSeed*.137;float a=dot(q,ka)+seed,b=dot(q,kb)-seed*.7,c=dot(q,kc)+.4;
 float sa=sin(a),sb=sin(b),sc=sin(c),ca=cos(a),cb=cos(b),cc=cos(c);
 float warp=.55*sa+.3*sb+.15*sc;vec3 warpGradient=.55*ca*ka+.3*cb*kb+.15*cc*kc;
 // Conservative projected pixel footprint. Unresolved frequencies fade out
 // before Nyquist, including grazing angles and small/resized previews.
 float view=max(.12,abs(dot(geometricNormal,-rd)));
 float footprint=3.4*density/(min(uResolution.x,uResolution.y)*max(.05,uFrame.x)*max(.06,min(min(size.x,size.y),size.z))*view);
 vec3 gradient=vec3(0.);float roughening=0.;
 if(uMaterialLayers.x>.000001){
  vec3 k=mix(vec3(4.,32.,3.),vec3(4.,32.,5.2),uOrganicDetail.z);float linkedWarp=mix(5.,10.4,uOrganicDetail.z);float phase=dot(q,k)+organic*linkedWarp*warp;
  vec3 derivative=k+organic*linkedWarp*warpGradient;
  float band=1.-smoothstep(.22,.48,1.75*length(derivative)*footprint/(2.*PI));
  float ridge=.5+.5*sin(phase);
  gradient+=derivative*(2.*ridge*ridge*ridge*cos(phase))*.045*uMaterialLayers.x*band;
 }
 if(uMaterialLayers.y>.000001){
  vec3 k=vec3(1.,8.,1.3);float phase=dot(q,k)+organic*2.6*warp;
  vec3 derivative=k+organic*2.6*warpGradient;
  float band=1.-smoothstep(.22,.48,length(derivative)*footprint/(2.*PI));
  gradient+=derivative*cos(phase)*.08*uMaterialLayers.y*band;
 }
 if(uMaterialLayers.z>.000001){
  float wearBand=1.-smoothstep(.22,.48,12.*footprint/(2.*PI));
  float wearPatch=mix(.5+.5*sin(q.y*9.),.5+.5*sa*sb*cc,organic);
  vec3 patchGradient=mix(vec3(0.,4.5*cos(q.y*9.),0.),.5*(ka*ca*sb*cc+kb*sa*cb*cc-kc*sa*sb*sc),organic);
  vec3 k=vec3(57.,3.,7.);float scratch=dot(q,k)+organic*3.*warp;
  vec3 derivative=k+organic*3.*warpGradient;
  float band=1.-smoothstep(.2,.45,length(derivative)*footprint/(2.*PI));
  gradient+=(patchGradient*(.044+.007*sin(scratch)*band)*wearBand+derivative*cos(scratch)*(.007*wearPatch)*band)*uMaterialLayers.z;
  roughening=uMaterialLayers.z*(.18+.42*mix(.5,wearPatch,wearBand));
 }
 if(uMaterialLayers.w>.000001){
  vec3 k=vec3(2.,15.,4.);float phase=dot(q,k)+organic*3.6*warp;
  vec3 derivative=k+organic*3.6*warpGradient;
  float band=1.-smoothstep(.22,.48,length(derivative)*footprint/(2.*PI));
  gradient+=derivative*cos(phase)*.05*uMaterialLayers.w*band;
 }
 gradient=transpose(mapping)*gradient*organicMask;gradient*=density*uMaterialDetail.x;gradient.xy=rot(-uMaterialDetail.w)*gradient.xy;gradient/=size;
 if(uGrowthShape.x>0.){vec4 growth=organicGrowth(local/size);gradient+=growth.yzw/size*uGrowthShape.z*uGrowthShape.x*.12;roughening+=growth.x*uGrowthLook.z*uGrowthShape.x*.45;}
 gradient.yz=rot(-uOther.y)*gradient.yz;gradient.xz=rot(-uOther.x)*gradient.xz;gradient.xy=rot(-uExtraShape3.z)*gradient.xy;
 gradient-=geometricNormal*dot(gradient,geometricNormal);
 gradient*=min(1.,1.05/max(.000001,length(gradient)))*smoothstep(.035,.28,view);
 return vec4(gradient,roughening);
}
#ifdef WEAVE_HIT_TAG
vec3 weaveLitTip;
#endif
#if defined(WEAVE_DETAIL) && !defined(WEAVE_BANDS_ONLY)
uniform vec2 uWeaveFocus;
#endif
vec3 reliefNormal(vec3 original,vec3 geometricNormal,vec3 rd,vec3 gradient){
 vec3 n=normalize(original-gradient);
 if(dot(reflect(rd,n),geometricNormal)<.001)n=normalize(mix(n,geometricNormal,.75));
 if(dot(reflect(rd,n),geometricNormal)<0.)n=geometricNormal;
 if(uGrowthShape.x>0.){
  // Continuous conservative slope limit: no abrupt normal flip at grazing
  // angles or on the brightly lit sides of growing cells.
  vec3 g=gradient-(original-geometricNormal);g-=geometricNormal*dot(g,geometricNormal);
  float limit=tan(.48*asin(clamp(dot(geometricNormal,-rd),.001,1.)));
  g*=limit/(limit+length(g));return normalize(mix(n,normalize(geometricNormal-g),smoothstep(0.,.15,uGrowthShape.x)));
 }
 return n;
}
`+'\nvec4 shade(');
MODERN_FRAG=shaderFunction(MODERN_FRAG,'shade',`vec4 shade(vec3 p,vec3 geometricNormal,vec3 rd,bool hit,out float issue){
 issue=0.;vec3 local=transform(p),n=geometricNormal;
 float fibreWeight=0.,fibreDensity=1.;vec3 fibreTangent=vec3(0.,1.,0.);
 float branches=0.,weaveTip=0.,weaveThroat=0.,weaveRelease=0.,weaveStriae=0.,weaveSpeckle=0.;
 float cupDiffusion=0.,cupSeed=0.,cupHeight=0.,weaveDepth=1.,tissue=0.,tissueFilm=0.,tissueFibre=0.,tissuePulp=0.,cupGlow=0.,wallCloud=0.;
 float youngTissue=0.,silkGap=0.,silkDensity=0.,silkRelief=0.,loadedWeb=0.,carrierLight=0.,pocketLoad=0.,pocketGauze=0.,foldedSilk=0.;
 #if defined(WEAVE_DETAIL) && !defined(WEAVE_BANDS_ONLY)
 branches=uWeaveNetwork.x*uStructureA.x*uStructureA.z*uStructureA.w;
 #endif
 float textureFilter=1.-smoothstep(.28,.65,84.*3.4/min(uResolution.x,uResolution.y)/(2.*PI));
 #ifdef FAN_FIELD
 if(uStructureFan>0.&&uTexture.z>.001){
  vec3 sampleLocal=structureWarp(local/axes());vec2 plane=sampleLocal.xy;
  vec4 drape=fanDrapeCoordinates(sampleLocal);float drapeWeight=fanDrapeBlend();
  float r=length(plane),a=atan(plane.y,plane.x);
  float frequency=clamp(160.+35.*uMaterialDetail.y,160.,900.);
  float strands=a*floor(frequency)+2.6*sin(a*21.+r*6.)+1.3*sin(r*8.-a*13.);
  float weft=r*frequency*.62+sin(a*14.+r*7.)*1.5;
  strands=mix(strands,drape.x*frequency+1.2*sin(drape.x*12.+drape.y*5.),drapeWeight);
  weft=mix(weft,drape.y*frequency*.4+sin(drape.x*8.-drape.y*3.),drapeWeight);
  // Derivatives inside a varying-depth layer loop are undefined. An analytic
  // footprint keeps microscopic strands stable while the sheet turns.
  float footprint=3.4/(min(uResolution.x,uResolution.y)*max(.001,uFrame.x*min(axes().x,axes().y)));
  float antialias=1.-smoothstep(1.1,3.1,frequency*footprint/max(.1,mix(r,drape.w,drapeWeight)));
  fibreWeight=uStructureFan*uTexture.x*uTexture.z;
  fibreDensity=mix(.76,.64+.36*pow(.5+.5*cos(strands),3.),antialias);
  fibreTangent=normalize(mix(vec3(plane,.001),vec3(.2*sin(drape.y*2.6+uStructureF.z*6.28318530718),1.,.3*cos(drape.y*2.7-uStructureF.z*6.28318530718)),drapeWeight));
  fibreTangent.yz=rot(-uOther.y)*fibreTangent.yz;fibreTangent.xz=rot(-uOther.x)*fibreTangent.xz;fibreTangent.xy=rot(-uExtraShape3.z)*fibreTangent.xy;
  vec3 fibre=normalize(mix(vec3(-plane.y,plane.x,0.)/max(.01,r),vec3(1.,0.,.15),drapeWeight));
  fibre.yz=rot(-uOther.y)*fibre.yz;fibre.xz=rot(-uOther.x)*fibre.xz;fibre.xy=rot(-uExtraShape3.z)*fibre.xy;
  float ripple=(sin(strands)*.8+sin(strands+weft)*.2)*smoothstep(.04,.18,r);
  vec3 genericBump=vec3(sin(local.y*84.),cos(local.x*71.),sin(local.z*69.))*uTexture.z*.045*textureFilter;
  n=normalize(n+mix(genericBump,fibre*uTexture.z*.014*antialias*ripple,uStructureFan));
 }else
 #endif
 if(uTexture.z>.001)n=normalize(n+vec3(sin(local.y*84.),cos(local.x*71.),sin(local.z*69.))*uTexture.z*.045*textureFilter*(1.-branches*.96));
 float localRoughness=uMat.w,coatRoughness=uCoat.y;
 bool reliefActive=dot(uMaterialLayers,vec4(1.))>.000001||uGrowthShape.x>0.;
 if(reliefActive){vec4 detail=materialRelief(local,geometricNormal,rd);n=reliefNormal(n,geometricNormal,rd,detail.xyz);localRoughness=clamp(localRoughness+detail.w*(1.-localRoughness),0.,1.);coatRoughness=clamp(coatRoughness+detail.w*.25,0.,1.);}
 float facing=max(dot(n,-rd),0.),pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
 vec3 base=palette(pos),specular=environment(reflect(rd,n),p,localRoughness);
 #ifdef WEAVE_DETAIL
 #ifndef WEAVE_BANDS_ONLY
 if(branches>.0001){
  float release=uWeaveNetwork.z,edge=pow(1.-facing,2.1);
  vec3 domain=structureWarp(local/axes());
  vec2 uv=weaveNetworkChart(domain,uStructureF.z*6.28318530718);
  float frequency=104.*uWeaveNetwork.y;
  float footprint=4.8/(min(uResolution.x,uResolution.y)*max(.001,uFrame.x*min(axes().x,axes().y)));
  float antialias=1.-smoothstep(.65,2.5,frequency*footprint);
  float drift=1.21*sin(uv.y*20.+uv.x*7.)+.62*sin(uv.y*55.-uv.x*9.);
  float fibre=pow(.5+.5*cos(uv.x*frequency+drift),6.);
  float secondary=pow(.5+.5*cos((uv.x*.75+uv.y*.64)*frequency-drift),8.);
  float scatter=branches*uTexture.z*(.25+.75*max(uWeaveGrowth.z,release));
  float normalAngle=atan(geometricNormal.y,geometricNormal.x),cupAngle=normalAngle;
  float textureLock=max(uWeaveDetail.x,uWeaveDetail.z);
  #ifdef WEAVE_HIT_TAG
  float terminal=min(1.,weaveLitTip.x/14.);
  weaveTip=mix(step(.60,terminal),smoothstep(.18,.94,terminal),textureLock);
  cupSeed=step(14.5,weaveLitTip.x);
  cupHeight=weaveLitTip.y;
  weaveThroat=weaveTip*pow(1.-cupHeight,3.);
  cupAngle=weaveLitTip.z*6.28318530718;
  #else
  vec2 site=fract(uv+.5)-.5;
  cupHeight=smoothstep(.10,.42,site.y);
  weaveTip=smoothstep(.08,.25,abs(site.x))*cupHeight*.65*max(textureLock,clamp(uWeaveDetail.w,0.,1.));
  weaveThroat=weaveTip*.24;
  #endif
  weaveRelease=release;
  cupDiffusion=uWeaveDetail.w*branches*weaveTip*max(smoothstep(.24,.68,release),.70*smoothstep(.15,.72,uWeaveGrowth.y));
  float distanceFromFocus=max(0.,uWeaveFocus.y-p.z);
  weaveDepth=mix(1.,.13+.87*exp(-.59*distanceFromFocus),uWeaveDetail.x*uWeaveFocus.x);
  float oldSpokes=floor(21.+13.*uWeaveNetwork.y);
  float oldFine=(1.-smoothstep(.8,2.9,oldSpokes*footprint*4.9))*smoothstep(.10,.54,length(geometricNormal.xy));
  float oldSpoke=.19+oldFine*(pow(.5+.5*cos(normalAngle*oldSpokes+2.3*sin(domain.y*13.)),5.)-.19);
  float spokes=floor(26.+19.*uWeaveNetwork.y);
  float fine=(1.-smoothstep(.69,2.45,spokes*footprint*4.6))*smoothstep(.035,.44,cupHeight);
  float aperture=smoothstep(.10,.73,uWeaveGrowth.y);
  float fibreDrift=2.1*sin(cupHeight*6.+5.*cupAngle)+1.15*sin(11.*cupAngle)+.53*sin(cupHeight*23.-7.*cupAngle);
  float radialFibre=pow(.5+.5*cos(cupAngle*spokes+fibreDrift),8.);
  float alignedSpoke=.19+(.28+.56*aperture)*fine*(radialFibre*(.78+.22*sin(7.*cupAngle+12.*cupHeight))-.19);
  float spoke=mix(oldSpoke,alignedSpoke,textureLock);
  float striae=mix(mix(.21,max(fibre,.56*secondary),antialias),spoke,weaveTip);
  vec3 grains=domain*139.;
  vec3 cell=floor(grains),offset=fract(grains)-.5;
  float random=fract(sin(dot(cell,vec3(127.1,311.7,147.39)))*43758.5453);
  float cluster=smoothstep(.48,.83,random);
  float grainAA=1.-smoothstep(.42,1.39,footprint*139.);
  weaveSpeckle=cluster*exp(-dot(offset,offset)*18.)*grainAA*(1.+textureLock*weaveTip*(.64-1.09*aperture));
  #ifdef WEAVE_HIT_TAG
  float ring=spokes*2.;
  vec2 wallCell=vec2(weaveLitTip.z*ring+.39*sin(cupHeight*41.),cupHeight*49.);
  vec2 wallId=floor(wallCell);wallId.x=mod(wallId.x,ring);
  vec2 dotSeed=fract(sin(vec2(dot(wallId,vec2(127.1,311.7))+uSeed,dot(wallId,vec2(269.5,183.3))+7.9))*43758.5453);
  float glowSeed=dotSeed.x;
  vec2 speck=fract(wallCell)-(.20+.60*dotSeed);
  float shimmer=smoothstep(.49,.95,glowSeed)*exp(-dot(speck,speck)*25.);
  weaveSpeckle+=weaveTip*textureLock*shimmer*(1.-.81*aperture)*(1.-smoothstep(.63,2.8,ring*footprint*4.));
  tissue=uWeaveTension*branches;
  if(tissue>0.){
   float k=.78+.23*sqrt(uStructureB.x);
   vec2 chart=tissueChart(domain,k);
   float y=mod(chart.y+.48,1.65)-.48;
   float along=mod(chart.x-tissueSpine(y)+.61,1.22)-.61;
   float label=weaveLitTip.x;
   float sheath=label<.5?weaveLitTip.y:0.;
   tissueFilm=max(sheath,1.-step(.45,abs(label-1.)))*tissue*(1.-.74*smoothstep(.20,.73,release));
   weaveTip=mix(weaveTip,clamp((label-2.)/12.,0.,1.),tissue);
   float juvenile=1.-smoothstep(.12,.63,release);
   // At a young insertion the axial bundle is embedded in the membrane.
   // Keep its fibres and scattering continuous until the membrane withdraws.
   tissueFilm=max(tissueFilm,.86*tissue*juvenile*(1.-weaveTip)*uWeaveGrowth.z);
   pocketLoad=uTissueYoung.x*smoothstep(.075,.18,release)*(1.-smoothstep(.24,.48,release));
   float across=tissueFilm>.001?tissueTransverse(chart,pocketLoad*uWeaveGrowth.z*smoothstep(-.32,.24,domain.z)):0.;
   float fineScale=uWeaveNetwork.y*310.;
   float pull=mix(chart.x*.67+chart.y*.55,3.8*abs(along)*across+.115*chart.x+.21*chart.y,uWeaveDetail.z);
   float a=pull*fineScale+2.10*sin(17.*chart.y-23.*chart.x)+.69*sin(49.*chart.x+87.*chart.y);
   float b=(pull*.64+.21*chart.x-.16*chart.y)*fineScale+1.38*sin(31.*chart.y+17.*chart.x)-.83*sin(68.*chart.x-41.*chart.y);
   float fibreAA=1.-smoothstep(1.,4.5,fineScale*footprint);
   float fibrils=max(pow(.5+.5*cos(a),8.),.87*pow(.5+.5*cos(b),6.));
   float coarse=.5+.5*sin(a*.23+1.69*sin(16.*chart.x+7.*chart.y));
   tissueFibre=mix(.27,fibrils,fibreAA)*(.44+.56*coarse);
   vec2 drift=.014*vec2(sin(chart.y*28.+chart.x*13.),sin(chart.x*27.-chart.y*18.))
             +.005*vec2(sin(chart.x*62.+chart.y*47.),cos(chart.y*71.-chart.x*51.));
   vec2 strand=vec2(chart.x*.88+chart.y*.51,pull*1.16+chart.y*.18);
   float freq=44.*uWeaveNetwork.y;
   float filigree=tissueLace((strand+drift)*vec2(.59,1.6)*freq,clamp(freq*footprint,.02,.43));
   float crossed=tissueLace((mat2(.64,.77,-.77,.64)*chart+drift*.59+vec2(.71,.18))*freq*vec2(.76,1.24),clamp(freq*footprint,.02,.43));
   tissueFibre=max(tissueFibre*.76,max(filigree*.83,crossed*.53)*(.56+.44*coarse));
   // Longitudinal filaments turn with the local tangent, including where
   // a side shoot arcs away from the spine. Integer winding closes the seam.
   float circum=weaveLitTip.z*6.2831853,arc=weaveLitTip.y;
   float turns=floor(7.+11.*uWeaveNetwork.y);
   float bundlePhase=circum*turns+1.7*sin(3.*circum+9.*arc)+.81*sin(13.*arc-circum)+.53*sin(4.*circum-19.*arc);
   float axialFibre=pow(.5+.5*cos(bundlePhase),5.)*(.72+.28*cos(4.*circum-7.*arc));
   float axAA=1.-smoothstep(.025,.13,footprint*turns);
   tissueFibre=mix(tissueFibre,mix(.23,axialFibre,axAA),uWeaveDetail.z*(1.-tissueFilm)*(1.-weaveTip));
   // A loaded web has fine silk at its edge; a thick shoot scatters light
   // through its bulk. Keep the mesh contrast away from the solid stalk.
   float bareWeb=1.-smoothstep(.18,.56,abs(label-1.));
   float load=uTissueYoung.x*(1.-smoothstep(.17,.68,release));
   tissueFibre=mix(tissueFibre,mix(.20+.09*axialFibre,.12+.65*fibrils,bareWeb),load*.84);
   youngTissue=load*tissue;
   // Optical thickness follows distance from the supporting rib. Material
   // labels alone change abruptly where a spherical seed meets a sheet.
   float support=min(abs(along),across);
   float suspended=bareWeb*smoothstep(.79,.96,weaveLitTip.y);
   silkGap=max(smoothstep(.007,.069,support),suspended)*(1.-weaveTip);
   // A germinating stalk takes up the load carried by silk at rest.
   silkGap*=1.-.90*uWeaveGrowth.x*(1.-bareWeb);
   float supportGap=weaveLitTip.y;
   // The thin binder stops being opaque immediately outside the nodule.
   // Use its actual distance to the support to soften the sewn attachment.
   float freeSpan=mix(supportGap,sqrt(max(0.,supportGap)),bareWeb);
   silkGap=mix(silkGap,freeSpan,load);
   // The broad web is a sparse veil of crossing, unevenly loaded strands.
   // Below one pixel integrate the high-frequency fibrils to their mean.
   float fineMesh=max(filigree,.72*crossed);
   // The web spans two ribs at their intersection. Farther along a single
   // rib the same sheet lies against a solid support, even without buds.
   float settled=1.-smoothstep(.12,.42,uWeaveGrowth.x);
   float carrier=(1.-smoothstep(.034,.123,support))*smoothstep(.075,.255,max(abs(along),across));
   carrierLight=settled*carrier*(1.-weaveTip)*smoothstep(-.26,.45,domain.z);
   silkGap*=1.-settled*carrier*bareWeb;
   loadedWeb=settled*bareWeb*(1.-carrier);
   float fineLoad=mix(.28,fibrils,fibreAA);
   float lock=.5+.5*sin(23.*chart.y+13.*chart.x+2.1*sin(14.*chart.x-21.*chart.y));
   float fibreLoad=.57*fineMesh+.23*fineLoad+.28*filigree*crossed;
   silkDensity=mix(.16,.007+fibreLoad*(.27+.73*lock)+.037*coarse,uTexture.z);
   float gauze=bareWeb*smoothstep(.37,.388,weaveLitTip.z)*(1.-smoothstep(.452,.47,weaveLitTip.z));
   float loadDensity=clamp((weaveLitTip.z-.39)/.06,0.,1.);
   float foldedFilm=bareWeb*step(.485,weaveLitTip.z)*(1.-step(.56,weaveLitTip.z));
   float foldedCord=bareWeb*step(.56,weaveLitTip.z)*(1.-step(.635,weaveLitTip.z));
   float doubled=clamp((weaveLitTip.z-mix(.49,.565,foldedCord))/.065,0.,1.);
   foldedSilk=pocketLoad*(foldedFilm+foldedCord)*doubled;
   gauze=max(gauze,foldedFilm);
   silkDensity=mix(silkDensity,.013+loadDensity*(.042+.13*coarse+.62*fibreLoad),gauze*uTexture.z);
   // Physical sling fibres and loose ends have a real cross section. Let
   // their illuminated cores read against the holes between neighbouring
   // strands, even when the much thinner film sharing the node is clear.
   float loose=bareWeb*smoothstep(.65,.71,weaveLitTip.z)*(1.-smoothstep(.76,.82,weaveLitTip.z));
   float cord=max(foldedCord,bareWeb*smoothstep(.84,.91,weaveLitTip.z));
   float catchLight=smoothstep(.54,.86,.48*coarse+.30*fineLoad+.22*lock);
   silkDensity=mix(silkDensity,.17+.18*coarse+.27*catchLight,cord*uTexture.z);
   silkDensity=mix(silkDensity,.017+.045*coarse+.30*catchLight,loose*uTexture.z);
   silkGap=mix(silkGap,max(silkGap,.97*loose),load);
   // As the loaded pocket extends, the mesh stretches into longitudinal
   // bundles. Thin cross-ties bridge these bundles with open space between.
   if(pocketLoad>.0001 && bareWeb>0.){
    vec2 warp=vec2(along+.022*sin(14.*y+11.*along)+.007*sin(35.*y-8.*along),y);
    vec2 yarn=warp*freq*vec2(1.14,.14);
    float close=tissueLace(yarn+vec2(.35*sin(yarn.y*2.3),.28*cos(yarn.x*.71)),clamp(freq*footprint*.66,.016,.32));
    float fineTie=tissueLace((chart+drift)*vec2(.61,1.38)*freq*.61,clamp(freq*footprint*.53,.015,.32));
    float tow=.5+.5*sin(34.*along+6.3*sin(9.*y+17.*along)+1.8*cos(8.*y-23.*along));
    float suspendedSilk=.021+(.22+.56*tow*tow)*close+.19*fineTie*fineTie;
    float span=pocketLoad*bareWeb*(1.-max(cord,loose));
    silkDensity=mix(silkDensity,mix(.19,suspendedSilk,uTexture.z),span);
    // Crimped wisps occupy depth on either side of the visible yarn. Their
    // integrated coverage remains visible when the camera cannot resolve
    // each fibril. The openings outside each patch still pass the backdrop.
    pocketGauze=span*(.24+.76*gauze*(.54+.46*loadDensity));
    loadedWeb=max(loadedWeb,span*(1.-.56*carrier));
    silkGap=max(silkGap,span*(1.-.55*carrier));
   }
   // Crossed fibres also leave relief in the opaque part of the sheet.
   // The stretched stem and the centre of each bud keep a smooth surface.
   silkRelief=(fibreLoad-.34)*uTexture.z*(1.-weaveTip)
      *bareWeb*freeSpan*(1.-max(cord,loose))*(.25+.75*(1.-smoothstep(.20,.79,uWeaveGrowth.x)));
   float pore=tissuePore(chart,abs(along),across);
   float bundle=1.-smoothstep(-.006,.006,pore);
   tissuePulp=mix(.21,.44+.56*bundle,weaveLitTip.y)*(.21+.79*tissueFibre);
   striae=mix(striae,mix(tissueFibre,spoke,weaveTip),tissue);
   // Granules are carried on the wall; their footprint widens as they
   // become subpixel so a moving cup doesn't flash individual dots.
   vec2 dust=vec2(weaveLitTip.z*83.+.81*sin(13.*cupHeight+5.*cupAngle),cupHeight*39.+.35*cos(5.*cupAngle));
   vec2 dustId=floor(dust);dustId.x=mod(dustId.x,83.);
   vec2 grainSite=fract(sin(vec2(dot(dustId,vec2(41.31,93.67)),dot(dustId,vec2(61.13,28.79)))+uSeed)*21547.61);
   vec2 grainDistance=fract(dust)-(.18+.64*grainSite);
   float variance=.023+min(.085,footprint*7.);
   float dustGlow=smoothstep(.31,.92,grainSite.x)*exp(-.5*dot(grainDistance,grainDistance)/variance)*.023/variance;
   // A thin suspension of fibres follows the wall. Using a cylinder in
   // material space keeps both grain and haze continuous across the seam.
   vec3 shellCoord=vec3(cos(cupAngle),sin(cupAngle),2.7*cupHeight);
   float waviness=sin(dot(shellCoord,vec3(2.,3.,4.))+uSeed);
   float density=.50+.23*sin(dot(shellCoord,vec3(4.,-2.,3.))+1.8*waviness)
                    +.16*sin(dot(shellCoord,vec3(-6.,5.,4.))+waviness)
                    +.10*cos(dot(shellCoord,vec3(13.,8.,-10.))+2.*waviness);
   wallCloud=smoothstep(.12,.85,density)*weaveTip*tissue*uTexture.z;
   weaveSpeckle=mix(weaveSpeckle,weaveTip*(.10*shimmer+dustGlow*(.48+.95*density))*(1.-.57*aperture),tissue);
   float radiusAtHeight=.083+1.01*smoothstep(0.,1.,cupHeight)+.12*sin(cupHeight*3.14159265);
   float side=cos(cupAngle)*radiusAtHeight;
   float centre=cupHeight-.35-.035*cos(cupAngle);
   vec2 pupil=vec2(side/.235,centre/.143);
   float chord=sqrt(max(0.,1.-dot(pupil,pupil)));
   cupGlow=weaveTip*(.70*chord+.30*exp(-.50*dot(pupil,pupil)));
   weaveThroat=mix(weaveThroat,weaveTip*exp(-side*side*3.7-centre*centre*14.),tissue);
   cupDiffusion=uWeaveDetail.w*branches*weaveTip*max(smoothstep(.17,.66,release),aperture*smoothstep(.045,.43,uWeaveGrowth.x));
   float farLight=mix(1.,.46,smoothstep(.22,.74,release));
   weaveDepth*=mix(1.,farLight+(1.-farLight)*exp(-1.3*max(0.,distanceFromFocus-.40)),tissue*uWeaveFocus.x);
   weaveDepth=mix(weaveDepth,.56+.44*weaveDepth,uTissueYoung.x*tissue*juvenile);
  }
  #endif
  weaveStriae=striae;
  vec3 inner=uInternalColor/max(.18,dot(uInternalColor,vec3(.2126,.7152,.0722)));
  base*=mix(vec3(1.),clamp(inner,vec3(.4),vec3(1.8)),branches*release*.61);
  base*=1.+scatter*(striae*.17-.023)*(1.-weaveTip*(1.-release));
  specular+=base*scatter*(striae*.048+weaveSpeckle*.042+release*edge*.24);
  fibreWeight=max(fibreWeight,scatter*(.20+.31*release)*(1.-.75*weaveTip));
  fibreDensity=mix(fibreDensity,.72+.28*striae,scatter);
  fibreTangent.yz=rot(-uOther.y)*fibreTangent.yz;fibreTangent.xz=rot(-uOther.x)*fibreTangent.xz;fibreTangent.xy=rot(-uExtraShape3.z)*fibreTangent.xy;
 }else
 #endif
 if(uWeaveGrowth.z*uTexture.z>.0001){
  vec3 samplePoint=local/axes();
  float frequency=220.+34.*uMaterialDetail.y;
  float bend=1.8*sin(dot(samplePoint,vec3(41.,27.,-13.)))+.9*sin(dot(samplePoint,vec3(-23.,38.,17.)));
  float warp=dot(samplePoint,vec3(1.,.57,.23))*frequency+bend;
  float weft=dot(samplePoint,vec3(-.61,1.,.37))*frequency*.81+bend*.63;
  float footprint=3.4/(min(uResolution.x,uResolution.y)*max(.001,uFrame.x*min(min(axes().x,axes().y),axes().z))*max(.2,abs(dot(geometricNormal,-rd))));
  float range=frequency*footprint*1.2;
  float lines=max(pow(.5+.5*cos(warp),12.),pow(.5+.5*cos(weft),14.));
  float mesh=.58+.42*smoothstep(-.68,.83,sin(dot(samplePoint,vec3(57.,39.,31.))+bend*.83));
  float scatter=uWeaveGrowth.z*uTexture.z*mesh*(1.-smoothstep(.8,3.2,range));
  base*=1.+scatter*(lines*.2-.025);
  specular+=lines*scatter*.012;
 }
 #endif
 vec3 dielectricF=fresnel(facing,1.,max(1.,uMat.y),local),diffuseLight=environment(n,p,1.)*.14;
 vec3 cupLight=vec3(0.);
 for(int i=0;i<uLightCount;i++){
  vec3 off=uLights[i].xyz-p;float cosine=max(dot(n,normalize(off)),0.);
  diffuseLight+=uLightColors[i]*cosine*uLights[i].w*.35/(1.+dot(off,off)*.08);
  float fibreCosine=sqrt(max(0.,1.-pow(dot(fibreTangent,normalize(off)),2.)));
  diffuseLight+=uLightColors[i]*fibreWeight*fibreCosine*uLights[i].w*.28/(1.+dot(off,off)*.12);
  if(cupDiffusion>0.||tissue>0.)cupLight+=uLightColors[i]*uLights[i].w*(.67+.33*abs(dot(geometricNormal,normalize(off))))/(1.+dot(off,off)*.11);
 }
 vec3 diffuse=base*diffuseLight*(1.-uMat.z*(1.-uMat.x));
 if(uTransport.x>.001)diffuse=mix(diffuse,subsurfaceLight(p,geometricNormal,base),uTransport.x);
 float transmission=clamp(uMat.x,0.,1.);
 transmission*=1.-branches*weaveTip*(1.-weaveRelease)*.61;
 transmission+=transmission*(1.-transmission)*branches*weaveTip*smoothstep(.42,.85,weaveRelease)*pow(facing,.7)*.96;
 #if defined(WEAVE_DETAIL) && !defined(WEAVE_BANDS_ONLY)
 float cupClear=uWeaveDetail.x*weaveTip*smoothstep(.48,.98,weaveRelease);
 transmission+=cupClear*.28*transmission*(1.-transmission);
 #endif
 transmission*=1.-cupSeed*clamp(cupDiffusion*.66,0.,.82);
 transmission=1.-(1.-transmission)*mix(1.,fibreDensity,fibreWeight*transmission);
 // A grazing view crosses a longer path through the same fibres. Use that
 // optical depth for both transmitted light and diffuse fibre visibility.
 transmission=pow(transmission,mix(1.,1./max(.14,facing),fibreWeight));
 #ifdef WEAVE_HIT_TAG
 if(tissueFilm>0.){
  float gap=clamp(weaveLitTip.y*(1.-tissueFibre),0.,1.);
  float depth=mix(1.56,.21,smoothstep(.12,.98,gap))*(.80+.43*tissuePulp);
  depth*=1.-.66*uTissueYoung.x*gap;
  if(transmission>0.)transmission=mix(transmission,pow(transmission,depth),tissueFilm*smoothstep(0.,.15,uMat.x));
  diffuse*=1.+tissueFilm*(.17+.48*tissueFibre);
 }
 if(youngTissue>0.){
  float silkPath=inversesqrt(.33+.67*facing*facing);
  float depth=mix(2.48,(.065+1.05*silkDensity)*silkPath,silkGap);
  // A resting veil can lie close to several beads without becoming solid.
  // Its own fibre coverage governs the light passed to deeper intersections.
  float webDepth=(.048+.36*silkDensity+.60*smoothstep(.34,.67,silkDensity))*silkPath;
  webDepth+=pocketGauze*(.34+.38*silkDensity)*silkPath;
  depth=mix(depth,webDepth,loadedWeb);
  // Several plies along one folded edge scatter more incident light than
  // the single gauze stretched across the middle of the same pocket.
  depth+=foldedSilk*(.86+.41*silkDensity)*silkPath;
  transmission=mix(transmission,pow(clamp(uMat.x,0.,1.),depth),youngTissue);
 }
 #endif
 specular*=1.-fibreWeight*.54;
 vec4 glass=vec4(0.);float unused;
 if(transmission>.0001){
  vec4 straight=sceneRay(vec3(p.xy,4.8),rd,unused);
  vec3 beta=exp(-absorptionCoefficient(base)*max(.003,wallDepth())*4./max(.1,facing));
  straight.rgb*=beta;straight.a=1.-min(min(beta.r,beta.g),beta.b)*(1.-straight.a);
  if(uModern.x>.999||!hit){glass=straight;}else{
   #if DISPERSION_ENABLED
   vec3 spectrum=vec3(0.);float alpha=0.,ior=max(1.,uMat.y);
   for(int k=0;k<5;k++){
    float wavelength=k==0?.650:k==1?.580:k==2?.510:k==3?.475:.435;
    vec3 weight=k==0?vec3(.65,0,0):k==1?vec3(.28,.18,0):k==2?vec3(.07,.65,.12):k==3?vec3(0,.17,.58):vec3(0,0,.30);
    float status;vec4 spectralRay=transmitted(p,geometricNormal,rd,base,vec3(1.),max(1.,ior+uOptics.y*.024*(1./(wavelength*wavelength)-1./(.510*.510))),status);
    spectrum+=spectralRay.rgb*weight;alpha=max(alpha,spectralRay.a);issue=max(issue,status);
   }
   glass=vec4(spectrum,alpha);
   #else
   glass=transmitted(p,geometricNormal,rd,base,vec3(1.),max(1.,uMat.y),issue);
   #endif
   // The ray solver already contains the entry reflection. Account for it once in the surface stack.
   vec3 entrySpecular=specular,entryF=dielectricF;
   if(reliefActive){entrySpecular=environment(reflect(rd,geometricNormal),p,uMat.w);entryF=fresnel(max(dot(geometricNormal,-rd),0.),1.,max(1.,uMat.y),local);}
   glass.rgb=max(vec3(0.),glass.rgb-entrySpecular*entryF);
   glass.a=clamp((glass.a-max(max(entryF.r,entryF.g),entryF.b))/max(.001,1.-entryF.r),0.,1.);
   glass=mix(glass,straight,clamp(uModern.x,0.,1.));
  }
 }
 vec3 below=(vec3(1.)-dielectricF)*diffuse*(1.-transmission)+glass.rgb*transmission;
 float wetRim=pow(1.-facing,1.75);
 float veil=branches*weaveRelease*transmission;
 vec3 fibreLight=base*(vec3(.23,.29,.35)+diffuseLight*.13);
 below+=fibreLight*veil*(wetRim*(.48+.72*weaveTip)+weaveStriae*.22+weaveSpeckle*.55+weaveThroat*.82*(1.-tissue))*(.18+.82*uTexture.z);
 float neck=exp(-43.*pow(cupHeight-.16,2.));
 float rimVisibility=wetRim*smoothstep(.13,.71,cupHeight);
 float capTransport=.001+.056*rimVisibility+.096*neck+.019*weaveStriae+.108*weaveSpeckle;
 vec3 cupTint=mix(uInternalColor,vec3(.88,.97,1.),clamp(.41*neck+.84*cupSeed,0.,1.));
 below+=cupTint*cupLight*cupDiffusion*(capTransport*mix(.57,1.,transmission)+cupSeed*.57);
 #ifdef WEAVE_HIT_TAG
 if(tissue>0.){
  float opening=smoothstep(.22,.92,uWeaveGrowth.y);
  float closedShell=weaveTip*tissue*transmission*smoothstep(.40,.67,weaveRelease)*(1.-opening);
  float pathAtEdge=exp(-6.5*facing*facing);
  below*=1.-closedShell*(.80-.74*pathAtEdge);
  below+=mix(uInternalColor,base,.30+.45*pathAtEdge)*cupLight*closedShell*(.32*pathAtEdge+.10*weaveSpeckle+.13*wallCloud)*(.72+.28*geometricNormal.y);
  float collar=opening*(.27*weaveThroat+1.26*cupGlow+.047*wallCloud)+wetRim*.36+weaveSpeckle*(.33+.63*wetRim);
  below+=mix(uInternalColor,cupTint,.41+.55*cupGlow)*cupLight*cupDiffusion*tissue*collar;
  float suspended=weaveTip*weaveRelease*tissue*(1.-.90*opening);
  below=mix(below,below*mix(vec3(.63,.79,.98),vec3(1.),wetRim)+uInternalColor*(.15*wetRim+.13*weaveSpeckle),clamp(suspended,0.,1.));
  float stem=(1.-weaveTip)*(1.-tissueFilm)*tissue;
  float clearStem=transmission*weaveRelease*stem;
  below*=1.-clearStem*(.77-.28*tissueFibre)*pow(facing,.72);
  below+=mix(base,uInternalColor,.69)*cupLight*clearStem*(.009+.119*pow(1.-facing,.94)+.075*tissueFibre*uTexture.z);
  // A short path through suspended fibres scatters white light through the
  // feet and the plump nodes. Let the hue still follow the palette and lamps.
  float milk=1.-smoothstep(.19,.69,weaveRelease);
  vec3 milkTint=mix(base,vec3(dot(base,vec3(.2126,.7152,.0722))),.48);
  float packed=tissueFilm*(.23+.46*tissuePulp+.40*tissueFibre);
  float silk=uTissueYoung.x*tissueFilm;
  packed*=1.-.77*silk*(1.-.38*tissueFibre);
  below+=milkTint*cupLight*tissue*milk*(packed+weaveTip*(.36+.24*facing))*(.22+.78*uTexture.z);
  below+=fibreLight*tissueFilm*tissueFibre*(.23+.19*transmission)*(.16+.84*uTexture.z);
  below+=base*cupLight*tissueFilm*(.012+.084*tissueFibre*tissueFibre)*(.22+.78*uTexture.z);
  below+=base*cupLight*tissue*weaveTip*(1.-weaveRelease)*(.12+.083*wetRim);
  below*=1.-.30*silk*(1.-.63*facing)*(.68+.32*(1.-tissueFibre));
  if(uTissueYoung.x>0.){
   float membrane=1.-smoothstep(.12,.55,abs(weaveLitTip.x-1.));
   float pulp=(1.-membrane)*(.78+.22*weaveTip);
   vec3 scatter=mix(base,uInternalColor,.12)*cupLight;
   float wrap=.49+.30*facing+.21*geometricNormal.y;
   vec3 flesh=scatter*wrap*(.58+.13*weaveTip)*(1.-.67*transmission)+below*.22;
   below=mix(below,flesh,pulp*youngTissue*.65);
  }
  // On the rounded wall the grazing path remains visible during the
  // transition from a closed vesicle to an open, backlit bell.
  below+=mix(uInternalColor,base,.55)*cupLight*cupDiffusion*tissue*
         (pathAtEdge*(.17+.19*wallCloud)+wallCloud*.085)*(.35+.65*transmission);
 }
 #endif
 float alpha=(1.-transmission)+glass.a*transmission;
 vec3 surfaceF=dielectricF*max(.1,uSurface.z);
 surfaceF*=1.-clamp(uModern.x,0.,1.);
 below+=specular*surfaceF;alpha=1.-(1.-alpha)*(1.-max(max(surfaceF.r,surfaceF.g),surfaceF.b));
 // A thin conductive coating preserves transmission underneath, while opaque metal stays a conductor.
 vec3 metalF=mix(base,vec3(1.),pow(1.-facing,5.))*uMat.z*(1.-transmission*.48);
 below=below*(vec3(1.)-metalF)+specular*metalF;
 alpha=1.-(1.-alpha)*(1.-max(max(metalF.r,metalF.g),metalF.b));
 float filmAmount=uSurface.x*mix(.6,1.,uScatter.z);
 vec3 thinReflection=dielectricF*2./(vec3(1.)+dielectricF)*clamp(uModern.x,0.,1.);
 vec3 filmF=thinReflection;if(filmAmount>.0001)filmF=mix(thinReflection,soapFilm(local,facing),filmAmount);
 filmF*=uSurface.z;
 below=below*(vec3(1.)-filmF)+specular*filmF;
 alpha=1.-(1.-alpha)*(1.-max(max(filmF.r,filmF.g),filmF.b));
 if(uCoat.x>.001){vec3 coatF=fresnel(facing,1.,1.5,local)*uCoat.x;
  below=below*(vec3(1.)-coatF)+environment(reflect(rd,n),p,coatRoughness)*coatF;
  alpha=1.-(1.-alpha)*(1.-max(max(coatF.r,coatF.g),coatF.b));
 }
 #if DISPERSION_ENABLED
 float spectralEdge=pow(1.-facing,2.3)*smoothstep(.15,1.,uOptics.y)*transmission;
 float spread=uMat.y*(1.-facing)*2.4+atan(n.y,n.x)*.32;
 vec3 fringe=.42+.58*pow(.5+.5*cos(spread*3.1+vec3(.2,2.3,4.5)),vec3(2.));
 below+=spectralEdge*fringe*(specular*.23+vec3(.15));
 #endif
 below+=base*uSurface.w*(1.-transmission+transmission*pow(1.-facing,3.));
 if(max(uCellOptics.x,uCellOptics.w)>.0001){
  vec3 cellPoint=local/axes();
  float outside=smoothstep(uCellCore*.56,uCellCore+.42,length(cellPoint));
  float rim=pow(1.-facing,2.0),clarity=uCellOptics.w*outside*(.78-.66*rim);
  float nacre=uCellOptics.x,colour=.34+.66*outside;
  vec3 film=cellularInterference(cellPoint,facing);
  vec3 tint=mix(vec3(.86,.95,1.),film,.84*colour);
  vec3 reflected=reflect(rd,n);
  vec3 gloss=environment(reflected,p,max(.08,localRoughness*.6));
  float glints=pow(max(0.,dot(reflected,normalize(vec3(-.52,.69,.49)))),320.)
    +.62*pow(max(0.,dot(reflected,normalize(vec3(.61,.36,.70)))),520.)
    +.53*pow(max(0.,dot(reflected,normalize(vec3(-.52,-.53,.66)))),420.);
  vec3 milk=mix(vec3(.75,.85,.96),base,.54)*diffuseLight;
  // Clarity keeps the existing transmitted ray visible through the pearlescent
  // coating. Previously even clear cells replaced 94% of it with opaque milk.
  float clearCell=clamp(uCellOptics.w,0.,1.);
  vec3 pearl=milk*(.65+.55*facing)*mix(1.,.5,clearCell)+gloss*(vec3(.18)+tint*(.30+.89*rim))
    +(.09+.17*rim)*tint+glints*mix(vec3(1.,.93,.83),tint,.48)*3.2;
  below=mix(below,pearl,nacre*mix(.94,.46,clearCell));
  float unusedBackground;vec4 backdrop=sceneRay(vec3(p.xy,4.8),rd,unusedBackground);
  vec3 cellRay=normalize((transform(p+rd)-local)/axes());
  vec3 interior=cellularInterior(cellPoint,cellRay);
  below=mix(below,backdrop.rgb*mix(vec3(1.),tint,.25),clarity)
    +interior*uCellOptics.w*(.14+.26*facing);
  alpha=mix(alpha,backdrop.a,clarity);
 }
 #ifdef WEAVE_HIT_TAG
 if(youngTissue>0.){
  vec3 key=uLightCount>0?normalize(uLights[0].xyz-p):normalize(vec3(-1.,1.,1.));
  float lambert=clamp(.5+.5*dot(geometricNormal,key),0.,1.);
  // Broad diffuse return from below the skin lifts the silhouette of the
  // milky buds. Surface texture and volume scattering remain independent.
  float scatterDepth=1.-exp(-3.*(uInterior.w+uInterior.z));
  float wrap=mix(.24+.76*lambert*lambert,.52+.48*lambert,scatterDepth);
  vec3 pulp=mix(base,uInternalColor,.21);
  vec3 scatter=pulp*(.31*diffuseLight+.67*cupLight*wrap)*(1.+.53*silkRelief);
  scatter*=1.+1.2*carrierLight*scatterDepth;
  float budLight=.031+.16*lambert*lambert+.09*scatterDepth;
  scatter+=base*cupLight*weaveTip*(budLight+.12*uWeaveDetail.w*scatterDepth)*(.25+.75*uTexture.z);
  // A bead occludes the silk at its foot. A broad reflected fill and a
  // directional key give its exposed hemisphere volume at macro scale.
  float pearl=pocketLoad*weaveTip;
  vec3 pearlTint=mix(base,uInternalColor,.15);
  vec3 pearlLight=cupLight*(.29+1.05*lambert*lambert+.23*scatterDepth)+diffuseLight*.18;
  vec3 openSide=normalize(vec3(key.xy,.16*max(.01,key.z)));
  float rimLight=smoothstep(.05,.79,dot(geometricNormal,openSide));
  pearlLight*=mix(1.,.27+.77*rimLight,weaveLitTip.z);
   pearlLight*=mix(1.08,.935,weaveLitTip.z);
  scatter=mix(scatter,pearlTint*pearlLight,pearl);
  vec3 threads=mix(base,uInternalColor,.18)*cupLight*(.48+.95*silkDensity);
  threads+=base*cupLight*pocketGauze*(.18+.26*silkDensity);
  threads+=base*cupLight*foldedSilk*(.62+.36*silkDensity);
  vec3 slender=(mix(scatter,threads,silkGap)+specular*(.008+.033*wetRim)*uSurface.z)*(1.-transmission)+glass.rgb*transmission;
  // Where a film and its support share a surface, light returning from that
  // contact softens the edge; clear openings still transmit the layers behind.
  float backing=1.-smoothstep(.021,.20,weaveLitTip.y);
  vec3 webLight=threads*(1.-transmission)+mix(glass.rgb,scatter,backing*.55)*transmission;
  slender=mix(slender,webLight,loadedWeb);
  below=mix(below,slender,youngTissue*(1.-.32*uMat.z));
 }
 #endif
 below*=weaveDepth;
 float coreVisibility=1.-structureCore(local);
 return vec4(below*coreVisibility,1.-(1.-clamp(alpha,0.,1.))*coreVisibility);
}`);
MODERN_FRAG=shaderFunction(MODERN_FRAG,'photo',`vec3 filmic(vec3 x){
 // ACES RRT/ODT fit in its working color space, preserving hue and a soft highlight shoulder.
 x=mat3(.59719,.076,.0284,.35458,.90834,.13383,.04823,.01566,.83777)*x;
 vec3 a=x*(x+.0245786)-.000090537,b=x*(.983729*x+.432951)+.238081;
 x=a/b;return clamp(mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602)*x,0.,1.);
}
vec3 photo(vec3 radiance,vec2 uv){
 vec3 c=toSRGB(filmic(max(vec3(0.),radiance*exp2(uPhoto1.x))));
 c+=uPhoto1.y;float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,uPhoto1.w);c=(c-.5)*uPhoto1.z+.5;
 c+=uPhoto3.x*pow(max(0.,1.-lum),2.)+uPhoto3.y*pow(max(0.,lum),2.);
 c*=vec3(1.+uPhoto2.x*.18+uPhoto2.y*.08,1.-uPhoto2.y*.14,1.-uPhoto2.x*.18+uPhoto2.y*.08);
 c=pow(max(c,vec3(0.)),vec3(1./uPhoto4.x));return c*(1.-uPhoto2.z*smoothstep(.3,2.4,length(uv)));
}`);

MODERN_FRAG=MODERN_FRAG.replace('float width=max(.04,props.x)', 'if(props.w>5.5)return 1.-smoothstep(.8,1.05,length(q/max(.03,props.x)));float width=max(.04,props.x)');
MODERN_FRAG=MODERN_FRAG.replace('return bg(p);}', `vec3 color=bg(p);if(uModern.y>.001){
 vec2 center=uFrame.yz+vec2(0,-uShape.z*uFrame.x*.95),q=(p-center)/vec2(max(.1,uShape.y*uFrame.x),.18*uFrame.x);
 float shadow=exp(-dot(q,q)*1.4);color*=1.-shadow*uModern.y*uModern.z*.22;
 float lens=max(.08,uMat.y-1.),focus=.75+min(.8,lens),ring=exp(-pow((length(q/vec2(focus,1.))- .7)/.22,2.));
 color+=mix(vec3(1.),uInternalColor,.25)*ring*uModern.y*uModern.w*uMat.x*(1.-uMat.w)*.15;
  }return color;}`);
MODERN_FRAG=MODERN_FRAG.replace('vec3 reflectTint=mix(vec3(1.),max(vec3(.15),irid),uSurface.x*.5);','vec3 reflectTint=vec3(1.);');
MODERN_FRAG=MODERN_FRAG.replace('coverage=endScene.a;radiance+=beta*endScene.rgb;}','coverage=endScene.a;radiance+=beta*environment(direction,origin,uMat.w);}') ;
MODERN_FRAG=MODERN_FRAG.replace('(gl_FragCoord.xy-.5*uResolution)','(gl_FragCoord.xy+uSampling.xy-.5*uResolution)');
MODERN_FRAG=MODERN_FRAG.replace('float unused;vec4 back=sceneRay',`float pixel=3.4/min(uResolution.x,uResolution.y),silhouette=hit?-pow(max(0.,dot(normal,-direction)),2.)*min(min(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*.25:closest;
 float aa=!hit&&(uCellMorph>0.||uFractal.x>0.)?0.:1.-smoothstep(-pixel*.6,pixel*.6,silhouette);coverage=uCut.w<.002?aa:max(aa,coverage);float unused;vec4 back=sceneRay`);
MODERN_FRAG=MODERN_FRAG.replace('photo(surface.rgb,originalUV),coverage)', '(photo(surface.rgb,originalUV)+(toSRGB(back.rgb)-photo(back.rgb,originalUV))*(1.-surface.a)),coverage)');
MODERN_FRAG=MODERN_FRAG.replace('vec3 target=clamp(photo(mix(back.rgb,surface.rgb,coverage),originalUV),0.,1.);', 'vec3 target=mix(back.rgb,surface.rgb,coverage);');
MODERN_FRAG=MODERN_FRAG.replace('bodyAlpha=max(bodyAlpha,1.-min(min(target.r,target.g),target.b));','');
MODERN_FRAG=MODERN_FRAG.replace('fragColor=vec4(clamp(premultiplied/max(alpha,.000001)+grain,0.,1.),alpha);','fragColor=vec4(clamp(photo(premultiplied/max(alpha,.000001),originalUV)+grain,0.,1.),alpha);');
// Accumulate premultiplied samples in float precision, so transparent edges have no colored fringe.
MODERN_FRAG=MODERN_FRAG.replace(/\n}\n$/, '\n if(uSampling.z>.5){if(transparentExport())fragColor.rgb*=fragColor.a;else fragColor.a=clamp(coverage*surface.a+halo,0.,1.);fragColor*=uSampling.w;}\n}\n');
MODERN_FRAG=MODERN_FRAG.replace('vec3 fieldParts(vec3 world){',BASE_FORM_GLSL+'\n'+STRUCTURE_GLSL+'\n'+CELLULAR_GLSL+'\n'+FRACTAL_GLSL+'\nvec3 fieldParts(vec3 world){');
MODERN_FRAG=MODERN_FRAG.replace('p/=vec3(uShape.y,uShape.z,volume);','p/=vec3(uShape.y,uShape.z,volume);p=structureWarp(p);');
MODERN_FRAG=MODERN_FRAG.replace('float hole=-10000.,cut=-10000.;','d=cellularField(loopBlend(fractalField(d,p),p),p);d=structureField(d,p);float hole=-10000.,cut=-10000.;');
MODERN_FRAG=MODERN_FRAG.replace('float d=norm-1.-uWarp.x*w-uOther.z*ripple*.17-lobe;', 'float d=(uBaseForm>.5?baseFormField(p)+norm-length(p):norm-1.)-uWarp.x*w-uOther.z*ripple*.17-lobe;');
MODERN_FRAG=MODERN_FRAG.replace('float sx=sin(p.x*3.4+uSeed)', 'if(uBaseForm>.5)gradient+=baseFormGradient(p)-p/max(length(p),.000001);float sx=sin(p.x*3.4+uSeed)');
MODERN_FRAG=MODERN_FRAG.replace('vec3 parts=vec3(norm-1.-uWarp.x*sx', 'vec3 parts=vec3((uBaseForm>.5?baseFormField(p)+norm-length(p):norm-1.)-uWarp.x*sx');
// Geometry and absorption share the same thickness units so faces transmit
// the background even when the distance from the object's centre is large.
MODERN_FRAG=MODERN_FRAG.replace('vec3 bg(vec2 p){',`float structureCore(vec3 local){
 float r=length(local.xy/axes().xy);
 float inner=uStructureColor.y*uStructureFan*.45;
 return uStructureColor.x*(1.-smoothstep(inner,uStructureColor.y,r));
}
vec3 filmPigment(vec3 pigment,float facing){
 float peak=max(.002,max(pigment.r,max(pigment.g,pigment.b)));
 vec3 chroma=pow(max(vec3(.01),pigment/peak),vec3(.68));
 return mix(vec3(1.),chroma,uStructureFan*uOptics.w*(.19+.48*uColorLayers.x)*mix(1.3,.68,facing));
}
float filmPath(vec3 local){
 vec3 a=axes();
 float thickness=uStructureA.y*.66*uFrame.x*min(min(a.x,a.y),a.z);
 float falloff=smoothstep(.14,.9,length(local.xy/a.xy));
 return max(.003,thickness*(1.-uStructureH.x*.62*(1.-falloff)));
}
vec3 bg(vec2 p){`);
MODERN_FRAG=MODERN_FRAG.replace('max(.003,wallDepth())*4./max(.1,facing)','mix(max(.003,wallDepth()),filmPath(local),uStructureFan)*4./max(.1,facing)');
MODERN_FRAG=MODERN_FRAG.replace('straight.rgb*=beta;','beta*=filmPigment(base,facing);straight.rgb*=beta;');
// The core also attenuates transmitted light, independently of palette blending.
MODERN_FRAG=MODERN_FRAG.replace('straight.rgb*=beta;', 'beta*=exp(-structureCore(local)*5.);straight.rgb*=beta;');
// The centre tint is part of the existing material, under the same lights.
MODERN_FRAG=MODERN_FRAG.replace('vec3 base=palette(pos),specular=', 'vec3 base=palette(pos)*(1.-structureCore(local)),specular=');
// Flattening a procedural sculpture keeps its projected silhouette. Sampling
// only z=0 would silently erase offset petals, stems, cells and growing layers.
// Preserve the original flat treatment for the unadorned base form.
MODERN_FRAG=MODERN_FRAG.replace('float flatGeometry=1.-smoothstep(.1,.45,uShape.x)', 'float flatGeometry=(uPetals.x+uStem.x+uCellMorph+uFractal.x+dot(uGrowthGeometry,vec2(1.))+uStructureFan+dot(abs(uStructureA.xzw),vec3(1.))+abs(uStructureB.w)+abs(uStructureC.z)+abs(uStructureD.y)+dot(abs(uStructureE.xyz),vec3(1.))+dot(abs(uStructureF.xy),vec2(1.))+dot(abs(uStructureG),vec4(1.))>.000001)?0.:1.-smoothstep(.1,.45,uShape.x)');
// Thin membranes transmit straight through all visible layers. This shares the
// current field, palette and lights; it is not a separate surface or preset.
MODERN_FRAG=MODERN_FRAG.replace('vec4 shade(',`vec4 structureBehind(vec3 first,vec3 rd){
 float unused;vec4 background=sceneRay(vec3(first.xy,4.8),rd,unused);
 vec3 sum=vec3(0.),through=vec3(1.);float remaining=1.;
 vec3 origin=offsetBoundary(first,rd,true);
 bool inside=materialField(origin)<0.;
 for(int layer=0;layer<16;layer++){
  vec3 hit;float travel;
  if(!traceBoundary(origin,rd,20.*uFrame.x,false,hit,travel))break;
  inside=!inside;origin=offsetBoundary(hit,rd,inside);
  if(!inside)continue; // exiting the same sheet must not count it twice
  vec3 local=transform(hit),n=boundaryNormal(hit);if(dot(n,rd)>0.)n=-n;
  float facing=max(.08,dot(n,-rd));
  float pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
  vec3 tint=loopSurfacePalette(local,surfacePalette(local,palette(pos),hit))*(1.-structureCore(local));
  vec3 light=environment(n,hit,1.)*.14;
  for(int j=0;j<uLightCount;j++){vec3 off=uLights[j].xyz-hit;light+=uLightColors[j]*max(dot(n,normalize(off)),0.)*uLights[j].w*.35/(1.+dot(off,off)*.08);}
  vec3 beta=exp(-absorptionCoefficient(tint)*mix(max(.003,uStructureA.y),filmPath(local),uStructureFan)*4./facing)*filmPigment(tint,facing);
  beta*=exp(-structureCore(local)*5.);
  vec3 f=fresnel(facing,1.,max(1.,uMat.y),local)*max(.1,uSurface.z);
  f=f*2./(vec3(1.)+f);
  vec3 transmission=beta*uMat.x*(vec3(1.)-f);
  vec3 reflected=environment(reflect(rd,n),hit,uMat.w)*f;
  sum+=through*(tint*light*(1.-uMat.x)*(vec3(1.)-f)+reflected+tint*uSurface.w*(1.-uMat.x))*(1.-structureCore(local));
  transmission*=1.-structureCore(local);
  through*=transmission;remaining*=min(min(transmission.r,transmission.g),transmission.b);
  if(max(max(through.r,through.g),through.b)<.003)break;
 }
 return vec4(sum+through*background.rgb,1.-remaining*(1.-background.a));
}
vec4 shade(`);
MODERN_FRAG=MODERN_FRAG.replace('vec4 straight=sceneRay(vec3(p.xy,4.8),rd,unused);',
 `vec4 straight=sceneRay(vec3(p.xy,4.8),rd,unused);
 #if THIN_SHELL_ENABLED
 if(structureActive())straight=structureBehind(p,rd);
 #endif
`);
MODERN_FRAG=guardShaderFunction(MODERN_FRAG,'structureBehind','THIN_SHELL_ENABLED');
// Specialize only mathematically regular ellipsoids and truly thin shells.
// This removes the general multi-interface solver from the common bubble shader.
function specializeAnalytic(source,name,fast){
 const start=source.search(new RegExp('(?:vec[234]|float|bool|void)\\s+'+name+'\\s*\\(')),open=source.indexOf('{',start);
 let end=open+1,depth=1;while(depth){depth+=(source[end]==='{')-(source[end]==='}');end++;}
 return source.slice(0,open+1)+'\n#if ANALYTIC_SHAPE\n'+fast+'\n#else\n'+source.slice(open+1,end-1)+'\n#endif\n'+source.slice(end-1);
}
MODERN_FRAG=specializeAnalytic(MODERN_FRAG,'field',`return (length(transform(world)/vec3(uShape.y,uShape.z,max(.06,uShape.x*uShape.w)))-1.)*min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*.5;`);
MODERN_FRAG=specializeAnalytic(MODERN_FRAG,'surfaceGradient',`vec3 size=vec3(uShape.y,uShape.z,max(.06,uShape.x*uShape.w)),p=transform(world)/size,gradient=p/max(.000001,length(p))/size;
 gradient.yz=rot(-uOther.y)*gradient.yz;gradient.xz=rot(-uOther.x)*gradient.xz;gradient.xy=rot(-uExtraShape3.z)*gradient.xy;
 return gradient*min(min(size.x,size.y),size.z)*.5;`);
MODERN_FRAG=specializeAnalytic(MODERN_FRAG,'traceBoundary',`float t=firstRoot(ellipsoidRoots(origin,direction,1.));if(!outerOnly&&hasCavity())t=min(t,firstRoot(ellipsoidRoots(origin,direction,uInterior.x*(1.-uInterior.y))));travel=t;point=origin+direction*t;return t<maximum;`);
MODERN_FRAG=MODERN_FRAG.replace('if(uModern.x>.999||!hit){glass=straight;}else{', '#if THIN_SHELL_ENABLED\n glass=straight;\n#else\n if(uModern.x>.999||!hit){glass=straight;}else{');
MODERN_FRAG=MODERN_FRAG.replace('glass=mix(glass,straight,clamp(uModern.x,0.,1.));\n  }','glass=mix(glass,straight,clamp(uModern.x,0.,1.));\n  }\n#endif');
MODERN_FRAG=MODERN_FRAG.replace('vec3 base=palette(pos)*', 'vec3 base=loopSurfacePalette(local,surfacePalette(local,palette(pos),p))*');
// Preview budgets are normalized independently: changing sample counts never
// changes optical density or scattering strength. Full exports retain 16/4.
MODERN_FRAG=MODERN_FRAG.replace('for(int j=0;j<int(uRuntime.w)*14;j++){','for(int j=0;j<TRACE_STEPS;j++){if(j>=int(uBudget.x))break;');
MODERN_FRAG=MODERN_FRAG.replace('for(int bounce=0;bounce<int(uRuntime.w)*2;bounce++){','for(int bounce=0;bounce<INTERFACE_STEPS;bounce++){if(bounce>=int(uBudget.y))break;');
MODERN_FRAG=shaderFunction(MODERN_FRAG,'materialLength',`float materialLength(vec3 a,vec3 b){
 vec3 delta=b-a;float lengthOfRay=length(delta);if(lengthOfRay<.0001)return 0.;vec3 direction=delta/lengthOfRay;
 if(uScatter.y>.5){vec2 outer=ellipsoidRoots(a,direction,1.);float distance=max(0.,min(lengthOfRay,outer.y)-max(0.,outer.x));if(hasCavity()){vec2 inner=ellipsoidRoots(a,direction,uInterior.x*(1.-uInterior.y));distance-=max(0.,min(lengthOfRay,inner.y)-max(0.,inner.x));}return max(0.,distance);}
 float occupied=0.,samples=max(1.,uBudget.z);
 for(int k=0;k<LENGTH_SAMPLES;k++){if(k>=int(samples))break;vec3 q=a+delta*(float(k)+.5)/samples;occupied+=materialField(q)<0.?1.:0.;}
 return occupied*lengthOfRay/samples;
}`);
MODERN_FRAG=MODERN_FRAG.replace('for(int k=0;k<int(uRuntime.w)/4;k++){float s=distance*(float(k)+.5)/4.;','for(int k=0;k<SCATTER_SAMPLES;k++){if(k>=int(uBudget.w))break;float s=distance*(float(k)+.5)/max(1.,uBudget.w);');
MODERN_FRAG=MODERN_FRAG.replace('incident*sigmaS*distance/4.;','incident*sigmaS*distance/max(1.,uBudget.w);');
MODERN_FRAG=MODERN_FRAG.replace('for(int k=0;k<5;k++){\n    float wavelength=',`for(int k=0;k<SPECTRAL_SAMPLES;k++){
    #if PREVIEW_ENABLED
    float wavelength=k==0?.650:k==1?.510:.435;
    vec3 weight=k==0?vec3(1.,.15,0):k==1?vec3(0,.70,.20):vec3(0,.15,.80);
    #else
    float wavelength=`);
MODERN_FRAG=MODERN_FRAG.replace('vec3(0,0,.30);\n    float status;', 'vec3(0,0,.30);\n    #endif\n    float status;');
MODERN_FRAG=MODERN_FRAG.replace(' if(transmission>.0001){', ' #if TRANSMISSION_ENABLED\n if(transmission>.0001){');
MODERN_FRAG=MODERN_FRAG.replace(' vec3 below=(vec3(1.)-dielectricF)', ' #endif\n vec3 below=(vec3(1.)-dielectricF)');
function guardShaderFunction(source,name,condition){
 const start=source.search(new RegExp('(?:vec[234]|float|bool|void)\\s+'+name+'\\s*\\(')),open=source.indexOf('{',start);
 let end=open+1,depth=1;while(depth){depth+=(source[end]==='{')-(source[end]==='}');end++;}
 return source.slice(0,start)+'\n#if '+condition+'\n'+source.slice(start,end)+'\n#endif\n'+source.slice(end);
}
MODERN_FRAG=guardShaderFunction(MODERN_FRAG,'transmitted','TRANSMISSION_ENABLED && !THIN_SHELL_ENABLED');
MODERN_FRAG=MODERN_FRAG.replace('uniform vec3 uInternalColor;','uniform vec3 uInternalColor;\nuniform float uGeometryRadius;');
MODERN_FRAG=MODERN_FRAG.replace('extent=axes()*4.5;','extent=axes()*uGeometryRadius;');
MODERN_FRAG=MODERN_FRAG.replace('bool traceBoundary(vec3 origin',`
#if ROOTS_ENABLED
uniform highp usampler2D uRootOccupancy;
uniform float uRootGrid;
float rootGridEntry(vec3 origin,vec3 direction,float start,float end){
 if(uRootGrid<=0.)return start;
 vec3 axesSize=axes(),originLocal=transform(origin)/axesSize,dr=(transform(origin+direction)-transform(origin))/axesSize;
 vec3 gridOrigin=(originLocal+uRootGrid)*12./uRootGrid,gridDirection=dr*12./uRootGrid;
 vec3 inv=1./mix(vec3(.0000001),gridDirection,greaterThan(abs(gridDirection),vec3(.0000001)));
 vec3 a=(0.-gridOrigin)*inv,b=(24.-gridOrigin)*inv,lo=min(a,b),hi=max(a,b);
 float t=max(start,max(max(lo.x,lo.y),lo.z)),stop=min(end,min(min(hi.x,hi.y),hi.z));
 if(t>stop)return start;
 for(int i=0;i<int(uRuntime.w)*5;i++){
  vec3 q=gridOrigin+gridDirection*(t+1e-5);
  ivec3 cell=ivec3(clamp(floor(q),0.,23.));
  uint bits=texelFetch(uRootOccupancy,cell.xy,0).r;
  if((bits&(1u<<uint(cell.z)))!=0u)return max(start,t-1e-5);
  vec3 bounds=(vec3(cell)+step(vec3(0.),gridDirection)-gridOrigin)*inv;
  vec3 face=mix(vec3(1e9),bounds,greaterThan(abs(gridDirection),vec3(.0000001)));
  t=max(t+1e-5,min(min(face.x,face.y),face.z));
  if(t>stop)return end+1.;
 }
 return start;
}
#endif
bool traceBoundary(vec3 origin`);
MODERN_FRAG=MODERN_FRAG.replace('if(t>end){travel=end;point=origin+direction*end;return false;}',`
#if ROOTS_ENABLED
 if(outerOnly&&t<=end)t=rootGridEntry(origin,direction,t,end);
#endif
 if(t>end){travel=end;point=origin+direction*end;return false;}`);
MODERN_FRAG=MODERN_FRAG.replace('for(int bounce=0;bounce<INTERFACE_STEPS;bounce++){if(bounce>=int(uBudget.y))break;',`for(int bounce=0;bounce<INTERFACE_STEPS;bounce++){if(bounce>=int(uBudget.y))break;
 #if PREVIEW_ENABLED
 if(max(max(beta.r,beta.g),beta.b)<.0005){finished=true;break;}
 #else
 if(max(max(beta.r,beta.g),beta.b)<.000001){finished=true;break;}
 #endif
`);
// Most wallpaper pixels miss the object; do not evaluate six field samples
// there unless the soft silhouette actually needs surface shading.
MODERN_FRAG=MODERN_FRAG.replace('closest=max(0.,field(point));normal=surfaceNormal(point);','closest=max(0.,field(point));');
MODERN_FRAG=MODERN_FRAG.replace('if(hit||coverage>.001)surface=shade(point,normal,direction,hit,issue);','if(hit||coverage>.001){if(!hit)normal=surfaceNormal(point);surface=shade(point,normal,direction,hit,issue);}');
// Preview geometry is evaluated once into a normalized SDF atlas. Optical rays
// sample the cached field instead of inlining the entire procedural sculpture
// at every ray step, normal, scattering sample and refractive interface.
// Half floats preserve smooth distances; decoded RGBA8 texels provide a
// portable fallback when float render-target extensions are unavailable.
const ATLAS_PREVIEW=8192,ATLAS_BAKE=16384;
MODERN_FRAG=MODERN_FRAG.replace('d=structureField(d,p);',`d=structureField(d,p);
 #ifdef GROWTH_GEOMETRY
 d=growthGeometryField(d,p);
 #endif
`);
const FRACTAL_MATERIAL_DOMAIN=(()=>{
 const marker='vec3 fieldParts(vec3 world){',start=MODERN_FRAG.indexOf(marker)+marker.length,end=MODERN_FRAG.indexOf('float w=',start);
 if(start<marker.length||end<start)throw new Error('Fractal material domain is unavailable.');
 const prefix=MODERN_FRAG.slice(start,end);
 if(!prefix.includes('p=structureWarp(p);'))throw new Error('Fractal material domain must follow the shared structure map.');
 return prefix;
})();

function materialShaderFunction(source,name){
 const start=source.search(new RegExp('(?:vec[234]|float|bool|void)\\s+'+name+'\\s*\\('));
 if(start<0)throw Error('Missing shared material function: '+name);
 let end=source.indexOf('{',start)+1,depth=1;
 while(depth&&end<source.length){depth+=(source[end]==='{')-(source[end]==='}');end++;}
 if(depth)throw Error('Incomplete shared material function: '+name);
 return source.slice(start,end);
}
const MATERIAL_DOMAIN_UNIFORMS={uWarp:'uPigmentWarp',uExtraShape:'uPigmentShape',uExtraShape2:'uPigmentShape2',uStructureC:'uPigmentStructureC',uStructureE:'uPigmentStructureE',uStructureF:'uPigmentStructureF',uStructureG:'uPigmentStructureG',uStructureFan:'uPigmentStructureFan'};
export const FRACTAL_LOCAL_MATERIAL_GLSL=(()=>{
 const marker='p/=vec3(uShape.y,uShape.z,volume);',start=FRACTAL_MATERIAL_DOMAIN.indexOf(marker);
 if(start<0)throw Error('Shared material affine boundary is unavailable.');
 let mapping=FRACTAL_MATERIAL_DOMAIN.slice(start+marker.length);
 let warp=materialShaderFunction(STRUCTURE_GLSL,'structureWarp');
 let local='vec3 fractalMaterialPoint(vec3 p){'+mapping+'return p;}';
 let code=warp+'\n'+local;
 for(const [name,replacement] of Object.entries(MATERIAL_DOMAIN_UNIFORMS))code=code.replace(new RegExp('\\b'+name+'\\b','g'),replacement);
 code=code.replaceAll('structureWarp(','pigmentStructureWarp(').replaceAll('rot(','pigmentRotate(');
 return 'uniform vec4 uFractal,uPigmentWarp,uPigmentShape,uPigmentShape2,uPigmentStructureC,uPigmentStructureE,uPigmentStructureF,uPigmentStructureG;\nuniform float uPigmentStructureFan;\nmat2 pigmentRotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}\n'+code+'\n'+materialShaderFunction(FRACTAL_GLSL,'fractalColorCoordinate');
})();
// Keep the surface palette's interpolation, including its narrowest transition,
// while preserving the old particle palette for every pre-existing formula.
export const FRACTAL_PARTICLE_PALETTE_GLSL='uniform vec3 uPigmentPaletteMean;\n'+materialShaderFunction(MODERN_FRAG,'palette').replace('vec3 palette(','vec3 fractalPaletteAt(').replaceAll('uGradient.w','uColorSoftness').replaceAll('uPaletteMean','uPigmentPaletteMean');
export function uploadFractalMaterial(s,u){
 uploadFractal(s,u);
 u('uPigmentWarp',[s.deform||0,s.asymmetry||0,s.twist||0,s.waveScale||0]);
 u('uPigmentShape',[s.roundness||0,s.taper||0,s.bendX||0,s.bendY||0]);
 u('uPigmentShape2',[s.lobeAmount||0,s.lobes||5,s.pinch||0,s.rimRound||0]);
 structureUniforms(s,(name,values)=>{const target=MATERIAL_DOMAIN_UNIFORMS[name];if(target)u(target,values);});
 const palette=s.palette||['#ffffff'];u('uPigmentPaletteMean',palette.map(rgb).reduce((sum,c)=>sum.map((v,i)=>v+c[i]/palette.length),[0,0,0]));
}

let BAKE_FRAG=MODERN_FRAG.slice(0,MODERN_FRAG.indexOf('// Shared solid/cavity field.'));
// Uniform loop bounds prevent drivers expanding nine copies of the cone
// kernel during first-use JIT; the runtime value remains exactly three cells.
BAKE_FRAG=BAKE_FRAG.replaceAll('for(int j=-1;j<=1;j++){','for(int j=-1;j<int(uRuntime.z);j++){').replaceAll('for(int k=-1;k<=1;k++){','for(int k=-1;k<int(uRuntime.z);k++){');
BAKE_FRAG=BAKE_FRAG.replace('vec3 p=transform(world);float volume=max(.06,uShape.x*uShape.w);p/=vec3(uShape.y,uShape.z,volume);','vec3 p=world;float volume=1.;');
BAKE_FRAG=BAKE_FRAG.replace('return vec3(d,hole,cut)*min(min(uShape.y,uShape.z),volume)*uFrame.x*.5;','return vec3(d,hole,cut);');
BAKE_FRAG=shaderFunction(BAKE_FRAG,'field',`float field(vec3 p){vec3 parts=fieldParts(p);return smax(smax(parts.x,parts.y,uExtraShape2.w),parts.z,uExtraShape2.w);}`);
BAKE_FRAG=BAKE_FRAG.replace('vec3 fieldParts(vec3 world){','uniform float uBakeShell;float bakedInner=0.;\nvec3 fieldParts(vec3 world){').replace('d=structureField(d,p);','float membraneThickness=uStructureA.y*(1.-uStructureH.x*.85*min(1.,length(p.xy)));bakedInner=-d-membraneThickness-(1.-membraneThickness)*(1.-uBakeShell);d=structureField(d,p);');
BAKE_FRAG+=`
uniform vec4 uFieldAtlas;
uniform float uFieldEncoding,uBakeRadius;
uniform vec3 uFieldMin,uFieldMax;
void main(){
 float n=uFieldAtlas.x,stride=n+2.,tiles=uFieldAtlas.y;
 vec2 cell=floor(gl_FragCoord.xy/stride),pixel=mod(floor(gl_FragCoord.xy),stride)-1.;
 float slice=cell.x+cell.y*tiles;
 vec3 index=vec3(clamp(pixel,vec2(0.),vec2(n-1.)),min(slice,n-1.));
 vec3 p=mix(uFieldMin,uFieldMax,index/(n-1.));
 // Outside the complete shape bound a conservative distance suffices.
 // Keep a positive guard band: no near-zero values can create a false shell.
 float outside=length(p)-uBakeRadius;
 float distance=outside>.15?outside:field(p);if(uFieldEncoding>.5){fragColor=vec4(distance,bakedInner,0.,1.);return;}
 float value=clamp(distance/(2.*uFieldAtlas.w)+.5,0.,1.-1./65025.);
 float high=floor(value*255.)/255.,low=fract(value*255.);
 float innerValue=clamp(bakedInner/(2.*uFieldAtlas.w)+.5,0.,1.-1./65025.);
 fragColor=vec4(high,low,floor(innerValue*255.)/255.,fract(innerValue*255.));
}
`;
// A longer first-hit search preserves thin silhouettes without multiplying
// every volumetric-refraction bounce by that cost or shader complexity.
{
 const start=MODERN_FRAG.indexOf('bool traceBoundary('),open=MODERN_FRAG.indexOf('{',start);let end=open+1,depth=1;
 while(depth){depth+=(MODERN_FRAG[end]==='{')-(MODERN_FRAG[end]==='}');end++;}
 const primary=MODERN_FRAG.slice(start,end).replace('bool traceBoundary(','bool traceStructurePrimary(').replaceAll('TRACE_STEPS','768').replaceAll('uBudget.x','(uRuntime.w*48.)');
 MODERN_FRAG=MODERN_FRAG.replace('void main(){','#if STRUCTURE_ENABLED\n'+primary+'\n#endif\nvoid main(){');
 MODERN_FRAG=MODERN_FRAG.replace('bool hit=traceBoundary(origin,direction,40.,true,point,distance);',`bool hit;
 #if STRUCTURE_ENABLED
 hit=traceStructurePrimary(origin,direction,40.,true,point,distance);
 #else
 hit=traceBoundary(origin,direction,40.,true,point,distance);
 #endif
 `);
}
let PREVIEW_FRAG=MODERN_FRAG.replace(CROWN_GEOMETRY.replace('float stemField',STEM_GEOMETRY+'float stemField'),'');
PREVIEW_FRAG=PREVIEW_FRAG.replace('uniform float uGeometryRadius;',`uniform float uGeometryRadius;
uniform highp sampler2D uFieldTexture;
uniform vec2 uFieldWarp;
uniform float uBasePrimitive;
uniform float uDeferredStructure;
bool primaryTrace=false;
uniform int uPrimitivePlaneCount;
uniform vec4 uPrimitivePlanes[20];
uniform vec4 uFieldAtlas;
uniform float uFieldEncoding;
uniform vec3 uFieldMin,uFieldMax;`);
// The preview supports all solids without duplicating their plane expressions
// at every secondary ray sample. The export still specializes each solid.
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'baseFormField',`float baseFormField(vec3 p){
 if(uBaseForm<.5)return length(p)-1.;
 if(uBaseForm<1.5)return max(length(p.xy)-1.,abs(p.z)-.12);
 float d=-10000.;for(int i=0;i<uPrimitivePlaneCount;i++)d=max(d,dot(p,uPrimitivePlanes[i].xyz)-uPrimitivePlanes[i].w);return d;
}`);
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'offsetBoundary',`vec3 offsetBoundary(vec3 p,vec3 direction,bool inside){return p+direction*rayEpsilon()*8.;}`);
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'fieldParts',`vec2 atlasTexel(ivec2 pixel){vec4 t=texelFetch(uFieldTexture,pixel,0);return (vec2(dot(t.rg,vec2(1.,1./255.)),dot(t.ba,vec2(1.,1./255.)))-.5)*2.*uFieldAtlas.w;}
vec2 atlasSlice(vec2 index,float slice){
 float stride=uFieldAtlas.x+2.,tiles=uFieldAtlas.y;vec2 tile=vec2(mod(slice,tiles),floor(slice/tiles));
 vec2 pixel=tile*stride+vec2(1.)+index;
 #if FLOAT_ATLAS
 return texture(uFieldTexture,(pixel+vec2(.5))/uFieldAtlas.z).rg;
 #else
 ivec2 q=ivec2(floor(pixel));vec2 f=fract(pixel);
 return mix(mix(atlasTexel(q),atlasTexel(q+ivec2(1,0)),f.x),mix(atlasTexel(q+ivec2(0,1)),atlasTexel(q+ivec2(1,1)),f.x),f.y);
 #endif
}
vec2 cachedBoundaries(vec3 p){
 if(uBasePrimitive>.5){float d=baseFormField(p);return vec2(d,-d);}
 // Cheap domain transformations stay live; they never rebuild the volume.
 if(uFieldWarp.x!=0.||uFieldWarp.y!=0.)p.xz=rot(uFieldWarp.x*p.y*.7+uFieldWarp.y)*p.xz;
 float n=uFieldAtlas.x;vec3 clamped=clamp(p,uFieldMin,uFieldMax),index=(clamped-uFieldMin)/(uFieldMax-uFieldMin)*(n-1.);
 float z0=floor(index.z),z1=min(n-1.,z0+1.);
 vec2 boundaries=mix(atlasSlice(index.xy,z0),atlasSlice(index.xy,z1),fract(index.z));
 return boundaries+length(p-clamped);
}
float cachedGeometry(vec3 p){
 vec2 boundaries=cachedBoundaries(p);return uDeferredStructure>.5?max(boundaries.x,boundaries.y):boundaries.x;
}`);
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'field',`float field(vec3 world){
 vec3 size=vec3(uShape.y,uShape.z,max(.06,uShape.x*uShape.w)),p=transform(world)/size;
 float d=uScatter.y>.5?length(p)-1.:cachedGeometry(p);
 return d*min(min(size.x,size.y),size.z)*uFrame.x*.5;
}`);
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'surfaceGradient',`vec3 surfaceGradient(vec3 world){
 vec3 size=axes(),p=transform(world)/size,gradient;
 if(uScatter.y>.5)gradient=p/max(.000001,length(p))/size;
 else{
  vec3 e=(uFieldMax-uFieldMin)/max(1.,uFieldAtlas.x-1.)*.55;
  vec2 boundaries=cachedBoundaries(p);int side=uDeferredStructure>.5&&boundaries.y>boundaries.x?1:0;
  gradient=vec3(0.);for(int i=0;i<int(min(6.,uRuntime.w));i++){int axis=i/2;float sign=i%2==0?1.:-1.;vec3 offset=vec3(0.);offset[axis]=e[axis]*sign;gradient[axis]+=cachedBoundaries(p+offset)[side]*sign;}gradient/=(e*size);
 }
 gradient.yz=rot(-uOther.y)*gradient.yz;gradient.xz=rot(-uOther.x)*gradient.xz;gradient.xy=rot(-uExtraShape3.z)*gradient.xy;
 return gradient;
}`);
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'surfaceNormal',`vec3 surfaceNormal(vec3 p){vec3 n=surfaceGradient(p);return length(n)>.000001?normalize(n):vec3(0,0,1);}`);
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'rayEpsilon',`float rayEpsilon(){
 float original=min(.00003,max(.000002,wallDepth()*.02));
 if(uScatter.y>.5)return original;
 float voxel=min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*(uFieldMax.x-uFieldMin.x)/max(1.,uFieldAtlas.x-1.);
 return max(original,min(wallDepth()*.04,voxel*.002));
}`);
// One field evaluation site for marching, grazing probes and bisection.
// Same samples and tolerances; avoids inlining the sculpt map five times.
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'traceBoundary',`bool traceBoundary(vec3 origin,vec3 direction,float maximum,bool outerOnly,out vec3 point,out float travel){
 float eps=rayEpsilon();
 if(uScatter.y>.5){float t=firstRoot(ellipsoidRoots(origin,direction,1.));if(!outerOnly&&hasCavity())t=min(t,firstRoot(ellipsoidRoots(origin,direction,uInterior.x*(1.-uInterior.y))));travel=t;point=origin+direction*t;return t<maximum;}
 vec2 interval=objectInterval(origin,direction);float t=max(0.,interval.x),end=min(maximum,interval.y);
 if(t>end){travel=end;point=origin+direction*max(0.,end);return false;}
 float previousT=t,previousD=0.,a=t,b=t,da=0.,surfaceD=0.,ahead=0.,probe=eps*4.;bool found=false;
 int stage=0,stepIndex=0,refine=0,steps=int(min(uBudget.x,768.)),refinements=int(min(16.,uRuntime.w));
 for(int evaluation=0;evaluation<steps*3+refinements;evaluation++){
  if(stage==0){if(stepIndex>=steps||t>end)break;point=origin+direction*t;}
  float middle=(a+b)*.5;vec3 samplePoint=stage==0?point:stage==1?point+direction*probe:stage==2?origin+direction*(t+ahead):origin+direction*middle;
  float value=traceField(samplePoint,outerOnly);
  if(stage==0){
   surfaceD=value;if(stepIndex==0)previousD=value;
   if(stepIndex>0&&value*previousD<0.){a=previousT;b=t;da=previousD;found=true;stage=3;continue;}
   if(abs(value)<eps&&t>eps*3.){if(primaryTrace){travel=t;return true;}stage=1;continue;}
   previousT=t;previousD=value;t+=max(min(abs(value)*uRuntime.y*1.5,.22*uFrame.x),eps*2.);stepIndex++;
  }else if(stage==1){
   float slope=abs((value-surfaceD)/probe);ahead=min(end-t,clamp(eps*8./max(.015,slope),eps*8.,.025*uFrame.x));if(ahead<=0.)break;stage=2;
  }else if(stage==2){
   if(previousD*value<0.){a=previousT;b=t+ahead;da=previousD;found=true;stage=3;continue;}
   previousT=t;previousD=surfaceD;t+=ahead;stepIndex++;stage=0;
  }else{
   if(da*value>0.){a=middle;da=value;}else b=middle;
   refine++;if(refine>=refinements)break;
  }
 }
 travel=found?(a+b)*.5:end;point=origin+direction*travel;return found;
}`);
// Preview scattering uses a bounded estimate of occupied distance. Avoid a
// nested field-sampling loop inside every light, scattering sample and bounce:
// some drivers spend minutes inlining that combination. Exact exports retain
// the measured multi-sample transport above.
PREVIEW_FRAG=PREVIEW_FRAG.replace('float distance;bool hit;','float distance;primaryTrace=true;bool hit;').replace('normal=hit?surfaceNormal(point):vec3(0,0,1);','primaryTrace=false;normal=hit?surfaceNormal(point):vec3(0,0,1);');
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'materialLength',`float materialLength(vec3 a,vec3 b){
 vec3 delta=b-a;float len=length(delta);if(len<.0001)return 0.;vec3 dir=delta/len;
 vec2 outer=ellipsoidRoots(a,dir,1.);float d=max(0.,min(len,outer.y)-max(0.,outer.x));if(hasCavity()){vec2 inner=ellipsoidRoots(a,dir,uInterior.x*(1.-uInterior.y));d-=max(0.,min(len,inner.y)-max(0.,inner.x));}return max(0.,d);
}`);
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'subsurfaceLight',`vec3 subsurfaceLight(vec3 p,vec3 n,vec3 tint){
 vec3 total=vec3(0.);float radius=max(.08,uTransport.y);
 for(int i=0;i<uLightCount;i++){
  vec3 off=uLights[i].xyz-p;float distance=max(.03,length(off)),area=max(.08,uLightProps[i].x*uLightProps[i].y*4.);
  float cosine=dot(n,off/distance),wrap=clamp((cosine+radius*.75)/(1.+radius*.75),0.,1.);
  vec3 flux=uLightColors[i]*uLights[i].w*1.5*area/(distance*distance+area);
  total+=flux*(wrap+max(0.,-cosine)*uInterior.z*.45)*uSssColor;
 }
 return (total+uSssColor*.015)*mix(vec3(1.),tint,uColorLayers.x);
}`);
PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'segmentScattering',`vec3 segmentScattering(vec3 origin,vec3 direction,float distance,vec3 sigmaA,float sigmaS){
 if(sigmaS<.0001||distance<.000001)return vec3(0.);
 vec3 q=origin+direction*distance*.5,incident=vec3(0.),extinction=sigmaA+vec3(sigmaS);
 for(int i=0;i<uLightCount;i++){
  vec3 off=uLights[i].xyz-q;float d=max(.05,length(off)),area=max(.02,uLightProps[i].x*uLightProps[i].y*4.);
  float path=materialLength(q,uLights[i].xyz),phase=mix(phaseHG(dot(off/d,direction),uScatter.x),1./(4.*PI),uTransport.x);
  incident+=uLightColors[i]*uLights[i].w*1.5*area/(d*d+area)*exp(-extinction*path)*phase;
 }
 return incident*sigmaS*(vec3(1.)-exp(-extinction*distance))/max(extinction,vec3(.00001));
}`);
// The cached preview has bounded path complexity. Full exports keep all spectral
// rays and exact interfaces. The central ray preserves geometric refraction;
// neighboring terminal directions provide a soft, low-cost chromatic spread.
PREVIEW_FRAG=PREVIEW_FRAG.replace(/#if DISPERSION_ENABLED[\s\S]*?#else\n   glass=transmitted\(p,geometricNormal,rd,base,vec3\(1\.\),max\(1\.,uMat\.y\),issue\);\n   #endif/,`glass=transmitted(p,geometricNormal,rd,base,vec3(1.),max(1.,uMat.y),issue);`);

PREVIEW_FRAG=shaderFunction(PREVIEW_FRAG,'terminalScene',`vec4 terminalScene(vec3 origin,vec3 direction,float rough){
 vec3 tangent=normalize(cross(direction,abs(direction.y)>.98?vec3(1,0,0):vec3(0,1,0))),up=cross(direction,tangent);
 bool blurred=rough>.04,chromatic=uOptics.y>.005;int count=chromatic?7:blurred?5:1;
 vec4 scene=vec4(0.),average=vec4(0.),warm=vec4(0.),cool=vec4(0.);
 for(int i=0;i<count;i++){
  if(i>0&&i<5&&!blurred)continue;
  vec3 offset=vec3(0.);float spread=rough*rough*.2;
  if(i==1)offset=tangent*spread;else if(i==2)offset=-tangent*spread;else if(i==3)offset=up*spread;else if(i==4)offset=-up*spread;
  else if(i>=5)offset=(tangent+up*.22)*uOptics.y*.035*clamp((uMat.y-1.)*2.,0.,1.)*(i==5?1.:-1.);
  vec3 sampleDirection=normalize(direction+offset);float unused;vec4 sampleColor=sceneRay(origin,sampleDirection,unused);
  if(uBgMode!=2.)sampleColor.rgb+=environment(sampleDirection,origin,rough)*uEnvironment.w*clamp((uMat.y-1.)*3.,0.,1.)*(1.-sampleColor.a);
  if(i==0)scene=sampleColor;else if(i<5)average+=sampleColor;else if(i==5)warm=sampleColor;else cool=sampleColor;
 }
 if(blurred)scene=mix(scene,average*.25,min(1.,rough));
 if(chromatic){scene.rgb=mix(scene.rgb,vec3(warm.r,(warm.g+scene.g*2.+cool.g)*.25,cool.b),.72);scene.a=max(scene.a,(warm.a+cool.a)*.5);}
 return scene;
}`);
// Both completion paths use the same terminal lookup. Keeping one call site
// avoids duplicating the background/light shader inside and outside the loop.
PREVIEW_FRAG=PREVIEW_FRAG.replace('endScene=terminalScene(origin,direction,uMat.w*clamp((ior-1.)*2.,0.,1.));coverage=endScene.a;radiance+=beta*endScene.rgb;finished=true;break;','finished=true;break;');
PREVIEW_FRAG=PREVIEW_FRAG.replace('if(!finished){issue=inside?1.:.5;endScene=terminalScene(origin,direction,uMat.w*clamp((ior-1.)*2.,0.,1.));coverage=endScene.a;radiance+=beta*environment(direction,origin,uMat.w);}','if(!finished)issue=inside?1.:.5;endScene=terminalScene(origin,direction,uMat.w*clamp((ior-1.)*2.,0.,1.));coverage=endScene.a;radiance+=beta*endScene.rgb;');
// Keep bounded optical loops dynamic as well: eager constant unrolling makes
// first-use compilation disproportionately slow on several WebGL drivers.
PREVIEW_FRAG=PREVIEW_FRAG.replace('for(int bounce=0;bounce<INTERFACE_STEPS;bounce++){if(bounce>=int(uBudget.y))break;','for(int bounce=0;bounce<int(min(uBudget.y,4.));bounce++){');
PREVIEW_FRAG=PREVIEW_FRAG.replace('for(int k=0;k<LENGTH_SAMPLES;k++){if(k>=int(samples))break;','for(int k=0;k<int(min(samples,8.));k++){');
PREVIEW_FRAG=PREVIEW_FRAG.replace('for(int k=0;k<SCATTER_SAMPLES;k++){if(k>=int(uBudget.w))break;','for(int k=0;k<int(min(uBudget.w,2.));k++){');
// Integrate the same 24 spectral wavelengths as the exact renderer, with
// CIE weights computed once on the CPU. Dynamic shader loops then stay compact
// without evaluating seven wavelength-only Gaussian functions per sample.
export const FILM_SPECTRUM=(()=>{
 const data=new Float32Array(72),white=new Float32Array(3),gaussian=(x,c,l,r)=>Math.exp(-.5*((x-c)*(x<c?l:r))**2);
 for(let j=0;j<24;j++){
  const w=390+j*15,response=[1.056*gaussian(w,599.8,.0264,.0323)+.362*gaussian(w,442.,.0624,.0374)-.065*gaussian(w,501.1,.049,.0382),.821*gaussian(w,568.8,.0213,.0247)+.286*gaussian(w,530.9,.0613,.0322),1.217*gaussian(w,437.,.0845,.0278)+.681*gaussian(w,459.,.0385,.0725)];
  data.set(response,j*3);for(let k=0;k<3;k++)white[k]+=response[k];
 }
 return {data,white};
})();
PREVIEW_FRAG=PREVIEW_FRAG.replace('uniform float uGeometryRadius;','uniform float uGeometryRadius;\nuniform vec3 uFilmResponse[24],uFilmWhite;');
PREVIEW_FRAG=PREVIEW_FRAG.replace('vec3 xyz=vec3(0.),white=vec3(0.);','vec3 xyz=vec3(0.),white=uFilmWhite;');
PREVIEW_FRAG=PREVIEW_FRAG.replace('for(int j=0;j<24;j++){','for(int j=0;j<int(min(24.,uFilmMotion.w));j++){');
PREVIEW_FRAG=PREVIEW_FRAG.replace('vec3 response=cie(wavelength);xyz+=response*dot(reflection,vec2(.5));white+=response;','vec3 response=uFilmResponse[j];xyz+=response*dot(reflection,vec2(.5));');
// Exports retain the exact procedural geometry and all optical samples. Keep
// their loop bounds uniform-driven too: a fixed 224-step trace nested inside
// 32 interfaces encourages some drivers to inline/unroll the entire root BVH
// hundreds of times while linking. These are the same limits and operations,
// expressed without manufacturing a giant shader during export preparation.
MODERN_FRAG=MODERN_FRAG.replace('for(int j=0;j<TRACE_STEPS;j++){if(j>=int(uBudget.x))break;','for(int j=0;j<int(min(uBudget.x,float(TRACE_STEPS)));j++){');
MODERN_FRAG=MODERN_FRAG.replace('for(int bounce=0;bounce<INTERFACE_STEPS;bounce++){if(bounce>=int(uBudget.y))break;','for(int bounce=0;bounce<int(min(uBudget.y,float(INTERFACE_STEPS)));bounce++){');
MODERN_FRAG=MODERN_FRAG.replace('for(int k=0;k<LENGTH_SAMPLES;k++){if(k>=int(samples))break;','for(int k=0;k<int(min(samples,float(LENGTH_SAMPLES)));k++){');
MODERN_FRAG=MODERN_FRAG.replace('for(int k=0;k<SCATTER_SAMPLES;k++){if(k>=int(uBudget.w))break;','for(int k=0;k<int(min(uBudget.w,float(SCATTER_SAMPLES)));k++){');
// Wavelength responses do not depend on the scene. Reuse the same complete
// 24-wavelength integration as the preview instead of expanding seven
// Gaussian functions per wavelength inside every export shader variant.
MODERN_FRAG=MODERN_FRAG.replace('uniform float uGeometryRadius;','uniform float uGeometryRadius;\nuniform vec3 uFilmResponse[24],uFilmWhite;');
MODERN_FRAG=MODERN_FRAG.replace('vec3 xyz=vec3(0.),white=vec3(0.);','vec3 xyz=vec3(0.),white=uFilmWhite;');
MODERN_FRAG=MODERN_FRAG.replace('for(int j=0;j<24;j++){','for(int j=0;j<int(min(24.,uFilmMotion.w));j++){');
MODERN_FRAG=MODERN_FRAG.replace('vec3 response=cie(wavelength);xyz+=response*dot(reflection,vec2(.5));white+=response;','vec3 response=uFilmResponse[j];xyz+=response*dot(reflection,vec2(.5));');
// Evaluate the six exact central-difference samples at one call site. Six
// written-out field() calls duplicate the entire BVH traversal in drivers
// that inline GLSL functions, including every nested refractive interface.
MODERN_FRAG=MODERN_FRAG.replace('uniform float uGeometryRadius;','uniform float uGeometryRadius,uNormalSamples;');
MODERN_FRAG=MODERN_FRAG.replace('float e=.00012*uFrame.x;vec3 x=vec3(e,0,0),y=vec3(0,e,0),z=vec3(0,0,e);n=vec3(field(p+x)-field(p-x),field(p+y)-field(p-y),field(p+z)-field(p-z));',`float e=.00012*uFrame.x;n=vec3(0.);
 for(int k=0;k<int(min(6.,uNormalSamples));k++){
  int axis=k/2;float signOfSample=(k%2)==0?1.:-1.;vec3 offset=vec3(0.);offset[axis]=e*signOfSample;
  float value=field(p+offset);n[axis]+=value*signOfSample;
 }`);
MODERN_FRAG=MODERN_FRAG.replace('vec3 offsetBoundary(',`float fieldDifference(vec3 p,vec3 offset){
 float difference=0.;
 for(int k=0;k<int(min(2.,uNormalSamples));k++){
  float signOfSample=k==0?1.:-1.;difference+=field(p+offset*signOfSample)*signOfSample;
 }
 return difference;
}
vec3 offsetBoundary(`);
MODERN_FRAG=MODERN_FRAG.replace('(field(p+direction*probe)-field(p-direction*probe))','fieldDifference(p,direction*probe)');
MODERN_FRAG=MODERN_FRAG.replace('(field(point+direction*.0005)-field(point-direction*.0005))','fieldDifference(point,direction*.0005)');
MODERN_FRAG=MODERN_FRAG.replace('float outer=field(point);if(!outerOnly&&hasCavity()&&-outer-wallDepth()>outer)derivative=-derivative;','if(!outerOnly&&hasCavity()){float outer=field(point);if(-outer-wallDepth()>outer)derivative=-derivative;}');
MODERN_FRAG=MODERN_FRAG.replace('vec3 n=surfaceNormal(p);float d=field(p);return hasCavity()&&-d-wallDepth()>d?-n:n;','vec3 n=surfaceNormal(p);if(!hasCavity())return n;float d=field(p);return -d-wallDepth()>d?-n:n;');
const SCULPT_ENABLED=1048576;
const LOOP_ENABLED=2097152,SIMPLE_LOOP_STRUCTURE=4194304,SIMPLE_LOOP_FIELD=8388608;
const LOOP_STRUCTURE_MODIFIERS=['structGrowth','structCurl','structFold','structBreath','structFlap','structScallop','structSpiral','structStagger','structRuffle','structFibres','structSlices','structRadial','structLayers','structFan'];
const LOOP_BASE_MODIFIERS=['fractalAmount','baseForm','cellMorph','deform','asymmetry','twist','waves','hole','cut','roundness','taper','bendX','bendY','lobeAmount','pinch','petalAmount','stemAmount'];
function loopVariant(source){
 if(!(source.loopAmount>0||source.motions?.loopAmount?.enabled))return 0;
 const complex=LOOP_STRUCTURE_MODIFIERS.some(k=>Math.abs(source[k]||0)>.000001||source.motions?.[k]?.enabled);
 const plain=!complex&&!hasSolidForces(source)&&!LOOP_BASE_MODIFIERS.some(k=>Math.abs(source[k]||0)>.000001||source.motions?.[k]?.enabled);
 return LOOP_ENABLED+(complex?0:SIMPLE_LOOP_STRUCTURE)+(plain?SIMPLE_LOOP_FIELD:0);
}
const SCULPT_FRAG=withSolidForces(MODERN_FRAG);
const SCULPT_PREVIEW_FRAG=withSolidForces(PREVIEW_FRAG);
const FIELD_KEYS=['baseForm',...STRUCTURE_FIELD_KEYS,...CELLULAR_FIELD_KEYS,...FRACTAL_KEYS,'deform','asymmetry','twist','waves','waveScale','hole','holeX','holeY','holeShape','holeAspect','cut','cutX','cutY','cutAspect','roundness','taper','bendX','bendY','lobeAmount','lobes','pinch','rimRound','petalAmount','petalCoverage','stemAmount','stemRadius','stemBend'];
function analyticShape(s){return !growthGeometryEnabled(s)&&!(s.baseForm>0)&&!(s.cellMorph>0)&&!(s.fractalAmount>0)&&!hasStructure(s)&&!['deform','asymmetry','twist','waves','hole','cut','roundness','taper','bendX','bendY','lobeAmount','pinch','petalAmount','stemAmount'].some(k=>Math.abs(s[k]||0)>.000001);}
function atlasBounds(s,growthRadius){
 // Twist preserves radius. Deformation, ripples and lobes only add their
 // bounded amplitudes; they must not expand every volume to a nine-unit box.
 const unwarped={...s,deform:0,waves:0,twist:0,lobeAmount:0};
 let radius=geometryRadius(unwarped,growthRadius)+(s.deform||0)+(s.waves||0)*.17+(s.lobeAmount||0);
 if(((s.pVolumeContinuity||0)>0||(s.structWeaveGrowth||0)>0)&&
   ![s.baseForm,s.cellMorph,s.fractalAmount,s.loopAmount,s.petalAmount,s.stemAmount,s.taper,s.bendX,s.bendY,s.pinch].some(Boolean)){
  // Bound the supported deformations before undoing the local shell warp.
  // In this case Y is unchanged by asymmetry and by the XZ twist.
  const warp=structureBounds(s),extra=.13*(s.structWeaveNodes||0);
  const p=2+6*(s.roundness||0),shape=Math.pow(3,.5-1/p)*(1.025+(s.deform||0)+(s.waves||0)*.17+(s.lobeAmount||0)+extra);
  const asymmetry=Math.abs(s.asymmetry||0),y=shape+.64*(s.structWeaveGrowth||0),denominator=1-asymmetry*y*.18;
  if(denominator>=.25)radius=Math.min(radius,(shape/denominator+asymmetry*Math.max(.25,y*y-.25))*warp);
 }
 if(growthGeometryEnabled(s))radius=Math.max(radius,1.25*structureBounds(s));
 return {min:[-radius,-radius,-radius],max:[radius,radius,radius],radius,range:Math.max(2,radius*2)};
}

function crownRotationReusable(s){
 return !(s.baseForm>0)&&!['deform','asymmetry','waves','roundness','bendX','bendY','lobeAmount','pinch','hole','cut','stemAmount'].some(k=>Math.abs(s[k]||0)>.000001||s.motions?.[k]?.enabled&&(s.motions[k].amplitude||0)>0);
}
function motionInterval(s,key){
 const base=s[key]??0,t=s.motions?.[key],amplitude=t?.enabled?(t.amplitude||0)*(s.motion??.3)/.3:0,limits=MOTION_LIMITS[key]||EXTRA_MOTION_LIMITS[key]||[-Infinity,Infinity];
 if(hasMotionPoints(t)&&META[key]){
  const values=t.points.map(point=>motionPointValue(key,base,point.offset,META[key]));
  return [Math.min(...values),Math.max(...values)];
 }
 return [Math.max(limits[0],base-amplitude),Math.min(limits[1],base+amplitude)];
}
function previewPlan(source){
 const reactionGeometry=growthGeometryEnabled(source),reactionKeys=reactionGeometry?GROWTH_GEOMETRY_KEYS:[];
 const rotateCrown=!structureMayChange(source)&&crownRotationReusable(source),reuseTwist=!structureMayChange(source),keys=FIELD_KEYS.concat(GROWTH_KEYS,reactionKeys).filter(k=>(reuseTwist?k!=='twist':true)&&!(rotateCrown&&k==='petalPhase'));
 const cellular=cellularMayChange(source),moving=keys.filter(k=>(cellular||!CELLULAR_FIELD_KEYS.includes(k))&&source.motions?.[k]?.enabled&&((source.motions[k].amplitude||0)>0||hasMotionPoints(source.motions[k])||CELLULAR_PHASES.includes(k)&&source.motions[k].mode==='cycle')),dynamic=moving.length>0||(reactionGeometry&&source.growthFlow>0);
 const cullSafe=!(source.edge>0||source.glow>0||motionInterval(source,'volume')[0]<.2);
 const descriptor=keys.map(k=>[source[k]??0,source.motions?.[k]?.enabled?JSON.stringify(source.motions[k]):'off'].join(':')).join('|')+'|'+(source.motion??.3)+'|'+rotateCrown+'|'+cullSafe+'|'+(source.perfectLoop!==false);
 const fractal=fractalMayChange(source);
 const roots=rootWeight(source)>.000001||ROOT_KEYS.some(k=>source.motions?.[k]?.enabled);const sharp=motionInterval(source,'petalSharp'),fine=reactionGeometry||fractal||structureMayChange(source)||roots||(source.petalAmount||0)>.25&&(sharp[1]>.75||(source.petalWidth??.24)<.12);
 const fineResolution=reactionGeometry?112:fractal?(dynamic?72:128):cellular?dynamic?88:144:structureMayChange(source)?128:roots?(dynamic?((source.petalWidth??.24)<.08?80:64):80):!dynamic?112:(source.petalWidth??.24)<.12?128:moving.every(k=>k==='petalSharp')?80:112;
 return {descriptor,dynamic,rotateCrown,reuseTwist,fine,fineResolution,cullSafe,reactionKeys};
}
function animatedBounds(source){
 // Share a coordinate grid across the loop, without combining unrelated
 // maxima from tracks that peak at different times. Reuse the CPU storage.
 let radius=0,storage;
 for(let i=0;i<128;i++){
  const frame=sampleFrame(source,i/128*TAU);storage=growthTable(frame,storage);
  radius=Math.max(radius,atlasBounds(frame,storage.radiusBound).radius);
 }
 radius*=1.025;
 return {min:[-radius,-radius,-radius],max:[radius,radius,radius],radius,range:Math.max(2,radius*2)};
}

const RESOLVE=`#version 300 es
precision highp float;uniform sampler2D uImage;uniform vec4 uGrain;uniform float uAll;out vec4 fragColor;
void main(){vec4 a=texelFetch(uImage,ivec2(gl_FragCoord.xy),0);bool opaque=uGrain.w>.5;float noise=(fract(sin(dot(floor(gl_FragCoord.xy/max(.5,uGrain.y))+uGrain.z,vec2(127.1,311.7)))*43758.5453123)-.5)*uGrain.x;
 vec3 color=opaque?a.rgb:a.rgb/max(.000001,a.a);float alpha=opaque?1.:clamp(a.a,0.,1.);noise*=opaque&&uAll<.5?a.a:1.;fragColor=vec4(clamp(color+noise,0.,1.),alpha);}`;
function jitterSample(index){let n=index+1,x=0,y=0,f=.5;while(n){x+=(n%2)*f;n=Math.floor(n/2);f/=2;}n=index+1;f=1/3;while(n){y+=(n%3)*f;n=Math.floor(n/3);f/=3;}return[x-.5,y-.5]}

function rgb(hex){return [1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)})}
// The UI uses the same field for placing and identifying interior lights.
const STRUCTURE_SAMPLE_KEYS=['seed',...Object.keys(STRUCTURE_DEFAULTS)];
function projectStructureState(source){
 const state={...STRUCTURE_DEFAULTS};for(const key of STRUCTURE_SAMPLE_KEYS)if(Object.prototype.hasOwnProperty.call(source,key))state[key]=source[key];return state;
}
// A fresh immutable snapshot for one synchronous batch/frame. There is no
// identity cache: rebuilding after edits to the same object sees every edit.
export function prepareFieldQuery(source){
 const state=structuredClone(source),structure=state.renderVersion>=2?projectStructureState(state):null;
 return point=>fieldAt(state,point,structure);
}
export function fieldAt(s,point,structureState=null){
 const structure=s.renderVersion>=2?(structureState||projectStructureState(s)):null;
 const sculpt=solidForceMap(s,point);point=sculpt.point;
 let p=[(point[0]-s.positionX)/s.scale,(point[1]-s.positionY)/s.scale,point[2]/s.scale];
 const rotate=(a,b,angle)=>{const c=Math.cos(angle),v=Math.sin(angle),x=p[a],y=p[b];p[a]=c*x+v*y;p[b]=-v*x+c*y;};
 const rad=Math.PI/180;rotate(0,1,(s.rotateZ||0)*rad);rotate(0,2,s.rotateY*rad);rotate(1,2,s.rotateX*rad);
 const axes=[s.stretchX,s.stretchY,Math.max(.06,s.volume*s.stretchZ)];p=p.map((v,i)=>v/axes[i]);if(s.renderVersion>=2)p=structureWarp(structure,p);rotate(0,2,s.twist*p[1]*.7);
 p[0]-=s.asymmetry*(p[1]*p[1]-.25)+(s.bendX||0)*(p[1]*p[1]-.3);p[1]-=(s.bendY||0)*(p[0]*p[0]-.3);
 p[0]*=1-s.asymmetry*p[1]*.18;const taper=Math.max(.35,1-(s.taper||0)*p[1]*.45);p[0]/=taper;p[2]/=taper;p[0]*=1+(s.pinch||0)*Math.exp(-p[1]*p[1]*4);
 const exponent=2+(s.roundness||0)*6,seed=(s.seed%1000)*.013;
 const norm=Math.pow(p.reduce((n,v)=>n+Math.pow(Math.abs(v),exponent),0),1/exponent);
 const wave=Math.sin(p[0]*3.4+seed)*Math.sin(p[1]*2.6)*Math.cos(p[2]*3+.6),ripple=Math.sin(p[0]*s.waveScale*2)*Math.sin(p[1]*s.waveScale*1.7)*Math.sin(p[2]*s.waveScale*1.6+1);
 const lobe=Math.sin(Math.atan2(p[1],p[0])*(s.lobes||5))*(s.lobeAmount||0)*(1-Math.min(1,Math.abs(p[2]))*.65);
 let d=(s.baseForm>0?baseFormField(p,s.baseForm)+norm-Math.hypot(...p):norm-1)-s.deform*wave-s.waves*ripple*.17-lobe;
 if(s.renderVersion>=2){if((s.petalAmount||0)>.000001)d=d*(1-s.petalAmount)+(crownAt(s,p)-s.deform*wave*.35-s.waves*ripple*.08)*s.petalAmount;if((s.stemAmount||0)>.000001)d=softMin(d,stemAt(s,p),.08*Math.min(1,s.stemAmount*8));}
 if(s.renderVersion>=2){d=structureField(structure,cellularField(s,loopBlend(s,fractalField(s,d,p),p),p),p);d=growthFieldAt(s,d,p);}
 const pow=2+s.holeShape*5;
 const hole=s.hole>.001?s.hole-Math.pow(Math.pow(Math.abs((p[0]-s.holeX)/(s.holeAspect||1)),pow)+Math.pow(Math.abs(p[1]-s.holeY),pow),1/pow):-10000;
 const cut=s.cut>.001?s.cut-Math.hypot((p[0]-s.cutX)/(s.cutAspect||1),p[1]-s.cutY):-10000;
 const scale=Math.min(...axes)*s.scale*.5,k=(s.rimRound||0)*scale;
 const maximum=(a,b)=>{if(k<.0001)return Math.max(a,b);const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*.25;};
 d=maximum(maximum(d*scale,hole*scale),cut*scale);return Math.max(d,sculpt.barrier*.5);
}
function softMin(a,b,k){if(k<.000001)return Math.min(a,b);const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;}
const vectorSub=(a,b)=>a.map((v,i)=>v-b[i]),vectorDot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
function coneAt(p,a,b,ra,rb){
 const ba=vectorSub(b,a),pa=vectorSub(p,a),l2=vectorDot(ba,ba),rr=ra-rb;
 if(l2<.000001||rr*rr>=l2)return Math.min(Math.hypot(...pa)-ra,Math.hypot(...vectorSub(p,b))-rb);
 const a2=l2-rr*rr,il2=1/l2,y=vectorDot(pa,ba),z=y-l2,radial=pa.map((v,i)=>v*l2-ba[i]*y),x2=vectorDot(radial,radial),y2=y*y*l2,z2=z*z*l2,k=Math.sign(rr)*rr*rr*x2;
 if(Math.sign(z)*a2*z2>k)return Math.sqrt(x2+z2)*il2-rb;
 if(Math.sign(y)*a2*y2<k)return Math.sqrt(x2+y2)*il2-ra;
 return (Math.sqrt(Math.max(0,x2*a2*il2))+y*rr)*il2-ra;
}
function curveAt(a,b,c,t){return a.map((v,i)=>v*(1-t)*(1-t)+b[i]*2*t*(1-t)+c[i]*t*t);}
function petalAt(s,p,a,b,c){
 const width=(s.petalWidth??.24)*(.65+(s.petalInflate??.6)*.55),sharp=s.petalSharp||0,middle=width*(1-sharp*.58),root=Math.max(.025,width*.5),tip=Math.max(.0015,middle*(.9*(1-sharp)+.008*sharp));
 const p1=curveAt(a,b,c,1/3),p2=curveAt(a,b,c,2/3),endRadius=middle*(.9*(1-sharp)+.45*sharp),k=.025*(1-sharp);
 return softMin(softMin(coneAt(p,a,p1,root,middle),coneAt(p,p1,p2,middle,endRadius),k),coneAt(p,p2,c,endRadius,tip),k);
}
function flowerAt(s,p){
 const count=Math.max(3,Math.floor((s.petalCount||12)+.5)),step=TAU/count,angle=Math.atan2(p[2],p[0])-(s.petalPhase||0)*Math.PI/180,folded=((angle+step*.5)%step+step)%step-step*.5,r=Math.hypot(p[0],p[2]);
 const q=[r*Math.cos(folded),p[1],r*Math.sin(folded)],open=.28+(s.petalOpen??.65)*1.48,root=.17+(s.petalOpen??.65)*.25,len=s.petalLength??1.05,a=[root,-.12,0],b=[root+Math.sin(open)*len*.65,-.12+Math.cos(open)*len*.65,0],curl=open-(s.petalCurl||0)*1.4,c=[root+Math.sin(curl)*len,-.12+Math.cos(curl)*len,0];
 return softMin(petalAt(s,q,a,b,c),Math.hypot(r-root,p[1]+.12)-Math.max(.035,(s.petalWidth??.24)*.47),.035);
}
function legacyHedgeAt(s,p){
 const radius=Math.hypot(...p),rows=Math.max(2,Math.floor((s.petalRows||5)+.5)),step=Math.PI/rows,phi=Math.acos(Math.max(-1,Math.min(1,p[1]/Math.max(.00001,radius)))),theta=Math.atan2(p[2],p[0])-(s.petalPhase||0)*Math.PI/180,nearest=Math.floor(phi/step),core=.62+(s.petalOpen??.65)*.14;
 let d=radius-core;if(radius<core*.45)return d;
 for(let j=-1;j<=1;j++){
  const row=Math.max(0,Math.min(rows-1,nearest+j)),latitude=(row+.5)*step,count=Math.max(3,Math.floor((s.petalCount||12)*Math.sin(latitude)+.5)),sector=TAU/count,longitude=Math.floor((theta+sector*.5)/sector)*sector+(s.petalPhase||0)*Math.PI/180;
  const axis=[Math.sin(latitude)*Math.cos(longitude),Math.cos(latitude),Math.sin(latitude)*Math.sin(longitude)],tangent=[Math.cos(latitude)*Math.cos(longitude),-Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude)],a=axis.map(v=>v*core*.92),b=a.map((v,i)=>v+axis[i]*(s.petalLength??1.05)*.65),angle=(s.petalCurl||0)*.65,c=a.map((v,i)=>v+(axis[i]*Math.cos(angle)+tangent[i]*Math.sin(angle))*(s.petalLength??1.05));
  d=softMin(d,petalAt(s,p,a,b,c),.035*(1-(s.petalSharp||0)));
 }
 return d;
}
function growthRandom(row,column,seed,lane){
 let h=(Math.imul(row,1664525)+Math.imul(column,1013904223)+(seed&16777215)+Math.imul(lane,747796405))>>>0;
 h=Math.imul(h^(h>>>16),2246822519)>>>0;h=Math.imul(h^(h>>>13),3266489917)>>>0;h=(h^(h>>>16))>>>0;
 return (h&65535)/65535*2-1;
}
function organicHedgeAt(s,p){
 const radius=Math.hypot(...p),core=.62+(s.petalOpen??.65)*.14,body=radius-core;
 if(radius<core*.4)return body;
 const rows=Math.max(2,Math.floor((s.petalRows||5)+.5)),step=Math.PI/rows,phi=Math.acos(Math.max(-1,Math.min(1,p[1]/Math.max(.00001,radius)))),theta=Math.atan2(p[2],p[0])-(s.petalPhase||0)*Math.PI/180,nearest=Math.floor(phi/step);
 const width=(s.petalWidth??.24)*(.65+(s.petalInflate??.6)*.55),rootRadius=Math.min(.42,Math.max(.025,width*.5+(s.petalRoot||0)*.28+(s.petalBlend||0)*.04)),blend=Math.min(.035*(1-(s.petalSharp||0))+(s.petalBlend||0)*(.12+(s.petalRoot||0)*.32),Math.max(.008,((s.petalLength??1.05)*(1-(s.petalRandom||0)*.32)-core*.08)*.6)),amount=Math.min(1,((s.petalBlend||0)+(s.petalRoot||0)+(s.petalRandom||0))*20);
 let spines=100;
 for(let j=-1;j<=1;j++){
  const row=nearest+j;if(row<0||row>=rows)continue;
  const latitude=(row+.5)*step,count=Math.max(3,Math.floor((s.petalCount||12)*Math.sin(latitude)+.5)),sector=TAU/count,stagger=(row%2)*.5*amount,cell=Math.floor(theta/sector-stagger+.5);
  for(let k=-1;k<=1;k++){
   const column=((cell+k)%count+count)%count,longitude=(column+stagger)*sector+(s.petalPhase||0)*Math.PI/180,noise=lane=>growthRandom(row,column,s.seed,lane);
   const len=(s.petalLength??1.05)*(1+noise(0)*(s.petalRandom||0)*.32);let thickness=rootRadius*(1+noise(1)*(s.petalRandom||0)*.18);
   const axis=[Math.sin(latitude)*Math.cos(longitude),Math.cos(latitude),Math.sin(latitude)*Math.sin(longitude)],tangent=[Math.cos(latitude)*Math.cos(longitude),-Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude)],across=[-Math.sin(longitude),0,Math.cos(longitude)];
   const height=Math.max(0,Math.min(1,(vectorDot(p,axis)-core)/Math.max(.1,len))),bend=tangent.map((v,i)=>v*((s.petalCurl||0)*.65+noise(2)*(s.petalRandom||0)*.18)+across[i]*noise(3)*(s.petalRandom||0)*.12);
   const q=p.map((v,i)=>v-bend[i]*len*height*height),a=axis.map(v=>v*core*(.92-(s.petalBlend||0)*.22)),c=axis.map(v=>v*(core*.92+len));
   const tip=Math.max(.0015,width*(.9*(1-(s.petalSharp||0))+.008*(s.petalSharp||0)));thickness=Math.min(thickness,Math.hypot(...vectorSub(c,a))*.85+tip);const qa=vectorSub(q,a),t=Math.max(0,Math.min(Math.hypot(...vectorSub(c,a)),vectorDot(qa,axis))),lower=Math.hypot(...qa.map((v,i)=>v-axis[i]*t))-Math.max(thickness,tip);
   const warpBound=1+2*Math.hypot(...bend);
   if(lower/warpBound>Math.min(body,spines)+blend)continue;
   spines=softMin(spines,coneAt(q,a,c,thickness,tip)/warpBound,blend*.4);
  }
 }
 return softMin(body,spines,blend);
}
function hedgeAt(s,p){const amount=Math.max(0,Math.min(1,((s.petalBlend||0)+(s.petalRoot||0)+(s.petalRandom||0))*20));if(amount<.000001)return legacyHedgeAt(s,p);const organic=organicHedgeAt(s,p);return amount>.999999?organic:legacyHedgeAt(s,p)*(1-amount)+organic*amount;}
function crownBaseAt(s,p){const spread=s.petalCoverage||0;return spread<.0001?flowerAt(s,p):spread>.9999?hedgeAt(s,p):flowerAt(s,p)*(1-spread)+hedgeAt(s,p)*spread;}
function crownAt(s,p){const weight=rootWeight(s);if(weight>.999999)return rootFieldAt(s,p);const base=crownBaseAt(s,p);return weight>.000001?base*(1-weight)+rootFieldAt(s,p)*weight:base;}
function stemAt(s,p){const len=s.stemAmount*3,radius=(s.stemRadius??.09)*Math.min(1,s.stemAmount*8),bend=s.stemBend||0,a=[0,-.14,0],b=[bend*.35,-.14-len*.45,0],c=[-bend*.55,-.14-len,0],m=curveAt(a,b,c,.5);return Math.min(coneAt(p,a,m,radius,radius),coneAt(p,m,c,radius,radius));}
const ROOT_KEYS=['petalGrowth','petalCollision','petalSphereCollision','petalDirectionSpread','petalWeave','petalFlow','petalFlowPhase','petalOrbitPhase','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder'];
const GROWTH_KEYS=[...ROOT_KEYS,'petalContactGap','petalContactStiffness','petalContactPasses','petalWeaveTurns','petalRows','petalCount','petalOpen','petalLength','petalWidth','petalInflate','petalSharp','petalCurl','petalBlend','petalRoot','petalRandom','petalPhase','seed'];
export function growthTable(s,storage){
 const data=storage?.data||new Float32Array(96*8*4),rowData=storage?.rowData||new Float32Array(16);data.fill(0);rowData.fill(0);const rows=Math.max(2,Math.min(8,Math.floor((s.petalRows||5)+.5)));
 const core=.62+(s.petalOpen??.65)*.14,width=(s.petalWidth??.24)*(.65+(s.petalInflate??.6)*.55),sharp=s.petalSharp||0,random=s.petalRandom||0;
 const rootRadius=Math.min(.42,Math.max(.025,width*.5+(s.petalRoot||0)*.28+(s.petalBlend||0)*.04)),amount=Math.min(1,((s.petalBlend||0)+(s.petalRoot||0)+random)*20),phase=(((s.petalPhase||0)%360+360)%360)*Math.PI/180;
 const blend=Math.min(.035*(1-sharp)+(s.petalBlend||0)*(.12+(s.petalRoot||0)*.32),Math.max(.008,((s.petalLength??1.05)*(1-random*.32)-core*.08)*.6));let radiusBound=core;
 for(let row=0;row<rows;row++){
  const latitude=(row+.5)*Math.PI/rows,count=Math.max(3,Math.min(24,Math.floor((s.petalCount||12)*Math.sin(latitude)+.5))),stagger=(row%2)*.5*amount;
  rowData.set([count,stagger],row*2);
  for(let column=0;column<count;column++){
   const longitude=(column+stagger)*TAU/count+phase,noise=lane=>growthRandom(row,column,s.seed,lane),length=(s.petalLength??1.05)*(1+noise(0)*random*.32);
   const axis=[Math.sin(latitude)*Math.cos(longitude),Math.cos(latitude),Math.sin(latitude)*Math.sin(longitude)],tangent=[Math.cos(latitude)*Math.cos(longitude),-Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude)],across=[-Math.sin(longitude),0,Math.cos(longitude)];
   const bend=tangent.map((v,i)=>v*((s.petalCurl||0)*.65+noise(2)*random*.18)+across[i]*noise(3)*random*.12),a=axis.map(v=>v*core*(.92-(s.petalBlend||0)*.22)),c=axis.map(v=>v*(core*.92+length));
   const tip=Math.max(.0015,width*(.9*(1-sharp)+.008*sharp)),thickness=Math.min(rootRadius*(1+noise(1)*random*.18),Math.hypot(...vectorSub(c,a))*.85+tip);
   radiusBound=Math.max(radiusBound,Math.max(Math.hypot(...a),Math.hypot(...c))+Math.max(thickness,tip)+Math.hypot(...bend)*length+blend*2);
   data.set([...axis,length,...a,thickness,...c,tip,...bend,1+2*Math.hypot(...bend)],(row*96+column*4)*4);
  }
 }
 return {data,rowData,radiusBound:rootWeight(s)>.999999?rootRadiusBound(s):Math.max(radiusBound,rootWeight(s)>0?rootRadiusBound(s):0)};
}
// Advanced appendages use a fixed budget of twenty-four tapered curve segments.
// Geometry and BVH storage are reused; animation refits the existing tree.
// No per-pixel all-roots search and no rebuilding/sorting during a loop.
const ROOT_SEGMENTS=24,ROOT_TEXTURE_WIDTH=256,ROOT_TEXTURE_HEIGHT=128;
const ROOT_CONTACT_MAX_DISPLACEMENT=.55;
// Position-based strand contacts. Each requested pose is solved from the same
// periodic guide, independently of playback history, seeking or export order.
// This is a quasi-static contact solve: no stored velocities or hidden pre-roll.
export function solveRootContacts(segments,roots,steps,s,core,flat=1){
 const per=steps+1,n=roots*per,m=roots*steps,positions=new Float64Array(n*3),target=new Float64Array(n*3),radius=new Float64Array(n),mass=new Float64Array(n),arc=new Float64Array(n);
 const idsA=new Int32Array(m),idsB=new Int32Array(m),rest=new Float64Array(m),bend=new Float64Array(roots*(steps-1));
 const strength=Math.max(0,Math.min(1,s.petalCollision||0)),sphere=Math.max(0,Math.min(1,s.petalSphereCollision||0)),gap=s.petalContactGap??.006,stiffness=s.petalContactStiffness??.65,passes=s.rootMeasureOnly?0:Math.round(Math.max(8,Math.min(32,s.petalContactPasses||16)));
 const flat2=flat*flat,emergence=Math.min(1,Math.max(0,((s.petalGrowth??1)-.01)/.3));
 for(let root=0;root<roots;root++)for(let j=0;j<=steps;j++){
  const id=root*per+j,q=(root*steps+Math.min(j,steps-1))*8+(j===steps?4:0),p=id*3;
  for(let k=0;k<3;k++)positions[p+k]=target[p+k]=segments[q+k];radius[id]=segments[q+3];
  const pin=j===0||j===steps&&Math.hypot(target[p],target[p+1]/flat,target[p+2])<core+radius[id];mass[id]=pin?0:1;
  if(j){const edge=root*steps+j-1,a=id-1;idsA[edge]=a;idsB[edge]=id;rest[edge]=Math.hypot(positions[p]-positions[p-3],positions[p+1]-positions[p-2],positions[p+2]-positions[p-1]);arc[id]=arc[a]+rest[edge];}
  if(j>1)bend[root*(steps-1)+j-2]=Math.hypot(positions[p]-positions[p-6],positions[p+1]-positions[p-5],positions[p+2]-positions[p-4]);
 }
 const low=new Float64Array(m*3),high=new Float64Array(m*3),order=Array.from({length:m},(_,i)=>i),closest=new Float64Array(5);
 let corrections=0,contacts=0,maxCorrection=0;
 function distance(a,b,length,factor){
  const ai=a*3,bi=b*3,x=positions[ai]-positions[bi],y=positions[ai+1]-positions[bi+1],z=positions[ai+2]-positions[bi+2],d=Math.hypot(x,y,z),w=mass[a]+mass[b];if(d<1e-10||w===0)return;
  const q=(length-d)*factor/(d*w);positions[ai]+=x*q*mass[a];positions[ai+1]+=y*q*mass[a];positions[ai+2]+=z*q*mass[a];positions[bi]-=x*q*mass[b];positions[bi+1]-=y*q*mass[b];positions[bi+2]-=z*q*mass[b];
 }
 function closestPair(a,b,c,d){
  a*=3;b*=3;c*=3;d*=3;
  const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2],vx=positions[d]-positions[c],vy=positions[d+1]-positions[c+1],vz=positions[d+2]-positions[c+2],wx=positions[a]-positions[c],wy=positions[a+1]-positions[c+1],wz=positions[a+2]-positions[c+2];
  const aa=ux*ux+uy*uy+uz*uz,ee=vx*vx+vy*vy+vz*vz,bb=ux*vx+uy*vy+uz*vz,cc=ux*wx+uy*wy+uz*wz,ff=vx*wx+vy*wy+vz*wz,clamp=x=>Math.max(0,Math.min(1,x));let u=0,v=0;
  if(aa<1e-12)v=ee<1e-12?0:clamp(ff/ee);else if(ee<1e-12)u=clamp(-cc/aa);else{const den=aa*ee-bb*bb;u=den>1e-12?clamp((bb*ff-cc*ee)/den):0;v=(bb*u+ff)/ee;if(v<0){v=0;u=clamp(-cc/aa);}else if(v>1){v=1;u=clamp((bb-cc)/aa);}}
  closest[0]=u;closest[1]=v;closest[2]=wx+ux*u-vx*v;closest[3]=wy+uy*u-vy*v;closest[4]=wz+uz*u-vz*v;
 }
 function separate(i,j,apply=true){
  const a=idsA[i],b=idsB[i],c=idsA[j],d=idsB[j];
  if(Math.floor(i/steps)===Math.floor(j/steps)&&(Math.abs(i-j)<=2||Math.abs(arc[a]-arc[c])<2*(radius[a]+radius[c])+Math.max(rest[i],rest[j])))return 0;
  closestPair(a,b,c,d);const u=closest[0],v=closest[1],ra=radius[a]*(1-u)+radius[b]*u,rb=radius[c]*(1-v)+radius[d]*v,minimum=ra+rb+gap;
  let x=closest[2],y=closest[3],z=closest[4],len=Math.hypot(x,y,z),penetration=minimum-len;if(penetration<=0)return 0;
  const wa=1-u,wb=u,wc=1-v,wd=v,w=mass[a]*wa*wa+mass[b]*wb*wb+mass[c]*wc*wc+mass[d]*wd*wd;if(w<1e-10)return 0;
  // Buried attachment regions intentionally join the core. Solve their free
  // neighbours, rather than trying to separate immovable roots inside it.
  const px=positions[a*3]*(1-u)+positions[b*3]*u,py=positions[a*3+1]*(1-u)+positions[b*3+1]*u,pz=positions[a*3+2]*(1-u)+positions[b*3+2]*u;
  if(Math.hypot(px,py/flat,pz)<core-Math.max(ra,rb))return 0;
  if(!apply)return penetration;
  if(len<1e-8){const ai=a*3,bi=b*3,ci=c*3,di=d*3,ux=positions[bi]-positions[ai],uy=positions[bi+1]-positions[ai+1],uz=positions[bi+2]-positions[ai+2],vx=positions[di]-positions[ci],vy=positions[di+1]-positions[ci+1],vz=positions[di+2]-positions[ci+2];x=uy*vz-uz*vy;y=uz*vx-ux*vz;z=ux*vy-uy*vx;len=Math.hypot(x,y,z);if(len<1e-8){x=-uy;y=ux;z=0;len=Math.hypot(x,y);if(len<1e-8){x=1;y=z=0;len=1;}}if((Math.floor(i/steps)+Math.floor(j/steps))%2){x=-x;y=-y;z=-z;}}
  const scale=penetration*strength/(len*(w+.03*(1-strength)));x*=scale;y*=scale;z*=scale;
  for(const [id,weight,sign] of [[a,wa,1],[b,wb,1],[c,wc,-1],[d,wd,-1]]){const f=mass[id]*weight*sign,p=id*3;positions[p]+=x*f;positions[p+1]+=y*f;positions[p+2]+=z*f;}
  corrections++;return penetration;
 }
 function pairs(apply=true){
  let max=0;
  for(let i=0;i<m;i++){const a=idsA[i],b=idsB[i],r=Math.max(radius[a],radius[b])+gap*.5+.001;for(let k=0;k<3;k++){low[i*3+k]=Math.min(positions[a*3+k],positions[b*3+k])-r;high[i*3+k]=Math.max(positions[a*3+k],positions[b*3+k])+r;}}
  order.sort((a,b)=>low[a*3]-low[b*3]||a-b);
  for(let a=0;a<m;a++){const i=order[a];for(let b=a+1;b<m;b++){const j=order[b];if(low[j*3]>high[i*3])break;if(low[j*3+1]>high[i*3+1]||high[j*3+1]<low[i*3+1]||low[j*3+2]>high[i*3+2]||high[j*3+2]<low[i*3+2])continue;const p=separate(Math.min(i,j),Math.max(i,j),apply);max=Math.max(max,p);if(!apply&&p>.001)contacts++;}}
  return max;
 }
 function sphereContacts(){
  for(let i=0;i<m;i++){
   const a=idsA[i],b=idsB[i],part=i%steps;if(part<1||part>=steps-1&&mass[b]===0)continue;
   const ai=a*3,bi=b*3,dx=positions[bi]-positions[ai],dy=(positions[bi+1]-positions[ai+1])/flat,dz=positions[bi+2]-positions[ai+2],den=dx*dx+dy*dy+dz*dz;
   const closestT=den>1e-12?Math.max(0,Math.min(1,-(positions[ai]*dx+positions[ai+1]/flat*dy+positions[ai+2]*dz)/den)):.5;
   for(const t of [0,.5,1,closestT]){
    const wa=1-t,wb=t,w=mass[a]*wa*wa+mass[b]*wb*wb;if(w<1e-10)continue;
    const x=positions[ai]*wa+positions[bi]*wb,y=positions[ai+1]*wa+positions[bi+1]*wb,z=positions[ai+2]*wa+positions[bi+2]*wb,norm=Math.hypot(x,y/flat,z);if(norm<1e-10)continue;
    const nx=x/norm,ny=y/(flat2*norm),nz=z/norm,gradient=Math.hypot(nx,ny,nz),r=radius[a]*wa+radius[b]*wb+gap*.5;
    const penetration=r-(norm-core)/gradient;if(penetration<=0)continue;
    const k=penetration*sphere*emergence/(gradient*(w+.03*(1-sphere)));
    for(const [id,weight] of [[a,wa],[b,wb]]){const f=mass[id]*weight*k,p=id*3;positions[p]+=nx*f;positions[p+1]+=ny*f;positions[p+2]+=nz*f;}
   }
  }
 }
 for(let pass=0;pass<passes;pass++){
  // Fixed iteration count and order keep a phase reproducible on preview/export.
  // End with contacts so elasticity cannot immediately pull strands together.
  const elastic=pass<passes-3;
  if(elastic){for(let e=0;e<m;e++){const i=pass%2?m-1-e:e;distance(idsA[i],idsB[i],rest[i],.25+.65*stiffness);}for(let r=0;r<roots;r++)for(let j=0;j<steps-1;j++)distance(r*per+j,r*per+j+2,bend[r*(steps-1)+j],stiffness*.35);}
  if(sphere>0)sphereContacts();if(strength>0)pairs();
  for(let i=0;i<n;i++){const p=i*3,x=positions[p]-target[p],y=positions[p+1]-target[p+1],z=positions[p+2]-target[p+2],d=Math.hypot(x,y,z);if(d>ROOT_CONTACT_MAX_DISPLACEMENT){const k=ROOT_CONTACT_MAX_DISPLACEMENT/d;positions[p]=target[p]+x*k;positions[p+1]=target[p+1]+y*k;positions[p+2]=target[p+2]+z*k;}}
 }
 const residual=strength>0?pairs(false):0;
 for(let i=0;i<n;i++)maxCorrection=Math.max(maxCorrection,Math.hypot(positions[i*3]-target[i*3],positions[i*3+1]-target[i*3+1],positions[i*3+2]-target[i*3+2]));
 for(let i=0;i<m;i++)for(const [id,offset] of [[idsA[i],0],[idsB[i],4]])for(let k=0;k<3;k++)segments[i*8+offset+k]=positions[id*3+k];
 return {corrections,remainingContacts:contacts,maxPenetration:residual,maxCorrection,passes};
}
function rootWeight(s){if(s.motions?.petalFlowPhase?.enabled||s.motions?.petalOrbitPhase?.enabled)return 1;return Math.min(1,10*Math.max(1-(s.petalGrowth??1),...ROOT_KEYS.slice(1).map(k=>Math.abs(s[k]||0))));}
function rootRadiusBound(s){
 const core=.62+(s.petalOpen??.65)*.14,random=s.petalRandom||0,len=(s.petalLength??1.05)*(1+random*.32),width=(s.petalWidth??.24)*(.65+(s.petalInflate??.6)*.55),baseGrowth=s.petalGrowth??1,growth=Math.min(1,baseGrowth*(1+(s.petalDisorder||0)*.35*(1-baseGrowth)));
 const root=Math.min(.42,Math.max(.025,width*.5+(s.petalRoot||0)*.28+(s.petalBlend||0)*.04)),tip=Math.max(.0015,width*(.9*(1-(s.petalSharp||0))+.008*(s.petalSharp||0))),reentry=s.petalReentry||0;
 const rise=len*(growth*(1-reentry)*(1-.8*Math.abs(s.petalCoil||0))+Math.sin(Math.min(.5,growth)*Math.PI)*reentry*.68),wander=(s.petalWander||0)*len*.52*growth,curl=(Math.abs(s.petalCurl||0)*.65+random*.18)*len*growth*growth;
 const radius=Math.max(root*(1+random*.18),tip)*(1+(s.petalKnots||0)*.32+(s.petalRidges||0)*.12);
 return Math.max(core,core-root*(1-random*.18)*1.1+rise+wander+curl+(s.petalWeave||0)*len*.28+radius*(1+(s.petalFlow||0)*.4))+rootBlend(s)*.5+.025+((s.petalCollision||s.petalSphereCollision)?ROOT_CONTACT_MAX_DISPLACEMENT:0);
}
function rootBlend(s){return .015+(s.petalBlend||0)*(.09+(s.petalRoot||0)*.16);}
export function rootGeometry(s,storage){
 const rows=Math.max(2,Math.min(8,Math.floor((s.petalRows||5)+.5))),ringCount=Math.max(3,Math.min(24,Math.round(s.petalCount||12)));
 const spread=s.petalCoverage||0;let roots=spread<.999999?ringCount:0;for(let row=0;row<rows&&spread>.000001;row++)roots+=Math.max(3,Math.min(24,Math.round((s.petalCount||12)*Math.sin((row+.5)*Math.PI/rows))));
 const count=roots*ROOT_SEGMENTS,nodeCount=count*2-1;
 if(!storage)storage={segments:new Float32Array(4096*8),data:new Float32Array(ROOT_TEXTURE_WIDTH*ROOT_TEXTURE_HEIGHT*4),order:new Uint16Array(4096),right:new Int32Array(8192),leaf:new Int32Array(8192)};
 const {segments,data}=storage,core=.62+(s.petalOpen??.65)*.14,flat=.2+.8*spread;
 const width=(s.petalWidth??.24)*(.65+(s.petalInflate??.6)*.55),sharp=s.petalSharp||0,random=s.petalRandom||0,disorder=s.petalDisorder||0,growth=s.petalGrowth??1;
 const rootRadius=Math.min(.42,Math.max(.025,width*.5+(s.petalRoot||0)*.28+(s.petalBlend||0)*.04)),tipRadius=Math.max(.0015,width*(.9*(1-sharp)+.008*sharp));
 const phase=(((s.petalPhase||0)%360+360)%360)*Math.PI/180,wander=s.petalWander||0,coil=s.petalCoil||0,reentry=s.petalReentry||0,knots=s.petalKnots||0,ridges=s.petalRidges||0,blend=rootBlend(s);
 let segment=0,actualRadius=core;
 // Include the ring and spherical distribution throughout the morph. Their
 // lengths and radii emerge continuously; no topology popping at coverage=0.
 for(let row=-1;row<rows;row++){
  if(row<0&&spread>=.999999||row>=0&&spread<=.000001)continue;
  const ring=row<0,latitude=ring?Math.PI*.5:(row+.5)*Math.PI/rows,cells=ring?ringCount:Math.max(3,Math.min(24,Math.round((s.petalCount||12)*Math.sin(latitude)))),participation=ring?1-spread:spread;
  for(let column=0;column<cells;column++){
   const noise=lane=>growthRandom(row+1,column,s.seed,lane),lat=latitude+noise(4)*disorder*Math.PI/rows*.42*(ring?.3:1),lon=(column+(row%2)*.5)*TAU/cells+phase+noise(5)*disorder*TAU/cells*.43;
   const ax=Math.sin(lat)*Math.cos(lon),ay=Math.cos(lat),az=Math.sin(lat)*Math.sin(lon),tx=Math.cos(lat)*Math.cos(lon),ty=-Math.sin(lat),tz=Math.cos(lat)*Math.sin(lon),bx=-Math.sin(lon),bz=Math.cos(lon);
   const len=(s.petalLength??1.05)*(1+noise(0)*random*.32),thickness=rootRadius*(1+noise(1)*random*.18),seedPhase=noise(6)*Math.PI;
   const localGrowth=Math.max(0,Math.min(1,growth*(1+noise(7)*disorder*.35*(1-growth))))*participation;
   const directionTurn=(s.petalDirectionSpread||0)*(noise(9)*Math.PI+((row+column)%2)*Math.PI),directionCos=Math.cos(directionTurn),directionSin=Math.sin(directionTurn);
   const bend=(s.petalCurl||0)*.65+noise(2)*random*.18,turn=coil*4.6*(1+noise(3)*disorder*.25)+reentry*(1.35+len*.55),sideTurn=noise(8)*disorder*.7+directionTurn;
   const base=core-thickness*1.1-blend*.4,bodyScale=ring?flat:1;
   let prevX=0,prevY=0,prevZ=0,prevR=0;
   for(let j=0;j<=ROOT_SEGMENTS;j++){
    const t=j/ROOT_SEGMENTS,u=t*localGrowth,angle=turn*u+(s.petalOrbitPhase||0)*TAU;
    const rise=len*(u*(1-reentry)*(1-.8*Math.abs(coil))+Math.sin(Math.PI*u)*reentry*.68);
    const weave=(s.petalWeave||0)*len*.28*Math.sin(u*TAU*(s.petalWeaveTurns||2)+((row+column)%2)*Math.PI)*Math.sin(Math.PI*t);
    const radial=base+rise+weave,ca=Math.cos(angle),sa=Math.sin(angle),sweepX=tx*Math.cos(sideTurn)+bx*Math.sin(sideTurn),sweepY=ty*Math.cos(sideTurn),sweepZ=tz*Math.cos(sideTurn)+bz*Math.sin(sideTurn);
    const meander=wander*len*.19*u*(1-reentry*u)*(Math.sin(u*TAU*1.4+seedPhase)-Math.sin(seedPhase)),meander2=wander*len*.14*u*(1-reentry*u)*Math.sin(u*TAU+seedPhase);
    // Direction spread also orients bending and wandering, even without coil.
    // Zero preserves the previous tangent frame and existing straight presets.
    const curl=bend*len*u*u*(1-reentry*u),along=(meander+curl)*directionCos-meander2*directionSin,across=(meander+curl)*directionSin+meander2*directionCos;
    const dx=(ax*ca+sweepX*sa)*radial+tx*along+bx*across,dy=((ay*ca+sweepY*sa)*radial+ty*along)*bodyScale,dz=(az*ca+sweepZ*sa)*radial+tz*along+bz*across;
    // The small, phase-shifted swellings disturb the tube itself instead of
    // faking roughness in the lighting; silhouettes and SSS follow them.
    const flow=(s.petalFlow||0)*.4*Math.sin(u*TAU*2-(s.petalFlowPhase||0)*TAU+seedPhase)*Math.sin(Math.PI*t);
    const profile=1+flow+knots*.32*Math.sin(u*TAU*2.2+seedPhase)*Math.sin(Math.PI*t)+ridges*.12*Math.sin(u*TAU*4.5+seedPhase+.7)*Math.sin(Math.PI*t);
    const radius=Math.max(.0001,(thickness*(1-t)+tipRadius*t)*profile*Math.min(1,localGrowth*6));
    if(j){const q=segment++*8;segments[q]=prevX;segments[q+1]=prevY;segments[q+2]=prevZ;segments[q+3]=prevR;segments[q+4]=dx;segments[q+5]=dy;segments[q+6]=dz;segments[q+7]=radius;}
    actualRadius=Math.max(actualRadius,Math.hypot(dx,dy,dz)+radius+blend*.25);prevX=dx;prevY=dy;prevZ=dz;prevR=radius;
   }
  }
 }
 if((s.petalCollision||s.petalSphereCollision)&&(s.petalGrowth??1)>.01){storage.contacts=solveRootContacts(segments,roots,ROOT_SEGMENTS,s,core,flat);actualRadius=core;for(let i=0;i<count*8;i+=4)actualRadius=Math.max(actualRadius,Math.hypot(segments[i],segments[i+1],segments[i+2])+segments[i+3]+blend*.25);}else storage.contacts=null;
 const topology=rows+'|'+ringCount+'|'+roots+'|'+(spread<.999999)+'|'+(spread>.000001);
 if(storage.topology!==topology){
  for(let i=0;i<count;i++)storage.order[i]=i;
  let cursor=0;
  const center=(index,axis)=>(segments[index*8+axis]+segments[index*8+4+axis])*.5;
  function build(start,end){
   const node=cursor++,n=end-start;if(n===1){storage.leaf[node]=storage.order[start];storage.right[node]=-1;data[node*16+3]=cursor;return node;}
   let axis=0,best=-1;for(let k=0;k<3;k++){let lo=Infinity,hi=-Infinity;for(let i=start;i<end;i++){const v=center(storage.order[i],k);lo=Math.min(lo,v);hi=Math.max(hi,v);}if(hi-lo>best){best=hi-lo;axis=k;}}
   // In-place median partition, with no temporary per-node arrays.
   const middle=(start+end)>>1;let lo=start,hi=end-1;
   while(lo<hi){const pivot=center(storage.order[(lo+hi)>>1],axis);let i=lo,j=hi;while(i<=j){while(center(storage.order[i],axis)<pivot)i++;while(center(storage.order[j],axis)>pivot)j--;if(i<=j){const v=storage.order[i];storage.order[i++]=storage.order[j];storage.order[j--]=v;}}if(middle<=j)hi=j;else if(middle>=i)lo=i;else break;}
   storage.leaf[node]=-1;build(start,middle);storage.right[node]=build(middle,end);data[node*16+3]=cursor;return node;
  }
  build(0,count);storage.topology=topology;storage.builds=(storage.builds||0)+1;
 }
 for(let node=nodeCount-1;node>=0;node--){
  const q=node*16,leaf=storage.leaf[node];
  if(leaf>=0){const k=leaf*8,ra=segments[k+3],rb=segments[k+7];for(let axis=0;axis<3;axis++){data[q+axis]=Math.min(segments[k+axis]-ra,segments[k+4+axis]-rb);data[q+4+axis]=Math.max(segments[k+axis]+ra,segments[k+4+axis]+rb);}data[q+7]=1;for(let j=0;j<8;j++)data[q+8+j]=segments[k+j];}
  else{const a=(node+1)*16,b=storage.right[node]*16;for(let axis=0;axis<3;axis++){data[q+axis]=Math.min(data[a+axis],data[b+axis]);data[q+4+axis]=Math.max(data[a+4+axis],data[b+4+axis]);}data[q+7]=0;}
 }
 storage.count=count;storage.nodeCount=nodeCount;storage.roots=roots;storage.radiusBound=actualRadius+.025;storage.refits=(storage.refits||0)+1;return storage;
}
let cpuRootsKey='',cpuRoots;
function rootFieldAt(s,p){
 const core=.62+(s.petalOpen??.65)*.14,flat=.2+.8*(s.petalCoverage||0),body=(Math.hypot(p[0],p[1]/flat,p[2])-core)*flat;
 if((s.petalGrowth??1)<.000001||Math.hypot(...p)<core*flat*.35)return body;
 const key=GROWTH_KEYS.map(k=>s[k]??0).join('|')+'|'+(s.petalCoverage||0);
 if(key!==cpuRootsKey){cpuRoots=rootGeometry(s,cpuRoots);cpuRootsKey=key;}
 const {data,nodeCount}=cpuRoots,blend=rootBlend(s);let best=100,node=0;
 while(node<nodeCount){const q=node*16;let outside=0,inside=-Infinity;for(let axis=0;axis<3;axis++){const d=Math.max(data[q+axis]-p[axis],p[axis]-data[q+4+axis]);outside+=Math.max(0,d)**2;inside=Math.max(inside,d);}const bound=Math.sqrt(outside)+Math.min(0,inside);if(bound>Math.min(best,body)+blend){node=data[q+3];continue;}if(data[q+7]>.5)best=Math.min(best,coneAt(p,[data[q+8],data[q+9],data[q+10]],[data[q+12],data[q+13],data[q+14]],data[q+11],data[q+15]));node++;}
 return softMin(body,best,blend);
}

function rootOccupancy(s,geometry,bits){
 const extent=Math.max(1,geometry.radiusBound)+.25,margin=.19+rootBlend(s),side=24,scale=side/(2*extent);
 bits.fill(0);
 const fill=(x0,y0,z0,x1,y1,z1,padding)=>{
  const start=value=>Math.max(0,Math.min(side-1,Math.floor((value-padding+extent)*scale)));
  const end=value=>Math.max(0,Math.min(side-1,Math.floor((value+padding+extent)*scale)));
  const minX=start(x0),minY=start(y0),maxX=end(x1),maxY=end(y1),lo=start(z0),hi=end(z1);
  const depth=((1<<(hi-lo+1))-1)<<lo;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)bits[y*side+x]|=depth;
 };
 const core=s.petalAmount<.999999?1:.62+s.petalOpen*.14,flat=s.petalAmount<.999999?1:.2+.8*s.petalCoverage;
 fill(-core,-core*flat,-core,core,core*flat,core,margin);
 for(let node=0;node<geometry.nodeCount;node++){
  const q=node*16,data=geometry.data;
  if(data[q+7]>.5)fill(data[q],data[q+1],data[q+2],data[q+4],data[q+5],data[q+6],margin);
 }
 return extent;
}
export function geometryRadius(s,growthRadius=0){
 if(rootWeight(s)>0&&!growthRadius)growthRadius=rootRadiusBound(s);
 const width=(s.petalWidth??.24)*(.65+(s.petalInflate??.6)*.55),length=s.petalLength??1.05;
 const flower=.17+(s.petalOpen??.65)*.25+length+width+.15,hedge=.62+(s.petalOpen??.65)*.14+length+width+.2;
 let radius=1.;if((s.petalAmount||0)>.000001){if(rootWeight(s)>.999999)radius=Math.max(radius,growthRadius);else{if((s.petalCoverage||0)<.9999)radius=Math.max(radius,flower);if((s.petalCoverage||0)>.0001)radius=Math.max(radius,hedge,growthRadius);if(rootWeight(s)>0)radius=Math.max(radius,growthRadius);}}
 if((s.stemAmount||0)>.000001)radius=Math.max(radius,s.stemAmount*3+Math.abs(s.stemBend||0)*.55+(s.stemRadius??.09)+.25);
 radius=Math.max(radius+.02,cellularBounds(s),fractalBounds(s))+(growthGeometryEnabled(s)?.23:0);
 // A small displacement must not dilute the field into a 4.5-radius atlas.
 // Bound the inverse deformations in reverse order. Twist preserves length;
 // waves/noise have bounded amplitude. Retain the conservative legacy bound
 // for strongly nonlinear warps whose inverse may approach a singularity.
 const warp=['asymmetry','taper','bendX','bendY','pinch'];
 if(warp.some(k=>Math.abs(s[k]||0)>.45))return Math.max(4.5,radius*1.2)*structureBounds(s);
 radius+=Math.abs(s.deform||0)+Math.abs(s.waves||0)*.17+Math.abs(s.lobeAmount||0);
 const exponent=2+(s.roundness||0)*6;
 radius*=Math.pow(3,Math.max(0,.5-1/exponent));
 const original=radius,stretch=1+Math.abs(s.taper||0)*original*.45;
 const pinching=Math.max(.05,1+Math.min(0,s.pinch||0));
 const shear=Math.max(.2,1-Math.abs(s.asymmetry||0)*original*.18);
 radius*=Math.max(1,stretch/pinching/shear);
 const dy=Math.abs(s.bendY||0)*(radius*radius+.3),y=original+dy;
 const dx=Math.abs(s.asymmetry||0)*(y*y+.25)+Math.abs(s.bendX||0)*(y*y+.3);
 return (radius+Math.hypot(dx,dy))*structureBounds(s);
}
const CELLULAR_ENABLED=16777216,FRACTAL_ENABLED=33554432,STUDIO_LAYERS=67108864,WEAVE_DETAIL=134217728,FOCUS_DEPTH=268435456,SHELL_FIELD=536870912,FAN_FIELD=1073741824;
const GROWTH_GEOMETRY=1<<31;
const fanVariant=source=>motionInterval(source,'structFan')[1]>.000001?FAN_FIELD:0;
const raisedWeave=source=>motionInterval(source,'structWeaveGrowth')[1]>.000001;
const growthVariant=source=>source.renderVersion>=2&&growthGeometryEnabled(source)?GROWTH_GEOMETRY:0;
const weaveVariant=source=>raisedWeave(source)||motionInterval(source,'structWeaveBranching')[1]>.000001||motionInterval(source,'structWeaveMembrane')[1]>.000001||
 motionInterval(source,'structWeaveNodes')[1]>.000001&&motionInterval(source,'structWeaveVariation')[1]>.000001?WEAVE_DETAIL:0;
function bakeVariant(source){
 const petals=motionInterval(source,'petalAmount')[1]>.000001,stem=motionInterval(source,'stemAmount')[1]>.000001;
 let key=ATLAS_BAKE|fanVariant(source)|growthVariant(source)|weaveVariant(source);
 if(petals)key|=64|128|256|512|32768;
 if(stem)key|=64|1024;
 if(cellularMayChange(source))key|=CELLULAR_ENABLED;
 if(fractalMayChange(source))key|=FRACTAL_ENABLED;
 return key;
}
const FAN_BASE_CHANGES=['baseForm','roundness','deform','asymmetry','twist','waves','lobeAmount','pinch','taper','bendX','bendY','hole','cut','loopAmount','cellMorph','fractalAmount','petalAmount','stemAmount','structFibres','structSlices','structLayers','structShell'];
function compactFan(source){
 return fanVariant(source)&&!growthGeometryEnabled(source)&&!hasSolidForces(source)&&
  !FAN_BASE_CHANGES.some(key=>Math.abs(source[key]||0)>.000001||source.motions?.[key]?.enabled);
}
function fractalMayChange(s){return (s.fractalAmount||0)>0||!!(s.motions?.fractalAmount?.enabled&&s.motions.fractalAmount.amplitude>0);}
function rendererVariant(s,options={},source=s){
 const modern=s.renderVersion>=2,cellular=modern&&cellularMayChange(source),fractal=modern&&fractalMayChange(source),analytic=!hasSolidForces(s)&&!cellular&&!fractal&&analyticShape(s)&&!structureMayChange(source);
 const transmission=modern?s.transparency:s.transparency+(1-s.transparency)*(s.translucency||0),crown=modern&&(fractal||cellular||structureMayChange(source)||(s.petalAmount||0)+(s.stemAmount||0)>.000001);
 const amount=Math.min(1,((s.petalBlend||0)+(s.petalRoot||0)+(s.petalRandom||0))*20),spread=s.petalCoverage||0,petals=crown&&(s.petalAmount||0)>.000001;
 const volume=(s.scattering||0)+(s.translucency||0)+(s.subsurface||0)>.0001&&(!modern||transmission>.0001&&s.thinShell<.999);
 // A ribbon thinner than the field grid can disappear during interpolation.
 // Use the exact compact field for this case, including the complete motion
 // interval so playback does not switch shader at a thickness crossing.
 const thinLoop=!!(loopVariant(source)&SIMPLE_LOOP_FIELD)&&motionInterval(source,'loopTube')[0]*(1-.86*motionInterval(source,'loopFlat')[1])<.025;
 // Field parameters share one preview program once enabled. Analytic spheres and
 // the cached procedural field share the same shader and runtime uniform.
 // Reuse the baked field for each light path through layered films and fine
 // stalks. A separate higher-resolution atlas is used for stills and exports.
 const layeredOptics=modern&&(fanVariant(source)||raisedWeave(source))&&motionInterval(source,'transparency')[1]>.0001;
 const interactiveField=options.preview&&(!analytic||transmission>.0001)&&!thinLoop&&options.quality!=='full'&&
  (options.quality==='fast'||!structureMayChange(source)||transmission>.0001||volume);
 const exactFan=modern&&compactFan(source);
 if(modern&&!exactFan&&(layeredOptics||interactiveField)){
  // An enabled transparency track can cross zero. Prepare its complete
  // optical path once, instead of switching programs at that crossing.
  const transmitting=motionInterval(source,'transparency')[1]>.0001;
  const scattering=(source.scattering||0)+(source.translucency||0)+(source.subsurface||0)>.0001&&transmitting&&source.thinShell<.999;
  return 8+4096+ATLAS_PREVIEW+(s.thinShell>=.999?16:0)+ +scattering+((s.subsurface||0)>.0001?2:0)+(transmitting?2048:0)+(hasSolidForces(s)?SCULPT_ENABLED:0)+(cellular?CELLULAR_ENABLED:0);
 }
 const originalPetals=petals&&rootWeight(s)<.999999;
 return (modern?8+loopVariant(source):0)+(exactFan?SIMPLE_LOOP_FIELD:0)+(modern&&s.thinShell>=.999?16:0)+(modern&&analytic?32:0)+(crown?64:0)+ +volume+((s.subsurface||0)>.0001&&(!modern?transmission<.999:true)?2:0)+((s.dispersion||0)>.005?4:0)
  +(originalPetals&&spread<=.9999?128:0)+(originalPetals&&spread>=.0001&&amount<.999999?256:0)+(originalPetals&&spread>=.0001&&amount>.000001?512:0)+(crown&&(s.stemAmount||0)>.000001?1024:0)+(modern&&transmission>.0001?2048:0)+(modern&&options.preview&&options.quality!=='full'?4096:0)+(petals&&rootWeight(s)>.000001?32768:0)+(modern&&(structureMayChange(source)||growthGeometryEnabled(source))?65536:0)+(modern?Math.round(s.baseForm||0)*131072:0)+(modern&&hasSolidForces(s)?SCULPT_ENABLED:0)+(cellular?CELLULAR_ENABLED:0)+(fractal?FRACTAL_ENABLED:0);
}
const STRUCTURE_CUTS=['structFibres','structSlices','structRadial','structLayers','structFan'];
function renderKey(s,o,source){
 const geometry=rendererVariant(s,o,source);
 const shell=!!(geometry&65536)&&!(geometry&(ATLAS_PREVIEW|SIMPLE_LOOP_STRUCTURE))&&o.compactStructure!==false&&
  STRUCTURE_CUTS.every(k=>!(source[k]>0||source.motions?.[k]?.enabled));
 return (geometry+(o.layers||o.layerOpacity!==undefined?STUDIO_LAYERS:0)+(o.focusDepthOnly?FOCUS_DEPTH:0)+(shell?SHELL_FIELD:0)+fanVariant(source)+
  weaveVariant(source))|growthVariant(source);
}
const FILM_TRACE=`bool traceStructurePrimary(vec3 origin,vec3 direction,float maximum,bool outerOnly,out vec3 point,out float travel){
 vec2 interval=objectInterval(origin,direction);
 float t=max(0.,interval.x),end=min(maximum,interval.y),eps=rayEpsilon();
 float previousT=t,previousDistance=0.;
 for(int i=0;i<int(uRuntime.w*48.);i++){
  if(t>end)break;
  point=origin+direction*t;
  float distance=traceField(point,outerOnly);
  if(i>0&&distance*previousDistance<0.){
   travel=mix(previousT,t,previousDistance/(previousDistance-distance));
   point=origin+direction*travel;
   return true;
  }
  if(abs(distance)<eps){travel=t;return true;}
  previousT=t;previousDistance=distance;
  t+=clamp(abs(distance)*uRuntime.y*2.2,eps*2.,.18*uFrame.x);
 }
 travel=end;point=origin+direction*max(0.,end);
 return false;
}`;
function compactFilmOptics(source){
 source=shaderFunction(source,'traceStructurePrimary',FILM_TRACE);
 // This variant is selected only when the complete animation range excludes
 // cellular geometry. Do not compile the inactive cellular transport graph.
 source=source.replace('if(max(uCellOptics.x,uCellOptics.w)>.0001){','if(false){');
 source=shaderFunction(source,'cellularInterior','vec3 cellularInterior(vec3 p,vec3 ray){return vec3(0.);}');
 // Diffusion through a thin sheet can use its local optical thickness
 // instead of broad occupancy probes that often step over the sheet.
 source=shaderFunction(source,'subsurfaceLight',`vec3 subsurfaceLight(vec3 p,vec3 n,vec3 tint){
 vec3 total=vec3(0.),sigmaA=absorptionCoefficient(tint);
 float radius=max(.08,uTransport.y),height=uStructureA.y*.66*uFrame.x;
 vec3 extinction=sqrt(3.*sigmaA*(sigmaA+1./radius));
 for(int i=0;i<uLightCount;i++){
  vec3 offset=uLights[i].xyz-p;
  float distance=max(.03,length(offset)),cosine=dot(n,offset/distance);
  float area=max(.08,uLightProps[i].x*uLightProps[i].y*4.);
  float wrap=clamp((cosine+radius*.75)/(1.+radius*.75),0.,1.);
  vec3 flux=uLightColors[i]*uLights[i].w*1.5*area/(distance*distance+area);
  float path=height*mix(.2,1.,smoothstep(-.12,.12,-cosine))/max(.13,abs(cosine));
  total+=flux*exp(-extinction*path)*(wrap+max(0.,-cosine)*uInterior.z*.65);
 }
 return (total+environment(n,p,1.)*.045)*uSssColor;
 }`);
 return compactLayerTrace(source);
}
function compactLayerTrace(source){
 // Secondary layers use the same field, advancing once through their union
 // and compositing exterior-to-interior crossings in camera order.
 return source.replace(` vec3 origin=offsetBoundary(first,rd,true);
 bool inside=materialField(origin)<0.;
 for(int layer=0;layer<16;layer++){
  vec3 hit;float travel;
  if(!traceBoundary(origin,rd,20.*uFrame.x,false,hit,travel))break;
  inside=!inside;origin=offsetBoundary(hit,rd,inside);
  if(!inside)continue; // exiting the same sheet must not count it twice
  vec3 local=transform(hit),n=boundaryNormal(hit);`,` float eps=rayEpsilon(),limit=objectInterval(first,rd).y;
 float t=eps*8.,previousT=0.,previousDistance=0.;
 for(int i=0;i<int(uRuntime.w*48.);i++){
  if(t>=limit)break;
  float distance=materialField(first+rd*t);
  bool entry=distance<0.&&previousDistance>0.;
  float crossing=entry?mix(previousT,t,previousDistance/(previousDistance-distance)):t;
  previousT=t;previousDistance=distance;
  t+=clamp(abs(distance)*uRuntime.y*2.2,eps*4.,.18*uFrame.x);
  if(!entry)continue;
  vec3 hit=first+rd*crossing;
  vec3 local=transform(hit),n=surfaceNormal(hit);`);
}
function withFractalMaterialDomain(source,sculpt){
 let mapping='';
 if(sculpt){
  // Derive the same world-space inverse map from the actual force wrapper,
  // rather than maintaining a second sculpt/dynamics implementation.
  const marker='float field(vec3 world){',start=source.indexOf(marker)+marker.length,ret=source.indexOf('return ',start),call=source.indexOf('unforcedField(',ret);
  if(start<marker.length||ret<start||call<ret)throw new Error('Fractal force mapping is unavailable.');
  const begin=call+'unforcedField('.length;let end=begin,depth=1;
  while(depth&&end<source.length){if(source[end]==='(')depth++;if(source[end]===')')depth--;end++;}
  if(depth)throw new Error('Fractal force mapping is incomplete.');
  mapping='{'+source.slice(start,ret)+'world='+source.slice(begin,end-1)+';}';
 }
 return shaderFunction(source,'fractalMaterialPoint','vec3 fractalMaterialPoint(vec3 world){'+mapping+FRACTAL_MATERIAL_DOMAIN+'return p;}');
}
function variantSource(key,floatAtlas=false,weave='mixed'){
 const fields=(key&FAN_FIELD?'\n#define FAN_FIELD 1':'')+(key&GROWTH_GEOMETRY?'\n#define GROWTH_GEOMETRY 1':'')+(key&WEAVE_DETAIL?'\n#define WEAVE_DETAIL 1':'')+
  (weave==='network'?'\n#define WEAVE_NETWORK_ONLY 1':weave==='bands'?'\n#define WEAVE_BANDS_ONLY 1':'');
 const flags={ANALYTIC_SHAPE:32,THIN_SHELL_ENABLED:16,CROWN_ENABLED:64,FLOWER_ENABLED:128,LEGACY_HEDGE_ENABLED:256,ORGANIC_ENABLED:512,STEM_ENABLED:1024,TRANSMISSION_ENABLED:2048,PREVIEW_ENABLED:4096,VOLUME_ENABLED:1,SSS_ENABLED:2,DISPERSION_ENABLED:4,ROOTS_ENABLED:32768,STRUCTURE_ENABLED:65536};
 let defines='#define FLOAT_ATLAS '+ +floatAtlas+'\n#define FRACTAL_ENABLED '+ +!!(key&FRACTAL_ENABLED)+'\n#define CELLULAR_GEOMETRY '+ +(!!(key&CELLULAR_ENABLED))+'\n#define BASE_FORM_KIND '+(key&(ATLAS_PREVIEW|ATLAS_BAKE)?-1:(Math.floor(key/131072)&7))+'\n'+Object.entries(flags).map(([name,bit])=>'#define '+name+' '+ +!!(key&bit)).join('\n');
 if(key&ATLAS_BAKE)return BAKE_FRAG.replace('#version 300 es','#version 300 es\n'+defines+fields);
 if(key&8)defines+='\n#define TRACE_STEPS '+(key&ATLAS_PREVIEW?128:key&4096?128:224)+'\n#define INTERFACE_STEPS '+(key&ATLAS_PREVIEW?4:key&4096?8:32)+'\n#define LENGTH_SAMPLES '+(key&4096?8:16)+'\n#define SCATTER_SAMPLES '+(key&4096?2:4)+'\n#define SPECTRAL_SAMPLES '+(key&4096?3:5);
 let source=key&ATLAS_PREVIEW?(key&SCULPT_ENABLED?SCULPT_PREVIEW_FRAG:PREVIEW_FRAG):key&8?(key&SCULPT_ENABLED?SCULPT_FRAG:MODERN_FRAG):FRAG;
 if(key&8&&key&FRACTAL_ENABLED)source=withFractalMaterialDomain(source,!!(key&SCULPT_ENABLED));
 if(key&8&&!(key&CELLULAR_ENABLED)){
  source=source.replace('if(max(uCellOptics.x,uCellOptics.w)>.0001){','if(false){');
  source=shaderFunction(source,'cellularInterior','vec3 cellularInterior(vec3 p,vec3 ray){return vec3(0.);}');
 }
 if(key&ATLAS_PREVIEW&&key&WEAVE_DETAIL&&key&16)source=compactLayerTrace(source);
 if(key&8&&!(key&ATLAS_PREVIEW)){
  if(!(key&LOOP_ENABLED))source=shaderFunction(source,'loopBlend','float loopBlend(float d,vec3 p){return d;}');
  // Keep inactive operators out of the deeply nested refractive solver.
  // Any enabled geometry track selects the complete operator before playback.
  if(key&SIMPLE_LOOP_STRUCTURE)source=shaderFunction(source,'structureWarp','vec3 structureWarp(vec3 p){return p;}');
  if(key&(SIMPLE_LOOP_STRUCTURE|SHELL_FIELD)){
   // A folded or animated shell needs the same signed distance, minus the
   // inactive lattice/cut operators in each internal optical march.
   source=shaderFunction(source,'structureField',`float structureField(float d,vec3 p){float thickness=uStructureA.y*(1.-uStructureH.x*.85*min(1.,length(p.xy)));return uStructureA.x>0.?max(d,-d-thickness-(1.-thickness)*(1.-uStructureA.x)):d;}`);
  }
  if(key&SIMPLE_LOOP_FIELD&&!(key&GROWTH_GEOMETRY)){
   if(key&FAN_FIELD){
    if(key&16)source=compactFilmOptics(source);
    source=shaderFunction(source,'rayEpsilon',`float rayEpsilon(){return clamp(.00012*uFrame.x,.00004,.00024);}`);
    source=shaderFunction(source,'fieldParts',`vec3 fieldParts(vec3 world){
    vec3 size=vec3(uShape.y,uShape.z,max(.06,uShape.x*uShape.w));
    vec3 p=structureWarp(transform(world)/size);float d=length(p)-1.;
    float thickness=uStructureA.y*(1.-uStructureH.x*.85*min(1.,length(p.xy)));
    if(uStructureFan>0.)d=mix(d,fanField(p),uStructureFan);
    if(uStructureA.x>0.)d=max(d,-d-thickness-(1.-thickness)*(1.-uStructureA.x));
    float separation=uStructureC.z*(1.-uStructureFan);
    if(separation>0.)d=max(d,(abs(sin(atan(p.y,p.x)*uStructureC.w*.5))-mix(1.,uStructureD.x,separation))*length(p.xy)/uStructureC.w);
    return vec3(d,-10000.,-10000.)*min(min(size.x,size.y),size.z)*uFrame.x*.5;
   }`);
   }else source=shaderFunction(source,'fieldParts',`vec3 fieldParts(vec3 world){vec3 p=transform(world);float volume=max(.06,uShape.x*uShape.w);p/=vec3(uShape.y,uShape.z,volume);float d=structureField(loopBlend(length(p)-1.,p),p);return vec3(d,-10000.,-10000.)*min(min(uShape.y,uShape.z),volume)*uFrame.x*.5;}`);
  }
 }
 if(key&STUDIO_LAYERS){
  source=source.replace('out vec4 fragColor;',`layout(location=0) out vec4 fragColor;
layout(location=1) out vec4 studioDepth;
uniform float uStudioOpacity;`)
   .replace('coverage*=uFilCore;',`float z=clamp((16.-point.z)/32.,0.,.99999);
   vec2 packed=fract(z*vec2(1.,255.));packed.x-=packed.y/255.;
   studioDepth=vec4(packed,hit?clamp(uStudioOpacity*uFilCore*(1.-uMat.x),0.,1.):0.,1.);
   coverage*=uFilCore*uStudioOpacity;halo*=uStudioOpacity;`);
 }
 if(key&FOCUS_DEPTH)source=source.replace('normal=hit?surfaceNormal(point):vec3(0,0,1);',`float focusZ=clamp((16.-point.z)/32.,0.,.99999);
 vec2 focusPacked=fract(focusZ*vec2(1.,255.));focusPacked.x-=focusPacked.y/255.;
 studioDepth=vec4(focusPacked,hit?1.:0.,1.);fragColor=vec4(0.);return;`);
 return source.replace('#version 300 es','#version 300 es\n'+defines+fields);
}
// Geometry and transport can compile separately while sharing the exact field
// and the same frame uniforms. No cached distance volume is used by this pass.
export function implicitGeometryKey(source){
 let key=(bakeVariant(source)&~ATLAS_BAKE)|8|64|65536|loopVariant(source)|Math.round(source.baseForm||0)*131072;
 // Keep every petal family reachable by its motion interval, but avoid
 // compiling hundreds of inactive primitive evaluations for opaque plants.
 const coverage=motionInterval(source,'petalCoverage');
 const organic=['petalBlend','petalRoot','petalRandom'].map(k=>motionInterval(source,k));
 if(coverage[0]>=.999999)key&=~128;
 if(coverage[1]<=.000001)key&=~(256|512);
 if(organic.reduce((sum,range)=>sum+range[0],0)*20>=.999999)key&=~256;
 if(organic.reduce((sum,range)=>sum+range[1],0)*20<=.000001)key&=~512;
 if(rootWeight(source)<=.000001&&!ROOT_KEYS.some(k=>source.motions?.[k]?.enabled))key&=~32768;
 if(compactFan(source))key|=SIMPLE_LOOP_FIELD;
 if(source.thinShell>=.999)key|=16;
 if(hasSolidForces(source))key|=SCULPT_ENABLED;
 return key;
}
export function independentFanMode(source){return !!fanVariant(source)&&!fractalMayChange(source);}
function independentFanCompact(source){return compactFan(source)&&!['structShell','structRadial'].some(key=>materialMayUse(source,key));}
function weaveKernel(source){
 const ranges=['structWeaveBranching','structShell','structFibres','structWeft'].map(key=>motionInterval(source,key));
 if(ranges.some(([,max])=>max<=0))return 'bands';
 return ranges.every(([min])=>min===1)?'network':'mixed';
}
const weaveHitTag=(source,independentFan)=>weaveKernel(source)!=='bands'&&!independentFan&&!fractalMayChange(source);
function tissueKernel(source){
 const [min,max]=motionInterval(source,'structWeaveTension');
 return min>=1?'WEAVE_TISSUE_ONLY':max<=0?'WEAVE_GRID_ONLY':'';
}
function specializeTissue(shader,source){
 const mode=tissueKernel(source);
 return mode?shader.replace('#version 300 es','#version 300 es\n#define '+mode+' 1'):shader;
}
const addWeaveHitTag=(shader)=>shader.replace('#version 300 es','#version 300 es\n#define WEAVE_HIT_TAG 1');
export function implicitGeometrySource(source,{main,floatAtlas=true,independentFan=false}={}){
 let shader=specializeTissue(variantSource(implicitGeometryKey(source),floatAtlas,weaveKernel(source)),source);
 if(main===IMPLICIT_HIT_MAIN&&weaveHitTag(source,independentFan))shader=addWeaveHitTag(shader);
 if(independentFan)shader=independentFanGeometry(shader,independentFanCompact(source));
 return main?shaderFunction(shader,'main',main):shader;
}
const IMPLICIT_MATERIAL_SWITCHES=['textureWrinkles','textureFolds','textureWear','textureRipples','textureRandomness','textureWarp','texturePatch','growthAmount'];
const materialMayUse=(source,key)=>Math.abs(source[key]||0)>0||source.motions?.[key]?.enabled;
// Cellular thin surfaces keep their analytic interior transport. A mixed
// structure can require multiple physical sheets, so retain its general path.
function cellSurfaceMode(source){
 return cellularMayChange(source)&&!structureMayChange(source)&&!growthGeometryEnabled(source)&&!fractalMayChange(source)&&
  !['petalAmount','stemAmount'].some(key=>motionInterval(source,key)[1]>.000001);
}
function implicitMaterialKey(source){return implicitGeometryKey(source)+':'+IMPLICIT_MATERIAL_SWITCHES.map(key=>+!!materialMayUse(source,key)).join('')+':'+Number(independentFanMode(source))+':'+weaveKernel(source)+':'+tissueKernel(source);}
export function implicitSurfaceSource(source,{accumulate=false,independentFan=false}={}){
 const transmitting=motionInterval(source,'transparency')[1]>.0001;
 let shader=specializeTissue(variantSource(implicitGeometryKey(source)|16|(fractalMayChange(source)&&!transmitting?0:2048),false,weaveKernel(source)),source);
 if(accumulate&&weaveHitTag(source,independentFan))shader=addWeaveHitTag(shader);
 if(independentFan)shader=independentFanMaterialPoint(shader);
 if(!cellSurfaceMode(source))shader=compactFilmOptics(shader);
 // Compile only the material operators that can run anywhere in this scene's
 // animation. Enabling one changes this signature before the next frame.
 for(const [index,key] of ['textureWrinkles','textureFolds','textureWear','textureRipples'].entries())if(!materialMayUse(source,key))shader=shader.replace(`if(uMaterialLayers.${'xyzw'[index]}>.000001){`,'if(false){');
 if(!['textureRandomness','textureWarp','texturePatch'].some(key=>materialMayUse(source,key)))shader=shader.replace('if(uOrganicDetail.x+uOrganicDetail.y+uOrganicDetail.w>0.){','if(false){');
 if(!materialMayUse(source,'growthAmount'))shader=shader.replaceAll('if(uGrowthShape.x>0.){','if(false){');
 if(!['textureWrinkles','textureFolds','textureWear','textureRipples','growthAmount'].some(key=>materialMayUse(source,key)))shader=shader.replace('bool reliefActive=dot(uMaterialLayers,vec4(1.))>.000001||uGrowthShape.x>0.;','bool reliefActive=false;');
 shader=shader.replace('out vec4 fragColor;','out vec4 fragColor;\n'+IMPLICIT_SURFACE_UNIFORMS);
 shader=shaderFunction(shader,'structureBehind','vec4 structureBehind(vec3 first,vec3 rd){return implicitBehind;}');
 if(accumulate){
  if(cellSurfaceMode(source)){
   shader=shader.replace('below=mix(below,pearl,nacre*mix(.94,.46,clearCell));','float cellCoat=nacre*mix(.94,.46,clearCell);implicitTransmission*=1.-cellCoat;below=mix(below,pearl,cellCoat);');
   shader=shader.replace('float unusedBackground;vec4 backdrop=sceneRay(vec3(p.xy,4.8),rd,unusedBackground);','vec4 backdrop=implicitBehind;');
   shader=shader.replace('below=mix(below,backdrop.rgb*mix(vec3(1.),tint,.25),clarity)','implicitTransmission=mix(implicitTransmission,mix(vec3(1.),tint,.25),clarity);below=mix(below,backdrop.rgb*mix(vec3(1.),tint,.25),clarity)');
  }
  shader=shader.replace('vec4 straight=sceneRay(vec3(p.xy,4.8),rd,unused);','vec4 straight=implicitBehind;');
  shader=shader.replace('straight.rgb*=beta;','implicitTransmission=beta*transmission;straight.rgb*=beta;');
  shader=shader.replace('below=below*(vec3(1.)-metalF)+specular*metalF;','implicitTransmission*=vec3(1.)-metalF;below=below*(vec3(1.)-metalF)+specular*metalF;');
  shader=shader.replace('below=below*(vec3(1.)-filmF)+specular*filmF;','implicitTransmission*=vec3(1.)-filmF;below=below*(vec3(1.)-filmF)+specular*filmF;');
  shader=shader.replace('below=below*(vec3(1.)-coatF)+environment','implicitTransmission*=vec3(1.)-coatF;below=below*(vec3(1.)-coatF)+environment');
 }
 if(accumulate)shader=shader.replace('return vec4(below*coreVisibility,','implicitTransmission*=coreVisibility;return vec4(below*coreVisibility,');
 shader=shader.replace('out vec4 fragColor;','layout(location=0) out vec4 fragColor;');
 return shaderFunction(shader,'main',accumulate?(independentFan?INDEPENDENT_FAN_ACCUMULATE_MAIN:IMPLICIT_ACCUMULATE_MAIN):IMPLICIT_SURFACE_MAIN);
}

// The hidden surface still supplies attachment geometry to the fibres. Its
// optical ray tracer cannot affect the image when coverage and halo are zero.
let hiddenSurfaceShader;
function hiddenSurfaceSource(){
 if(hiddenSurfaceShader)return hiddenSurfaceShader;
 const shader=variantSource(8|16|32,true),tail=shader.slice(shader.lastIndexOf('coverage*=uFilCore;'));
 if(!tail.startsWith('coverage*=uFilCore;')||!tail.includes('uSampling.z'))throw Error('Hidden surface shader contract changed');
 return hiddenSurfaceShader=shaderFunction(shader,'main', 'void main(){\n'+
 'vec2 originalUV=(gl_FragCoord.xy+uSampling.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4,uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);\n'+
 'vec3 origin=vec3(uv,4.8),direction=vec3(0,0,-1),normal=vec3(0,0,1);float unused,coverage=0.,halo=0.,issue=0.;bool hit=false;vec4 back=sceneRay(origin,direction,unused),surface=back;\n'+tail);
}

export class Renderer{
 constructor(canvas){
 this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!gl)throw new Error('Questo browser non supporta WebGL 2. Prova un browser aggiornato con accelerazione grafica attiva.');this.gl=gl;this.programs=new Map();this.programClock=0;this.disposed=false;this.parallelExtension=gl.getExtension('KHR_parallel_shader_compile');this.recoveryExtension=gl.getExtension('WEBGL_lose_context');this.vertexShader=this.compileShader(gl.VERTEX_SHADER,VERT);this.timerExtension=gl.getExtension('EXT_disjoint_timer_query_webgl2');this.timerQueries=[];this.gpuMilliseconds=null;this.gpuSample=0;this.completedFrames=0;
 this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);this.maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_TEXTURE_SIZE),4096);this.onContextLost=()=>{this.contextWasLost=true;};canvas.addEventListener('webglcontextlost',this.onContextLost);
 }
 hardwareInfo(){if(this.hardwareProfile)return this.hardwareProfile;const g=this.gl,e=g.getExtension('WEBGL_debug_renderer_info');let name='GPU WebGL 2';try{name=g.getParameter(e?e.UNMASKED_RENDERER_WEBGL:g.RENDERER)||name;}catch{}return this.hardwareProfile={name,software:/swiftshader|llvmpipe|softpipe|software rasterizer|software adapter/i.test(name),powerPreference:g.getContextAttributes()?.powerPreference||'default',timingAvailable:!!this.timerExtension};}
 pollGpuTime(){const g=this.gl,e=this.timerExtension;if(!e)return;if(g.getParameter(e.GPU_DISJOINT_EXT)){for(const q of this.timerQueries)g.deleteQuery(q);this.timerQueries=[];this.gpuMilliseconds=null;return;}while(this.timerQueries.length&&g.getQueryParameter(this.timerQueries[0],g.QUERY_RESULT_AVAILABLE)){const q=this.timerQueries.shift(),ns=g.getQueryParameter(q,g.QUERY_RESULT);g.deleteQuery(q);if(Number.isFinite(ns)&&ns>0){this.gpuMilliseconds=ns/1e6;this.gpuSample++;}}}
 beginGpuTimer(){this.pollGpuTime();if(!this.timerExtension||this.timerQueries.length>=3)return null;const q=this.gl.createQuery();if(q)this.gl.beginQuery(this.timerExtension.TIME_ELAPSED_EXT,q);return q;}
 endGpuTimer(q){if(!q)return;this.gl.endQuery(this.timerExtension.TIME_ELAPSED_EXT);this.timerQueries.push(q);}
 assertAvailable(){if(this.disposed||this.gl.isContextLost())throw new Error('La grafica è temporaneamente sospesa. La creazione è conservata.');}
 compileShader(type,source){const g=this.gl,shader=g.createShader(type);g.shaderSource(shader,source);g.compileShader(shader);if(!g.getShaderParameter(shader,g.COMPILE_STATUS)){const message=g.getShaderInfoLog(shader);g.deleteShader(shader);throw new Error(message||'Impossibile preparare questo effetto.');}return shader;}
 variant(key,sourceCode){
  this.assertAvailable();let v=this.programs.get(key);const g=this.gl;
  if(!v){const fragment=g.createShader(g.FRAGMENT_SHADER),program=g.createProgram();g.shaderSource(fragment,sourceCode??variantSource(key,!!g.getExtension('EXT_color_buffer_float')));g.compileShader(fragment);g.attachShader(program,this.vertexShader);g.attachShader(program,fragment);g.linkProgram(program);v={program,fragment,ready:false,used:0};this.programs.set(key,v);}
  v.used=++this.programClock;
  if(this.programs.size>12){const candidates=[...this.programs].filter(([k,x])=>k!==key&&x.program!==this.program).sort((a,b)=>a[1].used-b[1].used);while(this.programs.size>12&&candidates.length){const [k,x]=candidates.shift();if(x.fragment)g.deleteShader(x.fragment);g.deleteProgram(x.program);this.programs.delete(k);}}
  return v;
 }
 finishVariant(v){
  if(v.ready)return;const g=this.gl;
  if(!g.getProgramParameter(v.program,g.LINK_STATUS)){const message=g.getShaderInfoLog(v.fragment)||g.getProgramInfoLog(v.program);throw new Error(message||'Impossibile preparare questo effetto.');}
  g.deleteShader(v.fragment);v.fragment=null;v.locations={};const count=g.getProgramParameter(v.program,g.ACTIVE_UNIFORMS);
  for(let i=0;i<count;i++){const u=g.getActiveUniform(v.program,i);v.locations[u.name.replace('[0]','')]=g.getUniformLocation(v.program,u.name);}v.ready=true;
 }

 hiddenSurface(source,options={}){
  return options.hiddenSurface!==false&&source.renderVersion>=2&&source.filLength>0&&source.filCore===0&&
   !source.motions?.filCore?.enabled&&!source.motions?.filLength?.enabled&&!options.layers&&options.layerOpacity===undefined&&
   !options.focusDepthOnly&&!options.diagnostic&&!options.normalDiagnostic;
 }
 prepareHiddenSurface(source,phase){
  const v=this.variant('hidden-surface',hiddenSurfaceSource()),fieldReady=this.prepareBodyField(source,phase);
  if(!v.ready&&this.parallelExtension&&!this.gl.getProgramParameter(v.program,this.parallelExtension.COMPLETION_STATUS_KHR))return false;
  this.finishVariant(v);return fieldReady;
 }
 drawHiddenSurface(source,phase,width,height,options){
  const g=this.gl,c=this.canvas,s=sampleFrame(source,phase);
  if(options.preview&&!this.prepareHiddenSurface(source,phase))return false;
  const v=this.variant('hidden-surface',hiddenSurfaceSource());this.finishVariant(v);
  if(!options.keepCanvas&&(c.width!==width||c.height!==height)){c.width=width;c.height=height;}
  this.program=v.program;this.locations=v.locations;g.useProgram(v.program);g.viewport(0,0,width,height);
  const timer=options.preview&&options.trackTiming!==false?this.beginGpuTimer():null;
  this.bindFrame(source,s,phase,width,height,options,8,true);
  if(options.scissors){for(const rect of options.scissors){g.scissor(...rect);g.drawArrays(g.TRIANGLES,0,3);}}else g.drawArrays(g.TRIANGLES,0,3);
  this.endGpuTimer(timer);if(!options.deferCompletion){if(this.completionSync)g.deleteSync(this.completionSync);this.completionSync=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.flush();}
  return true;
 }

 prepare(source,phase=0,options={}){
  if(this.hiddenSurface(source,options))return this.prepareHiddenSurface(source,phase);
  if(this.canUseImplicit(source,options))return this.prepareImplicit(source,phase,options);
  const growthReady=prepareGrowth(source);
  const frame=sampleFrame(source,phase),key=renderKey(frame,options,source),programs=[this.variant(key)];
  // Prepare the field kernel only when this frame needs procedural geometry.
  if(key&ATLAS_PREVIEW||options.bodyField&&!analyticShape(frame))programs.push(this.variant(bakeVariant(source)));
  let ready=growthReady;for(const v of programs){if(!v.ready&&this.parallelExtension&&!this.gl.getProgramParameter(v.program,this.parallelExtension.COMPLETION_STATUS_KHR)){ready=false;continue;}this.finishVariant(v);}return ready;
 }
 canUseImplicit(source,options={}){
  if(this.hiddenSurface(source,options))return false;
  const opaque=motionInterval(source,'transparency')[1]===0;
  const opaqueFractal=opaque&&fractalMayChange(source)&&['subsurface','translucency','scattering','edge'].every(k=>motionInterval(source,k)[1]===0);
  return options.exactLayers!==false&&source.renderVersion>=2&&(motionInterval(source,'thinShell')[0]>=.999||opaque)&&
   (opaqueFractal||fanVariant(source)||weaveVariant(source)||growthGeometryEnabled(source)||source.thinShell>=.999||cellSurfaceMode(source)||(opaque&&['subsurface','translucency','scattering','edge'].every(k=>motionInterval(source,k)[1]===0)&&motionInterval(source,'petalAmount')[1]>0&&rootWeight(source)===0&&!ROOT_KEYS.some(k=>source.motions?.[k]?.enabled)))&&(!cellularMayChange(source)||cellSurfaceMode(source))&&(!fractalMayChange(source)||opaqueFractal)&&
   !options.focusDepthOnly&&!options.diagnostic&&!options.normalDiagnostic&&!!this.gl.getExtension('EXT_color_buffer_float');
 }
 prepareImplicit(source,phase,options){
  const key=implicitGeometryKey(source),g=this.gl,independentFan=independentFanMode(source);
  const family=key+':'+(independentFan?(independentFanCompact(source)?'fan-compact':'fan-complete'):'union')+':'+weaveKernel(source)+':'+tissueKernel(source);
  if(this.implicitFamily!==family){
   this.implicitHit?.dispose();this.implicitHit=new ImplicitHitPass(g,implicitGeometrySource(source,{main:independentFan?INDEPENDENT_FAN_HIT_MAIN:fractalMayChange(source)?FRACTAL_HIT_MAIN:IMPLICIT_HIT_MAIN,independentFan}));
   this.implicitKey=key;this.implicitFamily=family;
  }
  const materialKey=this.implicitMaterialKey=implicitMaterialKey(source);
  const variants=[['implicit-accum:',true],['implicit-resolve:',false]].map(([prefix,accumulate])=>this.programs.get(prefix+materialKey)||this.variant(prefix+materialKey,implicitSurfaceSource(source,{accumulate,independentFan})));
  if(independentFan||fractalMayChange(source))this.implicitRayStatus??=new ImplicitRayStatus(g);
  let ready=this.implicitHit.ready()&&prepareGrowth(source)&&(!(independentFan||fractalMayChange(source))||this.implicitRayStatus.prepare());
  if(options.bodyField)ready=this.prepareBodyField(source,phase)&&ready;
  for(const material of variants){if(!material.ready){
   if(this.parallelExtension&&!g.getProgramParameter(material.program,this.parallelExtension.COMPLETION_STATUS_KHR)){ready=false;continue;}
   this.finishVariant(material);}
  }
  return ready;
 }
 implicitTargets(width,height){
  const g=this.gl;
  if(this.implicitBuffers?.width===width&&this.implicitBuffers?.height===height)return this.implicitBuffers.banks;
  this.disposeImplicitTargets();
  const banks=[];
  for(let bank=0;bank<2;bank++){
   const framebuffer=g.createFramebuffer(),textures=[];g.bindFramebuffer(g.DRAW_FRAMEBUFFER,framebuffer);g.activeTexture(g.TEXTURE0);
   for(let index=0;index<2;index++){
    const texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,texture);g.texStorage2D(g.TEXTURE_2D,1,g.RGBA16F,width,height);
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
    g.framebufferTexture2D(g.DRAW_FRAMEBUFFER,g.COLOR_ATTACHMENT0+index,g.TEXTURE_2D,texture,0);textures.push(texture);
   }
   g.drawBuffers([g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);
   if(g.checkFramebufferStatus(g.DRAW_FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw new Error('Impossibile preparare gli strati trasparenti.');
   banks.push({framebuffer,textures});
  }
  this.implicitBuffers={width,height,banks};return banks;
 }
 disposeImplicitTargets(){
  if(!this.implicitBuffers)return;const g=this.gl;
  for(const bank of this.implicitBuffers.banks){for(const texture of bank.textures)g.deleteTexture(texture);g.deleteFramebuffer(bank.framebuffer);}
  this.implicitBuffers=null;
 }
 drawImplicit(source,phase,width,height,options={}){
  const steps=this.drawImplicitSteps(source,phase,width,height,options);let step;
  try{step=steps.next();while(!step.done){const q=step.value,start=performance.now(),pending=this.implicitRayStatus.pendingSync(q.hit,q.through,width,height);this.implicitStatusReadbackMs+=performance.now()-start;step=steps.next(pending);}return step.value;}finally{if(!step?.done)steps.return();}
 }
 async drawImplicitAsync(source,phase,width,height,options={}){
  const steps=this.drawImplicitSteps(source,phase,width,height,options);let step;
  try{step=steps.next();while(!step.done){const q=step.value,check=q.singleEntry||q.batch===255||(q.batch+1)%8===0,pending=check?await this.implicitRayStatus.pendingAsync(q.hit,q.through,q.framebuffer,width,height,options):true;if(pending===null)return false;step=steps.next(pending);}return step.value;}finally{if(!step?.done)steps.return();}
 }
 *drawImplicitSteps(source,phase,width,height,options={}){
  if(!this.prepareImplicit(source,phase,options))return false;
  const s=sampleFrame(source,phase),g=this.gl,key=this.implicitKey;
  if(!options.keepCanvas&&(this.canvas.width!==width||this.canvas.height!==height)){this.canvas.width=width;this.canvas.height=height;}
  const target=options.layers?.framebuffer||g.getParameter(g.DRAW_FRAMEBUFFER_BINDING),blend=g.isEnabled(g.BLEND),scissor=g.isEnabled(g.SCISSOR_TEST),dither=g.isEnabled(g.DITHER);
  const timer=options.preview&&options.trackTiming!==false?this.beginGpuTimer():null;
  const banks=this.implicitTargets(width,height),bind=(material)=>{
   g.useProgram(material.program);this.program=material.program;this.locations=material.locations;
   this.bindFrame(source,s,phase,width,height,options,key|16|2048,false);
   g.uniform1f(this.locations.uStudioOpacity,options.layerOpacity??1);
   g.bindVertexArray(null);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);
  },textures=(bank)=>{
   for(let i=0;i<2;i++){g.activeTexture(g.TEXTURE5+i);g.bindTexture(g.TEXTURE_2D,bank.textures[i]);g.uniform1i(this.locations[i?'uImplicitThrough':'uImplicitColor'],5+i);}
  };
  // Front-to-back transport carries the accumulated radiance and remaining
  // transmission between batches. Geometry never truncates after four sheets.
  const singleEntry=cellSurfaceMode(source)||s.transparency===0;
  const independent=independentFanMode(source),network=weaveKernel(source)==='network';
  const layers=Math.max(4,Math.ceil(((s.structFan||0)>0?2*((s.structPetalCount||12)+2):16)/4));
  // For a reticle the tip transmission can increase only by this fraction.
  // Skip passes whose largest possible contribution has already dropped
  // below the imager's precision. The transparent cups keep all layers.
  const release=s.structWeaveRelease||0;
  const through=s.transparency+(release>.42?s.transparency*(1-s.transparency)*.96:0);
  const networkThrough=through+(release>.48?.28*(s.structWeaveHierarchy||0)*through*(1-through):0);
  const networkBatches=networkThrough>=.99999?layers:Math.max(1,Math.ceil(Math.log(.00025)/Math.log(Math.max(.001,networkThrough))/4));
  const batches=independent?256:singleEntry?1:network?Math.min(layers,networkBatches):layers;
  const continuationStarted=performance.now();this.implicitContinuationStats=[];this.implicitStatusReadbackMs=0;
  const sheetScale=s.scale*Math.min(s.stretchX,s.stretchY,Math.max(.06,s.volume*s.stretchZ));
  const featureSize=(s.structFan||0)>0?sheetScale*s.structThickness*.06:(s.structShell||0)>0?sheetScale*s.structThickness*.15:(s.petalAmount||0)>0?sheetScale*Math.max(.0015,(s.petalWidth??.24)*(.65+(s.petalInflate??.6)*.55)*(1-(s.petalSharp||0)*.58)*(.9*(1-(s.petalSharp||0))+.008*(s.petalSharp||0)))*.5:Infinity;
  let hits=null,last=null;
  try{
   g.disable(g.BLEND);g.disable(g.SCISSOR_TEST);g.disable(g.DITHER);
   for(let batch=0;batch<batches;batch++){
    const previousHit=hits?.textures[3]||null;
    if(fractalMayChange(source)){
     // Preserve every unfinished primary ray across bounded GPU batches.
     // Completed rays are copied, and material shading runs only after all
     // intersections are known. An incomplete frame is never presented.
     this.fractalContinuationStats=[];let previous=null;
     for(let pass=0;pass<256;pass++){
      hits=this.implicitHit.draw(width,height,{startTexture:previous?.textures[0],maxLayers:1,budget:options.fractalHitBudget||4096,safety:.15,epsilon:.000025*s.scale,normalOffset:.00012*s.scale,featureSize,jitter:options.jitter||[0,0],
       upload:(gl,locations,program)=>{this.program=program;this.locations=locations;this.bindFrame(source,s,phase,width,height,options,key,false);gl.activeTexture(gl.TEXTURE14);gl.bindTexture(gl.TEXTURE_2D,previous?.textures[1]||banks[0].textures[1]);gl.uniform1i(locations.uHitStatePrevious,14);}});
      if(!hits)return false;
      const pending=yield{hit:hits.textures[2],through:hits.textures[2],framebuffer:banks[0].framebuffer,batch:pass,singleEntry:false};
      this.fractalContinuationStats.push({pass,pending,elapsed:performance.now()-continuationStarted});
      if(!pending)break;
      if(options.cancelled?.())return false;
      if(pass===255||performance.now()-continuationStarted>90000)throw Error('Il dettaglio del frattale non è ancora completo. La creazione è conservata.');
      previous=hits;
     }
    }else{
     hits=this.implicitHit.draw(width,height,{startTexture:previousHit,maxLayers:singleEntry?1:4,budget:1800,safety:network?.60:.32,epsilon:.000025*s.scale,normalOffset:growthNormalOffset(s),featureSize,jitter:options.jitter||[0,0],
      upload:(gl,locations,program)=>{this.program=program;this.locations=locations;this.bindFrame(source,s,phase,width,height,options,key,false);if(independent){gl.activeTexture(gl.TEXTURE14);gl.bindTexture(gl.TEXTURE_2D,last?.textures[1]||banks[0].textures[1]);gl.uniform1i(locations.uHitThrough,14);}}});
    }
    if(!hits)return false;
    const bank=banks[batch%2],previous=banks[1-batch%2];g.bindFramebuffer(g.DRAW_FRAMEBUFFER,bank.framebuffer);g.viewport(0,0,width,height);
    bind(this.programs.get('implicit-accum:'+this.implicitMaterialKey));textures(previous);g.uniform1f(this.locations.uImplicitContinue,+!!batch);
    if(independentFanMode(source)){g.activeTexture(g.TEXTURE13);g.bindTexture(g.TEXTURE_2D,previousHit||this.implicitHit.emptyTexture);g.uniform1i(this.locations.uImplicitPreviousHit,13);}
    for(let i=0;i<4;i++){g.activeTexture(g.TEXTURE9+i);g.bindTexture(g.TEXTURE_2D,hits.textures[i]);g.uniform1i(this.locations['uImplicitHit'+i],9+i);}
    g.drawArrays(g.TRIANGLES,0,3);last=bank;
    if(independent){const pending=yield{hit:hits.textures[3],through:bank.textures[1],framebuffer:previous.framebuffer,batch,singleEntry};this.implicitContinuationStats.push({batch,pending,elapsed:performance.now()-continuationStarted});if(!pending)break;if(options.cancelled?.())return false;if(batch===batches-1||performance.now()-continuationStarted>90000)throw Error('Il calcolo delle pieghe non è ancora completo. La creazione è conservata.');}
   }
   g.bindFramebuffer(g.DRAW_FRAMEBUFFER,target);g.viewport(0,0,width,height);
   bind(this.programs.get('implicit-resolve:'+this.implicitMaterialKey));textures(last);g.activeTexture(g.TEXTURE0);
   g[blend?'enable':'disable'](g.BLEND);g[scissor?'enable':'disable'](g.SCISSOR_TEST);g[dither?'enable':'disable'](g.DITHER);
   g.drawArrays(g.TRIANGLES,0,3);
   this.exactDepth={texture:last.textures[0],width,height,phase,source};
  }finally{
   g.bindFramebuffer(g.DRAW_FRAMEBUFFER,target);g.activeTexture(g.TEXTURE0);
   g[blend?'enable':'disable'](g.BLEND);g[scissor?'enable':'disable'](g.SCISSOR_TEST);g[dither?'enable':'disable'](g.DITHER);
   this.endGpuTimer(timer);
  }
  if(!options.deferCompletion){if(this.completionSync)g.deleteSync(this.completionSync);this.completionSync=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.flush();}
  return true;
 }
 async prepareAsync(source,phase=0,options={}){
  // Driver compilation is not the video duration or a failed render. Keep a
  // healthy asynchronous compile alive; cancellation and context loss remain
  // observable, while actual GPU submissions retain their watchdog.
  options.onStage?.('preparing');if(!await prepareGrowthAsync(source,options))return false;const started=Date.now();let slow=false;
  while(true){if(options.cancelled?.())return false;this.assertAvailable();if(this.prepare(source,phase,options)){options.onStage?.('rendering');return true;}if(!slow&&Date.now()-started>30000){slow=true;options.onStage?.('preparing-slow');}await new Promise(r=>setTimeout(r,16));}
 }
 useVariant(key){const v=this.variant(key);this.finishVariant(v);this.program=v.program;this.locations=v.locations;this.gl.useProgram(this.program);}
 uploadGrowth(s){
  const key=GROWTH_KEYS.map(k=>s[k]).join('|'),g=this.gl;
  if(key!==this.growthKey){const table=growthTable(s,this.growthStorage);this.growthStorage=table;this.growthRows=table.rowData;this.growthRadius=table.radiusBound;if(!this.growthTexture){this.growthTexture=g.createTexture();g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.growthTexture);g.texStorage2D(g.TEXTURE_2D,1,g.RGBA32F,96,8);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);}g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.growthTexture);g.texSubImage2D(g.TEXTURE_2D,0,0,0,96,8,g.RGBA,g.FLOAT,table.data);this.growthKey=key;this.growthUploads=(this.growthUploads||0)+1;}
  g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.growthTexture);g.uniform1i(this.locations.uGrowth,1);g.uniform2fv(this.locations.uGrowthRows,this.growthRows);g.activeTexture(g.TEXTURE0);
 }
 bindRootOccupancy(s,enabled){
  const g=this.gl,available=enabled&&rootWeight(s)>.999999&&!hasSolidForces(s)&&!hasStructure(s)&&
   !['deform','asymmetry','twist','waves','roundness','taper','bendX','bendY','lobeAmount','pinch','baseForm','cellMorph','fractalAmount','stemAmount','glow','edge'].some(k=>Math.abs(s[k]||0)>1e-6);
  g.activeTexture(g.TEXTURE8);
  if(!this.rootOccupancyTexture){
   this.rootOccupancyTexture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.rootOccupancyTexture);
   g.texStorage2D(g.TEXTURE_2D,1,g.R32UI,24,24);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
  }else g.bindTexture(g.TEXTURE_2D,this.rootOccupancyTexture);
  if(available&&this.rootStorage){
   const key=this.rootKey+'|'+ +(s.petalAmount>=.999999);
   if(this.rootOccupancyKey!==key){
    this.rootOccupancyBits??=new Uint32Array(24*24);
    this.rootOccupancyExtent=rootOccupancy(s,this.rootStorage,this.rootOccupancyBits);
    g.texSubImage2D(g.TEXTURE_2D,0,0,0,24,24,g.RED_INTEGER,g.UNSIGNED_INT,this.rootOccupancyBits);
    this.rootOccupancyKey=key;
   }
  }
  g.uniform1i(this.locations.uRootOccupancy,8);g.uniform1f(this.locations.uRootGrid,available?(this.rootOccupancyExtent||0):0);g.activeTexture(g.TEXTURE0);
 }
 uploadRoots(s){
  const g=this.gl,weight=rootWeight(s),key=GROWTH_KEYS.map(k=>s[k]??0).join('|')+'|'+(s.petalCoverage||0);
  if(!this.rootTexture){this.rootTexture=g.createTexture();g.activeTexture(g.TEXTURE3);g.bindTexture(g.TEXTURE_2D,this.rootTexture);g.texStorage2D(g.TEXTURE_2D,1,g.RGBA32F,ROOT_TEXTURE_WIDTH,ROOT_TEXTURE_HEIGHT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);}
  g.activeTexture(g.TEXTURE3);g.bindTexture(g.TEXTURE_2D,this.rootTexture);
  if(weight>.000001&&key!==this.rootKey){
   this.rootStorage=rootGeometry(s,this.rootStorage);this.rootKey=key;this.rootUploads=(this.rootUploads||0)+1;
   const height=Math.ceil(this.rootStorage.nodeCount*4/ROOT_TEXTURE_WIDTH);g.texSubImage2D(g.TEXTURE_2D,0,0,0,ROOT_TEXTURE_WIDTH,height,g.RGBA,g.FLOAT,this.rootStorage.data.subarray(0,ROOT_TEXTURE_WIDTH*height*4));
  }
  if(weight>.999999&&this.rootStorage)this.growthRadius=this.rootStorage.radiusBound;
  g.uniform1i(this.locations.uRootTree,3);g.uniform4fv(this.locations.uRoots,[this.rootStorage?.nodeCount||0,s.petalGrowth??1,rootBlend(s),weight]);g.activeTexture(g.TEXTURE0);
 }
 ensurePreviewField(frame,options,source=frame,phase=0){
  const g=this.gl,plan=previewPlan(source);
  if(plan.descriptor!==this.fieldPlanKey){this.fieldPlanKey=plan.descriptor;this.motionBounds=plan.dynamic?animatedBounds(source):null;}
  const s={...frame,twist:plan.reuseTwist?0:frame.twist,petalPhase:plan.rotateCrown?0:frame.petalPhase};
  // Cache the two signed boundaries of a plain membrane independently.
  // Interpolating an already-cut narrow negative band can erase the wall.
  // Combined cuts/fibres retain their original field and exact idle refinement.
  this.deferredStructure=(frame.structShell||0)>.000001&&![(frame.hole||0),(frame.cut||0),(frame.structFibres||0),(frame.structSlices||0),(frame.structRadial||0),(frame.structLayers||0),(frame.structFan||0),+(growthGeometryEnabled(source))].some(v=>v>.000001);
  if(this.deferredStructure)s.structShell=0;
  this.fieldWarp=[plan.reuseTwist?frame.twist||0:0,plan.rotateCrown?(frame.petalPhase||0)*Math.PI/180:0];
  if(!this.fieldTexture){
   this.fieldHalfFloat=!!g.getExtension('EXT_color_buffer_float');this.fieldTexture=g.createTexture();g.activeTexture(g.TEXTURE2);g.bindTexture(g.TEXTURE_2D,this.fieldTexture);
   g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
   g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
   // A 1×1 byte placeholder makes some drivers JIT a second optical pipeline
   // when the first real float atlas appears. Start with the real format and
   // sampling layout, even while the analytic sphere does not read its data.
   this.fieldSize=350;g.texImage2D(g.TEXTURE_2D,0,this.fieldHalfFloat?g.RG16F:g.RGBA8,350,350,0,this.fieldHalfFloat?g.RG:g.RGBA,this.fieldHalfFloat?g.HALF_FLOAT:g.UNSIGNED_BYTE,null);
   this.fieldAtlas=[48,7,350,2];this.fieldMin=[-1,-1,-1];this.fieldMax=[1,1,1];g.activeTexture(g.TEXTURE0);
  }
  const warmup=analyticShape({...frame,baseForm:0});this.cachedShapeAnalytic=warmup&&!(s.baseForm>0);this.cachedBasePrimitive=warmup;if(warmup&&this.fieldWarmed)return;
  const intricate=!!(fanVariant(source)||weaveVariant(source));
  const detailResolution=options.preview&&options.quality!=='full'?176:224;
  const key=plan.descriptor+'|'+(frame.structShell||0)+'|'+(s.seed>>>0)+'|'+FIELD_KEYS.concat(GROWTH_KEYS,plan.reactionKeys).map(k=>s[k]??0).join('|')+(plan.reactionKeys.length&&s.growthFlow>0?'|'+phase:''),fine=plan.fine,resolution=warmup?48:options.quality==='fast'?(this.deferredStructure?160:fine||cellularMayChange(source)?plan.fineResolution:48):(this.deferredStructure?224:intricate?detailResolution:fine||cellularMayChange(source)?144:96);
  if(!warmup&&key===this.fieldKey&&this.fieldResolution>=resolution)return;
  const target=g.getParameter(g.DRAW_FRAMEBUFFER_BINDING),viewport=g.getParameter(g.VIEWPORT),scissorBox=g.getParameter(g.SCISSOR_BOX),scissor=g.isEnabled(g.SCISSOR_TEST),blend=g.isEnabled(g.BLEND),dither=g.isEnabled(g.DITHER);
  try{
   this.useVariant(bakeVariant(source));if(growthGeometryEnabled(source))bindGrowth(g,this.program,s,phase);this.uploadGrowth(s);this.uploadRoots(s);
   const bounds=s.cellMorph>0||s.fractalAmount>0?atlasBounds(s,this.growthRadius):this.motionBounds||atlasBounds(s,this.growthRadius),tiles=Math.ceil(Math.sqrt(resolution)),size=tiles*(resolution+2);
   this.fieldAtlas=[resolution,tiles,size,bounds.range];this.fieldMin=bounds.min;this.fieldMax=bounds.max;
   if(this.fieldSize!==size){this.fieldAllocations=(this.fieldAllocations||0)+1;g.activeTexture(g.TEXTURE2);g.bindTexture(g.TEXTURE_2D,this.fieldTexture);g.texImage2D(g.TEXTURE_2D,0,this.fieldHalfFloat?g.RG16F:g.RGBA8,size,size,0,this.fieldHalfFloat?g.RG:g.RGBA,this.fieldHalfFloat?g.HALF_FLOAT:g.UNSIGNED_BYTE,null);this.fieldSize=size;}
   if(!this.fieldFramebuffer)this.fieldFramebuffer=g.createFramebuffer();
   g.bindFramebuffer(g.DRAW_FRAMEBUFFER,this.fieldFramebuffer);g.framebufferTexture2D(g.DRAW_FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.fieldTexture,0);
   if(g.checkFramebufferStatus(g.DRAW_FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw new Error('Impossibile preparare la forma. La creazione è conservata.');
   g.viewport(0,0,size,size);g.disable(g.SCISSOR_TEST);g.disable(g.BLEND);g.disable(g.DITHER);
   // Touch the real bake pipeline during initial preparation, at four pixels
   // only and without changing texture dimensions or its sample format.
   if(warmup){g.enable(g.SCISSOR_TEST);g.scissor(0,0,2,2);}
   const u=(name,v)=>g['uniform'+v.length+'fv'](this.locations[name],v),f=(name,v)=>g.uniform1f(this.locations[name],v);
   uploadCellular(s,g,this.locations,cellularMayChange(source));uploadFractal(s,u);
   f('uBakeShell',frame.structShell||0);baseFormUniforms(s,g,this.locations);structureUniforms(s,u,(name,values)=>g.uniform4fv(this.locations[name],values));u('uRuntime',[0,0,2,0]);u('uWarp',[s.deform,s.asymmetry,s.twist,s.waveScale]);u('uOther',[0,0,s.waves,0]);
   u('uVoid',[s.hole,s.holeX,s.holeY,s.holeShape]);u('uCut',[s.cut,s.cutX,s.cutY,s.edge]);
   u('uExtraShape',[s.roundness||0,s.taper||0,s.bendX||0,s.bendY||0]);u('uExtraShape2',[s.lobeAmount||0,s.lobes||5,s.pinch||0,s.rimRound||0]);u('uExtraShape3',[s.holeAspect||1,s.cutAspect||1,0,0]);
   u('uPetals',[s.petalAmount||0,s.petalCount||12,s.petalOpen??.65,s.petalCurl||0]);u('uPetalTip',[s.petalLength??1.05,s.petalWidth??.24,s.petalInflate??.6,s.petalSharp||0]);u('uPetalSpread',[s.petalCoverage||0,s.petalRows||5,(((s.petalPhase||0)%360+360)%360)*Math.PI/180,0]);
   u('uOrganic',[s.petalBlend||0,s.petalRoot||0,s.petalRandom||0,(s.seed>>>0)&16777215]);u('uStem',[s.stemAmount||0,s.stemRadius??.09,s.stemBend||0,0]);f('uSeed',(s.seed%1000)*.013);
   f('uBakeRadius',plan.cullSafe?atlasBounds(s,this.growthRadius).radius:10000);f('uFieldEncoding',+this.fieldHalfFloat);u('uFieldAtlas',this.fieldAtlas);u('uFieldMin',this.fieldMin);u('uFieldMax',this.fieldMax);
   g.drawArrays(g.TRIANGLES,0,3);this.fieldWarmed=true;
   if(warmup)this.bakeWarmups=(this.bakeWarmups||0)+1;
   else{this.fieldKey=key;this.fieldResolution=resolution;this.bakeUploads=(this.bakeUploads||0)+1;}
  }finally{
   g.bindFramebuffer(g.DRAW_FRAMEBUFFER,target);g.viewport(...viewport);
   g.scissor(...scissorBox);g[scissor?'enable':'disable'](g.SCISSOR_TEST);g[blend?'enable':'disable'](g.BLEND);g[dither?'enable':'disable'](g.DITHER);g.activeTexture(g.TEXTURE0);
  }
 }
 bindPreviewField(){const g=this.gl;g.activeTexture(g.TEXTURE2);g.bindTexture(g.TEXTURE_2D,this.fieldTexture);g.uniform1i(this.locations.uFieldTexture,2);g.uniform1f(this.locations.uBasePrimitive,+this.cachedBasePrimitive);g.uniform1f(this.locations.uDeferredStructure,+this.deferredStructure);g.uniform2fv(this.locations.uFieldWarp,this.fieldWarp||[0,0]);g.uniform3fv(this.locations.uFilmResponse,FILM_SPECTRUM.data);g.uniform3fv(this.locations.uFilmWhite,FILM_SPECTRUM.white);g.uniform1f(this.locations.uFieldEncoding,+this.fieldHalfFloat);g.uniform4fv(this.locations.uFieldAtlas,this.fieldAtlas);g.uniform3fv(this.locations.uFieldMin,this.fieldMin);g.uniform3fv(this.locations.uFieldMax,this.fieldMax);g.activeTexture(g.TEXTURE0);}
 prepareBodyField(source,phase){
  if(analyticShape(sampleFrame(source,phase)))return true;
  const v=this.variant(bakeVariant(source));
  if(!v.ready&&this.parallelExtension&&!this.gl.getProgramParameter(v.program,this.parallelExtension.COMPLETION_STATUS_KHR))return false;
  this.finishVariant(v);return prepareGrowth(source);
 }
 bodyField(source,phase,options){
  const frame=sampleFrame(source,phase),form=frame.baseForm||0;
  const inner=(frame.hollow||0)*(1-(frame.wallThickness??.08));
  if(analyticShape(frame))return {sphere:true,inner,lo:[-1,-1,-1],hi:[1,1,1]};
  this.ensurePreviewField(frame,options,source,phase);
  const primitive=this.cachedBasePrimitive,lo=primitive?[-1.05,-1.05,-1.05]:this.fieldMin,hi=primitive?[1.05,1.05,1.05]:this.fieldMax;
  return {lo,hi,form,primitive,inner,texture:this.fieldTexture,atlas:this.fieldAtlas,warp:this.fieldWarp,float:this.fieldHalfFloat,
   deferred:this.deferredStructure,key:primitive?'primitive:'+form:[this.fieldKey,...this.fieldWarp,this.fieldResolution].join('|')};
 }
 pollCompletion(){const g=this.gl;if(this.completionSync&&!g.isContextLost()){if(g.getSyncParameter(this.completionSync,g.SYNC_STATUS)===g.SIGNALED){g.deleteSync(this.completionSync);this.completionSync=null;this.completedFrames++;return true;}}return false;}
 async waitForGpu(options={}){const start=Date.now();let polls=0;while(this.completionSync){this.assertAvailable();if(this.pollCompletion())break;if(options.cancelled?.())return false;if(Date.now()-start>120000)throw new Error('Il calcolo richiede troppo tempo. La creazione è conservata.');if(polls++<12&&globalThis.scheduler?.yield)await globalThis.scheduler.yield();else await new Promise(r=>setTimeout(r,4));}return !options.cancelled?.();}
 draw(source,phase=0,width=this.canvas.width,height=this.canvas.height,options={}){this.assertAvailable();if(this.hiddenSurface(source,options))return this.drawHiddenSurface(source,phase,width,height,options);if(this.canUseImplicit(source,options))return this.drawImplicit(source,phase,width,height,options);const s=sampleFrame(source,phase),key=renderKey(s,options,source),c=this.canvas,g=this.gl;if(options.preview&&!this.prepare(source,phase,options))return false;if(!options.keepCanvas&&(c.width!==width||c.height!==height)){c.width=width;c.height=height}if(options.layers?.framebuffer)g.bindFramebuffer(g.FRAMEBUFFER,options.layers.framebuffer);g.viewport(0,0,width,height);let analytic=!!(key&32)||analyticShape(s);const timer=options.preview&&options.trackTiming!==false?this.beginGpuTimer():null;if(key&ATLAS_PREVIEW){this.ensurePreviewField(s,options,source,phase);analytic=this.cachedShapeAnalytic;}this.useVariant(key);this.bindFrame(source,s,phase,width,height,options,key,analytic);
 if(options.scissors){for(const rect of options.scissors){g.scissor(...rect);g.drawArrays(g.TRIANGLES,0,3);}}else g.drawArrays(g.TRIANGLES,0,3);
 this.endGpuTimer(timer);if(!options.deferCompletion){if(this.completionSync)g.deleteSync(this.completionSync);this.completionSync=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.flush();}return true;}
 bindFrame(source,s,phase,width,height,options,key,analytic=false){const g=this.gl;bindGrowth(g,this.program,s,phase);if(key&ATLAS_PREVIEW)this.bindPreviewField();if(s.renderVersion>=2&&hasSolidForces(s)){uploadSolidForces(this,s);if(hasSolidForces(s))analytic=false;}if(key&512)this.uploadGrowth(s);if(key&32768){this.uploadRoots(s);this.bindRootOccupancy(s,!options.preview&&options.conservativeAtlas!==false);}const u=(name,v)=>g['uniform'+v.length+'fv'](this.locations[name],v),f=(name,v)=>g.uniform1f(this.locations[name],v),rad=Math.PI/180;
 if(s.renderVersion>=2){uploadCellular(s,g,this.locations,!!(key&CELLULAR_ENABLED));uploadFractal(s,u);u('uBudget',key&ATLAS_PREVIEW?(options.quality==='fast'?[hasSolidForces(s)?384:structureMayChange(source)?512:this.fieldResolution>=96?128:96,3,4,1]:[hasSolidForces(s)?512:structureMayChange(source)?768:128,4,8,2]):key&4096?(options.quality==='fast'?[88,6,4,1]:[128,8,8,2]):[224,32,16,4]);f('uGeometryRadius',geometryRadius(s,this.growthRadius));}
 if(this.locations.uWeaveFocus)u('uWeaveFocus',[s.focusBlur||0,s.focusDepth||0]);
 if(s.renderVersion>=2){baseFormUniforms(s,g,this.locations);structureUniforms(s,u,(name,values)=>g.uniform4fv(this.locations[name],values));u('uFilmPattern',[s.filmPattern||0,s.filmPatternScale??1.5,s.filmPatternWarp??.8,s.filmPatternDetail??.5]);u('uFilmAccent',[s.filmChroma||0,s.filmDuo||0,s.filmIslands||0]);u('uMaterialDetail',[s.textureDepth??.35,s.textureScale??1,s.textureOrganic??.65,(s.textureAngle||0)*rad]);u('uMaterialLayers',[s.textureWrinkles||0,s.textureFolds||0,s.textureWear||0,s.textureRipples||0]);u('uOrganicDetail',[s.textureRandomness||0,s.textureWarp||0,s.textureLink||0,s.texturePatch||0]);f('uTextureSeed',s.textureSeed||0);u('uColorLayers',[s.colorLayers||0,s.colorLayerScale??1,s.colorLayerShift||0,s.colorLayerMix??.5]);u('uEnvironment',[{studio:0,sunset:1,neon:2,sky:3,aquarium:4,aurora:5,city:6}[s.environment]??0,(s.environmentAngle||0)*rad,s.environmentPower??1,s.environmentRefraction??.12]);f('uNormalSamples',6);g.uniform3fv(this.locations.uFilmResponse,FILM_SPECTRUM.data);g.uniform3fv(this.locations.uFilmWhite,FILM_SPECTRUM.white);u('uFilmMotion',[phase*motionCycles(s.filmCycles,s),s.filmFlow||0,s.filmSwirl||0,24]);u('uModern',[s.thinShell||0,s.grounding||0,s.groundShadow??1,s.groundCaustic??1]);u('uSampling',[...(options.jitter||[0,0]),+!!options.accumulate,options.weight??1]);u('uInternalColor',rgb(s.internalColor||'#e6f5ff'));u('uPetals',[s.petalAmount||0,s.petalCount||12,s.petalOpen??.65,s.petalCurl||0]);u('uPetalTip',[s.petalLength??1.05,s.petalWidth??.24,s.petalInflate??.6,s.petalSharp||0]);u('uPetalSpread',[s.petalCoverage||0,s.petalRows||5,(((s.petalPhase||0)%360+360)%360)*rad,0]);u('uOrganic',[s.petalBlend||0,s.petalRoot||0,s.petalRandom||0,(s.seed>>>0)&16777215]);u('uStem',[s.stemAmount||0,s.stemRadius??.09,s.stemBend||0,0]);u('uColorWave',[s.colorWaveAmount||0,s.colorWaveBands??1,s.colorWaveWarp??.2,((s.colorWavePhase||0)%1+1)%1]);u('uColorAxis',[s.colorWaveHeight??1,s.colorWaveRadius||0,s.colorWaveSwirl||0,0]);}

 if(key&STUDIO_LAYERS)f('uStudioOpacity',options.layerOpacity??1); f('uFilCore',(s.filLength||0)>0?(s.filCore??1):1);u('uResolution',[width,height]);u('uShape',[s.volume,s.stretchX,s.stretchY,s.stretchZ]);u('uWarp',[s.deform,s.asymmetry,s.twist,s.waveScale]);u('uVoid',[s.hole,s.holeX,s.holeY,s.holeShape]);u('uCut',[s.cut,s.cutX,s.cutY,s.edge]);u('uMat',[s.transparency,s.refraction,s.metal,s.renderVersion>=2?Math.min(1,s.roughness+(1-s.gloss)*.35):s.roughness]);u('uSurface',[s.iridescence,s.thickness,s.gloss,s.emission]);u('uGradient',[s.gradientAngle*rad,s.gradientScale,s.gradientOffset,s.colorSoftness]);u('uFrame',[s.scale,s.positionX,s.positionY,s.grain]);u('uOther',[s.rotateY*rad,s.rotateX*rad,s.waves,s.glow]);u('uExtraShape',[s.roundness||0,s.taper||0,s.bendX||0,s.bendY||0]);u('uExtraShape2',[s.lobeAmount||0,s.lobes||5,s.pinch||0,s.rimRound||0]);u('uExtraShape3',[s.holeAspect||1,s.cutAspect||1,(s.rotateZ||0)*rad,0]);u('uCoat',[s.coat||0,s.coatRoughness||.1,s.fresnel??1,s.iridShift||0]);u('uOptics',[s.iridScale||1,s.dispersion||0,s.absorption||0,s.tintStrength??.15]);u('uTexture',[s.anisotropy||0,(s.anisotropyAngle||0)*rad,s.surfaceTexture||0,0]);

 u('uRuntime',[+(!!options.preview&&!options.alphaPreview),.85/(1.+(s.dynAmount||0)*2.+solidForceSlope(s)+(s.loopAmount||0)*(2+Math.abs(s.loopTwist||0)*2)+(s.structScallop||0)*(s.structPetalCount||8)*.9+Math.abs(s.structSpiral||0)*3+(s.structStagger||0)*(s.structPetalCount||8)*.5+(s.structRuffle||0)*(s.structPetalCount||8)*3+(s.structCurl?Math.abs(s.structCurl):0)+(s.structFold||0)*(s.structFoldCount||1)*.8+Math.abs(s.structFlap||0)*2.+(s.structWeave||0)*(s.structDensity||20)*2.+(s.deform||0)*2.+Math.abs(s.asymmetry||0)*.6+Math.abs(s.twist||0)*.3+(s.waves||0)*(s.waveScale||1)*.15+(s.lobeAmount||0)*(s.lobes||0)*.4),options.normalDiagnostic?2:+!!options.diagnostic,16]);u('uTransport',[s.subsurface||0,s.sssRadius??.35,0,0]);u('uSssColor',rgb(s.sssColor||'#ffc49b'));
 u('uInterior',[s.hollow||0,s.wallThickness??.08,s.translucency||0,s.scattering||0]);u('uScatter',[s.scatterDirection??.25,+analytic,s.thinFilm||0,s.filmThickness??420]);
 u('uPhoto1',[s.exposure||0,s.brightness||0,s.contrast??1,s.saturation??1]);u('uPhoto2',[s.temperature||0,s.photoTint||0,s.vignette||0,s.lensDistortion||0]);u('uPhoto3',[s.blacks||0,s.highlights||0,s.grainSize||1,0]);u('uPhoto4',[s.gamma||1,+!!s.photoAll,0,0]);
 const palette=s.palette.slice(0,12);const average=palette.map(rgb).reduce((sum,c)=>sum.map((v,i)=>v+c[i]/Math.max(1,palette.length)),[0,0,0]);u('uPaletteMean',average);while(palette.length<12)palette.push(palette[palette.length-1]||'#ffffff');g.uniform3fv(this.locations.uPalette,palette.flatMap(rgb));g.uniform1i(this.locations.uPaletteCount,Math.max(1,Math.min(12,s.palette.length)));
 const active=s.lights.filter(l=>l.enabled).slice(0,8),pos=[],colors=[],props=[],extra=[];const types={circle:0,bar:1,spot:2,diffuser:3,grid:4,ring:5,orb:6};for(let i=0;i<8;i++){const l=active[i];pos.push(...(l?[l.x,l.y,l.z,l.power]:[0,0,0,0]));colors.push(...rgb(l?.color||'#000000'));props.push(...(l?[l.size,l.length,l.roll*rad,types[l.type]??0]:[1,1,0,0]));extra.push(...(l?[l.softness,Math.tan(l.cone*rad),l.grid,+!!l.visible]:[.3,1,4,0]))}g.uniform4fv(this.locations.uLights,pos);g.uniform3fv(this.locations.uLightColors,colors);g.uniform4fv(this.locations.uLightProps,props);g.uniform4fv(this.locations.uLightExtra,extra);g.uniform1i(this.locations.uLightCount,active.length);
 u('uBg',rgb(s.background));u('uBg2',rgb(s.background2));u('uBackdrop',[s.bgHeight??-.65,s.bgSoftness??1.1,s.bgWash??.12,s.bgShade??.06]);f('uBgMode',{solid:0,gradient:1,transparent:2,studio:3}[s.bgMode]??0);f('uBgAngle',s.bgAngle*rad);f('uSeed',(s.seed%1000)*.013);
 }

 pixels(){const {gl,canvas}=this,raw=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);const flipped=new Uint8Array(raw.length),row=canvas.width*4;for(let y=0;y<canvas.height;y++)flipped.set(raw.subarray(y*row,(y+1)*row),(canvas.height-y-1)*row);return flipped}
async drawTiled(source,phase,width,height,options={}){
  if(this.hiddenSurface(source,options)){if(!this.drawHiddenSurface(source,phase,width,height,options))return false;return await this.waitForGpu(options);}
  if(this.canUseImplicit(source,options)){if(!await this.drawImplicitAsync(source,phase,width,height,options))return false;return await this.waitForGpu(options);}
  const g=this.gl,key=renderKey(sampleFrame(source,phase),options,source);
  const roots=!!(key&32768),volume=(source.scattering||0)+(source.translucency||0)+(source.subsurface||0)>.0001;
  const software=this.hardwareInfo().software;
  const recommended=roots?(software?64:256):(key&2048)&&!(key&16)&&!(key&32)?(volume||key&64?128:512):512;
  const maximum=Math.max(32,Math.min(512,options.tileSize||recommended));
  let tile=roots?Math.min(64,maximum):maximum;
  const area=width*height,stats=(this.tileCosts??=new Map()),observed=stats.get(key),adaptive=options.adaptiveTiles!==false;
  const manageable=!(key&(32768|33554432|65536))&&(!(key&2048)||!!(key&16)||!!(key&32)&&!volume);
  const whole=!software&&!options.forceTiled&&adaptive&&(observed?observed*area<64:manageable&&area<=4200000);
  const submit=async scissors=>{
   const at=performance.now();
   if(!this.draw(source,phase,width,height,scissors?{...options,scissors}:options))return false;
   return await this.waitForGpu(options)?performance.now()-at:false;
  };
  if(options.preview&&!options.forceTiled||whole||Math.max(width,height)<=tile){
   const elapsed=await submit();if(elapsed!==false){if(!options.preview&&adaptive)stats.set(key,elapsed/area);options.tileProgress?.(1);}
   return elapsed!==false;
  }
  let completed=0,cost=0,x=0,y=0,rowHeight=Math.min(tile,height),pixelCost=observed||0;
  g.enable(g.SCISSOR_TEST);
  try{
   while(y<height){
    if(options.cancelled?.())return false;
    // One set of uniforms and one fence for a bounded batch of scissor
    // rectangles. The pixels are visited once even if the budget changes.
    const budget=adaptive&&!software?Math.min(655360,Math.max(tile*tile,pixelCost?Math.floor(25/pixelCost):Math.min(65536,tile*tile*4))):tile*tile;
    const scissors=[];let submitted=0;
    while(y<height&&(submitted<budget||!scissors.length)&&scissors.length<32){
     const w=Math.min(tile,width-x);
     scissors.push([x,y,w,rowHeight]);submitted+=w*rowHeight;x+=w;
     if(x===width){x=0;y+=rowHeight;rowHeight=Math.min(tile,height-y);}
    }
    const elapsed=await submit(scissors);if(elapsed===false)return false;
    cost+=elapsed;completed+=submitted;pixelCost=pixelCost?pixelCost*.6+elapsed/submitted*.4:elapsed/submitted;
    options.tileProgress?.(completed/area);
    if(adaptive&&pixelCost*tile*tile>45&&tile>32)tile=Math.max(32,Math.floor(tile/2));
    else if(adaptive&&pixelCost*tile*tile<8&&tile<maximum)tile=Math.min(maximum,tile*2);
    if(x===0)rowHeight=Math.min(tile,height-y);
   }
   if(adaptive&&!options.preview)stats.set(key,cost/area);
   return true;
  }finally{g.disable(g.SCISSOR_TEST);}
 }
 async drawAccumulated(source,phase,width,height,options={}){
  const samples=Math.max(1,Math.min(64,options.samples||16)),g=this.gl;
  if(!await this.prepareAsync(source,phase,options))return false;
  if((source.renderVersion||1)<2||samples===1)return this.drawTiled(source,phase,width,height,{...options,tileProgress:options.progress});
  const ext=g.getExtension('EXT_color_buffer_float');
  if(!ext)return this.drawTiled(source,phase,width,height,{...options,tileProgress:options.progress});
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  if(this.accumulation?.width!==width||this.accumulation?.height!==height){
   if(this.accumulation){g.deleteTexture(this.accumulation.texture);g.deleteFramebuffer(this.accumulation.framebuffer);}
   const texture=g.createTexture(),framebuffer=g.createFramebuffer();
   this.accumulation={texture,framebuffer,width,height};
   g.bindTexture(g.TEXTURE_2D,texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
   g.texImage2D(g.TEXTURE_2D,0,g.RGBA16F,width,height,0,g.RGBA,g.HALF_FLOAT,null);
   g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);
  }else g.bindFramebuffer(g.FRAMEBUFFER,this.accumulation.framebuffer);
  const {texture}=this.accumulation;
  try{
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE){g.bindFramebuffer(g.FRAMEBUFFER,null);g.disable(g.BLEND);return await this.drawTiled(source,phase,width,height,{...options,tileProgress:options.progress});}
   g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE);
   const stable={...source,grain:0},key=renderKey(sampleFrame(stable,phase),options,source);
   // Submit inexpensive samples together. Long optical and root passes retain
   // the tiled path so a cancelled export can give up before another tile.
   const batch=!this.canUseImplicit(source,options)&&!options.forceTiled&&(!this.hardwareInfo().software)&&(key&32)&&!(key&2048)&&samples<=4&&width*height<=2400000;
   for(let n=0;n<samples;n++){
    if(options.cancelled?.())return false;
    const settings={exactLayers:options.exactLayers,jitter:jitterSample(n),accumulate:true,weight:1/samples,preview:options.preview,alphaPreview:options.alphaPreview,quality:options.quality,cancelled:options.cancelled,tileSize:options.tileSize,forceTiled:options.forceTiled,trackTiming:options.trackTiming,adaptiveTiles:options.adaptiveTiles,conservativeAtlas:options.conservativeAtlas,compactStructure:options.compactStructure,layerOpacity:options.layerOpacity,tileProgress:f=>options.progress?.((n+f)/samples)};
    const ok=batch?this.draw(stable,phase,width,height,{...settings,deferCompletion:true}):await this.drawTiled(stable,phase,width,height,settings);
    if(!ok)return false;
    options.progress?.((n+1)/samples);
   }
   g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,null);
   if(!this.resolveProgram){const f=this.compileShader(g.FRAGMENT_SHADER,RESOLVE),program=g.createProgram();g.attachShader(program,this.vertexShader);g.attachShader(program,f);g.linkProgram(program);g.deleteShader(f);if(!g.getProgramParameter(program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(program));this.resolveProgram=program;}
   g.useProgram(this.resolveProgram);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,texture);g.uniform1i(g.getUniformLocation(this.resolveProgram,'uImage'),0);g.uniform4fv(g.getUniformLocation(this.resolveProgram,'uGrain'),[source.grain||0,source.grainSize||1,(source.seed%1000)*.013,+!(source.bgMode==='transparent'&&(!options.preview||options.alphaPreview))]);g.uniform1f(g.getUniformLocation(this.resolveProgram,'uAll'),+!!source.photoAll);g.drawArrays(g.TRIANGLES,0,3);
   if(this.completionSync)g.deleteSync(this.completionSync);this.completionSync=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.flush();return await this.waitForGpu(options);
  }finally{if(!this.disposed&&!this.contextWasLost&&!g.isContextLost()){g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,null);}}
 }
 // Keep compiled programs for the next download while releasing its large
 // drawing surface. Call only after rendering and canvas-to-Blob have finished.
 releaseSurface(){
  if(this.disposed||this.gl.isContextLost())return false;
  if(this.completionSync&&!this.pollCompletion())return false;
  const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,null);g.disable(g.BLEND);g.disable(g.SCISSOR_TEST);
  if(this.accumulation){g.deleteTexture(this.accumulation.texture);g.deleteFramebuffer(this.accumulation.framebuffer);this.accumulation=null;}
  this.disposeImplicitTargets();this.implicitHit?.releaseTargets?.();this.implicitRayStatus?.releaseTargets();this.exactDepth=null;
  this.canvas.width=1;this.canvas.height=1;g.viewport(0,0,1,1);return true;
 }
 dispose({loseContext=true}={}){if(this.disposed)return;this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.onContextLost);const g=this.gl;if(this.contextWasLost||g.isContextLost()){this.timerQueries=[];this.programs.clear();return;}this.implicitHit?.dispose();this.implicitRayStatus?.dispose();this.disposeImplicitTargets();disposeGrowth(g);for(const q of this.timerQueries)g.deleteQuery(q);this.timerQueries=[];if(this.completionSync)g.deleteSync(this.completionSync);if(this.sculptTexture)g.deleteTexture(this.sculptTexture);if(this.growthTexture)g.deleteTexture(this.growthTexture);if(this.rootTexture)g.deleteTexture(this.rootTexture);if(this.rootOccupancyTexture)g.deleteTexture(this.rootOccupancyTexture);if(this.fieldTexture)g.deleteTexture(this.fieldTexture);if(this.fieldFramebuffer)g.deleteFramebuffer(this.fieldFramebuffer);if(this.accumulation){g.deleteTexture(this.accumulation.texture);g.deleteFramebuffer(this.accumulation.framebuffer);}if(this.resolveProgram)g.deleteProgram(this.resolveProgram);g.deleteBuffer(this.buffer);for(const {program,fragment} of this.programs.values()){if(fragment)g.deleteShader(fragment);g.deleteProgram(program);}this.programs.clear();g.deleteShader(this.vertexShader);if(loseContext)this.recoveryExtension?.loseContext();}
}
// Included verbatim in exported HTML: no imports, network or application state.
export function startWallpaper(canvas,source,RendererClass=Renderer){
 let renderer=new RendererClass(canvas),stopped=false,paused=false,recoveries=0,raf=0,first=true,limit=320,fast=0,last=0,lastGpu=0,lastTick=0,phase=0;
 const status=document.createElement('div');status.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;text-align:center;font:14px system-ui;color:white;pointer-events:none';status.textContent='Preparo il wallpaper…';canvas.after(status);
 function failure(error){paused=true;status.hidden=false;status.textContent=error?.message||'La grafica è temporaneamente sospesa.';}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failure();});
 canvas.addEventListener('webglcontextrestored',()=>{if(recoveries++>0)return;renderer.dispose({loseContext:false});renderer=new RendererClass(canvas);paused=false;first=true;limit=192;lastGpu=0;});
 function frame(t){
  if(stopped)return;raf=requestAnimationFrame(frame);if(document.hidden||paused){lastTick=0;return;}
  try{renderer.pollGpuTime();if(renderer.gpuSample!==lastGpu){lastGpu=renderer.gpuSample;const ms=renderer.gpuMilliseconds;if(ms>25){limit=Math.max(160,limit*Math.max(.4,Math.min(.9,Math.sqrt(20/ms))));fast=0;}else if(ms<12&&++fast>20){limit=Math.min(900,limit*1.08);fast=0;}}
   if(renderer.pollCompletion()){status.hidden=true;if(first){first=false;last=0;}}
   if(!lastTick)lastTick=t;const dt=Math.max(0,(t-lastTick)/1000);lastTick=t;if(!first){phase+=(source.dynAmount>0?Math.min(dt,.1):dt)*(source.speed||1)/(source.duration||12)*TAU;if(!(source.dynAmount>0))phase%=TAU;}
   if(renderer.completionSync||t-last<16)return;
   const options={preview:true,quality:'fast',liveDynamics:true};
   if(!renderer.prepare(source,phase,options))return;
   const max=first?Math.min(192,limit):limit,scale=Math.min(1.25,devicePixelRatio||1,max/Math.max(1,innerWidth,innerHeight));
   renderer.draw(source,phase,Math.max(1,Math.round(innerWidth*scale)),Math.max(1,Math.round(innerHeight*scale)),options);last=t;
  }catch(error){failure(error);}
 }
 raf=requestAnimationFrame(frame);
 return {stop(){stopped=true;cancelAnimationFrame(raf);renderer.dispose();status.remove();},getStats(){return {paused,limit,width:canvas.width,height:canvas.height,gpuMilliseconds:renderer.gpuMilliseconds,growthUploads:renderer.growthUploads||0,bakeUploads:renderer.bakeUploads||0,bakeWarmups:renderer.bakeWarmups||0,fieldResolution:renderer.fieldResolution||0,fieldAllocations:renderer.fieldAllocations||0,completedFrames:renderer.completedFrames,phase};}};
}

// The strand pass uses the same final material functions as the surface shader.
// Extract complete functions after the modern shader substitutions, so palette,
// spectral substrate and environment fixes cannot silently diverge between passes.
export const FORM_MATERIAL_GLSL=['palette','colorCoordinate','layeredPigment','surfacePaletteMapped','surfacePalette','fixture','envLight','environment','fresnel','xyzRGB','soapFilm','absorptionCoefficient','organicHash','organicNoise','materialRelief','reliefNormal'].map(name=>{
 const start=MODERN_FRAG.search(new RegExp('(?:vec[234]|float|bool|void)\\s+'+name+'\\s*\\('));
 if(start<0)throw Error('Missing shared surface function: '+name);
 let end=MODERN_FRAG.indexOf('{',start)+1,depth=1;
 while(depth&&end<MODERN_FRAG.length){depth+=(MODERN_FRAG[end]==='{')-(MODERN_FRAG[end]==='}');end++;}
 if(depth)throw Error('Incomplete shared surface function: '+name);
 return MODERN_FRAG.slice(start,end);
}).join('\n');
