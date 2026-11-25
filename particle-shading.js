import {FILM_PATTERN_GLSL,FRACTAL_LOCAL_MATERIAL_GLSL,FRACTAL_PARTICLE_PALETTE_GLSL} from './solid-renderer.js?v=01db4603d134';
import {LOOP_PALETTE_GLSL} from './structure-model.js?v=01db4603d134';
import {opticalGLSL} from './particle-optics.js?v=01db4603d134';
import {FIBER_MATERIAL_GLSL} from './fiber-material.js?v=01db4603d134';
import {SURFACE_LIGHT_GLSL} from './surface-light.js?v=01db4603d134';
export const materialCavity=s=>Math.max(0,Math.min(1,(s.hollow||0)*(1-(s.wallThickness??.08))));

export const prismaPaletteGLSL=`
uniform vec4 uGradient,uColorLayers,uColorWave,uColorWave2;
uniform float uColorSoftness;
uniform vec4 uKnot,uKnotPath,uKnotPigment,uKnotFrame;
uniform vec3 uKnotAxes,uKnotRotation;
uniform vec3 uPalette[12];uniform highp int uPaletteCount;
${FRACTAL_LOCAL_MATERIAL_GLSL}
${FRACTAL_PARTICLE_PALETTE_GLSL}
vec3 prismaPaletteAt(float t){
 t=fract(t);
 float index=t*float(uPaletteCount);int a=int(floor(index)),b=(a+1)%uPaletteCount;
 float blend=smoothstep(.5-.5*max(.005,min(1.,uColorSoftness)),.5+.5*max(.005,min(1.,uColorSoftness)),fract(index));
 vec3 color=mix(uPalette[a],uPalette[b],blend);if(uColorSoftness>1.){vec3 mean=vec3(0.);for(int k=0;k<uPaletteCount;k++)mean+=uPalette[k];color=mix(color,mean/float(uPaletteCount),smoothstep(1.,3.,uColorSoftness));}return color;
}vec3 prismaPaletteBase(vec3 p,vec3 original){
 if(uGradient.w<.5)return original;
 float theta=atan(p.y,p.x),radius=length(p);
 float waves=sin(dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uColorWave.y+uColorWave.z+p.y*uColorWave2.x+radius*uColorWave2.y+theta*uColorWave2.z+sin(p.x*3.+p.y*2.)*uColorWave2.w);
 float t=fract(.5+dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*.22*uGradient.y+uGradient.z+waves*uColorWave.x*.25);
 return prismaPaletteAt(t);
}

vec3 prismaColorLayersAt(vec3 p,vec3 base,vec3 anchor,bool attached){
 if(uColorLayers.x<=0.||uGradient.w<.5)return base;
 float t=dot(p,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
 vec3 a=prismaPaletteAt(t+p.z*uColorLayers.y*.35+uColorLayers.z);
 vec3 b=prismaPaletteAt(t-p.z*uColorLayers.y*.21+uColorLayers.z+.37);
 vec3 layers=mix(a,a*b*1.6,uColorLayers.w);
 if(attached&&int(uFractal.y+.5)==3&&uFractal.x>0.){
  float orbit=fractalColorCoordinate(fractalMaterialPoint(anchor))*uColorLayers.y+uColorLayers.z;
  vec3 recursiveA=fractalPaletteAt(orbit),recursiveB=fractalPaletteAt(orbit+.37);
  layers=mix(layers,mix(recursiveA,recursiveA*recursiveB*1.6,uColorLayers.w),uFractal.x);
 }
 return mix(base,layers,uColorLayers.x);
}
vec3 prismaColorLayers(vec3 p,vec3 base){return prismaColorLayersAt(p,base,vec3(0.),false);}
${LOOP_PALETTE_GLSL}
vec3 prismaKnotBands(vec3 p,vec3 color){
 if(uKnot.x*uKnotPigment.x<.0001)return color;
 vec3 q=(p-vec3(uKnotFrame.yz,0.))/max(.001,uKnotFrame.x);
 vec3 c=cos(uKnotRotation),s=sin(uKnotRotation);
 q.xy=mat2(c.z,-s.z,s.z,c.z)*q.xy;
 q.xz=mat2(c.y,-s.y,s.y,c.y)*q.xz;
 q.yz=mat2(c.x,-s.x,s.x,c.x)*q.yz;
 vec2 bands=loopBandCoordinates(q/uKnotAxes,uKnot,uKnotPath,uKnotPigment.xyz,uKnotPigment.w);
 return mix(color,mix(prismaPaletteAt(bands.x),prismaPaletteAt(bands.y),uKnotPigment.z),uKnot.x*uKnotPigment.x);
}
vec3 prismaPalette(vec3 p,vec3 original){return prismaKnotBands(p,prismaColorLayers(p,prismaPaletteBase(p,original)));}
`;

