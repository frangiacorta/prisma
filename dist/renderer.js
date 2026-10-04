// This module is intentionally self-contained: exported HTML wallpapers run offline.
const TAU=Math.PI*2;
function motionWave(t,phase){const a=phase*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)*Math.PI/180;const x=Math.sin(a);return t.curve==='triangle'?2/Math.PI*Math.asin(x):t.curve==='soft'?x*Math.abs(x):x}
export function sampleFrame(source,phase=0){
 const s={...source,lights:(source.lights||[]).map(l=>({...l}))};
 const limits={volume:[.08,1.5],deform:[0,.75],twist:[-2.5,2.5],waves:[0,.4],hole:[0,.95],cut:[0,1.6],scale:[.35,1.7],positionX:[-1.5,1.5],positionY:[-1.5,1.5],iridescence:[0,1],roughness:[0,1],transparency:[0,1],petalOpen:[0,1],petalCurl:[-1,1],petalInflate:[0,1],petalSharp:[0,1],stemBend:[-1,1]};
 for(const [key,t] of Object.entries(source.motions||{})){
  if(!t.enabled)continue;const continuous=t.mode==='cycle'&&(key.startsWith('rotate')||key==='gradientOffset'||key==='colorWavePhase'||key==='petalPhase');
  const value=continuous?(phase/TAU*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)/360)*(key.startsWith('rotate')||key==='petalPhase'?360:1):motionWave(t,phase)*(t.amplitude||0)*(source.motion??.3)/.3;
  s[key]=(source[key]||0)+value;if(limits[key])s[key]=Math.max(limits[key][0],Math.min(limits[key][1],s[key]));
 }
 if(!source.motions){if(source.animateRotation)s.rotateY+=phase*180/Math.PI;if(source.animateShape){s.volume*=1+Math.sin(phase)*source.motion*.4;s.deform+=Math.sin(phase)*source.motion*.16}if(source.animateColor)s.gradientOffset+=phase/TAU;}
 for(const l of s.lights){if(l.orbit?.enabled){const t=l.orbit,a=t.mode==='cycle'?phase*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)*Math.PI/180:motionWave(t,phase)*t.amplitude*Math.PI/180*(source.motion??.3)/.3;const cs=Math.cos(a),sn=Math.sin(a);if(t.axis==='x'){[l.y,l.z]=[l.y*cs-l.z*sn,l.y*sn+l.z*cs]}else if(t.axis==='z'){[l.x,l.y]=[l.x*cs-l.y*sn,l.x*sn+l.y*cs]}else{[l.x,l.z]=[l.x*cs-l.z*sn,l.x*sn+l.z*cs]}}if(l.pulse?.enabled)l.power=Math.max(0,l.power*(1+motionWave(l.pulse,phase)*l.pulse.amplitude*(source.motion??.3)/.3))}
 if(source.environmentRotate)s.environmentAngle=(source.environmentAngle||0)+phase*180/Math.PI*Math.round(source.environmentCycles||1);
 return s;
}
const VERT=`#version 300 es
layout(location=0) in vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const FRAG=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uResolution;
uniform vec4 uShape,uWarp,uVoid,uCut,uMat,uSurface,uGradient,uFrame,uOther;
uniform vec4 uExtraShape,uExtraShape2,uExtraShape3,uCoat,uOptics,uTexture,uPhoto1,uPhoto2,uPhoto3,uPhoto4;
uniform vec4 uInterior,uScatter,uRuntime,uTransport;
uniform vec3 uSssColor;
uniform vec3 uPalette[12],uBg,uBg2;
uniform vec4 uBackdrop;
uniform vec4 uLights[8],uLightProps[8],uLightExtra[8];
uniform vec3 uLightColors[8];
uniform int uPaletteCount,uLightCount;
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
 vec2 interval=objectInterval(origin,direction);float t=max(0.,interval.x),end=min(maximum,interval.y),previousT=t,previousD=traceField(origin+direction*t,outerOnly);
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
vec3 palette(float t){float v=fract(t)*float(uPaletteCount);int i=int(floor(v)),j=(i+1)%uPaletteCount;float f=smoothstep(.5-max(.012,uGradient.w)*.5,.5+max(.012,uGradient.w)*.5,fract(v));return mix(uPalette[i],uPalette[j],f);}
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
 vec3 glow=palette(atan(uv.y,uv.x)/(2.*PI)+.5)*halo,linear=mix(back.rgb,surface.rgb,coverage)+glow;float alpha=clamp(mix(back.a,surface.a,coverage)+halo,0.,1.);float grain=(hash(floor(gl_FragCoord.xy/max(.5,uPhoto3.z))+uSeed)-.5)*uFrame.w;
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
let MODERN_FRAG=FRAG.replace('precision highp float;','precision highp float;\nprecision highp int;').replace('uniform vec2 uResolution;','uniform vec2 uResolution;\nuniform vec4 uEnvironment,uFilmMotion,uSampling,uModern,uPetals,uPetalTip,uPetalSpread,uStem,uColorWave,uColorAxis,uOrganic;\nuniform vec3 uInternalColor;');
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
float curvedPetal(vec3 p,vec3 a,vec3 b,vec3 c){
 float width=uPetalTip.y*(.65+uPetalTip.z*.55),sharp=uPetalTip.w;
 float middle=width*mix(1.,.42,sharp),root=max(.025,width*.5),tip=max(.0015,middle*mix(.9,.008,sharp));
 vec3 p1=petalCurve(a,b,c,1./3.),p2=petalCurve(a,b,c,2./3.);
 float d=roundCone(p,a,p1,root,middle);
 d=-smax(-d,-roundCone(p,p1,p2,middle,middle*mix(.9,.45,sharp)),.025*(1.-sharp));
 return -smax(-d,-roundCone(p,p2,c,middle*mix(.9,.45,sharp),tip),.025*(1.-sharp));
}
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
// A buried, flared root joins the body with its own fillet. Tip sharpness
// never changes this blend. Search neighboring growth cells to avoid seams.
float growthRandom(float row,float column,uint lane){
 uint h=uint(row)*1664525u+uint(column)*1013904223u+uint(uOrganic.w)+lane*747796405u;
 h=(h^(h>>16u))*2246822519u;h=(h^(h>>13u))*3266489917u;h=h^(h>>16u);
 return float(h&65535u)/65535.*2.-1.;
}
float organicHedgeField(vec3 p){
 float radius=length(p),core=.62+uPetals.z*.14,body=radius-core;
 if(radius<core*.4)return body;
 float rows=max(2.,floor(uPetalSpread.y+.5)),step=PI/rows;
 float phi=acos(clamp(p.y/max(.00001,radius),-1.,1.)),theta=atan(p.z,p.x)-uPetalSpread.z,nearest=floor(phi/step);
 float width=uPetalTip.y*(.65+uPetalTip.z*.55),rootRadius=min(.42,max(.025,width*.5+uOrganic.y*.28+uOrganic.x*.04));
 float minLength=uPetalTip.x*(1.-uOrganic.z*.32);
 float rootBlend=min(.035*(1.-uPetalTip.w)+uOrganic.x*(.12+uOrganic.y*.32),max(.008,(minLength-core*.08)*.6)),spines=100.;
 float amount=min(1.,(uOrganic.x+uOrganic.y+uOrganic.z)*20.);
 for(int j=-1;j<=1;j++){
  float row=nearest+float(j);if(row<0.||row>=rows)continue;
  float latitude=(row+.5)*step,count=max(3.,floor(uPetals.y*sin(latitude)+.5)),sector=2.*PI/count;
  float stagger=mod(row,2.)*.5*amount,cell=floor(theta/sector-stagger+.5);
  for(int k=-1;k<=1;k++){
   float column=mod(cell+float(k)+count,count),longitude=(column+stagger)*sector+uPetalSpread.z;
   float lengthOfSpine=uPetalTip.x*(1.+growthRandom(row,column,0u)*uOrganic.z*.32);
   float thickness=rootRadius*(1.+growthRandom(row,column,1u)*uOrganic.z*.18);
   vec3 axis=vec3(sin(latitude)*cos(longitude),cos(latitude),sin(latitude)*sin(longitude));
   vec3 tangent=vec3(cos(latitude)*cos(longitude),-sin(latitude),cos(latitude)*sin(longitude));
   vec3 across=vec3(-sin(longitude),0,cos(longitude));
   float height=clamp((dot(p,axis)-core)/max(.1,lengthOfSpine),0.,1.);
   vec3 bend=tangent*(uPetals.w*.65+growthRandom(row,column,2u)*uOrganic.z*.18)+across*growthRandom(row,column,3u)*uOrganic.z*.12;
   vec3 q=p-bend*lengthOfSpine*height*height;
   vec3 a=axis*core*(.92-uOrganic.x*.22),c=axis*(core*.92+lengthOfSpine);
   float tip=max(.0015,width*mix(.9,.008,uPetalTip.w));
   thickness=min(thickness,length(c-a)*.85+tip);
   float lower=length(q-a-axis*clamp(dot(q-a,axis),0.,length(c-a)))-max(thickness,tip);
   float warpBound=1.+2.*length(bend);
   if(lower/warpBound>min(body,spines)+rootBlend)continue;
   spines=-smax(-spines,-roundCone(q,a,c,thickness,tip)/warpBound,rootBlend*.4);
  }
 }
 return -smax(-body,-spines,rootBlend);
}
float hedgeField(vec3 p){
 float amount=clamp((uOrganic.x+uOrganic.y+uOrganic.z)*20.,0.,1.);
 if(amount<.000001)return legacyHedgeField(p);
 float organic=organicHedgeField(p);if(amount>.999999)return organic;
 return mix(legacyHedgeField(p),organic,amount);
}
float crownField(vec3 p){float spread=uPetalSpread.x;if(spread<.0001)return flowerField(p);if(spread>.9999)return hedgeField(p);return mix(flowerField(p),hedgeField(p),spread);}
float stemField(vec3 p){
 float len=uStem.x*3.,radius=uStem.y*min(1.,uStem.x*8.),bend=uStem.z;
 vec3 a=vec3(0,-.14,0),b=vec3(bend*.35,-.14-len*.45,0),c=vec3(-bend*.55,-.14-len,0);
 return curvedStem(p,a,b,c,radius);
}
#endif
`;
// Separate stem helper so petal taper never affects its thickness.
const STEM_GEOMETRY=`float curvedStem(vec3 p,vec3 a,vec3 b,vec3 c,float radius){vec3 m=petalCurve(a,b,c,.5);return min(roundCone(p,a,m,radius,radius),roundCone(p,m,c,radius,radius));}\n`;
MODERN_FRAG=MODERN_FRAG.replace('vec3 fieldParts(vec3 world){',CROWN_GEOMETRY.replace('float stemField',STEM_GEOMETRY+'float stemField')+'\nvec3 fieldParts(vec3 world){');
MODERN_FRAG=MODERN_FRAG.replace('float d=norm-1.-uWarp.x*w-uOther.z*ripple*.17-lobe;',`float d=norm-1.-uWarp.x*w-uOther.z*ripple*.17-lobe;
 #if CROWN_ENABLED
 if(uPetals.x>.000001)d=mix(d,crownField(p)-uWarp.x*w*.35-uOther.z*ripple*.08,uPetals.x);
 if(uStem.x>.000001)d=-smax(-d,-stemField(p),.08*min(1.,uStem.x*8.));
 #endif
`);
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
 return (p.y*uColorAxis.x*.35+r*uColorAxis.y*.35+spiral+warp)*uColorWave.y+uColorWave.w;
}
vec3 surfacePalette(vec3 p,vec3 base){
 if(uColorWave.x<.000001)return base;
 return mix(base,palette(colorCoordinate(p)),uColorWave.x);
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
 float angle=atan(local.y,local.x);
 float thickness=uScatter.w*(1.+.09*sin(local.x*1.7+local.y*2.6)-.1*local.y
   +flow*.22*sin(local.y*4.8+phase+swirl*sin(angle*3.-phase)*1.2)
   +swirl*.17*sin(angle*3.-phase+local.y*2.)
   +uColorWave.x*.25*sin(colorCoordinate(local)*2.*PI));
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
 return clamp(xyzRGB(xyz)/max(vec3(.001),xyzRGB(white)),0.,1.);
}`);
MODERN_FRAG=shaderFunction(MODERN_FRAG,'absorptionCoefficient',`vec3 absorptionCoefficient(vec3 tint){
 vec3 interiorTint=mix(uInternalColor,tint,uColorWave.x);
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
MODERN_FRAG=shaderFunction(MODERN_FRAG,'shade',`vec4 shade(vec3 p,vec3 geometricNormal,vec3 rd,bool hit,out float issue){
 issue=0.;vec3 local=transform(p),n=geometricNormal;
 float textureFilter=1.-smoothstep(.28,.65,84.*3.4/min(uResolution.x,uResolution.y)/(2.*PI));
 if(uTexture.z>.001)n=normalize(n+vec3(sin(local.y*84.),cos(local.x*71.),sin(local.z*69.))*uTexture.z*.045*textureFilter);
 float facing=max(dot(n,-rd),0.),pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
 vec3 base=palette(pos),specular=environment(reflect(rd,n),p,uMat.w);
 vec3 dielectricF=fresnel(facing,1.,max(1.,uMat.y),local),diffuseLight=environment(n,p,1.)*.14;
 for(int i=0;i<uLightCount;i++){
  vec3 off=uLights[i].xyz-p;float cosine=max(dot(n,normalize(off)),0.);
  diffuseLight+=uLightColors[i]*cosine*uLights[i].w*.35/(1.+dot(off,off)*.08);
 }
 vec3 diffuse=base*diffuseLight*(1.-uMat.z*(1.-uMat.x));
 if(uTransport.x>.001)diffuse=mix(diffuse,subsurfaceLight(p,geometricNormal,base),uTransport.x);
 float transmission=clamp(uMat.x,0.,1.);vec4 glass=vec4(0.);float unused;
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
   glass.rgb=max(vec3(0.),glass.rgb-specular*dielectricF);
   glass.a=clamp((glass.a-max(max(dielectricF.r,dielectricF.g),dielectricF.b))/max(.001,1.-dielectricF.r),0.,1.);
   glass=mix(glass,straight,clamp(uModern.x,0.,1.));
  }
 }
 vec3 below=(vec3(1.)-dielectricF)*diffuse*(1.-transmission)+glass.rgb*transmission;
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
  below=below*(vec3(1.)-coatF)+environment(reflect(rd,n),p,uCoat.y)*coatF;
  alpha=1.-(1.-alpha)*(1.-max(max(coatF.r,coatF.g),coatF.b));
 }
 below+=base*uSurface.w*(1.-transmission+transmission*pow(1.-facing,3.));
 return vec4(below,clamp(alpha,0.,1.));
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
 float aa=1.-smoothstep(-pixel*.6,pixel*.6,silhouette);coverage=uCut.w<.002?aa:max(aa,coverage);float unused;vec4 back=sceneRay`);
MODERN_FRAG=MODERN_FRAG.replace('photo(surface.rgb,originalUV),coverage)', '(photo(surface.rgb,originalUV)+(toSRGB(back.rgb)-photo(back.rgb,originalUV))*(1.-surface.a)),coverage)');
MODERN_FRAG=MODERN_FRAG.replace('vec3 target=clamp(photo(mix(back.rgb,surface.rgb,coverage),originalUV),0.,1.);', 'vec3 target=mix(back.rgb,surface.rgb,coverage);');
MODERN_FRAG=MODERN_FRAG.replace('bodyAlpha=max(bodyAlpha,1.-min(min(target.r,target.g),target.b));','');
MODERN_FRAG=MODERN_FRAG.replace('fragColor=vec4(clamp(premultiplied/max(alpha,.000001)+grain,0.,1.),alpha);','fragColor=vec4(clamp(photo(premultiplied/max(alpha,.000001),originalUV)+grain,0.,1.),alpha);');
// Accumulate premultiplied samples in float precision, so transparent edges have no colored fringe.
MODERN_FRAG=MODERN_FRAG.replace(/\n}\n$/, '\n if(uSampling.z>.5){if(transparentExport())fragColor.rgb*=fragColor.a;else fragColor.a=clamp(coverage*surface.a+halo,0.,1.);fragColor*=uSampling.w;}\n}\n');
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
MODERN_FRAG=MODERN_FRAG.replace('vec3 base=palette(pos),specular=', 'vec3 base=surfacePalette(local,palette(pos)),specular=');
const RESOLVE=`#version 300 es
precision highp float;uniform sampler2D uImage;uniform vec4 uGrain;uniform float uAll;out vec4 fragColor;
void main(){vec4 a=texelFetch(uImage,ivec2(gl_FragCoord.xy),0);bool opaque=uGrain.w>.5;float noise=(fract(sin(dot(floor(gl_FragCoord.xy/max(.5,uGrain.y))+uGrain.z,vec2(127.1,311.7)))*43758.5453123)-.5)*uGrain.x;
 vec3 color=opaque?a.rgb:a.rgb/max(.000001,a.a);float alpha=opaque?1.:clamp(a.a,0.,1.);noise*=opaque&&uAll<.5?a.a:1.;fragColor=vec4(clamp(color+noise,0.,1.),alpha);}`;
