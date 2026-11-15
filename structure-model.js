import {FILAMENT_DEFAULTS,FILAMENT_META,FILAMENT_TRACKS,filamentPanel} from './filament-model.js?v=0049c9863913';
// Composable properties of the existing implicit form. Zero amounts are identity.
export const STRUCTURE_DEFAULTS={
 ...FILAMENT_DEFAULTS,
 loopAmount:0,loopKnot:0,loopTurns:3,loopRadius:.8,loopTube:.22,loopFlat:0,loopTwist:0,loopWave:0,loopPhase:0,loopBands:0,loopBandCount:6,loopBandAxis:0,
 structShell:0,structThickness:.09,structFibres:0,structWeft:0,structDensity:20,structThreadWidth:.32,structWeave:0,structWeaveVariation:0,structWeaveNodes:0,structWeaveMembrane:0,structWeaveGrowth:0,structWeaveCup:.65,
 structSlices:0,structSliceCount:6,structSliceWidth:.24,structRadial:0,structFan:0,structFanBias:0,structPetalCount:8,structPetalWidth:.45,
 structLayers:0,structLayerCount:3,structLayerWidth:.22,
 structGrowth:0,structCurl:0,structFold:0,structFoldCount:5,structBreath:0,structFlap:0,structFlowPhase:0,structDelay:.35,
 structScallop:0,structSpiral:0,structStagger:0,structRuffle:0,structTaper:0,
 structCoreDark:0,structCoreRadius:.3
};
export const STRUCTURE_META={
 ...FILAMENT_META,
 loopBands:['Intensità fasce',0,1,.01],loopBandCount:['Ripetizioni delle fasce',1,36,1],loopBandAxis:['Orientamento delle fasce',0,1,.01],
 loopAmount:['Apertura ad anello',0,1,.01],loopKnot:['Intreccio del nodo',0,1,.01],loopRadius:['Raggio del percorso',.6,1.6,.01],loopTube:['Spessore del tubo',.06,.6,.005],loopFlat:['Appiattimento a nastro',0,1,.01],loopTwist:['Torsione del nastro',-2,2,.01],loopWave:['Variazione di spessore',0,.35,.005],loopPhase:['Scorrimento',0,1,.001],
 loopTurns:['Avvolgimenti del nodo',3,11,2],
 structShell:['Svuotamento · pieno → membrana',0,1,.01],structThickness:['Spessore della membrana',.035,.4,.005],
 structFibres:['Separazione in fibre',0,1,.01],structWeft:['Fili trasversali · tessitura',0,1,.01],structDensity:['Fili intorno alla forma',6,48,1],structThreadWidth:['Larghezza dei fili',.15,.9,.01],structWeave:['Intreccio sopra / sotto',0,.16,.005],
 structWeaveVariation:['Irregolarità del reticolo',0,1,.01],structWeaveNodes:['Rilievo alle giunzioni',0,1,.01],structWeaveMembrane:['Membrana fra i rami',0,1,.01],structWeaveGrowth:['Crescita degli steli',0,1,.01],structWeaveCup:['Apertura delle coppe',0,1,.01],
 structSlices:['Separazione in lamelle',0,1,.01],structSliceCount:['Numero di lamelle',2,12,1],structSliceWidth:['Spessore relativo delle lamelle',.12,.85,.01],structFan:['Lamine curve',0,1,.01],structFanBias:['Apertura in due direzioni',0,1,.01],
 structRadial:['Separazione radiale',0,1,.01],structPetalCount:['Divisioni radiali',3,20,1],structPetalWidth:['Larghezza delle divisioni',.1,.95,.01],
 structLayers:['Gusci concentrici',0,1,.01],structLayerCount:['Numero di strati concentrici',2,6,1],structLayerWidth:['Spessore relativo degli strati',.15,.85,.01],
 structGrowth:['Espansione radiale',0,.8,.01],structCurl:['Arricciamento dal centro',-1,1,.01],structFold:['Ampiezza delle pieghe',0,.4,.01],structFoldCount:['Pieghe intorno alla forma',1,12,1],
 structBreath:['Dilatazione radiale',-.3,.3,.01],structFlap:['Flessione delle lamine',-.6,.6,.01],structFlowPhase:['Fase delle pieghe',0,1,.001],structDelay:['Sfasamento radiale',0,1,.01],
 structScallop:['Arrotondamento dei petali',0,1,.01],structSpiral:['Avvolgimento a spirale',-1,1,.01],structStagger:['Sfasamento fra le lamine',0,1,.01],structRuffle:['Ondulazione fine dei bordi',0,.15,.005],structTaper:['Assottigliamento verso il bordo',0,1,.01],
 structCoreDark:['Oscurità del nucleo',0,1,.01],structCoreRadius:['Estensione del nucleo',.05,.8,.01]
};
export const STRUCTURE_GROUPS={shape:Object.keys(STRUCTURE_DEFAULTS).filter(k=>!['filPhase','filWind','filColor','filColorScatter','filRootShade','filBaseBlend','filPulse','filPulseCycles','filPulseWidth','loopBands','loopBandCount','loopBandAxis','loopPhase','structBreath','structFlap','structFlowPhase','structDelay','structCoreDark','structCoreRadius'].includes(k)),motion:['filPhase','filWind','filPulse','filPulseCycles','filPulseWidth','loopPhase','structBreath','structFlap','structFlowPhase','structDelay'],color:['filColor','filColorScatter','filRootShade','filBaseBlend','loopBands','loopBandCount','loopBandAxis','structCoreDark','structCoreRadius']};
export const STRUCTURE_TRACKS={...FILAMENT_TRACKS,...Object.fromEntries(['loopAmount','loopKnot','loopRadius','loopTube','loopFlat','loopTwist','loopWave','loopPhase','loopBandAxis','structShell','structFibres','structWeft','structSlices','structRadial','structFan','structFanBias','structLayers','structGrowth','structCurl','structFold','structBreath','structFlap','structFlowPhase','structScallop','structSpiral','structStagger','structRuffle','structWeaveMembrane','structWeaveGrowth','structWeaveCup'].map(k=>[k,[STRUCTURE_META[k][0],0,k==='structBreath'?.3:k==='structFlap'?.6:k==='structFold'?.4:k==='loopTwist'?2:k==='loopWave'?.35:k==='loopTube'?.6:1,.01]]))};
export const STRUCTURE_FIELD_KEYS=Object.keys(STRUCTURE_DEFAULTS).filter(k=>!k.startsWith('structCore')&&!k.startsWith('fil')&&!k.startsWith('loopBand'));
export function hasStructure(s){return ['loopAmount','structShell','structFibres','structSlices','structRadial','structFan','structLayers','structGrowth','structCurl','structFold','structBreath','structFlap','structScallop','structSpiral','structStagger','structRuffle'].some(k=>Math.abs(s[k]||0)>1e-6);}
export function structureMayChange(s){return hasStructure(s)||STRUCTURE_FIELD_KEYS.some(k=>s.motions?.[k]?.enabled&&(s.motions[k].amplitude||s.motions[k].mode==='cycle'));}
export function structureBounds(s){return Math.max(1,(s.loopAmount||0)>0?(s.loopRadius??.8)+.36*(s.loopKnot||0)+(s.loopTube??.22)*(1+(s.loopWave||0)):1)*(1+Math.abs(s.structGrowth||0)+Math.abs(s.structBreath||0)+.64*(s.structWeaveGrowth||0)*(s.structWeft||0)*(s.structFibres||0)+.96*(s.structFan||0))*(1+Math.abs(s.structCurl||0)+Math.abs(s.structFold||0)+Math.abs(s.structFlap||0)+Math.abs(s.structRuffle||0)*2+Math.abs(s.structStagger||0)*.6);}
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
 q[2]-=falloff*(v.structCurl+v.structFold*Math.sin(a*v.structFoldCount+phase-rr*v.structDelay*Math.PI)+v.structFlap*Math.cos(rr*v.structDelay*Math.PI));
 q[2]-=falloff*(v.structStagger*.6*Math.sin(angle*v.structPetalCount+rr*2+phase)+v.structRuffle*Math.sin(angle*(v.structPetalCount*3)+phase-rr*6));
 return q;
}

