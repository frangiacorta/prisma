import {FILAMENT_DEFAULTS,FILAMENT_META,FILAMENT_TRACKS,filamentPanel} from './filament-model.js?v=d90836d59387';
// Composable properties of the existing implicit form. Zero amounts are identity.
export const STRUCTURE_DEFAULTS={
 ...FILAMENT_DEFAULTS,
 loopAmount:0,loopKnot:0,loopRadius:.8,loopTube:.22,loopFlat:0,loopTwist:0,loopWave:0,loopPhase:0,
 structShell:0,structThickness:.09,structFibres:0,structWeft:0,structDensity:20,structThreadWidth:.32,structWeave:0,
 structSlices:0,structSliceCount:6,structSliceWidth:.24,structRadial:0,structPetalCount:8,structPetalWidth:.45,
 structLayers:0,structLayerCount:3,structLayerWidth:.22,
 structGrowth:0,structCurl:0,structFold:0,structFoldCount:5,structBreath:0,structFlap:0,structFlowPhase:0,structDelay:.35,
 structScallop:0,structSpiral:0,structStagger:0,structRuffle:0,structTaper:0,
 structCoreDark:0,structCoreRadius:.3
};
export const STRUCTURE_META={
 ...FILAMENT_META,
 loopAmount:['Apertura ad anello',0,1,.01],loopKnot:['Intreccio del nodo',0,1,.01],loopRadius:['Raggio del percorso',.6,1.6,.01],loopTube:['Spessore del tubo',.06,.6,.005],loopFlat:['Appiattimento a nastro',0,1,.01],loopTwist:['Torsione del nastro',-2,2,.01],loopWave:['Variazione di spessore',0,.35,.005],loopPhase:['Scorrimento',0,1,.001],
 structShell:['Svuotamento · pieno → membrana',0,1,.01],structThickness:['Spessore della membrana',.035,.4,.005],
 structFibres:['Separazione in fibre',0,1,.01],structWeft:['Fili trasversali · tessitura',0,1,.01],structDensity:['Fili intorno alla forma',6,48,1],structThreadWidth:['Larghezza dei fili',.15,.9,.01],structWeave:['Intreccio sopra / sotto',0,.16,.005],
 structSlices:['Separazione in lamelle',0,1,.01],structSliceCount:['Numero di lamelle',2,12,1],structSliceWidth:['Spessore relativo delle lamelle',.12,.85,.01],
 structRadial:['Separazione radiale',0,1,.01],structPetalCount:['Divisioni radiali',3,20,1],structPetalWidth:['Larghezza delle divisioni',.1,.95,.01],
 structLayers:['Gusci concentrici',0,1,.01],structLayerCount:['Numero di strati concentrici',2,6,1],structLayerWidth:['Spessore relativo degli strati',.15,.85,.01],
 structGrowth:['Espansione radiale',0,.8,.01],structCurl:['Arricciamento dal centro',-1,1,.01],structFold:['Ampiezza delle pieghe',0,.4,.01],structFoldCount:['Pieghe intorno alla forma',1,12,1],
 structBreath:['Dilatazione radiale',-.3,.3,.01],structFlap:['Flessione delle lamine',-.6,.6,.01],structFlowPhase:['Fase delle pieghe',0,1,.001],structDelay:['Sfasamento radiale',0,1,.01],
 structScallop:['Arrotondamento dei petali',0,1,.01],structSpiral:['Avvolgimento a spirale',-1,1,.01],structStagger:['Sfasamento fra le lamine',0,1,.01],structRuffle:['Ondulazione fine dei bordi',0,.15,.005],structTaper:['Assottigliamento verso il bordo',0,1,.01],
 structCoreDark:['Oscurità del nucleo',0,1,.01],structCoreRadius:['Estensione del nucleo',.05,.8,.01]
};
export const STRUCTURE_GROUPS={shape:Object.keys(STRUCTURE_DEFAULTS).filter(k=>!['filPhase','filWind','filColor','filColorScatter','filRootShade','filBaseBlend','loopPhase','structBreath','structFlap','structFlowPhase','structDelay','structCoreDark','structCoreRadius'].includes(k)),motion:['filPhase','filWind','loopPhase','structBreath','structFlap','structFlowPhase','structDelay'],color:['filColor','filColorScatter','filRootShade','filBaseBlend','structCoreDark','structCoreRadius']};
export const STRUCTURE_TRACKS={...FILAMENT_TRACKS,...Object.fromEntries(['loopAmount','loopKnot','loopRadius','loopTube','loopFlat','loopTwist','loopWave','loopPhase','structShell','structFibres','structWeft','structSlices','structRadial','structLayers','structGrowth','structCurl','structFold','structBreath','structFlap','structFlowPhase','structScallop','structSpiral','structStagger','structRuffle'].map(k=>[k,[STRUCTURE_META[k][0],0,k==='structBreath'?.3:k==='structFlap'?.6:k==='structFold'?.4:k==='loopTwist'?2:k==='loopWave'?.35:k==='loopTube'?.6:1,.01]]))};
export const STRUCTURE_FIELD_KEYS=Object.keys(STRUCTURE_DEFAULTS).filter(k=>!k.startsWith('structCore')&&!k.startsWith('fil'));
export function hasStructure(s){return ['loopAmount','structShell','structFibres','structSlices','structRadial','structLayers','structGrowth','structCurl','structFold','structBreath','structFlap','structScallop','structSpiral','structStagger','structRuffle'].some(k=>Math.abs(s[k]||0)>1e-6);}
export function structureMayChange(s){return hasStructure(s)||STRUCTURE_FIELD_KEYS.some(k=>s.motions?.[k]?.enabled&&(s.motions[k].amplitude||s.motions[k].mode==='cycle'));}
export function structureBounds(s){return Math.max(1,(s.loopAmount||0)>0?(s.loopRadius??.8)+.36*(s.loopKnot||0)+(s.loopTube??.22)*(1+(s.loopWave||0)):1)*(1+Math.abs(s.structGrowth||0)+Math.abs(s.structBreath||0))*(1+Math.abs(s.structCurl||0)+Math.abs(s.structFold||0)+Math.abs(s.structFlap||0)+Math.abs(s.structRuffle||0)*2+Math.abs(s.structStagger||0)*.6);}
export function structureUniforms(s,u){
 const v={...STRUCTURE_DEFAULTS,...s};
 u('uLoopA',[v.loopAmount,v.loopKnot,v.loopRadius,v.loopTube]);u('uLoopB',[v.loopFlat,v.loopTwist,v.loopWave,v.loopPhase]);
 u('uStructureA',[v.structShell,v.structThickness,v.structFibres,v.structWeft]);
 u('uStructureB',[v.structDensity,v.structThreadWidth,v.structWeave,v.structSlices]);
 u('uStructureC',[v.structSliceCount,v.structSliceWidth,v.structRadial,v.structPetalCount]);
 u('uStructureD',[v.structPetalWidth,v.structLayers,v.structLayerCount,v.structLayerWidth]);
 u('uStructureE',[v.structGrowth,v.structCurl,v.structFold,v.structFoldCount]);
 u('uStructureF',[v.structBreath,v.structFlap,v.structFlowPhase,v.structDelay]);
 u('uStructureG',[v.structScallop,v.structSpiral,v.structStagger,v.structRuffle]);
 u('uStructureH',[v.structTaper,0]);
 u('uStructureColor',[v.structCoreDark,v.structCoreRadius]);
}
// Closed (2,3) torus-knot branches; parameterization also used by Three.js TorusKnotGeometry.
// Own implicit cross-section implementation: two branches, no mesh or sampled-segment traversal.
export function loopField(s,p){
 const a=Math.atan2(p[1],p[0]),r=Math.hypot(p[0],p[1]),phase=(s.loopPhase||0)*Math.PI*2,thin=1-.86*(s.loopFlat||0),twist=(s.loopTwist||0)*Math.sin(2*a+phase);
 const c=Math.cos(twist),sn=Math.sin(twist),tube=(s.loopTube??.22)*(1+(s.loopWave||0)*Math.sin(3*a-phase));let distance=1e9;
 for(let j=0;j<2;j++){const t=a*.5+j*Math.PI,k=.36*(s.loopKnot||0),x=r-(s.loopRadius??.8)-k*Math.cos(3*t),z=p[2]-k*Math.sin(3*t);const u=c*x+sn*z,v=-sn*x+c*z;distance=Math.min(distance,(Math.hypot(u,v/thin)-tube)*thin);}
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
export function structureField(s,d,p){
 const v={...STRUCTURE_DEFAULTS,...s},r=Math.hypot(...p),phi=Math.atan2(p[1],p[0]),theta=Math.acos(Math.max(-1,Math.min(1,p[2]/Math.max(r,1e-6)))),tau=Math.PI*2;
 const a=phi*v.structDensity,b=theta*v.structDensity,phase=v.structFlowPhase*tau;
 const thickness=v.structThickness*(1-v.structTaper*.85*Math.min(1,Math.hypot(p[0],p[1])));
 if(v.structShell>0)d=Math.max(d,-d-thickness-(1-thickness)*(1-v.structShell));
 if(v.structFibres>0){
  const width=1+(v.structThreadWidth-1)*v.structFibres,warp=(Math.abs(Math.sin(a*.5))-width)/v.structDensity*2;
  const weft=(Math.abs(Math.sin(b*.5))-width*v.structWeft)/v.structDensity*2;
  d=Math.max(d,v.structWeft>0?Math.min(warp,weft):warp);
  d+=v.structWeave*Math.cos(a)*Math.cos(b)*Math.cos(phase)*v.structFibres;
 }
 if(v.structSlices>0)d=Math.max(d,(Math.abs(Math.sin(p[2]*v.structSliceCount*Math.PI)) -(1+(v.structSliceWidth-1)*v.structSlices))/ (v.structSliceCount*Math.PI));
 if(v.structRadial>0)d=Math.max(d,(Math.abs(Math.sin(phi*v.structPetalCount*.5))-(1+(v.structPetalWidth-1)*v.structRadial))*Math.hypot(p[0],p[1])/v.structPetalCount);
 if(v.structLayers>0)d=Math.max(d,(Math.abs(Math.sin(r*v.structLayerCount*Math.PI))-(1+(v.structLayerWidth-1)*v.structLayers))/(v.structLayerCount*Math.PI));
 return d;
}
export const STRUCTURE_GLSL=`
uniform vec4 uStructureA,uStructureB,uStructureC,uStructureD,uStructureE,uStructureF,uStructureG;
uniform vec2 uStructureColor,uStructureH;
uniform vec4 uLoopA,uLoopB;
bool structureActive(){return uLoopA.x+dot(abs(uStructureA.xzw),vec3(1.))+abs(uStructureB.w)+abs(uStructureC.z)+abs(uStructureD.y)+dot(abs(uStructureE.xyz),vec3(1.))+dot(abs(uStructureF.xy),vec2(1.))+dot(abs(uStructureG),vec4(1.))>.000001;}
float loopField(vec3 p){
 float a=atan(p.y,p.x),r=length(p.xy),phase=uLoopB.w*6.28318530718,thin=1.-.86*uLoopB.x,angle=uLoopB.y*sin(2.*a+phase);
 float c=cos(angle),sn=sin(angle),tube=uLoopA.w*(1.+uLoopB.z*sin(3.*a-phase));
 vec2 center=vec2(r-uLoopA.z,p.z),offset=.36*uLoopA.y*vec2(cos(1.5*a),sin(1.5*a));
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
float structureField(float d,vec3 p){
 float r=length(p),phi=atan(p.y,p.x),theta=acos(clamp(p.z/max(r,.000001),-1.,1.)),a=phi*uStructureB.x,b=theta*uStructureB.x;
 float thickness=uStructureA.y*(1.-uStructureH.x*.85*min(1.,length(p.xy)));
 if(uStructureA.x>0.)d=max(d,-d-thickness-(1.-thickness)*(1.-uStructureA.x));
 if(uStructureA.z>0.){
  float width=mix(1.,uStructureB.y,uStructureA.z),warp=(abs(sin(a*.5))-width)/uStructureB.x*2.;
  float weft=(abs(sin(b*.5))-width*uStructureA.w)/uStructureB.x*2.;
  d=max(d,uStructureA.w>0.?min(warp,weft):warp);
  d+=uStructureB.z*cos(a)*cos(b)*cos(uStructureF.z*6.28318530718)*uStructureA.z;
 }
 if(uStructureB.w>0.)d=max(d,(abs(sin(p.z*uStructureC.x*3.14159265359))-mix(1.,uStructureC.y,uStructureB.w))/(uStructureC.x*3.14159265359));
 if(uStructureC.z>0.)d=max(d,(abs(sin(phi*uStructureC.w*.5))-mix(1.,uStructureD.x,uStructureC.z))*length(p.xy)/uStructureC.w);
 if(uStructureD.y>0.)d=max(d,(abs(sin(r*uStructureD.z*3.14159265359))-mix(1.,uStructureD.w,uStructureD.y))/(uStructureD.z*3.14159265359));
 return d;
}
`;
export function structurePanel(tab,s,{slider,details,section}){
 const sliders=keys=>keys.map(k=>slider(k)).join('');
 if(tab==='shape')return filamentPanel(tab,s,{slider,details})+ details('Curve toroidali e nodi',sliders(['loopAmount','loopRadius','loopTube','loopKnot','loopFlat','loopTwist','loopWave'])+'<p class="help">Apertura 0 mantiene la forma iniziale; 1 la trasforma in un anello. Intreccio separa e annoda il percorso. Appiattimento e torsione modellano il nastro. Spessore elevato può unire i passaggi del nodo.</p>')+section('Proprietà',(s.structureOriginal?'<p class="help">La struttura precedente è stata adattata alle proprietà comuni. Il risultato può cambiare; i dati originali sono conservati nel preset.</p><button class="quiet" data-structure-original="true">Scarica anche il preset originale</button>':'')+'<p class="help">Combina le proprietà sulla forma attuale. Profilo, ritagli e materia restano attivi.</p>')
 +details('Guscio e spessore',sliders(['structShell','structThickness','structTaper']))
 +details('Reticolo di fibre',sliders(['structFibres','structWeft','structDensity','structThreadWidth','structWeave'])+'<p class="help">Separazione apre gli spazi fra i fili. Tessitura aggiunge i fili trasversali; lo svuotamento può limitare la trama alla pelle.</p>')
 +details('Suddivisione radiale e strati',sliders(['structScallop','structPetalCount','structRadial','structPetalWidth','structSlices','structSliceCount','structSliceWidth','structLayers','structLayerCount','structLayerWidth'])+'<p class="help">Arrotondamento disegna lobi morbidi sulla forma; Separazione radiale apre gli intervalli. Suddivisione radiale e strati concentrici aggiungono altri livelli combinabili. I valori intermedi aprono progressivamente gli spazi. Gli strati interni diventano visibili con trasparenza o ritagli.</p>')
 +details('Piegatura e curvatura',sliders(['structGrowth','structCurl','structSpiral','structStagger','structFold','structFoldCount','structRuffle'])+'<p class="help">La posa e la sua animazione si regolano in Movimento. Trasparenza e rifrazione sono in Materia.</p>');
 if(tab==='color')return filamentPanel(tab,s,{slider,details})+ details('Nucleo scuro',sliders(['structCoreDark','structCoreRadius']));
 if(tab==='motion')return section('Posa',sliders(STRUCTURE_GROUPS.motion.filter(k=>k!=='loopPhase'&&!k.startsWith('fil')))+'<p class="help">Questi valori definiscono la posa. Apri le rispettive tracce qui sotto per animarla: ogni proprietà ha velocità, verso, fase e ritmo propri.</p>');
 return '';
}

// Old dedicated surfaces are translated once; retain their exact original data.
// This is a geometric adaptation, not a claim of pixel-identical migration.
export function integrateStructure(s){
 if((s.engine!=='solid'&&s.pLiving!==4)||!(s.pLiving>0))return s;
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