// The opacity of a hollow particle uses the visible material along the ray.
export const prismaShadingGLSL=`
${FILM_PATTERN_GLSL}
${opticalGLSL}
${FIBER_MATERIAL_GLSL}
uniform vec4 uMaterial,uFinish,uEnvironment;
uniform vec4 uParticleOptical;
float particleWallCoverage(float radius){
 float inner=uParticleOptical.w;
 if(inner<=0.||radius>=inner)return 1.;
 float r2=radius*radius;
 float occupied=1.-sqrt(max(0.,inner*inner-r2)/max(.0001,1.-r2));
 // Even a nearly empty shell retains a visible reflected surface.
 return mix(1.,.22+.78*occupied,1.-uFinish.z);
}
uniform vec3 uPearl;uniform vec2 uFiberLight;
uniform vec4 uFilmLayer,uParticleFilmMotion,uFilmObject;
uniform vec3 uFilmRotation,uFilmResponse[24],uFilmWhite;
uniform vec4 uParticleCore;
uniform highp int uLightCount;
uniform vec4 uLights[8];uniform vec3 uLightColors[8];uniform float uLightSizes[8];
uniform vec4 uLightProps[8],uLightExtra[8];
uniform vec3 uDiffusionPigment,uParticleSssColor;uniform float uDiffusionRadius;
${SURFACE_LIGHT_GLSL}
${prismaPaletteGLSL}

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
 inside=1.+(inside-1.)*uPearl.z;
 vec3 phase=12.5663706*1.33*uPearl.y*inside/vec3(650.,510.,475.)+uPearl.x*6.2831853;
 vec3 spectrum=.5+.5*cos(phase);
 vec3 tint=mix(vec3(1.),.45+1.05*spectrum,irid*(1.-rough*.5));
 return clamp(fresnel*tint,0.,1.);
}
// Reuses Prisma Forme's soapFilm air/water/air interference and its 24 CIE
// samples. This is a coating on the existing particles, not a refracting mesh.
mat2 filmRotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float particleCoreShade(vec3 world){
 if(uParticleCore.x<=0.)return 1.;
 vec3 local=(world-vec3(uFilmObject.yz,0.))/max(.001,uFilmObject.x);
 local.xz=filmRotate(-uFilmRotation.y)*local.xz;
 local.yz=filmRotate(-uFilmRotation.x)*local.yz;
 local.xy=filmRotate(-uFilmRotation.z)*local.xy;
 float radius=length(local.xy/max(vec2(.001),uParticleCore.zw));
 float weight=1.-smoothstep(0.,max(.001,uParticleCore.y),radius);
 // Apply after lighting: metallic coating and emission must not erase the dark center.
 return pow(max(0.,1.-uParticleCore.x*weight),3.);
}
vec3 filmRGB(vec3 xyz){return mat3(3.2406,-.9689,.0557,-1.5372,1.8758,-.204,-.4986,.0415,1.057)*xyz;}
vec3 livingFilm(vec3 world,float facing,float rough){
 vec3 local=(world-vec3(uFilmObject.yz,0.))/max(.001,uFilmObject.x);
 local.xz=filmRotate(-uFilmRotation.y)*local.xz;
 local.yz=filmRotate(-uFilmRotation.x)*local.yz;
 local.xy=filmRotate(-uFilmRotation.z)*local.xy;
 local*=uPearl.z;
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
vec3 shadeFiberMaterial(vec3 base,vec3 p,vec3 n,vec3 tangent,float silk,float fiberSample,float fleece){
 float metal=uMaterial.x,rough=max(.04,uMaterial.y),gloss=uMaterial.z,irid=uMaterial.w;
 vec3 view=normalize(vec3(0.,0.,7.5)-p);if(dot(n,view)<0.)n=-n;
 float facing=clamp(dot(n,view),.001,1.);
 float crystal=1.-uFinish.z;
 vec3 spectrum=max(vec3(1.001),vec3(uParticleOptical.x)+uParticleOptical.z*vec3(-.095,0.,.14));
 vec3 dielectric=pow((max(vec3(1.),spectrum)-1.)/(spectrum+1.),vec3(2.));
 vec3 f0=mix(mix(vec3(.04),dielectric,crystal),clamp(base,0.,1.),metal);
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
 vec3 pigment=base*mix(vec3(1.),exp(-max(0.,uParticleOptical.y-1.)*(1.-clamp(base,0.,1.))),crystal*.8);
 vec3 lit=pigment*(uFinish.x+(1.-metal)*uEnvironment.z*.22)*uFinish.z+reflection*fresnel*gloss;
 vec3 fiberLight=vec3(0.);
 if(fleece>0.)fiberLight=reflectedEnvironment(n,1.)*.42;
 // Sample transmitted light along the separate refraction angles. The green
 // sample is the undispersed reference for this small contribution.
 float dispersion=uParticleOptical.z*crystal*(1.-metal);
 if(dispersion>0.&&uEnvironment.z>0.){
   vec3 red=reflectedEnvironment(refract(-view,n,1./spectrum.r),rough);
   vec3 neutral=reflectedEnvironment(refract(-view,n,1./spectrum.g),rough);
   vec3 blue=reflectedEnvironment(refract(-view,n,1./spectrum.b),rough);
   lit+=(vec3(red.r,neutral.g,blue.b)-neutral)*(1.-fresnel)*dispersion*.85;
 }
 // Integrate an angular footprint for coatings on sub-pixel grains.
 if(uFinish.w>0.&&coating+irid>0.){
   vec3 spectral=coating>0.?film:pearlFresnel(vec3(.17),mix(.27,.74,facing),irid,rough);
   lit+=spectral*mix(vec3(.4),normalize(base+vec3(.14)),.48)*uFinish.w*(.14+.36*coating+.18*irid);
 }
 float shininess=mix(180.,2.,rough*rough);
 for(int i=0;i<uLightCount;i++){
   vec3 delta=uLights[i].xyz-p;float distance2=max(.01,dot(delta,delta));vec3 l=normalize(delta);
   float spread=uLightSizes[i]/sqrt(distance2);
   float diffuse=clamp((dot(n,l)+spread)/(1.+spread),0.,1.);
   diffuse=emitterDiffuse(n,p,uLights[i],uLightProps[i],uLightExtra[i],diffuse);
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
   float visibility=opticalVisibility(p,i);if(visibility<1.)power*=visibility;
   if(fleece>0.)fiberLight+=power*(.10+.69*clamp((dot(n,l)+.52)/1.52,0.,1.));
   lit+=power*(base*diffuse*(1.-metal)*.7*uFinish.z+specular*spec*gloss*2.);
   float thickness=uParticleOptical.y*(1.-.8*uParticleOptical.w);
   float transport=1.-exp(-(uSharedLightResponse.y+uSharedLightResponse.z)*max(.03,thickness));
   if(transport>0.||uSharedLightResponse.w>0.){
    float transmitted=diffuseThrough(dot(n,l),facing,uSharedLightResponse.z);
    vec3 scatter=mix(base,base*uDiffusionPigment,.56)*transport;
    float backPath=(.24+.76*max(0.,-dot(n,l)))*max(.05,thickness);
    vec3 subsurface=base*uParticleSssColor*uSharedLightResponse.w*exp(-backPath/max(.04,uDiffusionRadius));
    lit+=power*(scatter+subsurface)*transmitted*(1.-metal)*.75;
   }
 }
 // Unlit is a usable palette view even with emission at zero.
 vec3 result=mix(base*uFinish.z,lit,uFinish.y);
 if(fleece>0.){
  vec3 illuminated=mix(vec3(1.),fiberLight+uFinish.x,uFinish.y)*uFinish.z;
  result=fiberScatter(base,result,illuminated,facing,rough,fiberSample,fleece);
 }
 return result*particleCoreShade(p);
}
vec3 fiberGrainLocal(vec3 p){
 p.xz=filmRotate(-uFilmRotation.y)*p.xz;p.yz=filmRotate(-uFilmRotation.x)*p.yz;p.xy=filmRotate(-uFilmRotation.z)*p.xy;
 return p;
}
vec3 shadeMatter(vec3 base,vec3 p,vec3 n,vec3 tangent,float silk){
 float amount=uFiberPile.z<.5?uFiberPile.x:0.,signal=0.;
 if(amount>0.){
  vec3 anchor=fiberGrainLocal((p-vec3(uFilmObject.yz,0.))/max(.001,uFilmObject.x));
  signal=fiberThreads(anchor,.013);
 }
 return shadeFiberMaterial(base,p,n,tangent,silk,signal,amount);
}
vec3 shadeNoduleSample(vec3 base,vec3 p,vec3 n,float signal,float growth){
 float amount=uFiberPile.x*fiberGrowthWeight(growth);
 return shadeFiberMaterial(base,p,n,vec3(0.),0.,signal,amount);
}
vec3 shadeParticle(vec3 base,vec3 p,vec3 n){return shadeMatter(base,p,n,vec3(0.),0.);}
vec3 shadeFibre(vec3 base,vec3 p,vec3 n,vec3 direction){
 float distance=length(direction);
 if(uFiberLight.x<=0.||distance<.000001)return shadeParticle(base,p,n);
 return shadeMatter(base,p,n,direction/distance,uFiberLight.x);
}
`;
