// Attachment coordinates on one repeat of the tissue. Each bud keeps its identity
// as the transverse bridges withdraw and the same bud becomes a hollow calyx.
const TAU=Math.PI*2, pitch=1.65, width=1.22;
const sat=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};
const smin=(a,b,k)=>{const t=Math.max(0,1-Math.abs(a-b)/k);return Math.min(a,b)-k*.25*t*t;};
const young=[
 [.108,-.082],[-.046,.083],[.028,.275],[-.127,-.149],[.003,-.203],
 [-.090,.053],[.111,.084],[.002,.62],[.068,.164],[-.055,-.007],[.072,-.13],[-.093,-.037],
 [-.067,.36],[.064,.39],[-.025,.45],[.047,.63],[-.064,.48],[.008,.57]
];
// (insertion height, terminal x, terminal y, relief, relative radius)
const raceme=[
 [-.28,.32,.21,.042,1.20],[.42,-.43,.69,.005,.77],[.39,.015,1.09,.045,1.02],
 [-.67,-.23,-.28,.017,1.12],[-.52,.42,-.31,-.23,.65],[.10,-.34,.34,-.26,.67],
 [-.16,.21,.64,-.28,.69],[.58,-.30,1.12,-.20,.68],
 [.39,-.09,.69,.017,.17],[-.01,.07,.17,.036,.14],[.10,.16,.28,.014,.13],[.20,-.08,.43,.054,.11]
];
const bouquet=[
 [-.70,.15,.82,.090,1.30],[-.43,-.34,.70,-.16,.86],[.14,-.15,1.35,-.015,.99],
 [-.96,-.41,-.22,.13,1.00],[-.89,.22,.38,.12,.97],[-.74,-.10,.29,-.33,.84],
 [-.43,.01,.32,-.34,.84],[.30,.04,.47,-.35,.72],
 [-.08,-.12,.39,.025,.42],[-.36,-.02,.51,-.02,.36],[-.77,.18,-.15,-.36,.62],[-.89,.09,.10,-.42,.58]
];
// Elongation is not uniform along an inflorescence. Adjacent shoots keep
// different internode lengths as the growth front travels through them.
const elongation=[
 [.04,.95,.16],[-.02,.88,-.08],[.28,.65,-.10],[-.14,.79,.12],[-.40,1.00,.095],
 [.33,.20,-.03],[.33,.49,-.11],[.34,.61,-.03],[-.08,.48,.44],[.43,.37,.57],
 [.12,.47,.08],[.11,.40,.10]
];
// Alternate axes of the lateral whorl. Long and short internodes share
// one insertion, then fork at different heights along the maturing shoot.
const whorl=[[-.54,.095],[-.39,.19],[-.17,.29],[.035,.24],[.21,.21],[.36,.15]];

