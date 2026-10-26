import {META} from './model.js?v=9d7adea7a5ff';
import {PARTICLE_META} from './particle-model.js?v=9d7adea7a5ff';
import {PATH_META} from './particle-paths.js?v=9d7adea7a5ff';
import {LIGHT_META,TRACK_META} from './studio-model.js?v=9d7adea7a5ff';
import {descriptionCatalog,applyDescriptionPlan} from './description.js?v=9d7adea7a5ff';

// Shared by the local assistant and browser. Generated text can only propose these controls.
const sharedParticleKeys='volume stretchX stretchY stretchZ deform twist waves waveScale scale positionX positionY rotateX rotateY rotateZ duration speed motion metal roughness gloss iridescence transparency emission glow environmentPower environmentAngle environmentCycles gradientAngle gradientScale gradientOffset colorSoftness colorWaveAmount colorWaveBands colorWavePhase colorWaveHeight colorWaveRadius colorWaveSwirl colorWaveWarp bgAngle bgHeight bgSoftness bgWash exposure brightness contrast saturation grain temperature photoTint gamma blacks highlights vignette lensDistortion'.split(' ');
const particleTracks='rotateX rotateY rotateZ volume stretchX stretchY stretchZ deform twist waves gradientOffset gradientAngle gradientScale colorWavePhase colorWaveAmount metal roughness gloss iridescence transparency emission'.split(' ');
export function assistantCatalog(s){
 const all=descriptionCatalog(),particles=s.engine==='particles'||s.pLiving>0;
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
   'Filtri: finishScan attiva Linee modulate (contorni FM) sul render di entrambi i motori. finishScanSpacing, finishScanWidth, finishScanDepth, finishScanAngle, finishScanThreshold, finishScanWave e finishScanFrequency regolano la trama; finishScanAnimate e finishScanCycles ne animano lo scorrimento nel loop. finishScanOnly, finishScanSource, finishScanColor e finishScanMix gestiscono composizione e colore; finishRegionScan usa i riquadri e scan è un elemento di finishOrder.',
   'pOuter=0 spegne fasci esterni. Nessuna sorgente luminosa visibile sui granelli. pShadow attiva ombre proiettate su un piano orizzontale: pShadowHeight ne regola la quota, pShadowSoftness i bordi, pShadowLight=-1 sceglie la luce attiva più intensa oppure usa il suo id. Il piano resta fermo; pSelfShadow attenua la luce selezionata fra parti della geometria (richiede pLighting>0); pCaustic rifrange la prima superficie verso il piano, richiede transparency>0, refraction>1, metal<1. Veli usano pVeilOpacity. Sono approssimazioni a raggi paralleli con una sola superficie, non ray tracing multirimbalzo. pOpticalExtent delimita la mappa luce; pSelfShadowBias evita autoartefatti. Gestisci x/y/z, power, size, color, enabled delle luci.',
   'Riflessi setosi: pFiberSheen 0-1 orienta la luce sulla tangente 3D delle fibre; pFiberSpread 0-1 va da stretto a diffuso. Richiede fibre visibili, gloss e pLighting sopra 0. Per seta prova .75/.35; per madreperla regola anche iridescence e filmThickness. Conserva palette e forma; non cambia i granelli né crea una mesh tessuta.',
   'Nel motore Particelle. pLivingBlend 0=particelle, .5=insieme, 1=struttura; pSurfaceBind lega granelli e nodi alla superficie; pLivingOcclusion attenua quelli dietro la pelle. pCount e pOpacity devono essere maggiori di zero per i granelli.',
   'Superficie connessa: pLiving 0=spento, 2=attivo. Pelle, fibre e tessitura sono componenti simultanee, non modalità esclusive. pBundleAmount miscela il raggruppamento in fasci. pBundles/pBundleSpread regolano fasci; pStrands/pThreadWidth/pThreadOpacity i fili; pWeft intreccia; pSkin mostra la superficie; pPores/pPoreCount aprono pori. pElastic/pBend resistono alle deformazioni, pVolumeHold conserva il volume con apertura chiusa virtualmente. pSkinOpening apre una coppa; pSkinOffset separa pelle e nucleo; pFoldCount/pFoldDepth danno pieghe; pInflate/pContract respirano e richiudono; pBundleDelay sfalsa zone, pFray sfrangia. Geometria guidata periodica con vincoli XPBD, senza collisioni o inerzia libera. Preservare forma, palette e durata quando si applica una struttura.',
   'Nuovi controlli Particelle: pSize fino a 128 px, pLinkNodeSize 0 eredita pSize altrimenti fino a 128 px; pTrailWidth fino a 64 px; pThreadWidth fino a 32 px; pGrainSpacing e pGroupSpacing hanno neutro 1, pDistributionCells 2-12. Spaziatura procedurale, non collisioni pairwise. Colori: colorLayers/colorLayerScale/colorLayerShift/colorLayerMix e structCoreDark/structCoreRadius funzionano anche sulle particelle e sui fili. Glitch: finishGlitchShape 3 incrocia due assi; finishGlitchDirectionRandom varia la direzione, finishGlitchCross regola il secondo asse. finishGlitchFlash true usa finishGlitchFlashMs 5-500 ms. keepMotionSpeed e motionPeriod separano la cadenza dalla durata del video. Percorsi chiusi mode contain, coverage100 strength3 release0 contengono il perimetro proiettato; mode avoid respinge solo dal tubo attorno alla curva.',
   'Connessioni 3D persistenti fra particelle: pLinks 0-1 visibilità, pLinkNodes 50-4000, pLinkReach .03-6 distanza nel nucleo iniziale, pLinkNeighbors 1-5, pLinkWidth .02-32 px, pLinkCurve 0-.8, pLinkStretch 1-12 limite prima della sfumatura. Per ragnatela prova 1800 nodi, .23 distanza, 3 vicini, .6 px. Palette e moto restano quelli di Particelle; non è simulazione di tessuto elastico.',
   'Scie/fibre: pTrailCount fino a 60000, pTrailWidth .015-8 px, pTrailLength 0-1 (frazione di loop), pTrailPersistence 1 mantiene la coda intera. pTrailCoherence avvicina i percorsi per creare tessuto; pTrailSoftness ammorbidisce i bordi, pTrailQuality 24-192 segmenti. pTrailDensity attenua la sovraesposizione delle trame dense. Per fibre prova 7000/.07 px/.28 lunghezza; tessuto 42000/.21 px/.85 lunghezza/coherence .95/persistence .9 e pOpacity 0. Preserva forma e colori.',
   'forcePoints contiene i punti manuali di attrazione/repulsione sulla scena. Conserva questi punti: questa versione del traduttore non li modifica; l’utente può trascinarli e regolarli in Moto → Punti sulla scena.',
   'paths modifica i percorsi già disegnati con il loro id. Non inventare percorsi o coordinate: se non ce ne sono, chiedi di disegnarli con Segui/Evita in Moto. coverage è la percentuale stabile di particelle potenzialmente coinvolte; radius è la zona di influenza 3D; strength la forza; adherence la compattezza sul percorso. orbitRadius=0 percorre la linea, maggiore di 0 satellita; orbitTurns e cycles sono interi per loop. release è il tempo percentuale libero per ogni particella, non la percentuale di particelle libere (quella è 100-coverage). softness ammorbidisce ingresso e uscita. mode=avoid respinge dalla linea e ignora i satelliti; follow segue. Non modificare points. Mantieni tutte le altre impostazioni.',
   'Cicli interi e campi periodici chiudono il loop. Cambia solo ciò che serve; per richieste soggettive scegli valori moderati e spiegali in linguaggio naturale.'
   ]:[
   'Collisioni delle radici: petalCollision separa i fili, petalSphereCollision li tiene fuori dal nucleo salvo gli innesti. Sono vincoli quasi statici, senza inerzia libera. petalContactGap regola il distacco; petalContactStiffness resiste a stiramento e pieghe; petalContactPasses 8-32 aumenta la precisione a costo di tempo. Con molti fili spessi possono restare compenetrazioni.',
   'Con petalCollision>0 le animazioni petal* sono sospese, tranne petalFlowPhase. Restano salvate e riprendono a zero. Non promettere avvolgimenti animati e contatti fra fili simultanei. Usa petalFlowPhase per materia che scorre oppure rotateX/Y/Z per muovere tutto insieme. I valori statici della geometria restano modificabili.'
  ]};
}
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const nullable=schema=>({anyOf:[schema,{type:'null'}]});
const arr=items=>({type:'array',items});
export function assistantSchema(s){
 const c=assistantCatalog(s),str={type:'string'},num={type:'number'},bool={type:'boolean'};
 return object({message:str,clarification:nullable(str),changes:arr(object({key:{enum:Object.keys(c.parameters)},value:num})),palette:nullable(arr(str)),
  background:nullable(object({mode:{enum:['solid','gradient','transparent','studio']},colors:arr(str)})),environment:nullable({enum:['studio','sky','sunset','neon','aurora','aquarium','city']}),
  lights:arr(object({action:{enum:['add','edit','remove']},id:nullable({type:'integer'}),changes:arr(object({key:{enum:[...Object.keys(c.lightParameters),'color','enabled',...((s.engine==='particles'||s.pLiving>0)?[]:['type','visible'])]},value:{anyOf:[num,str,bool]}}))})),
  tracks:arr(object({key:{enum:Object.keys(c.motionTracks)},enabled:bool,amplitude:num,cycles:num,phase:num,pace:num,pacePhase:num,hold:num,direction:{enum:[-1,1]},curve:{enum:['sine','soft','triangle']},mode:{enum:['wave','cycle']}})),
  paths:arr(object({id:{type:'integer'},changes:arr(object({key:{enum:[...Object.keys(PATH_META),'mode','enabled','closed','direction']},value:{anyOf:[num,str,bool]}}))})),
  perfectLoop:nullable(bool),play:nullable(bool),shape:nullable(str),materialIndex:nullable({type:'integer'}),textureIndex:nullable({type:'integer'})});
}
export function assistantPlan(current,reply){
 if(!reply||typeof reply.message!=='string'||reply.message.length>1800||!(reply.clarification===null||typeof reply.clarification==='string'&&reply.clarification.length<=1000))throw Error('Risposta dell’assistente non valida.');
 const catalog=assistantCatalog(current),operations=[];
 if(reply.perfectLoop!==null)operations.push({type:'loop',perfect:reply.perfectLoop});
 const pathEdits=reply.paths??[];
 if(!Array.isArray(reply.changes)||!Array.isArray(reply.lights)||!Array.isArray(reply.tracks)||!Array.isArray(pathEdits)||pathEdits.length>4||reply.changes.length+reply.lights.length+reply.tracks.length+pathEdits.length>90)throw Error('Troppe modifiche proposte.');
 for(const p of pathEdits){if((current.engine!=='particles'&&!current.pLiving)||!Number.isInteger(p.id)||!Array.isArray(p.changes)||p.changes.length>16)throw Error('Percorso non valido');operations.push({type:'path',id:p.id,values:Object.fromEntries(p.changes.map(({key,value})=>[key,value]))});}
 for(const {key,value}of reply.changes){if(!Object.hasOwn(catalog.parameters,key))throw Error('Controllo non disponibile: '+key);operations.push({type:'set',key,value});}
 if(reply.palette!==null)operations.push({type:'palette',colors:reply.palette});
 if(reply.background!==null)operations.push({type:'background',...reply.background});
 if(reply.environment!==null)operations.push({type:'environment',name:reply.environment});
 for(const l of reply.lights){if(!Array.isArray(l.changes)||l.changes.length>25)throw Error('Luce non valida');const values={};for(const {key,value}of l.changes){if(!Object.hasOwn(catalog.lightParameters,key)&&!['color','enabled',...((current.engine==='particles'||current.pLiving>0)?[]:['type','visible'])].includes(key))throw Error('Controllo luce non disponibile');values[key]=value;}operations.push({type:'light',action:l.action,id:l.id,values});}
 for(const {key,...values}of reply.tracks){if(!Object.hasOwn(catalog.motionTracks,key))throw Error('Traccia non disponibile');operations.push({type:'motionTrack',key,values});}
 for(const [prop,type,field]of [['shape','shape','name'],['materialIndex','material','index'],['textureIndex','textureStyle','index']])if(reply[prop]!==null){if(current.engine==='particles'||current.pLiving>0)throw Error('Questa modifica sostituirebbe il nucleo.');operations.push({type,[field]:reply[prop]});}
 if(reply.play!==null&&typeof reply.play!=='boolean')throw Error('Riproduzione non valida');
 // A clarification must never silently apply an incomplete interpretation.
 const plan={operations:reply.clarification?[]:operations};applyDescriptionPlan(current,plan);
 return {plan,message:reply.message,clarification:reply.clarification,play:reply.clarification?null:reply.play};
}
export function sameAssistantSource(current,source){return JSON.stringify(current)===JSON.stringify(source);}
