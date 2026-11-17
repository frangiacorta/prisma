import {FIGURE_SCALE} from './base-forms.js?v=79c81404468e';
import {STRUCTURE_DEFAULTS,STRUCTURE_FIELD_KEYS,STRUCTURE_META} from './structure-model.js?v=79c81404468e';
import {CELLULAR_DEFAULTS,CELLULAR_FIELD_KEYS,CELLULAR_META} from './cellular-form.js?v=79c81404468e';
import {FRACTAL_DEFAULTS,FRACTAL_META} from './fractal-form.js?v=79c81404468e';
import {PARTICLE_DEFAULTS,PARTICLE_META} from './particle-model.js?v=79c81404468e';
import {hasMotionPoints,normalizeMotionPoints} from './motion-keyframes.js?v=79c81404468e';

export const BODY_LAYER_META = {
 sceneGrains:['Superficie ↔ granelli',0,1,.001],
 grainDispersal:['Ampiezza del movimento',0,1,.01]
};

// Internal material time is independent of the representation and its origin.
// Phases/offsets are measured in turns, not wrapped: fractional pCycles and
// animationPhase values beyond one turn must retain their exact current time.
// These are transport state, deliberately not animatable parameter tracks.
export const GRAIN_MOTION_DEFAULTS={grainMotion:true,grainMotionPhase:0,grainMotionOffset:0};
const TAU=Math.PI*2;
function finitePhase(value){if(!Number.isFinite(value))throw new TypeError('La fase del movimento deve essere finita.');return value;}
function savedTurns(value){return Number.isFinite(value)&&Number.isFinite(value*TAU)?value:0;}
export function grainPhaseRadians(s,currentPhaseRadians){
 const phase=finitePhase(currentPhaseRadians);
 if(s.grainMotion===false)return savedTurns(s.grainMotionPhase)*TAU;
 const offset=savedTurns(s.grainMotionOffset);
 // Preserve the legacy clock exactly, including its endpoint, when no offset
 // has been introduced. pDirection and pCycles are applied by the consumer once.
 return finitePhase(offset===0?phase:phase+offset*TAU);
}
export function setGrainMotion(s,enabled,currentPhaseRadians){
 if(typeof enabled!=='boolean')throw new TypeError('Movimento dei granelli non valido.');
 const phase=finitePhase(currentPhaseRadians);
 if(enabled===(s.grainMotion!==false))return s;
 if(enabled)s.grainMotionOffset=savedTurns(s.grainMotionPhase)-phase/TAU;
 else s.grainMotionPhase=grainPhaseRadians(s,phase)/TAU;
 s.grainMotion=enabled;
 return s;
}
export const freezeGrainMotion=(s,phase)=>setGrainMotion(s,false,phase);
export const resumeGrainMotion=(s,phase)=>setGrainMotion(s,true,phase);

export const grainMix = s => Math.max(0,Math.min(1,s.sceneGrains??(s.engine==='particles'||s.pLiving>0?1:0)));
export const cloudBody = s => (s.grainSource??(s.engine==='particles'?'cloud':'body'))==='cloud';
export const hasGrainLayer = s => grainMix(s)>0||!!s.motions?.sceneGrains?.enabled;

// Explicit, approximate source conversion only. The surface/grain slider must
// render the selected source directly; it must never call this adapter.
export const CLOUD_BODY_CONTROLS = {
 loopAmount:['pOpening',1],
 lobeAmount:['pLobeDepth',.4],
 lobes:['pLobes',1]
};

