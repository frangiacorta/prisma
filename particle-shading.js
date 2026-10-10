import {FILM_PATTERN_GLSL} from './solid-renderer.js?v=8613ad610791';
// Particle shading uses Prisma's parameter names. It does not trace solid glass.
export const prismaShadingGLSL=`
${FILM_PATTERN_GLSL}
uniform vec4 uMaterial,uFinish,uEnvironment,uGradient;
uniform vec2 uPearl,uFiberLight;
uniform vec4 uFilmLayer,uParticleFilmMotion,uFilmObject;
uniform vec3 uFilmRotation,uFilmResponse[24],uFilmWhite;
uniform vec4 uColorWave;uniform vec4 uColorWave2;uniform float uColorSoftness;
uniform vec3 uPalette[12];uniform highp int uPaletteCount,uLightCount;
uniform vec4 uLights[8];uniform vec3 uLightColors[8];uniform float uLightSizes[8];
vec3 prismaPalette(vec3 p,vec3 original){
 if(uGradient.w<.5)return original;
 float theta=atan(p.y,p.x),radius=length(p.xy);
 float waves=sin(dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uColorWave.y+uColorWave.z+p.y*uColorWave2.x+radius*uColorWave2.y+theta*uColorWave2.z+sin(p.x*3.+p.y*2.)*uColorWave2.w);
 float t=fract(.5+dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*.22*uGradient.y+uGradient.z+waves*uColorWave.x*.25);
 float index=t*float(uPaletteCount);int a=int(floor(index)),b=(a+1)%uPaletteCount;
 float blend=smoothstep(.5-.5*max(.005,uColorSoftness),.5+.5*max(.005,uColorSoftness),fract(index));
 return mix(uPalette[a],uPalette[b],blend);
}
vec3 reflectedEnvironment(vec3 r,float rough){
 r.xz=mat2(cos(uEnvironment.y),-sin(uEnvironment.y),sin(uEnvironment.y),cos(uEnvironment.y))*r.xz;
 // The studio is neutral so it can be used to judge a chosen palette.
 vec3 low=vec3(.1),high=vec3(.95);
 if(uEnvironment.x>.5&&uEnvironment.x<1.5){low=vec3(.15,.025,.12);high=vec3(1.,.44,.16);}
 else if(uEnvironment.x<2.5&&uEnvironment.x>1.5){low=vec3(.06,.005,.2);high=vec3(.1,.8,1.);}
 else if(uEnvironment.x>2.5&&uEnvironment.x<3.5){low=vec3(.07,.22,.5);high=vec3(.85,.94,1.);}
 else if(uEnvironment.x>3.5&&uEnvironment.x<4.5){low=vec3(.005,.06,.13);high=vec3(.1,.9,.65);}
 else if(uEnvironment.x>4.5&&uEnvironment.x<5.5){low=vec3(.13,.02,.25);high=vec3(.24,1.,.56);}
 else if(uEnvironment.x>5.5){low=vec3(.03,.045,.09);high=vec3(1.,.7,.28);}
 float panel=pow(max(0.,.5+.5*cos(atan(r.x,r.z)*3.)),mix(18.,1.,rough));
 float horizon=smoothstep(-.7,.7,r.y);
 return mix(low,high,.12+.35*horizon+.53*panel)*uEnvironment.z;
}
// Lightweight RGB thin-film approximation on reflected light, not on pigment.
// Angle and optical thickness drive the hue (see KHR_materials_iridescence).
// This is an artistic particle shader, not a spectral multilayer BRDF.
vec3 pearlFresnel(vec3 f0,float cosine,float irid,float rough){
 float f=pow(1.-clamp(cosine,0.,1.),5.);
 vec3 fresnel=f0+(1.-f0)*f;
 float inside=sqrt(max(0.,1.-(1.-cosine*cosine)/(1.33*1.33)));
 vec3 phase=12.5663706*1.33*uPearl.y*inside/vec3(650.,510.,475.)+uPearl.x*6.2831853;
 vec3 spectrum=.5+.5*cos(phase);
 vec3 tint=mix(vec3(1.),.45+1.05*spectrum,irid*(1.-rough*.5));
 return clamp(fresnel*tint,0.,1.);
}
// Reuses Prisma Forme's soapFilm air/water/air interference and its 24 CIE
// samples. This is a coating on the existing particles, not a refracting mesh.
mat2 filmRotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 filmRGB(vec3 xyz){return mat3(3.2406,-.9689,.0557,-1.5372,1.8758,-.204,-.4986,.0415,1.057)*xyz;}
vec3 livingFilm(vec3 world,float facing,float rough){
 vec3 local=(world-vec3(uFilmObject.yz,0.))/max(.001,uFilmObject.x);
 local.xz=filmRotate(-uFilmRotation.y)*local.xz;
 local.yz=filmRotate(-uFilmRotation.x)*local.yz;
 local.xy=filmRotate(-uFilmRotation.z)*local.xy;
 vec3 coatingLocal=local;
 local*=uFilmLayer.y;
 float phase=uParticleFilmMotion.x,flow=uParticleFilmMotion.y,swirl=uParticleFilmMotion.z;
 float angle=atan(local.y,local.x+.000001);
 float variation=.35*sin(local.x*1.7+local.y*2.6)-.12*local.y
   +flow*.45*sin(local.y*4.8+phase+swirl*sin(angle*3.-phase)*1.2)
   +swirl*.3*sin(angle*3.-phase+local.y*2.);
 float thickness=max(20.,uPearl.y*(1.+uFilmLayer.z*variation)+uPearl.x*100.);
 thickness=coatingThickness(coatingLocal,phase,flow,swirl,uPearl.y,thickness);
 float ci=clamp(facing,.001,1.),n1=1.333,c1=sqrt(max(.001,1.-(1.-ci*ci)/(n1*n1)));
 vec2 r01=vec2((ci-n1*c1)/(ci+n1*c1),(n1*ci-c1)/(n1*ci+c1)),r12=-r01,product=r01*r12;
 vec3 xyz=vec3(0.);
 for(int j=0;j<24;j++){
   float wavelength=390.+float(j)*15.,interference=cos(12.5663706144*n1*thickness*c1/wavelength);
   vec2 reflection=(r01*r01+r12*r12+2.*product*interference)/(vec2(1.)+product*product+2.*product*interference);
   xyz+=uFilmResponse[j]*dot(reflection,vec2(.5));
 }
 vec3 film=clamp(filmRGB(xyz)/max(vec3(.001),filmRGB(uFilmWhite)),0.,1.);
 // Rough surfaces soften the hue contrast while preserving reflected energy.
 film=coatingContrast(film);
 return mix(film,vec3(dot(film,vec3(.2126,.7152,.0722))),rough*rough*.7);
}
vec3 shadeMatter(vec3 base,vec3 p,vec3 n,vec3 tangent,float silk){
 float metal=uMaterial.x,rough=max(.04,uMaterial.y),gloss=uMaterial.z,irid=uMaterial.w;
 vec3 view=normalize(vec3(0.,0.,7.5)-p);if(dot(n,view)<0.)n=-n;
 float facing=clamp(dot(n,view),.001,1.);
 vec3 f0=mix(vec3(.04),clamp(base,0.,1.),metal);
 vec3 reflection=reflectedEnvironment(reflect(-view,n),rough);
 vec3 fresnel=pearlFresnel(f0,facing,irid,rough);
 vec3 film=vec3(0.);float coating=uFilmLayer.x;
 if(coating>0.)film=livingFilm(p,facing,rough);
 fresnel=mix(fresnel,film,coating);
 // Artistic strand reflection: the local 3D tangent determines the cylinder
 // normal and the elongated highlight. This changes reflected light only.
 if(silk>0.){
   vec3 radial=view-tangent*dot(view,tangent);float radialLength=length(radial);
   vec3 strandNormal=radialLength>.0001?radial/radialLength:n;
   float strandRough=mix(rough,1.,uFiberLight.y*.65);
   vec3 strandReflection=reflectedEnvironment(reflect(-view,strandNormal),strandRough);
   vec3 strandFresnel=pearlFresnel(f0,clamp(dot(strandNormal,view),.001,1.),irid,rough);
   strandFresnel=mix(strandFresnel,film,coating);
   reflection=mix(reflection*fresnel,strandReflection*strandFresnel,silk);
   fresnel=vec3(1.);
 }
 vec3 lit=base*(uFinish.x+(1.-metal)*uEnvironment.z*.22)*uFinish.z+reflection*fresnel*gloss;
 float shininess=mix(180.,2.,rough*rough);
 for(int i=0;i<8;i++){
   if(i>=uLightCount)break;
   vec3 delta=uLights[i].xyz-p;float distance2=max(.01,dot(delta,delta));vec3 l=normalize(delta);
   float spread=uLightSizes[i]/sqrt(distance2);
   float diffuse=clamp((dot(n,l)+spread)/(1.+spread),0.,1.);
   vec3 halfVector=normalize(l+view);
   float spec=pow(max(0.,dot(n,halfVector)),max(2.,shininess/(1.+spread*4.)));
   if(silk>0.){
     float along=clamp(dot(tangent,halfVector),-1.,1.);
     float exponent=exp2(mix(8.,1.5,uFiberLight.y))*(1.-rough*rough*.85);
     float strandSpec=pow(sqrt(max(0.,1.-along*along)),max(2.,exponent/(1.+spread*4.)));
     spec=mix(spec,strandSpec,silk);
   }
   vec3 power=uLightColors[i]*uLights[i].w/(1.+distance2*.045);
   vec3 specular=pearlFresnel(f0,max(0.,dot(view,halfVector)),irid,rough);
   specular=mix(specular,film,coating);
   lit+=power*(base*diffuse*(1.-metal)*.7*uFinish.z+specular*spec*gloss*2.);
 }
 // Unlit is a usable palette view even with emission at zero.
 return mix(base*uFinish.z,lit,uFinish.y);
}
vec3 shadeParticle(vec3 base,vec3 p,vec3 n){return shadeMatter(base,p,n,vec3(0.),0.);}
vec3 shadeFibre(vec3 base,vec3 p,vec3 n,vec3 direction){
 float distance=length(direction);
 if(uFiberLight.x<=0.||distance<.000001)return shadeParticle(base,p,n);
 return shadeMatter(base,p,n,direction/distance,uFiberLight.x);
}
`;
