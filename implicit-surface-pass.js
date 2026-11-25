// Material transport uses exact intersections from the geometry pass.
// Front-to-back transport preserves radiance and transmission across batches.
export const IMPLICIT_SURFACE_UNIFORMS=`
uniform sampler2D uImplicitHit0,uImplicitHit1,uImplicitHit2,uImplicitHit3;
uniform sampler2D uImplicitColor,uImplicitThrough;
uniform float uImplicitContinue;
vec4 implicitBehind;
vec3 implicitTransmission;
vec4 implicitLayer(int index,ivec2 pixel){
 if(index==0)return texelFetch(uImplicitHit0,pixel,0);
 if(index==1)return texelFetch(uImplicitHit1,pixel,0);
 if(index==2)return texelFetch(uImplicitHit2,pixel,0);
 return texelFetch(uImplicitHit3,pixel,0);
}
`;
export const IMPLICIT_ACCUMULATE_MAIN=`
layout(location=1) out vec4 implicitThroughColor;
void main(){
 vec2 originalUV=(gl_FragCoord.xy+uSampling.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;
 vec2 uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);
 vec3 origin=vec3(uv,4.8),direction=vec3(0.,0.,-1.);
 ivec2 pixel=ivec2(gl_FragCoord.xy);vec4 first=implicitLayer(0,pixel);
 vec4 color=uImplicitContinue>.5?texelFetch(uImplicitColor,pixel,0):vec4(0.,0.,0.,first.w);
 vec4 through=uImplicitContinue>.5?texelFetch(uImplicitThrough,pixel,0):vec4(1.,1.,1.,first.w>=0.?1.:0.);
 for(int layer=0;layer<int(min(4.,uRuntime.w*.25));layer++){
  vec4 intersection=implicitLayer(layer,pixel);if(intersection.w<0.||max(max(through.r,through.g),through.b)<.001)break;
  vec3 p=origin+direction*intersection.w;
#ifdef WEAVE_HIT_TAG
  vec2 oct=intersection.xy;weaveLitFacing=0.;weaveLitContactShade=0.;weaveLitBud=-1;weaveLitImpact=-1.;weaveCottonSigma=0.;
  if(oct.x>1.){
   float mass=oct.x-2.;oct.x=mod(mass,65536.)*(2./65535.)-1.;
   if(layer==0&&uImplicitContinue<.5)weaveLitFacing=floor(mass/65536.)/254.;
  }
  if(oct.y>1.){
   float contact=oct.y-2.;oct.y=mod(contact,65536.)*(2./65535.)-1.;
   weaveLitContactShade=floor(contact/65536.)/254.;
  }else if(oct.y < -1.){
   float fruit=-oct.y-2.;oct.y=mod(fruit,1024.)*(2./1023.)-1.;
   float extra=floor(fruit/1024.),impact=mod(extra,512.);
   weaveLitBud=int(floor(extra/512.));if(impact<511.)weaveLitImpact=impact*(1.35/510.);
  }
  vec3 n=normalize(vec3(oct,max(0.,1.-abs(oct.x)-abs(oct.y))));
  float region=floor(intersection.z/1048576.);
  float packed=intersection.z-region*1048576.;
  weaveLitTip=vec3(region,floor(packed/1024.)/1023.,mod(packed,1024.)/1023.);
#else
  vec3 n=normalize(intersection.xyz);if(dot(n,direction)>0.)n=-n;
#endif
  implicitBehind=vec4(0.);implicitTransmission=vec3(0.);float issue;
  vec4 surface=shade(p,n,direction,true,issue);
  color.rgb+=through.rgb*surface.rgb;through.rgb*=implicitTransmission;
#ifdef WEAVE_HIT_TAG
  if(layer==0&&uImplicitContinue<.5&&weaveCottonSigma>.08)through.a=2.+weaveCottonSigma;
#endif
 }
 fragColor=color;implicitThroughColor=through;
}`;
export const IMPLICIT_SURFACE_MAIN=`
layout(location=1) out vec4 implicitDepth;
uniform float uStudioOpacity;
void main(){
 vec2 originalUV=(gl_FragCoord.xy+uSampling.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;
 vec2 uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);
 vec3 origin=vec3(uv,4.8),direction=vec3(0.,0.,-1.);
 ivec2 pixel=ivec2(gl_FragCoord.xy);vec4 accumulated=texelFetch(uImplicitColor,pixel,0),through=texelFetch(uImplicitThrough,pixel,0);
 bool hit=through.a>.5,scattered=false;
 float bodyPile=uFiberPile.z<.5?uFiberPile.x:0.;
 float gatherFleece=bodyPile;
#ifdef WEAVE_COTTON_RESOLVE
 gatherFleece=max(gatherFleece,uTissueCottonWeight*uFiberPile.x*(1.-uMat.z));
#endif
 if(gatherFleece>.001){
  // Lateral transport in the layer of short fibres. Its scattering
  // distance is a fraction of the optically measured pile on each fruit.
  // Accumulate radiance and transmittance together so the same fibres
  // scatter correctly across a lit web, a black field or transparent PNG.
  float bodySigma=bodyPile*(.001+.006*uFiberPile.y)*min(uResolution.x,uResolution.y)*uFrame.x;
  float sigma=through.a>2.?through.a-2.:(hit?bodySigma:0.),total=1.,edge=0.;
  vec3 light=accumulated.rgb,transmitted=through.rgb;
  float tap=max(1.,min(uResolution.x,uResolution.y)*uFrame.x/1620.);
  ivec2 last=textureSize(uImplicitThrough,0)-ivec2(1);
  for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){
   if((x==0&&y==0)||x*x+y*y>5)continue;
   ivec2 delta=ivec2(round(vec2(x,y)*tap)),q=clamp(pixel+delta,ivec2(0),last);
   vec4 nextThrough=texelFetch(uImplicitThrough,q,0);
   float nextSigma=nextThrough.a>2.?nextThrough.a-2.:(nextThrough.a>.5?bodySigma:0.);
   float reach=max(sigma,nextSigma);
   if(reach<.08)continue;
   float w=exp(-.5*dot(vec2(delta),vec2(delta))/(reach*reach));
   if(w<.001)continue;
   vec4 next=texelFetch(uImplicitColor,q,0);
   // An opaque surface between the fleece and the lens occludes its light.
   if(hit&&nextThrough.a>.5){
    float gap=.022*uFrame.x;
    if((sigma==0.&&accumulated.a+gap<next.a)||(nextSigma==0.&&next.a+gap<accumulated.a))continue;
   }
   light+=w*next.rgb;transmitted+=w*nextThrough.rgb;total+=w;
   if((sigma==0.)!=(nextSigma==0.))edge=1.;
   scattered=true;
  }
  float amount=mix(.23,.93,edge);
  accumulated.rgb=mix(accumulated.rgb,light/total,amount);
  through.rgb=mix(through.rgb,transmitted/total,amount);
 }
 vec3 point=origin+direction*max(0.,accumulated.a),normal=vec3(0.,0.,1.);
 float distance=accumulated.a,unused,issue=0.;vec4 back=sceneRay(origin,direction,unused);
 vec4 surface=vec4(accumulated.rgb+through.rgb*back.rgb,1.-min(min(through.r,through.g),through.b)*(1.-back.a));
 float closest=max(0.,-accumulated.a-1.),coverage=(hit||scattered)?1.:0.;
 float halo=hit?0.:exp(-closest/max(.008,.035+uOther.w*.16))*uOther.w*(.12+uSurface.w*.38);
 if(hit){vec4 foreground=sceneEmitters(origin,direction,distance,unused);surface.rgb=surface.rgb*(1.-foreground.a)+foreground.rgb;surface.a=surface.a*(1.-foreground.a)+foreground.a;}
 float z=clamp((16.-point.z)/32.,0.,.99999);vec2 packed=fract(z*vec2(1.,255.));packed.x-=packed.y/255.;
 implicitDepth=vec4(packed,hit?clamp(uStudioOpacity*uFilCore*(1.-uMat.x),0.,1.):0.,1.);
 coverage*=uFilCore*uStudioOpacity;halo*=uStudioOpacity;
 vec3 glow=palette(atan(uv.y,uv.x)/(2.*PI)+.5)*halo,linear=mix(back.rgb,surface.rgb,coverage)+glow;
 float alpha=clamp(mix(back.a,surface.a,coverage)+halo,0.,1.);
 float grain=(hash(floor(gl_FragCoord.xy/max(.5,uPhoto3.z))+uSeed)-.5)*uFrame.w;
 if(uRuntime.z>1.5){fragColor=vec4(normal*.5+.5,hit?1.:0.);return;}
 if(uRuntime.z>.5){fragColor=vec4(issue,hit?1.:0.,0.,1.);return;}
 if(transparentExport()){
  vec3 target=mix(back.rgb,surface.rgb,coverage);float bodyAlpha=clamp(mix(back.a,surface.a,coverage),0.,1.);
  vec3 premultiplied=max(vec3(0.),target-vec3(1.-bodyAlpha));
  float glowAlpha=clamp(halo,0.,1.);premultiplied=premultiplied*(1.-glowAlpha)+toSRGB(palette(atan(uv.y,uv.x)/(2.*PI)+.5))*glowAlpha;alpha=1.-(1.-bodyAlpha)*(1.-glowAlpha);
  fragColor=vec4(clamp(photo(premultiplied/max(alpha,.000001),originalUV)+grain,0.,1.),alpha);
 }else{
  vec3 color=uPhoto4.y>.5?photo(linear,originalUV):mix(toSRGB(max(vec3(0.),back.rgb)),photo(surface.rgb,originalUV)+(toSRGB(back.rgb)-photo(back.rgb,originalUV))*(1.-surface.a),coverage)+toSRGB(glow);
  fragColor=vec4(clamp(color+grain*(uPhoto4.y>.5?1.:coverage*surface.a),0.,1.),1.);
 }
 if(uSampling.z>.5){if(transparentExport())fragColor.rgb*=fragColor.a;else fragColor.a=clamp(coverage*surface.a+halo,0.,1.);fragColor*=uSampling.w;}
}`;
