// Particle shading uses Prisma's parameter names. It does not trace solid glass.
export const prismaShadingGLSL=`
uniform vec4 uMaterial,uFinish,uEnvironment,uGradient;
uniform vec3 uPalette[12];uniform highp int uPaletteCount,uLightCount;
uniform vec4 uLights[8];uniform vec3 uLightColors[8];uniform float uLightSizes[8];
vec3 prismaPalette(vec3 p,vec3 original){
 if(uGradient.w<.5)return original;
 float t=fract(.5+dot(p.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*.22*uGradient.y+uGradient.z);
 float index=t*float(uPaletteCount);int a=int(floor(index)),b=(a+1)%uPaletteCount;
 return mix(uPalette[a],uPalette[b],smoothstep(0.,1.,fract(index)));
}
vec3 reflectedEnvironment(vec3 r,float rough){
 r.xz=mat2(cos(uEnvironment.y),-sin(uEnvironment.y),sin(uEnvironment.y),cos(uEnvironment.y))*r.xz;
 vec3 low=vec3(.08,.12,.18),high=vec3(.9,.96,1.);
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
vec3 shadeParticle(vec3 base,vec3 p,vec3 n){
 float metal=uMaterial.x,rough=max(.04,uMaterial.y),gloss=uMaterial.z,irid=uMaterial.w;
 vec3 view=normalize(vec3(0.,0.,7.5)-p);float facing=max(.001,dot(n,view));
 vec3 film=.55+.45*cos(vec3(0.,2.094,4.188)+(1.-facing)*8.);
 vec3 pigment=mix(base,base*film*1.7,irid);
 vec3 f0=mix(vec3(.04),pigment,metal);
 vec3 reflection=reflectedEnvironment(reflect(-view,n),rough);
 vec3 fresnel=f0+(1.-f0)*pow(1.-facing,5.);
 vec3 lit=pigment*uFinish.x*uFinish.z+reflection*fresnel*(.2+.8*gloss);
 float shininess=mix(180.,2.,rough*rough);
 for(int i=0;i<8;i++){
   if(i>=uLightCount)break;
   vec3 delta=uLights[i].xyz-p;float distance2=max(.01,dot(delta,delta));vec3 l=normalize(delta);
   float spread=uLightSizes[i]/sqrt(distance2);
   float diffuse=clamp((dot(n,l)+spread)/(1.+spread),0.,1.);
   vec3 halfVector=normalize(l+view);
   float spec=pow(max(0.,dot(n,halfVector)),max(2.,shininess/(1.+spread*4.)));
   vec3 power=uLightColors[i]*uLights[i].w/(1.+distance2*.045);
   lit+=power*(pigment*diffuse*(1.-metal)*.7*uFinish.z+fresnel*spec*gloss*3.);
 }
 return mix(base*uFinish.x*uFinish.z,lit,uFinish.y);
}
`;
