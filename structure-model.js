import {FAN_COMPONENT_GLSL} from './implicit-fan-geometry.js?v=de5c2d2312c1';
import {FILAMENT_DEFAULTS,FILAMENT_META,FILAMENT_TRACKS,filamentPanel} from './filament-model.js?v=de5c2d2312c1';
import {WEAVE_NETWORK_GLSL,weaveNetworkField} from './weave-network.js?v=de5c2d2312c1';
import {hasMotionPoints} from './motion-keyframes.js?v=de5c2d2312c1';
// Composable properties of the existing implicit form. Zero amounts are identity.
export const STRUCTURE_DEFAULTS={
 ...FILAMENT_DEFAULTS,
 loopAmount:0,loopKnot:0,loopTurns:3,loopRadius:.8,loopTube:.22,loopFlat:0,loopTwist:0,loopWave:0,loopPhase:0,loopBands:0,loopBandCount:6,loopBandAxis:0,
 structShell:0,structThickness:.09,structFibres:0,structWeft:0,structDensity:20,structThreadWidth:.32,structWeave:0,structWeaveVariation:0,structWeaveNodes:0,structWeaveMembrane:0,structWeaveGrowth:0,structWeaveCup:.65,
 structWeaveBranching:0,structWeaveFinesse:1,structWeaveRelease:0,structWeaveReach:1,
 structSlices:0,structSliceCount:6,structSliceWidth:.24,structRadial:0,structFan:0,structFanBias:0,structPetalCount:8,structPetalWidth:.45,
 structLayers:0,structLayerCount:3,structLayerWidth:.22,
 structGrowth:0,structCurl:0,structFold:0,structFoldCount:5,structBreath:0,structFlap:0,structFlowPhase:0,structDelay:.35,
 structScallop:0,structSpiral:0,structStagger:0,structRuffle:0,structTaper:0,
 structCoreDark:0,structCoreRadius:.3
};
export const STRUCTURE_META={
 ...FILAMENT_META,
 loopBands:['Intensità fasce',0,1,.01],loopBandCount:['Ripetizioni delle fasce',1,36,1],loopBandAxis:['Orientamento delle fasce',0,1,.01],
 loopAmount:['Apertura ad anello',0,1,.01],loopKnot:['Intreccio del nodo',0,1,.01],loopRadius:['Raggio del percorso',.38,1.6,.01],loopTube:['Spessore del tubo',.06,.6,.005],loopFlat:['Appiattimento a nastro',0,1,.01],loopTwist:['Torsione del nastro',-2,2,.01],loopWave:['Variazione di spessore',0,.35,.005],loopPhase:['Scorrimento',0,1,.001],
 loopTurns:['Avvolgimenti del nodo',3,11,2],
 structShell:['Svuotamento · pieno → membrana',0,1,.01],structThickness:['Spessore della membrana',.005,.4,.001],
 structFibres:['Separazione in fibre',0,1,.01],structWeft:['Fili trasversali · tessitura',0,1,.01],structDensity:['Fili intorno alla forma',3,256,1],structThreadWidth:['Larghezza dei fili',.15,.9,.01],structWeave:['Intreccio sopra / sotto',0,.16,.005],
 structWeaveVariation:['Irregolarità del reticolo',0,1,.01],structWeaveNodes:['Rilievo alle giunzioni',0,1,.01],structWeaveMembrane:['Membrana fra i rami',0,1,.01],structWeaveGrowth:['Crescita degli steli',0,1,.01],structWeaveCup:['Apertura delle coppe',0,1,.01],
 structWeaveBranching:['Ramificazione del reticolo',0,1,.01],structWeaveFinesse:['Densità delle microfibre',.35,2.4,.01],
 structWeaveRelease:['Ritiro dei ponti',0,1,.01],structWeaveReach:['Lunghezza degli steli',.35,1.45,.01],
 structSlices:['Separazione in lamelle',0,1,.01],structSliceCount:['Numero di lamelle',2,12,1],structSliceWidth:['Spessore relativo delle lamelle',.12,.85,.01],structFan:['Lamine curve',0,1,.01],structFanBias:['Apertura in due direzioni',0,1,.01],
 structRadial:['Separazione radiale',0,1,.01],structPetalCount:['Divisioni radiali',3,20,1],structPetalWidth:['Larghezza delle divisioni',.1,.95,.01],
 structLayers:['Gusci concentrici',0,1,.01],structLayerCount:['Numero di strati concentrici',2,6,1],structLayerWidth:['Spessore relativo degli strati',.15,.85,.01],
 structGrowth:['Espansione radiale',0,.8,.01],structCurl:['Arricciamento dal centro',-1,1,.01],structFold:['Ampiezza delle pieghe',0,.4,.01],structFoldCount:['Pieghe intorno alla forma',1,12,1],
 structBreath:['Dilatazione radiale',-.3,.3,.01],structFlap:['Flessione delle lamine',-.6,.6,.01],structFlowPhase:['Fase delle pieghe',0,1,.001],structDelay:['Sfasamento radiale',0,1,.01],
 structScallop:['Arrotondamento dei petali',0,1,.01],structSpiral:['Avvolgimento a spirale',-1,1,.01],structStagger:['Sfasamento fra le lamine',0,1,.01],structRuffle:['Ondulazione fine dei bordi',0,.15,.005],structTaper:['Assottigliamento verso il bordo',0,1,.01],
 structCoreDark:['Oscurità del nucleo',0,1,.01],structCoreRadius:['Estensione del nucleo',.05,.8,.01]
};
export const STRUCTURE_GROUPS={shape:Object.keys(STRUCTURE_DEFAULTS).filter(k=>!['filPhase','filWind','filColor','filColorScatter','filRootShade','filBaseBlend','filPulse','filPulseCycles','filPulseWidth','loopBands','loopBandCount','loopBandAxis','loopPhase','structBreath','structFlap','structFlowPhase','structDelay','structCoreDark','structCoreRadius'].includes(k)),motion:['filPhase','filWind','filPulse','filPulseCycles','filPulseWidth','loopPhase','structBreath','structFlap','structFlowPhase','structDelay'],color:['filColor','filColorScatter','filRootShade','filBaseBlend','loopBands','loopBandCount','loopBandAxis','structCoreDark','structCoreRadius']};
export const WEAVE_TRACKS=['structWeaveBranching','structWeaveNodes','structWeaveMembrane','structWeaveFinesse','structWeaveGrowth','structWeaveReach','structWeaveRelease','structWeaveCup'];
export const STRUCTURE_TRACKS={...FILAMENT_TRACKS,...Object.fromEntries(['loopAmount','loopKnot','loopRadius','loopTube','loopFlat','loopTwist','loopWave','loopPhase','loopBandAxis','structShell','structFibres','structWeft','structSlices','structRadial','structFan','structFanBias','structLayers','structGrowth','structCurl','structFold','structBreath','structFlap','structFlowPhase','structScallop','structSpiral','structStagger','structRuffle',...WEAVE_TRACKS].map(k=>[k,[STRUCTURE_META[k][0],0,k==='structBreath'?.3:k==='structFlap'?.6:k==='structFold'?.4:k==='loopTwist'?2:k==='loopWave'?.35:k==='loopTube'?.6:k==='structWeaveFinesse'?2.05:1,.01]]))};
export const STRUCTURE_FIELD_KEYS=Object.keys(STRUCTURE_DEFAULTS).filter(k=>!k.startsWith('structCore')&&!k.startsWith('fil')&&!k.startsWith('loopBand'));
export function hasStructure(s){return ['loopAmount','structShell','structFibres','structSlices','structRadial','structFan','structLayers','structGrowth','structCurl','structFold','structBreath','structFlap','structScallop','structSpiral','structStagger','structRuffle'].some(k=>Math.abs(s[k]||0)>1e-6);}
export function structureMayChange(s){return hasStructure(s)||STRUCTURE_FIELD_KEYS.some(k=>s.motions?.[k]?.enabled&&(s.motions[k].amplitude||s.motions[k].mode==='cycle'||hasMotionPoints(s.motions[k])));}
export function structureBounds(s){
 const torus=(s.loopAmount||0)>0?(s.loopRadius??.8)+.36*(s.loopKnot||0)+(s.loopTube??.22)*(1+(s.loopWave||0)):1;
 const roots=.64*(s.structWeaveGrowth||0)+.16*(s.structWeaveBranching||0)*(s.structShell||0);
 const growth=1+Math.abs(s.structGrowth||0)+Math.abs(s.structBreath||0)+roots*(s.structWeft||0)*(s.structFibres||0)+.96*(s.structFan||0);
 const warp=1+Math.abs(s.structCurl||0)+Math.abs(s.structFold||0)+Math.abs(s.structFlap||0)+Math.abs(s.structRuffle||0)*2+Math.abs(s.structStagger||0)*.6;
 return Math.max(1,torus)*growth*warp;
}
export const knotTurns=s=>3+2*Math.max(0,Math.min(4,Math.round(((s.loopTurns??3)-3)/2)));
export function structureUniforms(s,u,uploadFan){
 const v={...STRUCTURE_DEFAULTS,...s};
 u('uLoopA',[v.loopAmount,v.loopKnot,v.loopRadius,v.loopTube]);u('uLoopB',[v.loopFlat,v.loopTwist,v.loopWave,v.loopPhase]);
 u('uStructureA',[v.structShell,v.structThickness,v.structFibres,v.structWeft]);
 u('uStructureB',[v.structDensity,v.structThreadWidth,v.structWeave,v.structSlices]);
 u('uStructureC',[v.structSliceCount,v.structSliceWidth,v.structRadial,v.structPetalCount]);
 u('uStructureD',[v.structPetalWidth,v.structLayers,v.structLayerCount,v.structLayerWidth]);
 u('uStructureE',[v.structGrowth,v.structCurl,v.structFold,v.structFoldCount]);
 u('uStructureF',[v.structBreath,v.structFlap,v.structFlowPhase,v.structDelay]);
 u('uStructureG',[v.structScallop,v.structSpiral,v.structStagger,v.structRuffle]);
 u('uStructureH',[v.structTaper,v.structWeaveVariation,v.structWeaveNodes,knotTurns(v)]);
 u('uWeaveGrowth',[v.structWeaveGrowth,v.structWeaveCup,v.structWeaveMembrane]);
 u('uWeaveNetwork',[v.structWeaveBranching,v.structWeaveFinesse,v.structWeaveRelease,v.structWeaveReach]);
 u('uStructureFan',[v.structFan]);u('uFanBias',[v.structFanBias]);
 if(v.structFan>0&&uploadFan){const {axes,profiles}=fanData(v,v.structFlowPhase*Math.PI*2);uploadFan('uFanAxes',axes);uploadFan('uFanProfiles',profiles);}
 u('uStructureColor',[v.structCoreDark,v.structCoreRadius]);u('uLoopColor',[v.loopBands,v.loopBandCount,v.loopBandAxis]);
}
// Closed torus-knot branches with two laps and an odd number of windings.
// Own implicit cross-section implementation: two branches, no mesh or sampled-segment traversal.
export function loopField(s,p){
 const a=Math.atan2(p[1],p[0]),r=Math.hypot(p[0],p[1]),phase=(s.loopPhase||0)*Math.PI*2,thin=1-.86*(s.loopFlat||0),twist=(s.loopTwist||0)*Math.sin(2*a+phase);
 const c=Math.cos(twist),sn=Math.sin(twist),tube=(s.loopTube??.22)*(1+(s.loopWave||0)*Math.sin(3*a-phase));let distance=1e9;
 for(let j=0;j<2;j++){const t=(a*.5+j*Math.PI)*knotTurns(s),k=.36*(s.loopKnot||0),x=r-(s.loopRadius??.8)-k*Math.cos(t),z=p[2]-k*Math.sin(t);const u=c*x+sn*z,v=-sn*x+c*z;distance=Math.min(distance,(Math.hypot(u,v/thin)-tube)*thin);}
 return distance;
}
export function loopBlend(s,d,p){return (s.loopAmount||0)>0?d+s.loopAmount*(loopField(s,p)-(Math.hypot(...p)-1)):d;}
// Keep the CPU query and shader algebra identical (lights, export and preview).
export function structureWarp(s,p){
 const v={...STRUCTURE_DEFAULTS,...s},q=[...p],r=Math.hypot(q[0],q[1]),a=Math.atan2(q[1],q[0]),phase=v.structFlowPhase*Math.PI*2;
 const expansion=1+v.structGrowth+v.structBreath*Math.cos(r*v.structDelay*Math.PI);
 q[0]/=expansion;q[1]/=expansion;
 const rr=Math.hypot(q[0],q[1]),falloff=rr*rr/(.3+rr*rr);
 // Smooth polar warp, shared by every structural operator and the base shape.
 const angle=a-v.structSpiral*2.8*rr-v.structStagger*q[2]*2;
 const petal=.5+.5*Math.cos(angle*v.structPetalCount);
 const envelope=1-v.structScallop*.62*(1-petal);
 if(v.structScallop||v.structSpiral||v.structStagger){q[0]=Math.cos(angle)*rr/envelope;q[1]=Math.sin(angle)*rr/envelope;}
 q[2]-=falloff*(1-v.structFan)*(v.structCurl+v.structFold*Math.sin(a*v.structFoldCount+phase-rr*v.structDelay*Math.PI)+v.structFlap*Math.cos(rr*v.structDelay*Math.PI));
 // Fan staggering already positions each leaf independently. Attenuate its
 // global polar ripple as those leaves emerge, rather than folding every
 // individual leaf once for every other leaf in the arrangement.
 q[2]-=falloff*(v.structStagger*(1-v.structFan)*.6*Math.sin(angle*v.structPetalCount+rr*2+phase)+v.structRuffle*(1-v.structFan)*Math.sin(angle*(v.structPetalCount*3)+phase-rr*6));
 return q;
}

