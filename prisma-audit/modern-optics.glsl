// Procedural HDR rooms: an independent lighting environment, never a bitmap.
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

// Fresnel stays achromatic. The film is evaluated exactly once, at the outer skin.
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
   +swirl*.17*sin(angle*3.-phase+local.y*2.));
 float n1=1.333,n2=uModern.x>.5?1.:mix(max(1.001,uMat.y),2.2,uMat.z*.55);
 float ci=max(.001,facing),c1=sqrt(max(.001,1.-(1.-ci*ci)/(n1*n1))),c2=sqrt(max(.001,1.-(1.-ci*ci)/(n2*n2)));
 vec2 r01=vec2((ci-n1*c1)/(ci+n1*c1),(n1*ci-c1)/(n1*ci+c1));
 vec2 r12=vec2((n1*c1-n2*c2)/(n1*c1+n2*c2),(n2*c1-n1*c2)/(n2*c1+n1*c2));
 vec3 xyz=vec3(0.),white=vec3(0.);
 for(int j=0;j<12;j++){
  float wavelength=390.+float(j)*30.,interference=cos(4.*PI*n1*max(20.,thickness)*c1/wavelength);
  vec2 product=r01*r12,reflection=(r01*r01+r12*r12+2.*product*interference)/(vec2(1.)+product*product+2.*product*interference);
  vec3 response=cie(wavelength);xyz+=response*dot(reflection,vec2(.5));white+=response;
 }
 return clamp(xyzRGB(xyz)/max(vec3(.001),xyzRGB(white)),0.,1.);
}

vec3 absorptionCoefficient(vec3 tint){
 return (vec3(uOptics.z*.7)+(vec3(1.)-uInternalColor)*uOptics.w*1.7
   +(vec3(1.)-uSssColor)*uTransport.x*.16/max(.08,uTransport.y))*max(.001,uSurface.y);
}

// Area lights and true omnidirectional luminous spheres, including sources inside solids.
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

// A bounded diffusion approximation driven by measured geometry; glossy reflection is separate.
vec3 subsurfaceLight(vec3 p,vec3 n,vec3 tint){
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
}

vec4 terminalScene(vec3 origin,vec3 direction,float rough){
 float unused;vec4 scene=sceneRay(origin,direction,unused);
 if(rough>.04){float spread=rough*rough*.2;vec3 tangent=normalize(cross(direction,abs(direction.y)>.98?vec3(1,0,0):vec3(0,1,0))),up=cross(direction,tangent);
  vec4 average=sceneRay(origin,normalize(direction+tangent*spread),unused)+sceneRay(origin,normalize(direction-tangent*spread),unused)+sceneRay(origin,normalize(direction+up*spread),unused)+sceneRay(origin,normalize(direction-up*spread),unused);
  scene=mix(scene,average*.25,min(1.,rough));
 }
 if(uBgMode!=2.)scene.rgb+=environment(direction,origin,rough)*uEnvironment.w*(1.-scene.a);
 return scene;
}

