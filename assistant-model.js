import {META} from './model.js?v=bd6df16a7ed3';
import {PARTICLE_META} from './particle-model.js?v=bd6df16a7ed3';
import {PATH_META} from './particle-paths.js?v=bd6df16a7ed3';
import {LIGHT_META,TRACK_META} from './studio-model.js?v=bd6df16a7ed3';
import {descriptionCatalog,applyDescriptionPlan} from './description.js?v=bd6df16a7ed3';

// Shared by the local assistant and browser. Generated text can only propose these controls.
const sharedParticleKeys='volume stretchX stretchY stretchZ deform twist waves waveScale scale positionX positionY rotateX rotateY rotateZ duration speed motion metal roughness gloss iridescence transparency emission glow environmentPower environmentAngle environmentCycles gradientAngle gradientScale gradientOffset colorSoftness colorWaveAmount colorWaveBands colorWavePhase colorWaveHeight colorWaveRadius colorWaveSwirl colorWaveWarp bgAngle bgHeight bgSoftness bgWash exposure brightness contrast saturation grain temperature photoTint gamma blacks highlights vignette lensDistortion'.split(' ');
const particleTracks='rotateX rotateY rotateZ volume stretchX stretchY stretchZ deform twist waves gradientOffset gradientAngle gradientScale colorWavePhase colorWaveAmount metal roughness gloss iridescence transparency emission'.split(' ');
export function assistantCatalog(s){
 const all=descriptionCatalog(),particles=s.engine==='particles';
 const allowed=particles?[...Object.keys(PARTICLE_META),...sharedParticleKeys]:Object.keys(META).filter(k=>!Object.hasOwn(PARTICLE_META,k));
 return {...all,engine:s.engine,parameters:Object.fromEntries(allowed.filter(k=>META[k]).map(k=>[k,{...all.parameters[k],value:s[k]}])),
  motionTracks:Object.fromEntries(Object.entries(all.motionTracks).filter(([k])=>!particles||particleTracks.includes(k))),
  shapes:particles?[]:all.shapes,materials:particles?[]:all.materials,textureStyles:particles?[]:all.textureStyles,
  pathParameters:particles?PATH_META:{},paths:particles?(s.forcePaths||[]).map(({points,...p})=>({...p,knotCount:points.length})):[],
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
   'Riflessi setosi: pFiberSheen 0-1 orienta la luce sulla tangente 3D delle fibre; pFiberSpread 0-1 va da stretto a diffuso. Richiede fibre visibili, gloss e pLighting sopra 0. Per seta prova .75/.35; per madreperla regola anche iridescence e filmThickness. Conserva palette e forma; non cambia i granelli né crea una mesh tessuta.',
   'Scie/fibre: pTrailCount fino a 60000, pTrailWidth .015-8 px, pTrailLength 0-1 (frazione di loop), pTrailPersistence 1 mantiene la coda intera. pTrailCoherence avvicina i percorsi per creare tessuto; pTrailSoftness ammorbidisce i bordi, pTrailQuality 24-192 segmenti. pTrailDensity attenua la sovraesposizione delle trame dense. Per fibre prova 7000/.07 px/.28 lunghezza; tessuto 42000/.21 px/.85 lunghezza/coherence .95/persistence .9 e pOpacity 0. Preserva forma e colori.',
   'forcePoints contiene i punti manuali di attrazione/repulsione sulla scena. Conserva questi punti: questa versione del traduttore non li modifica; l’utente può trascinarli e regolarli in Moto → Punti sulla scena.',
   'paths modifica i percorsi già disegnati con il loro id. Non inventare percorsi o coordinate: se non ce ne sono, chiedi di disegnarli con Segui/Evita in Moto. coverage è la percentuale stabile di particelle potenzialmente coinvolte; radius è la zona di influenza 3D; strength la forza; adherence la compattezza sul percorso. orbitRadius=0 percorre la linea, maggiore di 0 satellita; orbitTurns e cycles sono interi per loop. release è il tempo percentuale libero per ogni particella, non la percentuale di particelle libere (quella è 100-coverage). softness ammorbidisce ingresso e uscita. mode=avoid respinge dalla linea e ignora i satelliti; follow segue. Non modificare points. Mantieni tutte le altre impostazioni.',
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
  paths:arr(object({id:{type:'integer'},changes:arr(object({key:{enum:[...Object.keys(PATH_META),'mode','enabled','closed','direction']},value:{anyOf:[num,str,bool]}}))})),
  perfectLoop:nullable(bool),play:nullable(bool),shape:nullable(str),materialIndex:nullable({type:'integer'}),textureIndex:nullable({type:'integer'})});
}
export function assistantPlan(current,reply){
 if(!reply||typeof reply.message!=='string'||reply.message.length>1800||!(reply.clarification===null||typeof reply.clarification==='string'&&reply.clarification.length<=1000))throw Error('Risposta dell’assistente non valida.');
 const catalog=assistantCatalog(current),operations=[];
 if(reply.perfectLoop!==null)operations.push({type:'loop',perfect:reply.perfectLoop});
 const pathEdits=reply.paths??[];
 if(!Array.isArray(reply.changes)||!Array.isArray(reply.lights)||!Array.isArray(reply.tracks)||!Array.isArray(pathEdits)||pathEdits.length>4||reply.changes.length+reply.lights.length+reply.tracks.length+pathEdits.length>90)throw Error('Troppe modifiche proposte.');
 for(const p of pathEdits){if(current.engine!=='particles'||!Number.isInteger(p.id)||!Array.isArray(p.changes)||p.changes.length>16)throw Error('Percorso non valido');operations.push({type:'path',id:p.id,values:Object.fromEntries(p.changes.map(({key,value})=>[key,value]))});}
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
