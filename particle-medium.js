import {bodyFieldGLSL,bindBodyField} from './body-samples.js?v=0049c9863913';
import {prismaPaletteGLSL} from './particle-shading.js?v=0049c9863913';
import {simplex3DGLSL} from './vendor/webgl-noise/simplex-3d.js?v=0049c9863913';

const header=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 color;
`;
const vertex=`#version 300 es
out vec2 uv;
void main(){uv=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(uv*2.-1.,0.,1.);}`;
const bounds=`
uniform vec3 uFogMin,uFogMax;
uniform vec4 uFogAtlas;
`;

// Bake the moving, three-dimensional density once per scene sample. View and
// light rays then reuse the same density, so shadows follow the smoke detail.
const bake=header+bounds+bodyFieldGLSL+simplex3DGLSL+`
uniform vec4 uFogShape,uFogMotion,uFogPattern,uFogLight;
uniform vec2 uFogCut;
uniform float uHasBody,uFogSeed;
uniform int uCellNeighbors;
float cloudDistance(vec3 p){
 float d=length(p)-uFogShape.y;
 float hole=uFogShape.x;
 if(hole>.001){
  vec2 q=vec2(length(p.xz)-(.64+.33*hole)*uFogShape.y,p.y);
  d=mix(d,length(q)-max(.09,.56-.37*hole)*uFogShape.y,smoothstep(0.,.92,hole));
 }
 return d;
}
vec3 siteOffset(vec3 cell){
 vec3 h=vec3(dot(cell,vec3(27.1,97.7,43.1)),dot(cell,vec3(71.2,31.6,89.4)),dot(cell,vec3(45.7,73.2,12.8)));
 return .18+.64*fract(sin(h)*43758.5453);
}
vec2 cellularRidges(vec3 p){
 vec3 cell=floor(p),f=fract(p),closest=vec3(8.);
 for(int neighbor=0;neighbor<uCellNeighbors;neighbor++){
  vec3 offset=vec3(neighbor%3,(neighbor/3)%3,neighbor/9)-1.;
  vec3 delta=offset+siteOffset(cell+offset)-f;
  float distance=dot(delta,delta),second=max(distance,closest.x);
  closest=vec3(min(distance,closest.x),min(second,closest.y),min(max(second,closest.y),closest.z));
 }
 vec3 d=sqrt(closest);
 return d.yz-d.x;
}
// Three Fourier modes with transverse velocity. The field bends strands
// coherently without creating sharp local compression at individual cells.
vec3 coherentFlow(vec3 p,float time){
 vec3 k1=vec3(2.3,-1.7,1.2),k2=vec3(-1.1,2.8,1.7),k3=vec3(1.5,1.1,-3.1);
 return vec3(0.,k1.z,-k1.y)*sin(dot(p,k1)+time)*.32+
  vec3(k2.z,0.,-k2.x)*cos(dot(p,k2)-time)*.27+
  vec3(k3.y,-k3.x,0.)*sin(dot(p,k3)+2.*time)*.22;
}
void main(){
 float n=uFogAtlas.x,cell=n+2.;
 vec2 pixel=floor(gl_FragCoord.xy),tile=floor(pixel/cell);
 float layer=tile.x+tile.y*uFogAtlas.y;
 if(layer>=n){color=vec4(0.);return;}
 vec3 voxel=vec3(clamp(pixel-tile*cell-1.,0.,n-1.),layer);
 vec3 p=mix(uFogMin,uFogMax,voxel/(n-1.));
 float d=uHasBody>.5?distanceAt(p):cloudDistance(p);
 float turbulence=uFogPattern.x,web=uFogPattern.y,frequency=uFogPattern.z;
 if(d>mix(.055,.25,turbulence)+web*.33){color=vec4(0.);return;}
 float time=uFogMotion.x;
 vec2 orbit=vec2(cos(time),sin(time));
 vec3 bend=p+vec3(orbit.y,orbit.x,orbit.x-orbit.y)*uFogMotion.y*.21;
 float turn=uFogMotion.z*(p.y*.52+orbit.y*.2);
 bend.xz=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*bend.xz;
 vec3 q=bend*frequency+vec3(uFogSeed*.83,uFogSeed,-uFogSeed*.65);
 vec3 curl=vec3(snoise(q*.5),snoise(q*.5+vec3(13.,7.,3.)),snoise(q*.5+vec3(2.,15.,5.)));
 q+=curl*(.33+turbulence*.78);
 float coarse=snoise(q),fold=snoise(q*2.14+vec3(1.7,3.2,-8.1));
 float detail=turbulence>.05?snoise(q*4.2):0.;
 float erosion=(.56*coarse+.29*fold+.15*detail)*turbulence;
 float pocketDepth=uFogCut.x*(1.-web);
 if(pocketDepth>.001){
  vec3 recession=p-vec3(.08,-.03,.61);
  float indentation=uFogCut.y*.72-length(recession*vec3(1.1,.9,.58))+erosion*.19;
  d=mix(d,max(d,indentation),pocketDepth);
 }
 float shell=1.-smoothstep(-.058,.019,d+erosion*.15);
 float pocket=abs(snoise(q*.85+vec3(11.,-7.,-2.)));
 float plume=1.-smoothstep(.34,.89,pocket+turbulence*.3*fold);
 float cloud=shell*mix(.66,smoothstep(-.28,.44,.025+erosion+.24*coarse)*plume,turbulence);
 float weather=snoise(bend*2.22+vec3(uFogSeed,3.,13.));
 cloud*=1.-turbulence*.84*smoothstep(.02,.56,weather)*smoothstep(-.97,-.08,-d);
 float knot=0.,ridge=0.;
 if(web>.001){
  // A triple boundary between nearby cells is a connected edge in 3D.
  float rhythm=time*uFogLight.x-1.7+sin(time-.5)*uFogLight.z;
  float localPhase=rhythm+sin(rhythm)*(.21+.36*uFogLight.w);
  float flash=pow(.5+.5*cos(localPhase),9.5)*uFogLight.y;
  float swell=pow(.5+.5*cos(localPhase-.29),2.35)*uFogLight.y;
  vec3 center=vec3(orbit.y*.42+.1*sin(time*2.),orbit.x*.34,orbit.y*.19)*(.36+.64*uFogMotion.w);
  vec3 axis=normalize(vec3(.57+orbit.y*.55,-.63+.23*orbit.x,.34));
  vec3 offset=p-center,along=axis*dot(offset,axis),across=offset-along;
  float pulseAtP=pow(.5+.5*cos(localPhase-length(offset)*uFogMotion.w*1.9),5.5)*uFogLight.y;
  vec3 current=bend-center+coherentFlow(bend,time)*(.27+turbulence*.37);
  current+=across*(swell*.83)-along*(.22+.26*orbit.x);
  vec3 cells=current*vec3(.88,.95,1.19)*(1.00+frequency*.24)+curl*(.12+.23*turbulence);
  cells+=vec3(uFogSeed*.85,-uFogSeed*.28,uFogSeed*.63);
  vec2 ridgeDistance=cellularRidges(cells);
  float filament=exp(-ridgeDistance.y*20.);
  float haze=exp(-ridgeDistance.x*6.-ridgeDistance.y*6.);
  float contraction=length(across)*(.25+swell*1.1)+length(along)*.35*swell;
  float freeSpace=d+contraction+coarse*.23+fold*.14-.37*length(along)*(1.-swell);
  float envelope=1.-smoothstep(-.43,.24,mix(d+contraction,freeSpace,.39+.52*turbulence)+erosion*.52);
  float suppression=1.-.98*mix(swell,pulseAtP,.45*uFogMotion.w);
  float cluster=smoothstep(-.12,.68,.38+fold*.38+coarse*.57);
  float band=exp(-pow((p.z-curl.z*.35)*mix(3.4,1.24,uFogPattern.w),2.));
  float core=length(across)*(10.5+4.8*flash)+length(along)*(6.2+3.7*flash);
  float burst=exp(-core)*(flash+.135*swell);
  float halo=exp(-core*.46)*swell;
  ridge=web*envelope*(filament+haze*.055)*(.23+.77*cluster)*band*suppression;
  knot=ridge*filament*cluster*(.13+.21*pulseAtP)+web*(burst*5.1+halo*.045);
  cloud=mix(cloud,.012*cloud+ridge*.117+burst*.155+halo*.073,web);
 }
 float core=length(p)/max(.06,uFogCut.y);
 float hollow=1.-uFogCut.x*(1.-smoothstep(.13,1.,core));
 float edge=exp(-abs(d)*7.);
 color=vec4(clamp(cloud*hollow*(.65+uFogPattern.w*.5)+edge*ridge*.025,0.,1.),ridge*hollow,clamp(knot,0.,1.),1.);
}`;

const march=header+bounds+prismaPaletteGLSL+`
in vec2 uv;
uniform sampler2D uDensity,uSurfaceDepth;
uniform int uSteps,uLightCount;
uniform vec2 uOutputSize;
uniform vec3 uObjectPosition,uObjectTurn,uObjectScale;
uniform vec4 uFogMaterial,uFogOptics;
uniform vec4 uLights[8];uniform vec3 uLightColors[8];
uniform float uOrthographic,uSurface,uPerspectiveCloud;
vec3 tileDensity(vec3 p){
 vec3 outside=max(uFogMin-p,p-uFogMax);
 if(max(outside.x,max(outside.y,outside.z))>0.)return vec3(0.);
 vec3 q=(p-uFogMin)/(uFogMax-uFogMin)*(uFogAtlas.x-1.);
 float z=floor(q.z),next=min(z+1.,uFogAtlas.x-1.);
 vec2 offset=q.xy+1.5;
 vec2 a=vec2(mod(z,uFogAtlas.y),floor(z/uFogAtlas.y));
 vec2 b=vec2(mod(next,uFogAtlas.y),floor(next/uFogAtlas.y));
 return mix(texture(uDensity,(a*(uFogAtlas.x+2.)+offset)/uFogAtlas.zw).rgb,
  texture(uDensity,(b*(uFogAtlas.x+2.)+offset)/uFogAtlas.zw).rgb,fract(q.z));
}
mat2 turn(float theta){return mat2(cos(theta),-sin(theta),sin(theta),cos(theta));}
vec3 toLocal(vec3 p){
 if(uPerspectiveCloud>.5){
  p.xz=turn(-uObjectTurn.y)*p.xz;p.yz=turn(-uObjectTurn.x)*p.yz;p.xy=turn(-uObjectTurn.z)*p.xy;
 }else{
  p.xy=turn(uObjectTurn.z)*p.xy;p.xz=turn(uObjectTurn.y)*p.xz;p.yz=turn(uObjectTurn.x)*p.yz;
 }
 return p/uObjectScale;
}
vec2 intersectBox(vec3 o,vec3 v){
 vec3 reciprocal=sign(v+vec3(1e-9))/max(abs(v),vec3(1e-7));
 vec3 a=(uFogMin-o)*reciprocal,b=(uFogMax-o)*reciprocal;
 vec3 lo=min(a,b),hi=max(a,b);
 return vec2(max(lo.x,max(lo.y,lo.z)),min(hi.x,min(hi.y,hi.z)));
}
float lightThrough(vec3 p,vec3 toLight){
 if(uFogOptics.y<.001)return 1.;
 float mass=tileDensity(p+toLight*.08).r*.15+tileDensity(p+toLight*.22).r*.25+tileDensity(p+toLight*.47).r*.46;
 return exp(-mass*uFogOptics.y*uFogMaterial.x*1.7);
}
void main(){
 vec2 screen=uv*2.-1.;
 vec2 imagePlane=screen*uOutputSize/min(uOutputSize.x,uOutputSize.y)*1.7;
 vec3 worldOrigin=uOrthographic>.5?vec3(imagePlane,12.):vec3(0.,0.,7.5);
 vec3 worldRay=uOrthographic>.5?vec3(0.,0.,-1.):normalize(vec3(screen*vec2(uOutputSize.x/uOutputSize.y,1.)/2.6,-1.));
 vec3 origin=toLocal(worldOrigin-uObjectPosition),ray=toLocal(worldRay);
 vec2 span=intersectBox(origin,ray);span.x=max(0.,span.x);
 if(span.y<=span.x){color=vec4(0.);return;}
 vec4 surface=uSurface>.5?texture(uSurfaceDepth,uv):vec4(0.);
 float nearSurface=16.-32.*dot(surface.rg,vec2(1.,1./255.));
 vec3 toLights[8];
 for(int light=0;light<uLightCount;light++)toLights[light]=toLocal(uLights[light].xyz-uObjectPosition);
 float stride=(span.y-span.x)/float(uSteps),transmission=1.;
 float localStep=length(ray)*stride;
 vec3 radiance=vec3(0.);
 for(int index=0;index<uSteps;index++){
  float t=span.x+(float(index)+.5)*stride;
  vec3 p=origin+t*ray,density=tileDensity(p);
  if(density.r<.001&&density.g<.001)continue;
  vec3 world=worldOrigin+worldRay*t;
  float visible=1.-surface.b*smoothstep(.004,.04,nearSurface-world.z);
  if(visible<.001)continue;
  vec3 pigment=prismaPalette(world,uPalette[0]);
  vec3 irradiance=vec3(.045+.28*uFogMaterial.y);
  for(int light=0;light<uLightCount;light++){
   vec3 offset=uLights[light].xyz-world;
   float distanceSquared=max(.16,dot(offset,offset)),phase=dot(worldRay,offset)*inversesqrt(distanceSquared);
   float g=uFogOptics.z;
   float scatter=(1.-g*g)/pow(max(.15,1.+g*g-2.*g*phase),1.5);
   vec3 lightDir=normalize(toLights[light]-p+vec3(1e-7));
   irradiance+=uLightColors[light]*uLights[light].w/(.85+distanceSquared)*lightThrough(p,lightDir)*mix(1.,scatter,.68)*1.9;
  }
  float depth=density.r*localStep*uFogMaterial.x;
  vec3 tint=exp(-uFogOptics.x*depth*(1.-pigment));
  float opacity=(1.-exp(-depth))*visible;
  float heat=1.-exp(-density.b*3.8);
  vec3 emissionColor=mix(pigment,mix(vec3(1.),normalize(pigment+vec3(.1)),.28),heat);
  vec3 glow=emissionColor*localStep*(density.g*uFogMaterial.w+density.b*uFogOptics.w);
  radiance+=transmission*(pigment*tint*(irradiance+uFogMaterial.z)*opacity+glow*visible);
  transmission*=1.-max(opacity,min(.9,localStep*density.g*.36)*visible);
  if(transmission<.009)break;
 }
 color=vec4(radiance,1.-transmission);
}`;

const degrees=Math.PI/180;
export const mediumAmount=s=>s.pLiving===4?0:s.pVolumeContinuity||0;

export class ParticleMedium{
 constructor(owner){this.owner=owner;this.bake=owner.program(vertex,bake);this.march=owner.program(vertex,march);}
 get programs(){return [this.bake,this.march];}
 draw(s,phase,w,h,options,layer){
  const o=this.owner,g=o.gl,field=layer?.field,fast=options.preview&&options.quality==='fast';
  const interactiveScale=fast?Math.max(.7,Math.cbrt(o.geometryBudget??1)):1;
  const resolution=fast?Math.round(40*interactiveScale):options.preview?60:96;
  const columns=Math.ceil(Math.sqrt(resolution)),rows=Math.ceil(resolution/columns),cell=resolution+2;
  const atlas=[resolution,columns,cell*columns,cell*rows];
  const screenScale=Math.min(1,(fast?320*interactiveScale:options.preview?520:1080)/Math.max(w,h));
  const width=Math.max(1,Math.round(w*screenScale)),height=Math.max(1,Math.round(h*screenScale));
  this.updateTarget('density',atlas[2],atlas[3]);this.updateTarget('image',width,height);
  const extent=(s.pCloudRadius||1)+s.pCloudHalo*.42,padding=.09+s.pVolumeTurbulence*.16+s.pVolumeFilaments*.19;
  const low=(field?.lo||[-extent,-extent,-extent]).map(v=>v-padding);
  const high=(field?.hi||[extent,extent,extent]).map(v=>v+padding);
  const frequency=Math.min(8,1.7+s.pFrequency*.7),speed=s.perfectLoop===false?s.pCycles:Math.round(s.pCycles);
  const angle=phase*(Math.PI*2)*Math.max(1,speed)*(s.pDirection||1);
  const motion=[s.pTravel>0||Math.abs(s.pVortex)>0||s.pVolumeFilaments*s.pSignal>0?angle:0,s.pTravel,s.pVortex,s.pPropagation];
  const key=[resolution,field?.key,field?.inner,...low,...high,s.seed,...motion,s.pOpening,s.pFill,s.pVolumeTurbulence,s.pVolumeFilaments,frequency,s.pPulse,s.pSignal,s.pSpeedSpread,s.pRhythm,s.structCoreDark,s.structCoreRadius].join('|');
  g.disable(g.DEPTH_TEST);g.disable(g.BLEND);g.disable(g.SCISSOR_TEST);g.bindVertexArray(o.empty);
  const common=p=>{o.u(p,'uFogAtlas',...atlas);o.u(p,'uFogMin',...low);o.u(p,'uFogMax',...high);};
  if(this.key!==key){
   const p=this.bake;o.bind(this.density);g.useProgram(p.program);common(p);
   bindBodyField(g,field,o.seedTexture,k=>o.loc(p,k));
   o.u(p,'uHasBody',+!!field);o.u(p,'uFogShape',s.pOpening,extent,0,0);
   o.u(p,'uFogPattern',s.pVolumeTurbulence,s.pVolumeFilaments,frequency,s.pFill);
   o.u(p,'uFogSeed',(s.seed%1601)*.013);o.u(p,'uFogMotion',...motion);
   o.u(p,'uFogCut',s.structCoreDark||0,s.structCoreRadius??.3);
   o.u(p,'uFogLight',Math.max(1,Math.round(s.pPulse||1)),s.pSignal||0,s.pSpeedSpread||0,s.pRhythm||0);
   g.uniform1i(o.loc(p,'uCellNeighbors'),27);
   g.drawArrays(g.TRIANGLES,0,3);this.key=key;
  }
  const p=this.march;o.bind(this.image);g.useProgram(p.program);common(p);
  o.colorUniforms(p,s);
  o.tex(p,'uDensity',this.density.texture,0);o.tex(p,'uSurfaceDepth',layer?.depth||o.seedTexture,1);
  o.u(p,'uSurface',+!!layer?.depth);o.u(p,'uOrthographic',field?1:0);o.u(p,'uPerspectiveCloud',+!field);
  o.u(p,'uOutputSize',w,h);o.u(p,'uObjectPosition',s.positionX,s.positionY,0);
  o.u(p,'uObjectTurn',s.rotateX*degrees,s.rotateY*degrees,s.rotateZ*degrees);
  o.u(p,'uObjectScale',s.scale*s.stretchX,s.scale*s.stretchY,s.scale*Math.max(.06,s.stretchZ*s.volume));
  o.u(p,'uFogMaterial',(.65+8*s.scattering+2*s.subsurface+1.7*s.translucency)*Math.sqrt(s.thickness??1),s.environmentPower,s.emission*.16,.9+s.glow*1.85);
  o.u(p,'uFogOptics',s.absorption,s.pVolumeShadow,s.scatterDirection,9+s.emission*17);
  g.uniform1i(o.loc(p,'uSteps'),fast?Math.round(32*interactiveScale):options.preview?48:76);
  g.drawArrays(g.TRIANGLES,0,3);g.bindVertexArray(null);
  return this.image.texture;
 }
 updateTarget(name,w,h){
  const old=this[name];if(old?.w===w&&old.h===h)return;
  this.dropTarget(name);this[name]=this.owner.target(w,h);
 }
 dropTarget(name){
  const t=this[name];if(!t)return;
  const g=this.owner.gl;g.deleteTexture(t.texture);g.deleteFramebuffer(t.fbo);this[name]=null;
 }
 release(){this.dropTarget('image');this.dropTarget('density');this.key='';}
 dispose(){
  this.release();
  for(const p of this.programs){this.owner.pendingPrograms.delete(p);this.owner.gl.deleteProgram(p.program);}
 }
}
