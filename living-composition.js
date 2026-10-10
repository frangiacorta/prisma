// Shared by Forme and Particelle. Changing workspace never changes the geometry.
export const usesParticleSurface=s=>s?.engine==='particles'||s?.pLiving>0;
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
uniform float uLivingOcclusion;
float livingVisibility(){
 if(uLivingOcclusion<=0.)return 1.;
 float depth=texture(uLivingDepth,gl_FragCoord.xy/uLivingDepthSize).r;
 return 1.-uLivingOcclusion*smoothstep(.0002,.0012,gl_FragCoord.z-depth);
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