// A hexagonal Voronoi diagram has exactly three edges at each vertex. Warp
// its coordinates smoothly, rather than crossing two families of ribbons:
// adjacent cells still share the same junction and all of its budding sites.
function weaveSite(x,y,density,corner=0){
 const k=density*1.73205080757/(Math.PI*2);
 const ax=x-1.73205080757*Math.floor(x/1.73205080757+.5),ay=y-Math.floor(y+.5);
 const bx=x-1.73205080757*(Math.floor(x/1.73205080757)+.5),by=y-(Math.floor(y)+.5);
 const qx=ax*ax+ay*ay<bx*bx+by*by?ax:bx,qy=ax*ax+ay*ay<bx*bx+by*by?ay:by;
 const edge=(.5-Math.max(Math.abs(qx)*.86602540378+Math.abs(qy)*.5,Math.abs(qy)))/k;
 const sector=Math.floor(Math.atan2(qy,qx)*3/Math.PI)+corner,turn=sector*Math.PI/3;
 const nx=x-qx+Math.cos(turn)*.57735026919,ny=y-qy+Math.sin(turn)*.57735026919;
 const wrap=density*1.73205080757,hx=nx-wrap*Math.floor(nx/wrap+.5);
 const shift=.5+.5*Math.sin(hx*23.71+ny*16.13);
 const side=Math.abs(qy)>Math.abs(qx)*.86602540378+Math.abs(qy)*.5;
 return [edge,(x-nx)/k,(y-ny)/k,((sector%2+2)%2)*Math.PI/3,shift,side?0:Math.sign(qx)*.86602540378,Math.sign(qy)*(side?1:.5),nx,ny];
}
// The network chart controls placement, never the physical roundness of a
// nodule. Undo its shear Jacobian before measuring tube and bud distances.
function weaveMetric(phi,theta,r,density,variation,phase,seed){
 const k=density*1.73205080757/(Math.PI*2),u=phi*k+variation*(.42*Math.sin(theta*3+seed)+.17*Math.sin(theta*7+.12*Math.sin(phase)));
 const v=theta*k+variation*(.3*Math.sin(u*3/k+seed*.7)+.13*Math.sin(u*7/k));
 const f=variation/k*(1.26*Math.cos(theta*3+seed)+1.19*Math.cos(theta*7+.12*Math.sin(phase)));
 const g=variation/k*(.9*Math.cos(u*3/k+seed*.7)+.91*Math.cos(u*7/k)),h=variation*.378/k*Math.cos(v*2.1/k);
 const a=1+h*g,b=f+h*(1+g*f),d=1+g*f,sine=Math.max(.12,Math.sin(theta)),radius=Math.max(.2,r);
 return [sine*d*radius,-sine*b*radius,-g*radius,a*radius,u+variation*.18*Math.sin(v*2.1/k),v];
}
function weaveNodeAngles(x,y,density,variation,phase,seed){
 const k=density*1.73205080757/(Math.PI*2),u=x-variation*.18*Math.sin(y*2.1/k);
 const theta=(y-variation*(.3*Math.sin(u*3/k+seed*.7)+.13*Math.sin(u*7/k)))/k;
 const phi=(u-variation*(.42*Math.sin(theta*3+seed)+.17*Math.sin(theta*7+.12*Math.sin(phase))))/k;
 return [phi,theta];
}
// A thin, porous three-lobed sheet widens each Y junction without filling
// the surrounding cells. The finer strands are geometry, not painted holes.
function weaveSaddle(x,y,z,radius,amount,shift,turn,density){
 const span=Math.max(radius*(2.7+3.3*amount),(.15+.15*amount)*Math.PI*2/(density*1.73205080757))*(1+.2*shift),r=Math.hypot(x,y),a=Math.atan2(y,x)-turn;
 const reach=span*(.39+.61*(.5+.5*Math.cos(3*a))**.72);
 const height=radius*.12+(.1*x*x-.15*y*y)/Math.max(.035,span);
 const membrane=Math.max((r-reach)*.62,Math.abs(z-height)-Math.max(.0026,radius*.14));
 if(membrane>span*.012)return membrane;
 const frequency=28/Math.max(.045,span);let u=x*frequency,v=y*frequency;
 u+=.55*Math.sin(v*1.63+shift*6)+.22*Math.sin(v*4.21);v+=.48*Math.sin(u*1.47+shift*2.2);u+=.28*Math.sin(v*2.36);
 const ax=u-1.73205080757*Math.floor(u/1.73205080757+.5),ay=v-Math.floor(v+.5);
 const bx=u-1.73205080757*(Math.floor(u/1.73205080757)+.5),by=v-(Math.floor(v)+.5);
 const qx=ax*ax+ay*ay<bx*bx+by*by?ax:bx,qy=ax*ax+ay*ay<bx*bx+by*by?ay:by;
 const edge=.5-Math.max(Math.abs(qx)*.86602540378+Math.abs(qy)*.5,Math.abs(qy));
 const fibreWidth=(.055+.1*Math.max(0,1-r/span))*(.65+.35*Math.sin(u*.13+v*.21+shift*6)**2);
 const fibres=(edge-fibreWidth)/frequency;
 return Math.max(membrane,fibres);
}

// Each persistent sphere becomes the end of a curved tapered stem. Opening
// subtracts an offset inner ellipsoid and leaves an actual rounded cup rim.
function weaveSprout(x,y,z,phaseSine,phaseCosine,shift,dx,dy,radius,growth,opening,density){
 const height=growth*(.19+.28*shift),cap=radius*(.83+.38*growth+.3*opening*growth);
 const axisZ=Math.max(0,Math.min(height,z)),slope=axisZ/Math.max(.0001,height);
 const tip=(.13+.035*(phaseSine*dx+phaseCosine*dy))*growth*Math.min(1,5/density);
 const stem=(Math.hypot(x-dx*tip*slope*slope,y-dy*tip*slope*slope,z-axisZ)-radius*(.24+.24*(1-slope)**2))*.71;
 const rx=x-dx*(tip+(z-height)*.23),ry=y-dy*(tip+(z-height)*.23),rz=(z-height)*1.12;
 const bowl=Math.hypot(rx,ry,rz)-cap;
 const aperture=opening*Math.max(0,Math.min(1,growth*3.5));
 const innerCut=-Math.hypot(rx,ry,rz-cap*.36)+cap*(.12+.82*aperture);
 const cavity=aperture<=.001?bowl:Math.max(bowl,innerCut);
 const stemFloor=aperture<=.001?stem:Math.max(stem,innerCut*.71);
 return Math.min(growth>.005?stemFloor:10,cavity*.78);
}

