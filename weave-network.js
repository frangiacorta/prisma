const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
 const t = clamp((x - a) / (b - a), 0, 1);
 return t * t * (3 - 2 * t);
};
const fract = x => x - Math.floor(x);
const join = (a, b, width) => {
 const t = Math.max(0, width - Math.abs(a - b)) / width;
 return Math.min(a, b) - .25 * width * t * t;
};

// The ribs and the shoots share a deformed chart on the source surface.
// Growth moves the original nodules along the shoots. Withdrawing the
// bridges leaves those same attachments in place.
function coordinates(s, p, release, phase) {
 const [x, y, z] = p, variation = s.structWeaveVariation;
 const spacing = 1.02 + .30 * Math.sqrt(s.structDensity);
 return [
  spacing * (x + (.25-.13*release)*y + variation * (.14 * Math.sin(2.9*y + 2.3*z + .16*Math.sin(phase)) + .075*Math.sin(6.2*y - 4*z))) / (1 + .30*release),
  spacing * (y - .24 * x + variation * (.155*Math.sin(3.5*x - 3.1*z + .15*Math.cos(phase)) + .052*Math.sin(7.4*x + 5*z))) / (1 + .67*release)
 ];
}

function measureShoot(x, y, z, ax, ay, zx, zy, determinant, release) {
 const u=x*(1+.30*release)-zx*z, v=y*(1+.67*release)-zy*z;
 return [(u-ax*v)*determinant,(v-ay*u)*determinant,z];
}

function shootDistance(x, y, z, a, b, c, radius, rim, growth, release, open, index, bend, web) {
 const length2 = a*a + b*b + c*c;
 const t0 = clamp((x*a+y*b+z*c)/Math.max(.00001,length2),0,1);
 const curl = bend*t0*(1-t0);
 const t = clamp(((x-curl)*a+y*b+z*c)/Math.max(.00001,length2),0,1);
 const taper = 1-t;
 const stemRadius = rim*(.16+.38*taper*taper)+radius*(.07+.37*release*Math.exp(-46*taper*taper));
 let stem = Math.hypot(x-a*t-bend*t*(1-t),y-b*t,z-c*t)-stemRadius;

 const length = Math.sqrt(length2);
 const tx=x-a, ty=y-b, tz=z-c;
 const opening = open*smooth(.09,.55,growth);
 const facing = opening*(.41+.31*Math.sin(1+index*2.1)**2);
 const cx=a/Math.max(.0001,length)*(1-facing),cy=b/Math.max(.0001,length)*(1-facing),cz=c/Math.max(.0001,length)*(1-facing)+facing;
 const axial = (tx*cx+ty*cy+tz*cz)/Math.max(.0001,Math.hypot(cx,cy,cz));
 const lateral = Math.sqrt(Math.max(0,tx*tx+ty*ty+tz*tz-axial*axial));
 const bell = smooth(.07,.86,release)*(.75+.25*Math.sin(index*2.3+1)**2);
 const height = radius*(1+.17*bell-.13*opening);
 const wobble=.082*(Math.sin(tx*36+index*1.4)+.54*Math.sin(ty*69-tz*58))*opening;
 const radialScale = (1+.38*opening+.24*bell*clamp(axial/Math.max(.001,height),-1,1))*(1+wobble);
 const bowl = (Math.hypot(lateral/radialScale,axial*radius/height)-radius)*.69;
 const shell=Math.max(smooth(.29,.79,release),smooth(.10,.73,opening));
 const innerRadius=radius*(.64+.27*shell+.048*opening);
 const inside=(Math.hypot(lateral/(radialScale*(1+.12*opening)),(axial-height*opening*.61)*radius/height)-innerRadius)*.68;
 const hollow=-inside-radius*(1-shell)*1.15;
 const lip=Math.max(.0001,radius*.036);
 const cup=shell>0 ? -join(-bowl,-hollow,lip) : bowl;
 if(shell>0)stem=-join(-stem,-hollow,lip);
 let result=join(stem,cup,Math.max(.001,rim*.27));
 if(web>.001&&y>0&&y<b&&Math.abs(a)>.025){
  const u=y/b,strip=Math.sin(Math.PI*u);
  const width=Math.abs(a)*.53*web*strip*strip;
  const base=a*u+bend*u*(1-u)-Math.sign(a)*width;
  const membrane=Math.max(Math.abs(x-base)-width,Math.abs(z-c*u*.8)-rim*.115*web*strip);
  result=join(result,membrane,Math.max(.0007,rim*.12));
 }
 return result;
}

