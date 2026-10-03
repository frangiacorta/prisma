// This module is intentionally self-contained: exported HTML wallpapers run offline.
const TAU=Math.PI*2;
function motionWave(t,phase){const a=phase*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)*Math.PI/180;const x=Math.sin(a);return t.curve==='triangle'?2/Math.PI*Math.asin(x):t.curve==='soft'?x*Math.abs(x):x}
export function sampleFrame(source,phase=0){
 const s={...source,lights:(source.lights||[]).map(l=>({...l}))};
 const limits={volume:[.08,1.5],deform:[0,.75],twist:[-2.5,2.5],waves:[0,.4],hole:[0,.95],cut:[0,1.6],scale:[.35,1.7],positionX:[-1.5,1.5],positionY:[-1.5,1.5],iridescence:[0,1],roughness:[0,1],transparency:[0,1]};
 for(const [key,t] of Object.entries(source.motions||{})){
  if(!t.enabled)continue;const continuous=t.mode==='cycle'&&(key.startsWith('rotate')||key==='gradientOffset');
  const value=continuous?(phase/TAU*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)/360)*(key.startsWith('rotate')?360:1):motionWave(t,phase)*(t.amplitude||0)*(source.motion??.3)/.3;
  s[key]=source[key]+value;if(limits[key])s[key]=Math.max(limits[key][0],Math.min(limits[key][1],s[key]));
 }
 if(!source.motions){if(source.animateRotation)s.rotateY+=phase*180/Math.PI;if(source.animateShape){s.volume*=1+Math.sin(phase)*source.motion*.4;s.deform+=Math.sin(phase)*source.motion*.16}if(source.animateColor)s.gradientOffset+=phase/TAU;}
 for(const l of s.lights){if(l.orbit?.enabled){const t=l.orbit,a=t.mode==='cycle'?phase*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)*Math.PI/180:motionWave(t,phase)*t.amplitude*Math.PI/180*(source.motion??.3)/.3;const cs=Math.cos(a),sn=Math.sin(a);if(t.axis==='x'){[l.y,l.z]=[l.y*cs-l.z*sn,l.y*sn+l.z*cs]}else if(t.axis==='z'){[l.x,l.y]=[l.x*cs-l.y*sn,l.x*sn+l.y*cs]}else{[l.x,l.z]=[l.x*cs-l.z*sn,l.x*sn+l.z*cs]}}if(l.pulse?.enabled)l.power=Math.max(0,l.power*(1+motionWave(l.pulse,phase)*l.pulse.amplitude*(source.motion??.3)/.3))}
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
vec3 bg(vec2 p){float t=dot(p,vec2(cos(uBgAngle),sin(uBgAngle)))*.35+.5;return mix(uBg,uBg2,uBgMode==1.?clamp(t,0.,1.):0.);}
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
function rgb(hex){return [1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)})}
export class Renderer{
 constructor(canvas){
 this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('Questo browser non supporta WebGL 2. Prova un browser aggiornato con accelerazione grafica attiva.');this.gl=gl;this.programs=new Map();this.vertexShader=this.compileShader(gl.VERTEX_SHADER,VERT);
 this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);this.useVariant(0);this.maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_TEXTURE_SIZE),4096);
 }
 compileShader(type,source){const g=this.gl,shader=g.createShader(type);g.shaderSource(shader,source);g.compileShader(shader);if(!g.getShaderParameter(shader,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(shader));return shader;}
 useVariant(key){let variant=this.programs.get(key);const g=this.gl;if(!variant){const source=FRAG.replace('#version 300 es','#version 300 es\n#define VOLUME_ENABLED '+(key&1?1:0)+'\n#define SSS_ENABLED '+(key&2?1:0)+'\n#define DISPERSION_ENABLED '+(key&4?1:0)),fragment=this.compileShader(g.FRAGMENT_SHADER,source),program=g.createProgram();g.attachShader(program,this.vertexShader);g.attachShader(program,fragment);g.linkProgram(program);g.deleteShader(fragment);if(!g.getProgramParameter(program,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(program));const locations={};for(let i=0;i<g.getProgramParameter(program,g.ACTIVE_UNIFORMS);i++){const u=g.getActiveUniform(program,i);locations[u.name.replace('[0]','')]=g.getUniformLocation(program,u.name)}variant={program,locations};this.programs.set(key,variant)}this.program=variant.program;this.locations=variant.locations;g.useProgram(this.program);}
 draw(source,phase=0,width=this.canvas.width,height=this.canvas.height,options={}){const s=sampleFrame(source,phase),c=this.canvas,g=this.gl;if(c.width!==width||c.height!==height){c.width=width;c.height=height}g.viewport(0,0,width,height);const volume=(s.scattering||0)+(s.translucency||0)+(s.subsurface||0)>.0001,transmission=s.transparency+(1-s.transparency)*(s.translucency||0);this.useVariant(+volume+((s.subsurface||0)>.0001&&transmission<.999?2:0)+((s.dispersion||0)>.005?4:0));const u=(name,v)=>g['uniform'+v.length+'fv'](this.locations[name],v),f=(name,v)=>g.uniform1f(this.locations[name],v),rad=Math.PI/180;
 u('uResolution',[width,height]);u('uShape',[s.volume,s.stretchX,s.stretchY,s.stretchZ]);u('uWarp',[s.deform,s.asymmetry,s.twist,s.waveScale]);u('uVoid',[s.hole,s.holeX,s.holeY,s.holeShape]);u('uCut',[s.cut,s.cutX,s.cutY,s.edge]);u('uMat',[s.transparency,s.refraction,s.metal,s.roughness]);u('uSurface',[s.iridescence,s.thickness,s.gloss,s.emission]);u('uGradient',[s.gradientAngle*rad,s.gradientScale,s.gradientOffset,s.colorSoftness]);u('uFrame',[s.scale,s.positionX,s.positionY,s.grain]);u('uOther',[s.rotateY*rad,s.rotateX*rad,s.waves,s.glow]);u('uExtraShape',[s.roundness||0,s.taper||0,s.bendX||0,s.bendY||0]);u('uExtraShape2',[s.lobeAmount||0,s.lobes||5,s.pinch||0,s.rimRound||0]);u('uExtraShape3',[s.holeAspect||1,s.cutAspect||1,(s.rotateZ||0)*rad,0]);u('uCoat',[s.coat||0,s.coatRoughness||.1,s.fresnel??1,s.iridShift||0]);u('uOptics',[s.iridScale||1,s.dispersion||0,s.absorption||0,s.tintStrength??.15]);u('uTexture',[s.anisotropy||0,(s.anisotropyAngle||0)*rad,s.surfaceTexture||0,0]);
 const analytic=!['deform','asymmetry','twist','waves','hole','cut','roundness','taper','bendX','bendY','lobeAmount','pinch'].some(k=>Math.abs(s[k]||0)>.000001);
 u('uRuntime',[+!!options.preview,.85/(1.+(s.deform||0)*2.+Math.abs(s.asymmetry||0)*.6+Math.abs(s.twist||0)*.3+(s.waves||0)*(s.waveScale||1)*.15+(s.lobeAmount||0)*(s.lobes||0)*.4),options.normalDiagnostic?2:+!!options.diagnostic,16]);u('uTransport',[s.subsurface||0,s.sssRadius??.35,0,0]);u('uSssColor',rgb(s.sssColor||'#ffc49b'));
 u('uInterior',[s.hollow||0,s.wallThickness??.08,s.translucency||0,s.scattering||0]);u('uScatter',[s.scatterDirection??.25,+analytic,s.thinFilm||0,s.filmThickness??420]);
 u('uPhoto1',[s.exposure||0,s.brightness||0,s.contrast??1,s.saturation??1]);u('uPhoto2',[s.temperature||0,s.photoTint||0,s.vignette||0,s.lensDistortion||0]);u('uPhoto3',[s.blacks||0,s.highlights||0,s.grainSize||1,0]);u('uPhoto4',[s.gamma||1,+!!s.photoAll,0,0]);
 const palette=s.palette.slice(0,12);while(palette.length<12)palette.push(palette[palette.length-1]||'#ffffff');g.uniform3fv(this.locations.uPalette,palette.flatMap(rgb));g.uniform1i(this.locations.uPaletteCount,Math.max(1,Math.min(12,s.palette.length)));
 const active=s.lights.filter(l=>l.enabled).slice(0,8),pos=[],colors=[],props=[],extra=[];const types={circle:0,bar:1,spot:2,diffuser:3,grid:4,ring:5};for(let i=0;i<8;i++){const l=active[i];pos.push(...(l?[l.x,l.y,l.z,l.power]:[0,0,0,0]));colors.push(...rgb(l?.color||'#000000'));props.push(...(l?[l.size,l.length,l.roll*rad,types[l.type]??0]:[1,1,0,0]));extra.push(...(l?[l.softness,Math.tan(l.cone*rad),l.grid,+!!l.visible]:[.3,1,4,0]))}g.uniform4fv(this.locations.uLights,pos);g.uniform3fv(this.locations.uLightColors,colors);g.uniform4fv(this.locations.uLightProps,props);g.uniform4fv(this.locations.uLightExtra,extra);g.uniform1i(this.locations.uLightCount,active.length);
 u('uBg',rgb(s.background));u('uBg2',rgb(s.background2));f('uBgMode',{solid:0,gradient:1,transparent:2}[s.bgMode]);f('uBgAngle',s.bgAngle*rad);f('uSeed',(s.seed%1000)*.013);g.drawArrays(g.TRIANGLES,0,3)}
 pixels(){const {gl,canvas}=this,raw=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);const flipped=new Uint8Array(raw.length),row=canvas.width*4;for(let y=0;y<canvas.height;y++)flipped.set(raw.subarray(y*row,(y+1)*row),(canvas.height-y-1)*row);return flipped}
 dispose(){this.gl.deleteBuffer(this.buffer);for(const {program} of this.programs.values())this.gl.deleteProgram(program);this.gl.deleteShader(this.vertexShader);this.gl.getExtension('WEBGL_lose_context')?.loseContext()}
}