// A fan's axes and profile coefficients depend on the pose, never on the
// point being sampled. Upload them once per frame for all camera/light rays.
function fanProfile(s,phase){
 const seed=((s.seed||0)%1000)*.013,tau=Math.PI*2,count=Math.max(3,Math.min(20,Math.round(s.structPetalCount)));
 const axes=[],profiles=[];
 for(let index=0;index<count;index++){
  const variant=Math.sin(index*19.71+seed*1.4),lift=Math.sin(index*5.37+seed);
  const localPhase=phase+index*2.03,side=index%2,rank=(Math.floor(index/2)+.5)/Math.ceil(count/2);
  const uniformAngle=index*tau/count;
  const foldedAngle=Math.PI*(.5+side)+(rank-.5)*(.86+s.structStagger*.48)+side*.17;
  const angle=uniformAngle+(foldedAngle-uniformAngle)*s.structFanBias+s.structStagger*(variant*.42+.18*Math.sin(localPhase));
  const reach=(1+variant*(.12+s.structStagger*.25))*(1+.48*s.structStagger*Math.cos(uniformAngle-.55))*(1+s.structFanBias*(.26-.55*rank+.13*lift));
  const width=(.31+s.structPetalWidth*.52)*(1-.5*s.structRadial)*(1+lift*.24*s.structStagger)*(1+s.structFanBias*(.28-.36*rank));
  axes.push(Math.cos(angle),Math.sin(angle),reach,width);
  profiles.push(s.structSpiral*.76+.11*lift,lift*.18+s.structFanBias*(rank-.45)*.58,variant,localPhase);
 }
 return {axes,profiles};
}
let lastFanProfileKey='',lastFanProfile;
function fanData(s,phase){
 const key=[s.seed,s.structPetalCount,s.structPetalWidth,s.structRadial,s.structStagger,s.structSpiral,s.structFanBias,phase].join(':');
 if(key!==lastFanProfileKey){lastFanProfileKey=key;lastFanProfile=fanProfile(s,phase);}
 return lastFanProfile;
}
// A ruled membrane joins two flared lobes through a narrow, twisting waist.
// Bias changes the radial fan continuously into this single connected sheet.
function drapeProfile(s,t,phase){
 const centreX=(.12+.25*Math.abs(s.structCurl))*Math.sin(t*2.6+phase)*(.5+.5*Math.min(1,Math.abs(t))),centreZ=.14*Math.sin(t*2.7-phase)*(1+.4*s.structStagger);
 const angle=t*(.65+1.7*s.structSpiral)+(.42+.9*Math.abs(s.structCurl))*Math.atan(t*2.8)+.22*Math.sin(phase+t*2.1)+.5*s.structFlap*Math.sin(phase-t),side=t/Math.sqrt(.06+t*t),curvature=(.35+3.3*s.structFold)*side+.32*s.structCurl+.15*Math.sin(phase+t*3);
 const waist=.28+(.5+s.structPetalWidth*.45)*(1-Math.exp(-t*t*4))*(1+.13*t/Math.sqrt(.111+t*t));
 return [centreX,centreZ,angle,curvature,waist];
}
function drapeHeight(s,across,t,waist,phase){
 const radial=Math.hypot(across/waist,t),edge=Math.max(0,Math.min(1,(radial-.35)/.65));
 return s.structFold*.5*(.65*Math.sin(across*(4.1+s.structPetalCount*.22)/waist+phase-t*2)+.35*Math.sin(t*9-phase+across/waist))*(.5+.5*Math.min(1,Math.abs(t)*2))
  +s.structRuffle*.5*edge*Math.sin(across*23+t*13-phase);
}
function drapeCoordinates(s,p,phase){
 const t=p[1]/1.12,[centreX,centreZ,angle,curvature,waist]=drapeProfile(s,t,phase),c=Math.cos(angle),sn=Math.sin(angle),x=p[0]-centreX,z=p[2]-centreZ,planeX=c*x+sn*z,planeZ=-sn*x+c*z;
 const denominator=1-curvature*planeZ,bendRadius=Math.hypot(curvature*planeX,denominator),ratio=denominator>0?curvature*planeX/denominator:1,v2=ratio*ratio;
 const across=denominator>0&&Math.abs(ratio)<.2?planeX/denominator*(1-v2*(1/3-v2*(1/5-v2/7))):Math.atan2(curvature*planeX,denominator)/curvature,normal=(2*planeZ-curvature*(planeX*planeX+planeZ*planeZ))/(1+bendRadius);
 return [across/waist,t,normal-drapeHeight(s,across,t,waist,phase),waist];
}
export function drapePoint(s,u,t,normalOffset=0,phase=s.structFlowPhase*Math.PI*2){
 const [cx,cz,angle,k,waist]=drapeProfile(s,t,phase),across=u*waist,n=drapeHeight(s,across,t,waist,phase)+normalOffset,a=k*across,a2=a*a,small=Math.abs(a)<.2,sinc=small?1-a2*(1/6-a2*(1/120-a2/5040)):Math.sin(a)/a,si=a*sinc,co=small?1-a2*(.5-a2*(1/24-a2/720)):Math.cos(a),x=across*sinc-n*si,z=(small?.5*k*across*across*(1-a2*(1/12-a2*(1/360-a2/20160))):2*Math.sin(a*.5)**2/k)+n*co,c=Math.cos(angle),sn=Math.sin(angle);
 return [cx+c*x-sn*z,t*1.12,cz+sn*x+c*z];
}
function drapeField(s,p,phase){
 const q=drapeCoordinates(s,p,phase),radial=Math.hypot(q[0],q[1]),edge=Math.max(0,Math.min(1,(radial-.35)/.65));
 const edgeAngle=Math.atan2(q[1],q[0]),edgeWave=s.structFold*(.36*Math.sin(edgeAngle*7+phase)+.15*Math.sin(edgeAngle*4-phase));
 const outline=(radial-1-edgeWave)*Math.min(.36,q[3]),thickness=s.structThickness*(.22-.16*s.structTaper*edge);
 return Math.max(outline,Math.abs(q[2])-thickness)*.43;
}
function fanDrapeBlend(s){
 const bias=Math.max(0,Math.min(1,(s.structFanBias-.3)/.65)),count=Math.max(0,Math.min(1,(s.structPetalCount-4)/4));
 return bias*bias*(3-2*bias)*(1-count*count*(3-2*count));
}
function fanDrapeCoordinates(s,p,phase){
 const blend=fanDrapeBlend(s);if(blend<=0)return [...p,1];
 const size=Math.sqrt(blend),q=drapeCoordinates(s,p.map(value=>value/size),phase);q[2]*=size;q[3]*=size;return q;
}
function fanHingeParameters(s,reach,phase){
 const hinge=.45*reach,remaining=reach*(.61+.3402*Math.tanh(3*s.structRuffle)),raw=s.structCurl*4.5+s.structFold*1.5*Math.sin(phase*.7);
 const limit=Math.min(2.7/remaining,.2/(.33*s.structThickness));
 return [hinge,limit*Math.tanh(raw/limit)];
}
function fanSheetHeight(s,u,across,reach,lift,variant,phase,k){
 const along=Math.max(0,Math.min(1.2,u/reach));
 let sheet=along*(lift+Math.sin(phase-along*2.4)*s.structFlap*.42)+across*along*.8*variant+across*across*(.45+.26*variant)
  +s.structFanBias*Math.pow(along,1.25)*s.structFold*Math.sin(across*(3.2+s.structFoldCount*.7)-along*2.1+phase)*.58;
 return sheet;
}
function fanSheetCoordinates(s,p,axes,profiles,index,out){
 const c=axes[index],t=axes[index+1],reach=axes[index+2],halfWidth=axes[index+3],offset=profiles[index],lift=profiles[index+1],variant=profiles[index+2],phase=profiles[index+3];
 const rawU=c*p[0]+t*p[1],v=-t*p[0]+c*p[1],[hinge,k]=fanHingeParameters(s,reach,phase),shift=fanSheetHeight(s,hinge,v-.45*.45*offset,reach,lift,variant,phase,k),z=p[2]-shift,x=rawU-hinge,den=1-k*z,radius=Math.hypot(k*x,den),absX=Math.abs(x),absK=Math.abs(k),ratio=den>0?absK*absX/den:1,v2=ratio*ratio;
 const arcU=hinge+(den>0&&Math.abs(ratio)<.2?absX/den*(1-v2*(1/3-v2*(1/5-v2/7))):Math.atan2(absK*absX,den)/absK),arcNormal=(2*z-k*(x*x+z*z))/(1+radius);
 let best=Infinity;
 for(let visit=0;visit<2;visit++){
  const branch=x>=0?1-visit:visit,lower=(branch?-x:x)*(branch?Math.max(.08,Math.min(1,radius)):1);if(lower>best)continue;
  const u=branch?arcU:rawU,normal=branch?arcNormal:z,metric=branch?Math.max(.08,Math.min(1,radius)):1,domain=branch?-x:x,along=Math.max(0,Math.min(1.2,u/reach)),across=v-along*along*offset,flare=Math.max(0,Math.min(1,along/.75)),width=halfWidth*(.58+.42*flare*flare*(3-2*flare));
  let height=fanSheetHeight(s,u,across,reach,lift,variant,phase,k)-shift;height/=1+Math.abs(k*height)/.7;
  const angle=Math.atan2(across/width,(u-.43*reach)/(.63*reach)),rim=Math.tanh(3*s.structRuffle)*(.38*Math.sin(angle*4+phase)+.16*Math.sin(angle*9-phase)),outline=(Math.hypot((u-.43*reach)/(.63*reach),across/width)-1-rim)*Math.min(.3,width),edge=Math.max(0,Math.min(1,1+outline/(.6*halfWidth))),thickness=s.structThickness*(.33-.25*s.structTaper*edge),rawDistance=Math.max(outline,Math.abs(normal-height)-thickness,domain),distance=rawDistance*metric;
  if(distance<best||(distance===best&&branch===0)){best=distance;out[0]=u;out[1]=across;out[2]=normal-height;out[3]=width;out[4]=metric;out[5]=domain;out[6]=rawDistance;}
 }
 return out;
}
function fanSheetPoint(s,u,across,axes,profiles,index,normalOffset=0){
 const c=axes[index],t=axes[index+1],reach=axes[index+2],offset=profiles[index],lift=profiles[index+1],variant=profiles[index+2],phase=profiles[index+3];
 const [hinge,k]=fanHingeParameters(s,reach,phase),along=Math.max(0,Math.min(1.2,u/reach)),y=across+along*along*offset,shift=fanSheetHeight(s,hinge,y-.45*.45*offset,reach,lift,variant,phase,k),height=fanSheetHeight(s,u,across,reach,lift,variant,phase,k)-shift,n=height/(1+Math.abs(k*height)/.7)+normalOffset;
 let x=u,z=n;if(u>hinge){const du=u-hinge,a=k*du,a2=a*a,small=Math.abs(a)<.2,sinc=small?1-a2*(1/6-a2*(1/120-a2/5040)):Math.sin(a)/a,si=a*sinc,co=small?1-a2*(.5-a2*(1/24-a2/720)):Math.cos(a);x=hinge+du*sinc-n*si;z=(small?.5*k*du*du*(1-a2*(1/12-a2*(1/360-a2/20160))):2*Math.sin(a*.5)**2/k)+n*co;}
 return[c*x-t*y,t*x+c*y,z+shift];
}
function fanField(s,p,phase,component=-1){
 const blend=fanDrapeBlend(s),drapeSize=Math.sqrt(blend),fanSize=Math.sqrt(1-blend);
 const drape=blend>0?drapeField(s,p.map(value=>value/drapeSize),phase)*drapeSize:10;if(blend>=1)return component<0||component===21?drape:10000.;
 p=p.map(value=>value/fanSize);
 const {axes,profiles}=fanData(s,phase);
 let distance=Math.max(Math.hypot(p[0],p[1])-.115*(1-s.structFanBias*.82),Math.abs(p[2])-s.structThickness*.58);
 let selected=component===20?distance:component===21?drape/fanSize:10000.;const coordinates=[0,0,0,0];
 for(let index=0;index<axes.length;index+=4){
  if(component>=0&&component!==index/4&&blend<=0)continue;
  fanSheetCoordinates(s,p,axes,profiles,index,coordinates);
  const leaf=coordinates[6]*.59*coordinates[4];
  distance=Math.min(distance,leaf);if(component===index/4)selected=leaf;
 }
 distance*=fanSize;selected*=fanSize;if(blend<=0)return component>=0?selected:distance;
 const rounding=.015*Math.sin(Math.PI*blend),h=Math.max(0,rounding-Math.abs(distance-drape))/Math.max(.0000001,rounding);
 return (component>=0?selected:Math.min(distance,drape))-h*h*rounding*.25;
}

