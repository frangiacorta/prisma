import {GROWTH_GLSL,bindGrowth} from './growth-material.js?v=38e810dd65ce';
import {BASE_FORM_GLSL} from './base-forms.js?v=38e810dd65ce';
import {SOLID_FORCES_GLSL,uploadSolidForces} from './solid-forces.js?v=38e810dd65ce';
import {FILM_SPECTRUM,FILM_PATTERN_GLSL,FORM_MATERIAL_GLSL} from './solid-renderer.js?v=38e810dd65ce';
import {FILAMENT_DEFAULTS} from './filament-model.js?v=38e810dd65ce';

// Instanced tapered strands attached to the existing implicit surface. Geometry,
// depth, shadows and colour share the same pass for preview and export.
const HEADER='#version 300 es\nprecision highp float;precision highp int;\n';
const QUAD=HEADER+`void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;
const SPACE=`
uniform vec4 uFrame,uAxes,uAngles,uCameraSize;
uniform vec3 uCameraX,uCameraY,uCameraZ;
uniform float uLens;
mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 toLocal(vec3 p){p.xy-=uFrame.yz;p/=uFrame.x;p.xy=turn(uAngles.z)*p.xy;p.xz=turn(uAngles.y)*p.xz;p.yz=turn(uAngles.x)*p.yz;return p/uAxes.xyz;}
vec3 toWorld(vec3 p){p*=uAxes.xyz;p.yz=turn(-uAngles.x)*p.yz;p.xz=turn(-uAngles.y)*p.xz;p.xy=turn(-uAngles.z)*p.xy;p*=uFrame.x;p.xy+=uFrame.yz;return p;}
vec3 normalWorld(vec3 n){n/=uAxes.xyz;n.yz=turn(-uAngles.x)*n.yz;n.xz=turn(-uAngles.y)*n.xz;n.xy=turn(-uAngles.z)*n.xy;return normalize(n);}
vec4 project(vec3 p){vec2 xy=vec2(dot(p,uCameraX),dot(p,uCameraY));
 // Invert the radial camera mapping used by the solid ray tracer.
 if(abs(uLens)>.00001){vec2 target=xy;float r=length(target),x=r;for(int i=0;i<8;i++)x=max(0.,x-(x*(1.+uLens*x*x*.18)-r)/max(.1,1.+uLens*x*x*.54));xy*=x/max(.00001,r);}
 return vec4(xy/uCameraSize.xy,-dot(p,uCameraZ)/12.,1.);}
${SOLID_FORCES_GLSL}
vec3 deformWorld(vec3 p){if(!sculptActive())return p;p=dynamicsForward(p);vec3 q=p;float barrier;for(int i=0;i<uSculptIterations;i++)q+=clamp(p-sculptMap(q,barrier),vec3(-.15),vec3(.15));
 for(int i=0;i<uSculptPointCount;i++){vec3 v=q-uSculptPoints[i].xyz;float d=length(v),r=uSculptPointOptions[i].x*smoothstep(1.2,3.,-uSculptPoints[i].w);if(d<r)q=uSculptPoints[i].xyz+v/max(.00001,d)*r;}
 for(int i=0;i<uSculptPathCount;i++){vec3 center=sculptClosest(q,i,uSculptPaths[i].w>.5),v=q-center;float d=length(v),r=uSculptPaths[i].y*smoothstep(1.2,3.,-uSculptPaths[i].x);if(d<r)q=center+v/max(.00001,d)*r;}
 return dynamicsContact(q);}
`;
const FIELD=`
${BASE_FORM_GLSL}
uniform sampler2D uField;
uniform vec4 uAtlas;
uniform vec3 uFieldMin,uFieldMax;
uniform vec2 uFieldWarp;
uniform float uPrimitive,uFloat,uDeferred,uShell;
vec2 decode(vec4 t){return (vec2(dot(t.rg,vec2(1.,1./255.)),dot(t.ba,vec2(1.,1./255.)))-.5)*2.*uAtlas.w;}
vec2 slice(vec2 index,float z){vec2 tile=vec2(mod(z,uAtlas.y),floor(z/uAtlas.y)),pixel=tile*(uAtlas.x+2.)+1.+index;
 if(uFloat>.5)return texture(uField,(pixel+.5)/uAtlas.z).rg;
 ivec2 a=ivec2(floor(pixel));vec2 f=fract(pixel);return mix(mix(decode(texelFetch(uField,a,0)),decode(texelFetch(uField,a+ivec2(1,0),0)),f.x),mix(decode(texelFetch(uField,a+ivec2(0,1),0)),decode(texelFetch(uField,a+ivec2(1,1),0)),f.x),f.y);}
float localField(vec3 p){if(uPrimitive>.5)return baseFormField(p);
 p.xz=turn(uFieldWarp.x*p.y*.7+uFieldWarp.y)*p.xz;
 vec3 q=clamp(p,uFieldMin,uFieldMax),index=(q-uFieldMin)/(uFieldMax-uFieldMin)*(uAtlas.x-1.);
 float z=floor(index.z);vec2 d=mix(slice(index.xy,z),slice(index.xy,min(z+1.,uAtlas.x-1.)),fract(index.z));
 return (uDeferred>.5?max(d.x,d.y):d.x)+length(p-q);}