const spine=(y,style)=>style*(-.164*Math.sin(y*TAU/pitch)-.081*(1-Math.cos(y*TAU/pitch)));
const fibreStretch=s=>(s.structWeavePitch??1)*(1+.65*s.structDelay*smooth(.32,.79,s.structWeaveFront)*(1-smooth(.11,.56,s.structWeaveRelease)));
// A periodic three-point centreline. The middle junction stays at zero.
// The two handles move both neighbouring arms and all attached fibres.
function curveCoefficients(s){
 const low=s.structWeaveRootBend||0,upper=s.structWeaveTipBend||0;
 return [(low+upper)/3,(upper-low)/Math.sqrt(3)];
}
const poseKeys=['seed','structWeaveRelease','structWeaveGrowth','structWeaveFront','structWeaveReach','structWeaveCup','structWeaveCupSize','structWeaveNodes','structWeaveHierarchy','structWeaveSpread','structWeaveVariation','structDelay','structFlowPhase'];
let lastSettings=[],lastPose;
export function junctionPose(s){
 if(lastPose&&poseKeys.every((key,i)=>s[key]===lastSettings[i]))return lastPose;
 const release=s.structWeaveRelease,growth=s.structWeaveGrowth,reach=s.structWeaveReach,rank=s.structWeaveHierarchy;
 const lift=smooth(.16,.69,release),gather=smooth(.73,1,release);
 const seed=(s.seed%1000)*.071,phase=s.structFlowPhase*TAU;
 const roots=[],ends=[],controls=[],profile=[],extent=[0,0,0,0];
 for(let i=0;i<young.length;i++){
  const v=(Math.sin(seed+i*8.37)*.5+.5),w=(Math.sin(seed*.61+i*4.97)*.5+.5);
  const spread=s.structWeaveSpread,variation=s.structWeaveVariation;
  const timing=(v-.5)*s.structDelay*.6;
  const [bx,by]=young[i],extra=i>=raceme.length;
  const r=extra?raceme[1]:raceme[i],b=extra?bouquet[1]:bouquet[i],internode=extra?elongation[1]:elongation[i];
  const front=s.structWeaveFront??.50,lag=(by+.12)/.99-front;
  const wave=extra?1:1-s.structDelay*(1-Math.exp(-lag*lag*16.));
  const sprout=smooth(.10,.90,sat(growth+timing*Math.sin(Math.PI*growth)))*reach*wave*(1-smooth(.09,.49,release));
  const angle=i*2.39996+.29+variation*(v-.5)*1.06;
  const gathering=extra?smooth(.06,.68,growth)*rank:0;
  const germination=s.structDelay*(front-.56)*(i===7?1.08:.78)*(1-.67*gathering);
  // Buds arise above the collar along its curved median fibre. The leading
  // bud is already near the next insertion and travels a shorter distance.
  const resting=rank*s.structDelay*smooth(.43,.74,front)*(1-smooth(.08,.83,growth));
  const axil=rank*s.structDelay*(i===7?.12:.14+.16*front)*(1-.45*gathering);
  const restY=mix(by,.018+.50*front+.064*(w-.5),gathering)+(v-.5)*.08*variation+germination+axil;
  const insertion=i===7?-.25:i===0?.15:0;
  const youngY=restY+insertion*resting;
  const youngX=spine(youngY,rank)+mix(bx*.48,bx,rank)*(1-.78*gathering)+(v-.5)*.05*variation;
  const rootY=mix(youngY,mix(r[0],b[0],gather),lift);
  const rootX=mix(youngX*.9,mix(spine(rootY,rank*(1-.46*lift)),.016*Math.sin(i*2.13)+.045*rootY,gather),lift);
  const rear=i>=5&&i<8||i>9;
  const rootZ=mix(.018+(w-.5)*.04,rear?mix(r[3],b[3],gather)*.92:mix(.012,r[3]*.29,gather),lift);
  const cohort=1-.26*rank+.26*rank*w;
  const extension=s.structDelay*smooth(.15,.97,front),lateral=extension*(2*extension-1);
  const shootX=Math.cos(angle)*(.13+.18*v)*cohort,shootY=.08+.13*w+.10*Math.sin(angle);
  const side=extra?whorl[i-raceme.length]:[shootX,shootY];
  const floretX=mix(shootX,side[0]*(.9+.19*v),gathering)*(.30+.70*spread);
  const floretY=mix(shootY,side[1]*(.86+.24*w),gathering);
  // The two leading shoots overtake the shorter ranks during elongation.
  const swell=Math.sin(Math.PI*extension),secondary=i===1;
  const matureX=b[1]+internode[0]*lateral+(secondary?.18*swell:0);
  const matureY=b[2]+internode[1]*extension+([1,3,8].includes(i)?.30*swell:0);
  // The bulb tilts out over the collar while its foot stays on the rib.
  const restLean=i===7?spine(restY-.59*resting,rank)-spine(youngY,rank)-.11*resting:
                 i===0?spine(restY,rank)-spine(youngY,rank)-.11*resting-.07*sprout:0;
  const tipX=mix(youngX+sprout*floretX+restLean,mix(r[1],matureX,gather)*(.35+.65*spread)*(.84+.16*reach),lift);
  const unroll=.14*(smooth(.60,.735,release)-.5)*(1-gather)*cohort*rank;
  const tipY=mix(youngY+sprout*(floretY-(i===0?.065:0)),rootY+(mix(r[2],matureY,gather)+unroll-rootY)*(.16+.84*growth*reach),lift);
  // Small nodules sit proud of the sheet as soon as their wall appears.
  // The crown then fans out towards the viewer while its feet stay embedded.
  const tipZ=mix(.058+.039*w+sprout*(.077+.13*w),mix(r[3],b[3],gather),lift);
  const nx=(w-.5)*.058*variation,ny=(v-.5)*.052*variation;
  const dormant=extra?1-smooth(.13,.51,release):i>=8?1-.94*lift*(1-gather):1;
  const tx=mix(rootX,tipX+nx,dormant),ty=mix(rootY,tipY+ny,dormant),tz=mix(rootZ,tipZ+.018*variation*Math.sin(phase+i)*lift,dormant);
  const budAge=mix(1-.80*s.structDelay*(1-Math.exp(-6.5*lag*lag)),1,gathering);
  const radius=(.034+.028*v)*(.16+.84*s.structWeaveNodes)*budAge;
  const matureRadius=mix(r[4],b[4]+internode[2]*extension+(secondary?.66*swell*swell:0),gather)*(.084+.016*w)*(.3+.70*s.structWeaveNodes)*s.structWeaveCupSize;
  const earlyFlare=s.structWeaveCup*smooth(.08,.69,growth);
  const prominence=extra?.63+.34*sat(sprout):i===7?1.73:1;
  const juvenileRadius=radius*prominence*(1-.10*rank*(1-gathering))*(1.06-.18*sat(sprout))*(1+.95*earlyFlare*s.structWeaveCupSize);
  const cap=mix(juvenileRadius,matureRadius,lift)*Math.sqrt(dormant);
  roots.push(rootX,rootY,rootZ,i);
  ends.push(tx,ty,tz,cap);
  const curvature=rank*.55+.16;
  controls.push(mix(mix((rootX+tx)*.5,rootX,curvature*lift),mix(tx,rootX,.32),gather)+((v-.5)*.09+.07*Math.cos(angle)) *sprout*(1-gather),
    mix(mix((rootY+ty)*.5,ty,.45*lift),mix(ty,rootY,.47),gather)+((w-.5)*.09-.062*(1-lift))*sprout*(1-gather),
    .5*(rootZ+tz)+(.018+.035*v)*sprout*(1-lift),
    1-rank*s.structDelay*(i<3?.64+.19*w:.03+.22*v));
  profile.push(.34+.64*v,Math.sin(angle),Math.cos(angle),w);
  const margin=2*cap;
  extent[0]=Math.min(extent[0],rootX-margin,tx-margin,controls[i*4]-margin);
  extent[1]=Math.min(extent[1],rootY-margin,ty-margin,controls[i*4+1]-margin);
  extent[2]=Math.max(extent[2],rootX+margin,tx+margin,controls[i*4]+margin);
  extent[3]=Math.max(extent[3],rootY+margin,ty+margin,controls[i*4+1]+margin);
 }
 lastSettings=poseKeys.map(key=>s[key]);
 return lastPose={roots:new Float32Array(roots),ends:new Float32Array(ends),controls:new Float32Array(controls),profile:new Float32Array(profile),extent};
}

export function junctionUniforms(s,u,upload){
 if(!s.structWeaveTension)return;
 const pose=junctionPose(s);
 u('uTissueExtent',pose.extent);
 u('uTissueStretch',[fibreStretch(s)]);
 u('uTissueFlare',[s.structWeaveFlare??1]);
 u('uTissueLateral',[s.structWeaveGrowth*smooth(.27,.74,s.structWeaveFront)]);
 u('uTissueRear',[s.structWeaveRearX||0,s.structWeaveRearY||0]);
 u('uTissueCurve',curveCoefficients(s));
 for(const [name,values] of [['uTissueRoot',pose.roots],['uTissueEnd',pose.ends],['uTissueBend',pose.controls],['uTissueShape',pose.profile]]){
  if(upload)upload(name,values);
  else for(let i=0;i<young.length;i++)u(name+'['+i+']',values.subarray(4*i,4*i+4));
 }
}

function chart(s,field,p,wall){
 const scale=.78+.23*Math.sqrt(s.structDensity),rear=smooth(.05,.85,-p[2]);
 const v=s.structWeaveVariation,phase=s.structFlowPhase*TAU;
 const lift=smooth(.16,.72,s.structWeaveRelease),gather=smooth(.73,1,s.structWeaveRelease);
 const height=p[1]*scale;
 const bend=(1-Math.cos(phase))*(.17*height+.068*Math.sin(2.4*height))-lift*(1-gather)*.23*height;
 const stretch=gather*s.structWeaveReach*.64;
 const tangent=(.18+.76*lift)*(1-smooth(1.29+stretch,1.70+stretch,Math.hypot(p[0],p[1])));
 const theta=rear*.60,cs=Math.cos(theta),sn=Math.sin(theta);
 const u=(cs*p[0]-sn*p[1])*scale+v*.056*Math.sin(3.7*p[1]+1.6*p[2]+.3*Math.sin(phase))+rear*(.51+(s.structWeaveRearX||0))-bend;
 const stretchV=fibreStretch(s);
 const vCoord=((sn*p[0]+cs*p[1])*scale+v*.052*Math.sin(4.2*p[0]-2.7*p[2]+.3*Math.cos(phase))+rear*(.38+(s.structWeaveRearY||0)))/stretchV-(1-lift)*.39*u;
 const [a,b]=curveCoefficients(s),angle=vCoord*TAU/pitch,cv=Math.cos(angle),sv=Math.sin(angle);
 return [u-a*(1-cv)-b*sv,vCoord,
  (field+tangent*(Math.abs(p[2])-Math.hypot(...p))+wall*.14)*scale,scale,
  (1-lift)*.39,(1-Math.cos(phase))*(.17+.1632*Math.cos(2.4*height))-lift*(1-gather)*.23,stretchV,TAU/pitch*(a*sv+b*cv)];
}

