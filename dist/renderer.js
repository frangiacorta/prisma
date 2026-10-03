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
in vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const FRAG=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uResolution;
uniform vec4 uShape,uWarp,uVoid,uCut,uMat,uSurface,uGradient,uFrame,uOther;
uniform vec4 uExtraShape,uExtraShape2,uExtraShape3,uCoat,uOptics,uTexture,uPhoto1,uPhoto2,uPhoto3,uPhoto4;
uniform vec4 uInterior,uScatter;
uniform vec3 uPalette[12],uBg,uBg2;
uniform vec4 uLights[8],uLightProps[8],uLightExtra[8];
uniform vec3 uLightColors[8];
uniform int uPaletteCount,uLightCount;
uniform float uBgMode,uBgAngle,uSeed;
const float PI=3.14159265359;
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 transform(vec3 p){p.xy-=uFrame.yz;p/=uFrame.x;p.xy=rot(uExtraShape3.z)*p.xy;p.xz=rot(uOther.x)*p.xz;p.yz=rot(uOther.y)*p.yz;return p;}
float smax(float a,float b,float k){if(k<.0001)return max(a,b);float h=max(k-abs(a-b),0.)/k;return max(a,b)+h*h*k*.25;}
float field(vec3 world){
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
 if(uVoid.x>.001)d=smax(d,-inner,uExtraShape2.w);
 if(uCut.x>.001)d=smax(d,uCut.x-length((p.xy-uCut.yz)/vec2(uExtraShape3.y,1.)),uExtraShape2.w);
 return d*min(min(uShape.y,uShape.z),volume)*uFrame.x*.5;
}
// The cavity is an inward offset of the same field, including all cuts and deformations.
float wallDepth(){return mix(1.,uInterior.y,uInterior.x)*min(min(uShape.y,uShape.z),max(.06,uShape.x*uShape.w))*uFrame.x*.5;}
bool hasCavity(){return uInterior.x*(1.-uInterior.y)>.0001;}
float materialField(vec3 p){float d=field(p);return hasCavity()?max(d,-d-wallDepth()):d;}
float rayEpsilon(){return min(.00045,max(.000008,wallDepth()*.045));}
vec3 surfaceNormal(vec3 p){float e=.001;vec3 n=vec3(field(p+vec3(e,0,0))-field(p-vec3(e,0,0)),field(p+vec3(0,e,0))-field(p-vec3(0,e,0)),field(p+vec3(0,0,e))-field(p-vec3(0,0,e)));return length(n)>.000001?normalize(n):vec3(0,0,1);}
vec3 boundaryNormal(vec3 p){vec3 n=surfaceNormal(p);float d=field(p);return hasCavity()&&-d-wallDepth()>d?-n:n;}
float ellipsoidIntersection(vec3 origin,vec3 direction,float radius){
 vec3 axes=vec3(uShape.y,uShape.z,max(.06,uShape.x*uShape.w));vec3 o=transform(origin)/axes,d=(transform(origin+direction)-transform(origin))/axes;
 float a=dot(d,d),b=dot(o,d),disc=b*b-a*(dot(o,o)-radius*radius);if(disc<0.)return 100.;
 float root=sqrt(disc),t0=(-b-root)/a,t1=(-b+root)/a,eps=rayEpsilon();return t0>eps?t0:t1>eps?t1:100.;
}
bool nextBoundary(vec3 origin,vec3 direction,out vec3 point,out float travel){
 float t=0.,eps=rayEpsilon();
 if(uScatter.y>.5){t=ellipsoidIntersection(origin,direction,1.);if(hasCavity())t=min(t,ellipsoidIntersection(origin,direction,uInterior.x*(1.-uInterior.y)));travel=t;point=origin+direction*t;return t<99.;}
 for(int j=0;j<96;j++){point=origin+direction*t;float d=abs(materialField(point));if(j>0&&d<eps){travel=t;return true;}t+=max(d*.86,eps*.65);if(t>12.)break;}
 travel=t;point=origin+direction*t;return false;
}
vec3 palette(float t){float v=fract(t)*float(uPaletteCount);int i=int(floor(v));int j=(i+1)%uPaletteCount;float f=fract(v),width=max(.012,uGradient.w);f=smoothstep(.5-width*.5,.5+width*.5,f);return mix(uPalette[i],uPalette[j],f);}
vec3 bg(vec2 uv){float t=dot(uv,vec2(cos(uBgAngle),sin(uBgAngle)))*.35+.5;return mix(uBg,uBg2,uBgMode==1.?clamp(t,0.,1.):0.);}
float fixture(vec2 q,vec4 props,vec4 extra){float width=max(.04,props.x),height=max(.04,props.y),soft=max(.015,extra.x);float d;
 if(props.w<.5){d=length(q/width)-1.;return 1.-smoothstep(-soft,soft,d);}
 if(props.w<1.5){d=max(abs(q.x)/width,abs(q.y)/height)-1.;return 1.-smoothstep(-soft,soft,d);}
 if(props.w<2.5){d=length(q)/max(.06,extra.y);return pow(max(0.,1.-d*d),mix(6.,.7,soft));}
 if(props.w<3.5){return exp(-dot(q/vec2(width,height),q/vec2(width,height))*mix(2.5,.6,soft));}
 if(props.w<4.5){float box=1.-smoothstep(-soft,soft,max(abs(q.x)/width,abs(q.y)/height)-1.);vec2 wave=abs(sin(q/vec2(width,height)*extra.z*PI*.5));float lattice=smoothstep(.25,.55,wave.x)*smoothstep(.25,.55,wave.y);return box*lattice;}
 d=abs(length(q/width)-.8);return 1.-smoothstep(.05,.08+soft*.35,d);
}
vec3 envLight(vec3 r,vec3 p,int i,float rough){vec3 offset=uLights[i].xyz-p;float distance=max(.25,length(offset));vec3 ld=offset/distance;float facing=dot(r,ld);if(facing<=.01)return vec3(0.);vec3 right=normalize(cross(abs(ld.y)>.98?vec3(1.,0.,0.):vec3(0.,1.,0.),ld));vec3 up=cross(ld,right);vec2 q=vec2(dot(r,right),dot(r,up))/max(.1,facing)*distance;q=rot(uLightProps[i].z)*q;
 float aniso=uTexture.x;vec2 anis=rot(uTexture.y)*q;anis.x*=1.-aniso*.75;anis.y*=1.+aniso*.6;q=mix(q,anis,aniso);
 vec4 props=uLightProps[i];props.xy+=rough*.85;vec4 extra=uLightExtra[i];extra.x=clamp(extra.x+rough*.5,.01,1.);if(props.w>1.5&&props.w<2.5)q/=distance;
 float attenuation=1./(1.+distance*distance*.025);return uLightColors[i]*uLights[i].w*fixture(q,props,extra)*attenuation*1.5;
}
vec3 environment(vec3 r,vec3 p,float rough){vec3 col=vec3(.012,.017,.032);for(int i=0;i<8;i++){if(i>=uLightCount)break;col+=envLight(r,p,i,rough);}return col;}
// Area sources also exist in the scene. The same ray sees them outside or through the object.
vec4 sceneEmitters(vec3 origin,vec3 direction,float maximum,out float nearest){
 vec3 col=vec3(0.);float coverage=0.;nearest=100.;
 for(int i=0;i<8;i++){if(i>=uLightCount)break;if(uLightExtra[i].w<.5||uLights[i].w<.001)continue;
  vec3 center=uLights[i].xyz,normal=length(center)>.001?normalize(center):vec3(0,0,1);float den=dot(direction,normal);if(abs(den)<.0001)continue;
  float t=dot(center-origin,normal)/den;if(t<.001||t>=maximum)continue;
  vec3 right=normalize(cross(abs(normal.y)>.98?vec3(1,0,0):vec3(0,1,0),normal)),up=cross(normal,right),off=origin+direction*t-center;
  vec2 q=rot(uLightProps[i].z)*vec2(dot(off,right),dot(off,up));vec4 props=uLightProps[i];if(props.w>1.5&&props.w<2.5)props.w=0.;
  float mask=fixture(q,props,uLightExtra[i]);if(mask<.001)continue;vec3 radiance=uLightColors[i]*uLights[i].w*1.5;
  if(t<nearest)col=col*(1.-mask)+radiance*mask;else col+=radiance*mask*(1.-coverage);
  coverage=1.-(1.-coverage)*(1.-mask);nearest=min(nearest,t);
 }
 return vec4(col,coverage);
}
vec4 sceneRay(vec3 origin,vec3 direction,out float nearest){
 float planeT=(-6.-origin.z)/(abs(direction.z)>.001?direction.z:-.001);vec2 coords=(origin+direction*max(0.,planeT)).xy;
 vec3 back=uBgMode==2.?vec3(0.):bg(coords);vec4 emitters=sceneEmitters(origin,direction,100.,nearest);
 return vec4(emitters.rgb+back*(1.-emitters.a),emitters.a);
}
vec3 interfaceReflectance(float cosine,float ior,vec3 local){
 if(ior<1.00001)return vec3(0.);
 float f0=pow((ior-1.)/(ior+1.),2.);float f=clamp((f0+(1.-f0)*pow(1.-abs(cosine),5.))*uCoat.z,0.,1.);
 float film=uScatter.w*(1.+sin(local.y*2.6+local.x*1.7)*.17+uCoat.w*.4);
 vec3 interference=.5+.5*cos(4.*PI*ior*film*max(.08,abs(cosine))/vec3(650.,510.,475.));
 return mix(vec3(f),clamp(vec3(f)*(.35+interference*1.65),0.,1.),uScatter.z);
}
vec3 scatteredLight(vec3 p,vec3 rd,vec3 tint){
 vec3 light=vec3(.07);float g=uScatter.x;
 for(int i=0;i<8;i++){if(i>=uLightCount)break;vec3 off=uLights[i].xyz-p;float dist=max(.05,length(off));float cosine=dot(off/dist,rd);float phase=(1.-g*g)/pow(max(.04,1.+g*g-2.*g*cosine),1.5);light+=uLightColors[i]*uLights[i].w*min(8.,phase)*.22/(1.+dist*dist*.15);}
 return light*mix(vec3(1.),tint,.65*uOptics.w);
}
vec4 transmitted(vec3 p,vec3 n,vec3 rd,vec3 tint,vec3 irid){
 float ior=max(1.,uMat.y),eps=rayEpsilon();vec3 frontF=interfaceReflectance(dot(n,-rd),ior,transform(p));
 vec3 throughput=vec3(1.)-frontF;vec3 reflection=environment(reflect(rd,n),p,uMat.w)*frontF*uSurface.z*mix(vec3(1.),irid,uSurface.x*.55);
 vec3 direction=refract(rd,n,1./ior);if(length(direction)<.001)direction=reflect(rd,n);
 vec3 origin=p-n*eps*5.;bool inMaterial=true,escaped=false;float distanceInMaterial=0.;vec3 middle=p;
 // Entry, inner wall, opposite inner wall and exit are traced in three dimensions.
 for(int bounce=0;bounce<6;bounce++){
  vec3 nextPoint;float travel;if(!nextBoundary(origin,direction,nextPoint,travel)){escaped=!inMaterial;break;}
  if(inMaterial){distanceInMaterial+=travel;middle=(origin+nextPoint)*.5;}
  vec3 outward=boundaryNormal(nextPoint),normal=inMaterial?-outward:outward;float eta=inMaterial?ior:1./ior;
  vec3 nextDirection=refract(direction,normal,eta);vec3 f=interfaceReflectance(dot(normal,-direction),ior,transform(nextPoint));
  if(length(nextDirection)<.001){direction=reflect(direction,normal);origin=nextPoint+(inMaterial?-outward:outward)*eps*5.;continue;}
  reflection+=throughput*f*environment(reflect(direction,normal),nextPoint,uMat.w)*uSurface.z*.6;throughput*=vec3(1.)-f;
  direction=normalize(nextDirection);inMaterial=!inMaterial;origin=nextPoint+(inMaterial?-outward:outward)*eps*5.;
  if(!inMaterial&&field(origin)>0.){escaped=true;break;}
 }
 if(!escaped)throughput=vec3(0.);
 float opticalLength=distanceInMaterial*max(.01,uSurface.y);
 vec3 extinction=vec3(uOptics.z*.7)+(vec3(1.)-tint)*uOptics.w*1.7;
 throughput*=exp(-extinction*opticalLength);
 float nearest;vec4 behind=sceneRay(origin,direction,nearest);
 if(uOptics.y>.001){float shift=uOptics.y*.045*min(2.,distanceInMaterial);float unused;vec3 right=normalize(cross(direction,abs(direction.y)>.98?vec3(1,0,0):vec3(0,1,0)));vec4 red=sceneRay(origin,normalize(direction+right*shift),unused),blue=sceneRay(origin,normalize(direction-right*shift),unused);behind.rgb=vec3(red.r,behind.g,blue.b);behind.a=max(behind.a,max(red.a,blue.a));}
 if(uMat.w>.045){float spread=uMat.w*uMat.w*.3;float unused;vec4 blur=sceneRay(origin,normalize(direction+vec3(spread,0,0)),unused)+sceneRay(origin,normalize(direction-vec3(spread,0,0)),unused)+sceneRay(origin,normalize(direction+vec3(0,spread,0)),unused)+sceneRay(origin,normalize(direction-vec3(0,spread,0)),unused);behind=mix(behind,blur*.25,min(1.,uMat.w*1.8));}
 float diffusion=1.-exp(-uInterior.w*opticalLength*4.);diffusion=1.-(1.-diffusion)*(1.-uInterior.z);
 vec3 scatter=scatteredLight(middle,rd,tint);vec3 color=throughput*mix(behind.rgb,scatter,diffusion)+reflection;
 float clearThrough=dot(throughput,vec3(.2126,.7152,.0722))*(1.-diffusion);
 float alpha=clamp(1.-clearThrough*(1.-behind.a),0.,1.);
 return vec4(color,alpha);
}
vec4 shade(vec3 p,vec3 n,vec3 rd,vec2 uv){
 vec3 local=transform(p);if(uTexture.z>.001)n=normalize(n+vec3(sin(local.y*84.),cos(local.x*71.),sin(local.z*69.))*uTexture.z*.045);
 float facing=max(dot(n,-rd),0.),fres=pow(1.-facing,3.)*uCoat.z;
 float pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
 vec3 base=palette(pos),irid=palette(pos+(fres*.55+n.x*.16+uSurface.y*.15)*uOptics.x+uCoat.w);base=mix(base,irid,uSurface.x);
 vec3 diffuse=vec3(.22);for(int i=0;i<8;i++){if(i>=uLightCount)break;vec3 off=uLights[i].xyz-p;diffuse+=uLightColors[i]*max(dot(n,normalize(off)),0.)*uLights[i].w*.34/(1.+dot(off,off)*.025);}
 vec3 reflectDir=reflect(rd,n),reflection=environment(reflectDir,p,uMat.w);
 vec3 chroma=mix(vec3(.8),irid,.68*uSurface.x+.24*uMat.z);
 vec3 opaque=base*diffuse*(1.-uMat.z*.85)+reflection*chroma*(.28+uMat.z*.85)*uSurface.z;
 opaque+=irid*fres*(.12+uSurface.x*.65);
 float transmission=(uMat.x+(1.-uMat.x)*uInterior.z)*(1.-uMat.z);vec4 glass=vec4(opaque,1.);
 if(transmission>.001)glass=transmitted(p,n,rd,base,irid);
 vec3 color=mix(opaque,glass.rgb,transmission);float materialAlpha=mix(1.,glass.a,transmission);
 if(uCoat.x>.001)color+=environment(reflectDir,p,uCoat.y)*uCoat.x*(.16+fres*.5);
 color+=base*uSurface.w*(.35+fres*1.8);materialAlpha=clamp(materialAlpha+uCoat.x*.05+uSurface.w*.35,0.,1.);if(uSurface.z<.05&&transmission<.05)color=mix(color,base,.75);return vec4(color,materialAlpha);
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
vec3 photo(vec3 c,vec2 uv){c*=exp2(uPhoto1.x);c+=uPhoto1.y;float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,uPhoto1.w);c=(c-.5)*uPhoto1.z+.5;c+=uPhoto3.x*pow(max(0.,1.-lum),2.)+uPhoto3.y*pow(max(0.,lum),2.);c*=vec3(1.+uPhoto2.x*.18+uPhoto2.y*.08,1.-uPhoto2.y*.14,1.-uPhoto2.x*.18+uPhoto2.y*.08);c=pow(max(c,vec3(0.)),vec3(1./uPhoto4.x));c*=1.-uPhoto2.z*smoothstep(.3,2.4,length(uv));return c;}
void main(){
 vec2 originalUV=(gl_FragCoord.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;
 vec2 uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);
 vec3 ro=vec3(uv,4.8),rd=vec3(0.,0.,-1.);float t=0.,closest=10.;vec3 nearPoint=ro,p=ro;bool hit=false;
 if(uScatter.y>.5){
  t=ellipsoidIntersection(ro,rd,1.);hit=t<99.;p=ro+rd*t;
  vec3 axes=vec3(uShape.y,uShape.z,max(.06,uShape.x*uShape.w)),o=transform(ro)/axes,d=(transform(ro+rd)-transform(ro))/axes;
  nearPoint=ro+rd*max(0.,-dot(o,d)/dot(d,d));closest=hit?0.:max(0.,field(nearPoint));
 }else for(int i=0;i<144;i++){p=ro+rd*t;float d=field(p);if(d<closest){closest=d;nearPoint=p;}if(d<rayEpsilon()){hit=true;break;}t+=max(d*.86,rayEpsilon()*.65);if(t>9.6)break;}
 float soft=uCut.w*.44,alpha=hit?1.:exp(-max(closest,0.)/max(.002,soft));
 float halo=hit?0.:exp(-max(closest,0.)/max(.008,.035+uOther.w*.16))*uOther.w*(.12+uSurface.w*.38);vec3 color=vec3(0.);float materialAlpha=1.;
 if(hit||alpha>.002){if(!hit)p=nearPoint;vec3 n=surfaceNormal(p);vec4 surface=shade(p,n,rd,uv);color=surface.rgb;materialAlpha=surface.a;if(soft>.005&&hit)alpha*=1.-pow(1.-abs(dot(n,rd)),3.)*min(.7,soft*3.);}
 float flatBlend=(1.-smoothstep(.1,.45,uShape.x))*(1.-uSurface.z);
 if(flatBlend>.001){vec3 fp=transform(vec3(uv,0.));float normalization=max(.025,min(min(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*.5);float flatD=field(vec3(uv,0.))/normalization;float width=max(.008,uCut.w*1.6);float flatAlpha=1.-smoothstep(-width,width,flatD);vec3 flatColor=palette(dot(fp.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uGradient.y*.3+uGradient.z);color=mix(color,flatColor,flatBlend);alpha=mix(alpha,flatAlpha,flatBlend);materialAlpha=mix(materialAlpha,1.,flatBlend);halo*=1.-flatBlend;}
 float nearest;vec4 backgroundScene=sceneRay(ro,rd,nearest);vec3 back=backgroundScene.rgb;
 // A source in front occludes the object; a source behind is reached only by transmitted rays.
 if(hit){float unused;vec4 foreground=sceneEmitters(ro,rd,t,unused);color=color*(1.-foreground.a)+foreground.rgb;materialAlpha=materialAlpha*(1.-foreground.a)+foreground.a;}
 vec3 glow=palette(atan(uv.y,uv.x)/(2.*PI)+.5)*halo;
 vec3 mapped=color/(vec3(1.)+color*.28),mappedBack=back/(vec3(1.)+back*.28);
 float grain=(hash(floor(gl_FragCoord.xy/max(.5,uPhoto3.z))+uSeed)-.5)*uFrame.w;
 if(uBgMode==2.){
  float a=clamp(materialAlpha*alpha+backgroundScene.a*(1.-alpha)+halo,0.,1.);
  vec3 premultiplied=mapped*alpha+mappedBack*(1.-alpha)+glow;
  vec3 straight=premultiplied/max(a,.00001);fragColor=vec4(clamp(photo(straight,originalUV)+grain,0.,1.),a);
 }else{
  vec3 result;if(uPhoto4.y>.5)result=photo(mix(mappedBack,mapped,alpha)+glow,originalUV);else result=mix(mappedBack,photo(mapped,originalUV),alpha)+glow;
  result+=grain*(uPhoto4.y>.5?1.:alpha*materialAlpha);fragColor=vec4(clamp(result,0.,1.),1.);
 }
}`;
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
export class Renderer{
 constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('Questo browser non supporta WebGL 2. Prova un browser aggiornato con accelerazione grafica attiva.');this.gl=gl;const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};const p=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,VERT),fs=shader(gl.FRAGMENT_SHADER,FRAG);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));gl.deleteShader(vs);gl.deleteShader(fs);this.program=p;gl.useProgram(p);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const at=gl.getAttribLocation(p,'aPosition');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);this.locations={};for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p,i);this.locations[u.name.replace('[0]','')]=gl.getUniformLocation(p,u.name)}this.maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_TEXTURE_SIZE),4096)}
 draw(source,phase=0,width=this.canvas.width,height=this.canvas.height){const s=sampleFrame(source,phase),c=this.canvas,g=this.gl;if(c.width!==width||c.height!==height){c.width=width;c.height=height}g.viewport(0,0,width,height);g.useProgram(this.program);const u=(name,v)=>g['uniform'+v.length+'fv'](this.locations[name],v),f=(name,v)=>g.uniform1f(this.locations[name],v),rad=Math.PI/180;
 u('uResolution',[width,height]);u('uShape',[s.volume,s.stretchX,s.stretchY,s.stretchZ]);u('uWarp',[s.deform,s.asymmetry,s.twist,s.waveScale]);u('uVoid',[s.hole,s.holeX,s.holeY,s.holeShape]);u('uCut',[s.cut,s.cutX,s.cutY,s.edge]);u('uMat',[s.transparency,s.refraction,s.metal,s.roughness]);u('uSurface',[s.iridescence,s.thickness,s.gloss,s.emission]);u('uGradient',[s.gradientAngle*rad,s.gradientScale,s.gradientOffset,s.colorSoftness]);u('uFrame',[s.scale,s.positionX,s.positionY,s.grain]);u('uOther',[s.rotateY*rad,s.rotateX*rad,s.waves,s.glow]);u('uExtraShape',[s.roundness||0,s.taper||0,s.bendX||0,s.bendY||0]);u('uExtraShape2',[s.lobeAmount||0,s.lobes||5,s.pinch||0,s.rimRound||0]);u('uExtraShape3',[s.holeAspect||1,s.cutAspect||1,(s.rotateZ||0)*rad,0]);u('uCoat',[s.coat||0,s.coatRoughness||.1,s.fresnel??1,s.iridShift||0]);u('uOptics',[s.iridScale||1,s.dispersion||0,s.absorption||0,s.tintStrength??.15]);u('uTexture',[s.anisotropy||0,(s.anisotropyAngle||0)*rad,s.surfaceTexture||0,0]);
 const analytic=!['deform','asymmetry','twist','waves','hole','cut','roundness','taper','bendX','bendY','lobeAmount','pinch'].some(k=>Math.abs(s[k]||0)>.000001);
 u('uInterior',[s.hollow||0,s.wallThickness??.08,s.translucency||0,s.scattering||0]);u('uScatter',[s.scatterDirection??.25,+analytic,s.thinFilm||0,s.filmThickness??420]);
 u('uPhoto1',[s.exposure||0,s.brightness||0,s.contrast??1,s.saturation??1]);u('uPhoto2',[s.temperature||0,s.photoTint||0,s.vignette||0,s.lensDistortion||0]);u('uPhoto3',[s.blacks||0,s.highlights||0,s.grainSize||1,0]);u('uPhoto4',[s.gamma||1,+!!s.photoAll,0,0]);
 const palette=s.palette.slice(0,12);while(palette.length<12)palette.push(palette[palette.length-1]||'#ffffff');g.uniform3fv(this.locations.uPalette,palette.flatMap(rgb));g.uniform1i(this.locations.uPaletteCount,Math.max(1,Math.min(12,s.palette.length)));
 const active=s.lights.filter(l=>l.enabled).slice(0,8),pos=[],colors=[],props=[],extra=[];const types={circle:0,bar:1,spot:2,diffuser:3,grid:4,ring:5};for(let i=0;i<8;i++){const l=active[i];pos.push(...(l?[l.x,l.y,l.z,l.power]:[0,0,0,0]));colors.push(...rgb(l?.color||'#000000'));props.push(...(l?[l.size,l.length,l.roll*rad,types[l.type]??0]:[1,1,0,0]));extra.push(...(l?[l.softness,Math.tan(l.cone*rad),l.grid,+!!l.visible]:[.3,1,4,0]))}g.uniform4fv(this.locations.uLights,pos);g.uniform3fv(this.locations.uLightColors,colors);g.uniform4fv(this.locations.uLightProps,props);g.uniform4fv(this.locations.uLightExtra,extra);g.uniform1i(this.locations.uLightCount,active.length);
 u('uBg',rgb(s.background));u('uBg2',rgb(s.background2));f('uBgMode',{solid:0,gradient:1,transparent:2}[s.bgMode]);f('uBgAngle',s.bgAngle*rad);f('uSeed',(s.seed%1000)*.013);g.drawArrays(g.TRIANGLES,0,3)}
 pixels(){const {gl,canvas}=this,raw=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);const flipped=new Uint8Array(raw.length),row=canvas.width*4;for(let y=0;y<canvas.height;y++)flipped.set(raw.subarray(y*row,(y+1)*row),(canvas.height-y-1)*row);return flipped}
 dispose(){this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext()}
}