float worldField(vec3 p){float barrier;vec3 q=sculptMap(p,barrier);return max(localField(toLocal(dynamicsInverse(q)))*min(min(uAxes.x,uAxes.y),uAxes.z)*uFrame.x*.5,max(barrier,dynamicsBarrier(p))*.5);}
`;
const ROOT=HEADER+SPACE+FIELD+`
uniform float uCount,uSeed,uClumps,uHairScatter;
layout(location=0)out vec4 root;layout(location=1)out vec4 normal;
float hash(float x){return fract(sin(x*127.1+uSeed)*43758.5453);}
void main(){float id=floor(gl_FragCoord.x)+floor(gl_FragCoord.y)*256.;if(id>=uCount){root=vec4(0);normal=vec4(0);return;}
 float z=1.-2.*(id+.5)/uCount,a=id*2.39996323+uSeed,r=sqrt(max(0.,1.-z*z));vec3 dir=normalize(vec3(cos(a)*r,sin(a)*r,z)+uHairScatter/sqrt(uCount)*vec3(hash(id+1.)-.5,hash(id+2.)-.5,hash(id+3.)-.5)*3.);
 float bound=max(length(uFieldMin),length(uFieldMax))+.1,t=0.,last=0.;vec3 p=dir*bound;bool hit=false;
 for(int j=0;j<180;j++){p=dir*(bound-t);float d=localField(p);if(d<.001){hit=true;break;}last=t;t+=clamp(d*.6,.0007,.09);if(t>bound*2.)break;}
 if(!hit){root=vec4(0);normal=vec4(0);return;}
 for(int j=0;j<7;j++){float mid=(last+t)*.5;if(localField(dir*(bound-mid))>0.)last=mid;else t=mid;}p=dir*(bound-(last+t)*.5);
 float e=uPrimitive>.5?.001:max(.002,(uFieldMax.x-uFieldMin.x)/uAtlas.x*.6);vec3 n=vec3(localField(p+vec3(e,0,0))-localField(p-vec3(e,0,0)),localField(p+vec3(0,e,0))-localField(p-vec3(0,e,0)),localField(p+vec3(0,0,e))-localField(p-vec3(0,0,e)));
 root=vec4(p,1.);float best=-2.,chosen=0.;for(int j=0;j<250;j++){if(float(j)>=uClumps)break;float zz=1.-2.*(float(j)+.5)/uClumps,aa=float(j)*2.39996323+uSeed;vec3 g=vec3(cos(aa)*sqrt(1.-zz*zz),sin(aa)*sqrt(1.-zz*zz),zz);g=normalize(g+uHairScatter/sqrt(uClumps)*vec3(hash(float(j)+41.)-.5,hash(float(j)+71.)-.5,hash(float(j)+91.)-.5)*2.);float score=dot(normalize(p),g);if(score>best){best=score;chosen=float(j);}}normal=vec4(normalize(n),chosen);}
`;
const CORE=HEADER+SPACE+FIELD+`
uniform sampler2D uScene;uniform float uShadowPass,uBound,uCore,uDepthOnly;
out vec4 color;
void main(){vec2 uv=(gl_FragCoord.xy/uCameraSize.zw*2.-1.)*uCameraSize.xy;uv*=1.+uLens*dot(uv,uv)*.18;
 vec3 origin=uCameraX*uv.x+uCameraY*uv.y+uCameraZ*10.,direction=-uCameraZ;vec3 center=vec3(uFrame.yz,0.),oc=origin-center;float b=dot(oc,direction),disc=b*b-dot(oc,oc)+uBound*uBound,t=max(0.,-b-sqrt(max(0.,disc)));bool hit=false;
 for(int i=0;i<220;i++){if(uCore<=0.||disc<0.||t> -b+sqrt(disc))break;float d=worldField(origin+direction*t);if(d<.001){hit=true;break;}t+=clamp(d*.9,.0008,.2);if(t>20.)break;}
 gl_FragDepth=hit&&(uCore>=.999||uDepthOnly>.5||uShadowPass>.5)?clamp(.5-dot(origin+direction*t,uCameraZ)/24.,0.,1.):1.;
 color=uShadowPass>.5?vec4(0.):texture(uScene,gl_FragCoord.xy/uCameraSize.zw);}
`;
const GROOM=`
uniform sampler2D uRoots,uNormals;
uniform vec4 uHairA,uHairB,uHairC,uHairD,uHairBase;
uniform float uSeed,uSegments,uHairScatter,uTube,uSides,uRootCore,uTubeDepth;uniform ivec2 uRootOrder;
float rnd(float x){return fract(sin(x*127.1+uSeed)*43758.5453);}
vec3 guide(float id,float count){float z=1.-2.*(id+.5)/count,a=id*2.39996323+uSeed;return normalize(vec3(cos(a)*sqrt(max(0.,1.-z*z)),sin(a)*sqrt(max(0.,1.-z*z)),z)+uHairScatter/sqrt(count)*vec3(rnd(id+41.)-.5,rnd(id+71.)-.5,rnd(id+91.)-.5)*2.);}
float strandLength(float id,float clusterId){float variation=mix(rnd(id+19.),.75*rnd(clusterId+114.)+.25*rnd(id+19.),uHairC.x);return uHairA.x*mix(1.,.12+.88*variation,uHairB.x);}
float baseHeight(float len,float r){return min(len*.4,r*uHairBase.y);}
float strandRadius(float t,float len){
 float r=uHairA.y*.5*min(1.,uHairA.x/.025),embed=min(uHairA.y*.65,len*.08),height=len*t-embed*(1.-smoothstep(0.,.3,t));
 float q=clamp(1.-height/max(.00001,baseHeight(len,r)),0.,1.);
 float profile=mix(q,1.-sqrt(max(0.,1.-q*q)),uHairBase.z);
 return r*(mix(1.,max(.002,pow(max(0.,1.-t),.85)),uHairA.z)+uHairBase.x*profile);
}
vec3 strand(vec3 root,vec3 n,float id,float clusterId,float t){
 vec3 axis=abs(n.y)<.95?vec3(0,1,0):vec3(1,0,0),b=normalize(cross(n,axis)),c=cross(n,b);
 float az=rnd(id+7.)*6.2831853;vec3 side=b*cos(az)+c*sin(az),around=normalize(cross(vec3(0,1,.0001),n));
 float len=strandLength(id,clusterId),phase=uHairD.x*6.2831853;
 vec3 cluster=guide(clusterId,uHairC.y);
 vec3 offset=cluster-normalize(root);offset-=n*dot(offset,n);
 vec3 groupSide=normalize(cross(cluster,vec3(.01,1,.001)));side=normalize(mix(side,groupSide,uHairC.x*.9));float embed=min(uHairA.y*.65,len*.08);vec3 p=root+n*(len*t-embed*(1.-smoothstep(0.,.3,t)))+side*uHairB.y*len*t*t*.8+around*uHairB.z*len*t*smoothstep(0.,.15,t);
 p+=uHairC.x*offset*(min(length(root),1.5)+len)*smoothstep(0.,1.,t)*(1.-uHairC.z*t*t*.65);
 p+=side*uHairC.x*uHairC.z*len*t*t*.25;
 p+=uHairB.w*len*t*(b*(cos(t*12.56637+az)-cos(az))+c*(sin(t*12.56637+az)-sin(az)))*.18;
 p+=uHairC.w*len*t*(b*sin(t*21.+az)*.1+c*sin(t*17.+az*2.)*.1);
 p+=uHairD.y*len*t*t*(b*sin(phase+dot(root,vec3(2,3,4))-t*4.)+c*cos(phase+root.y*4.-t*3.));
 return deformWorld(toWorld(p));}
