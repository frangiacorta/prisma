// Diffuse response to finite studio emitters, shared by surfaces, grains and strands.
export const SURFACE_LIGHT_GLSL = `
uniform vec4 uSharedLightResponse;
float surfaceLightDiffuse(float cosine,float original,float size,float span,float softness,vec3 offset,float wrap){
 if(wrap<=0.)return original;
 float angularRadius=atan(max(.015,mix(size,span,.5)),max(.02,length(offset)));
 float width=.18+.83*wrap+sin(angularRadius)*(.35+.65*softness);
 float diffuse=clamp((cosine+width)/(1.+width),0.,1.);
 return mix(original,diffuse,wrap);
}
float emitterDiffuse(vec3 n,vec3 p,vec4 light,vec4 shape,vec4 extra,float original){
 vec3 off=light.xyz-p,ld=off/max(.0001,length(off));
 float wrap=uSharedLightResponse.x;
 if(wrap<=0.)return original;
 float width=max(.015,shape.x),span=width;
 if((shape.w>.5&&shape.w<1.5)||(shape.w>2.5&&shape.w<4.5)){
  vec3 axis=light.xyz/max(.0001,length(light.xyz));
  vec3 right=normalize(cross(abs(axis.y)>.98?vec3(1,0,0):vec3(0,1,0),length(axis)>.001?axis:vec3(0,0,1)));
  vec3 up=cross(axis,right),longAxis=right*cos(shape.z)+up*sin(shape.z);
  vec3 gradient=n-ld*dot(n,ld);
  float along=dot(gradient,longAxis)/max(.0001,length(gradient));
  span=sqrt(mix(max(.015,shape.y)*max(.015,shape.y),width*width,along*along));
 }
 float diffuse=surfaceLightDiffuse(dot(n,ld),original,width,span,extra.x,off,wrap);
 if(shape.w>1.5&&shape.w<2.5&&dot(light.xyz,light.xyz)>.00001){
  float cutoff=inversesqrt(1.+extra.y*extra.y),soft=max(.002,(1.-cutoff)*max(.04,extra.x));
  diffuse*=mix(1.,smoothstep(cutoff-soft,cutoff+soft,dot(normalize(light.xyz),ld)),wrap);
 }
 return diffuse;
}
// Back illumination of an opaque fibrous or milky body. Each contribution is
// incident radiance from a real lamp. Clear materials use their optical path.
float diffuseThrough(float cosine,float facing,float displacement){
 float rim=1.-clamp(facing,0.,1.);
 float back=max(0.,-cosine);
 return (.10+.55*back+.24*rim*rim)*mix(.50,1.,clamp(displacement,0.,1.));
}
`;