const frac=x=>x-Math.floor(x);
function pore(s,u,v,along,trans){
 const f=43*s.structWeaveFinesse,a=s.structWeaveAlignment;
 const g=f*(u*.79+v*.48+.029*Math.sin(15*v-8*u));
 const h=f*mix(v*.91-u*.21,4.6*along*trans+.20*v+.09*u,a)+.64*Math.sin(18*u+24*v);
 const i=Math.floor(g),j=Math.floor(h),n=frac(i*.36791+j*.72381+frac(i*.173+j*.413)*.57);
 const radius=.44*smooth(.53,.96,n);
 return (radius-Math.hypot((frac(g)-.5-(n-.5)*.38)*1.15,frac(h)-.5-(frac(n*5.81)-.5)*.36))/f;
}

// Arc from the lower fork of one column to the upper fork of its neighbour.
// Lifting a segment into the adjacent repeat keeps its end inside a junction.
function bridgeArc(x,y,end,height,sag){
 let t=sat((x*end+y*height)/(end*end+height*height));
 for(let n=0;n<2;n++){
  const sy=height*t-sag*Math.sin(Math.PI*t),slope=height-sag*Math.PI*Math.cos(Math.PI*t);
  t=sat(t+((x-end*t)*end+(y-sy)*slope)/(end*end+slope*slope));
 }
 return Math.hypot(x-end*t,y-height*t+sag*Math.sin(Math.PI*t));
}

function bridgeDistance(u,v,rank,startY,endY,sag){
 const startX=spine(startY,rank),height=endY-startY,end=width+spine(endY,rank)-startX;
 const x=u-startX-width*Math.round((u-startX-end*.5)/width);
 const y=v-startY-pitch*Math.round((v-startY-height*.5)/pitch);
 const nearX=x+(x>=end*.5?-width:width),nearY=y+(y>=height*.5?-pitch:pitch);
 let best=bridgeArc(x,y,end,height,sag);
 // The nearest midpoint can belong to the other side of a slanted arc.
 // Its neighbour can win at the insertions. Test it before joining the sheet.
 const gapX=Math.max(0,-nearX,nearX-end);
 const gapY=Math.max(0,Math.min(0,height)-Math.abs(sag)-nearY,nearY-Math.max(0,height)-Math.abs(sag));
 if(gapX<best)best=Math.min(best,bridgeArc(nearX,y,end,height,sag));
 if(gapY<best)best=Math.min(best,bridgeArc(x,nearY,end,height,sag));
 if(Math.max(gapX,gapY)<best)best=Math.min(best,bridgeArc(nearX,nearY,end,height,sag));
 return best;
}

// Follow one meridian from the attachment to the rim. The radius of this
// curve changes with the bud's age, so the material stays connected as it opens.
function calyx(radial,axial,cap,lift,aperture,flare,scallop){
 const wall=cap*mix(.50,.045,Math.max(lift,aperture)),mid=cap-wall;
 const cut=Math.PI-1.43*aperture,span=1-Math.cos(cut);
 const bottom=-mid*(1+.10*lift+.21*flare),top=mid*mix(-Math.cos(cut)*(1+.10*lift),.60+scallop,flare);
 const tail=mid*.77*lift*(1-aperture),h=top-bottom,zh=sat((axial-bottom+tail)/(h+tail));
 let angle=mix(Math.acos(1-zh*span),Math.min(cut,Math.atan2(radial,-axial)),.55*(1-flare));
 let best=Infinity;
 for(let j=0;j<3;j++){
  const sn=Math.sin(angle),cs=Math.cos(angle),t=(1-cs)/span,dt=sn/span;
  const radius=mid*mix(sn*(1+lift*(.07-.19*cs)),.078+1.02*t*t*(3-2*t)+.12*Math.sin(Math.PI*t),flare);
  const dr=mid*mix(cs*(1+lift*(.07-.19*cs))+.19*lift*sn*sn,(6.12*t*(1-t)+.12*Math.PI*Math.cos(Math.PI*t))*dt,flare);
  const dz=(h+2*tail*(1-t))*dt,er=radial-radius,ez=axial-(bottom+h*t-tail*(1-t)*(1-t));
  best=Math.min(best,er*er+ez*ez);
  angle=Math.max(0,Math.min(cut,angle+(er*dr+ez*dz)/Math.max(1e-12,dr*dr+dz*dz)));
 }
 const rimR=mid*mix(Math.sin(cut)*(1+lift*(.07-.19*Math.cos(cut))),1.098,flare);
 return Math.min(Math.sqrt(best),Math.hypot(radial-rimR,axial-top),Math.hypot(radial-mid*.078*flare,axial-bottom+tail))-wall;
}