export function weaveNetworkField(s, field, p, thickness) {
 const {structWeaveRelease:release,structWeaveGrowth:growth,structWeaveReach:reach,
  structWeaveNodes:nodes,structWeaveMembrane:web,structWeaveCup:open}=s;
 const phase = s.structFlowPhase*TAU, spacing=1.02+.30*Math.sqrt(s.structDensity);
 const chart=coordinates(s,p,release,phase), z=(field+thickness*.19)*spacing;
 const cellX=Math.floor(chart[0]+.5), cellY=Math.floor(chart[1]+.5);
 const x=chart[0]-cellX, y=chart[1]-cellY, ax=Math.abs(x), ay=Math.abs(y);
 const rib=clamp(thickness*spacing*(.21+.45*s.structThreadWidth),.004,.105);
 const radius=rib*(1-.82*release), membrane=web*(1-smooth(.08,.77,release));
 const reachZ=.29+.53*growth*reach;
 const outside=Math.max(-.23-z,z-reachZ);
 if(outside>.027)return outside/spacing*.64;

 const weave = s.structWeave*.42*spacing*Math.cos(chart[0]*Math.PI)*Math.cos(chart[1]*Math.PI);
 const flange=1.03*membrane*(1-.72*release);
 const horizontal = Math.hypot(y,z-weave)-radius*(1+flange*Math.exp(-18*x*x))*(1-smooth(.12,.83,release))+.013*smooth(.74,.88,release);
 const vertical = Math.hypot(x,z+weave)-radius*(1+flange*Math.exp(-18*y*y));
 let distance=join(horizontal,vertical,Math.max(.001,rib*.36));
 const along=Math.max(ax,ay), across=Math.min(ax,ay);
 if(membrane>.00001){
  const span = radius + membrane*(.28+.21*nodes)*Math.pow(1-clamp(along*1.94,0,1),1.58);
  const offset = weave*.35+.19*x*y+.019*Math.sin(chart[0]*TAU)*Math.sin(chart[1]*TAU);
  const thickness = rib*(.10+.16*membrane)*(1-.72*along);
  const outline = Math.max((across-span)*.73,Math.abs(z-offset)-thickness);
  let mesh=outline;
  if(outline<.016){
   const u=chart[0]+.095*Math.sin(chart[1]*8)+.047*Math.sin(chart[1]*22+chart[0]*9);
   const v=chart[1]+.078*Math.sin(chart[0]*10)-.045*Math.sin(chart[0]*26-chart[1]*14);
   const frequency=76*s.structWeaveFinesse;
   const warp=Math.abs(Math.sin((u+.32*v)*frequency+.74*Math.sin(v*58)));
   const weft=Math.abs(Math.sin((v-.42*u)*frequency*.92+.71*Math.sin(u*49)));
   const crossing=Math.abs(Math.sin((u+v)*frequency*.61+1.3*Math.sin((u-v)*28)));
   const width=.065+.27*membrane*(1-smooth(.01,.31,across));
   mesh=Math.max(outline,(Math.min(warp,weft,crossing*1.24)-width)/frequency);
  }
  distance=join(distance,mesh,Math.max(.001,rib*.17));
 }
 if(nodes<=.00001&&growth<=.00001)return distance/spacing*.66;

 const seed=((s.seed||0)%1000)*.071;
 const lift=smooth(.12,.91,release);
 const gather=smooth(.74,1,release);
 const branchWeb=smooth(.25,.58,release)*(1-smooth(.80,.98,release))*web*.75;
 const first=lift*(.22+.7*growth*reach);
 if(z<-.16)return distance/spacing*.66;
 const [px,py,pz]=p,variance=s.structWeaveVariation;
 const a=Math.cos(2.9*py+2.3*pz+.16*Math.sin(phase)),b=Math.cos(6.2*py-4*pz);
 const c=Math.cos(3.5*px-3.1*pz+.15*Math.cos(phase)),d=Math.cos(7.4*px+5*pz);
 const shearX=.25-.13*release+variance*(.406*a+.465*b),shearY=-.24+variance*(.5425*c+.3848*d);
 const normalSign=Math.tanh(pz*4),radialX=normalSign*variance*(.322*a-.30*b),radialY=normalSign*variance*(-.4805*c+.26*d);
 const determinant=1/Math.max(.42,1-shearX*shearY);
 // A shoot can cross a cell boundary. Query the adjoining column and the
 // rows above and below whenever their support reaches the same point.
 for(let column=0;column<(Math.abs(x)>.29?2:1);column++)for(let row=-1;row<2;row++){
  const localY=y+row;
  if(localY<-.63||localY>.49+first)continue;
  const shift=column*Math.sign(x),localX=x-shift,rowId=cellY-row;
  const style=fract((cellX+shift)*.28731+rowId*.46217+seed);
  const buds=1-.92*smooth(.58,1,release)*Math.abs(rowId%2);
  for(let index=0;index<10;index++){
   const seq=index+.5, random=fract(seq*.618033989+style);
   const angle=seq*2.39996323+style*TAU;
   const cx=Math.cos(angle), cy=Math.sin(angle);
   const ring=.184*Math.sqrt(seq/10)*(.74+random*.38);
   const rootX=cx*ring*(1-.86*lift)+.028*Math.sin(style*TAU)*lift;
   const rank=index<4?.96-index*.258:.08+.74*random;
   const rootY=mix(cy*ring,mix(-.56+.62*rank,-.43,gather)+(random-.5)*.062,lift);
   const rootZ=mix(.059+.026*random,.029+.018*random,lift);
   const height = growth*reach*(.22+.30*random);
   const emphasis=1-(index>=4?(.77-.39*gather)*smooth(.42,.79,release):0);
   const side=index%2===0?1:-1;
   const spread=mix((index===0?.12:.22)+.063*random,.082+.24*random,gather);
   const deltaX=mix(cx*height*.59,clamp((side*spread*(.62+.38*random)+cx*.044)*(.38+.62*growth*reach),-.37,.37),lift)*emphasis;
   const deltaY=mix(cy*height*.60,mix(.06+height*(.29+.32*rank),(.39+height)*(.43+.61*rank),gather),lift)*emphasis;
   const deltaZ=mix(.015+height*.57,.015+height*.17+.018*cy,lift);
   const ball = (.026+.033*random)*(.28+.72*nodes)*emphasis;
   const cap = Math.min(.13,ball*(1-.37*growth*(1-lift)+1.13*lift*(index===2?1.35:1)))*buds;
   const qx=localX-rootX, qy=localY-rootY, qz=z-rootZ;
   const bend=.115*growth*reach*cx+.08*lift*cy;
   const margin=cap*2.05+rib*.46,marginX=margin+Math.abs(bend)*.25;
   const bound=Math.max(Math.min(0,deltaX)-qx-marginX,qx-Math.max(0,deltaX)-marginX,Math.min(0,deltaY)-qy-margin,qy-Math.max(0,deltaY)-margin,-qz-margin,qz-Math.max(0,deltaZ)-margin);
   if(bound>0){distance=Math.min(distance,bound+.018);continue;}
   const relative=measureShoot(qx,qy,qz,shearX,shearY,radialX,radialY,determinant,release);
   const span=measureShoot(deltaX,deltaY*buds,deltaZ*buds,shearX,shearY,radialX,radialY,determinant,release);
   distance=Math.min(distance,shootDistance(...relative,...span,cap,rib*buds,growth,release,open,index,bend,branchWeb*buds*emphasis));
  }
 }
 return distance/spacing*.66;
}

