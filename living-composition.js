// Shared by Forme and Particelle. Changing workspace never changes the geometry.
export const usesParticleSurface=s=>s?.engine==='particles'||s?.pLiving>0;
export const supportsParticleFields=s=>usesParticleSurface(s)&&s.pLiving!==4;
export function livingWeights(s){
 if(!(s.pLiving>0))return {core:1,structure:0};
 const x=Math.max(0,Math.min(1,s.pLivingBlend??.5));
 return {core:Math.min(1,2*(1-x)),structure:Math.min(1,2*x)};
}
// The depth image is a detached copy: sampling the active depth attachment is
// undefined in WebGL. Attenuate hidden particles instead of cutting them off.
export const livingOcclusionGLSL=`
uniform highp sampler2D uLivingDepth;
uniform vec2 uLivingDepthSize;
uniform float uLivingOcclusion,uStudioOcclusion;
uniform highp sampler2D uStudioDepth;
uniform float uStudioLens;
float livingVisibility(float z){
 vec2 uv=gl_FragCoord.xy/uLivingDepthSize;
 float visibility=1.;
 if(uLivingOcclusion>0.){
  float depth=texture(uLivingDepth,uv).r;
  visibility-=uLivingOcclusion*smoothstep(.0002,.0012,gl_FragCoord.z-depth);
 }
 if(uStudioOcclusion>0.){
  vec2 screen=(uv-.5)*uLivingDepthSize/min(uLivingDepthSize.x,uLivingDepthSize.y)*3.4;
  vec2 distorted=screen;
  for(int i=0;i<3;i++)distorted=screen/max(.25,1.+uStudioLens*dot(distorted,distorted)*.18);
  uv=.5+distorted*min(uLivingDepthSize.x,uLivingDepthSize.y)/uLivingDepthSize/3.4;
  vec4 sampleDepth=texture(uStudioDepth,uv);
  float nearest=16.-32.*dot(sampleDepth.rg,vec2(1.,1./255.));
  visibility*=1.-sampleDepth.b*smoothstep(.003,.032,nearest-z);
 }
 return visibility;
}`;
// Use the relaxed, constrained surface, so attached grains follow its actual
// folds rather than a second approximation of the particle field.
export const livingAttachmentGLSL=`
uniform highp sampler2D uAttachedSurface;
uniform ivec2 uAttachedSize;
uniform float uSurfaceBind;
uniform float uAttachedBundles;
vec3 attachedAt(ivec2 q){q.x=(q.x+uAttachedSize.x)%uAttachedSize.x;q.y=clamp(q.y,0,uAttachedSize.y-1);return texelFetch(uAttachedSurface,q,0).xyz;}
vec3 attachedPosition(vec4 seed,float phase){
 vec3 p=position(seed,phase);if(uSurfaceBind<=0.)return p;
 vec2 coord=seed.xy;
 if(uAttachedBundles>0.){float g=uAttachedBundles;coord.x=(floor(coord.x*g)+fract(coord.x*g)*(1.-g/float(uAttachedSize.x)))/g;}
 vec2 uv=coord*vec2(uAttachedSize-ivec2(0,1));ivec2 i=ivec2(floor(uv));vec2 f=fract(uv);
 vec3 surface=mix(mix(attachedAt(i),attachedAt(i+ivec2(1,0)),f.x),mix(attachedAt(i+ivec2(0,1)),attachedAt(i+ivec2(1,1)),f.x),f.y);
 return sceneBarriers(mix(p,surface,uSurfaceBind),seed,phase);
}`;

export const supportsManualFields=s=>!usesParticleSurface(s)||supportsParticleFields(s);