function shoot(px,py,pz,pose,i,rib,lift,gather,growth,open,splay,web,rank,shear,bend,stretchV,curveSlope){
 const j=4*i,A=pose.roots,B=pose.controls,C=pose.ends,P=pose.profile;
 const ax=A[j],ay=A[j+1],az=A[j+2],ex=C[j],ey=C[j+1],ez=C[j+2],cap=C[j+3],variation=P[j];
 let vx=ex-B[j],vy=ey-B[j+1],vz=ez-B[j+2];
 const inv=1/Math.max(.0001,Math.hypot(vx,vy,vz)),face=.23*lift+.46*open*Math.max(lift,growth);
 vx=mix(vx*inv,vx*inv*.38,face);vy=mix(vy*inv,.90,face);vz=mix(vz*inv,.28+.25*variation,face);
 const norm=Math.max(.0001,Math.hypot(vx,vy,vz)),nx=vx/norm,ny=vy/norm,nz=vz/norm;
 const trim=cap*(.58*lift+.66*open*Math.max(lift,growth));
 const dx=ex-ax-trim*nx,dy=ey-ay-trim*ny,dz=ez-az-trim*nz;
 const bx=B[j]-ax,by=B[j+1]-ay,bz=B[j+2]-az;
 const kx=dx-2*bx,ky=dy-2*by,kz=dz-2*bz,rx=px-ax,ry=py-ay,rz=pz-az;
 let t=sat((rx*dx+ry*dy+rz*dz)/Math.max(.00001,dx*dx+dy*dy+dz*dz));
 vx=2*(bx+t*kx);vy=2*(by+t*ky);vz=2*(bz+t*kz);
 const ux=rx-t*(2*bx+t*kx),uy=ry-t*(2*by+t*ky),uz=rz-t*(2*bz+t*kz);
 t=sat(t+(ux*vx+uy*vy+uz*vz)/Math.max(.00006,vx*vx+vy*vy+vz*vz-2*(ux*kx+uy*ky+uz*kz)));
 let x=rx-t*(2*bx+t*kx),y=ry-t*(2*by+t*ky);
 const z=rz-t*(2*bz+t*kz);
 x+=curveSlope*y;y=(y+shear*x)*stretchV;x+=bend*y;
 const foot=1-t,thin=mix(.35,.115+.030*variation,gather);
 const taper=1-.48*growth*(1-lift)*smooth(.12,1,t);
 const stemRadius=rib*(thin+(.33+.62*growth*(1-lift))*foot*foot*(1-gather)+.28*growth*(1-lift))*taper+
  cap*(.046+.10*growth*(1-lift)+lift*(.27*(1-open)*Math.pow(t,5)+.16*open*t*t*t));
 let branch=Math.hypot(x,y,z)-stemRadius;
 const buds=(1-smooth(.02,.50,lift))*growth;
 if((i<8||i>=raceme.length)&&buds>.12&&t>.20){
  for(let fork=0;fork<2;fork++){
   const along=.45+.12*P[j+3]+.28*fork,jx=rx-along*(2*bx+along*kx),jy=ry-along*(2*by+along*ky),jz=rz-along*(2*bz+along*kz);
   const scale=buds*(.079+.061*variation)*(1-.40*fork),tx=scale*(P[j+1]-.3*P[j+2])*(1-1.78*fork),ty=scale*(.85+.39*P[j+2]),tz=scale*(.38+.17*fork);
   const u=sat((jx*tx+jy*ty+jz*tz)/Math.max(.00001,tx*tx+ty*ty+tz*tz));
   const knob=cap*(.65-.13*fork)*buds;
   const twig=Math.hypot(jx-tx*u,jy-ty*u,jz-tz*u)-knob*(.94-.33*u);
   branch=smin(branch,Math.min(twig,Math.hypot(jx-tx,jy-ty,jz-tz)-knob),cap*.52+.0001);
  }
 }
 const preX=px-ex+curveSlope*(py-ey),yy=(py-ey+shear*preX)*stretchV,xx=preX+bend*yy,zz=pz-ez,axial=xx*nx+yy*ny+zz*nz;
 const length=Math.hypot(xx,yy,zz),radial=Math.sqrt(Math.max(0,length*length-axial*axial));
 const aperture=open*smooth(.045,.43,growth)*B[j+3],flare=splay*smooth(.24,.86,aperture);
 let cup=length-cap;
 if(lift+aperture>.0001){
  if(length>2.5*cap)cup=length-2.0*cap;
  else{
   const tang=Math.hypot(ny,nz),angle=tang>.0001?Math.atan2((yy*nz-zz*ny)/tang,(xx-axial*nx)/tang):0;
   const lobes=Math.cos(2*angle-variation)+.45*Math.sin(3*angle+variation*5);
   const lip=.21*Math.sin(3*angle+variation*5)+.15*Math.cos(2*angle-variation);
   cup=calyx(radial/(1+.14*flare*lobes),axial,cap,lift,aperture,flare,lip);
  }
 }
 branch=smin(branch,cup,Math.max(.0006,cap*(.29+.23*lift)*(1-.68*aperture)));
 if(web>.0001&&lift>.01&&gather<.999&&Math.abs(dx)>.04&&dy>.08&&py>ay&&py<ey){
  const u=sat((py-ay)/(by+Math.sqrt(Math.max(.0000001,by*by+ky*(py-ay))))),centre=ax+u*(2*bx+u*kx),main=spine(py,rank*(1-.46*lift));
  const between=sat((px-main)/(centre-main||.0001));
  const arch=Math.max(0,Math.sin(Math.PI*u))*(1-smooth(.49,.93,u))*(1-smooth(.045,.19,Math.abs(az)));
  const radiusA=rib*.66*(1-gather),radiusB=stemRadius;
  const sideA=Math.abs(px-main)-radiusA,sideB=Math.abs(px-centre)-radiusB;
  const tension=web*lift*(1-gather)*(.092+.034*variation)*arch;
  const plane=.5*(sideA+sideB-Math.hypot(sideA-sideB,2*tension));
  const depth=az+between*u*(2*bz+u*kz)+.025*Math.sin(between*Math.PI)*Math.sin(u*Math.PI);
  // A lenticular cross-section rounds the web continuously into either
  // stalk. A plane of constant thickness left a rectangular highlight.
  const membrane=4*between*(1-between),height=rib*arch*(1-gather)*web;
  const skin=-smin(-plane,-(Math.abs(pz-depth)-height*(.15+.19*(1-membrane))),Math.max(.0001,height*.23));
  const bound=Math.abs(px-(main+centre)*.5)-.5*Math.abs(centre-main);
  if(arch>.0001)branch=smin(branch,Math.max(skin,bound),Math.max(.0001,rib*.42*arch*(1-gather)*web));
 }
 return branch;
}