vec4 shade(vec3 p,vec3 geometricNormal,vec3 rd,bool hit,out float issue){
 issue=0.;vec3 local=transform(p),n=geometricNormal;
 float filter=1.-smoothstep(.28,.65,84.*3.4/min(uResolution.x,uResolution.y)/(2.*PI));
 if(uTexture.z>.001)n=normalize(n+vec3(sin(local.y*84.),cos(local.x*71.),sin(local.z*69.))*uTexture.z*.045*filter);
 float facing=max(dot(n,-rd),0.),pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
 vec3 base=palette(pos),specular=environment(reflect(rd,n),p,uMat.w);
 vec3 dielectricF=fresnel(facing,1.,max(1.001,uMat.y),local),diffuseLight=environment(n,p,1.)*.14;
 for(int i=0;i<uLightCount;i++){
  vec3 off=uLights[i].xyz-p;float cosine=max(dot(n,normalize(off)),0.);
  diffuseLight+=uLightColors[i]*cosine*uLights[i].w*.35/(1.+dot(off,off)*.08);
 }
 vec3 diffuse=base*diffuseLight;
 if(uTransport.x>.001)diffuse=mix(diffuse,subsurfaceLight(p,geometricNormal,base),uTransport.x);
 float transmission=clamp(uMat.x,0.,1.);vec4 glass=vec4(0.);float unused;
 if(transmission>.0001){
  if(uModern.x>.001||!hit){
   glass=sceneRay(vec3(p.xy,4.8),rd,unused);
   vec3 beta=exp(-absorptionCoefficient(base)*max(.003,wallDepth())*4./max(.1,facing));
   glass.rgb*=beta;glass.a=1.-min(min(beta.r,beta.g),beta.b)*(1.-glass.a);
  }else{
   #if DISPERSION_ENABLED
   vec3 spectrum=vec3(0.);float alpha=0.,ior=max(1.,uMat.y);
   for(int k=0;k<5;k++){
    float wavelength=k==0?.650:k==1?.580:k==2?.510:k==3?.475:.435;
    vec3 weight=k==0?vec3(.65,0,0):k==1?vec3(.28,.18,0):k==2?vec3(.07,.65,.12):k==3?vec3(0,.17,.58):vec3(0,0,.30);
    float status;vec4 sample=transmitted(p,geometricNormal,rd,base,vec3(1.),max(1.,ior+uOptics.y*.024*(1./(wavelength*wavelength)-1./(.510*.510))),status);
    spectrum+=sample.rgb*weight;alpha=max(alpha,sample.a);issue=max(issue,status);
   }
   glass=vec4(spectrum,alpha);
   #else
   glass=transmitted(p,geometricNormal,rd,base,vec3(1.),max(1.,uMat.y),issue);
   #endif
   // The ray solver already contains the entry reflection. Account for it once in the surface stack.
   glass.rgb=max(vec3(0.),glass.rgb-specular*dielectricF);
   glass.a=clamp((glass.a-max(max(dielectricF.r,dielectricF.g),dielectricF.b))/max(.001,1.-dielectricF.r),0.,1.);
  }
 }
 vec3 below=(vec3(1.)-dielectricF)*diffuse*(1.-transmission)+glass.rgb*transmission;
 float alpha=(1.-transmission)+glass.a*transmission;
 vec3 surfaceF=dielectricF*max(.1,uSurface.z);
 if(uModern.x>.5)surfaceF=vec3(0.);
 below+=specular*surfaceF;alpha=1.-(1.-alpha)*(1.-max(max(surfaceF.r,surfaceF.g),surfaceF.b));
 // A thin conductive coating preserves transmission underneath, while opaque metal stays a conductor.
 vec3 metalF=mix(base,vec3(1.),pow(1.-facing,5.))*uMat.z*(1.-transmission*.48);
 below=below*(vec3(1.)-metalF)+specular*metalF;
 alpha=1.-(1.-alpha)*(1.-max(max(metalF.r,metalF.g),metalF.b));
 float filmAmount=max(uScatter.z,uSurface.x*.8);vec3 filmF=soapFilm(local,facing)*filmAmount;
 below=below*(vec3(1.)-filmF)+environment(reflect(rd,n),p,uMat.w)*filmF;
 alpha=1.-(1.-alpha)*(1.-max(max(filmF.r,filmF.g),filmF.b));
 if(uCoat.x>.001){vec3 coatF=fresnel(facing,1.,1.5,local)*uCoat.x;
  below=below*(vec3(1.)-coatF)+environment(reflect(rd,n),p,uCoat.y)*coatF;
  alpha=1.-(1.-alpha)*(1.-max(max(coatF.r,coatF.g),coatF.b));
 }
 below+=base*uSurface.w*(1.-transmission+transmission*pow(1.-facing,3.));
 return vec4(below,clamp(alpha,0.,1.));
}

vec3 filmic(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 photo(vec3 radiance,vec2 uv){
 vec3 c=toSRGB(filmic(max(vec3(0.),radiance*exp2(uPhoto1.x))));
 c+=uPhoto1.y;float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,uPhoto1.w);c=(c-.5)*uPhoto1.z+.5;
 c+=uPhoto3.x*pow(max(0.,1.-lum),2.)+uPhoto3.y*pow(max(0.,lum),2.);
 c*=vec3(1.+uPhoto2.x*.18+uPhoto2.y*.08,1.-uPhoto2.y*.14,1.-uPhoto2.x*.18+uPhoto2.y*.08);
 c=pow(max(c,vec3(0.)),vec3(1./uPhoto4.x));return c*(1.-uPhoto2.z*smoothstep(.3,2.4,length(uv)));
}