`;
const HAIR_VERT=HEADER+SPACE+GROOM+`
out vec3 vWorld,vTangent,vNormal,vRootLocal,vRootNormal;out vec2 vAcross;out float vAlong,vRandom,vCoverage,vJoin;
void main(){int id=int((uint(gl_InstanceID)*uint(uRootOrder.y))%uint(uRootOrder.x)),vertex=gl_VertexID,faces=uTube>.5?int(uSides):1,seg=vertex/(6*faces),facet=(vertex/6)%faces,k=vertex%6;
 float end=(k==1||k==2||k==4)?1.:0.,side=(k==0||k==1||k==3)?-1.:1.,t=(float(seg)+end)/uSegments;
 ivec2 at=ivec2(id%256,id/256);vec4 root=texelFetch(uRoots,at,0),nr=texelFetch(uNormals,at,0);
 if(root.w<.5){gl_Position=vec4(2,2,2,1);vCoverage=0.;return;}
 float len=strandLength(float(id),nr.w);
 if(uTube>.5){float foot=min(.45,(min(uHairA.y*.65,len*.08)+baseHeight(len,uHairA.y*.5))/max(.00001,len));float focused=t<.3?foot*pow(t/.3,1.4):mix(foot,1.,(t-.3)/.7);t=mix(t*t,focused,smoothstep(0.,.15,uHairBase.x));}
 vec3 p=strand(root.xyz,nr.xyz,float(id),nr.w,t),next=strand(root.xyz,nr.xyz,float(id),nr.w,min(1.,t+.002)),prev=strand(root.xyz,nr.xyz,float(id),nr.w,max(0.,t-.002));
 vec3 tangent=normalize(next-prev),right=cross(tangent,uCameraZ);right=length(right)<.00001?uCameraX:normalize(right);
 float radius=strandRadius(t,len)*uFrame.x;
 float rootRadius=uHairA.y*.5*min(1.,uHairA.x/.025),height=len*t-min(uHairA.y*.65,len*.08)*(1.-smoothstep(0.,.3,t));
 vJoin=uRootCore*uHairBase.w*smoothstep(0.,.15,uHairBase.x)*(1.-smoothstep(0.,max(.00001,baseHeight(len,rootRadius)),height));
 float pixel=2.*uCameraSize.y/uCameraSize.w,aa=max(radius,pixel*.55),coverage=min(1.,radius/(pixel*.55));
 vRootNormal=normalWorld(nr.xyz);vRootLocal=root.xyz*uAxes.xyz;vNormal=vec3(0);vWorld=p;vTangent=tangent;vAcross=vec2(side,radius);vAlong=t;vRandom=rnd(float(id)+4.);vCoverage=coverage;
 if(uTube>.5){
  // Transport a fixed root frame to the tangent instead of switching axes mid-curve.
  vec3 rn=normalWorld(nr.xyz),axis=abs(nr.y)<.95?vec3(0,1,0):vec3(1,0,0),rb=normalWorld(normalize(cross(nr.xyz,axis))),v=cross(rn,tangent);
  vec3 bx=rb+cross(v,rb)+cross(v,cross(v,rb))/max(.02,1.+dot(rn,tangent));bx=normalize(bx-tangent*dot(bx,tangent));vec3 by=cross(tangent,bx);
  float angle=(float(facet)+(side>0.?1.:0.))*6.2831853/uSides;vec3 radial=bx*cos(angle)+by*sin(angle);
  float lo=max(0.,t-.001),hi=min(1.,t+.001),slope=(strandRadius(hi,len)-strandRadius(lo,len))/max(.00001,(hi-lo)*len);
  vNormal=normalize(radial-tangent*slope);vec3 front=normalize(cross(right,tangent));vec3 offset=radial*radius;offset-=front*dot(offset,front)*(1.-uTubeDepth);vWorld=p+offset;vAcross=vec2(0.,radius);vCoverage=1.;gl_Position=project(vWorld);
 }else gl_Position=project(p+right*side*aa);}
`;
const HAIR_FRAG=HEADER+`
in vec3 vWorld,vTangent,vNormal,vRootLocal,vRootNormal;uniform float uTube,uRepOpacity;in vec2 vAcross;in float vAlong,vRandom,vCoverage,vJoin;
uniform sampler2D uCoreDepth;uniform vec2 uViewSize;
uniform sampler2D uShadow;
uniform vec3 uShadowX,uShadowY,uShadowZ;
uniform float uShadowExtent,uShadowPass,uOpaquePass;
uniform vec4 uHairColor,uPhoto1,uPhoto2,uPhoto3,uPhoto4;uniform float uRootCore;
${SPACE}
layout(location=0)out vec4 color;layout(location=1)out vec4 extinction;
float hairShadow(vec3 p){vec2 uv=vec2(dot(p,uShadowX),dot(p,uShadowY))/uShadowExtent*.5+.5;float texel=uShadowExtent*2./2048.,bias=max(.001,texel*1.4)+(uTube>.5?0.:vAcross.y);float depth=.5-(dot(p,uShadowZ)+bias)/24.;
 float sum=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=texture(uShadow,uv+vec2(x,y)/2048.).r;sum+=depth<=d?1.:0.;}return mix(1.,.3+.7*sum/9.,1.-uHairColor.w);}