export function junctionField(s,field,p,wall){
 const [u,v,z,k,shear,chartBend,stretchV,curveSlope]=chart(s,field,p,wall),outside=Math.max(-.52-z,z-.48);
 if(outside>.03)return outside/k*.63;
 const web=s.structWeaveMembrane,rank=s.structWeaveHierarchy,release=s.structWeaveRelease,growth=s.structWeaveGrowth;
 const lift=smooth(.16,.69,release),gather=smooth(.73,1,release);
 const rear=1-(.23+.19*lift)*rank*smooth(.14,.88,-p[2]);
 const stride=pitch*(1+1.15*gather),strideX=width*(1+.82*gather),rib=wall*k*(.22+.56*s.structThreadWidth)*rear;
 const x=u-strideX*Math.round(u/strideX),y=v-stride*Math.floor((v+.48)/stride);
 const stem=u-spine(y,rank*(1-.46*lift)),along=stem-width*Math.round(stem/width);
 const longitudinal=1-smooth(.69,.97,release),bridges=1-smooth(.12,.65,release);
 const upper=.37+.18*rank;
 // Two distinct insertions on opposite sides prevent a four-way crossing.
 // A slender third arm develops above the advancing germination front.
 const lateral=growth*smooth(.27,.74,s.structWeaveFront);
 let trans=10000;
 if(bridges>0){
  trans=Math.min(bridgeDistance(u,v,rank,.09*rank,-.10*rank,-.07),bridgeDistance(u,v,rank,1.07,upper,.105));
  if(lateral>.001)trans=Math.min(trans,bridgeDistance(u,v,rank,upper-.20,pitch+upper,-.16)/(.28+.72*lateral)+.14*(1-lateral));
 }
 const warp=s.structWeave*.45*Math.cos(Math.PI*u/width)*Math.cos(Math.PI*v/pitch);
 const weld=bridges*web;
 let fieldD=longitudinal>0?Math.hypot(along*.92,z-warp)-rib*(.84+.33*rank)*(1-.42*weld)*longitudinal:10000;
 if(bridges>0){
  const secondary=Math.hypot(trans,z+warp)-rib*.63*(1-.29*weld)*bridges;
  fieldD=smin(fieldD,secondary,(.003+rib*.75)*bridges);
 }
 if(bridges*web>.0001){
  const sideA=Math.abs(along)*.91-rib*.51*longitudinal,sideB=trans-rib*.33*bridges;
  const coupling=bridges*web*(.082+.063*rank)*rear;
  const edge=.5*(sideA+sideB-Math.hypot(sideA-sideB,2*coupling));
  const depth=warp*.3+.017*Math.sin(6*u+2*v)*Math.sin(4*v);
  const nearest=Math.min(Math.abs(along),trans),core=Math.exp(-nearest*nearest/(rib*rib*8));
  const skin=Math.max(edge,Math.abs(z-depth)-rib*(.079+.095*web+.45*core)*bridges);
  const poreEdge=web*.25/(43*s.structWeaveFinesse);
  const sheet=skin<.013?Math.max(skin,pore(s,u,v,Math.abs(along),trans)-poreEdge-Math.max(0,rib*1.36-Math.min(Math.abs(along),trans))):skin;
  fieldD=smin(fieldD,sheet,.001+rib*.62*bridges);
  if(edge>-.013&&edge<.066&&Math.abs(z-depth)<.037){
   const f=58*s.structWeaveFinesse,dir=s.structWeaveAlignment;
   const path=4.5*Math.abs(along)*trans+.16*v+.07*u+.013*Math.sin(12*u-16*v)+.004*Math.sin(35*u+29*v);
   const bundle=Math.round(path*f);
   for(let j=-1;j<=1;j++){
    const id=bundle+j,seed=frac(id*.7843+frac(id*.319)*.48),theta=id*3.91+u*(9+10*seed)+v*(17-9*seed);
    const strandU=path-(id+.51*(seed-.5))/f-(.005+.002*(1-dir))*Math.sin(theta*1.6)+.0025*Math.cos(theta*3.1);
    const strandZ=z-depth-.012*Math.sin(theta*.77+id);
    const span=.001+.010*web*(.5+.5*Math.sin(theta*.65+id*2.8));
    fieldD=Math.min(fieldD,Math.max(Math.hypot(strandU,strandZ)-(.0008+.0010*dir)*bridges,edge-span));
   }
  }
 }
 const pose=junctionPose(s);
 const padding=rib*.88+(.10+.26*lift*(1-gather))*web;
 let emptyBound=10000;
 if(s.structWeaveNodes>0||growth>0)for(let row=-1;row<=1;row++)for(let col=-1;col<=1;col++){
  const py=y+row*stride,px=x+col*strideX,extent=pose.extent;
  const boundary=Math.max(extent[0]-px,extent[1]-py,px-extent[2],py-extent[3])-padding;
  if(boundary>0){emptyBound=Math.min(emptyBound,boundary+.012);continue;}
  for(let i=0;i<young.length;i++){
   const j=i*4,A=pose.roots,B=pose.controls,C=pose.ends;
   if(C[j+3]<.0001)continue;
   const margin=C[j+3]*2+padding;
   const bounds=Math.max(Math.min(A[j],B[j],C[j])-px,px-Math.max(A[j],B[j],C[j]),
    Math.min(A[j+1],B[j+1],C[j+1])-py,py-Math.max(A[j+1],B[j+1],C[j+1]),
    Math.min(A[j+2],B[j+2],C[j+2])-z,z-Math.max(A[j+2],B[j+2],C[j+2]))-margin;
   if(bounds>0){emptyBound=Math.min(emptyBound,bounds+.012);continue;}
   const member=shoot(px,py,z,pose,i,rib,lift,gather,growth,s.structWeaveCup,s.structWeaveFlare??1,web,rank,shear,chartBend,stretchV,curveSlope);
   const weld=(.004+.47*C[j+3])*web*(1-.93*gather);
   fieldD=smin(fieldD,member,Math.max(.0001,weld));
  }
 }
 return Math.min(fieldD,emptyBound)/k*.65;
}

