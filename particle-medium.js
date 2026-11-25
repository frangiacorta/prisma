import {bodyFieldGLSL,bindBodyField} from './body-samples.js?v=b3646b8af04a';
import {prismaPaletteGLSL} from './particle-shading.js?v=b3646b8af04a';
import {simplex3DGLSL} from './vendor/webgl-noise/simplex-3d.js?v=b3646b8af04a';
import {hasMotionPoints} from './motion-keyframes.js?v=b3646b8af04a';

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
const ringField=`
vec2 closedFlow(vec3 p,float time,float contraction){
 vec2 plane=vec2(p.x,p.y*1.1);
 float angle=atan(plane.y,plane.x+1.e-8);
 float radius=(.51+.05*cos(angle*3.+time)+.045*sin(angle*2.-time))*(1.-contraction*.27);
 return vec2(length(plane)-radius,p.z+.13*cos(angle*2.+time)+.05*sin(angle*3.-time));
}
`;

// Bake the moving, three-dimensional density once per scene sample. View and
// light rays then reuse the same density, so shadows follow the smoke detail.
const bake=header+bounds+bodyFieldGLSL+simplex3DGLSL+ringField+`
uniform vec4 uFogShape,uFogMotion,uFogPattern,uFogLight;
uniform vec2 uFogCut;
uniform float uFogContraction,uFogCounterflow;
uniform float uHasBody,uFogSeed;
float cloudDistance(vec3 p){
 float d=length(p)-uFogShape.y;
 float hole=uFogShape.x;
 if(hole>.001){
  vec2 q=vec2(length(p.xz)-(.64+.33*hole)*uFogShape.y,p.y);
  d=mix(d,length(q)-max(.09,.56-.37*hole)*uFogShape.y,smoothstep(0.,.92,hole));
 }
 return d;
}
// Match cloud Fill support without reinterpreting attached-body sampling.
float cloudFillSupport(float surfaceDistance){
 if(uHasBody>.5||uFogPattern.w>=1.)return 1.;
 float opened=smoothstep(0.,.92,uFogShape.x);
 float minorRadius=max(.09,.56-.37*uFogShape.x)*uFogShape.y;
 float radius=mix(uFogShape.y,minorRadius,opened);
 float reconstruction=max(.004,2.*uFogShape.y/max(32.,uFogAtlas.x));
 float depth=max(reconstruction*.5,radius*clamp(uFogPattern.w,0.,1.));
 float innerRadius=radius*(1.-clamp(uFogPattern.w,0.,1.));
 return mix(1.,smoothstep(-reconstruction,reconstruction,surfaceDistance+depth),smoothstep(0.,reconstruction,innerRadius));
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
 if(d>mix(.055,.25,turbulence)+web*.76){color=vec4(0.,.5,.5,0.);return;}
 float time=uFogMotion.x;
 vec2 orbit=vec2(cos(time),sin(time));
 vec3 bend=p+vec3(orbit.y,orbit.x,orbit.x-orbit.y)*uFogMotion.y*.21;
 float turn=uFogMotion.z*(p.y*.52+orbit.y*.2);
 if(uFogContraction>=0.)turn+=uFogCounterflow*orbit.y*(smoothstep(.15,uFogShape.y,length(p))-.5)*.44;
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
 float shell=1.-smoothstep(-.018-turbulence*.012,.008,d+erosion*.045);
 float pocket=abs(snoise(q*.85+vec3(11.,-7.,-2.)));
 float plume=1.-smoothstep(.34,.89,pocket+turbulence*.3*fold);
 float cloud=shell*cloudFillSupport(d+erosion*.045)*mix(.66,smoothstep(-.28,.44,.025+erosion+.24*coarse)*plume,turbulence);
 float weather=snoise(bend*2.22+vec3(uFogSeed,3.,13.));
 cloud*=1.-turbulence*.84*smoothstep(.02,.56,weather)*smoothstep(-.97,-.08,-d);
 float ridge=0.;vec3 strands=vec3(.5,.5,0.);
 if(web>.001){
  float rhythm=time*uFogLight.x-1.7+sin(time-.5)*uFogLight.z*2.3;
  float localPhase=rhythm-sin(rhythm)*(.21+.65*uFogLight.w);
  float swell=pow(.5+.5*cos(localPhase-.29),2.35)*min(1.,uFogShape.w*3.);
  swell*=1.-uFogLight.z*.8*(1.-pow(.5+.5*cos(time),.7));
  bool authoredContraction=uFogContraction>=0.;
  if(authoredContraction)swell=uFogContraction;
  vec3 center=vec3(orbit.y*.46+.16*sin(time*2.),orbit.x*.43+.13*sin(time*3.),orbit.y*.23)*(.36+.64*uFogMotion.w);
  vec3 axis=normalize(vec3(.57+orbit.y*.55,-.63+.23*orbit.x,.34));
  vec3 offset=p-center,along=axis*dot(offset,axis),across=offset-along;
  vec3 current=bend-center+coherentFlow(bend,time)*(.27+turbulence*.37);
  if(authoredContraction){
   // Shrink the same domain along all three axes, with more room for the
   // outflow along its long axis. Local curl and shell continue to move.
   current*=1.+swell*.75;
   current+=across*(swell*.52)-along*(.12+.18*orbit.x);
   current+=coherentFlow(bend*2.45,time*3.)*turbulence*.12;
  }else current+=across*(swell*2.3)-along*(.12+.18*orbit.x);
  vec3 cells=current*vec3(.88,.95,1.19)*(.85+frequency*.62)+curl*(.12+.23*turbulence);
  cells+=vec3(uFogSeed*.85,-uFogSeed*.28,uFogSeed*.63);
  // Signed fields retain their zero crossings under atlas interpolation.
  // Their intersection defines a filament; a third field forks the second
  // surface so the same continuous network contains branch junctions.
  float lineA=snoise(cells*.81)+.055*snoise(cells*2.11+vec3(7.,3.,11.));
  float branchA=snoise(cells*.91+vec3(19.,3.,5.));
  float branchB=snoise(cells*1.53+vec3(-7.,13.,31.));
  float lineB=branchA*branchB/max(.12,length(vec2(branchA,branchB)));
  if(authoredContraction){
   float fork=smoothstep(.05,.55,snoise(cells*.39+vec3(13.,-5.,2.)));
   lineB=mix(branchA,lineB,fork*.34);
  }
  float closure=authoredContraction&&uHasBody<.5?smoothstep(.12,.86,uFogShape.x):0.;
  vec2 ring=vec2(0.);
  if(closure>0.){
   ring=closedFlow(p-center,time,swell);
   lineA=mix(lineA,ring.x*2.35,closure);
   lineB=mix(lineB,ring.y*2.35,closure);
  }
  float filament=exp(-length(vec2(lineA,lineB))*24.);
  float haze=exp(-length(vec2(lineA,lineB))*7.);
  float contraction=length(across)*swell*1.8;
  vec3 shape=current+coherentFlow(current*.83,time)*(.11+.28*turbulence);
  float freeSpace=length(shape*vec3(.78,1.02,1.28))-uFogShape.y*.78;
  freeSpace+=coarse*.25+fold*.11-.24*abs(dot(shape,axis));
  float supportDistance=mix(d+contraction,freeSpace,.46+.53*turbulence);
  float envelope=(1.-smoothstep(-.19,.19,supportDistance))*cloudFillSupport(supportDistance);
  if(uHasBody>.5)envelope*=1.-smoothstep(-.025,.1,d);
  if(authoredContraction){
   vec3 lip=normalize(vec3(.24+orbit.y*.39,.9,orbit.x*.36));
   float lifted=smoothstep(-.025,.042,dot(offset,lip)+.08);
   envelope*=mix(1.,lifted,smoothstep(.17,.67,swell)*(.93-closure*.75));
  }
  float cluster=smoothstep(-.2,.62,.35+fold*.4+coarse*.58);
  float clusterWeight=mix(.36+.64*cluster,.04+.96*pow(cluster,2.2),uFogShape.z);
  float band=exp(-pow((p.z-center.z-curl.z*.21)*mix(2.8,1.02,uFogPattern.w),2.));
  if(authoredContraction){
   float membrane=offset.z-.29*coarse-.17*fold;
   band*=.12+.88*exp(-pow(membrane*mix(5.7,2.8,swell),2.));
  }
  if(closure>0.){
   envelope=mix(envelope,exp(-8.*dot(ring,ring)),closure);
   clusterWeight=mix(clusterWeight,1.,closure);
   band=mix(band,1.,closure);
  }
  ridge=web*envelope*filament*clusterWeight*band;
  strands=vec3(lineA*.5+.5,lineB*.5+.5,envelope*clusterWeight*band);
  cloud=mix(cloud,.0015*cloud+envelope*haze*.009*band+ridge*.012,web);
 }
 float core=length(p)/max(.06,uFogCut.y);
 float hollow=1.-uFogCut.x*(1.-smoothstep(.13,1.,core));
 float edge=exp(-abs(d)*7.);
 color=vec4(clamp(cloud*hollow*(.65+uFogPattern.w*.5)+edge*ridge*.025,0.,1.),strands.xy,strands.z*hollow);
}`;

