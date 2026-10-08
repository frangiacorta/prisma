import {META} from './model.js?v=94ae8e7aefbb';
import {PARTICLE_META} from './particle-model.js?v=94ae8e7aefbb';
import {LIGHT_META,TRACK_META} from './studio-model.js?v=94ae8e7aefbb';
import {descriptionCatalog,applyDescriptionPlan} from './description.js?v=94ae8e7aefbb';

// Shared by the local assistant and browser. Generated text can only propose these controls.
const sharedParticleKeys='volume stretchX stretchY stretchZ deform twist waves waveScale scale positionX positionY rotateX rotateY rotateZ duration speed motion metal roughness gloss iridescence transparency emission glow environmentPower environmentAngle environmentCycles gradientAngle gradientScale gradientOffset colorSoftness colorWaveAmount colorWaveBands colorWavePhase colorWaveHeight colorWaveRadius colorWaveSwirl colorWaveWarp bgAngle bgHeight bgSoftness bgWash exposure brightness contrast saturation grain temperature photoTint gamma blacks highlights vignette lensDistortion'.split(' ');
const particleTracks='rotateX rotateY rotateZ volume stretchX stretchY stretchZ deform twist waves gradientOffset gradientAngle gradientScale colorWavePhase colorWaveAmount metal roughness gloss iridescence transparency emission'.split(' ');
export function assistantCatalog(s){
 const all=descriptionCatalog(),particles=s.engine==='particles';
 const allowed=particles?[...Object.keys(PARTICLE_META),...sharedParticleKeys]:Object.keys(META).filter(k=>!Object.hasOwn(PARTICLE_META,k));
 return {...all,engine:s.engine,parameters:Object.fromEntries(allowed.filter(k=>META[k]).map(k=>[k,{...all.parameters[k],value:s[k]}])),
  motionTracks:Object.fromEntries(Object.entries(all.motionTracks).filter(([k])=>!particles||particleTracks.includes(k))),
  shapes:particles?[]:all.shapes,materials:particles?[]:all.materials,textureStyles:particles?[]:all.textureStyles,
  lightParameters:particles?Object.fromEntries(Object.entries(LIGHT_META).filter(([k])=>['x','y','z','power','size'].includes(k))):LIGHT_META,
  notes:particles?[
   'Unico nucleo Pathfinder: deforma la stessa materia, non sostituire con altri effetti. La posa corrente e i colori vanno conservati salvo richiesta.',
   'pMotionSoftness distende accelerazioni e filtra armoniche rapide. pFollow sfalsa le fibre. speed cambia durata effettiva=duration/speed.',
   'pTentacle attiva i tentacoli; count/length/taper/curl danno forma, wave/cycles li animano. Allungamento oltre 1 può richiedere scala minore solo se richiesto.',
   'pWander attiva correnti casuali; pWanderScale/pWanderCycles regolano spazio/tempo. pFlowBalance 0=corale, 1=individuale. pMotionSeed cambia percorsi senza ricampionare particelle.',
   'pOrbitOval allunga orbite, pOrbitTilt inclina il piano, pOrbitPrecession lo fa oscillare, pOrbitSpread sfalsa orbite, pOrbitDrift aggiunge deriva. pTravel ne controlla il movimento base.',
   'pSpaceWarp attiva il warp globale; pWarpScale/Cycles/Twist hanno effetto con pSpaceWarp>0. pWarp è invece distorsione del campo organico fine.',
   'pNeural raggruppa fibre, pLife pulsa, pSignal illumina impulsi: metafore artistiche, non simulazioni biologiche.',
   'pSize e pTrailWidth sono pixel a 1080p: .08-.6 finissimi, 1 normale. Colore pColorMode=0 resta assegnato alla stessa particella. 3 è colore nello spazio.',
   'pOuter=0 spegne fasci esterni. Nessuna luce visibile o ombra fisica sui granelli; gestisci x/y/z, power, size, color, enabled delle luci.',
   'Cicli interi e campi periodici chiudono il loop. Cambia solo ciò che serve; per richieste soggettive scegli valori moderati e spiegali in linguaggio naturale.'
  ]:[]};
}
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const nullable=schema=>({anyOf:[schema,{type:'null'}]});
const arr=items=>({type:'array',items});
export function assistantSchema(s){
 const c=assistantCatalog(s),str={type:'string'},num={type:'number'},bool={type:'boolean'};
 return object({message:str,clarification:nullable(str),changes:arr(object({key:{enum:Object.keys(c.parameters)},value:num})),palette:nullable(arr(str)),
  background:nullable(object({mode:{enum:['solid','gradient','transparent','studio']},colors:arr(str)})),environment:nullable({enum:['studio','sky','sunset','neon','aurora','aquarium','city']}),
  lights:arr(object({action:{enum:['add','edit','remove']},id:nullable({type:'integer'}),changes:arr(object({key:{enum:[...Object.keys(c.lightParameters),'color','enabled',...(s.engine==='particles'?[]:['type','visible'])]},value:{anyOf:[num,str,bool]}}))})),
  tracks:arr(object({key:{enum:Object.keys(c.motionTracks)},enabled:bool,amplitude:num,cycles:num,phase:num,direction:{enum:[-1,1]},curve:{enum:['sine','soft','triangle']},mode:{enum:['wave','cycle']}})),
  perfectLoop:nullable(bool),play:nullable(bool),shape:nullable(str),materialIndex:nullable({type:'integer'}),textureIndex:nullable({type:'integer'})});
}
export function assistantPlan(current,reply){
 if(!reply||typeof reply.message!=='string'||reply.message.length>1800||!(reply.clarification===null||typeof reply.clarification==='string'&&reply.clarification.length<=1000))throw Error('Risposta dell’assistente non valida.');
 const catalog=assistantCatalog(current),operations=[];
 if(reply.perfectLoop!==null)operations.push({type:'loop',perfect:reply.perfectLoop});
 if(!Array.isArray(reply.changes)||!Array.isArray(reply.lights)||!Array.isArray(reply.tracks)||reply.changes.length+reply.lights.length+reply.tracks.length>90)throw Error('Troppe modifiche proposte.');
 for(const {key,value}of reply.changes){if(!Object.hasOwn(catalog.parameters,key))throw Error('Controllo non disponibile: '+key);operations.push({type:'set',key,value});}
 if(reply.palette!==null)operations.push({type:'palette',colors:reply.palette});
 if(reply.background!==null)operations.push({type:'background',...reply.background});
 if(reply.environment!==null)operations.push({type:'environment',name:reply.environment});
 for(const l of reply.lights){if(!Array.isArray(l.changes)||l.changes.length>25)throw Error('Luce non valida');const values={};for(const {key,value}of l.changes){if(!Object.hasOwn(catalog.lightParameters,key)&&!['color','enabled',...(current.engine==='particles'?[]:['type','visible'])].includes(key))throw Error('Controllo luce non disponibile');values[key]=value;}operations.push({type:'light',action:l.action,id:l.id,values});}
 for(const {key,...values}of reply.tracks){if(!Object.hasOwn(catalog.motionTracks,key))throw Error('Traccia non disponibile');operations.push({type:'motionTrack',key,values});}
 for(const [prop,type,field]of [['shape','shape','name'],['materialIndex','material','index'],['textureIndex','textureStyle','index']])if(reply[prop]!==null){if(current.engine==='particles')throw Error('Questa modifica sostituirebbe il nucleo.');operations.push({type,[field]:reply[prop]});}
 if(reply.play!==null&&typeof reply.play!=='boolean')throw Error('Riproduzione non valida');
 // A clarification must never silently apply an incomplete interpretation.
 const plan={operations:reply.clarification?[]:operations};applyDescriptionPlan(current,plan);
 return {plan,message:reply.message,clarification:reply.clarification,play:reply.clarification?null:reply.play};
}
export function sameAssistantSource(current,source){return JSON.stringify(current)===JSON.stringify(source);}