// This inverse is exact for the Fan=1 structural warp when its radial map
// is certified monotone. Ambiguous maps return a continuation seed, marked
// invalid, so callers can project it onto the implicit field explicitly.
export function structureUnwarpFanInfo(s,q){
 const v={...STRUCTURE_DEFAULTS,...s},angle=Math.hypot(q[0],q[1])>1e-12?Math.atan2(q[1],q[0]):0,envelope=1-v.structScallop*.62*(.5-.5*Math.cos(angle*v.structPetalCount)),rr=Math.hypot(q[0],q[1])*envelope,k=v.structDelay*Math.PI,b=v.structBreath,g=1+v.structGrowth;
 let lo=rr*(g-Math.abs(b)),hi=rr*(g+Math.abs(b)),r=rr*g,minSin=Math.min(Math.sin(lo*k),Math.sin(hi*k)),maxSin=Math.max(Math.sin(lo*k),Math.sin(hi*k));if(Math.ceil((lo*k-Math.PI*1.5)/(Math.PI*2))<=Math.floor((hi*k-Math.PI*1.5)/(Math.PI*2)))minSin=-1;if(Math.ceil((lo*k-Math.PI*.5)/(Math.PI*2))<=Math.floor((hi*k-Math.PI*.5)/(Math.PI*2)))maxSin=1;
 const minimumDerivative=1+rr*b*k*(b>=0?minSin:maxSin),unique=Math.abs(v.structFan-1)<1e-8&&minimumDerivative>1e-4;
 if(b!==0){if(unique){for(let i=0;i<40;i++){r=(lo+hi)*.5;if(r-rr*(g+b*Math.cos(r*k))>0)hi=r;else lo=r;}r=(lo+hi)*.5;}else{for(let stage=1;stage<=8;stage++)for(let j=0;j<4;j++){const breath=b*stage/8,f=r-rr*(g+breath*Math.cos(r*k)),d=1+rr*breath*k*Math.sin(r*k);if(Math.abs(d)>.08)r=Math.max(lo,Math.min(hi,r-f/d));}}}
 const a=angle+v.structSpiral*2.8*rr+v.structStagger*q[2]*2,point=[Math.cos(a)*r,Math.sin(a)*r,q[2]];
 if(unique)for(let j=0;j<3;j++){const back=structureWarp(v,point),ex=back[0]-q[0],ey=back[1]-q[1];if(Math.hypot(ex,ey)<1e-6)break;const e=.0005*Math.max(1,Math.hypot(point[0],point[1])),xp=structureWarp(v,[point[0]+e,point[1],point[2]]),xm=structureWarp(v,[point[0]-e,point[1],point[2]]),yp=structureWarp(v,[point[0],point[1]+e,point[2]]),ym=structureWarp(v,[point[0],point[1]-e,point[2]]),a=(xp[0]-xm[0])/(2*e),b=(yp[0]-ym[0])/(2*e),c=(xp[1]-xm[1])/(2*e),d=(yp[1]-ym[1])/(2*e),det=a*d-b*c;if(Math.abs(det)<1e-5)break;point[0]-=(d*ex-b*ey)/det;point[1]-=(-c*ex+a*ey)/det;}
 const back=structureWarp(v,point),residual=Math.hypot(...back.map((x,i)=>x-q[i]));
 return {point,residual,unique,minimumDerivative,valid:unique&&residual<2e-5};
}
function drapeForwardCondition(s,u,t,normalOffset,phase){
 const profile=drapeProfile(s,t,phase),k=profile[3],waist=profile[4],across=u*waist;
 return 1-k*(drapeHeight(s,across,t,waist,phase)+normalOffset);
}
export function forwardSheetPointInfo(s,u,v,normalOffset=0,component=0){
 const state={...STRUCTURE_DEFAULTS,...s},phase=state.structFlowPhase*Math.PI*2,blend=fanDrapeBlend(state),size=Math.sqrt(component===21?blend:1-blend),included=component===21?blend>0:component>=0&&component<Math.round(state.structPetalCount)&&blend<1;
 if(!included||size<=0)return {point:[0,0,0],valid:false,unique:false,residual:10000,chartResidual:10000};
 let p,q;if(component===21){p=drapePoint(state,u,v,normalOffset,phase);q=drapeCoordinates(state,p,phase);}else{const {axes,profiles}=fanData(state,phase);p=fanSheetPoint(state,u,v,axes,profiles,component*4,normalOffset);q=fanSheetCoordinates(state,p,axes,profiles,component*4,[]);}
 let cu=u,cv=v,cn=normalOffset;for(let j=0;j<3;j++){const error=Math.max(Math.abs(q[0]-u),Math.abs(q[1]-v),Math.abs(q[2]-normalOffset));if(error<1e-6||error>.01)break;cu+=u-q[0];cv+=v-q[1];cn+=normalOffset-q[2];if(component===21){p=drapePoint(state,cu,cv,cn,phase);q=drapeCoordinates(state,p,phase);}else{const {axes,profiles}=fanData(state,phase);p=fanSheetPoint(state,cu,cv,axes,profiles,component*4,cn);q=fanSheetCoordinates(state,p,axes,profiles,component*4,[]);}}
 const chartResidual=Math.max(Math.abs(q[0]-u),Math.abs(q[1]-v),Math.abs(q[2]-normalOffset)),result=structureUnwarpFanInfo(state,p.map(x=>x*size));
 const chartCondition=component===21?drapeForwardCondition(state,u,v,normalOffset,phase):1;
 return {...result,warpResidual:result.residual,residual:Math.max(result.residual,chartResidual),chartResidual,chartCondition,valid:result.valid&&chartResidual<2e-5&&chartCondition>.04};
}
export function forwardSheetPoint(s,u,v,normalOffset=0,component=0){return forwardSheetPointInfo(s,u,v,normalOffset,component).point;}

