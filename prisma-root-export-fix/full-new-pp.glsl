precision highp float;
precision highp int;
out vec4 fragColor;
uniform vec2 uResolution;
uniform vec4 uEnvironment,uFilmMotion,uSampling,uModern,uPetals,uPetalTip,uPetalSpread,uStem,uColorWave,uColorAxis,uOrganic,uBudget;
uniform vec3 uInternalColor;
uniform float uGeometryRadius,uNormalSamples;
uniform vec3 uFilmResponse[24],uFilmWhite;
uniform vec4 uMaterialDetail,uMaterialLayers;
uniform highp sampler2D uGrowth;
uniform vec2 uGrowthRows[8];
uniform highp sampler2D uRootTree;
uniform vec4 uRoots;
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
float crownBase(vec3 p){
 return 0.;
}
float crownField(vec3 p){
 if(uRoots.w>.999999)return rootsField(p);
 if(uRoots.w>.000001)return mix(crownBase(p),rootsField(p),uRoots.w);
 return crownBase(p);
}
vec3 fieldParts(vec3 world){
 vec3 p=transform(world);float volume=max(.06,uShape.x*uShape.w);p/=vec3(uShape.y,uShape.z,volume);
 if(uWarp.z!=0.)p.xz=rot(uWarp.z*p.y*.7)*p.xz;
 p.x-=uWarp.y*(p.y*p.y-.25)+uExtraShape.z*(p.y*p.y-.3);p.y-=uExtraShape.w*(p.x*p.x-.3);
 p.x*=1.-uWarp.y*p.y*.18;p.xz/=max(.35,1.-uExtraShape.y*p.y*.45);
 if(uExtraShape2.z!=0.)p.x*=1.+uExtraShape2.z*exp(-p.y*p.y*4.);
 float w=0.;if(uWarp.x!=0.)w=sin(p.x*3.4+uSeed)*sin(p.y*2.6)*cos(p.z*3.+.6);
 float ripple=0.;if(uOther.z!=0.)ripple=sin(p.x*uWarp.w*2.)*sin(p.y*uWarp.w*1.7)*sin(p.z*uWarp.w*1.6+1.);
 float exponent=2.+uExtraShape.x*6.;float norm=exponent==2.?length(p):pow(pow(abs(p.x),exponent)+pow(abs(p.y),exponent)+pow(abs(p.z),exponent),1./exponent);
 float lobe=0.;if(uExtraShape2.x!=0.)lobe=sin(atan(p.y,p.x)*uExtraShape2.y)*uExtraShape2.x*(1.-min(1.,abs(p.z))*.65);
 float d=norm-1.-uWarp.x*w-uOther.z*ripple*.17-lobe;
 if(uPetals.x>.000001)d=mix(d,crownField(p)-uWarp.x*w*.35-uOther.z*ripple*.08,uPetals.x);
 float hole=-10000.,cut=-10000.;if(uVoid.x>.001){float innerPower=2.+uVoid.w*5.;vec2 hp=abs((p.xy-uVoid.yz)/vec2(uExtraShape3.x,1.));hole=uVoid.x-pow(pow(hp.x,innerPower)+pow(hp.y,innerPower),1./innerPower);}if(uCut.x>.001)cut=uCut.x-length((p.xy-uCut.yz)/vec2(uExtraShape3.y,1.));
 return vec3(d,hole,cut)*min(min(uShape.y,uShape.z),volume)*uFrame.x*.5;
}
float field(vec3 world){
vec3 parts=fieldParts(world);float k=uExtraShape2.w*min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*.5;return smax(smax(parts.x,parts.y,k),parts.z,k);
}
float wallDepth(){return mix(1.,uInterior.y,uInterior.x)*min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*.5;}
bool hasCavity(){return uInterior.x*(1.-uInterior.y)>.0001;}
float materialField(vec3 p){float d=field(p);return hasCavity()?max(d,-d-wallDepth()):d;}
float traceField(vec3 p,bool outerOnly){float d=field(p);return !outerOnly&&hasCavity()?max(d,-d-wallDepth()):d;}
float rayEpsilon(){return min(.00003,max(.000002,wallDepth()*.02));}
vec3 axes(){return vec3(uShape.y,uShape.z,max(.06,uShape.x*uShape.w));}
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
vec3 surfaceNormal(vec3 p){vec3 n;
 float e=.00012*uFrame.x;n=vec3(0.);
 for(int k=0;k<int(min(6.,uNormalSamples));k++){
  int axis=k/2;float signOfSample=(k%2)==0?1.:-1.;vec3 offset=vec3(0.);offset[axis]=e*signOfSample;
  float value=field(p+offset);n[axis]+=value*signOfSample;
 }
return length(n)>.000001?normalize(n):vec3(0,0,1);}
float fieldDifference(vec3 p,vec3 offset){
 float difference=0.;
 for(int k=0;k<int(min(2.,uNormalSamples));k++){
  float signOfSample=k==0?1.:-1.;difference+=field(p+offset*signOfSample)*signOfSample;
 }
 return difference;
}
vec3 offsetBoundary(vec3 p,vec3 direction,bool inside){float eps=rayEpsilon(),probe=.0001,derivative=abs(fieldDifference(p,direction*probe)/(2.*probe));float stepSize=clamp(eps*6./max(.0001,derivative),eps*6.,.001*uFrame.x);vec3 next=p+direction*stepSize;for(int i=0;i<int(uRuntime.w)/2;i++){if((materialField(next)<0.)==inside)break;stepSize*=.5;next=p+direction*stepSize;}return next;}
vec3 boundaryNormal(vec3 p){vec3 n=surfaceNormal(p);if(!hasCavity())return n;float d=field(p);return -d-wallDepth()>d?-n:n;}
vec2 ellipsoidRoots(vec3 origin,vec3 direction,float radius){vec3 o=transform(origin)/axes(),d=(transform(origin+direction)-transform(origin))/axes();float a=dot(d,d),b=dot(o,d),disc=b*b-a*(dot(o,o)-radius*radius);if(disc<0.)return vec2(100.,-100.);float root=sqrt(disc);return vec2((-b-root)/a,(-b+root)/a);}
float firstRoot(vec2 roots){float e=rayEpsilon()*2.;return roots.x>e?roots.x:roots.y>e?roots.y:100.;}
vec2 objectInterval(vec3 origin,vec3 direction){vec3 o=transform(origin),d=transform(origin+direction)-transform(origin),extent=axes()*uGeometryRadius;vec3 inv=vec3(1.)/mix(vec3(.0000001),d,greaterThan(abs(d),vec3(.0000001)));vec3 a=(-extent-o)*inv,b=(extent-o)*inv;vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));}
bool traceBoundary(vec3 origin,vec3 direction,float maximum,bool outerOnly,out vec3 point,out float travel){
 float eps=rayEpsilon();
 if(uScatter.y>.5){float t=firstRoot(ellipsoidRoots(origin,direction,1.));if(!outerOnly&&hasCavity())t=min(t,firstRoot(ellipsoidRoots(origin,direction,uInterior.x*(1.-uInterior.y))));travel=t;point=origin+direction*t;return t<maximum;}
 vec2 interval=objectInterval(origin,direction);float t=max(0.,interval.x),end=min(maximum,interval.y),previousT=t,previousD=traceField(origin+direction*t,outerOnly);
 float a=t,b=t,da=previousD;bool found=false;
 for(int j=0;j<int(min(uBudget.x,float(224)));j++){
  if(t>end)break;point=origin+direction*t;float d=traceField(point,outerOnly);
  if(j>0&&d*previousD<0.){a=previousT;b=t;da=previousD;found=true;break;}
  float derivative=1.;
 if(abs(d)<eps){
 derivative=fieldDifference(point,direction*.0005)/.001;
 if(!outerOnly&&hasCavity()){float outer=field(point);if(-outer-wallDepth()>outer)derivative=-derivative;}
 }
  if(abs(d)<eps&&t>eps*3.){
   float ahead=min(end-t,min(.18*uFrame.x,max(eps*12.,eps*8./max(.0001,abs(derivative))))),after=traceField(origin+direction*(t+ahead),outerOnly);
   if(previousD*after<0.){a=previousT;b=t+ahead;da=previousD;found=true;break;}
   previousT=t;if(abs(d)>eps*.001)previousD=d;t+=max(ahead,eps*12.);
  }else{float stepSize=abs(derivative)>.00001?abs(d/derivative)*.65:abs(d)*uRuntime.y;previousT=t;previousD=d;
 stepSize=abs(d)*uRuntime.y*2.;
 t+=max(min(stepSize,.18*uFrame.x),eps*1.5);}
 }
 if(found){for(int k=0;k<int(uRuntime.w);k++){float m=(a+b)*.5,dm=traceField(origin+direction*m,outerOnly);if(da*dm>0.){a=m;da=dm;}else b=m;}travel=(a+b)*.5;}else travel=end;
 point=origin+direction*travel;return found;
}
vec3 palette(float t){float v=fract(t)*float(uPaletteCount);int i=int(floor(v)),j=(i+1)%uPaletteCount;float f=smoothstep(.5-max(.012,uGradient.w)*.5,.5+max(.012,uGradient.w)*.5,fract(v));return mix(uPalette[i],uPalette[j],f);}
float colorCoordinate(vec3 p){
 float phase=uColorWave.w*2.*PI,r=length(p.xz),angle=r>.00001?atan(p.z,p.x):0.;
 float spiral=sin(angle+r*2.-phase)*r/(r+.18)*uColorAxis.z*.32;
 float warp=sin(p.y*2.4+sin(p.x*2.1+phase))*uColorWave.z*.22;
 return (p.y*uColorAxis.x*.35+r*uColorAxis.y*.35+spiral+warp)*uColorWave.y+uColorWave.w;
}
vec3 surfacePalette(vec3 p,vec3 base){
 if(uColorWave.x<.000001)return base;
 return mix(base,palette(colorCoordinate(p)),uColorWave.x);
}
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
vec3 backdrop(vec3 origin,vec3 direction){float z=-max(3.,max(max(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*1.6+1.);float t=(z-origin.z)/(abs(direction.z)>.0001?direction.z:-.0001);vec2 p=(origin+direction*max(0.,t)).xy;if(uBgMode==2.){if(transparentExport())return vec3(1.);float cell=.17;vec2 square=p/cell,width=vec2(max(.02,3.4/min(uResolution.x,uResolution.y)/cell));vec2 a=square-width*.5,b=square+width*.5;vec2 stripe=((.5-abs(mod(b,2.)-1.))-(.5-abs(mod(a,2.)-1.)))/width;float checker=.5-.5*stripe.x*stripe.y;return mix(vec3(.57),vec3(.87),clamp(checker,0.,1.));}vec3 color=bg(p);if(uModern.y>.001){
 vec2 center=uFrame.yz+vec2(0,-uShape.z*uFrame.x*.95),q=(p-center)/vec2(max(.1,uShape.y*uFrame.x),.18*uFrame.x);
 float shadow=exp(-dot(q,q)*1.4);color*=1.-shadow*uModern.y*uModern.z*.22;
 float lens=max(.08,uMat.y-1.),focus=.75+min(.8,lens),ring=exp(-pow((length(q/vec2(focus,1.))- .7)/.22,2.));
 color+=mix(vec3(1.),uInternalColor,.25)*ring*uModern.y*uModern.w*uMat.x*(1.-uMat.w)*.15;
  }return color;}
float fixture(vec2 q,vec4 props,vec4 extra){if(props.w>5.5)return 1.-smoothstep(.8,1.05,length(q/max(.03,props.x)));float width=max(.04,props.x),height=max(.04,props.y),soft=max(.015,extra.x),d;
 if(props.w<.5){d=length(q/width)-1.;return 1.-smoothstep(-soft,soft,d);}
 if(props.w<1.5){d=max(abs(q.x)/width,abs(q.y)/height)-1.;return 1.-smoothstep(-soft,soft,d);}
 if(props.w<2.5){d=length(q)/max(.06,extra.y);return pow(max(0.,1.-d*d),mix(6.,.7,soft));}
 if(props.w<3.5)return exp(-dot(q/vec2(width,height),q/vec2(width,height))*mix(2.5,.6,soft));
 if(props.w<4.5){float box=1.-smoothstep(-soft,soft,max(abs(q.x)/width,abs(q.y)/height)-1.);vec2 wave=abs(sin(q/vec2(width,height)*extra.z*PI*.5));return box*smoothstep(.25,.55,wave.x)*smoothstep(.25,.55,wave.y);}
 d=abs(length(q/width)-.8);return 1.-smoothstep(.05,.08+soft*.35,d);
}
vec4 sceneEmitters(vec3 origin,vec3 direction,float maximum,out float nearest){
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
}
vec4 sceneRay(vec3 origin,vec3 direction,out float nearest){vec4 lights=sceneEmitters(origin,direction,100.,nearest);return vec4(lights.rgb+backdrop(origin,direction)*(1.-lights.a),lights.a);}
vec3 envLight(vec3 r,vec3 p,int i,float rough){vec3 offset=uLights[i].xyz-p;float distance=max(.25,length(offset));vec3 ld=offset/distance;float facing=dot(r,ld);if(facing<=.01)return vec3(0.);vec3 right=normalize(cross(abs(ld.y)>.98?vec3(1,0,0):vec3(0,1,0),ld)),up=cross(ld,right);vec2 q=rot(uLightProps[i].z)*vec2(dot(r,right),dot(r,up))/max(.1,facing)*distance;vec2 anis=rot(uTexture.y)*q;anis*=vec2(1.-uTexture.x*.75,1.+uTexture.x*.6);q=mix(q,anis,uTexture.x);vec4 props=uLightProps[i];props.xy+=rough*.9;vec4 extra=uLightExtra[i];extra.x=clamp(extra.x+rough*.5,.01,1.);if(props.w>1.5&&props.w<2.5)q/=distance;return uLightColors[i]*uLights[i].w*fixture(q,props,extra)*1.5;}
vec3 environment(vec3 direction,vec3 p,float rough){
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
}
vec3 fresnel(float cosine,float n1,float n2,vec3 local){
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
 vec3 xyz=vec3(0.),white=uFilmWhite;
 for(int j=0;j<int(min(24.,uFilmMotion.w));j++){
  float wavelength=390.+float(j)*15.,interference=cos(4.*PI*n1*max(20.,thickness)*c1/wavelength);
  vec2 product=r01*r12,reflection=(r01*r01+r12*r12+2.*product*interference)/(vec2(1.)+product*product+2.*product*interference);
  vec3 response=uFilmResponse[j];xyz+=response*dot(reflection,vec2(.5));
 }
 return clamp(xyzRGB(xyz)/max(vec3(.001),xyzRGB(white)),0.,1.);
}
vec3 absorptionCoefficient(vec3 tint){
 vec3 interiorTint=mix(uInternalColor,tint,uColorWave.x);
 return (vec3(uOptics.z*.7)+(vec3(1.)-interiorTint)*uOptics.w*1.7
   +(vec3(1.)-uSssColor)*uTransport.x*.16/max(.08,uTransport.y))*max(.001,uSurface.y);
}
float scatteringCoefficient(){
 return 0.;
}
float materialLength(vec3 a,vec3 b){
 vec3 delta=b-a;float lengthOfRay=length(delta);if(lengthOfRay<.0001)return 0.;vec3 direction=delta/lengthOfRay;
 if(uScatter.y>.5){vec2 outer=ellipsoidRoots(a,direction,1.);float distance=max(0.,min(lengthOfRay,outer.y)-max(0.,outer.x));if(hasCavity()){vec2 inner=ellipsoidRoots(a,direction,uInterior.x*(1.-uInterior.y));distance-=max(0.,min(lengthOfRay,inner.y)-max(0.,inner.x));}return max(0.,distance);}
 float occupied=0.,samples=max(1.,uBudget.z);
 for(int k=0;k<int(min(samples,float(16)));k++){vec3 q=a+delta*(float(k)+.5)/samples;occupied+=materialField(q)<0.?1.:0.;}
 return occupied*lengthOfRay/samples;
}
float phaseHG(float cosine,float g){return (1.-g*g)/(4.*PI*pow(max(.001,1.+g*g-2.*g*cosine),1.5));}
vec3 segmentScattering(vec3 origin,vec3 direction,float distance,vec3 sigmaA,float sigmaS){return vec3(0.);}
vec3 dipoleProfile(float radius,vec3 sigmaA,float sigmaSp,float ior){vec3 sigmaT=sigmaA+sigmaSp,alpha=sigmaSp/sigmaT,zr=vec3(1.)/sigmaT;float fdr=clamp(-1.44/(ior*ior)+.71/ior+.668+.0636*ior,0.,.95),A=(1.+fdr)/(1.-fdr);vec3 zv=zr*(1.+4.*A/3.),sigmaTr=sqrt(3.*sigmaA*sigmaT),dr=sqrt(vec3(radius*radius)+zr*zr),dv=sqrt(vec3(radius*radius)+zv*zv);return alpha/(4.*PI)*(zr*(sigmaTr+vec3(1.)/dr)*exp(-sigmaTr*dr)/(dr*dr)+zv*(sigmaTr+vec3(1.)/dv)*exp(-sigmaTr*dv)/(dv*dv));}
vec3 subsurfaceLight(vec3 p,vec3 n,vec3 tint){return vec3(0.);}
vec4 terminalScene(vec3 origin,vec3 direction,float rough){
 float unused;vec4 scene=sceneRay(origin,direction,unused);
 if(rough>.04){float spread=rough*rough*.2;vec3 tangent=normalize(cross(direction,abs(direction.y)>.98?vec3(1,0,0):vec3(0,1,0))),up=cross(direction,tangent);
  vec4 average=sceneRay(origin,normalize(direction+tangent*spread),unused)+sceneRay(origin,normalize(direction-tangent*spread),unused)+sceneRay(origin,normalize(direction+up*spread),unused)+sceneRay(origin,normalize(direction-up*spread),unused);
  scene=mix(scene,average*.25,min(1.,rough));
 }
 if(uBgMode!=2.)scene.rgb+=environment(direction,origin,rough)*uEnvironment.w*clamp((uMat.y-1.)*3.,0.,1.)*(1.-scene.a);
 return scene;
}
vec4 transmitted(vec3 p,vec3 n,vec3 rd,vec3 tint,vec3 irid,float ior,out float issue){
 issue=0.;float sigmaS=scatteringCoefficient();vec3 sigmaA=absorptionCoefficient(tint),f=fresnel(dot(n,-rd),1.,ior,transform(p));vec3 reflectTint=vec3(1.);
 f*=reflectTint;vec3 radiance=environment(reflect(rd,n),p,uMat.w)*f,beta=vec3(1.)-f,direction=refract(rd,n,1./ior);if(length(direction)<.0001)direction=rd;vec3 origin=offsetBoundary(p,direction,true);bool inside=true,finished=false;float coverage=0.;vec4 endScene=vec4(0.);
 for(int bounce=0;bounce<int(min(uBudget.y,float(32)));bounce++){
 if(max(max(beta.r,beta.g),beta.b)<.000001){finished=true;break;}
  float nearest;vec4 source=sceneEmitters(origin,direction,40.,nearest);vec3 point,normal;float distance;bool found=traceBoundary(origin,direction,min(40.,nearest),false,point,distance);
  if(!found){if(inside){float path=nearest<40.?nearest:max(0.,objectInterval(origin,direction).y);radiance+=beta*segmentScattering(origin,direction,path,sigmaA,sigmaS);beta*=exp(-(sigmaA+vec3(sigmaS))*path);issue=nearest<40.?0.:(materialField(origin)>0.?.375:.25);}endScene=terminalScene(origin,direction,uMat.w*clamp((ior-1.)*2.,0.,1.));coverage=endScene.a;radiance+=beta*endScene.rgb;finished=true;break;}
  if(inside){radiance+=beta*segmentScattering(origin,direction,distance,sigmaA,sigmaS);beta*=exp(-(sigmaA+vec3(sigmaS))*distance);}
  normal=boundaryNormal(point);vec3 facing=inside?-normal:normal;float n1=inside?ior:1.,n2=inside?1.:ior;vec3 refracted=abs(n1-n2)<.000001?direction:refract(direction,facing,n1/n2);
  if(length(refracted)<.00001){direction=reflect(direction,facing);origin=offsetBoundary(point,direction,inside);continue;}
  vec3 reflection=fresnel(dot(facing,-direction),n1,n2,transform(point))*reflectTint;radiance+=beta*reflection*environment(reflect(direction,facing),point,uMat.w);beta*=vec3(1.)-reflection;inside=!inside;direction=normalize(refracted);origin=offsetBoundary(point,direction,inside);
 }
 if(!finished){issue=inside?1.:.5;endScene=terminalScene(origin,direction,uMat.w*clamp((ior-1.)*2.,0.,1.));coverage=endScene.a;radiance+=beta*environment(direction,origin,uMat.w);}
 float alpha=clamp(1.-min(min(beta.r,beta.g),beta.b)*(1.-coverage),0.,1.);
 return vec4(radiance,alpha);
}
vec4 materialRelief(vec3 local,vec3 geometricNormal,vec3 rd){
 vec3 size=axes(),q=local/size;float density=uMaterialDetail.y,organic=uMaterialDetail.z;
 q.xy=rot(uMaterialDetail.w)*q.xy;q*=density;
 vec3 ka=vec3(3.1,2.3,1.7),kb=vec3(-1.8,3.7,2.9),kc=vec3(2.7,-1.5,4.1);
 float a=dot(q,ka)+uSeed,b=dot(q,kb)-uSeed*.7,c=dot(q,kc)+.4;
 float sa=sin(a),sb=sin(b),sc=sin(c),ca=cos(a),cb=cos(b),cc=cos(c);
 float warp=.55*sa+.3*sb+.15*sc;vec3 warpGradient=.55*ca*ka+.3*cb*kb+.15*cc*kc;
 float view=max(.12,abs(dot(geometricNormal,-rd)));
 float footprint=3.4*density/(min(uResolution.x,uResolution.y)*max(.05,uFrame.x)*max(.06,min(min(size.x,size.y),size.z))*view);
 vec3 gradient=vec3(0.);float roughening=0.;
 if(uMaterialLayers.x>.000001){
  vec3 k=vec3(4.,32.,3.);float phase=dot(q,k)+organic*5.*warp;
  vec3 derivative=k+organic*5.*warpGradient;
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
 gradient*=density*uMaterialDetail.x;gradient.xy=rot(-uMaterialDetail.w)*gradient.xy;gradient/=size;
 gradient.yz=rot(-uOther.y)*gradient.yz;gradient.xz=rot(-uOther.x)*gradient.xz;gradient.xy=rot(-uExtraShape3.z)*gradient.xy;
 gradient-=geometricNormal*dot(gradient,geometricNormal);
 gradient*=min(1.,1.05/max(.000001,length(gradient)))*smoothstep(.035,.28,view);
 return vec4(gradient,roughening);
}
vec3 reliefNormal(vec3 original,vec3 geometricNormal,vec3 rd,vec3 gradient){
 vec3 n=normalize(original-gradient);
 if(dot(reflect(rd,n),geometricNormal)<.001)n=normalize(mix(n,geometricNormal,.75));
 if(dot(reflect(rd,n),geometricNormal)<0.)n=geometricNormal;
 return n;
}
vec4 shade(vec3 p,vec3 geometricNormal,vec3 rd,bool hit,out float issue){
 issue=0.;vec3 local=transform(p),n=geometricNormal;
 float textureFilter=1.-smoothstep(.28,.65,84.*3.4/min(uResolution.x,uResolution.y)/(2.*PI));
 if(uTexture.z>.001)n=normalize(n+vec3(sin(local.y*84.),cos(local.x*71.),sin(local.z*69.))*uTexture.z*.045*textureFilter);
 float localRoughness=uMat.w,coatRoughness=uCoat.y;
 bool reliefActive=dot(uMaterialLayers,vec4(1.))>.000001;
 if(reliefActive){vec4 detail=materialRelief(local,geometricNormal,rd);n=reliefNormal(n,geometricNormal,rd,detail.xyz);localRoughness=clamp(localRoughness+detail.w*(1.-localRoughness),0.,1.);coatRoughness=clamp(coatRoughness+detail.w*.25,0.,1.);}
 float facing=max(dot(n,-rd),0.),pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
 vec3 base=surfacePalette(local,palette(pos)),specular=environment(reflect(rd,n),p,localRoughness);
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
   glass=transmitted(p,geometricNormal,rd,base,vec3(1.),max(1.,uMat.y),issue);
   vec3 entrySpecular=specular,entryF=dielectricF;
   if(reliefActive){entrySpecular=environment(reflect(rd,geometricNormal),p,uMat.w);entryF=fresnel(max(dot(geometricNormal,-rd),0.),1.,max(1.,uMat.y),local);}
   glass.rgb=max(vec3(0.),glass.rgb-entrySpecular*entryF);
   glass.a=clamp((glass.a-max(max(entryF.r,entryF.g),entryF.b))/max(.001,1.-entryF.r),0.,1.);
   glass=mix(glass,straight,clamp(uModern.x,0.,1.));
  }
 }
 vec3 below=(vec3(1.)-dielectricF)*diffuse*(1.-transmission)+glass.rgb*transmission;
 float alpha=(1.-transmission)+glass.a*transmission;
 vec3 surfaceF=dielectricF*max(.1,uSurface.z);
 surfaceF*=1.-clamp(uModern.x,0.,1.);
 below+=specular*surfaceF;alpha=1.-(1.-alpha)*(1.-max(max(surfaceF.r,surfaceF.g),surfaceF.b));
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
 below+=base*uSurface.w*(1.-transmission+transmission*pow(1.-facing,3.));
 return vec4(below,clamp(alpha,0.,1.));
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,greaterThan(c,vec3(.0031308)));}
vec3 filmic(vec3 x){
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
}
void main(){
 vec2 originalUV=(gl_FragCoord.xy+uSampling.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4,uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);vec3 origin=vec3(uv,4.8),direction=vec3(0,0,-1),point,normal;float distance;bool hit=traceBoundary(origin,direction,40.,true,point,distance);normal=hit?surfaceNormal(point):vec3(0,0,1);
 float soft=uCut.w*.44,closest=10.;if(!hit){vec3 o=transform(origin)/axes(),d=(transform(origin+direction)-transform(origin))/axes();point=origin+direction*max(0.,-dot(o,d)/dot(d,d));closest=max(0.,field(point));}
 float coverage=hit?1.:exp(-closest/max(.001,soft)),halo=hit?0.:exp(-closest/max(.008,.035+uOther.w*.16))*uOther.w*(.12+uSurface.w*.38);float pixel=3.4/min(uResolution.x,uResolution.y),silhouette=hit?-pow(max(0.,dot(normal,-direction)),2.)*min(min(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*.25:closest;
 float aa=1.-smoothstep(-pixel*.6,pixel*.6,silhouette);coverage=uCut.w<.002?aa:max(aa,coverage);float unused;vec4 back=sceneRay(origin,direction,unused),surface=back;float issue=0.;if(hit||coverage>.001){if(!hit)normal=surfaceNormal(point);surface=shade(point,normal,direction,hit,issue);}
 float flatGeometry=1.-smoothstep(.1,.45,uShape.x),flatBlend=flatGeometry*(1.-uSurface.z)*(1.-uMat.x);
 if(flatGeometry>.001){float normalization=max(.025,min(min(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*.5),flatD=field(vec3(uv,0.))/normalization;float flatAlpha=1.-smoothstep(-max(.008,uCut.w*1.6),max(.008,uCut.w*1.6),flatD);vec3 p=transform(vec3(uv,0.));vec3 flatColor=surfacePalette(p,palette(dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uGradient.y*.3+uGradient.z));surface.rgb=mix(surface.rgb,flatColor,flatBlend);coverage=mix(coverage,flatAlpha,flatGeometry);halo*=1.-flatGeometry;}
 if(hit){vec4 foreground=sceneEmitters(origin,direction,distance,unused);surface.rgb=surface.rgb*(1.-foreground.a)+foreground.rgb;surface.a=surface.a*(1.-foreground.a)+foreground.a;}
 vec3 glow=palette(atan(uv.y,uv.x)/(2.*PI)+.5)*halo,linear=mix(back.rgb,surface.rgb,coverage)+glow;float alpha=clamp(mix(back.a,surface.a,coverage)+halo,0.,1.);float grain=(hash(floor(gl_FragCoord.xy/max(.5,uPhoto3.z))+uSeed)-.5)*uFrame.w;
 if(uRuntime.z>1.5){fragColor=vec4(normal*.5+.5,hit?1.:0.);return;}
 if(uRuntime.z>.5){fragColor=vec4(issue,hit?1.:0.,0.,1.);return;}
 if(transparentExport()){
  vec3 target=mix(back.rgb,surface.rgb,coverage);float bodyAlpha=clamp(mix(back.a,surface.a,coverage),0.,1.);
  vec3 premultiplied=max(vec3(0.),target-vec3(1.-bodyAlpha));
  float glowAlpha=clamp(halo,0.,1.);premultiplied=premultiplied*(1.-glowAlpha)+toSRGB(palette(atan(uv.y,uv.x)/(2.*PI)+.5))*glowAlpha;alpha=1.-(1.-bodyAlpha)*(1.-glowAlpha);
  fragColor=vec4(clamp(photo(premultiplied/max(alpha,.000001),originalUV)+grain,0.,1.),alpha);
 }else{vec3 color=uPhoto4.y>.5?photo(linear,originalUV):mix(toSRGB(max(vec3(0.),back.rgb)),(photo(surface.rgb,originalUV)+(toSRGB(back.rgb)-photo(back.rgb,originalUV))*(1.-surface.a)),coverage)+toSRGB(glow);fragColor=vec4(clamp(color+grain*(uPhoto4.y>.5?1.:coverage*surface.a),0.,1.),1.);}
 if(uSampling.z>.5){if(transparentExport())fragColor.rgb*=fragColor.a;else fragColor.a=clamp(coverage*surface.a+halo,0.,1.);fragColor*=uSampling.w;}
}
