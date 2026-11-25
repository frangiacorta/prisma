import {junctionField,JUNCTION_GLSL} from './weave-junction.js?v=b3646b8af04a';

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
 const [x, y, z] = p, variation = s.structWeaveVariation, hierarchy=s.structWeaveHierarchy||0;
 const spacing = 1.02 + .30 * Math.sqrt(s.structDensity);
 const spine = hierarchy*(.16*Math.sin(2.46*y+1.17*z)+.044*Math.cos(5.24*y-2.2*z));
 const cross = hierarchy*(-.17*Math.tanh(2.3*x)+.052*Math.sin(4.51*x+.77*z));
 const branchAngle=hierarchy*.073*Math.tanh(3.1*(x-.14));
 return [
  spacing * (x + (.25-.13*release)*y + spine + variation * (.14 * Math.sin(2.9*y + 2.3*z + .16*Math.sin(phase)) + .075*Math.sin(6.2*y - 4*z))) / (1+.30*release+.46*hierarchy),
  spacing * (y - .24*x + cross + branchAngle + variation * (.155*Math.sin(3.5*x - 3.1*z + .15*Math.cos(phase)) + .052*Math.sin(7.4*x + 5*z))) / (1+.67*release+.37*hierarchy)
 ];
}

function measureShoot(x, y, z, ax, ay, zx, zy, determinant, release, hierarchy) {
 const u=x*(1+.30*release+.46*hierarchy)-zx*z, v=y*(1+.67*release+.37*hierarchy)-zy*z;
 return [(u-ax*v)*determinant,(v-ay*u)*determinant,z];
}

function shootDistance(x, y, z, a, b, c, radius, rim, growth, release, open, index, bend, web, hierarchy, nodes) {
 const length2 = a*a + b*b + c*c;
 const longitudinal=hierarchy*smooth(.25,.79,release);
 const curvature=bend-.83*a*longitudinal;
 const t0 = clamp((x*a+y*b+z*c)/Math.max(.00001,length2),0,1);
 const curl = curvature*t0*(1-t0);
 let t = clamp(((x-curl)*a+y*b+z*c)/Math.max(.00001,length2),0,1);
 if(longitudinal>0){
  const slope=a+curvature*(1-2*t), error=x-a*t-curvature*t*(1-t);
  t=clamp(t+(error*slope+(y-b*t)*b+(z-c*t)*c)/Math.max(.0001,slope*slope+b*b+c*c+2*curvature*error),0,1);
 }
 const taper = 1-t;
 const flare = mix(Math.exp(-46*taper*taper),Math.exp(-19*taper*taper),longitudinal);
 const stemRadius = rim*(.16+.38*taper*taper+.36*longitudinal*taper**3)+radius*(.07+.37*release*flare);
 let stem = Math.hypot(x-a*t-curvature*t*(1-t),y-b*t,z-c*t)-stemRadius;

 const length = Math.sqrt(length2);
 const tx=x-a, ty=y-b, tz=z-c;
 const opening = open*smooth(.09,.55,growth);
 const facing = opening*(.41+.31*Math.sin(1+index*2.1)**2-.09*longitudinal);
 const cx=a/Math.max(.0001,length)*(1-facing),cy=b/Math.max(.0001,length)*(1-facing),cz=c/Math.max(.0001,length)*(1-facing)+facing;
 const axial = (tx*cx+ty*cy+tz*cz)/Math.max(.0001,Math.hypot(cx,cy,cz));
 const lateral = Math.sqrt(Math.max(0,tx*tx+ty*ty+tz*tz-axial*axial));
 const bell = smooth(.07,.86,release)*(.75+.25*Math.sin(index*2.3+1)**2);
 const height = radius*(1+.17*bell-.13*opening+longitudinal*(.29+.11*opening));
 const wobble=(.082-.036*hierarchy)*(Math.sin(tx*36+index*1.4)+.54*Math.sin(ty*69-tz*58))*opening;
 const radialScale=(1+.34*opening+.04*opening*(1-longitudinal)+(.24+.28*hierarchy)*bell*clamp(axial/Math.max(.001,height),-1,1))*(1+wobble);
 const bowl = (Math.hypot(lateral/radialScale,axial*radius/height)-radius)*.69;
 const shell=Math.max(smooth(.29,.79,release),smooth(.10,.73,opening));
 const innerRadius=radius*(.64+(.27+.024*longitudinal)*shell+.048*opening);
 const inside=(Math.hypot(lateral/(radialScale*(1+.12*opening)),(axial-height*opening*(.61-.10*longitudinal))*radius/height)-innerRadius)*.68;
 const hollow=-inside-radius*(1-shell)*1.15;
 const lip=Math.max(.0001,radius*.036);
 const cup=shell>0 ? -join(-bowl,-hollow,lip) : bowl;
 if(shell>0)stem=-join(-stem,-hollow,lip);
 let result=join(stem,cup,Math.max(.001,rim*(.27+.38*longitudinal)));
 const buds=hierarchy*(1-smooth(.09,.34,release))*smooth(.29,.81,growth);
 if(index<7&&buds>.001&&t>.37&&Math.abs(stem)<radius*3.8){
  const anchor=.59+.10*Math.sin(index*2.4);
  const scale=radius*buds;
  const px=x-a*anchor-curvature*anchor*(1-anchor),py=y-b*anchor,pz=z-c*anchor;
  const sx=scale*2.75*(.85+.15*Math.cos(index*3.1))*a/(Math.abs(a)+.025),sy=scale*(1.31+.67*Math.sin(index*2.3)),sz=scale*(.62+.78*Math.cos(index*2.1));
  const travel=clamp((px*sx+py*sy+pz*sz)/Math.max(1e-8,sx*sx+sy*sy+sz*sz),0,1);
  const branch=Math.hypot(px-sx*travel,py-sy*travel,pz-sz*travel)-scale*(.46-.28*travel);
  const bud=Math.hypot(px-sx,py-sy,pz-sz)-scale*(.42+.14*Math.sin(index*3.3));
  result=join(result,Math.min(branch,bud),Math.max(.00015,scale*.42));
 }
 const throat=longitudinal*nodes*smooth(.37,.85,release)*smooth(.13,.61,opening);
 if(throat>.0001){
  const seedRadius=radius*(.29+.13*nodes)*Math.sqrt(throat);
  const seed=Math.hypot(lateral,axial*.87+height*.51)-seedRadius;
  result=join(result,seed,Math.max(.0002,seedRadius*.24));
 }
 if(web>.001&&y>0&&y<b&&Math.abs(a)>.025){
  const u=y/b,strip=Math.max(0,Math.sin(Math.PI*u));
  const width=Math.abs(a)*(.53+.49*longitudinal)*web*Math.pow(strip,2-1.29*longitudinal);
  const clampedCenter=a*u+curvature*u*(1-u);
  const base=clampedCenter-Math.sign(a)*width;
  const landscape=z-c*u*.8+longitudinal*strip*(x-clampedCenter)*.24;
  const radiusZ=rim*(.115+.19*longitudinal)*web*strip;
  const slab=Math.max(Math.abs(x-base)-width,Math.abs(landscape)-radiusZ);
  const rounded=Math.max((Math.hypot((x-base)/Math.max(.0001,width),landscape/Math.max(.0001,radiusZ))-1)*radiusZ,(Math.abs(x-base)-width)*.68);
  result=join(result,mix(slab,rounded,longitudinal),Math.max(.0007,rim*(.12+.31*longitudinal)));
 }
 return result;
}