// Shells and porous networks act on each leaf before their union. Ordinary
// cuts are monotone and retain the cheaper union evaluation.
export function structureField(s,d,p){
 const v={...STRUCTURE_DEFAULTS,...s};
 if(v.structFan>0&&v.structShell>0){
  const blend=fanDrapeBlend(v),count=Math.round(v.structPetalCount);let result=10000;
  for(let slot=0;slot<count+2;slot++){
   const id=slot<count?slot:20+slot-count;
   if((id===21&&blend<=0)||(id!==21&&blend>=1))continue;
   result=Math.min(result,structureComponentField(v,d,p,id));
  }
  return result;
 }
 return structureComponentField(v,d,p,-1);
}
function structureComponentField(v,d,p,component){
 const r=Math.hypot(...p),tau=Math.PI*2;
 const branching=v.structWeaveBranching*v.structShell*v.structFibres*v.structWeft;
 const networkOnly=branching===0&&v.structWeaveVariation*v.structShell*v.structFibres*v.structWeft===1;
 const thickness=v.structThickness*(1-v.structTaper*.85*Math.min(1,Math.hypot(p[0],p[1])));
 let midSurface=d+thickness*.5;
 // Every rib, porous saddle and terminal cup lies inside this radial band.
 // Skip chart/Jacobian evaluations only beyond a generous empty-space margin;
 // the underlying shape's distance still supplies the conservative step.
 if(networkOnly&&v.structFan===0){
  const baseRadius=Math.max(v.structThickness*.13,Math.min(v.structThickness*.36,v.structThreadWidth*1.25/v.structDensity));
  const radius=baseRadius*(1-.52*v.structWeaveGrowth),span=v.structWeaveMembrane>0?Math.max(radius*6,.3*tau/(v.structDensity*1.73205080757))*1.2:0;
  const slack=Math.abs(v.structWeave)*.42+.01,lower=-(2.3*baseRadius+.16*span+slack),upper=.47*v.structWeaveGrowth+.85*radius+2.2*baseRadius+.12*span+slack;
  const empty=Math.max(lower-midSurface,midSurface-upper);
  if(empty>.025)return empty*.45;
 }
 const phi=Math.atan2(p[1],p[0]),theta=Math.acos(Math.max(-1,Math.min(1,p[2]/Math.max(r,1e-6))));
 let a=phi*v.structDensity,b=theta*v.structDensity;
 const phase=v.structFlowPhase*tau,variation=v.structWeaveVariation*Math.sin(theta);
 if(variation>0&&!networkOnly){
  a+=variation*(2.2*Math.sin(4*phi+2.3*Math.sin(theta*6))+1.12*Math.sin(13*phi-theta*7));
  b+=variation*(1.9*Math.sin(5*phi-theta*3)+1.26*Math.sin(11*phi+theta*8));
 }
 if(v.structFan>0){
  const baseline=d;
  d=baseline+(fanField(v,p,phase,component)-baseline)*v.structFan;
  midSurface+=(d-midSurface)*v.structFan;
 }
 const sourceField=d;
 if(v.structShell>0)d=Math.max(d,-d-thickness-(1-thickness)*(1-v.structShell));
 if(v.structFibres>0&&branching<1){
  const width=1+(v.structThreadWidth-1)*v.structFibres;
  if(!networkOnly){
   let scaleA=1,scaleB=1;
   const drapeBlend=v.structFan*fanDrapeBlend(v);
   if(drapeBlend>0){
    const q=fanDrapeCoordinates(v,p,phase);a+=(q[0]*v.structDensity*Math.PI-a)*drapeBlend;b+=(q[1]*v.structDensity*Math.PI-b)*drapeBlend;
    scaleA+=(Math.max(.02,Math.min(.1,q[3]*.18))-1)*drapeBlend;scaleB+=(.2*Math.sqrt(fanDrapeBlend(v))-1)*drapeBlend;
   }
   const warp=(Math.abs(Math.sin(a*.5))-width)/v.structDensity*2*scaleA,weft=(Math.abs(Math.sin(b*.5))-width*v.structWeft)/v.structDensity*2*scaleB;
   d=Math.max(d,v.structWeft>0?Math.min(warp,weft):warp);
   const junction=Math.pow((.5+.5*Math.cos(a))*(.5+.5*Math.cos(b)),3);
   d+=v.structFibres*(v.structWeave*Math.cos(a)*Math.cos(b)*Math.cos(phase)-v.structWeaveNodes*v.structWeft*junction*.095);
  }
  const sprouts=v.structWeaveGrowth*v.structWeft*v.structFibres;
  if((v.structWeaveVariation>0||sprouts>0||v.structWeaveMembrane>0)&&v.structShell>0){
   const seed=((v.seed||0)%1000)*.013,metric=weaveMetric(phi,theta,r,v.structDensity,v.structWeaveVariation,phase,seed),det=metric[0]*metric[3]-metric[1]*metric[2];
   const site=weaveSite(metric[4],metric[5],v.structDensity);
   const edgeSlope=Math.hypot(metric[3]*site[5]-metric[2]*site[6],-metric[1]*site[5]+metric[0]*site[6])/det;
   const baseRadius=Math.max(thickness*.13,Math.min(thickness*.36,width*1.25/v.structDensity)),radius=baseRadius*(1-.52*sprouts);
   const z=midSurface-v.structWeave*.42*Math.sin(phi*4+theta*3+phase);
   const ribs=Math.hypot(z,site[0]/Math.max(.1,edgeSlope))-radius;
   const growth=v.structWeaveNodes,web=v.structWeaveMembrane,phaseSine=Math.sin(phase),phaseCosine=Math.cos(phase);
   let node=10,sprout=10,membrane=10;
   for(let corner=0;corner<2;corner++){
    const current=corner?weaveSite(metric[4],metric[5],v.structDensity,1):site;
    const x=current[1],y=current[2],turn=current[3],shift=current[4];
    const [nodePhi,nodeTheta]=weaveNodeAngles(current[7],current[8],v.structDensity,v.structWeaveVariation,phase,seed);
    const sinePhi=Math.sin(nodePhi),cosinePhi=Math.cos(nodePhi),sineTheta=Math.sin(nodeTheta),cosineTheta=Math.cos(nodeTheta);
    const tangentX=-sinePhi*p[0]+cosinePhi*p[1],tangentY=cosineTheta*(cosinePhi*p[0]+sinePhi*p[1])-sineTheta*p[2];
    node=Math.min(node,Math.hypot(tangentX,tangentY,z)-radius*(.86+.35*growth));
    if(v.structWeft>0&&(growth>0||sprouts>0||web>0)){
     if(web>0)membrane=Math.min(membrane,weaveSaddle(x,y,z,radius,web*(1-.38*sprouts),shift,turn,v.structDensity));
     if((growth>.05||sprouts>0)&&Math.hypot(tangentX,tangentY)<radius*2.2+baseRadius*2.2+.17*sprouts+.03&&z>-baseRadius*2.3){
      const nodeMetric=weaveMetric(nodePhi,nodeTheta,1,v.structDensity,v.structWeaveVariation,phase,seed);
      for(let index=0;index<6;index++){
       const angle=turn+(index%3)*tau/3+.3*Math.sin(index*1.7+shift*4),offset=radius*(.65+Math.floor(index/3)*1.55);
       const budRadius=baseRadius*(1.05+.4*Math.sin(index*2.17+shift*5)**2)*(.3+.7*growth);
       const localGrowth=sprouts*(.36+.64*shift)*(index<3?1:.47);
       const dx=nodeMetric[0]*Math.cos(angle)+nodeMetric[1]*Math.sin(angle),dy=nodeMetric[2]*Math.cos(angle)+nodeMetric[3]*Math.sin(angle);
       const directionLength=Math.max(.0001,Math.hypot(dx,dy)),axisX=dx/directionLength,axisY=dy/directionLength,rootX=axisX*offset,rootY=axisY*offset,rootZ=radius*(.7+.12*Math.sin(index*1.91+shift*6));
       sprout=Math.min(sprout,weaveSprout(tangentX-rootX,tangentY-rootY,z-rootZ,phaseSine,phaseCosine,shift,axisX,axisY,budRadius,localGrowth,v.structWeaveCup,v.structDensity));
      }
     }
    }
   }
   const blend=v.structWeaveVariation*v.structShell*v.structFibres*v.structWeft;
   d+=(Math.min(ribs,node)-d)*blend;
   d+=(Math.min(d,sprout)-d)*Math.min(1,3*(growth+sprouts))*v.structShell*v.structWeft*v.structFibres;
   d+=(Math.min(d,membrane)-d)*Math.min(1,1.45*web)*v.structShell*v.structWeft*v.structFibres;
  }
 }
 if(branching>0){const branchField=weaveNetworkField(v,sourceField,p,thickness);d=branching===1?branchField:d+(branchField-d)*branching;}
 if(v.structSlices>0)d=Math.max(d,(Math.abs(Math.sin(p[2]*v.structSliceCount*Math.PI)) -(1+(v.structSliceWidth-1)*v.structSlices))/ (v.structSliceCount*Math.PI));
 const separation=v.structRadial*(1-v.structFan);
 if(separation>0)d=Math.max(d,(Math.abs(Math.sin(phi*v.structPetalCount*.5))-(1+(v.structPetalWidth-1)*separation))*Math.hypot(p[0],p[1])/v.structPetalCount);
 if(v.structLayers>0)d=Math.max(d,(Math.abs(Math.sin(r*v.structLayerCount*Math.PI))-(1+(v.structLayerWidth-1)*v.structLayers))/(v.structLayerCount*Math.PI));
 return d;
}
export const LOOP_PALETTE_GLSL=`
vec2 loopBandCoordinates(vec3 p,vec4 loop,vec4 path,vec3 pigment,float turns){
 float angle=atan(p.y,p.x);
 float around=.5+.5*cos(angle*pigment.y-path.w*6.28318530718);
 if(pigment.z<.0001)return vec2(around);
 float torus=.5*angle*turns,thin=1.-.86*path.x;
 vec2 center=vec2(length(p.xy)-loop.z,p.z);
 vec2 offset=.36*loop.y*vec2(cos(torus),sin(torus));
 float twist=path.y*sin(2.*angle+path.w*6.28318530718);
 float c=cos(twist),s=sin(twist);
 mat2 crossSection=mat2(c,-s,s,c);
 vec2 a=(crossSection*(center-offset))/vec2(1.,thin);
 vec2 b=(crossSection*(center+offset))/vec2(1.,thin);
 vec2 nearest=dot(a,a)<dot(b,b)?a:b;
 float across=.5+atan(nearest.y,nearest.x)/6.28318530718;
 return vec2(around,fract(across*pigment.y-path.w));
}
`;
export const STRUCTURE_GLSL=`
${LOOP_PALETTE_GLSL}
uniform vec4 uStructureA,uStructureB,uStructureC,uStructureD,uStructureE,uStructureF,uStructureG;
uniform vec2 uStructureColor;
uniform vec4 uStructureH;
uniform vec3 uWeaveGrowth;
 ${WEAVE_NETWORK_GLSL}
uniform float uStructureFan,uFanBias;
uniform vec4 uLoopA,uLoopB;
uniform vec3 uLoopColor;
bool structureActive(){return uStructureFan+uLoopA.x+dot(abs(uStructureA.xzw),vec3(1.))+abs(uStructureB.w)+abs(uStructureC.z)+abs(uStructureD.y)+dot(abs(uStructureE.xyz),vec3(1.))+dot(abs(uStructureF.xy),vec2(1.))+dot(abs(uStructureG),vec4(1.))>.000001;}
float loopField(vec3 p){
 float a=atan(p.y,p.x),r=length(p.xy),phase=uLoopB.w*6.28318530718,thin=1.-.86*uLoopB.x,angle=uLoopB.y*sin(2.*a+phase);
 float c=cos(angle),sn=sin(angle),tube=uLoopA.w*(1.+uLoopB.z*sin(3.*a-phase));
 float t=.5*a*uStructureH.w;
 vec2 center=vec2(r-uLoopA.z,p.z),offset=.36*uLoopA.y*vec2(cos(t),sin(t));
 vec2 q=center-offset,v=center+offset;
 q=vec2(c*q.x+sn*q.y,(-sn*q.x+c*q.y)/thin);
 v=vec2(c*v.x+sn*v.y,(-sn*v.x+c*v.y)/thin);
 return (min(length(q),length(v))-tube)*thin;
}
float loopBlend(float d,vec3 p){return uLoopA.x>0.?d+uLoopA.x*(loopField(p)-(length(p)-1.)):d;}
vec3 structureWarp(vec3 p){
 float r=length(p.xy),a=atan(p.y,p.x),phase=uStructureF.z*6.28318530718;
 p.xy/=1.+uStructureE.x+uStructureF.x*cos(r*uStructureF.w*3.14159265359);
 float rr=length(p.xy),falloff=rr*rr/(.3+rr*rr);
 float angle=a-uStructureG.y*2.8*rr-uStructureG.z*p.z*2.;
 float petal=.5+.5*cos(angle*uStructureC.w),envelope=1.-uStructureG.x*.62*(1.-petal);
 if(abs(uStructureG.x)+abs(uStructureG.y)+abs(uStructureG.z)>.000001)p.xy=vec2(cos(angle),sin(angle))*rr/envelope;
 p.z-=falloff*(1.-uStructureFan)*(uStructureE.y+uStructureE.z*sin(a*uStructureE.w+phase-rr*uStructureF.w*3.14159265359)+uStructureF.y*cos(rr*uStructureF.w*3.14159265359));
 p.z-=falloff*(uStructureG.z*(1.-uStructureFan)*.6*sin(angle*uStructureC.w+rr*2.+phase)+uStructureG.w*(1.-uStructureFan)*sin(angle*(uStructureC.w*3.)+phase-rr*6.));
 return p;
}
vec4 weaveSite(vec2 p,float corner,out float shift,out vec2 edgeNormal,out vec2 node){
 float k=uStructureB.x*1.73205080757/6.28318530718;
 vec2 period=vec2(1.73205080757,1.);
 vec2 a=p-period*floor(p/period+.5),b=p-period*(floor(p/period)+.5);
 vec2 q=dot(a,a)<dot(b,b)?a:b;
 edgeNormal=abs(q.y)>dot(abs(q),vec2(.86602540378,.5))?vec2(0.,sign(q.y)):sign(q)*vec2(.86602540378,.5);
 float edge=(.5-max(dot(abs(q),vec2(.86602540378,.5)),abs(q.y)))/k;
 float sector=floor(atan(q.y,q.x)*3./3.14159265359)+corner,turn=sector*3.14159265359/3.;
 node=p-q+vec2(cos(turn),sin(turn))*.57735026919;
 float wrap=uStructureB.x*1.73205080757;vec2 identity=vec2(node.x-wrap*floor(node.x/wrap+.5),node.y);
 shift=.5+.5*sin(dot(identity,vec2(23.71,16.13)));
 return vec4(edge,(p-node)/k,mod(sector,2.)*3.14159265359/3.);
}
mat2 weaveMetric(float phi,float theta,float r,out vec2 chart){
 float k=uStructureB.x*1.73205080757/6.28318530718,phase=uStructureF.z*6.28318530718;
 float u=phi*k+uStructureH.y*(.42*sin(theta*3.+uSeed)+.17*sin(theta*7.+.12*sin(phase)));
 float v=theta*k+uStructureH.y*(.3*sin(u*3./k+uSeed*.7)+.13*sin(u*7./k));
 float f=uStructureH.y/k*(1.26*cos(theta*3.+uSeed)+1.19*cos(theta*7.+.12*sin(phase)));
 float g=uStructureH.y/k*(.9*cos(u*3./k+uSeed*.7)+.91*cos(u*7./k)),h=uStructureH.y*.378/k*cos(v*2.1/k);
 float a=1.+h*g,b=f+h*(1.+g*f),d=1.+g*f,sine=max(.12,sin(theta));
 chart=vec2(u+uStructureH.y*.18*sin(v*2.1/k),v);
 return mat2(sine*d,-g,-sine*b,a)*max(.2,r);
}
vec2 weaveNodeAngles(vec2 node){
 float k=uStructureB.x*1.73205080757/6.28318530718,phase=uStructureF.z*6.28318530718;
 float u=node.x-uStructureH.y*.18*sin(node.y*2.1/k);
 float theta=(node.y-uStructureH.y*(.3*sin(u*3./k+uSeed*.7)+.13*sin(u*7./k)))/k;
 float phi=(u-uStructureH.y*(.42*sin(theta*3.+uSeed)+.17*sin(theta*7.+.12*sin(phase))))/k;
 return vec2(phi,theta);
}
#ifdef WEAVE_DETAIL
float weaveSaddle(vec3 q,float radius,float amount,float shift,float turn){
 float span=max(radius*(2.7+3.3*amount),(.15+.15*amount)*6.28318530718/(uStructureB.x*1.73205080757))*(1.+.2*shift),r=length(q.xy),a=atan(q.y,q.x)-turn;
 float reach=span*(.39+.61*pow(.5+.5*cos(3.*a),.72));
 float height=radius*.12+(.1*q.x*q.x-.15*q.y*q.y)/max(.035,span);
 float membrane=max((r-reach)*.62,abs(q.z-height)-max(.0026,radius*.14));
 if(membrane>span*.012)return membrane;
 float frequency=28./max(.045,span);vec2 p=q.xy*frequency;
 p.x+=.55*sin(p.y*1.63+shift*6.)+.22*sin(p.y*4.21);p.y+=.48*sin(p.x*1.47+shift*2.2);p.x+=.28*sin(p.y*2.36);
 vec2 period=vec2(1.73205080757,1.),first=p-period*floor(p/period+.5),second=p-period*(floor(p/period)+.5);
 vec2 cell=dot(first,first)<dot(second,second)?first:second;
 float edge=.5-max(dot(abs(cell),vec2(.86602540378,.5)),abs(cell.y));
 float fibreWidth=(.055+.1*max(0.,1.-r/span))*(.65+.35*pow(sin(p.x*.13+p.y*.21+shift*6.),2.));
 return max(membrane,(edge-fibreWidth)/frequency);
}
float weaveSprout(vec3 q,vec2 cycle,float shift,vec2 axis,float radius,float growth,float opening){
 float height=growth*(.19+.28*shift),cap=radius*(.83+.38*growth+.3*opening*growth);
 float axisZ=clamp(q.z,0.,height),slope=axisZ/max(.0001,height);
 float tip=(.13+.035*dot(cycle,axis))*growth*min(1.,5./uStructureB.x);
 float stem=(length(vec3(q.xy-axis*tip*slope*slope,q.z-axisZ))-radius*(.24+.24*pow(1.-slope,2.)))*.71;
 vec3 tipPoint=vec3(q.xy-axis*(tip+(q.z-height)*.23),(q.z-height)*1.12);
 float bowl=length(tipPoint)-cap;
 float aperture=opening*clamp(growth*3.5,0.,1.);
 float innerCut=-length(tipPoint-vec3(0.,0.,cap*.36))+cap*(.12+.82*aperture);
 float cavity=aperture<=.001?bowl:max(bowl,innerCut);
 float stemFloor=aperture<=.001?stem:max(stem,innerCut*.71);
 return min(growth>.005?stemFloor:10.,cavity*.78);
}
#endif
#ifdef FAN_FIELD
uniform vec4 uFanAxes[20],uFanProfiles[20];
void drapeProfile(float t,float phase,out vec2 centre,out float angle,out float curvature,out float waist){
 centre=vec2((.12+.25*abs(uStructureE.y))*sin(t*2.6+phase)*(.5+.5*min(1.,abs(t))),.14*sin(t*2.7-phase)*(1.+.4*uStructureG.z));
 angle=t*(.65+1.7*uStructureG.y)+(.42+.9*abs(uStructureE.y))*atan(t*2.8)+.22*sin(phase+t*2.1)+.5*uStructureF.y*sin(phase-t);
 float side=t/sqrt(.06+t*t);curvature=(.35+3.3*uStructureE.z)*side+.32*uStructureE.y+.15*sin(phase+t*3.);
 waist=.28+(.5+uStructureD.x*.45)*(1.-exp(-t*t*4.))*(1.+.13*t/sqrt(.111+t*t));
}
float drapeHeight(float across,float t,float waist,float phase){
 float radial=length(vec2(across/waist,t)),edge=clamp((radial-.35)/.65,0.,1.);
 return uStructureE.z*.5*(.65*sin(across*(4.1+uStructureC.w*.22)/waist+phase-t*2.)+.35*sin(t*9.-phase+across/waist))*(.5+.5*min(1.,abs(t)*2.))
  +uStructureG.w*.5*edge*sin(across*23.+t*13.-phase);
}
vec4 drapeCoordinates(vec3 p){
 float phase=uStructureF.z*6.28318530718,t=p.y/1.12,angle,curvature,waist;vec2 centre;drapeProfile(t,phase,centre,angle,curvature,waist);
 float c=cos(angle),s=sin(angle);vec2 q=p.xz-centre;float planeX=c*q.x+s*q.y,planeZ=-s*q.x+c*q.y;
 float denominator=1.-curvature*planeZ,bendRadius=length(vec2(curvature*planeX,denominator)),ratio=denominator>0.?curvature*planeX/denominator:1.,v2=ratio*ratio;
 float across=denominator>0.&&abs(ratio)<.2?planeX/denominator*(1.-v2*(1./3.-v2*(1./5.-v2/7.))):atan(curvature*planeX,denominator)/curvature,normal=(2.*planeZ-curvature*(planeX*planeX+planeZ*planeZ))/(1.+bendRadius);
 return vec4(across/waist,t,normal-drapeHeight(across,t,waist,phase),waist);
}
vec3 drapePoint(vec2 uv,float normalOffset){
 float phase=uStructureF.z*6.28318530718,angle,k,waist;vec2 centre;drapeProfile(uv.y,phase,centre,angle,k,waist);
 float across=uv.x*waist,n=drapeHeight(across,uv.y,waist,phase)+normalOffset,a=k*across,a2=a*a;bool small=abs(a)<.2;float sinc=small?1.-a2*(1./6.-a2*(1./120.-a2/5040.)):sin(a)/a,si=a*sinc,co=small?1.-a2*(.5-a2*(1./24.-a2/720.)):cos(a),x=across*sinc-n*si,z=(small?.5*k*across*across*(1.-a2*(1./12.-a2*(1./360.-a2/20160.))):2.*pow(sin(a*.5),2.)/k)+n*co,c=cos(angle),s=sin(angle);
 return vec3(centre.x+c*x-s*z,uv.y*1.12,centre.y+s*x+c*z);
}
float drapeField(vec3 p){
 vec4 q=drapeCoordinates(p);float radial=length(q.xy),edge=clamp((radial-.35)/.65,0.,1.);
 float phase=uStructureF.z*6.28318530718,edgeAngle=atan(q.y,q.x),edgeWave=uStructureE.z*(.36*sin(edgeAngle*7.+phase)+.15*sin(edgeAngle*4.-phase));
 float outline=(radial-1.-edgeWave)*min(.36,q.w),thickness=uStructureA.y*(.22-.16*uStructureH.x*edge);
 return max(outline,abs(q.z)-thickness)*.43;
}
float fanDrapeBlend(){return smoothstep(.3,.95,uFanBias)*(1.-smoothstep(4.,8.,uStructureC.w));}
vec4 fanDrapeCoordinates(vec3 p){
 float blend=fanDrapeBlend();if(blend<=0.)return vec4(p,1.);
 float size=sqrt(blend);vec4 q=drapeCoordinates(p/size);q.zw*=size;return q;
}
${FAN_COMPONENT_GLSL}

vec3 structureUnwarpFan(vec3 q,out float residual,out bool unique){
 float angle=length(q.xy)>1e-12?atan(q.y,q.x):0.,envelope=1.-uStructureG.x*.62*(.5-.5*cos(angle*uStructureC.w)),rr=length(q.xy)*envelope,k=uStructureF.w*3.14159265359,b=uStructureF.x,g=1.+uStructureE.x,lo=rr*(g-abs(b)),hi=rr*(g+abs(b)),r=rr*g,minSin=min(sin(lo*k),sin(hi*k)),maxSin=max(sin(lo*k),sin(hi*k));
 if(ceil((lo*k-4.71238898038)/6.28318530718)<=floor((hi*k-4.71238898038)/6.28318530718))minSin=-1.;
 if(ceil((lo*k-1.57079632679)/6.28318530718)<=floor((hi*k-1.57079632679)/6.28318530718))maxSin=1.;
 unique=abs(uStructureFan-1.)<1e-8&&1.+rr*b*k*(b>=0.?minSin:maxSin)>1e-4;
 if(b!=0.){if(unique){for(int i=0;i<32;i++){r=(lo+hi)*.5;if(r-rr*(g+b*cos(r*k))>0.)hi=r;else lo=r;}r=(lo+hi)*.5;}else{for(int stage=1;stage<=8;stage++)for(int j=0;j<4;j++){float breath=b*float(stage)/8.,f=r-rr*(g+breath*cos(r*k)),d=1.+rr*breath*k*sin(r*k);if(abs(d)>.08)r=clamp(r-f/d,lo,hi);}}}
 float a=angle+uStructureG.y*2.8*rr+uStructureG.z*q.z*2.;vec3 p=vec3(cos(a)*r,sin(a)*r,q.z);
 if(unique)for(int j=0;j<3;j++){vec2 error=structureWarp(p).xy-q.xy;if(length(error)<.000001)break;float e=.0005*max(1.,length(p.xy));vec2 dx=(structureWarp(p+vec3(e,0.,0.)).xy-structureWarp(p-vec3(e,0.,0.)).xy)/(2.*e),dy=(structureWarp(p+vec3(0.,e,0.)).xy-structureWarp(p-vec3(0.,e,0.)).xy)/(2.*e);float determinant=dx.x*dy.y-dy.x*dx.y;if(abs(determinant)<.00001)break;p.xy-=vec2(dy.y*error.x-dy.x*error.y,-dx.y*error.x+dx.x*error.y)/determinant;}
 residual=length(structureWarp(p)-q);return p;
}
float drapeForwardCondition(vec2 uv,float normalOffset){
 float phase=uStructureF.z*6.28318530718,angle,k,waist;vec2 centre;drapeProfile(uv.y,phase,centre,angle,k,waist);
 return 1.-k*(drapeHeight(uv.x*waist,uv.y,waist,phase)+normalOffset);
}
vec3 fanGuidePoint(vec2 uv,float normalOffset,int id,out float residual,out bool valid){
 float blend=fanDrapeBlend(),size=sqrt(id==21?blend:1.-blend);bool included=id==21?blend>0.:(id>=0&&id<int(uStructureC.w+.5)&&blend<1.);
 if(!included||size<=0.){residual=10000.;valid=false;return vec3(0.);}
 vec3 raw;vec4 back;if(id==21){raw=drapePoint(uv,normalOffset);back=drapeCoordinates(raw);}else{raw=fanSheetPoint(uv,normalOffset,id);back=fanSheetCoordinates(raw,id);}vec2 correctedUV=uv;float correctedOffset=normalOffset;
 for(int j=0;j<3;j++){float error=max(max(abs(back.x-uv.x),abs(back.y-uv.y)),abs(back.z-normalOffset));if(error<.000001||error>.01)break;correctedUV+=uv-back.xy;correctedOffset+=normalOffset-back.z;if(id==21){raw=drapePoint(correctedUV,correctedOffset);back=drapeCoordinates(raw);}else{raw=fanSheetPoint(correctedUV,correctedOffset,id);back=fanSheetCoordinates(raw,id);}}
 float chartError=max(max(abs(back.x-uv.x),abs(back.y-uv.y)),abs(back.z-normalOffset));bool unique;vec3 p=structureUnwarpFan(raw*size,residual,unique);residual=max(residual,chartError);valid=unique&&residual<.00002&&(id!=21||drapeForwardCondition(uv,normalOffset)>.04);return p;
}
float fanGuideResidual=0.;bool fanGuideValid=false;
vec3 fanGuidePoint(vec2 uv,float normalOffset,int id){return fanGuidePoint(uv,normalOffset,id,fanGuideResidual,fanGuideValid);}

#endif
float structureComponentField(float d,vec3 p){
 float branching=uWeaveNetwork.x*uStructureA.x*uStructureA.z*uStructureA.w;
 float r=length(p),phi=atan(p.y,p.x);
 float thickness=uStructureA.y*(1.-uStructureH.x*.85*min(1.,length(p.xy))),midSurface=d+thickness*.5;
#ifndef WEAVE_NETWORK_ONLY
 bool networkOnly=branching==0.&&uStructureH.y*uStructureA.x*uStructureA.z*uStructureA.w==1.;
 if(networkOnly&&uStructureFan==0.){
  float sprouts=0.,web=0.;
#ifdef WEAVE_DETAIL
  sprouts=uWeaveGrowth.x;web=uWeaveGrowth.z;
#endif
  float baseRadius=max(uStructureA.y*.13,min(uStructureA.y*.36,uStructureB.y*1.25/uStructureB.x));
  float radius=baseRadius*(1.-.52*sprouts),span=web>0.?max(radius*6.,.3*6.28318530718/(uStructureB.x*1.73205080757))*1.2:0.;
  float slack=abs(uStructureB.z)*.42+.01,lower=-(2.3*baseRadius+.16*span+slack),upper=.47*sprouts+.85*radius+2.2*baseRadius+.12*span+slack;
  float empty=max(lower-midSurface,midSurface-upper);
  if(empty>.025)return empty*.45;
 }
 float theta=acos(clamp(p.z/max(r,.000001),-1.,1.)),a=phi*uStructureB.x,b=theta*uStructureB.x;
 float variation=uStructureH.y*sin(theta);
 if(variation>0.&&!networkOnly){
  a+=variation*(2.2*sin(4.*phi+2.3*sin(theta*6.))+1.12*sin(13.*phi-theta*7.));
  b+=variation*(1.9*sin(5.*phi-theta*3.)+1.26*sin(11.*phi+theta*8.));
 }
#endif
#ifdef FAN_FIELD
 if(uStructureFan>0.){
  d=mix(d,fanField(p),uStructureFan);
  midSurface=mix(midSurface,d,uStructureFan);
 }
#endif
 float sourceField=d;
 if(uStructureA.x>0.)d=max(d,-d-thickness-(1.-thickness)*(1.-uStructureA.x));
#ifndef WEAVE_NETWORK_ONLY
 if(uStructureA.z>0.&&branching<1.){
  float width=mix(1.,uStructureB.y,uStructureA.z);
  if(!networkOnly){
   float scaleA=1.,scaleB=1.;
#ifdef FAN_FIELD
   float drapeBlend=uStructureFan*fanDrapeBlend();
   if(drapeBlend>0.){
    vec4 q=fanDrapeCoordinates(p);a=mix(a,q.x*uStructureB.x*3.14159265359,drapeBlend);b=mix(b,q.y*uStructureB.x*3.14159265359,drapeBlend);
    scaleA=mix(1.,clamp(q.w*.18,.02,.1),drapeBlend);scaleB=mix(1.,.2*sqrt(fanDrapeBlend()),drapeBlend);
   }
#endif
   float warp=(abs(sin(a*.5))-width)/uStructureB.x*2.*scaleA,weft=(abs(sin(b*.5))-width*uStructureA.w)/uStructureB.x*2.*scaleB;
   d=max(d,uStructureA.w>0.?min(warp,weft):warp);
   float junction=pow((.5+.5*cos(a))*(.5+.5*cos(b)),3.);
   d+=uStructureA.z*(uStructureB.z*cos(a)*cos(b)*cos(uStructureF.z*6.28318530718)-uStructureH.z*uStructureA.w*junction*.095);
  }
  float sprouts=0.,web=0.;
#ifdef WEAVE_DETAIL
  sprouts=uWeaveGrowth.x*uStructureA.w*uStructureA.z;web=uWeaveGrowth.z;
#endif
  if((uStructureH.y>0.||sprouts>0.||web>0.)&&uStructureA.x>0.){
   float shift;vec2 edgeNormal,nodeChart,chart;mat2 metric=weaveMetric(phi,theta,r,chart);
   vec4 site=weaveSite(chart,0.,shift,edgeNormal,nodeChart);
   float edgeSlope=length(vec2(metric[1][1]*edgeNormal.x-metric[0][1]*edgeNormal.y,-metric[1][0]*edgeNormal.x+metric[0][0]*edgeNormal.y))/determinant(metric);
   float baseRadius=max(thickness*.13,min(thickness*.36,width*1.25/uStructureB.x)),radius=baseRadius*(1.-.52*sprouts);
   float z=midSurface-uStructureB.z*.42*sin(phi*4.+theta*3.+uStructureF.z*6.28318530718);
   float ribs=length(vec2(z,site.x/max(.1,edgeSlope)))-radius;
   float growth=uStructureH.z,node=10.,sprout=10.,membrane=10.;
   vec2 growthCycle=vec2(sin(uStructureF.z*6.28318530718),cos(uStructureF.z*6.28318530718));
   for(int corner=0;corner<int(min(uRuntime.z+uRuntime.w,2.));corner++){
    if(corner==1)site=weaveSite(chart,1.,shift,edgeNormal,nodeChart);
    vec3 q=vec3(site.yz,z);float turn=site.w;
    vec2 nodeAngle=weaveNodeAngles(nodeChart),sine=sin(nodeAngle),cosine=cos(nodeAngle);
    vec3 physical=vec3(dot(p.xy,vec2(-sine.x,cosine.x)),cosine.y*dot(p.xy,vec2(cosine.x,sine.x))-sine.y*p.z,q.z);
    node=min(node,length(physical)-radius*(.86+.35*growth));
#ifdef WEAVE_DETAIL
   if(uStructureA.w>0.&&(growth>0.||sprouts>0.||web>0.)){
    if(web>0.)membrane=min(membrane,weaveSaddle(q,radius,web*(1.-.38*sprouts),shift,turn));
    if((growth>.05||sprouts>0.)&&length(physical.xy)<radius*2.2+baseRadius*2.2+.17*sprouts+.03&&q.z>-baseRadius*2.3){
     vec2 unusedChart;mat2 nodeMetric=weaveMetric(nodeAngle.x,nodeAngle.y,1.,unusedChart);
     for(int i=0;i<int(min(uRuntime.z*3.+uRuntime.w,6.));i++){
      float index=float(i),angle=turn+mod(index,3.)*6.28318530718/3.+.3*sin(index*1.7+shift*4.),offset=radius*(.65+floor(index/3.)*1.55);
      float budRadius=baseRadius*(1.05+.4*pow(sin(index*2.17+shift*5.),2.))*(.3+.7*growth);
      float localGrowth=sprouts*(.36+.64*shift)*(i<3?1.:.47);
      vec2 direction=normalize(nodeMetric*vec2(cos(angle),sin(angle)));
      vec3 root=vec3(direction*offset,radius*(.7+.12*sin(index*1.91+shift*6.)));
      sprout=min(sprout,weaveSprout(physical-root,growthCycle,shift,direction,budRadius,localGrowth,uWeaveGrowth.y));
     }
    }
   }
#endif
   }
   d=mix(d,min(ribs,node),uStructureH.y*uStructureA.x*uStructureA.z*uStructureA.w);
   d=mix(d,min(d,sprout),min(1.,3.*(growth+sprouts))*uStructureA.x*uStructureA.w*uStructureA.z);
   d=mix(d,min(d,membrane),min(1.,1.45*web)*uStructureA.x*uStructureA.w*uStructureA.z);
  }
 }
#endif
#if defined(WEAVE_DETAIL) && !defined(WEAVE_BANDS_ONLY)
 if(branching>0.)d=mix(d,weaveNetworkField(sourceField,p,thickness),branching);
#endif
 if(uStructureB.w>0.)d=max(d,(abs(sin(p.z*uStructureC.x*3.14159265359))-mix(1.,uStructureC.y,uStructureB.w))/(uStructureC.x*3.14159265359));
 float separation=uStructureC.z*(1.-uStructureFan);
 if(separation>0.)d=max(d,(abs(sin(phi*uStructureC.w*.5))-mix(1.,uStructureD.x,separation))*length(p.xy)/uStructureC.w);
 if(uStructureD.y>0.)d=max(d,(abs(sin(r*uStructureD.z*3.14159265359))-mix(1.,uStructureD.w,uStructureD.y))/(uStructureD.z*3.14159265359));
 return d;
}
float structureField(float d,vec3 p){
#ifdef FAN_FIELD
 // A single callsite avoids duplicating the complete network evaluator in
 // both the component loop and the ordinary union path during compilation.
 int requested=fanQuery,count=int(uStructureC.w+.5);
 bool separate=uStructureFan>0.&&uStructureA.x>0.&&requested<0;
 float result=10000.;int iterations=separate?count+2:1;
 for(int slot=0;slot<iterations;slot++){
  if(separate){int id=slot<count?slot:20+slot-count;if(!fanComponentIncluded(id))continue;fanQuery=id;}
  result=min(result,structureComponentField(d,p));
 }
 fanQuery=requested;return result;
#else
 return structureComponentField(d,p);
#endif
}

`;
export function structurePanel(tab,s,{slider,details,section}){
 const sliders=keys=>keys.map(k=>slider(k)).join('');
 if(tab==='shape')return filamentPanel(tab,s,{slider,details})+ details('Curve toroidali e nodi',sliders(['loopAmount','loopRadius','loopTube','loopKnot','loopTurns','loopFlat','loopTwist','loopWave'])+'<p class="help">Apertura 0 mantiene la forma iniziale; 1 la trasforma in un anello. Intreccio separa il percorso. Avvolgimenti aumenta le ripiegature del nodo. Appiattimento e torsione modellano il nastro. Spessore elevato può unire i passaggi del nodo.</p>')+section('Proprietà',(s.structureOriginal?'<p class="help">La struttura precedente è stata adattata alle proprietà comuni. Il risultato può cambiare; i dati originali sono conservati nel preset.</p><button class="quiet" data-structure-original="true">Scarica anche il preset originale</button>':'')+'<p class="help">Combina le proprietà sulla forma attuale. Profilo, ritagli e materia restano attivi.</p>')
 +details('Guscio e spessore',sliders(['structShell','structThickness','structTaper']))
 +details('Reticolo di fibre',sliders(['structFibres','structWeft','structWeaveBranching'])+details('Trama e giunzioni',sliders(['structDensity','structThreadWidth','structWeave','structWeaveVariation','structWeaveNodes','structWeaveMembrane','structWeaveFinesse']))+details('Steli e coppe',sliders(['structWeaveGrowth','structWeaveReach','structWeaveRelease','structWeaveCup'])+'<p class="help">I noduli crescono dalle giunzioni. Puoi far ritirare i ponti mentre gli steli crescono e le coppe si aprono.</p>')+'<p class="help">Svuotamento, fibre e tessitura aprono la forma. La ramificazione modifica i ponti e le giunzioni.</p>')
 +details('Suddivisione radiale e strati',sliders(['structFan','structFanBias','structScallop','structPetalCount','structRadial','structPetalWidth','structSlices','structSliceCount','structSliceWidth','structLayers','structLayerCount','structLayerWidth'])+'<p class="help">Lamine curve apre la forma in fogli sovrapposti. Larghezza, sfasamento e arricciamento ne cambiano i lembi. Gli strati interni diventano visibili con trasparenza o ritagli.</p>')
 +details('Piegatura e curvatura',sliders(['structGrowth','structCurl','structSpiral','structStagger','structFold','structFoldCount','structRuffle'])+'<p class="help">La posa e la sua animazione si regolano in Movimento. Trasparenza e rifrazione sono in Materia.</p>');
 if(tab==='color')return filamentPanel(tab,s,{slider,details})+ details('Fasce dell’anello',sliders(['loopBands','loopBandCount','loopBandAxis'])+'<p class="help">L’orientamento passa da fasce trasversali a strisce che seguono il percorso. Aumenta Apertura ad anello in Forma.</p>')+details('Nucleo scuro',sliders(['structCoreDark','structCoreRadius'])+(s.engine==='particles'?'<p class="help">Scurisce granelli e fili vicino all’asse centrale della forma, anche con pellicola e riflessi attivi. Estensione regola l’area; non aggiunge una sfera piena fra i granelli.</p>':''));
 if(tab==='motion')return filamentPanel(tab,s,{slider,details})+section('Posa',sliders(STRUCTURE_GROUPS.motion.filter(k=>k!=='loopPhase'&&!k.startsWith('fil')))+'<p class="help">Questi valori definiscono la posa. Apri le rispettive tracce qui sotto per animarla: ogni proprietà ha velocità, verso, fase e ritmo propri.</p>');
 return '';
}

