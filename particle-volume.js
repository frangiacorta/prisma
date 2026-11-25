// Deposit animated points into depth slices, then integrate extinction
// from front to back. Density differences provide a local lighting normal.
import {livingAttachmentGLSL} from './living-composition.js?v=88d17b3ed245';
import {materialCavity} from './particle-shading.js?v=88d17b3ed245';

export const volumeResolveGLSL=`
uniform highp sampler2D uViewDensity;
uniform vec4 uViewVolume;
uniform vec3 uVolumeLight;
vec2 densityAddress(int layer,vec2 uv){
 return (vec2(layer%4,layer/4)+(1.+clamp(uv,0.,1.)*(uViewVolume.zw-2.))/uViewVolume.zw)/vec2(4.,3.);
}
float densityAt(int layer,vec2 uv){return layer<0||layer>11?0.:texture(uViewDensity,densityAddress(layer,uv)).a;}
vec4 viewVolume(vec2 uv){
 if(uViewVolume.x<=0.||any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1))))return vec4(0.);
 vec3 light=vec3(0.);float transmission=1.;vec2 cell=1./uViewVolume.zw;
 for(int i=0;i<12;i++){
  vec4 voxel=texture(uViewDensity,densityAddress(i,uv));
  if(voxel.a<=.0001)continue;
  float opacity=1.-exp(-min(12.,max(0.,voxel.a)*uViewVolume.x));
  vec3 gradient=vec3(densityAt(i,uv-vec2(cell.x,0.))-densityAt(i,uv+vec2(cell.x,0.)),
   densityAt(i,uv-vec2(0.,cell.y))-densityAt(i,uv+vec2(0.,cell.y)),(densityAt(i+1,uv)-densityAt(i-1,uv))*.28);
  float normalLength=length(gradient),diffuse=normalLength>.0001?max(0.,dot(gradient/normalLength,uVolumeLight)):0.;
  float contrast=smoothstep(0.,.36,normalLength)*min(1.,uViewVolume.x*.8);
  light+=transmission*opacity*(voxel.rgb/max(.0001,voxel.a))*mix(1.,.48+1.13*diffuse,contrast);
  transmission*=1.-opacity;
  if(transmission<.005)break;
 }
 return vec4(light*uViewVolume.y,1.-transmission);
}`;

const vertex=common=>`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${common}
${livingAttachmentGLSL}
uniform sampler2D uSeeds;
uniform vec4 uDeposit;
uniform vec4 uVolumeMaterial;
uniform ivec2 uCloudSamples;
uniform vec2 uTileSize;
out vec3 vLight;
out float vMass;
flat out vec2 vOrigin;
void main(){
 int index=min(uCloudSamples.x-1,int((float(gl_VertexID/2)+.5)*float(uCloudSamples.x)/float(uCloudSamples.y)));
 vec4 seed=grainSeed(uSeeds,index);
 vec3 p=attachedPosition(seed,uPhase);
 vec4 clip=project(p);
 float layer=clamp((.5-p.z/uDeposit.z)*11.,0.,10.999);
 int secondary=gl_VertexID%2,i=int(floor(layer))+secondary;
 vec2 tile=vec2(i%4,i/4);vOrigin=tile*uTileSize;
 gl_Position=vec4(((clip.xy/clip.w*.5+.5)+tile)/vec2(4.,3.)*2.-1.,0.,1.);
 if(p.z< -100.||max(abs(clip.x),abs(clip.y))>1.2)gl_Position=vec4(2.,2.,0.,1.);
 gl_PointSize=uDeposit.x*mix(.76,1.3,seed.y);
 vMass=uDeposit.y*(secondary==0?1.-fract(layer):fract(layer));
 vec3 base=particleColor(seed,p);
 vec3 irradiance=vec3(.15)+uEnvironment.z*.45;
 for(int light=0;light<uLightCount;light++){
  vec3 offset=uLights[light].xyz-p;float d2=max(.12,dot(offset,offset));
  float c=offset.z*inversesqrt(d2),g=clamp(uVolumeMaterial.x,-.76,.76);
  float phase=(1.-g*g)/pow(max(.12,1.+g*g+2.*g*c),1.5);
  irradiance+=uLightColors[light]*(uLights[light].w/(.4+d2))*opticalVisibility(p,light)*mix(1.,phase,.8)*1.7;
 }
 vec3 absorption=exp(-uVolumeMaterial.y*.46*max(.03,uVolumeMaterial.w)*(1.-base));
 vLight=(base*absorption*irradiance+base*uFinish.x*.4)*particleCoreShade(p);
 vLight=mix(vLight,irradiance*base,.26*uVolumeMaterial.z);
}`;

const fragment=`#version 300 es
precision highp float;
in vec3 vLight;
in float vMass;
flat in vec2 vOrigin;
uniform vec2 uTileSize;
out vec4 color;
void main(){
 vec2 tile=gl_FragCoord.xy-vOrigin;
 if(any(lessThan(tile,vec2(0)))||any(greaterThanEqual(tile,uTileSize)))discard;
 vec2 coords=gl_PointCoord*2.-1.;float radius=dot(coords,coords);
 if(radius>=1.)discard;
 float amount=vMass*(1.-radius)*(1.-radius);
 color=vec4(vLight*amount,amount);
}`;

export const particleVolumeAmount=s=>s.pCount>0&&s.pOpacity>0?Math.min(1,(s.scattering||0)+(s.translucency||0)*.5+(s.subsurface||0)*.33):0;

export class ParticleVolume{
 constructor(owner,common){this.owner=owner;this.program=owner.program(vertex(common),fragment);}
 draw(s,phase,w,h,source){
  const o=this.owner,g=o.gl;
  const scale=Math.min(1/2,480/Math.max(w,h));
  const width=Math.max(32,Math.ceil(w*scale)),height=Math.max(24,Math.ceil(h*scale));
  if(this.target?.w!==width*4||this.target?.h!==height*3){this.release();this.target=o.target(width*4,height*3);}
  o.bind(this.target);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);
  g.disable(g.DEPTH_TEST);g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE);g.bindVertexArray(o.empty);
  const p=this.program,points=Math.max(1,Math.round(s.pCount)),count=Math.min(points,source.preview&&source.quality==='fast'?28000:100000);
  const pixel=Math.max(4,Math.min(34,(.032+.025*s.subsurface+.018*s.translucency)*height));
  o.settings(p,s,phase);o.tex(p,'uSeeds',o.seedTexture,2);o.u(p,'uTileSize',width,height);
  const material=1-Math.pow(materialCavity(s),3);
  o.u(p,'uVolumeMaterial',s.scatterDirection,s.absorption,s.translucency,(s.thickness??1)*material);
  o.u(p,'uDeposit',pixel,Math.min(3,w*h/(count*pixel*pixel)*.46)*s.pOpacity*material,Math.max(2.8,s.scale*s.pOpticalExtent*2),0);
  g.uniform2i(o.loc(p,'uCloudSamples'),points,count);
  g.drawArrays(g.POINTS,0,count*2);
  g.disable(g.BLEND);g.bindVertexArray(null);
  return {texture:this.target.texture,width,height,amount:particleVolumeAmount(s)};
 }
 release(){if(!this.target)return;const g=this.owner.gl;g.deleteTexture(this.target.texture);g.deleteFramebuffer(this.target.fbo);this.target=null;}
 dispose(){this.release();this.owner.pendingPrograms.delete(this.program);this.owner.gl.deleteProgram(this.program.program);}
}