function jitterSample(index){let n=index+1,x=0,y=0,f=.5;while(n){x+=(n%2)*f;n=Math.floor(n/2);f/=2;}n=index+1;f=1/3;while(n){y+=(n%3)*f;n=Math.floor(n/3);f/=3;}return[x-.5,y-.5]}

function rgb(hex){return [1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)})}
// The UI uses the same field for placing and identifying interior lights.
export function fieldAt(s,point){
 let p=[(point[0]-s.positionX)/s.scale,(point[1]-s.positionY)/s.scale,point[2]/s.scale];
 const rotate=(a,b,angle)=>{const c=Math.cos(angle),v=Math.sin(angle),x=p[a],y=p[b];p[a]=c*x+v*y;p[b]=-v*x+c*y;};
 const rad=Math.PI/180;rotate(0,1,(s.rotateZ||0)*rad);rotate(0,2,s.rotateY*rad);rotate(1,2,s.rotateX*rad);
 const axes=[s.stretchX,s.stretchY,Math.max(.06,s.volume*s.stretchZ)];p=p.map((v,i)=>v/axes[i]);rotate(0,2,s.twist*p[1]*.7);
 p[0]-=s.asymmetry*(p[1]*p[1]-.25)+(s.bendX||0)*(p[1]*p[1]-.3);p[1]-=(s.bendY||0)*(p[0]*p[0]-.3);
 p[0]*=1-s.asymmetry*p[1]*.18;const taper=Math.max(.35,1-(s.taper||0)*p[1]*.45);p[0]/=taper;p[2]/=taper;p[0]*=1+(s.pinch||0)*Math.exp(-p[1]*p[1]*4);
 const exponent=2+(s.roundness||0)*6,seed=(s.seed%1000)*.013;
 const norm=Math.pow(p.reduce((n,v)=>n+Math.pow(Math.abs(v),exponent),0),1/exponent);
 const wave=Math.sin(p[0]*3.4+seed)*Math.sin(p[1]*2.6)*Math.cos(p[2]*3+.6),ripple=Math.sin(p[0]*s.waveScale*2)*Math.sin(p[1]*s.waveScale*1.7)*Math.sin(p[2]*s.waveScale*1.6+1);
 const lobe=Math.sin(Math.atan2(p[1],p[0])*(s.lobes||5))*(s.lobeAmount||0)*(1-Math.min(1,Math.abs(p[2]))*.65);
 let d=norm-1-s.deform*wave-s.waves*ripple*.17-lobe;
 if(s.renderVersion>=2){if((s.petalAmount||0)>.000001)d=d*(1-s.petalAmount)+(crownAt(s,p)-s.deform*wave*.35-s.waves*ripple*.08)*s.petalAmount;if((s.stemAmount||0)>.000001)d=softMin(d,stemAt(s,p),.08*Math.min(1,s.stemAmount*8));}
 const pow=2+s.holeShape*5;
 const hole=s.hole>.001?s.hole-Math.pow(Math.pow(Math.abs((p[0]-s.holeX)/(s.holeAspect||1)),pow)+Math.pow(Math.abs(p[1]-s.holeY),pow),1/pow):-10000;
 const cut=s.cut>.001?s.cut-Math.hypot((p[0]-s.cutX)/(s.cutAspect||1),p[1]-s.cutY):-10000;
 const scale=Math.min(...axes)*s.scale*.5,k=(s.rimRound||0)*scale;
 const maximum=(a,b)=>{if(k<.0001)return Math.max(a,b);const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*.25;};
 d=maximum(maximum(d*scale,hole*scale),cut*scale);return d;
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
function crownAt(s,p){const spread=s.petalCoverage||0;return spread<.0001?flowerAt(s,p):spread>.9999?hedgeAt(s,p):flowerAt(s,p)*(1-spread)+hedgeAt(s,p)*spread;}
function stemAt(s,p){const len=s.stemAmount*3,radius=(s.stemRadius??.09)*Math.min(1,s.stemAmount*8),bend=s.stemBend||0,a=[0,-.14,0],b=[bend*.35,-.14-len*.45,0],c=[-bend*.55,-.14-len,0],m=curveAt(a,b,c,.5);return Math.min(coneAt(p,a,m,radius,radius),coneAt(p,m,c,radius,radius));}
export class Renderer{
 constructor(canvas){
 this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('Questo browser non supporta WebGL 2. Prova un browser aggiornato con accelerazione grafica attiva.');this.gl=gl;this.programs=new Map();this.vertexShader=this.compileShader(gl.VERTEX_SHADER,VERT);
 this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);this.maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_TEXTURE_SIZE),4096);
 }
 compileShader(type,source){const g=this.gl,shader=g.createShader(type);g.shaderSource(shader,source);g.compileShader(shader);if(!g.getShaderParameter(shader,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(shader));return shader;}
 useVariant(key){let variant=this.programs.get(key);const g=this.gl;if(!variant){const source=(key&8?MODERN_FRAG:FRAG).replace('#version 300 es','#version 300 es'+(key&8?'\n#define ANALYTIC_SHAPE '+(key&32?1:0)+'\n#define THIN_SHELL_ENABLED '+(key&16?1:0):'')+'\n#define CROWN_ENABLED '+(key&64?1:0)+'\n#define VOLUME_ENABLED '+(key&1?1:0)+'\n#define SSS_ENABLED '+(key&2?1:0)+'\n#define DISPERSION_ENABLED '+(key&4?1:0)),fragment=this.compileShader(g.FRAGMENT_SHADER,source),program=g.createProgram();g.attachShader(program,this.vertexShader);g.attachShader(program,fragment);g.linkProgram(program);g.deleteShader(fragment);if(!g.getProgramParameter(program,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(program));const locations={};for(let i=0;i<g.getProgramParameter(program,g.ACTIVE_UNIFORMS);i++){const u=g.getActiveUniform(program,i);locations[u.name.replace('[0]','')]=g.getUniformLocation(program,u.name)}variant={program,locations};this.programs.set(key,variant)}this.program=variant.program;this.locations=variant.locations;g.useProgram(this.program);}
 draw(source,phase=0,width=this.canvas.width,height=this.canvas.height,options={}){const s=sampleFrame(source,phase),c=this.canvas,g=this.gl;if(c.width!==width||c.height!==height){c.width=width;c.height=height}g.viewport(0,0,width,height);const analytic=!['deform','asymmetry','twist','waves','hole','cut','roundness','taper','bendX','bendY','lobeAmount','pinch','petalAmount','stemAmount'].some(k=>Math.abs(s[k]||0)>.000001);const volume=(s.scattering||0)+(s.translucency||0)+(s.subsurface||0)>.0001,transmission=s.renderVersion>=2?s.transparency:s.transparency+(1-s.transparency)*(s.translucency||0);this.useVariant((s.renderVersion>=2?8+(s.thinShell>=.999?16:0)+(analytic?32:0)+((s.petalAmount||0)+(s.stemAmount||0)>.000001?64:0):0)+ +volume+((s.subsurface||0)>.0001&&transmission<.999?2:0)+((s.dispersion||0)>.005?4:0));const u=(name,v)=>g['uniform'+v.length+'fv'](this.locations[name],v),f=(name,v)=>g.uniform1f(this.locations[name],v),rad=Math.PI/180;
 if(s.renderVersion>=2){u('uEnvironment',[{studio:0,sunset:1,neon:2,sky:3,aquarium:4,aurora:5,city:6}[s.environment]??0,(s.environmentAngle||0)*rad,s.environmentPower??1,s.environmentRefraction??.12]);u('uFilmMotion',[phase*Math.round(s.filmCycles||1),s.filmFlow||0,s.filmSwirl||0,0]);u('uModern',[s.thinShell||0,s.grounding||0,s.groundShadow??1,s.groundCaustic??1]);u('uSampling',[...(options.jitter||[0,0]),+!!options.accumulate,options.weight??1]);u('uInternalColor',rgb(s.internalColor||'#e6f5ff'));u('uPetals',[s.petalAmount||0,s.petalCount||12,s.petalOpen??.65,s.petalCurl||0]);u('uPetalTip',[s.petalLength??1.05,s.petalWidth??.24,s.petalInflate??.6,s.petalSharp||0]);u('uPetalSpread',[s.petalCoverage||0,s.petalRows||5,(((s.petalPhase||0)%360+360)%360)*rad,0]);u('uOrganic',[s.petalBlend||0,s.petalRoot||0,s.petalRandom||0,(s.seed>>>0)&16777215]);u('uStem',[s.stemAmount||0,s.stemRadius??.09,s.stemBend||0,0]);u('uColorWave',[s.colorWaveAmount||0,s.colorWaveBands??1,s.colorWaveWarp??.2,((s.colorWavePhase||0)%1+1)%1]);u('uColorAxis',[s.colorWaveHeight??1,s.colorWaveRadius||0,s.colorWaveSwirl||0,0]);}

 u('uResolution',[width,height]);u('uShape',[s.volume,s.stretchX,s.stretchY,s.stretchZ]);u('uWarp',[s.deform,s.asymmetry,s.twist,s.waveScale]);u('uVoid',[s.hole,s.holeX,s.holeY,s.holeShape]);u('uCut',[s.cut,s.cutX,s.cutY,s.edge]);u('uMat',[s.transparency,s.refraction,s.metal,s.renderVersion>=2?Math.min(1,s.roughness+(1-s.gloss)*.35):s.roughness]);u('uSurface',[s.iridescence,s.thickness,s.gloss,s.emission]);u('uGradient',[s.gradientAngle*rad,s.gradientScale,s.gradientOffset,s.colorSoftness]);u('uFrame',[s.scale,s.positionX,s.positionY,s.grain]);u('uOther',[s.rotateY*rad,s.rotateX*rad,s.waves,s.glow]);u('uExtraShape',[s.roundness||0,s.taper||0,s.bendX||0,s.bendY||0]);u('uExtraShape2',[s.lobeAmount||0,s.lobes||5,s.pinch||0,s.rimRound||0]);u('uExtraShape3',[s.holeAspect||1,s.cutAspect||1,(s.rotateZ||0)*rad,0]);u('uCoat',[s.coat||0,s.coatRoughness||.1,s.fresnel??1,s.iridShift||0]);u('uOptics',[s.iridScale||1,s.dispersion||0,s.absorption||0,s.tintStrength??.15]);u('uTexture',[s.anisotropy||0,(s.anisotropyAngle||0)*rad,s.surfaceTexture||0,0]);

 u('uRuntime',[+!!options.preview,.85/(1.+(s.deform||0)*2.+Math.abs(s.asymmetry||0)*.6+Math.abs(s.twist||0)*.3+(s.waves||0)*(s.waveScale||1)*.15+(s.lobeAmount||0)*(s.lobes||0)*.4),options.normalDiagnostic?2:+!!options.diagnostic,16]);u('uTransport',[s.subsurface||0,s.sssRadius??.35,0,0]);u('uSssColor',rgb(s.sssColor||'#ffc49b'));
 u('uInterior',[s.hollow||0,s.wallThickness??.08,s.translucency||0,s.scattering||0]);u('uScatter',[s.scatterDirection??.25,+analytic,s.thinFilm||0,s.filmThickness??420]);
 u('uPhoto1',[s.exposure||0,s.brightness||0,s.contrast??1,s.saturation??1]);u('uPhoto2',[s.temperature||0,s.photoTint||0,s.vignette||0,s.lensDistortion||0]);u('uPhoto3',[s.blacks||0,s.highlights||0,s.grainSize||1,0]);u('uPhoto4',[s.gamma||1,+!!s.photoAll,0,0]);
 const palette=s.palette.slice(0,12);while(palette.length<12)palette.push(palette[palette.length-1]||'#ffffff');g.uniform3fv(this.locations.uPalette,palette.flatMap(rgb));g.uniform1i(this.locations.uPaletteCount,Math.max(1,Math.min(12,s.palette.length)));
 const active=s.lights.filter(l=>l.enabled).slice(0,8),pos=[],colors=[],props=[],extra=[];const types={circle:0,bar:1,spot:2,diffuser:3,grid:4,ring:5,orb:6};for(let i=0;i<8;i++){const l=active[i];pos.push(...(l?[l.x,l.y,l.z,l.power]:[0,0,0,0]));colors.push(...rgb(l?.color||'#000000'));props.push(...(l?[l.size,l.length,l.roll*rad,types[l.type]??0]:[1,1,0,0]));extra.push(...(l?[l.softness,Math.tan(l.cone*rad),l.grid,+!!l.visible]:[.3,1,4,0]))}g.uniform4fv(this.locations.uLights,pos);g.uniform3fv(this.locations.uLightColors,colors);g.uniform4fv(this.locations.uLightProps,props);g.uniform4fv(this.locations.uLightExtra,extra);g.uniform1i(this.locations.uLightCount,active.length);
 u('uBg',rgb(s.background));u('uBg2',rgb(s.background2));u('uBackdrop',[s.bgHeight??-.65,s.bgSoftness??1.1,s.bgWash??.12,s.bgShade??.06]);f('uBgMode',{solid:0,gradient:1,transparent:2,studio:3}[s.bgMode]??0);f('uBgAngle',s.bgAngle*rad);f('uSeed',(s.seed%1000)*.013);g.drawArrays(g.TRIANGLES,0,3)}
 pixels(){const {gl,canvas}=this,raw=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);const flipped=new Uint8Array(raw.length),row=canvas.width*4;for(let y=0;y<canvas.height;y++)flipped.set(raw.subarray(y*row,(y+1)*row),(canvas.height-y-1)*row);return flipped}
 async drawAccumulated(source,phase,width,height,options={}){
  const samples=Math.max(1,Math.min(64,options.samples||16)),g=this.gl;
  if((source.renderVersion||1)<2||samples===1){this.draw(source,phase,width,height);return true;}
  const ext=g.getExtension('EXT_color_buffer_float');
  if(!ext){this.draw(source,phase,width,height);return true;}
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  const texture=g.createTexture(),framebuffer=g.createFramebuffer();
  g.bindTexture(g.TEXTURE_2D,texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texImage2D(g.TEXTURE_2D,0,g.RGBA16F,width,height,0,g.RGBA,g.HALF_FLOAT,null);
  g.bindFramebuffer(g.FRAMEBUFFER,framebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);
  try{
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE){g.bindFramebuffer(g.FRAMEBUFFER,null);this.draw(source,phase,width,height);return true;}
   g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE);
   const stable={...source,grain:0};
   for(let n=0;n<samples;n++){
    if(options.cancelled?.())return false;
    this.draw(stable,phase,width,height,{jitter:jitterSample(n),accumulate:true,weight:1/samples,preview:options.preview});
    options.progress?.((n+1)/samples);await new Promise(resolve=>setTimeout(resolve,0));
   }
   g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,null);
   if(!this.resolveProgram){const f=this.compileShader(g.FRAGMENT_SHADER,RESOLVE),program=g.createProgram();g.attachShader(program,this.vertexShader);g.attachShader(program,f);g.linkProgram(program);g.deleteShader(f);if(!g.getProgramParameter(program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(program));this.resolveProgram=program;}
   g.useProgram(this.resolveProgram);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,texture);g.uniform1i(g.getUniformLocation(this.resolveProgram,'uImage'),0);g.uniform4fv(g.getUniformLocation(this.resolveProgram,'uGrain'),[source.grain||0,source.grainSize||1,(source.seed%1000)*.013,+!(source.bgMode==='transparent'&&!options.preview)]);g.uniform1f(g.getUniformLocation(this.resolveProgram,'uAll'),+!!source.photoAll);g.drawArrays(g.TRIANGLES,0,3);return true;
  }finally{g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,null);g.deleteTexture(texture);g.deleteFramebuffer(framebuffer);}
 }
 dispose(){if(this.resolveProgram)this.gl.deleteProgram(this.resolveProgram);this.gl.deleteBuffer(this.buffer);for(const {program} of this.programs.values())this.gl.deleteProgram(program);this.gl.deleteShader(this.vertexShader);this.gl.getExtension('WEBGL_lose_context')?.loseContext()}
}
