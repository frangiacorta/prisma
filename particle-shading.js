// Particle shading uses Prisma's parameter names. It does not trace solid glass.
export const prismaShadingGLSL=`
uniform vec4 uMaterial,uFinish,uEnvironment,uGradient;
uniform vec2 uPearl;
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
vec3 shadeParticle(vec3 base,vec3 p,vec3 n){
 float metal=uMaterial.x,rough=max(.04,uMaterial.y),gloss=uMaterial.z,irid=uMaterial.w;
 vec3 view=normalize(vec3(0.,0.,7.5)-p);if(dot(n,view)<0.)n=-n;
 float facing=clamp(dot(n,view),.001,1.);
 vec3 f0=mix(vec3(.04),clamp(base,0.,1.),metal);
 vec3 reflection=reflectedEnvironment(reflect(-view,n),rough);
 vec3 fresnel=pearlFresnel(f0,facing,irid,rough);
 vec3 lit=base*(uFinish.x+(1.-metal)*uEnvironment.z*.22)*uFinish.z+reflection*fresnel*gloss;
 float shininess=mix(180.,2.,rough*rough);
 for(int i=0;i<8;i++){
   if(i>=uLightCount)break;
   vec3 delta=uLights[i].xyz-p;float distance2=max(.01,dot(delta,delta));vec3 l=normalize(delta);
   float spread=uLightSizes[i]/sqrt(distance2);
   float diffuse=clamp((dot(n,l)+spread)/(1.+spread),0.,1.);
   vec3 halfVector=normalize(l+view);
   float spec=pow(max(0.,dot(n,halfVector)),max(2.,shininess/(1.+spread*4.)));
   vec3 power=uLightColors[i]*uLights[i].w/(1.+distance2*.045);
   vec3 specular=pearlFresnel(f0,max(0.,dot(view,halfVector)),irid,rough);
   lit+=power*(base*diffuse*(1.-metal)*.7*uFinish.z+specular*spec*gloss*2.);
 }
 // Unlit is a usable palette view even with emission at zero.
 return mix(base*uFinish.z,lit,uFinish.y);
}
`;