const float PI=3.141592653589793;
uniform vec3 uPalette[12],uPaletteMean,uLightColors[8],uInternalColor,uSssColor;
uniform int uPaletteCount,uLightCount;
uniform vec4 uGradient,uColorWave,uColorAxis,uColorLayers,uEnvironment,uLights[8],uLightProps[8],uLightExtra[8];
uniform vec4 uMat,uSurface,uCoat,uOptics,uTexture,uScatter,uModern,uFilmMotion,uTransport,uMaterialDetail,uMaterialLayers,uOrganicDetail,uRuntime,uOther,uExtraShape3;
uniform vec2 uResolution;uniform float uSeed,uTextureSeed,uSurfaceSeed;
uniform vec3 uFilmResponse[24],uFilmWhite;
mat2 rot(float a){return turn(a);}vec3 axes(){return uAxes.xyz;}
${FILM_PATTERN_GLSL}
float filteredInterference(float phase){float width=max(.0001,fwidth(phase)*.5);return cos(phase)*sin(min(width,PI))/width;}
${GROWTH_GLSL}
${FORM_MATERIAL_GLSL.replaceAll('uSeed','uSurfaceSeed').replace('cos(4.*PI*n1*max(20.,thickness)*c1/wavelength)', 'filteredInterference(4.*PI*n1*max(20.,thickness)*c1/wavelength)')}
vec4 strandMaterial(vec3 base,vec3 local,vec3 p,vec3 normal,vec3 tangent,float radius){
 vec3 view=vec3(0,0,1),n=normal;if(dot(n,view)<0.)n=-n;
 // Unresolved highlights are filtered with roughness, without replacing the strand normal.
 float resolved=smoothstep(.75,3.,radius*uViewSize.y/(2.*uCameraSize.y));
 // Pigment follows the root; reflections follow the strand, even below a pixel.
 // Borrowing the root normal paints a false smooth body over dense opaque hair.
 vec3 cylinderFront=normalize(view-tangent*dot(view,tangent)+vec3(0,.000001,0));
 n=normalize(mix(cylinderFront,n,resolved));
 // Blend only the attachment normal, never copy the image underneath an opaque strand.
 vec3 parent=normalize(vRootNormal);if(dot(parent,view)<0.)parent=-parent;
 n=normalize(mix(n,parent,clamp(vJoin,0.,1.)));
 float rough=uMat.w;
 if(dot(uMaterialLayers,vec4(1.))>.00001||uGrowthShape.x>0.){vec4 detail=materialRelief(local,n,-view);n=reliefNormal(n,n,-view,detail.xyz*mix(resolved,1.,clamp(vJoin,0.,1.)));rough=clamp(rough+detail.w*(1.-rough),0.,1.);}
 // Filter unresolved normal variation instead of turning it into coloured glitter.
 rough=max(rough,max(mix(.38,0.,resolved),min(.7,sqrt(length(fwidth(n)))*.3)));
 float facing=max(.001,dot(n,view));vec3 spec=environment(reflect(-view,n),p,rough),diffuse=environment(n,p,1.)*.14;
 for(int i=0;i<uLightCount;i++){vec3 off=uLights[i].xyz-p;float shadow=i==0?hairShadow(p):1.;diffuse+=uLightColors[i]*max(dot(n,normalize(off)),0.)*uLights[i].w*.35/(1.+dot(off,off)*.08)*shadow;}
 vec3 dielectric=fresnel(facing,1.,max(1.,uMat.y),local),sigma=absorptionCoefficient(base);
 // Optical thickness comes from the cylinder diameter, not a fixed alpha per strand.
 float path=2.*radius/max(.15,sqrt(max(0.,1.-pow(dot(tangent,view),2.))));
 vec3 transmittance=exp(-sigma*path*4.),absorb=vec3(1.)-transmittance;
 float transmission=uMat.x,alpha=(1.-transmission)+transmission*max(max(absorb.r,absorb.g),absorb.b);
 vec3 below=(vec3(1.)-dielectric)*base*diffuse*(1.-uMat.z*(1.-transmission))*(1.-transmission)+base*absorb*transmission;
 vec3 surfaceF=dielectric*max(.1,uSurface.z)*(1.-clamp(uModern.x,0.,1.));
 below+=spec*surfaceF;alpha=1.-(1.-alpha)*(1.-max(max(surfaceF.r,surfaceF.g),surfaceF.b));
 vec3 metalF=mix(base,vec3(1.),pow(1.-facing,5.))*uMat.z*(1.-transmission*.48);
 below=below*(1.-metalF)+spec*metalF;alpha=1.-(1.-alpha)*(1.-max(max(metalF.r,metalF.g),metalF.b));
 float filmAmount=uSurface.x*mix(.6,1.,uScatter.z);vec3 thin=dielectric*2./(1.+dielectric)*clamp(uModern.x,0.,1.);
 vec3 filmF=thin;if(filmAmount>.0001)filmF=mix(thin,soapFilm(local,facing),filmAmount);filmF*=uSurface.z;
 below=below*(1.-filmF)+spec*filmF;alpha=1.-(1.-alpha)*(1.-max(max(filmF.r,filmF.g),filmF.b));
 if(uCoat.x>.001){vec3 f=fresnel(facing,1.,1.5,local)*uCoat.x;below=below*(1.-f)+environment(reflect(-view,n),p,uCoat.y)*f;alpha=1.-(1.-alpha)*(1.-max(max(f.r,f.g),f.b));}
 below+=base*uSurface.w*(1.-transmission+transmission*pow(1.-facing,3.));
 return vec4(below/max(.0001,alpha),clamp(alpha,0.,1.));
}