const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const projectionRatio=1.7*2.6/7.5;
const bodyDefaults={
 ...Object.fromEntries(STRUCTURE_FIELD_KEYS.map(k=>[k,STRUCTURE_DEFAULTS[k]])),
 ...Object.fromEntries(CELLULAR_FIELD_KEYS.map(k=>[k,CELLULAR_DEFAULTS[k]])),...FRACTAL_DEFAULTS,
 baseForm:0,roundness:0,taper:0,bendX:0,bendY:0,lobeAmount:0,lobes:3,pinch:0,rimRound:0,
 deform:0,asymmetry:0,twist:0,waves:0,waveScale:3.5,hole:0,holeX:0,holeY:0,holeShape:0,holeAspect:1,cut:0,cutX:.7,cutY:.1,cutAspect:1,
 petalAmount:0,petalCount:12,petalOpen:.65,petalCurl:0,petalLength:1.05,petalWidth:.24,petalInflate:.6,petalSharp:0,petalCoverage:0,petalRows:5,petalPhase:0,petalBlend:0,petalRoot:0,petalRandom:0,
 petalGrowth:1,petalWander:0,petalCoil:0,petalReentry:0,petalKnots:0,petalRidges:0,petalDisorder:0,petalDirectionSpread:0,petalWeave:0,petalWeaveTurns:2,petalFlow:0,petalFlowPhase:0,petalOrbitPhase:0,petalCollision:0,petalSphereCollision:0,
 stemAmount:0,stemRadius:.09,stemBend:0,filLength:0,growthExtrusion:0,growthOpening:0
};
// Distribution/deformation controls only: no palette, optics, lighting, grain
// diameters, trails or finishing controls belong to the source snapshot.
const cloudNeutral={
 pOpening:0,pThickness:.5,pLobes:3,pLobeDepth:0,pCloudCore:0,pCloudHalo:0,pCellAmount:0,pClumps:0,pSymmetry:1,
 pOrganic:0,pWarp:0,pNeural:0,pTentacle:0,pOuter:0,pRandom:0,pJitter:0,pVortex:0,pCounterflow:0,pReentry:0,pBreath:0,pLife:0,pTravel:0,
 pAttract:0,pRepel:0,pMagnet:0,pOrbitOval:0,pOrbitTilt:0,pOrbitPrecession:0,pOrbitSpread:0,pOrbitDrift:0,pWander:0,pSpaceWarp:0,
 pGrainSpacing:1,pGroupSpacing:1,pLiving:0,pSurfaceBind:0
};
const cloudKeys=[...new Set([...Object.keys(cloudNeutral),...'pCloudRadius pCellDensity pCellSize pCellVariation pCellAspect pCellRelief pFrequency pDetail pRough pCohesion pMotionSoftness pFollow pWanderScale pWanderCycles pFlowBalance pMotionSeed pTentacleCount pTentacleLength pTentacleTaper pTentacleCurl pTentacleWave pTentacleCycles pWarpScale pWarpCycles pWarpTwist pPoles pRadius pField pReach pBranches pCycles pDirection pRhythm pPause pSpeedSpread pPulse pPropagation pNodes pConnect pDistributionCells'.split(' ')])];
export function grainFrame(source,phaseRadians,sampleFrame){
 const internalPhase=grainPhaseRadians(source,phaseRadians),common=sampleFrame(source,phaseRadians);
 if(internalPhase===phaseRadians)return common;
 const internal=sampleFrame(source,internalPhase);
 // Freeze internal geometry/kinematics, not the common scene's camera, shape
 // transform, material, lights, dynamics or representation crossfade.
 for(const key of [...cloudKeys,'pFill','grainDispersal'])if(Object.hasOwn(internal,key))common[key]=internal[key];
 if(hasMotionPoints(internal.motions?.pSignal))common.pSignal=internal.pSignal;
 return common;
}
const sourceKeys=[...new Set([...Object.keys(bodyDefaults),...cloudKeys,'scale'])];
const limits={...STRUCTURE_META,...CELLULAR_META,...FRACTAL_META,...PARTICLE_META,scale:['',...FIGURE_SCALE,.01],lobeAmount:['',0,.4,.01],lobes:['',2,12,1],baseForm:['',0,6,1]};
function safeNumber(k,v){if(!Number.isFinite(v))return undefined;const m=limits[k];return m?clamp(v,m[1],m[2]):clamp(v,-10000,10000);}
function safeTrack(t,key){
 if(!t||typeof t!=='object'||Array.isArray(t))return null;
 const out={enabled:t.enabled===true,amplitude:clamp(Number(t.amplitude)||0,0,360),cycles:clamp(Number(t.cycles)||1,.1,8),phase:clamp(Number(t.phase)||0,0,360),direction:t.direction===-1?-1:1,curve:['sine','soft','triangle'].includes(t.curve)?t.curve:'sine',pace:clamp(Number(t.pace)||0,0,.95),pacePhase:clamp(Number(t.pacePhase)||0,0,360),hold:clamp(Number(t.hold)||0,0,.8),mode:t.mode==='cycle'?'cycle':'wave'};
 const points=normalizeMotionPoints(t.points,limits[key]);
 if(points.length>1){out.points=points;if(t.mode==='points')out.mode='points';}
 return out;
}
function capture(s){
 const values={},motions={};
 for(const k of sourceKeys){const v=safeNumber(k,s[k]);if(v!==undefined)values[k]=v;if(s.motions?.[k])motions[k]=safeTrack(s.motions[k],k);}
 return {values,motions};
}
function cleanSnapshot(raw){
 if(!raw||typeof raw!=='object'||!raw.values||!raw.motions)return null;
 const out={values:{},motions:{}};
 for(const k of sourceKeys){const v=safeNumber(k,raw.values[k]);if(v!==undefined)out.values[k]=v;const t=safeTrack(raw.motions[k],k);if(t)out.motions[k]=t;}
 return Object.keys(out.values).length?out:null;
}
function readMemory(raw){
 if(raw?.version!==1||!['body','cloud'].includes(raw.source))return null;
 const original=cleanSnapshot(raw.original),converted=cleanSnapshot(raw.converted);
 return original&&converted?{version:1,source:raw.source,original,converted}:null;
}
function sameSnapshot(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function restore(s,snapshot){Object.assign(s,snapshot.values);s.motions??={};for(const k of sourceKeys){if(snapshot.motions[k])s.motions[k]={...snapshot.motions[k]};else delete s.motions[k];}}
function clearTracks(s,keys){s.motions??={};for(const k of keys)if(s.motions[k])s.motions[k]={...s.motions[k],enabled:false};}
function transferTrack(s,input,from,to,factor,report){
 const t=input.motions?.[from];if(!t?.enabled)return;
 const mapped={...t,amplitude:(t.amplitude||0)*factor};
 if(Array.isArray(t.points))mapped.points=normalizeMotionPoints(t.points.map(point=>({at:point?.at,offset:point?.offset*factor})),limits[to]);
 s.motions[to]=mapped;
 report.mappedTracks.push({from,to,factor});
 const range=limits[to],amplitude=mapped.amplitude*(input.motion??.3)/.3;
 const offsets=hasMotionPoints(mapped)?mapped.points.map(point=>point.offset):[-amplitude,amplitude];
 if(range&&offsets.some(offset=>{const value=(s[to]??0)+offset;return value<range[1]||value>range[2];}))report.clipped.push('motions.'+to);
}
function cloudExtent(s){const x=clamp((s.pOpening||0)/.45,0,1),open=x*x*(3-2*x),tube=s.pThickness??.5;return 2*tube*(1-open)+(.36+(s.pOpening||0)*.8+tube)*open;}
function bodyExtent(s){const opening=clamp(s.loopAmount||0,0,1);return 1-opening+opening*((s.loopRadius??.8)+(s.loopTube??.22));}
function convertedScale(out,input,factor,report){
 const requested=(input.scale??1)*factor;out.scale=clamp(requested,...FIGURE_SCALE);
 if(out.scale!==requested)report.clipped.push('scale');
 transferTrack(out,input,'scale','scale',factor,report);
}
function conversion(input,target){
 const out={...input,engine:target==='body'?'solid':'particles',motions:structuredClone(input.motions||{})};
 const report={from:target==='body'?'cloud':'body',source:target,changed:true,restored:false,lossy:true,mappedTracks:[],unmapped:[],clipped:[],limitations:['La conversione esplicita approssima apertura, lobi e ingombro; non conserva la geometria o la coreografia della sorgente.']};
 if(target==='body'){
  for(const [k,neutral]of Object.entries(cloudNeutral))if(k!=='pOpening'&&k!=='pThickness'&&k!=='pLobes'&&k!=='pLobeDepth'&&Math.abs((input[k]??neutral)-neutral)>1e-9)report.unmapped.push(k);
  for(const k of ['deform','twist','waves'])if(input[k])report.unmapped.push(k);
  Object.assign(out,bodyDefaults,{pLiving:0});clearTracks(out,[...Object.keys(bodyDefaults),...cloudKeys]);
  for(const [body,[cloud,factor]]of Object.entries(CLOUD_BODY_CONTROLS)){const value=(input[cloud]??PARTICLE_DEFAULTS[cloud])*factor;out[body]=safeNumber(body,value);if(out[body]!==value)report.clipped.push(body);transferTrack(out,input,cloud,body,factor,report);}
  out.loopRadius=clamp(.36+(input.pOpening||0)*.8,.38,1.6);out.loopTube=clamp(input.pThickness??.5,.06,.6);
  if(out.loopTube!==(input.pThickness??.5))report.clipped.push('loopTube');
  if((input.pOpening||0)>=.45&&!input.motions?.pOpening?.enabled)transferTrack(out,input,'pThickness','loopTube',1,report);
  convertedScale(out,input,projectionRatio*cloudExtent(input)/bodyExtent(out),report);
  // At a closed sphere, thickness is its radius, not a hidden torus tube.
  // A second independent scale wave cannot fit in the single scale track.
  if(!(input.pOpening>0)&&!input.motions?.pOpening?.enabled&&!input.motions?.scale?.enabled)transferTrack(out,input,'pThickness','scale',2*projectionRatio*(input.scale??1),report);
 }else{
  for(const k of Object.keys(bodyDefaults))if(!['loopAmount','loopRadius','loopTube','lobeAmount','lobes'].includes(k)&&Math.abs((input[k]??bodyDefaults[k])-bodyDefaults[k])>1e-9)report.unmapped.push(k);
  Object.assign(out,bodyDefaults,cloudNeutral);clearTracks(out,[...Object.keys(bodyDefaults),...cloudKeys]);
  for(const [body,[cloud,factor]]of Object.entries(CLOUD_BODY_CONTROLS)){const value=(input[body]??bodyDefaults[body])/factor;out[cloud]=safeNumber(cloud,value);if(out[cloud]!==value)report.clipped.push(cloud);transferTrack(out,input,body,cloud,1/factor,report);}
  out.pThickness=(input.loopAmount||0)>.001?clamp(input.loopTube??.22,.02,1):.5;
  if((input.loopAmount||0)>.001)transferTrack(out,input,'loopTube','pThickness',1,report);
  convertedScale(out,input,bodyExtent(input)/(projectionRatio*cloudExtent(out)),report);
 }
 const mapped=new Set(report.mappedTracks.map(t=>t.from));
 for(const k of sourceKeys)if(input.motions?.[k]?.enabled&&!mapped.has(k))report.unmapped.push('motions.'+k);
 if(input.motions?.pOpening?.enabled||input.motions?.pThickness?.enabled||input.motions?.loopAmount?.enabled||input.motions?.loopTube?.enabled)report.limitations.push('La scala è raccordata alla posa di base; variazioni di apertura o spessore possono cambiare l’ingombro durante il moto.');
 report.unmapped=[...new Set(report.unmapped)];
 report.clipped=[...new Set(report.clipped)];
 return {out,report};
}

export function cloudToBody(s){return conversion(s,'body').out;}

export function normalizeBodyLayers(s,raw){
 s.grainMotionVersion=1;
 s.grainDispersal=cloudBody(raw)&&raw.grainMotionVersion!==1?1:Math.max(0,Math.min(1,raw.grainDispersal||0));
 s.grainMotion=raw.grainMotion!==false;
 s.grainMotionPhase=savedTurns(raw.grainMotionPhase);
 s.grainMotionOffset=savedTurns(raw.grainMotionOffset);
 if(Number.isFinite(raw.sceneGrains))s.sceneGrains=grainMix(raw);
 else delete s.sceneGrains;
 if(raw.grainSource==='cloud'||raw.grainSource==='body')s.grainSource=raw.grainSource;
 const memory=readMemory(raw.grainSourceMemory);
 if(memory)s.grainSourceMemory=memory;else delete s.grainSourceMemory;
 return s;
}

export function changeGrainSource(s,source){
 if(source!=='body'&&source!=='cloud')throw new TypeError('Sorgente dei granelli non valida.');
 const from=cloudBody(s)?'cloud':'body';
 if(source===from)return {from,source,changed:false,restored:false,lossy:false,mappedTracks:[],unmapped:[],clipped:[],limitations:[]};
 const mix=grainMix(s),original=capture(s),memory=readMemory(s.grainSourceMemory);
 let report;
 // A direct return (also after saving/reopening) may restore the original
 // geometry. Any intervening source edit invalidates it. Material, pose and
 // lighting edits remain current and are never read from this snapshot.
 if(memory?.source===source&&sameSnapshot(original,memory.converted)){
  restore(s,memory.original);report={from,source,changed:true,restored:true,lossy:false,mappedTracks:[],unmapped:[],clipped:[],limitations:[]};
 }else{
  const converted=conversion(s,source);Object.assign(s,converted.out);report=converted.report;
 }
 s.sceneGrains=mix;s.grainSource=source;s.engine=source==='body'?'solid':'particles';
 s.grainSourceMemory={version:1,source:from,original,converted:capture(s)};
 return report;
}