// Old dedicated surfaces are translated once; retain their exact original data.
// This is a geometric adaptation, not a claim of pixel-identical migration.
export function integrateStructure(s){
 if(((s.engine!=='solid'||s.grainSource==='cloud')&&s.pLiving!==4)||!(s.pLiving>0))return s;
 if(!s.structureOriginal){s.structureOriginal=structuredClone(s);delete s.structureOriginal.structureOriginal;}
 const old=s.pLiving,v={...STRUCTURE_DEFAULTS,structShell:1,structThickness:.065,structFold:Math.min(.4,s.pFoldDepth||0),structFoldCount:s.pFoldCount||5};
 if(old===1||old===2){v.structFibres=1;v.structWeft=old===2?(s.pWeft??.65):0;v.structDensity=Math.max(6,Math.min(48,Math.round(Math.sqrt(s.pStrands||256)*1.4)));v.structThreadWidth=Math.max(.15,Math.min(.9,(s.pThreadWidth||.5)*.6));}
 if(old===4){const t=s.pVeilFromForm?s.pVeilMorph??1:1;Object.assign(v,{structShell:t,structRadial:(s.pVeilStyle<.5?.8:.15)*t,structSlices:(s.pVeilStyle>1.5?.95:0)*t,structLayers:(s.pVeilStyle>=.5&&s.pVeilStyle<=1.5?.95:0)*t,structPetalCount:Math.max(3,Math.min(20,s.pVeilLayers||6)),structSliceCount:Math.max(2,Math.min(12,s.pVeilLayers||6)),structCurl:(s.pVeilTwist||0)*.4*t,structFold:(s.pVeilRipple||0)*t,structCoreDark:(s.pVeilCoreDark||0)*t,structCoreRadius:Math.max(.05,s.pVeilCoreRadius||.3),structGrowth:(s.pVeilSpread||0)*.4*t});}
 Object.assign(s,v,{engine:'solid',pLiving:0,renderVersion:2});
 if(s.motions){
  const breathe=old===4?(s.pVeilBreath||0):Math.min(.3,(s.pInflate||0)*.5+(s.pContract||0)*.2);
  if(breathe>0&&s.motions.structBreath)Object.assign(s.motions.structBreath,{enabled:true,amplitude:Math.min(.3,breathe),cycles:Math.max(1,Math.round(old===4?s.pVeilCycles||1:s.pCycles||1)),pace:old===4?s.pVeilRhythm||0:s.pRhythm||0});
  if(old===4){
   const morph=s.motions.pVeilMorph;
   if(morph?.enabled){for(const [k,amount] of [['structShell',1],['structRadial',.65],['structCurl',.5],['structGrowth',.3]])if(s.motions[k])s.motions[k]={...morph,amplitude:morph.amplitude*amount};}
   if(s.motions.pVeilSpread?.enabled&&s.motions.structGrowth)s.motions.structGrowth={...s.motions.pVeilSpread,amplitude:s.motions.pVeilSpread.amplitude*.4};
   if(s.motions.pVeilStyle?.enabled&&s.motions.structLayers)s.motions.structLayers={...s.motions.pVeilStyle,amplitude:Math.min(1,s.motions.pVeilStyle.amplitude*.5)};
   for(const k of ['pVeilMorph','pVeilStyle','pVeilSpread'])if(s.motions[k])s.motions[k].enabled=false;
   if((s.pVeilFlow||0)>0&&s.motions.structFlowPhase)Object.assign(s.motions.structFlowPhase,{enabled:true,mode:'cycle',cycles:Math.max(1,Math.round(s.pVeilCycles||1))});
  }
 }

 return s;
}