// The saddle widens the junction into the branch axes. Two offset families
// of fibres open small pores without breaking the network's main ribs.
function weaveSaddle(x,y,z,radius,amount,shift){
 const span=radius*(1.8+4.9*amount)*(1+.23*shift);
 const extent=(Math.abs(x)*.85+Math.abs(y)+2.1*Math.sqrt(Math.abs(x*y)))/span;
 const height=radius*.23+(.23*x*x-.39*y*y)/Math.max(.035,span);
 const membrane=Math.max((extent-1)*span*.48,Math.abs(z-height)-Math.max(.007,radius*.205)*(1-.23*Math.min(1,extent)));
 const frequency=12/Math.max(.045,span),u=x*frequency,v=y*frequency;
 const first=Math.abs(Math.sin(u+.66*v+1.08*Math.sin(v*.36+shift*2.)));
 const second=Math.abs(Math.sin(-u*.63+v+.95*Math.sin(u*.42-shift*4.)));
 const fibres=(Math.min(first,second)-.34-.34*amount)/frequency;
 return Math.max(membrane,fibres);
}

// A raised junction is a tapered stem bent in its tangent plane, with a
// hollow ellipsoidal tip. The same field is sampled by geometry and granules.
function weaveSprout(x,y,z,phase,shift,turn,radius,growth,opening){
 const height=growth*(.21+.23*shift),hub=radius*(1.25+.35*shift),cap=hub*(.68+.24*growth+.39*opening*growth);
 const axisZ=Math.max(0,Math.min(height,z)),slope=axisZ/Math.max(.0001,height);
 const swing=(.12+.04*Math.sin(phase+turn))*growth*slope*slope,dx=Math.cos(turn),dy=Math.sin(turn);
 const stem=(Math.hypot(x-dx*swing,y-dy*swing,z-axisZ)-hub*(.31+.28*(1-slope)**3))*.71;
 const tip=(.12+.04*Math.sin(phase+turn))*growth;
 const rx=x-dx*(tip+(z-height)*.27),ry=y-dy*(tip+(z-height)*.27),rz=(z-height)*1.36;
 const bowl=Math.hypot(rx,ry,rz)-cap;
 const cavity=opening*growth<=.001?bowl:Math.max(bowl,-Math.hypot(rx,ry,rz-cap*.62)+cap*(.32+.49*opening*growth));
 return Math.min(stem,Math.max(cavity,z-height-cap*(.57-.25*opening*growth))*.71);
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
  const foldedAngle=Math.PI*(.5+side)+(rank-.5)*(1.37+s.structStagger*.36)+side*.17;
  const angle=uniformAngle+(foldedAngle-uniformAngle)*s.structFanBias+s.structStagger*(variant*.42+.18*Math.sin(localPhase));
  const reach=(1+variant*(.12+s.structStagger*.38))*(1+s.structFanBias*(.26-.55*rank+.13*lift));
  const width=(.31+s.structPetalWidth*.52)*(1-.5*s.structRadial)*(1+lift*.24*s.structStagger)*(1+s.structFanBias*(.28-.36*rank));
  axes.push(Math.cos(angle),Math.sin(angle),reach,width);
  profiles.push(s.structSpiral*.43+.16*lift,lift*.18+s.structFanBias*(rank-.45)*.58,variant,localPhase);
 }
 return {axes,profiles};
}
let lastFanProfileKey='',lastFanProfile;
function fanData(s,phase){
 const key=[s.seed,s.structPetalCount,s.structPetalWidth,s.structRadial,s.structStagger,s.structSpiral,s.structFanBias,phase].join(':');
 if(key!==lastFanProfileKey){lastFanProfileKey=key;lastFanProfile=fanProfile(s,phase);}
 return lastFanProfile;
}
function fanField(s,p,phase){
 const {axes,profiles}=fanData(s,phase);
 let distance=Math.max(Math.hypot(p[0],p[1])-.115*(1-s.structFanBias*.82),Math.abs(p[2])-s.structThickness*.58);
 for(let index=0;index<axes.length;index+=4){
  const c=axes[index],t=axes[index+1],reach=axes[index+2],halfWidth=axes[index+3];
  const offset=profiles[index],lift=profiles[index+1],variant=profiles[index+2],localPhase=profiles[index+3];
  const u=c*p[0]+t*p[1],v=-t*p[0]+c*p[1],along=Math.max(0,Math.min(1.2,u/reach)),across=v-along*along*offset;
  const outline=(Math.hypot((u-.56*reach)/(.61*reach),across/halfWidth)-1)*halfWidth
   +s.structFanBias*s.structRuffle*(.43*Math.sin(u*23+across*31+localPhase)+.19*Math.sin(u*62-across*51+localPhase*2));
  const sheet=along*(lift+Math.sin(localPhase-along*2.4)*s.structFlap*.42)+across*along*(.8*variant+s.structCurl*.74)+across*across*(.45+.26*variant);
  const edge=Math.max(0,Math.min(1,1+outline/(.6*halfWidth)));
  const thickness=s.structThickness*(.33-.25*s.structTaper*edge);
  distance=Math.min(distance,Math.max(outline,Math.abs(p[2]-sheet)-thickness)*.59);
 }
 return distance;
}
export function structureField(s,d,p){
 const v={...STRUCTURE_DEFAULTS,...s},r=Math.hypot(...p),phi=Math.atan2(p[1],p[0]),theta=Math.acos(Math.max(-1,Math.min(1,p[2]/Math.max(r,1e-6)))),tau=Math.PI*2;
 let a=phi*v.structDensity,b=theta*v.structDensity;
 const phase=v.structFlowPhase*tau,variation=v.structWeaveVariation*Math.sin(theta);
 if(variation>0){
  a+=variation*(2.2*Math.sin(4*phi+2.3*Math.sin(theta*6))+1.12*Math.sin(13*phi-theta*7));
  b+=variation*(1.9*Math.sin(5*phi-theta*3)+1.26*Math.sin(11*phi+theta*8));
 }
 const thickness=v.structThickness*(1-v.structTaper*.85*Math.min(1,Math.hypot(p[0],p[1])));
 let midSurface=d+thickness*.5;
 if(v.structShell>0)d=Math.max(d,-d-thickness-(1-thickness)*(1-v.structShell));
 if(v.structFan>0){
  const baseline=Math.max(d,-d-(1-v.structFan));
  d=baseline+(fanField(v,p,phase)-baseline)*v.structFan;
  midSurface+=(d-midSurface)*v.structFan;
 }
 if(v.structFibres>0){
  const width=1+(v.structThreadWidth-1)*v.structFibres,warp=(Math.abs(Math.sin(a*.5))-width)/v.structDensity*2;
  const weft=(Math.abs(Math.sin(b*.5))-width*v.structWeft)/v.structDensity*2;
  d=Math.max(d,v.structWeft>0?Math.min(warp,weft):warp);
  const junction=Math.pow((.5+.5*Math.cos(a))*(.5+.5*Math.cos(b)),3);
  d+=v.structFibres*(v.structWeave*Math.cos(a)*Math.cos(b)*Math.cos(phase)-v.structWeaveNodes*v.structWeft*junction*.095);
  const sprouts=v.structWeaveGrowth*v.structWeft*v.structFibres;
  if((v.structWeaveVariation>0||sprouts>0||v.structWeaveMembrane>0)&&v.structShell>0){
   const across=warp+width/v.structDensity*2,along=weft+width*v.structWeft/v.structDensity*2;
   const radius=Math.max(thickness*.16,Math.min(thickness*.68,width*1.8/v.structDensity));
   const ribs=Math.hypot(midSurface,across)-radius;
   const cross=v.structWeft>0?Math.hypot(midSurface,along)-radius*v.structWeft:10;
   let node=10,sprout=10,membrane=10;
   if(v.structWeft>0&&(v.structWeaveNodes>0||sprouts>0||v.structWeaveMembrane>0)){
    const growth=v.structWeaveNodes,cellA=Math.floor(a/tau+.5),cellB=Math.floor(b/tau+.5);
    const x=(a-cellA*tau)/v.structDensity,y=(b-cellB*tau)/v.structDensity,z=midSurface;
    const shift=.5+.5*Math.sin(23.71*cellA+16.13*cellB),space=radius*(.82+.34*shift);
    node=Math.hypot(z,x,y)-radius*(.96+.32*growth);
    const web=v.structWeaveMembrane;
    if(web>0)membrane=weaveSaddle(x,y,z,radius,web,shift);
    if(web>0&&growth>.2&&Math.abs(x)+Math.abs(y)<radius*5){
     const spawn=radius*(.32+.33*growth);
     for(let index=0;index<6;index++){
      const angle=index*2.39996+shift*4,offset=radius*(.62+index*.34);
      const elevation=radius*(.82+.31*Math.sin(index*1.91+shift*6)+sprouts*(1-index*.11));
      const bud=Math.hypot(x-Math.cos(angle)*offset,y-Math.sin(angle)*offset*.84,z-elevation)-spawn*(1-.06*index)*web;
      node=Math.min(node,bud);
     }
    }
    if(growth>.25&&Math.abs(x)+Math.abs(y)<radius*5){
     const buds=Math.min(
      Math.hypot(x-space,y+.37*space,z-1.12*space)-radius*(.22+.31*growth),
      Math.hypot(x+.72*space,y-.57*space,z-1.16*space)-radius*(.2+.26*growth),
      Math.hypot(x-.18*space,y-1.06*space,z-.76*space)-radius*(.18+.21*growth),
      Math.hypot(x+.48*space,y+.72*space,z-.99*space)-radius*(.18+.23*growth)
     );
     node+=Math.min(0,buds-node)*Math.min(1,(growth-.25)*4);
    }
    if(sprouts>0&&Math.abs(x)+Math.abs(y)<.33&&z>-.19&&shift>.22){
     const turn=6.13*Math.sin(cellA*62.02+cellB*28.37),localGrowth=sprouts*Math.max(.07,Math.min(1,(shift-.22)*1.8));
     const base=Math.hypot(x*.62,y*.78,z*3.1)-radius*(1.49+localGrowth*.94);
     sprout=Math.min(base,weaveSprout(x,y,z,phase,shift,turn,radius,localGrowth,v.structWeaveCup));
     if(web>0){
      for(let i=0;i<2;i++){
       const branch=turn+(i===0?2.17:4.3),offset=radius*(.67+.27*i);
       const branchGrowth=localGrowth*web*(i===0?.92:.71);
       const stem=weaveSprout(x-Math.cos(branch)*offset,y-Math.sin(branch)*offset,z-radius*.26,phase,1-shift*.58,branch,radius*(1-i*.16),branchGrowth,v.structWeaveCup);
       sprout=Math.min(sprout,stem);
      }
     }
    }
   }
   d+=(Math.min(ribs,cross,node)-d)*v.structWeaveVariation*v.structShell*v.structFibres;
   d+=(Math.min(d,sprout)-d)*Math.min(1,3*sprouts)*v.structShell;
   d+=(Math.min(d,membrane)-d)*Math.min(1,1.45*v.structWeaveMembrane)*v.structShell*v.structWeft*v.structFibres;
  }
 }
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
 p.z-=falloff*(uStructureE.y+uStructureE.z*sin(a*uStructureE.w+phase-rr*uStructureF.w*3.14159265359)+uStructureF.y*cos(rr*uStructureF.w*3.14159265359));
 p.z-=falloff*(uStructureG.z*.6*sin(angle*uStructureC.w+rr*2.+phase)+uStructureG.w*sin(angle*(uStructureC.w*3.)+phase-rr*6.));
 return p;
}
#ifdef WEAVE_DETAIL
float weaveSaddle(vec3 q,float radius,float amount,float shift){
 float span=radius*(1.8+4.9*amount)*(1.+.23*shift);
 vec2 a=abs(q.xy);
 float extent=(a.x*.85+a.y+2.1*sqrt(a.x*a.y))/span;
 float height=radius*.23+(.23*q.x*q.x-.39*q.y*q.y)/max(.035,span);
 float membrane=max((extent-1.)*span*.48,abs(q.z-height)-max(.007,radius*.205)*(1.-.23*min(1.,extent)));
 float frequency=12./max(.045,span);vec2 p=q.xy*frequency;
 float first=abs(sin(p.x+.66*p.y+1.08*sin(p.y*.36+shift*2.)));
 float second=abs(sin(-p.x*.63+p.y+.95*sin(p.x*.42-shift*4.)));
 return max(membrane,(min(first,second)-.34-.34*amount)/frequency);
}
float weaveSprout(vec3 q,float phase,float shift,float turn,float radius,float growth,float opening){
 float height=growth*(.21+.23*shift),hub=radius*(1.25+.35*shift),cap=hub*(.68+.24*growth+.39*opening*growth);
 float axisZ=clamp(q.z,0.,height),slope=axisZ/max(.0001,height);
 vec2 axis=vec2(cos(turn),sin(turn));
 float tip=(.12+.04*sin(phase+turn))*growth;
 float stem=(length(vec3(q.xy-axis*tip*slope*slope,q.z-axisZ))-hub*(.31+.28*pow(1.-slope,3.)))*.71;
 vec3 tipPoint=vec3(q.xy-axis*(tip+(q.z-height)*.27),(q.z-height)*1.36);
 float bowl=length(tipPoint)-cap;
 float cavity=opening*growth<=.001?bowl:max(bowl,-length(tipPoint-vec3(0.,0.,cap*.62))+cap*(.32+.49*opening*growth));
 return min(stem,max(cavity,q.z-height-cap*(.57-.25*opening*growth))*.71);
}
#endif
#ifdef FAN_FIELD
uniform vec4 uFanAxes[20],uFanProfiles[20];
float fanField(vec3 p){
 float d=max(length(p.xy)-.115*(1.-uFanBias*.82),abs(p.z)-uStructureA.y*.58);
 for(int i=0;i<int(uStructureC.w+.5);i++){
  vec4 axis=uFanAxes[i],profile=uFanProfiles[i];
  vec2 plane=vec2(dot(p.xy,axis.xy),dot(p.xy,vec2(-axis.y,axis.x)));
  float reach=axis.z,halfWidth=axis.w,along=clamp(plane.x/reach,0.,1.2);
  float across=plane.y-along*along*profile.x;
  float outline=(length(vec2((plane.x-.56*reach)/(.61*reach),across/halfWidth))-1.)*halfWidth
   +uFanBias*uStructureG.w*(.43*sin(plane.x*23.+across*31.+profile.w)+.19*sin(plane.x*62.-across*51.+profile.w*2.));
  float sheet=along*(profile.y+sin(profile.w-along*2.4)*uStructureF.y*.42)+across*along*(.8*profile.z+uStructureE.y*.74)+across*across*(.45+.26*profile.z);
  float edge=clamp(1.+outline/(.6*halfWidth),0.,1.);
  float thickness=uStructureA.y*(.33-.25*uStructureH.x*edge);
  d=min(d,max(outline,abs(p.z-sheet)-thickness)*.59);
 }
 return d;
}
#endif
float structureField(float d,vec3 p){
 float r=length(p),phi=atan(p.y,p.x),theta=acos(clamp(p.z/max(r,.000001),-1.,1.)),a=phi*uStructureB.x,b=theta*uStructureB.x;
 float variation=uStructureH.y*sin(theta);
 if(variation>0.){
  a+=variation*(2.2*sin(4.*phi+2.3*sin(theta*6.))+1.12*sin(13.*phi-theta*7.));
  b+=variation*(1.9*sin(5.*phi-theta*3.)+1.26*sin(11.*phi+theta*8.));
 }
 float thickness=uStructureA.y*(1.-uStructureH.x*.85*min(1.,length(p.xy)));
 float midSurface=d+thickness*.5;
 if(uStructureA.x>0.)d=max(d,-d-thickness-(1.-thickness)*(1.-uStructureA.x));
#ifdef FAN_FIELD
 if(uStructureFan>0.){
  d=mix(max(d,-d-(1.-uStructureFan)),fanField(p),uStructureFan);
  midSurface=mix(midSurface,d,uStructureFan);
 }
#endif
 if(uStructureA.z>0.){
  float width=mix(1.,uStructureB.y,uStructureA.z),warp=(abs(sin(a*.5))-width)/uStructureB.x*2.;
  float weft=(abs(sin(b*.5))-width*uStructureA.w)/uStructureB.x*2.;
  d=max(d,uStructureA.w>0.?min(warp,weft):warp);
  float junction=pow((.5+.5*cos(a))*(.5+.5*cos(b)),3.);
  d+=uStructureA.z*(uStructureB.z*cos(a)*cos(b)*cos(uStructureF.z*6.28318530718)-uStructureH.z*uStructureA.w*junction*.095);
  float sprouts=0.,web=0.;
#ifdef WEAVE_DETAIL
  sprouts=uWeaveGrowth.x*uStructureA.w*uStructureA.z;web=uWeaveGrowth.z;
#endif
  if((uStructureH.y>0.||sprouts>0.||web>0.)&&uStructureA.x>0.){
   float across=warp+width/uStructureB.x*2.,along=weft+width*uStructureA.w/uStructureB.x*2.;
   float radius=max(thickness*.16,min(thickness*.68,width*1.8/uStructureB.x));
   float ribs=length(vec2(midSurface,across))-radius;
   float crossbar=uStructureA.w>0.?length(vec2(midSurface,along))-radius*uStructureA.w:10.;
   float node=10.,sprout=10.,membrane=10.;
#ifdef WEAVE_DETAIL
   float growth=uStructureH.z;const float tau=6.28318530718;
   if(uStructureA.w>0.&&(growth>0.||sprouts>0.||web>0.)){
    vec2 cell=floor(vec2(a,b)/tau+.5);
    vec3 q=vec3((vec2(a,b)-cell*tau)/uStructureB.x,midSurface);
    float shift=.5+.5*sin(dot(cell,vec2(23.71,16.13))),space=radius*(.82+.34*shift);
    node=length(q)-radius*(.96+.32*growth);
    if(web>0.)membrane=weaveSaddle(q,radius,web,shift);
    if(web>0.&&growth>.2&&abs(q.x)+abs(q.y)<radius*5.){
     float spawn=radius*(.32+.33*growth);
     for(int i=0;i<int(min(uRuntime.z*3.+uRuntime.w,6.));i++){
      float index=float(i),angle=index*2.39996+shift*4.,offset=radius*(.62+index*.34);
      float elevation=radius*(.82+.31*sin(index*1.91+shift*6.)+sprouts*(1.-index*.11));
      vec3 center=vec3(vec2(cos(angle),sin(angle)*.84)*offset,elevation);
      node=min(node,length(q-center)-spawn*(1.-.06*index)*web);
     }
    }
    if(growth>.25&&abs(q.x)+abs(q.y)<radius*5.){
     float buds=min(min(length(q+space*vec3(-1.,.37,-1.12))-radius*(.22+.31*growth),length(q+space*vec3(.72,-.57,-1.16))-radius*(.2+.26*growth)),
      min(length(q+space*vec3(-.18,-1.06,-.76))-radius*(.18+.21*growth),length(q+space*vec3(.48,.72,-.99))-radius*(.18+.23*growth)));
     node=mix(node,min(buds,node),min(1.,(growth-.25)*4.));
    }
    if(sprouts>0.&&abs(q.x)+abs(q.y)<.33&&q.z>-.19&&shift>.22){
     float turn=6.13*sin(dot(cell,vec2(62.02,28.37))),localGrowth=sprouts*clamp((shift-.22)*1.8,.07,1.);
     float base=length(q*vec3(.62,.78,3.1))-radius*(1.49+localGrowth*.94);
     sprout=min(base,weaveSprout(q,uStructureF.z*tau,shift,turn,radius,localGrowth,uWeaveGrowth.y));
     if(web>0.){
      for(int i=0;i<int(min(uRuntime.w+uRuntime.z,2.));i++){
       float branch=turn+(i==0?2.17:4.3),offset=radius*(.67+.27*float(i));
       float branchGrowth=localGrowth*web*(i==0?.92:.71);
       vec3 root=vec3(vec2(cos(branch),sin(branch))*offset,radius*.26);
       sprout=min(sprout,weaveSprout(q-root,uStructureF.z*tau,1.-shift*.58,branch,radius*(1.-float(i)*.16),branchGrowth,uWeaveGrowth.y));
      }
     }
    }
   }
#endif
   d=mix(d,min(ribs,min(crossbar,node)),uStructureH.y*uStructureA.x*uStructureA.z);
   d=mix(d,min(d,sprout),min(1.,3.*sprouts)*uStructureA.x);
   d=mix(d,min(d,membrane),min(1.,1.45*web)*uStructureA.x*uStructureA.w*uStructureA.z);
  }
 }
 if(uStructureB.w>0.)d=max(d,(abs(sin(p.z*uStructureC.x*3.14159265359))-mix(1.,uStructureC.y,uStructureB.w))/(uStructureC.x*3.14159265359));
 float separation=uStructureC.z*(1.-uStructureFan);
 if(separation>0.)d=max(d,(abs(sin(phi*uStructureC.w*.5))-mix(1.,uStructureD.x,separation))*length(p.xy)/uStructureC.w);
 if(uStructureD.y>0.)d=max(d,(abs(sin(r*uStructureD.z*3.14159265359))-mix(1.,uStructureD.w,uStructureD.y))/(uStructureD.z*3.14159265359));
 return d;
}
`;
export function structurePanel(tab,s,{slider,details,section}){
 const sliders=keys=>keys.map(k=>slider(k)).join('');
 if(tab==='shape')return filamentPanel(tab,s,{slider,details})+ details('Curve toroidali e nodi',sliders(['loopAmount','loopRadius','loopTube','loopKnot','loopTurns','loopFlat','loopTwist','loopWave'])+'<p class="help">Apertura 0 mantiene la forma iniziale; 1 la trasforma in un anello. Intreccio separa il percorso. Avvolgimenti aumenta le ripiegature del nodo. Appiattimento e torsione modellano il nastro. Spessore elevato può unire i passaggi del nodo.</p>')+section('Proprietà',(s.structureOriginal?'<p class="help">La struttura precedente è stata adattata alle proprietà comuni. Il risultato può cambiare; i dati originali sono conservati nel preset.</p><button class="quiet" data-structure-original="true">Scarica anche il preset originale</button>':'')+'<p class="help">Combina le proprietà sulla forma attuale. Profilo, ritagli e materia restano attivi.</p>')
 +details('Guscio e spessore',sliders(['structShell','structThickness','structTaper']))
 +details('Reticolo di fibre',sliders(['structFibres','structWeft','structDensity','structThreadWidth','structWeave','structWeaveVariation','structWeaveNodes','structWeaveMembrane'])+details('Crescita del reticolo',sliders(['structWeaveGrowth','structWeaveCup'])+'<p class="help">Gli steli crescono dalle giunzioni. L’apertura svuota le punte. Per animarli, usa le loro tracce in Movimento.</p>')+'<p class="help">Separazione apre gli spazi fra i fili. Tessitura aggiunge i fili trasversali. Irregolarità curva i fili e Rilievo ingrossa le giunzioni. Lo svuotamento limita la trama alla pelle.</p>')
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