vec3 photoHair(vec3 c){c=max(vec3(0),c*exp2(uPhoto1.x));c=mat3(.59719,.076,.0284,.35458,.90834,.13383,.04823,.01566,.83777)*c;c=(c*(c+.0245786)-.000090537)/(c*(.983729*c+.432951)+.238081);c=clamp(mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602)*c,0.,1.);c=mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));c+=uPhoto1.y;float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,uPhoto1.w);c=(c-.5)*uPhoto1.z+.5;c+=uPhoto3.x*pow(max(0.,1.-lum),2.)+uPhoto3.y*pow(max(0.,lum),2.);c*=vec3(1.+uPhoto2.x*.18+uPhoto2.y*.08,1.-uPhoto2.y*.14,1.-uPhoto2.x*.18+uPhoto2.y*.08);return pow(max(c,vec3(0)),vec3(1./uPhoto4.x))*(1.-uPhoto2.z*smoothstep(.3,2.4,length(vWorld.xy)));}
void main(){gl_FragDepth=gl_FragCoord.z;float barrier;sculptMap(vWorld,barrier);if(max(barrier,dynamicsBarrier(vWorld))>.0001)discard;float edge=1.-smoothstep(.7,1.,abs(vAcross.x)),baseAlpha=edge*vCoverage,alpha=1.-pow(max(.0001,1.-baseAlpha),uRepOpacity);
 if(alpha<.001)discard;if(uOpaquePass>.5&&(uHairColor.w>0.||vCoverage<.999))discard;if(uOpaquePass<.5&&uShadowPass<.5&&uHairColor.w<=0.&&vCoverage>=.999)discard;if(uShadowPass>.5){if(alpha*(1.-uHairColor.w)<.5)discard;color=vec4(1);return;}
 vec3 view=vec3(0,0,1),right=normalize(cross(vTangent,view)+vec3(.000001,0,0)),radial=normalize(view-vTangent*dot(view,vTangent)+vec3(0,.000001,0));
 vec3 n=uTube>.5?normalize(vNormal):normalize(radial*sqrt(max(0.,1.-vAcross.x*vAcross.x))+right*vAcross.x);
 
 float index=clamp(vAlong+(vRandom-.5)*uHairColor.y,0.,.99999)*float(max(1,uPaletteCount-1));int a=int(floor(index)),b=min(a+1,uPaletteCount-1);vec3 along=mix(uPalette[a],uPalette[b],fract(index));
 float attachment=clamp(vJoin,0.,1.);
 vec3 base=mix(surfacePalette(vRootLocal,palette(dot(vRootLocal,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z)),along,uHairColor.x*(1.-attachment));base*=mix(1.-uHairColor.z*.9*(1.-attachment),1.,smoothstep(0.,.85,vAlong));
 vec4 material=strandMaterial(base,vRootLocal,vWorld,n,normalize(vTangent),vAcross.y);
 float visibility=gl_FragCoord.z>texture(uCoreDepth,gl_FragCoord.xy/uViewSize).r+.00004?1.-uRootCore:1.;
 alpha=1.-pow(max(.0001,1.-baseAlpha*material.a*visibility),uRepOpacity);if(alpha<.0001)discard;
 vec3 lit=material.rgb;
 // The attachment is shaded as geometry, so opaque roots also occlude the core.
 vec3 shaded=photoHair(lit);
 if(uOpaquePass>.5){gl_FragDepth=gl_FragCoord.z-(uTube>.5?0.:sqrt(max(0.,1.-vAcross.x*vAcross.x))*vAcross.y/24.);color=vec4(shaded,alpha);extinction=vec4(0);return;}alpha=min(.98,alpha);float weight=clamp(pow(1.-gl_FragCoord.z,12.)*5000.,.02,100.);color=vec4(shaded*alpha*weight,alpha*weight);extinction=vec4(-log(max(.001,1.-alpha)),0,0,0);}
`;
const RESOLVE=HEADER+`uniform sampler2D uScene,uAccum,uExtinction;uniform vec2 uSize;out vec4 color;
void main(){vec2 uv=gl_FragCoord.xy/uSize;vec4 base=texture(uScene,uv),sum=texture(uAccum,uv);float alpha=1.-exp(-texture(uExtinction,uv).r);vec3 hair=sum.rgb/max(.00001,sum.a);float a=alpha+base.a*(1.-alpha);color=vec4((hair*alpha+base.rgb*base.a*(1.-alpha))/max(.00001,a),a);}`;
const rgb=hex=>[1,3,5].map(i=>{const v=parseInt(hex.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
const norm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export class FilamentPass{
 constructor(gl){this.gl=gl;this.parallelExtension=gl.getExtension('KHR_parallel_shader_compile');this.pendingPrograms=new Set();if(!gl.getExtension('EXT_color_buffer_float'))throw Error('I filamenti richiedono una GPU con buffer colore float.');this.resolveProgram=this.program(QUAD,RESOLVE);this.rootProgram=this.program(QUAD,ROOT);this.coreProgram=this.program(QUAD,CORE);this.hairProgram=this.program(HAIR_VERT,HAIR_FRAG);this.vao=gl.createVertexArray();this.roots=this.target(256,235,true);this.shadow=this.target(2048,2048,false,true);this.scene=gl.createTexture();this.rootBuilds=0;}
 program(v,f){const g=this.gl,p=g.createProgram();for(const [type,source] of [[g.VERTEX_SHADER,v],[g.FRAGMENT_SHADER,f]]){const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);g.attachShader(p,s);g.deleteShader(s);}g.linkProgram(p);const result={program:p,locations:{},ready:false};this.pendingPrograms.add(result);return result;}
 finishProgram(p){if(p.ready)return;const g=this.gl;if(!g.getProgramParameter(p.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p.program)||'Impossibile preparare i filamenti.');for(let i=0;i<g.getProgramParameter(p.program,g.ACTIVE_UNIFORMS);i++){const u=g.getActiveUniform(p.program,i);p.locations[u.name.replace('[0]','')]=g.getUniformLocation(p.program,u.name);}p.ready=true;this.pendingPrograms.delete(p);}
 prepare(){let ready=true;for(const p of this.pendingPrograms){if(this.parallelExtension&&!this.gl.getProgramParameter(p.program,this.parallelExtension.COMPLETION_STATUS_KHR)){ready=false;continue;}this.finishProgram(p);}return ready;}
 async prepareAsync(o={}){while(!o.cancelled?.()){if(this.gl.isContextLost())throw Error('La GPU è stata interrotta.');if(this.prepare())return true;o.onStage?.('preparing');await new Promise(r=>setTimeout(r,16));}return false;}

 u(p,key,...v){this.finishProgram(p);this.gl['uniform'+v.length+'fv'](p.locations[key]??null,v);}
 tex(p,key,t,unit){this.finishProgram(p);const g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,t);g.uniform1i(p.locations[key]??null,unit);}
 texture(w,h,format,internal,type){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,internal,w,h,0,format,type,null);for(const k of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,k,g.NEAREST);for(const k of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,k,g.CLAMP_TO_EDGE);return t;}
 target(w,h,roots=false,shadow=false){const g=this.gl,fbo=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,fbo);const t={fbo,w,h,textures:[]};if(shadow){t.depth=this.texture(w,h,g.DEPTH_COMPONENT,g.DEPTH_COMPONENT24,g.UNSIGNED_INT);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,t.depth,0);g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);}else{for(let i=0;i<(roots?2:1);i++){const tex=this.texture(w,h,g.RGBA,roots?g.RGBA16F:g.RGBA8,roots?g.HALF_FLOAT:g.UNSIGNED_BYTE);t.textures.push(tex);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0+i,g.TEXTURE_2D,tex,0);}g.drawBuffers(t.textures.map((_,i)=>g.COLOR_ATTACHMENT0+i));}if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Buffer filamenti incompleto');g.bindFramebuffer(g.FRAMEBUFFER,null);return t;}
 resize(w,h){if(this.width===w&&this.height===h)return;this.release();const g=this.gl;this.width=w;this.height=h;this.coreDepth=this.target(w,h,false,true);this.oit=this.target(w,h,true);this.oit.depth=g.createRenderbuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.oit.fbo);g.bindRenderbuffer(g.RENDERBUFFER,this.oit.depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT24,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,this.oit.depth);this.fbo=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);this.color=g.createRenderbuffer();this.depth=g.createRenderbuffer();const samples=Math.min(4,g.getParameter(g.MAX_SAMPLES));for(const [r,format,attachment] of [[this.color,g.RGBA8,g.COLOR_ATTACHMENT0],[this.depth,g.DEPTH_COMPONENT24,g.DEPTH_ATTACHMENT]]){g.bindRenderbuffer(g.RENDERBUFFER,r);g.renderbufferStorageMultisample(g.RENDERBUFFER,samples,format,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,attachment,g.RENDERBUFFER,r);}if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Antialias filamenti non disponibile');const floatSamples=[...g.getInternalformatParameter(g.RENDERBUFFER,g.RGBA16F,g.SAMPLES)];
 if(w*h<=4194304&&floatSamples.includes(samples)&&samples>1){this.oitMs={fbo:g.createFramebuffer(),buffers:[]};g.bindFramebuffer(g.FRAMEBUFFER,this.oitMs.fbo);for(const [format,attachment]of [[g.RGBA16F,g.COLOR_ATTACHMENT0],[g.RGBA16F,g.COLOR_ATTACHMENT1]]){const buffer=g.createRenderbuffer();this.oitMs.buffers.push(buffer);g.bindRenderbuffer(g.RENDERBUFFER,buffer);g.renderbufferStorageMultisample(g.RENDERBUFFER,samples,format,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,attachment,g.RENDERBUFFER,buffer);}g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,this.depth);g.drawBuffers([g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Antialias trasparenza incompleto');}
 g.bindFramebuffer(g.FRAMEBUFFER,null);}
 field(p,s,solid){this.tex(p,'uField',solid.fieldTexture,3);this.u(p,'uAtlas',...solid.fieldAtlas);this.u(p,'uFieldMin',...solid.fieldMin);this.u(p,'uFieldMax',...solid.fieldMax);this.u(p,'uFieldWarp',...(solid.fieldWarp||[0,0]));this.u(p,'uPrimitive',+solid.cachedBasePrimitive);this.u(p,'uFloat',+solid.fieldHalfFloat);this.u(p,'uDeferred',+solid.deferredStructure);this.u(p,'uBaseForm',s.baseForm||0);}
 common(p,s,camera,w,h){const g=this.gl;g.useProgram(p.program);this.u(p,'uFrame',s.scale,s.positionX,s.positionY,0);this.u(p,'uAxes',s.stretchX,s.stretchY,Math.max(.06,s.volume*s.stretchZ),0);this.u(p,'uAngles',s.rotateX*Math.PI/180,s.rotateY*Math.PI/180,s.rotateZ*Math.PI/180,0);this.u(p,'uCameraX',...camera.x);this.u(p,'uCameraY',...camera.y);this.u(p,'uCameraZ',...camera.z);this.u(p,'uCameraSize',camera.ex,camera.ey,w,h);this.u(p,'uLens',camera.shadow?0:s.lensDistortion||0);this.u(p,'uShadowPass',+!!camera.shadow);this.u(p,'uSeed',(s.seed%997)*.013);this.u(p,'uHairScatter',s.filScatter);this.locations=p.locations;this.program=p.program;uploadSolidForces(this,s);}
 hair(s,camera,w,h,phase){const physical=this.previewGeometry?0:Math.max(0,Math.min(1,(s.filWidth-.006)/.006)),projected=camera.shadow&&!this.previewGeometry?0:Math.max(0,Math.min(1,(s.filWidth*.5*s.scale*h/(2*camera.ey)-.6)/.8)),x=Math.max(physical,projected),mix=x*x*(3-2*x);if(s.transparency===0){this.hairPart(s,camera,w,h,phase,mix>0,1,mix);return;}if(mix<1)this.hairPart(s,camera,w,h,phase,false,1-mix);if(mix>0)this.hairPart(s,camera,w,h,phase,true,mix);}
 hairPart(s,camera,w,h,phase,tube,opacity,tubeDepth=1){const g=this.gl,p=this.hairProgram;this.common(p,s,camera,w,h);this.tex(p,'uRoots',this.roots.textures[0],0);this.tex(p,'uNormals',this.roots.textures[1],1);this.tex(p,'uShadow',camera.shadow?this.roots.textures[0]:this.shadow.depth,2);
 bindGrowth(g,p.program,s,phase);
 const pixelsPerUnit=s.scale*h/(2*camera.ey),radiusPixels=s.filWidth*.5*pixelsPerUnit;
 const sides=Math.max(12,Math.min(32,Math.ceil(Math.PI*Math.sqrt(Math.max(1,radiusPixels*(1+s.filBaseWidth))/.12)/2)*2));
 const curvature=.08+Math.abs(s.filBend)*.3+Math.abs(s.filComb)*.25+s.filClump*.5+s.filCurl*4+s.filFrizz*6+s.filWind;
 const segments=Math.max(24,Math.min(112,Math.ceil(Math.sqrt(s.filLength*pixelsPerUnit*curvature)*2.2/4)*4));
 this.tex(p,'uCoreDepth',this.coreDepth.depth,6);this.u(p,'uViewSize',w,h);this.u(p,'uRootCore',s.filCore*(1-s.transparency));this.u(p,'uHairBase',s.filBaseWidth,s.filBaseHeight,s.filBaseCurve,s.filBaseBlend);this.u(p,'uRepOpacity',opacity);this.u(p,'uTube',+tube);this.u(p,'uTubeDepth',tubeDepth);this.u(p,'uSides',sides);this.u(p,'uOpaquePass',camera.opaque?1:0);this.u(p,'uSegments',segments);g.uniform2i(p.locations.uRootOrder,this.rootCount,this.rootStride);this.u(p,'uHairA',s.filLength,s.filWidth,s.filTaper,0);this.u(p,'uHairB',s.filVariation,s.filBend,s.filComb,s.filCurl);this.u(p,'uHairC',s.filClump,s.filClumps,s.filSpread,s.filFrizz);this.u(p,'uHairD',s.filPhase,s.filWind,0,0);this.u(p,'uHairColor',s.filColor,s.filColorScatter,s.filRootShade,s.transparency);this.u(p,'uShadowX',...this.lightCamera.x);this.u(p,'uShadowY',...this.lightCamera.y);this.u(p,'uShadowZ',...this.lightCamera.z);this.u(p,'uShadowExtent',this.lightCamera.ex);
 const rad=Math.PI/180;this.u(p,'uMat',s.transparency,s.refraction,s.metal,Math.min(1,s.roughness+(1-s.gloss)*.35));this.u(p,'uSurface',s.iridescence,s.thickness,s.gloss,s.emission);this.u(p,'uCoat',s.coat||0,s.coatRoughness||.1,s.fresnel??1,s.iridShift||0);this.u(p,'uOptics',s.iridScale||1,s.dispersion||0,s.absorption||0,s.tintStrength??.15);this.u(p,'uTexture',s.anisotropy||0,(s.anisotropyAngle||0)*rad,s.surfaceTexture||0,0);this.u(p,'uScatter',s.scatterDirection??.25,0,s.thinFilm||0,s.filmThickness??420);this.u(p,'uModern',s.thinShell||0,0,0,0);
 this.u(p,'uResolution',w,h);this.u(p,'uOther',s.rotateY*rad,s.rotateX*rad,0,0);this.u(p,'uExtraShape3',0,0,s.rotateZ*rad,0);this.u(p,'uRuntime',0,0,0,16);this.u(p,'uMaterialDetail',s.textureDepth??.35,s.textureScale??1,s.textureOrganic??.65,(s.textureAngle||0)*rad);this.u(p,'uMaterialLayers',s.textureWrinkles||0,s.textureFolds||0,s.textureWear||0,s.textureRipples||0);this.u(p,'uOrganicDetail',s.textureRandomness||0,s.textureWarp||0,s.textureLink||0,s.texturePatch||0);this.u(p,'uTextureSeed',s.textureSeed||0);this.u(p,'uSurfaceSeed',(s.seed%1000)*.013);
 this.u(p,'uTransport',s.subsurface||0,s.sssRadius??.35,0,0);this.u(p,'uSssColor',...rgb(s.sssColor||'#ffc49b'));this.u(p,'uInternalColor',...rgb(s.internalColor||'#e6f5ff'));
 this.u(p,'uFilmPattern',s.filmPattern||0,s.filmPatternScale??1.5,s.filmPatternWarp??.8,s.filmPatternDetail??.5);this.u(p,'uFilmAccent',s.filmChroma||0,s.filmDuo||0);this.u(p,'uFilmMotion',phase*(s.filmCycles||1),s.filmFlow||0,s.filmSwirl||0,24);g.uniform3fv(p.locations.uFilmResponse,FILM_SPECTRUM.data);g.uniform3fv(p.locations.uFilmWhite,FILM_SPECTRUM.white);
 this.u(p,'uEnvironment',['studio','sunset','neon','sky','aquarium','aurora','city'].indexOf(s.environment),s.environmentAngle*rad,s.environmentPower,0);this.u(p,'uGradient',s.gradientAngle*rad,s.gradientScale,s.gradientOffset,s.colorSoftness);this.u(p,'uColorWave',s.colorWaveAmount||0,s.colorWaveBands??1,s.colorWaveWarp??.2,((s.colorWavePhase||0)%1+1)%1);this.u(p,'uColorAxis',s.colorWaveHeight??1,s.colorWaveRadius||0,s.colorWaveSwirl||0,0);this.u(p,'uColorLayers',s.colorLayers||0,s.colorLayerScale??1,s.colorLayerShift||0,s.colorLayerMix??.5);
 g.uniform1i(p.locations.uPaletteCount,s.palette.length);g.uniform3fv(p.locations.uPalette,s.palette.flatMap(rgb));this.u(p,'uPaletteMean',...s.palette.map(rgb).reduce((sum,c)=>sum.map((v,i)=>v+c[i]/s.palette.length),[0,0,0]));
 const lights=s.lights.filter(l=>l.enabled).slice(0,8),types={circle:0,bar:1,spot:2,diffuser:3,grid:4,ring:5,orb:6};g.uniform1i(p.locations.uLightCount,lights.length);if(lights.length){g.uniform4fv(p.locations.uLights,lights.flatMap(l=>[l.x,l.y,l.z,l.power]));g.uniform3fv(p.locations.uLightColors,lights.flatMap(l=>rgb(l.color)));g.uniform4fv(p.locations.uLightProps,lights.flatMap(l=>[l.size,l.length,l.roll*rad,types[l.type]??0]));g.uniform4fv(p.locations.uLightExtra,lights.flatMap(l=>[l.softness,Math.tan(l.cone*rad),l.grid,+!!l.visible]));}
 this.u(p,'uPhoto1',s.exposure||0,s.brightness||0,s.contrast??1,s.saturation??1);this.u(p,'uPhoto2',s.temperature||0,s.photoTint||0,s.vignette||0,0);this.u(p,'uPhoto3',s.blacks||0,s.highlights||0,0,0);this.u(p,'uPhoto4',s.gamma||1,0,0,0);g.drawArraysInstanced(g.TRIANGLES,0,segments*6*(tube?sides:1),this.drawCount);}
 draw(frame,phase,w,h,solid,options={}){const s={...FILAMENT_DEFAULTS,...frame};if(s.filLength<=.000001)return;const g=this.gl;
 this.previewGeometry=!!options.preview&&options.quality==='fast';const budget=this.previewGeometry?Math.max(1/16,Math.min(1,options.geometryBudget??1)):1;
 this.rootCount=Math.round(s.filCount);this.drawCount=Math.min(this.rootCount,Math.max(100,Math.round(this.rootCount*budget)));this.rootStride=1;
 // A nested, evenly distributed subset: taking the first Fibonacci roots
 // would leave only one polar cap. Export keeps the original complete order.
 if(this.drawCount<this.rootCount){let step=Math.max(1,Math.floor(this.rootCount*.61803398875)),gcd=(a,b)=>b?gcd(b,a%b):a;while(gcd(step,this.rootCount)!==1)step++;this.rootStride=step;}
 this.previewCounts={filaments:this.drawCount};const shadowSize=this.previewGeometry?512:2048;
 if(this.shadow.w!==shadowSize){g.deleteFramebuffer(this.shadow.fbo);g.deleteTexture(this.shadow.depth);this.shadow=this.target(shadowSize,shadowSize,false,true);}

 // The solid renderer owns the cached field; no second independent shape.
 solid.ensurePreviewField(s,options,s);this.resize(w,h);g.bindVertexArray(this.vao);g.disable(g.SCISSOR_TEST);g.disable(g.BLEND);g.disable(g.CULL_FACE);g.disable(g.DEPTH_TEST);g.depthMask(true);g.colorMask(true,true,true,true);
 const main={x:[1,0,0],y:[0,1,0],z:[0,0,1],ex:1.7*w/Math.min(w,h),ey:1.7*h/Math.min(w,h)};
 const light=s.lights.find(l=>l.enabled),z=norm(light?[light.x-s.positionX,light.y-s.positionY,light.z]:[-2,3,4]),x=norm(cross(Math.abs(z[1])>.95?[1,0,0]:[0,1,0],z)),y=cross(z,x),extent=Math.max(3,Math.max(...solid.fieldMax.map(Math.abs))*(Math.max(s.stretchX,s.stretchY,s.volume*s.stretchZ)+s.filLength)*s.scale+Math.hypot(s.positionX,s.positionY)+(s._dynamics?.max||0)*2);this.lightCamera={x,y,z,ex:extent,ey:extent,shadow:true};
 const key=JSON.stringify([solid.cachedBasePrimitive?s.baseForm:solid.fieldKey,solid.fieldWarp,s.filCount,s.seed,s.filClumps,s.filScatter]);if(key!==this.rootKey){g.bindFramebuffer(g.FRAMEBUFFER,this.roots.fbo);g.viewport(0,0,256,235);this.common(this.rootProgram,s,main,256,235);this.field(this.rootProgram,s,solid);this.u(this.rootProgram,'uCount',s.filCount);this.u(this.rootProgram,'uClumps',s.filClumps);g.drawArrays(g.TRIANGLES,0,3);this.rootKey=key;this.rootBuilds++;}
 // Capture only after the root pass; it never touches the default framebuffer.
 g.bindFramebuffer(g.FRAMEBUFFER,null);g.activeTexture(g.TEXTURE5);g.bindTexture(g.TEXTURE_2D,this.scene);g.copyTexImage2D(g.TEXTURE_2D,0,g.RGBA,0,0,w,h,0);for(const k of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,k,g.NEAREST);for(const k of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,k,g.CLAMP_TO_EDGE);
 this.common(this.coreProgram,s,main,w,h);this.field(this.coreProgram,s,solid);this.tex(this.coreProgram,'uScene',this.scene,5);this.u(this.coreProgram,'uBound',extent);this.u(this.coreProgram,'uCore',s.filCore);this.u(this.coreProgram,'uDepthOnly',1);g.bindFramebuffer(g.FRAMEBUFFER,this.coreDepth.fbo);g.viewport(0,0,w,h);g.enable(g.DEPTH_TEST);g.depthFunc(g.ALWAYS);g.drawArrays(g.TRIANGLES,0,3);this.u(this.coreProgram,'uDepthOnly',0);
 for(const camera of [this.lightCamera,main]){const shadow=!!camera.shadow,cw=shadow?this.shadow.w:w,ch=shadow?this.shadow.h:h;g.bindFramebuffer(g.FRAMEBUFFER,shadow?this.shadow.fbo:this.fbo);g.viewport(0,0,cw,ch);g.enable(g.DEPTH_TEST);g.depthFunc(g.ALWAYS);g.clearDepth(1);g.clear(g.DEPTH_BUFFER_BIT);this.common(this.coreProgram,s,camera,cw,ch);this.field(this.coreProgram,s,solid);this.tex(this.coreProgram,'uScene',this.scene,5);this.u(this.coreProgram,'uBound',extent);this.u(this.coreProgram,'uCore',s.filCore*(1-s.transparency));g.drawArrays(g.TRIANGLES,0,3);g.depthFunc(g.LEQUAL);if(!shadow){if(s.transparency===0){g.enable(g.SAMPLE_ALPHA_TO_COVERAGE);this.hair(s,{...camera,opaque:true},cw,ch,phase);g.disable(g.SAMPLE_ALPHA_TO_COVERAGE);}g.bindFramebuffer(g.READ_FRAMEBUFFER,this.fbo);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,this.oitMs?.fbo||this.oit.fbo);if(!this.oitMs)g.blitFramebuffer(0,0,w,h,0,0,w,h,g.DEPTH_BUFFER_BIT,g.NEAREST);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,null);g.blitFramebuffer(0,0,w,h,0,0,w,h,g.COLOR_BUFFER_BIT,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,null);g.activeTexture(g.TEXTURE5);g.bindTexture(g.TEXTURE_2D,this.scene);g.copyTexSubImage2D(g.TEXTURE_2D,0,0,0,0,0,w,h);g.bindFramebuffer(g.FRAMEBUFFER,this.oitMs?.fbo||this.oit.fbo);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.depthMask(false);g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE);}this.hair(s,camera,cw,ch,phase);g.disable(g.BLEND);g.depthMask(true);}
 if(this.oitMs){g.bindFramebuffer(g.READ_FRAMEBUFFER,this.oitMs.fbo);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,this.oit.fbo);for(let i=0;i<2;i++){g.readBuffer(g.COLOR_ATTACHMENT0+i);g.drawBuffers(i?[g.NONE,g.COLOR_ATTACHMENT1]:[g.COLOR_ATTACHMENT0,g.NONE]);g.blitFramebuffer(0,0,w,h,0,0,w,h,g.COLOR_BUFFER_BIT,g.NEAREST);}g.drawBuffers([g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);}
 g.bindFramebuffer(g.FRAMEBUFFER,null);g.disable(g.DEPTH_TEST);g.useProgram(this.resolveProgram.program);this.tex(this.resolveProgram,'uScene',this.scene,0);this.tex(this.resolveProgram,'uAccum',this.oit.textures[0],1);this.tex(this.resolveProgram,'uExtinction',this.oit.textures[1],2);this.u(this.resolveProgram,'uSize',w,h);g.drawArrays(g.TRIANGLES,0,3);g.bindVertexArray(null);g.activeTexture(g.TEXTURE0);
 }
 release(){const g=this.gl;if(this.oitMs){g.deleteFramebuffer(this.oitMs.fbo);for(const b of this.oitMs.buffers)g.deleteRenderbuffer(b);this.oitMs=null;}if(this.coreDepth){g.deleteFramebuffer(this.coreDepth.fbo);g.deleteTexture(this.coreDepth.depth);this.coreDepth=null;}if(this.oit){g.deleteFramebuffer(this.oit.fbo);for(const t of this.oit.textures)g.deleteTexture(t);g.deleteRenderbuffer(this.oit.depth);this.oit=null;}if(this.fbo)g.deleteFramebuffer(this.fbo);if(this.color)g.deleteRenderbuffer(this.color);if(this.depth)g.deleteRenderbuffer(this.depth);this.fbo=this.color=this.depth=null;this.width=this.height=0;}
 dispose(){const g=this.gl;this.release();for(const p of [this.rootProgram,this.coreProgram,this.hairProgram,this.resolveProgram])g.deleteProgram(p.program);for(const t of [this.roots,this.shadow]){g.deleteFramebuffer(t.fbo);for(const tex of t.textures)g.deleteTexture(tex);if(t.depth)g.deleteTexture(t.depth);}g.deleteTexture(this.scene);if(this.sculptTexture)g.deleteTexture(this.sculptTexture);g.deleteVertexArray(this.vao);}
}