const march=header+bounds+prismaPaletteGLSL+ringField+`
in vec2 uv;
uniform sampler2D uDensity,uSurfaceDepth;
uniform int uSteps,uLightCount;
uniform vec2 uOutputSize;
uniform vec3 uObjectPosition,uObjectTurn,uObjectScale;
uniform vec4 uFogMaterial,uFogOptics;
uniform vec4 uLights[8];uniform vec3 uLightColors[8];
uniform float uOrthographic,uSurface,uPerspectiveCloud,uFogWeb;
uniform vec4 uFogFlare;uniform vec2 uFogWave,uFogCoreLight;
uniform vec3 uFogClosure;
vec4 tileField(vec3 p){
 vec3 outside=max(uFogMin-p,p-uFogMax);
 if(max(outside.x,max(outside.y,outside.z))>0.)return vec4(0.,.5,.5,0.);
 vec3 q=(p-uFogMin)/(uFogMax-uFogMin)*(uFogAtlas.x-1.);
 float z=floor(q.z),next=min(z+1.,uFogAtlas.x-1.);
 vec2 offset=q.xy+1.5;
 vec2 a=vec2(mod(z,uFogAtlas.y),floor(z/uFogAtlas.y));
 vec2 b=vec2(mod(next,uFogAtlas.y),floor(next/uFogAtlas.y));
 return mix(texture(uDensity,(a*(uFogAtlas.x+2.)+offset)/uFogAtlas.zw),
  texture(uDensity,(b*(uFogAtlas.x+2.)+offset)/uFogAtlas.zw),fract(q.z));
}
float erfApprox(float value){
 float x=abs(value),t=1./(1.+.3275911*x);
 float p=((1.061405429*t-1.453152027)*t+1.421413741)*t;
 return sign(value)*(1.-((p-.284496736)*t+.254829592)*t*exp(-x*x));
}
// Integrate a narrow Gaussian around the signed-field intersection. Unlike
// point samples, a ray segment cannot miss a strand between two atlas slices.
float strandIntegral(vec2 a,vec2 b){
 float inverseWidth=uFogCoreLight.y>0.?22.:18.;
 vec2 delta=(b-a)*inverseWidth; a*=inverseWidth;
 float span=length(delta);
 if(span<.0001)return exp(-dot(a,a));
 float along=dot(a,delta)/span;
 float across=max(0.,dot(a,a)-along*along);
 return exp(-across)*.886226925*(erfApprox(along+span)-erfApprox(along))/span;
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
 // Integrate to the medium boundary: short fixed taps let side lights leak
 // through the far half of a hollow or folded volume.
 float distanceToEdge=max(0.,intersectBox(p,toLight).y);
 float stepSize=distanceToEdge/8.,mass=0.;
 for(int i=0;i<8;i++)mass+=tileField(p+toLight*((float(i)+.5)*stepSize)).r*stepSize;
 return exp(-mass*uFogOptics.y*uFogMaterial.x*2.1);
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
 vec4 previous=tileField(origin+span.x*ray);
 for(int index=0;index<uSteps;index++){
  float t=span.x+(float(index)+.5)*stride;
  vec3 p=origin+t*ray;
  vec3 density;
  float coreEmission=0.,rimEmission=0.,rimHalo=0.;
  if(uFogWeb>.001){
   vec4 next=tileField(p+ray*stride*.5),average=(previous+next)*.5;
   float filament=strandIntegral(previous.gb*2.-1.,next.gb*2.-1.)*average.a*uFogWeb*3.5;
   float radius=length((p-uFogFlare.xyz)*vec3(1.,1.13,.88));
   float front=exp(-abs(radius-uFogWave.x)*14.);
   float illumination=.045+uFogFlare.w*mix(exp(-radius*9.),front,uFogWave.y*.82);
   density=vec3(average.r,filament,filament*illumination);
   if(uFogCoreLight.x>0.){
    vec3 delta=(p-uFogFlare.xyz)*vec3(1.12,.92,1.3);
    float size=uFogCoreLight.y;
    float distance=dot(delta,delta)/(size*size);
    float support=exp(-distance)*filament*(.38+.62*smoothstep(.01,.22,filament));
    coreEmission=support*uFogCoreLight.x*(1.-uFogClosure.x*.96);
    if(uFogClosure.x>0.){
     vec3 local=p-uFogFlare.xyz;
     vec2 ring=closedFlow(local,uFogClosure.y,uFogClosure.z);
     float square=dot(ring,ring),azimuth=atan(local.y,local.x+1.e-8);
     float arc=.44+.56*pow(.5+.5*cos(azimuth*2.+uFogClosure.y),2.);
     rimEmission=exp(-square*1900.)*arc*uFogClosure.x*(.055*uFogCoreLight.x);
     rimHalo=exp(-square*205.)*uFogClosure.x*(.004*uFogCoreLight.x);
    }
   }
   previous=next;
  }else density=vec3(tileField(p).r,0.,0.);
  if(density.r<.001&&density.g<.001&&coreEmission+rimEmission+rimHalo<.001)continue;
  vec3 world=worldOrigin+worldRay*t;
  float visible=1.-surface.b*smoothstep(.004,.04,nearSurface-world.z);
  if(visible<.001)continue;
  vec3 pigment=prismaKnotBands(world,prismaColorLayersAt(world,prismaPaletteBase(world,uPalette[0]),p,uOrthographic>.5));
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
  vec3 hotPigment=mix(vec3(1.),normalize(pigment+vec3(.1)),.28);
  if(uFogCoreLight.y>0.)hotPigment=mix(uPalette[uPaletteCount/2],hotPigment,.44);
  vec3 emissionColor=mix(pigment,hotPigment,heat);
  vec3 glow=emissionColor*localStep*(density.g*uFogMaterial.w+density.b*uFogOptics.w);
  if(coreEmission>.001){
   vec3 sourceTint=mix(pigment,uPalette[uPaletteCount/2],.74);
   vec3 sourceLight=mix(sourceTint,vec3(1.),.83*(1.-exp(-coreEmission*.09)));
   glow+=sourceLight*localStep*coreEmission;
  }
  if(rimEmission+rimHalo>.001){
   vec3 rose=mix(uPalette[0],uPalette[uPaletteCount/2],.54);
   glow+=localStep*(mix(rose,vec3(1.,.93,.83),.72)*rimEmission+rose*rimHalo);
  }
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
  const web=s.pVolumeFilaments||0;
  const resolution=fast?Math.round((48+40*web)*interactiveScale):options.preview?Math.round(72+24*web):Math.round(128+32*web);
  const columns=Math.ceil(Math.sqrt(resolution)),rows=Math.ceil(resolution/columns),cell=resolution+2;
  const atlas=[resolution,columns,cell*columns,cell*rows];
  const screenScale=Math.min(1,(fast?(320+160*web)*interactiveScale:options.preview?520:1080)/Math.max(w,h));
  const width=Math.max(1,Math.round(w*screenScale)),height=Math.max(1,Math.round(h*screenScale));
  this.updateTarget('density',atlas[2],atlas[3]);this.updateTarget('image',width,height);
  const extent=(s.pCloudRadius||1)+s.pCloudHalo*.42,padding=.09+s.pVolumeTurbulence*.16+web*.58;
  const low=(field?.lo||[-extent,-extent,-extent]).map(v=>v-padding);
  const high=(field?.hi||[extent,extent,extent]).map(v=>v+padding);
  const frequency=Math.min(8,1.7+s.pFrequency*.7),speed=s.perfectLoop===false?s.pCycles:Math.round(s.pCycles);
  const angle=phase*(Math.PI*2)*Math.max(1,speed)*(s.pDirection||1)+((s.pMotionSeed??417)-417)*.013;
  const motion=[s.pTravel>0||Math.abs(s.pVortex)>0||s.pVolumeFilaments*s.pSignal>0?angle:0,s.pTravel,s.pVortex,s.pPropagation];
  const contraction=hasMotionPoints(s.motions?.pBreath)?s.pBreath:-1;
  const key=[resolution,field?.key,field?.inner,...low,...high,s.seed,...motion,s.pOpening,s.pFill,s.pClumps,s.pBreath,contraction,contraction>=0?s.pCounterflow:0,s.pVolumeTurbulence,s.pVolumeFilaments,frequency,s.pPulse,s.pSignal,s.pSpeedSpread,s.pRhythm,s.structCoreDark,s.structCoreRadius].join('|');
  g.disable(g.DEPTH_TEST);g.disable(g.BLEND);g.disable(g.SCISSOR_TEST);g.bindVertexArray(o.empty);
  const common=p=>{o.u(p,'uFogAtlas',...atlas);o.u(p,'uFogMin',...low);o.u(p,'uFogMax',...high);};
  if(this.key!==key){
   const p=this.bake;o.bind(this.density);g.useProgram(p.program);common(p);
   bindBodyField(g,field,o.seedTexture,k=>o.loc(p,k));
   o.u(p,'uHasBody',+!!field);o.u(p,'uFogShape',s.pOpening,extent,s.pClumps||0,s.pBreath||0);
   o.u(p,'uFogPattern',s.pVolumeTurbulence,s.pVolumeFilaments,frequency,s.pFill);
   o.u(p,'uFogSeed',(s.seed%1601)*.013);o.u(p,'uFogMotion',...motion);
   o.u(p,'uFogCut',s.structCoreDark||0,s.structCoreRadius??.3);
   o.u(p,'uFogContraction',contraction);
   o.u(p,'uFogCounterflow',s.pCounterflow||0);
   o.u(p,'uFogLight',Math.max(1,Math.round(s.pPulse||1)),s.pSignal||0,s.pSpeedSpread||0,s.pRhythm||0);
   g.drawArrays(g.TRIANGLES,0,3);this.key=key;
  }
  const p=this.march;o.bind(this.image);g.useProgram(p.program);common(p);
  o.colorUniforms(p,s);
  o.tex(p,'uDensity',this.density.texture,0);o.tex(p,'uSurfaceDepth',layer?.depth||o.seedTexture,1);
  o.u(p,'uSurface',+!!layer?.depth);o.u(p,'uOrthographic',field?1:0);o.u(p,'uPerspectiveCloud',+!field);
  o.u(p,'uFogWeb',web);
  const rhythm=angle*Math.max(1,Math.round(s.pPulse||1))-1.7+Math.sin(angle-.5)*(s.pSpeedSpread||0)*2.3;
  const localPhase=rhythm-Math.sin(rhythm)*(.21+.65*(s.pRhythm||0));
  const variation=1-(s.pLumaVar||0)*(.82-.82*Math.pow(.5+.5*Math.cos(angle),.7));
  const authoredFlash=hasMotionPoints(s.motions?.pSignal);
  const flare=authoredFlash?s.pSignal:Math.pow(.5+.5*Math.cos(localPhase),9.5)*(s.pSignal||0)*variation;
  const centerScale=.36+.64*s.pPropagation;
  o.u(p,'uFogFlare',(Math.sin(angle)*.46+.16*Math.sin(angle*2))*centerScale,(Math.cos(angle)*.43+.13*Math.sin(angle*3))*centerScale,Math.sin(angle)*.23*centerScale,flare*(authoredFlash?16:70));
  o.u(p,'uFogCoreLight',authoredFlash?Math.pow(flare,1.7)*950:0,authoredFlash?.105+.30*s.pPropagation+.075*Math.max(0,contraction):0);
  const opening=Math.max(0,Math.min(1,(s.pOpening-.12)/.74));
  o.u(p,'uFogClosure',contraction>=0&&!field?opening*opening*(3-2*opening):0,angle,Math.max(0,contraction));
  const authoredFront=authoredFlash&&hasMotionPoints(s.motions?.pPropagation);
  o.u(p,'uFogWave',authoredFront?.06+.5*s.pPropagation:.06+(.25+.25*Math.sin(localPhase))*(s.pPropagation||0),s.pPropagation||0);
  o.u(p,'uOutputSize',w,h);o.u(p,'uObjectPosition',s.positionX,s.positionY,0);
  o.u(p,'uObjectTurn',s.rotateX*degrees,s.rotateY*degrees,s.rotateZ*degrees);
  o.u(p,'uObjectScale',s.scale*s.stretchX,s.scale*s.stretchY,s.scale*Math.max(.06,s.stretchZ*s.volume));
  o.u(p,'uFogMaterial',(.65+8*s.scattering+2*s.subsurface+1.7*s.translucency)*Math.sqrt(s.thickness??1),s.environmentPower,s.emission*.16,authoredFlash?.55+s.glow*1.45:.9+s.glow*1.85);
  o.u(p,'uFogOptics',s.absorption,s.pVolumeShadow,s.scatterDirection,9+s.emission*17);
  g.uniform1i(o.loc(p,'uSteps'),fast?Math.round((48+48*web)*interactiveScale):options.preview?Math.round(72+56*web):Math.round(128+64*web));
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