function gridNetworkField(s, field, p, thickness) {
 const {structWeaveRelease:release,structWeaveGrowth:growth,structWeaveReach:reach,
  structWeaveNodes:nodes,structWeaveMembrane:web,structWeaveCup:open}=s;
 const phase = s.structFlowPhase*TAU, spacing=1.02+.30*Math.sqrt(s.structDensity);
 const hierarchy=s.structWeaveHierarchy||0, alignment=s.structWeaveAlignment||0, spreadControl=s.structWeaveSpread??1;
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
 const direction=(1-.59*hierarchy)*(1+.19*hierarchy*Math.sin(chart[0]*3.17+chart[1]*2.37));
 const horizontal = Math.hypot(y,z-weave)-radius*direction*(1+flange*Math.exp(-18*x*x))*(1-smooth(.12,.83,release))+.013*smooth(.74,.88,release);
 const trunk=(1+hierarchy*(.36-.64*smooth(.63,1,release)))*(1+.13*hierarchy*Math.sin(chart[1]*4.1+chart[0]*1.3)-.43*hierarchy*smooth(.05,.43,ay));
 const independent=hierarchy*smooth(.83,.995,release);
 const vertical = Math.hypot(x,z+weave)-radius*trunk*(1+flange*Math.exp(-18*y*y))*(1-.94*independent)+.006*independent;
 let distance=join(horizontal,vertical,Math.max(.001,rib*.36));
 const along=Math.max(ax,ay), across=Math.min(ax,ay);
 if(membrane>.00001){
  const span = radius + membrane*(.28+.21*nodes+.15*hierarchy)*Math.pow(1-clamp((along+.007*hierarchy)*1.94,0,1),1.58-.36*hierarchy);
  const offset = weave*.35+.19*x*y+.019*Math.sin(chart[0]*TAU)*Math.sin(chart[1]*TAU);
  const thickness = rib*(.10+.16*membrane)*(1-.72*along);
  const outline = Math.max((across-span)*.73,Math.abs(z-offset)-thickness);
  let mesh=outline, aligned=outline;
  if(outline<.016){
   const u=chart[0]+.095*Math.sin(chart[1]*8)+.047*Math.sin(chart[1]*22+chart[0]*9);
   const v=chart[1]+.078*Math.sin(chart[0]*10)-.045*Math.sin(chart[0]*26-chart[1]*14);
   const frequency=76*s.structWeaveFinesse;
   const warp=Math.abs(Math.sin((u+.32*v)*frequency+.74*Math.sin(v*58)));
   const weft=Math.abs(Math.sin((v-.42*u)*frequency*.92+.71*Math.sin(u*49)));
   const crossing=Math.abs(Math.sin((u+v)*frequency*.61+1.3*Math.sin((u-v)*28)));
   const width=.065+.27*membrane*(1-smooth(.01,.31,across));
   mesh=Math.max(outline,(Math.min(warp,weft,crossing*1.24)-width)/frequency);
   if(alignment>0){
    const [u,v]=chart;
    const diagonal = .12*Math.sin(6.6*u+3.2*v)+.25*Math.sin(3.3*v-1.4*u);
    const jitter = .021*Math.sin(38*u+49*v+phase)+.005*Math.sin(98*v-74*u);
    const path=x*y*(3.5+.57*Math.sin(6*u+3*v))+diagonal*.17+jitter;
    const warpPhase=frequency*path;
    const weftPhase=frequency*(.77*path+.29*(x-y)+.045*Math.sin(11*u-9*v)-jitter*.4);
    const depth=z-offset, amplitude=rib*.14;
    const section=(.66+.34*Math.sin(1.9*u+5.2*v+.04*weftPhase)**2);
    const radiusFibre=(.12+.22*membrane)*section*(1-.29*along)/frequency;
    const warpDepth=amplitude*Math.sin(16*u+23*v+.08*warpPhase);
    const weftDepth=amplitude*Math.cos(19*v-29*u+.064*weftPhase);
    const warpCore=Math.hypot(Math.sin(warpPhase)/frequency,(depth-warpDepth)*.86)-radiusFibre;
    const weftCore=Math.hypot(Math.sin(weftPhase)/frequency,(depth+weftDepth)*.86)-radiusFibre*.68;
    const fineWeft=Math.hypot(crossing/frequency,depth*.75)-radiusFibre*.48;
    aligned=Math.max((across-span)*.73,Math.min(warpCore,weftCore,fineWeft));
   }
  }
  distance=join(distance,mix(mesh,aligned,alignment),Math.max(.001,rib*.17));
 }
 if(nodes<=.00001&&growth<=.00001)return distance/spacing*.66;

 const seed=((s.seed||0)%1000)*.071;
 const lift=smooth(.12,.91,release);
 const gather=smooth(.74,1,release);
 const branchWeb=smooth(.25,.58,release)*(1-smooth(.80,.98,release))*web*(.75+.25*hierarchy);
 const first=lift*(.22+.7*growth*reach);
 const cupFormation=Math.max(smooth(.27,.64,release),.85*smooth(.10,.77,open)*smooth(.09,.55,growth));
 const cupScale=mix(1,s.structWeaveCupSize??1,cupFormation);
 if(z<-.16)return distance/spacing*.66;
 const [px,py,pz]=p,variance=s.structWeaveVariation;
 const a=Math.cos(2.9*py+2.3*pz+.16*Math.sin(phase)),b=Math.cos(6.2*py-4*pz);
 const c=Math.cos(3.5*px-3.1*pz+.15*Math.cos(phase)),d=Math.cos(7.4*px+5*pz);
 const trunkSlope=Math.cos(2.46*py+1.17*pz),trunkBend=Math.sin(5.24*py-2.2*pz);
 const crossSlope=Math.cos(4.51*px+.77*pz),crossBend=Math.tanh(2.3*px);
 const shearX=.25-.13*release+variance*(.406*a+.465*b)+hierarchy*(.3936*trunkSlope-.23056*trunkBend);
 const sideBend=Math.tanh(3.1*(px-.14));
 const shearY=-.24+variance*(.5425*c+.3848*d)+hierarchy*(-.391*(1-crossBend*crossBend)+.23452*crossSlope+.2263*(1-sideBend*sideBend));
 const normalSign=Math.tanh(pz*4);
 const radialX=normalSign*(variance*(.322*a-.30*b)+hierarchy*(.1872*trunkSlope+.0968*trunkBend));
 const radialY=normalSign*(variance*(-.4805*c+.26*d)+hierarchy*.04004*crossSlope);
 const determinant=1/Math.max(.42,1-shearX*shearY);
 // A shoot can cross a cell boundary. Query the adjoining column and the
 // rows above and below whenever their support reaches the same point.
 for(let column=0;column<(Math.abs(x)>.29-.15*hierarchy*lift?2:1);column++)for(let row=-1;row<2;row++){
  const localY=y+row;
  if(localY<-.63-.12*hierarchy||localY>.49+first+.35*hierarchy*(1-lift))continue;
  const shift=column*Math.sign(x),localX=x-shift,rowId=cellY-row;
  const style=fract((cellX+shift)*.28731+rowId*.46217+seed);
  const buds=1-.92*smooth(.58-.15*hierarchy,1,release)*Math.abs(rowId%2);
  const siteTiming=hierarchy*(s.structDelay??.35)*(1-lift)*Math.sin(TAU*(style+.12)*1.7);
  const siteGrowth=clamp(growth+siteTiming*smooth(.03,.46,growth)*(1-smooth(.71,1,growth))*.72,0,1);
  for(let index=0;index<10;index++){
   const seq=index+.5, random=fract(seq*.618033989+style);
   const angle=seq*2.39996323+style*TAU;
   const cx=Math.cos(angle), cy=Math.sin(angle);
   const ring=.184*Math.sqrt(seq/10)*(.74+random*.38);
   const rootX=cx*ring*(1-.86*lift)*(1-.28*hierarchy)+(.028-.018*hierarchy)*Math.sin(style*TAU)*lift;
   const rank=index<4?.96-index*.258:.08+.74*random;
   const rootY=mix(cy*ring*(1+.91*hierarchy)+hierarchy*(.11+.11*random),mix(-.56+(.62+.32*hierarchy)*rank,-.43-.035*hierarchy,gather)+(random-.5)*.062,lift);
   const rootZ=mix(.059+(.026+.011*hierarchy)*random,.029+.018*random,lift);
   const height = siteGrowth*reach*(.22+.30*random);
   const lateSide=independent*(index===4||index===5?1:0);
   const emphasis=1-(index>=4?(.77-.39*gather+hierarchy*(.20+.21*gather)-.70*lateSide)*smooth(.42,.79,release):0);
   const side=index%2===0?1:-1;
   const spread=mix((index===0?.12-.035*hierarchy:.22+(index===2?.119:-.011)*hierarchy)+.063*random,.082+.24*random+hierarchy*(index===2?.14:index===1?.087:-.024)+.14*lateSide,gather);
   const earlyY=mix(cy*.60,.05+(cy*.30+.29)*(.57+.52*random),hierarchy);
   const earlyX=mix(cx*.59,cx*(.54+.14*random)+.115,hierarchy);
   const limit=.37+.05*hierarchy,extent=.44+.06*hierarchy;
   const deltaX=clamp(mix(earlyX*height,clamp((side*spread*(.62+.38*random)+cx*.044)*(.38+.62*growth*reach),-limit,limit),lift)*emphasis*spreadControl,-extent,extent);
   const lateRank=mix(rank,index===4?.58:index===5?.48:rank,independent);
   const deltaY=mix(earlyY*height,mix(.06+height*(.29+.32*rank),(.39+height)*(.43+(.61+.21*hierarchy)*lateRank),gather),lift)*emphasis*buds;
   const deltaZ=mix(.015+height*.57,.015+height*.17+.018*cy+.072*lateSide*cy,lift)*buds;
   const ball = (.026+.033*random)*(.28+.72*nodes)*emphasis;
   const dominant=(index===2?1.35+.51*hierarchy:index===0?1+.52*hierarchy:1)+.53*lateSide;
   const cap = Math.min(.13+.054*hierarchy,ball*(1-.37*growth*(1-lift)+1.13*lift*dominant))*buds*(1-.68*independent*(1-emphasis))*cupScale;
   const qx=localX-rootX, qy=localY-rootY, qz=z-rootZ;
   const bend=.115*growth*reach*cx+.08*lift*cy;
   const margin=cap*(2.05+.92*hierarchy*(1-lift))+rib*.46,marginX=margin+(Math.abs(bend)+Math.abs(deltaX)*hierarchy)*.25;
   const bound=Math.max(Math.min(0,deltaX)-qx-marginX,qx-Math.max(0,deltaX)-marginX,Math.min(0,deltaY)-qy-margin,qy-Math.max(0,deltaY)-margin,Math.min(0,deltaZ)-qz-margin,qz-Math.max(0,deltaZ)-margin);
   if(bound>0){distance=Math.min(distance,bound+.018);continue;}
   const relative=measureShoot(qx,qy,qz,shearX,shearY,radialX,radialY,determinant,release,hierarchy);
   const span=measureShoot(deltaX,deltaY,deltaZ,shearX,shearY,radialX,radialY,determinant,release,hierarchy);
   distance=Math.min(distance,shootDistance(...relative,...span,cap,rib*buds,siteGrowth,release,open,index,bend,branchWeb*buds*emphasis,hierarchy,nodes));
  }
 }
 return distance/spacing*.66;
}

