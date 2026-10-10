// Continuous, periodic particle fields. Units for point and trail sizes are pixels at 1080p.
export const PARTICLE_VERSION=8;
export const FAMILIES=['Nucleo Pathfinder'];
export const SPRITES=['Granello','Disco','Anello','Scintilla'];
export const COLOR_MODES=['Solidale alla forma iniziale','Identità della particella','Fasci e filamenti','Campo nello spazio'];
// label, min, max, step; grouped independently from the solid renderer.
export const PARTICLE_META={
 pFilm:['Pellicola viva',0,1,.01],pFilmScale:['Scala delle venature',.2,5,.01],pFilmVariation:['Variazione dello spessore',0,1,.01],
 pFiberSheen:['Riflesso setoso',0,1,.01],pFiberSpread:['Larghezza del riflesso',0,1,.01],
 pLife:['Vitalità',0,1,.01],pPulse:['Pulsazioni nel loop',1,12,1],pSignal:['Intensità dei segnali',0,1,.01],pPropagation:['Propagazione tra le zone',0,1,.01],pNeural:['Struttura neuronale',0,1,.01],pNodes:['Nodi della rete',4,64,1],pConnect:['Connettività',0,1,.01],pSymmetry:['Simmetria radiale',1,12,1],
 pCount:['Numero di particelle',0,300000,100],pSize:['Diametro particelle · px',.08,16,.01],pSizeVar:['Variazione dimensioni',0,1,.01],pSprite:['Sagoma del granello',0,3,1],pOpacity:['Opacità particelle',0,1,.01],pSoftness:['Morbidezza granello',0,1,.01],
 pOpening:['Vuoto centrale · sfera / anello',0,1,.01],pThickness:['Spessore / raggio del nucleo',.02,1,.01],pFill:['Riempimento del volume',0,1,.01],pClumps:['Addensamenti',0,1,.01],pLobes:['Lobi / ramificazioni',1,12,1],pLobeDepth:['Profondità lobi',0,1,.01],
 pOrganic:['Organicità',0,2,.01],pFrequency:['Scala del campo organico',.3,8,.01],pDetail:['Ottave del dettaglio',1,5,1],pRough:['Peso del dettaglio fine',0,1,.01],pWarp:['Distorsione del campo',0,1,.01],
 pCohesion:['Coesione del movimento',0,1,.01],pRandom:['Irregolarità del moto',0,1,.01],pJitter:['Microfluttuazioni',0,1,.01],pVortex:['Vorticità',-2,2,.01],pReentry:['Rientro verso il nucleo',0,1,.01],pBreath:['Respiro',0,1,.01],pTravel:['Ampiezza delle orbite',0,1,.01],
 pMotionSoftness:['Morbidezza del movimento',0,1,.01],pFollow:['Ritardo tra le fibre',0,1,.01],
 pOrbitOval:['Ellitticità delle orbite',0,1,.01],pOrbitTilt:['Inclinazione orbite · °',-90,90,1],pOrbitPrecession:['Precessione delle orbite',0,1,.01],pOrbitSpread:['Sfasamento delle orbite',0,1,.01],pOrbitDrift:['Deriva orbitale',0,1,.01],
 pWander:['Esplorazione casuale',0,1,.01],pWanderScale:['Dimensione delle correnti',.2,5,.01],pWanderCycles:['Evoluzioni casuali nel loop',1,8,1],pFlowBalance:['Movimento corale / individuale',0,1,.01],pMotionSeed:['Seed del movimento',0,9999,1],
 pTentacle:['Tentacolarità',0,1,.01],pTentacleCount:['Numero di tentacoli',1,16,1],pTentacleLength:['Allungamento tentacoli',0,3,.01],pTentacleTaper:['Concentrazione dei tentacoli',.2,6,.01],pTentacleCurl:['Arricciamento tentacoli',-2,2,.01],pTentacleWave:['Ondulazione tentacoli',0,1,.01],pTentacleCycles:['Onde dei tentacoli nel loop',1,8,1],
 pSpaceWarp:['Warp dello spazio',0,1,.01],pWarpScale:['Scala del warp',.2,5,.01],pWarpCycles:['Cicli del warp',1,8,1],pWarpTwist:['Torsione del warp',-2,2,.01],
 pAttract:['Attrazione',0,2,.01],pRepel:['Repulsione',0,2,.01],pMagnet:['Avvolgimento magnetico',-2,2,.01],pPoles:['Numero di poli',1,6,1],pRadius:['Raggio dei poli',.1,2.5,.01],pField:['Influenza dei poli',.1,3,.01],
 pOuter:['Fasci esterni',0,1,.01],pReach:['Estensione fasci',0,4,.01],pBranches:['Numero di fasci',1,12,1],
 pCycles:['Cicli nel loop',1,12,1],pDirection:['Direzione del moto',-1,1,2],pRhythm:['Accelerazioni e rallentamenti',0,1,.01],pPause:['Pausa nel ciclo',0,.45,.01],pSpeedSpread:['Diversità delle cadenze',0,1,.01],
 pTrailCount:['Numero di fibre / scie',0,60000,10],pTrailLength:['Coda · frazione del loop',0,1,.005],pTrailWidth:['Spessore fibre · px',.015,8,.005],pTrailOpacity:['Opacità scie',0,1,.01],pTrailFade:['Sfumatura della coda',.1,5,.01],pTrailTaper:['Assottigliamento della coda',0,1,.01],pTrailScatter:['Dispersione delle scie',0,1,.01],
 pTrailPersistence:['Persistenza della coda',0,1,.01],pTrailSoftness:['Morbidezza delle fibre',0,1,.01],pTrailCoherence:['Coesione in tessuto',0,1,.01],pTrailDensity:['Compensazione luminosità',0,1,.01],pTrailQuality:['Definizione delle curve',24,192,8],
 pColorMode:['Colore sulle particelle',0,3,1],pColorScatter:['Variazione cromatica individuale',0,1,.01],pLumaVar:['Variazione luminosità individuale',0,1,.01],pDepthFade:['Attenuazione in profondità',0,1,.01],pLighting:['Risposta alle luci',0,1,.01],
};
export const PARTICLE_DEFAULTS={
 pFilm:0,pFilmScale:1,pFilmVariation:.5,
 pFiberSheen:0,pFiberSpread:.35,
 pLife:.2,pPulse:2,pSignal:.1,pPropagation:.4,pNeural:0,pNodes:24,pConnect:.4,pSymmetry:1,
 pFamily:0,pMorph:0,pTarget:0,pCount:85000,pSize:1.1,pSizeVar:.6,pSprite:0,pOpacity:.5,pSoftness:.6,
 pOpening:.15,pThickness:.45,pFill:.45,pClumps:.2,pLobes:3,pLobeDepth:.18,
 pOrganic:.6,pFrequency:2.1,pDetail:3,pRough:.42,pWarp:.25,pCohesion:.72,pRandom:.3,pJitter:.06,pVortex:.5,pReentry:.2,pBreath:.1,pTravel:1,
 pMotionSoftness:0,pFollow:0,pOrbitOval:0,pOrbitTilt:0,pOrbitPrecession:0,pOrbitSpread:0,pOrbitDrift:0,
 pWander:0,pWanderScale:1.2,pWanderCycles:2,pFlowBalance:.65,pMotionSeed:417,
 pTentacle:0,pTentacleCount:5,pTentacleLength:1.2,pTentacleTaper:2,pTentacleCurl:.5,pTentacleWave:.3,pTentacleCycles:2,
 pSpaceWarp:0,pWarpScale:1,pWarpCycles:1,pWarpTwist:.2,
 pAttract:.2,pRepel:.08,pMagnet:.18,pPoles:3,pRadius:1.2,pField:.9,
 pOuter:0,pReach:1.4,pBranches:5,pCycles:1,pDirection:1,pRhythm:.6,pPause:0,pSpeedSpread:.3,
 pTrailCount:700,pTrailLength:.085,pTrailWidth:.55,pTrailOpacity:.3,pTrailFade:1.7,pTrailTaper:.8,pTrailScatter:0,
 pTrailPersistence:0,pTrailSoftness:.35,pTrailCoherence:0,pTrailDensity:.75,pTrailQuality:64,
 pColorMode:0,pColorScatter:.06,pLumaVar:.25,pDepthFade:.25,pLighting:.65,
};
export const PARTICLE_GROUPS={
 shape:['pCount','pSize','pSizeVar','pSprite','pOpacity','pSoftness','pTrailCount','pTrailLength','pTrailWidth','pTrailOpacity','pTrailFade','pTrailTaper','pTrailScatter','pTrailPersistence','pTrailSoftness','pTrailCoherence','pTrailDensity','pTrailQuality','pOpening','pThickness','pFill','pClumps','pLobes','pLobeDepth','pOrganic','pFrequency','pDetail','pRough','pWarp','pOuter','pReach','pBranches','pNeural','pNodes','pConnect','pSymmetry','pTentacle','pTentacleCount','pTentacleLength','pTentacleTaper','pTentacleCurl'],
 material:['pFilm','pFilmScale','pFilmVariation','pFiberSheen','pFiberSpread'],
 color:['pColorMode','pColorScatter','pLumaVar'],light:['pLighting','pDepthFade'],
 motion:['pCohesion','pRandom','pJitter','pVortex','pReentry','pBreath','pTravel','pAttract','pRepel','pMagnet','pPoles','pRadius','pField','pCycles','pDirection','pRhythm','pPause','pSpeedSpread','pLife','pPulse','pSignal','pPropagation','pMotionSoftness','pFollow','pOrbitOval','pOrbitTilt','pOrbitPrecession','pOrbitSpread','pOrbitDrift','pWander','pWanderScale','pWanderCycles','pFlowBalance','pMotionSeed','pTentacleWave','pTentacleCycles','pSpaceWarp','pWarpScale','pWarpCycles','pWarpTwist'],
};
// Geometry-only reset: material, palette, seed and loop duration are preserved.
export const SPHERE_FORM={pOpening:0,pThickness:.6,pFill:1,pClumps:0,pLobeDepth:0,pOrganic:0,pWarp:0,pNeural:0,pSymmetry:1,pTentacle:0,pOuter:0,pRandom:0,pJitter:0,pVortex:0,pReentry:0,pBreath:0,pLife:0,pAttract:0,pRepel:0,pMagnet:0,pOrbitOval:0,pOrbitTilt:0,pOrbitPrecession:0,pOrbitDrift:0,pWander:0,pSpaceWarp:0,deform:0,twist:0,waves:0,volume:1,stretchX:1,stretchY:1,stretchZ:1,pTravel:1};
export function particleSphere(s){
 Object.assign(s,SPHERE_FORM);
 for(const k of ['volume','deform','twist','waves'])if(s.motions?.[k])s.motions[k].enabled=false;
 for(const p of [...s.forcePoints||[],...s.forcePaths||[]])p.enabled=false;
 return s;
}
export const PARTICLE_STUDIES=[
 {name:'Nucleo vivo',label:'Pathfinder · equilibrio',values:{}},
 {name:'Polvere fine',label:'Volume · micrograni',values:{pOpening:0,pCount:180000,pSize:.55,pOpacity:.7,pFill:1,pOrganic:.4,pTrailCount:0,palette:['#31456d','#6398b0','#b4e4ce','#f5e9b8']}},
 {name:'Filamenti',label:'Anello · scie sottili',values:{pOpening:.65,pCount:55000,pSize:.7,pNeural:.4,pTrailCount:1500,pTrailWidth:.3,pTrailLength:.2,pTrailOpacity:.3,pOrganic:.35,palette:['#413568','#948cbb','#e2bebb','#e1e8df']}},
 {name:'Sfera piena',label:'Volume · senza vuoto',values:{...SPHERE_FORM,pSize:.75,pCount:110000,pTrailCount:0,pSizeVar:.35,palette:['#efe5d5','#b9e6e0','#d1c9e4','#faf6ea']}},
 {name:'Espanso',label:'Pathfinder · repulsione',values:{pOpening:.8,pThickness:.3,pRepel:1,pAttract:0,pCohesion:.4,pVortex:.9,pOrganic:.7,pOuter:.2,pReach:1.2,pSize:.85}},
 {name:'Pulsante',label:'Nucleo · vitalità',values:{pOpening:0,pLobeDepth:.3,pLife:.8,pPulse:3,pSignal:.7,pPropagation:.7,pNeural:.65,pNodes:32,pConnect:.7,pOrganic:.3,pSize:.9,palette:['#1d3667','#43898c','#b6d89b','#e7d6a0']}},
];
export function particleCreation(base,index=0,seed=417){
 const s=structuredClone(base);Object.assign(s,PARTICLE_DEFAULTS,{engine:'particles',particleVersion:PARTICLE_VERSION,seed:seed>>>0,forcePoints:[],forcePaths:[],
 volume:1,stretchX:1,stretchY:1,stretchZ:1,deform:0,twist:0,waves:0,waveScale:3,scale:1.25,positionX:0,positionY:0,rotateX:20,rotateY:-18,rotateZ:0,
 duration:10,speed:1,perfectLoop:true,transparency:0,metal:.18,roughness:.38,gloss:.7,iridescence:.1,emission:.6,glow:.22,
 environment:'studio',environmentPower:.35,environmentAngle:0,environmentRotate:false,filmFlow:0,filmSwirl:0,
 palette:['#063c54','#308993','#a0ece1','#e9ffd5'],gradientAngle:35,gradientScale:1,gradientOffset:0,colorSoftness:1,colorWaveAmount:0,
 bgMode:'solid',background:'#020307',background2:'#122737',exposure:0,brightness:0,contrast:1,saturation:1,grain:0,
 temperature:0,photoTint:0,gamma:1,blacks:0,highlights:0,vignette:0,lensDistortion:0,photoAll:false,
 ...PARTICLE_STUDIES[index].values});
 for(const t of Object.values(s.motions))t.enabled=false;
 for(const l of s.lights){l.orbit.enabled=false;l.pulse.enabled=false;l.visible=false;}
 return s;
}
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let v=Math.imul(a^a>>>15,a|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};}
export function migratePathfinder(doc,base){
 if(![1,2].includes(doc.version)||!doc.parameters)throw Error('Preset Pathfinder non riconosciuto.');
 const p=doc.parameters,s=particleCreation(base);const shared=p.prisma||{};
 for(const key of Object.keys(base))if(shared[key]!==undefined)s[key]=structuredClone(shared[key]);
 Object.assign(s,{engine:'particles',seed:p.seed,duration:p.duration,pCount:Math.round((p.density??1)*64000),pOpening:p.opening??.55,pOrganic:p.turbulence??.6,pVortex:p.vortex??.5,pRhythm:p.rhythm??.6,pPause:p.pause??0,pCycles:p.cycles??1,pDirection:p.direction??1,pOuter:p.outerStrength??1,pReach:(p.outerReach??1)*2.9,pTrailLength:.003+(p.trails??.65)*.107,pTrailCount:Math.round((p.density??1)*1600),pSize:shared.pointSize??1,rotateX:(shared.rotateX??0)+(p.pitch??0),rotateY:(shared.rotateY??0)+(p.yaw??0),pColorMode:0});
 if(!shared.usePalette)s.palette=p.palette==='ember'?['#6b0a05','#ff8526']:p.palette==='pearl'?['#3d2666','#ffd9c4']:['#094561','#9efaff'];
 if(s.bgMode==='original')s.bgMode='solid';
 return s;
}
export function varyParticles(source,seed,amount=.45,scope='all',surprise=false){
 const r=rng(seed),s=surprise?particleCreation(source,Math.floor(r()*PARTICLE_STUDIES.length),seed):structuredClone(source);if(scope==='all'||scope==='shape')s.seed=seed>>>0;
 for(const [group,keys] of Object.entries(PARTICLE_GROUPS))if(scope==='all'||scope===group)for(const key of keys){
  const [,lo,hi,step]=PARTICLE_META[key];
  if(['pColorMode','pSprite','pDirection'].includes(key)){if(surprise||r()<amount*.3)s[key]=key==='pDirection'?(r()<.5?-1:1):Math.floor(lo+r()*(hi-lo+1));continue;}
  let v=s[key]+(r()-.5)*(hi-lo)*amount*.8;
  if(['pCount','pTrailCount'].includes(key))v=s[key]*Math.pow(2,(r()-.5)*amount*3);
  s[key]=Math.min(hi,Math.max(lo,step>=1?Math.round(v/step)*step:v));
 }
 // A random study should still contain visible matter and retain its time scale.
 if(surprise){s.pSize=.25+r()*1.3;s.pOpacity=.3+r()*.4;s.pTrailOpacity=.12+r()*.35;s.pCount=Math.round(40000+r()*120000);s.pOuter=r()<.2?r()*.5:0;s.duration=source.duration;s.speed=source.speed;}
 return s;
}
// A fresh choreography keeps the sampled matter, palette, lights and loop duration intact.
export function varyParticleMotion(source,seed,amount=.45){
 const s=varyParticles(source,seed,amount,'motion');s.seed=source.seed;s.pMotionSeed=seed%10000;
 return s;
}
// Material recipes on the current nucleus: never replace colors, geometry or choreography.
export const FIBER_STYLES={
 fibres:{pTrailCount:7000,pTrailLength:.28,pTrailWidth:.07,pTrailOpacity:.6,pTrailPersistence:.28,pTrailSoftness:.75,pTrailCoherence:.2,pTrailDensity:.6,pTrailQuality:96,pTrailTaper:.6,pOpacity:.16},
 threads:{pTrailCount:18000,pTrailLength:.6,pTrailWidth:.13,pTrailOpacity:.55,pTrailPersistence:.62,pTrailSoftness:.7,pTrailCoherence:.68,pTrailDensity:.8,pTrailQuality:128,pTrailTaper:.25,pOpacity:.07},
 fabric:{pTrailCount:42000,pTrailLength:.85,pTrailWidth:.21,pTrailOpacity:.5,pTrailPersistence:.9,pTrailSoftness:.8,pTrailCoherence:.95,pTrailDensity:1,pTrailQuality:160,pTrailTaper:.08,pOpacity:0}
};

export const FILM_STYLES={
 living:{filmPattern:0,filmChroma:0,filmDuo:0,pFilm:1,pFilmScale:1.1,pFilmVariation:.8,filmThickness:520,filmFlow:.75,filmSwirl:.45,filmCycles:1,pFiberSheen:.8,pFiberSpread:.3,pLighting:1,emission:.04,metal:.12,roughness:.18,gloss:1,iridescence:.15},
 satin:{filmPattern:0,filmChroma:0,filmDuo:0,pFilm:.6,pFilmScale:.6,pFilmVariation:.35,filmThickness:380,filmFlow:.3,filmSwirl:.18,filmCycles:1,pFiberSheen:.8,pFiberSpread:.65,pLighting:1,emission:.08,metal:.08,roughness:.4,gloss:.85,iridescence:.1}
};
