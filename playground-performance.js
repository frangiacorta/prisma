import {grainMix} from './body-layers.js?v=a55ab48fe9e6';
import {varyCreation} from './creative-model.js?v=a55ab48fe9e6';
import {LIVE_FILTERS} from './playground-model.js?v=a55ab48fe9e6';
export const MUTATIONS=[['shape','Forma'],['grains','Superficie ↔ granelli'],['color','Colore'],['material','Materia'],['motion','Moto'],['all','Tutto']];
const clamp=x=>Math.min(1,Math.max(0,x));
export function filterOverlay(levels,held={}){
 const changes={};
 for(const [key] of LIVE_FILTERS){
  const amount=Math.max(levels?.[key]||0,held[key]||0);
  if(amount<=0)continue;
  const name='finish'+key[0].toUpperCase()+key.slice(1);
  changes[name]=true;changes[name+'Mix']=clamp(amount);
  if(key==='glitch')Object.assign(changes,{finishGlitchAnimate:false,finishGlitchCoverage:.55,finishGlitchAmount:120});
  if(key==='feedback')Object.assign(changes,{finishFeedbackMemory:.68,finishFeedbackZoom:.025});
 }
 if(Object.keys(changes).length)Object.assign(changes,{finishEnabled:true,finishCompare:false});
 return changes;
}
const shapeKeys=['volume','deform','twist','waves','taper','lobeAmount','loopTube','petalCurl','cellSpineBend','pOrganic','pLobeDepth'];
const colorKeys=['gradientOffset','gradientAngle','colorSoftness'];
const materialKeys=['metal','roughness','gloss','iridescence','filmThickness','pFilmVariation'];
const motionKeys=['speed','filmFlow','pVortex','pTravel','grainDispersal'];
export function mutationBetween(state,seed,kind){
 if(kind==='grains')return {numbers:[['sceneGrains',grainMix(state),grainMix(state)>.52?0:1]],palette:null};
 const variant=varyCreation(state,seed,.27,kind),keys=({shape:shapeKeys,color:colorKeys,material:materialKeys,motion:motionKeys,all:[...shapeKeys,...colorKeys,...materialKeys,...motionKeys]})[kind]||[];
 const numbers=keys.filter(k=>Number.isFinite(state[k])&&Number.isFinite(variant[k])&&state[k]!==variant[k]).map(k=>[k,state[k],variant[k]]);
 // When no routes are active a change of speed alone wouldn't be visible.
 if(kind==='motion'&&!Object.values(state.motions||{}).some(t=>t.enabled))numbers.push(['rotateY',state.rotateY,(state.rotateY+60)%360]);
 return {numbers,palette:['color','all'].includes(kind)?[state.palette.slice(),variant.palette.slice()]:null};
}