export function weaveNetworkField(s,field,p,thickness){
 const tension=s.structWeaveTension||0;
 if(tension<=0)return gridNetworkField(s,field,p,thickness);
 const tissue=junctionField(s,field,p,thickness);
 return tension>=1?tissue:mix(gridNetworkField(s,field,p,thickness),tissue,tension);
}

// Same shell, chart and branch kernel as the CPU field. The material samples
// the chart independently so subpixel fibres retain stable optical coverage.
export const WEAVE_NETWORK_GLSL = `
uniform vec4 uWeaveNetwork;
uniform vec4 uWeaveDetail;
uniform float uWeaveCupSize;
vec2 weaveNetworkChart(vec3 p,float phase){
 float x=p.x,y=p.y,z=p.z,variation=uStructureH.y,release=uWeaveNetwork.z,hierarchy=uWeaveDetail.x;
 float spine=hierarchy*(.16*sin(2.46*y+1.17*z)+.044*cos(5.24*y-2.2*z));
 float crossBranch=hierarchy*(-.17*tanh(2.3*x)+.052*sin(4.51*x+.77*z));
 float branchAngle=hierarchy*.073*tanh(3.1*(x-.14));
 return (1.02+.30*sqrt(uStructureB.x))*vec2(
  (x+(.25-.13*release)*y+spine+variation*(.14*sin(2.9*y+2.3*z+.16*sin(phase))+.075*sin(6.2*y-4.*z)))/(1.+.30*release+.46*hierarchy),
  (y-.24*x+crossBranch+branchAngle+variation*(.155*sin(3.5*x-3.1*z+.15*cos(phase))+.052*sin(7.4*x+5.*z)))/(1.+.67*release+.37*hierarchy));
}
#ifdef WEAVE_DETAIL
float networkJoin(float a,float b,float width){
 float t=max(0.,width-abs(a-b))/width;
 return min(a,b)-.25*width*t*t;
}
vec3 measureShoot(vec3 q,vec4 shear,float determinant,float release,float hierarchy){
 vec2 pos=q.xy*vec2(1.+.30*release+.46*hierarchy,1.+.67*release+.37*hierarchy)-shear.zw*q.z;
 return vec3(vec2(pos.x-shear.x*pos.y,pos.y-shear.y*pos.x)*determinant,q.z);
}
vec3 weaveSurface;
#ifdef WEAVE_HIT_TAG
bool weaveEvaluateMaterial=false;
#endif
#endif
${JUNCTION_GLSL}
#ifdef WEAVE_DETAIL
float networkShoot(vec3 q,vec3 span,float radius,float rim,float growth,float release,float open,float index,float bend,float web,float hierarchy,float nodes,out vec3 detail){
 float length2=dot(span,span);
 float longitudinal=hierarchy*smoothstep(.25,.79,release),curvature=bend-.83*span.x*longitudinal;
 float t0=clamp(dot(q,span)/max(.00001,length2),0.,1.),curl=curvature*t0*(1.-t0);
 float t=clamp(dot(q-vec3(curl,0,0),span)/max(.00001,length2),0.,1.);
 if(longitudinal>0.){
  vec3 slope=span+vec3(curvature*(1.-2.*t),0.,0.),error=q-span*t-vec3(curvature*t*(1.-t),0.,0.);
  t=clamp(t+dot(error,slope)/max(.0001,dot(slope,slope)+2.*curvature*error.x),0.,1.);
 }
 float taper=1.-t;
 float flare=mix(exp(-46.*taper*taper),exp(-19.*taper*taper),longitudinal);
 float stemRadius=rim*(.16+.38*taper*taper+.36*longitudinal*taper*taper*taper)+radius*(.07+.37*release*flare);
 float stem=length(q-span*t-vec3(curvature*t*(1.-t),0,0))-stemRadius;
 vec3 tip=q-span;
 float opening=open*smoothstep(.09,.55,growth);
 float tilt=sin(1.+index*2.1),turn=opening*(.41+.31*tilt*tilt-.09*longitudinal);
 vec3 axis=normalize(mix(span/max(.0001,sqrt(length2)),vec3(0,0,1),turn));
 float axial=dot(tip,axis);
 float lateral=sqrt(max(0.,dot(tip,tip)-axial*axial));
 float variation=sin(index*2.3+1.),bell=smoothstep(.07,.86,release)*(.75+.25*variation*variation);
 float height=radius*(1.+.17*bell-.13*opening+longitudinal*(.29+.11*opening));
 float wobble=(.082-.036*hierarchy)*(sin(tip.x*36.+index*1.4)+.54*sin(tip.y*69.-tip.z*58.))*opening;
 float radialScale=(1.+.34*opening+.04*opening*(1.-longitudinal)+(.24+.28*hierarchy)*bell*clamp(axial/max(.001,height),-1.,1.))*(1.+wobble);
 float bowl=(length(vec2(lateral/radialScale,axial*radius/height))-radius)*.69;
 float shell=max(smoothstep(.29,.79,release),smoothstep(.10,.73,opening));
 float innerRadius=radius*(.64+(.27+.024*longitudinal)*shell+.048*opening);
 float inside=(length(vec2(lateral/(radialScale*(1.+.12*opening)),(axial-height*opening*(.61-.10*longitudinal))*radius/height))-innerRadius)*.68;
 float hollow=-inside-radius*(1.-shell)*1.15;
 float lip=max(.0001,radius*.036);
 float cup=shell>0.?-networkJoin(-bowl,-hollow,lip):bowl;
 if(shell>0.)stem=-networkJoin(-stem,-hollow,lip);
 detail=vec3(0.);
#ifdef WEAVE_HIT_TAG
 if(weaveEvaluateMaterial){
  float terminal=1.-smoothstep(-.005,.013,cup-stem);
  detail.xy=vec2(floor(terminal*14.+.6),clamp(.5+.5*axial/height,0.,1.));
 }
#endif
 float result=networkJoin(stem,cup,max(.001,rim*(.27+.38*longitudinal)));
 float buds=hierarchy*(1.-smoothstep(.09,.34,release))*smoothstep(.29,.81,growth);
 if(index<7.&&buds>.001&&t>.37&&abs(stem)<radius*3.8){
  float anchor=.59+.10*sin(index*2.4),scale=radius*buds;
  vec3 point=q-span*anchor-vec3(curvature*anchor*(1.-anchor),0.,0.);
  vec3 twig=scale*vec3(2.75*(.85+.15*cos(index*3.1))*span.x/(abs(span.x)+.025),1.31+.67*sin(index*2.3),.62+.78*cos(index*2.1));
  float travel=clamp(dot(point,twig)/max(1e-8,dot(twig,twig)),0.,1.);
  float branch=distance(point,twig*travel)-scale*(.46-.28*travel);
  float bud=distance(point,twig)-scale*(.42+.14*sin(index*3.3));
  result=networkJoin(result,min(branch,bud),max(.00015,scale*.42));
 }
 float throat=longitudinal*nodes*smoothstep(.37,.85,release)*smoothstep(.13,.61,opening);
 if(throat>.0001){
  float seedRadius=radius*(.29+.13*nodes)*sqrt(throat);
  float seed=length(vec2(lateral,axial*.87+height*.51))-seedRadius;
  if(seed<result)detail.x=15.;
  result=networkJoin(result,seed,max(.0002,seedRadius*.24));
 }
 if(web>.001&&q.y>0.&&q.y<span.y&&abs(span.x)>.025){
  float u=q.y/span.y,strip=max(0.,sin(3.14159265359*u));
  float width=abs(span.x)*(.53+.49*longitudinal)*web*pow(strip,2.-1.29*longitudinal);
  float clampedCenter=span.x*u+curvature*u*(1.-u),base=clampedCenter-sign(span.x)*width;
  float landscape=q.z-span.z*u*.8+longitudinal*strip*(q.x-clampedCenter)*.24;
  float radiusZ=rim*(.115+.19*longitudinal)*web*strip;
  float slab=max(abs(q.x-base)-width,abs(landscape)-radiusZ);
  float rounded=max((length(vec2((q.x-base)/max(.0001,width),landscape/max(.0001,radiusZ)))-1.)*radiusZ,(abs(q.x-base)-width)*.68);
  float membrane=mix(slab,rounded,longitudinal);
  if(membrane<result)detail.x=0.;
  result=networkJoin(result,membrane,max(.0007,rim*(.12+.31*longitudinal)));
 }
#ifdef WEAVE_HIT_TAG
 // Axial coordinates follow the organ through camera and light animation.
 if(weaveEvaluateMaterial&&detail.x>0.){
  vec3 tangent=abs(axis.x)<.997?normalize(vec3(1.,0.,0.)-axis*axis.x):normalize(vec3(0.,1.,0.)-axis*axis.y);
  detail.z=fract(atan(dot(tip,cross(axis,tangent)),dot(tip,tangent))/6.28318530718+1.);
 }
#endif
 return result;
}
float gridNetworkField(float field,vec3 p,float wall){
 float phase=uStructureF.z*6.28318530718,release=uWeaveNetwork.z,growth=uWeaveGrowth.x,reach=uWeaveNetwork.w,nodes=uStructureH.z;
 float hierarchy=uWeaveDetail.x,alignment=uWeaveDetail.z;
 float spacing=1.02+.30*sqrt(uStructureB.x),z=(field+wall*.19)*spacing;
 weaveSurface=vec3(0.);
 float outside=max(-.23-z,z-(.29+.53*growth*reach));
 if(outside>.027)return outside/spacing*.64;
 vec2 chart=weaveNetworkChart(p,phase),cell=floor(chart+.5),q=chart-cell,absolute=abs(q);
 float rib=clamp(wall*spacing*(.21+.45*uStructureB.y),.004,.105);
 float radius=rib*(1.-.82*release),membrane=uWeaveGrowth.z*(1.-smoothstep(.08,.77,release));
 float weave=uStructureB.z*.42*spacing*cos(chart.x*3.14159265359)*cos(chart.y*3.14159265359);
 float flange=1.03*membrane*(1.-.72*release);
 float direction=(1.-.59*hierarchy)*(1.+.19*hierarchy*sin(chart.x*3.17+chart.y*2.37));
 float horizontal=length(vec2(q.y,z-weave))-radius*direction*(1.+flange*exp(-18.*q.x*q.x))*(1.-smoothstep(.12,.83,release))+.013*smoothstep(.74,.88,release);
 float trunk=(1.+hierarchy*(.36-.64*smoothstep(.63,1.,release)))*(1.+.13*hierarchy*sin(chart.y*4.1+chart.x*1.3)-.43*hierarchy*smoothstep(.05,.43,absolute.y));
 float independent=hierarchy*smoothstep(.83,.995,release);
 float vertical=length(vec2(q.x,z+weave))-radius*trunk*(1.+flange*exp(-18.*q.y*q.y))*(1.-.94*independent)+.006*independent;
 float distance=networkJoin(horizontal,vertical,max(.001,rib*.36));
 float along=max(absolute.x,absolute.y),across=min(absolute.x,absolute.y);
 if(membrane>.00001){
  float span=radius+membrane*(.28+.21*nodes+.15*hierarchy)*pow(1.-clamp((along+.007*hierarchy)*1.94,0.,1.),1.58-.36*hierarchy);
  float offset=weave*.35+.19*q.x*q.y+.019*sin(chart.x*6.28318530718)*sin(chart.y*6.28318530718);
  float thickness=rib*(.10+.16*membrane)*(1.-.72*along);
  float outline=max((across-span)*.73,abs(z-offset)-thickness),mesh=outline,aligned=outline;
  if(outline<.016){
   float u=chart.x+.095*sin(chart.y*8.)+.047*sin(chart.y*22.+chart.x*9.);
   float v=chart.y+.078*sin(chart.x*10.)-.045*sin(chart.x*26.-chart.y*14.);
   float frequency=76.*uWeaveNetwork.y;
   float warp=abs(sin((u+.32*v)*frequency+.74*sin(v*58.)));
   float weft=abs(sin((v-.42*u)*frequency*.92+.71*sin(u*49.)));
   float crossing=abs(sin((u+v)*frequency*.61+1.3*sin((u-v)*28.)));
   float width=.065+.27*membrane*(1.-smoothstep(.01,.31,across));
   mesh=max(outline,(min(min(warp,weft),crossing*1.24)-width)/frequency);
   if(alignment>0.){
    float u=chart.x,v=chart.y;
    float diagonal=.12*sin(6.6*u+3.2*v)+.25*sin(3.3*v-1.4*u);
    float jitter=.021*sin(38.*u+49.*v+phase)+.005*sin(98.*v-74.*u);
    float path=q.x*q.y*(3.5+.57*sin(6.*u+3.*v))+diagonal*.17+jitter;
    float warpPhase=frequency*path,weftPhase=frequency*(.77*path+.29*(q.x-q.y)+.045*sin(11.*u-9.*v)-jitter*.4);
    float depth=z-offset,amplitude=rib*.14;
    float section=sin(1.9*u+5.2*v+.04*weftPhase);section=.66+.34*section*section;
    float radiusFibre=(.12+.22*membrane)*section*(1.-.29*along)/frequency;
    float warpDepth=amplitude*sin(16.*u+23.*v+.08*warpPhase),weftDepth=amplitude*cos(19.*v-29.*u+.064*weftPhase);
    float warpCore=length(vec2(sin(warpPhase)/frequency,(depth-warpDepth)*.86))-radiusFibre;
    float weftCore=length(vec2(sin(weftPhase)/frequency,(depth+weftDepth)*.86))-radiusFibre*.68;
    float fineWeft=length(vec2(crossing/frequency,depth*.75))-radiusFibre*.48;
    aligned=max((across-span)*.73,min(min(warpCore,weftCore),fineWeft));
   }
  }
  distance=networkJoin(distance,mix(mesh,aligned,alignment),max(.001,rib*.17));
 }
 if((nodes<=.00001&&growth<=.00001)||z<-.16)return distance/spacing*.66;
 float variance=uStructureH.y;
 float a=cos(2.9*p.y+2.3*p.z+.16*sin(phase)),b=cos(6.2*p.y-4.*p.z);
 float c=cos(3.5*p.x-3.1*p.z+.15*cos(phase)),d=cos(7.4*p.x+5.*p.z);
 float trunkSlope=cos(2.46*p.y+1.17*p.z),trunkBend=sin(5.24*p.y-2.2*p.z);
 float crossSlope=cos(4.51*p.x+.77*p.z),crossBend=tanh(2.3*p.x);
 float sideBend=tanh(3.1*(p.x-.14));
 vec4 shear=vec4(.25-.13*release+variance*(.406*a+.465*b)+hierarchy*(.3936*trunkSlope-.23056*trunkBend),
     -.24+variance*(.5425*c+.3848*d)+hierarchy*(-.391*(1.-crossBend*crossBend)+.23452*crossSlope+.2263*(1.-sideBend*sideBend)),
     tanh(p.z*4.)*(variance*vec2(.322*a-.30*b,-.4805*c+.26*d)+hierarchy*vec2(.1872*trunkSlope+.0968*trunkBend,.04004*crossSlope)));
 float determinant=1./max(.42,1.-shear.x*shear.y);
 float lift=smoothstep(.12,.91,release),gather=smoothstep(.74,1.,release),first=lift*(.22+.7*growth*reach);
 float cupFormation=max(smoothstep(.27,.64,release),.85*smoothstep(.10,.77,uWeaveGrowth.y)*smoothstep(.09,.55,growth));
 float cupScale=mix(1.,uWeaveCupSize,cupFormation);
 float branchWeb=smoothstep(.25,.58,release)*(1.-smoothstep(.80,.98,release))*uWeaveGrowth.z*(.75+.25*hierarchy);
 for(int column=0;column<2;column++)for(int row=-1;row<2;row++){
  if(column>0&&abs(q.x)<=.29-.15*hierarchy*lift)continue;
  float localY=q.y+float(row);
  if(localY<-.63-.12*hierarchy||localY>.49+first+.35*hierarchy*(1.-lift))continue;
  float shift=float(column)*sign(q.x),localX=q.x-shift,rowId=cell.y-float(row);
  float style=fract((cell.x+shift)*.28731+rowId*.46217+floor(uSeed/.013+.5)*.071);
  float buds=1.-.92*smoothstep(.58-.15*hierarchy,1.,release)*mod(rowId,2.);
  float siteTiming=hierarchy*uStructureF.w*(1.-lift)*sin(6.28318530718*(style+.12)*1.7);
  float siteGrowth=clamp(growth+siteTiming*smoothstep(.03,.46,growth)*(1.-smoothstep(.71,1.,growth))*.72,0.,1.);
  for(int index=0;index<10;index++){
   float seq=float(index)+.5,random=fract(seq*.618033989+style),angle=seq*2.39996323+style*6.28318530718;
   float cx=cos(angle),cy=sin(angle),ring=.184*sqrt(seq/10.)*(.74+random*.38);
   float rank=index<4?.96-float(index)*.258:.08+.74*random;
   vec3 root=vec3(cx*ring*(1.-.86*lift)*(1.-.28*hierarchy)+(.028-.018*hierarchy)*sin(style*6.28318530718)*lift,
    mix(cy*ring*(1.+.91*hierarchy)+hierarchy*(.11+.11*random),mix(-.56+(.62+.32*hierarchy)*rank,-.43-.035*hierarchy,gather)+(random-.5)*.062,lift),
    mix(.059+(.026+.011*hierarchy)*random,.029+.018*random,lift));
   float height=siteGrowth*reach*(.22+.30*random);
   float lateSide=(index==4||index==5)?independent:0.;
   float emphasis=1.-(index>=4?(.77-.39*gather+hierarchy*(.20+.21*gather)-.70*lateSide)*smoothstep(.42,.79,release):0.);
   float side=index%2==0?1.:-1.,spread=mix((index==0?.12-.035*hierarchy:.22+(index==2?.119:-.011)*hierarchy)+.063*random,.082+.24*random+hierarchy*(index==2?.14:index==1?.087:-.024)+.14*lateSide,gather);
   float earlyY=mix(cy*.60,.05+(cy*.30+.29)*(.57+.52*random),hierarchy);
   float earlyX=mix(cx*.59,cx*(.54+.14*random)+.115,hierarchy);
   float limit=.37+.05*hierarchy,extent=.44+.06*hierarchy;
   float lateRank=mix(rank,index==4?.58:index==5?.48:rank,independent);
   vec3 span=vec3(clamp(mix(earlyX*height,clamp((side*spread*(.62+.38*random)+cx*.044)*(.38+.62*growth*reach),-limit,limit),lift)*emphasis*uWeaveDetail.y,-extent,extent),
    mix(earlyY*height,mix(.06+height*(.29+.32*rank),(.39+height)*(.43+(.61+.21*hierarchy)*lateRank),gather),lift)*emphasis*buds,
    mix(.015+height*.57,.015+height*.17+.018*cy+.072*lateSide*cy,lift)*buds);
   float dominant=(index==2?1.35+.51*hierarchy:index==0?1.+.52*hierarchy:1.)+.53*lateSide;
   float cap=min(.13+.054*hierarchy,(.026+.033*random)*(.28+.72*nodes)*emphasis*(1.-.37*growth*(1.-lift)+1.13*lift*dominant))*buds*(1.-.68*independent*(1.-emphasis))*cupScale;
   vec3 relative=vec3(localX,localY,z)-root;
   float bend=.115*growth*reach*cx+.08*lift*cy;
   vec3 margin=vec3(cap*(2.05+.92*hierarchy*(1.-lift))+rib*.46)+vec3((abs(bend)+abs(span.x)*hierarchy)*.25,0,0);
   vec3 bounds=max(min(vec3(0),span)-relative,relative-max(vec3(0),span))-margin;
   float bound=max(bounds.x,max(bounds.y,bounds.z));
   if(bound>0.){distance=min(distance,bound+.018);continue;}
   relative=measureShoot(relative,shear,determinant,release,hierarchy);
   span=measureShoot(span,shear,determinant,release,hierarchy);
   vec3 detail;float candidate=networkShoot(relative,span,cap,rib*buds,siteGrowth,release,uWeaveGrowth.y,float(index),bend,branchWeb*buds*emphasis,hierarchy,nodes,detail);
   if(candidate<distance){distance=candidate;weaveSurface=detail;}
  }
 }
 return distance/spacing*.66;
}
float weaveNetworkField(float field,vec3 p,float wall){
 #ifdef WEAVE_GRID_ONLY
 return gridNetworkField(field,p,wall);
 #elif defined(WEAVE_TISSUE_ONLY)
 return tissueField(field,p,wall,weaveSurface);
 #else
 // A single call site per field also keeps the mixed slider position
 // from compiling two copies of the complete grid ray intersection.
 float grid=0.,tissue=0.;vec3 detail=vec3(0.);
 if(uWeaveTension<1.)grid=gridNetworkField(field,p,wall);
 if(uWeaveTension>0.)tissue=tissueField(field,p,wall,detail);
 if(uWeaveTension>=.5)weaveSurface=detail;
 if(uWeaveTension<=0.)return grid;
 if(uWeaveTension>=1.)return tissue;
 return mix(grid,tissue,uWeaveTension);
 #endif
}
#endif
`;