// Same shell, chart and branch kernel as the CPU field. The material samples
// the chart independently so subpixel fibres retain stable optical coverage.
export const WEAVE_NETWORK_GLSL = `
uniform vec4 uWeaveNetwork;
vec2 weaveNetworkChart(vec3 p,float phase){
 float x=p.x,y=p.y,z=p.z,variation=uStructureH.y,release=uWeaveNetwork.z;
 return (1.02+.30*sqrt(uStructureB.x))*vec2(
  (x+(.25-.13*release)*y+variation*(.14*sin(2.9*y+2.3*z+.16*sin(phase))+.075*sin(6.2*y-4.*z)))/(1.+.30*release),
  (y-.24*x+variation*(.155*sin(3.5*x-3.1*z+.15*cos(phase))+.052*sin(7.4*x+5.*z)))/(1.+.67*release));
}
#ifdef WEAVE_DETAIL
float networkJoin(float a,float b,float width){
 float t=max(0.,width-abs(a-b))/width;
 return min(a,b)-.25*width*t*t;
}
vec3 measureShoot(vec3 q,vec4 shear,float determinant,float release){
 vec2 pos=q.xy*vec2(1.+.30*release,1.+.67*release)-shear.zw*q.z;
 return vec3(vec2(pos.x-shear.x*pos.y,pos.y-shear.y*pos.x)*determinant,q.z);
}
float weaveSurface;
float networkShoot(vec3 q,vec3 span,float radius,float rim,float growth,float release,float open,float index,float bend,float web,out float detail){
 float length2=dot(span,span);
 float t0=clamp(dot(q,span)/max(.00001,length2),0.,1.),curl=bend*t0*(1.-t0);
 float t=clamp(dot(q-vec3(curl,0,0),span)/max(.00001,length2),0.,1.),taper=1.-t;
 float stemRadius=rim*(.16+.38*taper*taper)+radius*(.07+.37*release*exp(-46.*taper*taper));
 float stem=length(q-span*t-vec3(bend*t*(1.-t),0,0))-stemRadius;
 vec3 tip=q-span;
 float opening=open*smoothstep(.09,.55,growth);
 float tilt=sin(1.+index*2.1),turn=opening*(.41+.31*tilt*tilt);
 vec3 axis=normalize(mix(span/max(.0001,sqrt(length2)),vec3(0,0,1),turn));
 float axial=dot(tip,axis);
 float lateral=sqrt(max(0.,dot(tip,tip)-axial*axial));
 float variation=sin(index*2.3+1.),bell=smoothstep(.07,.86,release)*(.75+.25*variation*variation);
 float height=radius*(1.+.17*bell-.13*opening);
 float wobble=.082*(sin(tip.x*36.+index*1.4)+.54*sin(tip.y*69.-tip.z*58.))*opening;
 float radialScale=(1.+.38*opening+.24*bell*clamp(axial/max(.001,height),-1.,1.))*(1.+wobble);
 float bowl=(length(vec2(lateral/radialScale,axial*radius/height))-radius)*.69;
 float shell=max(smoothstep(.29,.79,release),smoothstep(.10,.73,opening));
 float innerRadius=radius*(.64+.27*shell+.048*opening);
 float inside=(length(vec2(lateral/(radialScale*(1.+.12*opening)),(axial-height*opening*.61)*radius/height))-innerRadius)*.68;
 float hollow=-inside-radius*(1.-shell)*1.15;
 float lip=max(.0001,radius*.036);
 float cup=shell>0.?-networkJoin(-bowl,-hollow,lip):bowl;
 if(shell>0.)stem=-networkJoin(-stem,-hollow,lip);
 float terminal=1.-smoothstep(-.005,.013,cup-stem);
 detail=terminal>.60?1.+clamp(.5+.5*axial/height,0.,1.):0.;
 float result=networkJoin(stem,cup,max(.001,rim*.27));
 if(web>.001&&q.y>0.&&q.y<span.y&&abs(span.x)>.025){
  float u=q.y/span.y,strip=sin(3.14159265359*u);
  float width=abs(span.x)*.53*web*strip*strip;
  float base=span.x*u+bend*u*(1.-u)-sign(span.x)*width;
  float membrane=max(abs(q.x-base)-width,abs(q.z-span.z*u*.8)-rim*.115*web*strip);
  if(membrane<result)detail=0.;
  result=networkJoin(result,membrane,max(.0007,rim*.12));
 }
 return result;
}
float weaveNetworkField(float field,vec3 p,float wall){
 float phase=uStructureF.z*6.28318530718,release=uWeaveNetwork.z,growth=uWeaveGrowth.x,reach=uWeaveNetwork.w,nodes=uStructureH.z;
 float spacing=1.02+.30*sqrt(uStructureB.x),z=(field+wall*.19)*spacing;
 weaveSurface=0.;
 float outside=max(-.23-z,z-(.29+.53*growth*reach));
 if(outside>.027)return outside/spacing*.64;
 vec2 chart=weaveNetworkChart(p,phase),cell=floor(chart+.5),q=chart-cell,absolute=abs(q);
 float rib=clamp(wall*spacing*(.21+.45*uStructureB.y),.004,.105);
 float radius=rib*(1.-.82*release),membrane=uWeaveGrowth.z*(1.-smoothstep(.08,.77,release));
 float weave=uStructureB.z*.42*spacing*cos(chart.x*3.14159265359)*cos(chart.y*3.14159265359);
 float flange=1.03*membrane*(1.-.72*release);
 float horizontal=length(vec2(q.y,z-weave))-radius*(1.+flange*exp(-18.*q.x*q.x))*(1.-smoothstep(.12,.83,release))+.013*smoothstep(.74,.88,release);
 float vertical=length(vec2(q.x,z+weave))-radius*(1.+flange*exp(-18.*q.y*q.y));
 float distance=networkJoin(horizontal,vertical,max(.001,rib*.36));
 float along=max(absolute.x,absolute.y),across=min(absolute.x,absolute.y);
 if(membrane>.00001){
  float span=radius+membrane*(.28+.21*nodes)*pow(1.-clamp(along*1.94,0.,1.),1.58);
  float offset=weave*.35+.19*q.x*q.y+.019*sin(chart.x*6.28318530718)*sin(chart.y*6.28318530718);
  float thickness=rib*(.10+.16*membrane)*(1.-.72*along);
  float outline=max((across-span)*.73,abs(z-offset)-thickness),mesh=outline;
  if(outline<.016){
   float u=chart.x+.095*sin(chart.y*8.)+.047*sin(chart.y*22.+chart.x*9.);
   float v=chart.y+.078*sin(chart.x*10.)-.045*sin(chart.x*26.-chart.y*14.);
   float frequency=76.*uWeaveNetwork.y;
   float warp=abs(sin((u+.32*v)*frequency+.74*sin(v*58.)));
   float weft=abs(sin((v-.42*u)*frequency*.92+.71*sin(u*49.)));
   float crossing=abs(sin((u+v)*frequency*.61+1.3*sin((u-v)*28.)));
   float width=.065+.27*membrane*(1.-smoothstep(.01,.31,across));
   mesh=max(outline,(min(min(warp,weft),crossing*1.24)-width)/frequency);
  }
  distance=networkJoin(distance,mesh,max(.001,rib*.17));
 }
 if((nodes<=.00001&&growth<=.00001)||z<-.16)return distance/spacing*.66;
 float variance=uStructureH.y;
 float a=cos(2.9*p.y+2.3*p.z+.16*sin(phase)),b=cos(6.2*p.y-4.*p.z);
 float c=cos(3.5*p.x-3.1*p.z+.15*cos(phase)),d=cos(7.4*p.x+5.*p.z);
 vec4 shear=vec4(.25-.13*release+variance*(.406*a+.465*b),-.24+variance*(.5425*c+.3848*d),
     tanh(p.z*4.)*variance*vec2(.322*a-.30*b,-.4805*c+.26*d));
 float determinant=1./max(.42,1.-shear.x*shear.y);
 float lift=smoothstep(.12,.91,release),gather=smoothstep(.74,1.,release),first=lift*(.22+.7*growth*reach);
 float branchWeb=smoothstep(.25,.58,release)*(1.-smoothstep(.80,.98,release))*uWeaveGrowth.z*.75;
 for(int column=0;column<2;column++)for(int row=-1;row<2;row++){
  if(column>0&&abs(q.x)<=.29)continue;
  float localY=q.y+float(row);
  if(localY<-.63||localY>.49+first)continue;
  float shift=float(column)*sign(q.x),localX=q.x-shift,rowId=cell.y-float(row);
  float style=fract((cell.x+shift)*.28731+rowId*.46217+floor(uSeed/.013+.5)*.071);
  float buds=1.-.92*smoothstep(.58,1.,release)*mod(rowId,2.);
  for(int index=0;index<10;index++){
   float seq=float(index)+.5,random=fract(seq*.618033989+style),angle=seq*2.39996323+style*6.28318530718;
   float cx=cos(angle),cy=sin(angle),ring=.184*sqrt(seq/10.)*(.74+random*.38);
   float rank=index<4?.96-float(index)*.258:.08+.74*random;
   vec3 root=vec3(cx*ring*(1.-.86*lift)+.028*sin(style*6.28318530718)*lift,
    mix(cy*ring,mix(-.56+.62*rank,-.43,gather)+(random-.5)*.062,lift),
    mix(.059+.026*random,.029+.018*random,lift));
   float height=growth*reach*(.22+.30*random);
   float emphasis=1.-(index>=4?(.77-.39*gather)*smoothstep(.42,.79,release):0.);
   float side=index%2==0?1.:-1.,spread=mix((index==0?.12:.22)+.063*random,.082+.24*random,gather);
   vec3 span=vec3(mix(cx*height*.59,clamp((side*spread*(.62+.38*random)+cx*.044)*(.38+.62*growth*reach),-.37,.37),lift)*emphasis,
    mix(cy*height*.60,mix(.06+height*(.29+.32*rank),(.39+height)*(.43+.61*rank),gather),lift)*emphasis,
    mix(.015+height*.57,.015+height*.17+.018*cy,lift));
   float cap=min(.13,(.026+.033*random)*(.28+.72*nodes)*emphasis*(1.-.37*growth*(1.-lift)+1.13*lift*(index==2?1.35:1.)))*buds;
   vec3 relative=vec3(localX,localY,z)-root;
   float bend=.115*growth*reach*cx+.08*lift*cy;
   vec3 margin=vec3(cap*2.05+rib*.46)+vec3(abs(bend)*.25,0,0);
   vec3 bounds=max(min(vec3(0),span)-relative,relative-max(vec3(0),span))-margin;
   float bound=max(bounds.x,max(bounds.y,bounds.z));
   if(bound>0.){distance=min(distance,bound+.018);continue;}
   span.yz*=buds;
   relative=measureShoot(relative,shear,determinant,release);
   span=measureShoot(span,shear,determinant,release);
   float detail;float candidate=networkShoot(relative,span,cap,rib*buds,growth,release,uWeaveGrowth.y,float(index),bend,branchWeb*buds*emphasis,detail);
   if(candidate<distance){distance=candidate;weaveSurface=detail;}
  }
 }
 return distance/spacing*.66;
}
#endif
`;