export const JUNCTION_GLSL=`
uniform float uWeaveTension,uTissueStretch,uTissueFlare,uTissueLateral;
uniform vec2 uTissueCurve,uTissueRear;
float tissueSpine(float y){
 float angle=y*(6.28318530718/1.65);
 return uWeaveDetail.x*(-.164*sin(angle)-.081*(1.-cos(angle)));
}
vec2 tissueChart(vec3 p,float k){
 float rear=smoothstep(.05,.85,-p.z),phase=uStructureF.z*6.28318530718;
 float lift=smoothstep(.16,.72,uWeaveNetwork.z),gather=smoothstep(.73,1.,uWeaveNetwork.z);
 float height=p.y*k,bend=(1.-cos(phase))*(.17*height+.068*sin(2.4*height))-lift*(1.-gather)*.23*height;
 float angle=rear*.60,cs=cos(angle),sn=sin(angle);
 vec2 uv=mat2(cs,sn,-sn,cs)*p.xy*k+uStructureH.y*vec2(.056*sin(3.7*p.y+1.6*p.z+.3*sin(phase)),.052*sin(4.2*p.x-2.7*p.z+.3*cos(phase)))+rear*(vec2(.51,.38)+uTissueRear)-vec2(bend,0.);
 uv.y=uv.y/max(.01,uTissueStretch)-(1.-lift)*.39*uv.x;
 float a=uv.y*(6.28318530718/1.65);uv.x-=dot(uTissueCurve,vec2(1.-cos(a),sin(a)));return uv;
}
float tissuePore(vec2 uv,float along,float trans){
 float f=43.*uWeaveNetwork.y;
 vec2 coords=vec2(f*(dot(uv,vec2(.79,.48))+.029*sin(15.*uv.y-8.*uv.x)),
     f*mix(uv.y*.91-uv.x*.21,4.6*along*trans+.20*uv.y+.09*uv.x,uWeaveDetail.z)+.64*sin(dot(uv,vec2(18.,24.))));
 vec2 id=floor(coords);
 float n=fract(dot(id,vec2(.36791,.72381))+fract(dot(id,vec2(.173,.413)))*.57);
 vec2 d=fract(coords)-.5-(vec2(n,fract(n*5.81))-.5)*vec2(.38,.36);
 float radius=.44*smoothstep(.53,.96,n);
 return (radius-length(d*vec2(1.15,1.)))/f;
}
float tissueArc(vec2 q,vec2 span,float sag){
 float end=span.x,h=span.y;
 float t=clamp(dot(q,span)/dot(span,span),0.,1.);
 for(int i=0;i<2;i++){
  float sy=h*t-sag*sin(3.14159265*t),slope=h-sag*3.14159265*cos(3.14159265*t);
  t=clamp(t+dot(q-vec2(end*t,sy),vec2(end,slope))/(end*end+slope*slope),0.,1.);
 }
 return length(q-span*t+vec2(0.,sag*sin(3.14159265*t)));
}
float tissueBridgeDistance(vec2 uv,float startY,float endY,float sag){
 float startX=tissueSpine(startY),h=endY-startY;
 vec2 span=vec2(1.22+tissueSpine(endY)-startX,h),pitch=vec2(1.22,1.65);
 vec2 q=uv-vec2(startX,startY);q-=pitch*floor((q-span*.5)/pitch+.5);
 vec2 adjacent=q+pitch*(1.-2.*step(span*.5,q));
 float best=tissueArc(q,span,sag);
 float gapX=max(-adjacent.x,adjacent.x-span.x);
 float gapY=max(min(0.,h)-adjacent.y,adjacent.y-max(0.,h))-abs(sag);
 if(gapX<best)best=min(best,tissueArc(vec2(adjacent.x,q.y),span,sag));
 if(gapY<best)best=min(best,tissueArc(vec2(q.x,adjacent.y),span,sag));
 if(max(gapX,gapY)<best)best=min(best,tissueArc(adjacent,span,sag));
 return best;
}
float tissueTransverse(vec2 uv){
 float rank=uWeaveDetail.x,upper=.37+.18*rank;
 float d=min(tissueBridgeDistance(uv,.09*rank,-.10*rank,-.07),tissueBridgeDistance(uv,1.07,upper,.105));
 if(uTissueLateral>.001)d=min(d,tissueBridgeDistance(uv,upper-.20,1.65+upper,-.16)/(.28+.72*uTissueLateral)+.14*(1.-uTissueLateral));
 return d;
}
// Distance to a boundary between two jittered fibre bundles. Cell identity
// lives on the tissue, so subpixel threads do not change seed when it moves.
float tissueLace(vec2 uv,float footprint){
 vec2 id=floor(uv),local=fract(uv);
 float first=8.,second=8.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 n=vec2(x,y),j=id+n;
  vec2 random=fract(sin(vec2(dot(j,vec2(37.15,19.27)),dot(j,vec2(13.71,41.23))))*19751.39);
  vec2 offset=n+.08+.84*random-local;
  float d=dot(offset,offset);second=min(second,max(first,d));first=min(first,d);
 }
 return 1.-smoothstep(.018,.10+footprint,(sqrt(second)-sqrt(first)));
}
#ifdef WEAVE_DETAIL
uniform vec4 uTissueRoot[${young.length}],uTissueBend[${young.length}],uTissueEnd[${young.length}],uTissueShape[${young.length}];
uniform vec4 uTissueExtent;
float tissueCalyx(float radial,float axial,float cap,float lift,float aperture,float flare,float scallop,out float height){
 float wall=cap*mix(.50,.045,max(lift,aperture)),mid=cap-wall;
 float cut=3.14159265-1.43*aperture,span=1.-cos(cut);
 float bottom=-mid*(1.+.10*lift+.21*flare),top=mid*mix(-cos(cut)*(1.+.10*lift),.60+scallop,flare);
 float tail=mid*.77*lift*(1.-aperture),h=top-bottom; height=clamp((axial-bottom+tail)/(h+tail),0.,1.);
 float a=mix(acos(clamp(1.-height*span,-1.,1.)),min(cut,atan(max(1.e-10,radial),-axial)),.55*(1.-flare)),best=10000.;
 for(int j=0;j<3;j++){
  float sn=sin(a),cs=cos(a),t=(1.-cs)/span,dt=sn/span;
  float radius=mid*mix(sn*(1.+lift*(.07-.19*cs)),.078+1.02*t*t*(3.-2.*t)+.12*sin(3.14159265*t),flare);
  float dr=mid*mix(cs*(1.+lift*(.07-.19*cs))+.19*lift*sn*sn,(6.12*t*(1.-t)+.12*3.14159265*cos(3.14159265*t))*dt,flare);
  vec2 tangent=vec2(dr,(h+2.*tail*(1.-t))*dt),offset=vec2(radial-radius,axial-bottom-h*t+tail*(1.-t)*(1.-t));
  best=min(best,dot(offset,offset));a=clamp(a+dot(offset,tangent)/max(1.e-12,dot(tangent,tangent)),0.,cut);
 }
 float rimR=mid*mix(sin(cut)*(1.+lift*(.07-.19*cos(cut))),1.098,flare);
 return min(sqrt(best),min(length(vec2(radial-rimR,axial-top)),length(vec2(radial-mid*.078*flare,axial-bottom+tail))))-wall;
}
float tissueShoot(vec3 q,vec3 A,vec4 handle,vec3 C,vec4 profile,float index,float cap,float rib,float lift,float gather,float growth,float open,float web,vec3 shear,out vec3 detail){
 vec3 B=handle.xyz;
 vec3 axis=(C-B)/max(.0001,length(C-B));
 float face=.23*lift+.46*open*max(lift,growth);
 axis=mix(axis,vec3(axis.x*.38,.90,.28+.25*profile.x),face);axis/=max(.0001,length(axis));
 float trim=cap*(.58*lift+.66*open*max(lift,growth));
 vec3 delta=C-A-trim*axis,b=B-A,k=delta-2.*b,r=q-A;
 float t=clamp(dot(r,delta)/max(.00001,dot(delta,delta)),0.,1.);
 vec3 slope=2.*(b+t*k),error=r-t*(2.*b+t*k);
 t=clamp(t+dot(error,slope)/max(.00006,dot(slope,slope)-2.*dot(error,k)),0.,1.);
 vec3 offset=r-t*(2.*b+t*k);
 offset.x+=shear.z*offset.y;offset.y=(offset.y+shear.x*offset.x)*uTissueStretch;offset.x+=shear.y*offset.y;
 float foot=1.-t,thin=mix(.35,.115+.030*profile.x,gather);
 float taper=1.-.48*growth*(1.-lift)*smoothstep(.12,1.,t);
 float radius=rib*(thin+(.33+.62*growth*(1.-lift))*foot*foot*(1.-gather)+.28*growth*(1.-lift))*taper+cap*(.046+.10*growth*(1.-lift)+lift*(.27*(1.-open)*pow(t,5.)+.16*open*t*t*t));
 float branch=length(offset)-radius,buds=(1.-smoothstep(.02,.50,lift))*growth;
 if((index<8.||index>=12.)&&buds>.12&&t>.20){
  for(int f=0;f<2;f++){
   float fork=float(f),along=.45+.12*profile.w+.28*fork,scale=buds*(.079+.061*profile.x)*(1.-.40*fork);
   vec3 j=r-along*(2.*b+along*k),twig=scale*vec3((profile.y-.3*profile.z)*(1.-1.78*fork),.85+.39*profile.z,.38+.17*fork);
   float u=clamp(dot(j,twig)/max(.00001,dot(twig,twig)),0.,1.),knob=cap*(.65-.13*fork)*buds;
   float d=length(j-twig*u)-knob*(.94-.33*u);
   branch=networkJoin(branch,min(d,length(j-twig)-knob),cap*.52+.0001);
  }
 }
 vec3 tip=q-C;tip.x+=shear.z*tip.y;tip.y=(tip.y+shear.x*tip.x)*uTissueStretch;tip.x+=shear.y*tip.y;
 float axial=dot(tip,axis),radial=sqrt(max(0.,dot(tip,tip)-axial*axial));
 float aperture=open*smoothstep(.045,.43,growth)*handle.w,flare=uTissueFlare*smoothstep(.24,.86,aperture);
 float theta=0.,cupT=clamp(.5+.5*axial/cap,0.,1.),len=length(tip),cup=len-cap;
 if(lift+aperture>.0001){
  if(len>2.5*cap)cup=len-2.*cap;
  else{
   float tang=length(axis.yz);
   theta=tang>.0001?atan((tip.y*axis.z-tip.z*axis.y)/tang,(tip.x-axial*axis.x)/tang):0.;
   float lobes=cos(2.*theta-profile.x)+.45*sin(3.*theta+profile.x*5.);
   float lip=.21*sin(3.*theta+profile.x*5.)+.15*cos(2.*theta-profile.x);
   cup=tissueCalyx(radial/(1.+.14*flare*lobes),axial,cap,lift,aperture,flare,lip,cupT);
  }
 }
 detail=vec3(2.,t,0.);
 #ifdef WEAVE_HIT_TAG
 if(weaveEvaluateMaterial){
  vec3 localTangent=b+t*k;
  localTangent.x+=shear.z*localTangent.y;localTangent.y=(localTangent.y+shear.x*localTangent.x)*uTissueStretch;localTangent.x+=shear.y*localTangent.y;
  vec3 tangent=localTangent/max(1.e-7,length(localTangent));
  vec3 right=vec3(tangent.y,-tangent.x,0.);right/=max(1.e-7,length(right));
  detail.z=fract(atan(dot(offset,cross(right,tangent)),dot(offset,right))/6.2831853+1.);
 }
 if(weaveEvaluateMaterial&&length(tip)<2.65*cap){
  float terminal=smoothstep(-2.5*cap,-.94*cap,axial)*(1.-smoothstep(1.44*cap,2.16*cap,radial));
  detail=vec3(2.+floor(12.*terminal+.5),cupT,fract(theta/6.28318530718+1.));
 }
 #endif
 branch=networkJoin(branch,cup,max(.0006,cap*(.29+.23*lift)*(1.-.68*aperture)));
 if(web>.0001&&lift>.01&&gather<.999&&abs(delta.x)>.04&&delta.y>.08&&q.y>A.y&&q.y<C.y){
  float u=clamp((q.y-A.y)/(b.y+sqrt(max(.0000001,b.y*b.y+k.y*(q.y-A.y)))),0.,1.),centre=A.x+u*(2.*b.x+u*k.x),main=tissueSpine(q.y)*(1.-.46*lift);
  float between=clamp((q.x-main)/(centre==main?.0001:centre-main),0.,1.);
  float lineZ=A.z+u*(2.*b.z+u*k.z),arch=max(0.,sin(3.14159265*u))*(1.-smoothstep(.49,.93,u))*(1.-smoothstep(.045,.19,abs(A.z)));
  float sideA=abs(q.x-main)-rib*.66*(1.-gather),sideB=abs(q.x-centre)-radius;
  float tension=web*lift*(1.-gather)*(.092+.034*profile.x)*arch;
  float plane=.5*(sideA+sideB-length(vec2(sideA-sideB,2.*tension)));
  float depth=mix(A.z,lineZ,between)+.025*sin(between*3.14159265)*sin(u*3.14159265);
  float membrane=4.*between*(1.-between),height=rib*arch*(1.-gather)*web;
  float skin=-networkJoin(-plane,-(abs(q.z-depth)-height*(.15+.19*(1.-membrane))),max(.0001,height*.23));
  float bound=abs(q.x-(main+centre)*.5)-.5*abs(centre-main);
  float sheet=max(skin,bound);
  if(arch>.0001){
   #ifdef WEAVE_HIT_TAG
   if(weaveEvaluateMaterial){
    float fillet=max(.001,rib*(.40+.60*arch));
    float coating=(1.-smoothstep(-fillet,fillet,sheet-branch))*arch*web*(1.-gather);
    if(coating>.002&&detail.x<2.5)detail=vec3(0.,coating,u);
   }
   #endif
   branch=networkJoin(branch,sheet,max(.0001,rib*.42*arch*(1.-gather)*web));
  }
 }
 return branch;
}
float tissueField(float field,vec3 p,float wall,out vec3 tag){
 const float pitch=1.65,width=1.22;
 float k=.78+.23*sqrt(uStructureB.x);
 float release=uWeaveNetwork.z,gather=smoothstep(.73,1.,release),rising=smoothstep(.16,.72,release),stretch=gather*uWeaveNetwork.w*.64;
 float tangent=(.18+.76*rising)*(1.-smoothstep(1.29+stretch,1.70+stretch,length(p.xy)));
 float z=(field+tangent*(abs(p.z)-length(p))+wall*.14)*k,outside=max(-.52-z,z-.48);
 tag=vec3(2.,0.,0.);
 if(outside>.03)return outside/k*.63;
 vec2 uv=tissueChart(p,k);
 float web=uWeaveGrowth.z,rank=uWeaveDetail.x,growth=uWeaveGrowth.x;
 float lift=smoothstep(.16,.69,release),phase=uStructureF.z*6.28318530718;
 float curveAngle=uv.y*(6.28318530718/1.65);
 vec3 shear=vec3((1.-rising)*.39,(1.-cos(phase))*(.17+.1632*cos(2.4*p.y*k))-rising*(1.-gather)*.23,
    (6.28318530718/1.65)*dot(uTissueCurve,vec2(sin(curveAngle),cos(curveAngle))));
 float rear=1.-(.23+.19*lift)*rank*smoothstep(.14,.88,-p.z);
 float rib=wall*k*(.22+.56*uStructureB.y)*rear;
 float stride=pitch*(1.+1.15*gather),strideX=width*(1.+.82*gather);
 float x=uv.x-floor(uv.x/strideX+.5)*strideX,y=uv.y-floor((uv.y+.48)/stride)*stride,along=mod(uv.x-tissueSpine(y)*(1.-.46*lift)+width*.5,width)-width*.5;
 float longitudinal=1.-smoothstep(.69,.97,release),bridges=1.-smoothstep(.12,.65,release);
 float angle=6.28318530718*uv.x/width,wave=sin(angle);
 float bend=(.030+.012*rank)*wave+.023*uStructureH.y*sin(6.*uv.x)+.081*(1.-cos(angle))*(.55-.45*wave)*rank;
 float crossing=mod(uv.y-bend+.5*pitch,pitch)-.5*pitch;
 float trans=bridges>0.?tissueTransverse(uv):10000.;
 float warp=uStructureB.z*.45*cos(3.14159265*uv.x/width)*cos(3.14159265*uv.y/pitch);
 float weld=bridges*web;
 float d=longitudinal>0.?length(vec2(along*.92,z-warp))-rib*(.84+.33*rank)*(1.-.42*weld)*longitudinal:10000.;
 #ifdef WEAVE_HIT_TAG
 if(weaveEvaluateMaterial)tag=vec3(2.,fract(uv.y/pitch+.5),fract(atan(z-warp,along*.92)/6.2831853+1.));
 #endif
 if(bridges>0.){
  float secondary=length(vec2(trans,z+warp))-rib*.63*(1.-.29*weld)*bridges;
  #ifdef WEAVE_HIT_TAG
  if(weaveEvaluateMaterial&&secondary<d)tag=vec3(2.,fract(uv.x/width+.5),fract(atan(z+warp,crossing)/6.2831853+1.));
  #endif
  d=networkJoin(d,secondary,(.003+rib*.75)*bridges);
 }
 if(bridges*web>.0001){
  float sideA=abs(along)*.91-rib*.51*longitudinal,sideB=trans-rib*.33*bridges,coupling=bridges*web*(.082+.063*rank)*rear;
  float edge=.5*(sideA+sideB-length(vec2(sideA-sideB,2.*coupling)));
  float depth=warp*.3+.017*sin(6.*uv.x+2.*uv.y)*sin(4.*uv.y);
  float reach=min(abs(along),trans),core=exp(-reach*reach/(rib*rib*8.));
  float sheet=max(edge,abs(z-depth)-rib*(.079+.095*web+.45*core)*bridges);
  float poreEdge=web*.25/(43.*uWeaveNetwork.y);
  if(sheet<.013)sheet=max(sheet,tissuePore(uv,abs(along),trans)-poreEdge-max(0.,rib*1.36-min(abs(along),trans)));
  if(sheet<d+rib*.25)tag=vec3(1.,clamp(min(abs(along),trans)/max(.001,rib*2.),0.,1.),0.);
  d=networkJoin(d,sheet,.001+rib*.62*bridges);
  if(edge>-.013&&edge<.066&&abs(z-depth)<.037){
   float f=58.*uWeaveNetwork.y,dir=uWeaveDetail.z;
   float path=4.5*abs(along)*trans+.16*uv.y+.07*uv.x+.013*sin(dot(uv,vec2(12.,-16.)))+.004*sin(dot(uv,vec2(35.,29.)));
   float bundle=floor(path*f+.5);
   for(int j=-1;j<=1;j++){
    float id=bundle+float(j),seed=fract(id*.7843+fract(id*.319)*.48),theta=id*3.91+dot(uv,vec2(9.+10.*seed,17.-9.*seed));
    float strandU=path-(id+.51*(seed-.5))/f-(.005+.002*(1.-dir))*sin(theta*1.6)+.0025*cos(theta*3.1);
    float strandZ=z-depth-.012*sin(theta*.77+id);
    float span=.001+.010*web*(.5+.5*sin(theta*.65+id*2.8));
    float loose=max(length(vec2(strandU,strandZ))-(.0008+.0010*dir)*bridges,edge-span);
    if(loose<d){d=loose;tag=vec3(1.,.94,.73);}
   }
  }
 }
 float padding=rib*.88+(.10+.26*lift*(1.-gather))*web;
 float emptyBound=10000.;
 if(uStructureH.z>0.||growth>0.)for(int row=-1;row<=1;row++)for(int col=-1;col<=1;col++){
  vec3 q=vec3(x+float(col)*strideX,y+float(row)*stride,z);
  vec2 boxDistance=max(uTissueExtent.xy-q.xy,q.xy-uTissueExtent.zw);
  float boundary=max(boxDistance.x,boxDistance.y)-padding;
  if(boundary>0.){emptyBound=min(emptyBound,boundary+.012);continue;}
  for(int i=0;i<${young.length};i++){
   vec3 A=uTissueRoot[i].xyz,B=uTissueBend[i].xyz,C=uTissueEnd[i].xyz;
   float cap=uTissueEnd[i].w;
   if(cap<.0001)continue;
   float margin=cap*2.+padding;
   vec3 box=max(min(min(A,B),C)-q,q-max(max(A,B),C));
   float bound=max(box.x,max(box.y,box.z))-margin;
   if(bound>0.){emptyBound=min(emptyBound,bound+.012);continue;}
   vec3 detail;
   float branch=tissueShoot(q,A,uTissueBend[i],C,uTissueShape[i],float(i),cap,rib,lift,gather,growth,uWeaveGrowth.y,web,shear,detail);
   if(branch<d)tag=detail;
   float joinWidth=(.004+.47*cap)*web*(1.-.93*gather);
   d=networkJoin(d,branch,max(.0001,joinWidth));
  }
 }
 return min(d,emptyBound)/k*.65;
}
#endif
`;
