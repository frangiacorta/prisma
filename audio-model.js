import {META} from './model.js?v=336f6e73d149';

export const AUDIO_BANDS = {all:'Volume',low:'Bassi',mid:'Medi',high:'Alti',peak:'Picchi',onset:'Impulsi',brightness:'Brillantezza',texture:'Rumorosità',beat:'Ritmo'};
export const AUDIO_META = {
  recordSeconds:['Durata registrazione · secondi',2,60,1],clipSeam:['Raccordo del loop · %',0,25,1],
  bpm:['Tempo · BPM',30,240,.1],rhythmWidth:['Durata impulso · %',5,100,1],rhythmSoftness:['Morbidezza impulso',0,1,.01],rhythmPhase:['Sfasamento del ciclo',0,1,.01],
  gain:['Sensibilità',.1,32,.1],threshold:['Soglia del rumore',0,.1,.001],
  mix:['Intensità sulla scena',0,2,.01],attack:['Attacco · secondi',0,2,.005],curve:['Risposta ai suoni deboli',.25,3,.01],
  release:['Rilascio · secondi',.02,5,.01],lowCut:['Fine dei bassi · Hz',80,1500,10],highCut:['Inizio degli alti · Hz',500,8000,50],
  onsetSensitivity:['Sensibilità agli impulsi',.5,4,.05],onsetHold:['Distanza minima impulsi · secondi',.08,1,.01]
};
const shared={
 'Moto globale':['speed','motion','rotateX','rotateY','rotateZ','positionX','positionY'],
 'Dimensioni e deformazione':['scale','stretchX','stretchY','stretchZ','deform','twist','waves'],
 'Luce e materia':['glow','emission','roughness','iridescence','gradientOffset','metal','transparency']
};
export const audioTargetGroups=engine=>engine==='particles'?{
 'Moto · orbite':['pTravel','pOrbitOval','pOrbitTilt','pOrbitPrecession','pOrbitSpread','pOrbitDrift','pVortex'],
 'Moto · correnti e coesione':['pWander','pWanderScale','pFlowBalance','pCohesion','pRandom','pJitter','pMotionSoftness','pFollow','pReentry','pRhythm','pPause','pSpeedSpread'],
 'Moto · tentacoli e warp':['pTentacle','pTentacleLength','pTentacleCurl','pTentacleWave','pSpaceWarp','pWarpScale','pWarpTwist','pWarp'],
 'Moto · forze e vitalità':['pAttract','pRepel','pMagnet','pRadius','pField','pLife','pBreath','pSignal','pPropagation'],
 'Nucleo e fibre':['pOpening','pThickness','pFill','pOrganic','pFrequency','pClumps','pLobeDepth','pSize','pSizeVar','pOpacity','pSoftness','pTrailWidth','pTrailLength','pTrailOpacity','pTrailPersistence','pTrailCoherence','pFiberSheen'],...shared
}:{...shared,'Crescita e radici':['petalAmount','petalOpen','petalCurl','petalInflate','petalGrowth','petalWander','petalCoil','petalReentry','petalDisorder','stemBend','bendX','bendY']};
export const audioTargets=engine=>[...new Set(Object.values(audioTargetGroups(engine)).flat())].filter(k=>META[k]);
const allowed=new Set([...audioTargets('particles'),...audioTargets('solid')]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback,a,b)=>Number.isFinite(v)?clamp(v,a,b):fallback;
const defaults={recordSeconds:10,clipSeam:12,clipLoop:true,bpm:90,rhythmEvery:1,rhythmWidth:65,rhythmSoftness:.8,rhythmPhase:0,source:'microphone',gain:1.5,threshold:.002,mix:1,attack:.015,release:.18,curve:.7,autoLevel:true,animate:true,lowCut:200,highCut:2000,onsetSensitivity:1.5,onsetHold:.18};
const mapping=(band,target,amount)=>({band,target,amount,reverse:false,enabled:true});
const range=(band,target,from,to)=>({...mapping(band,target,1),mode:'range',from,to});

export function audioPreset(name='diretta',engine='solid') {
  const particles=engine==='particles';
  if(name==='ritmo')return {...defaults,mappings:particles?[mapping('beat','pWander',.4),mapping('beat','pOrbitDrift',.35),mapping('beat','pFiberSheen',.55),mapping('beat','scale',.08)]:[mapping('beat','deform',.3),mapping('beat','twist',.1),mapping('beat','glow',.4),mapping('beat','scale',.08)]};
  if(name==='timbro')return {...defaults,attack:.04,release:.3,mappings:particles?[mapping('brightness','pVortex',.18),mapping('brightness','pFiberSheen',.65),mapping('texture','pWander',.65),mapping('texture','pSpaceWarp',.55),range('texture','pCohesion',.9,.25)]:[mapping('brightness','twist',.16),mapping('brightness','glow',.35),mapping('texture','deform',.45),mapping('texture','waves',.35),range('texture','roughness',.12,.65)]};
  if(name==='respiro')return {...defaults,attack:.12,release:.8,mappings:[mapping('all','scale',.22),mapping('all',particles?'pLife':'deform',.55),mapping('high',particles?'pFiberSheen':'glow',.45)]};
  if(name==='marea')return {...defaults,attack:.08,release:.55,mappings:particles?[range('low','pTravel',.2,1),mapping('low','pOrbitDrift',.5),mapping('mid','pWander',.55),mapping('mid','pVortex',.18),mapping('high','pFiberSheen',.5)]:[mapping('low','scale',.2),mapping('mid','twist',.12),mapping('mid','waves',.25),mapping('high','glow',.45)]};
  if(name==='tentacoli')return {...defaults,attack:.025,release:.3,mappings:particles?[mapping('all','pTentacle',.7),mapping('low','pTentacleLength',.35),mapping('mid','pTentacleWave',.65),mapping('onset','pTentacleCurl',.2),mapping('high','pSpaceWarp',.5),mapping('all','speed',.35)]:[mapping('all','petalAmount',.7),mapping('low','petalInflate',.35),mapping('mid','petalWander',.65),mapping('onset','petalCurl',.25),mapping('high','twist',.12)]};
  if(name==='impulsi')return {...defaults,attack:0,release:.16,mappings:particles?[mapping('onset','pRepel',.45),mapping('onset','pSpaceWarp',.7),mapping('onset','pSignal',.9),mapping('low','pOrbitDrift',.45),mapping('peak','pFiberSheen',.7)]:[mapping('onset','scale',.3),mapping('onset','deform',.5),mapping('onset','twist',.15),mapping('peak','glow',.7)]};
  return {...defaults,mappings:particles?[mapping('all','pWander',.65),mapping('low','pOrbitDrift',.6),mapping('mid','pSpaceWarp',.65),mapping('high','pVortex',.18),mapping('all','pReentry',.4),mapping('onset','pSignal',.75),mapping('all','speed',.45)]:[mapping('all','deform',.55),mapping('low','twist',.18),mapping('mid','waves',.4),mapping('high','rotateZ',.07),mapping('onset','scale',.18),mapping('all','speed',.45)]};
}

export function normalizeAudio(raw,engine='solid') {
  raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const value={...defaults,version:2,clipLoop:raw.clipLoop!==false,source:raw.source==='file'?'file':'microphone',autoLevel:raw.autoLevel!==false,animate:raw.animate!==false};
  for(const [key,[,min,max]] of Object.entries(AUDIO_META))value[key]=finite(raw[key],defaults[key],min,max);
  value.recordSeconds=Math.round(value.recordSeconds);
  value.rhythmEvery=[.5,1,2,4,8].includes(raw.rhythmEvery)?raw.rhythmEvery:defaults.rhythmEvery;
  value.highCut=Math.max(value.lowCut+100,value.highCut);
  const rows=Array.isArray(raw.mappings)?raw.mappings:audioPreset('diretta',engine).mappings;
  value.mappings=rows.slice(0,24).filter(row=>row&&allowed.has(row.target)&&Object.hasOwn(AUDIO_BANDS,row.band)).map(row=>{
    const [,min,max]=META[row.target];
    return {band:row.band,target:row.target,amount:finite(row.amount,.3,0,2),reverse:row.reverse===true,enabled:row.enabled!==false,mode:row.mode==='range'?'range':'add',from:finite(row.from,min,min,max),to:finite(row.to,max,min,max),curve:finite(row.curve,1,.25,4)};
  });
  return value;
}

// Overlay only: never integrate samples into the saved or animated base state.
// Summing first makes repeated targets order independent; clamp once per target.
export function audioPreviewState(state,bands) {
  const c=normalizeAudio(state.audioReactive,state.engine),supported=audioTargets(state.engine),changes={};
  if(!c.mix)return state;
  for(const row of c.mappings) {
    if(!row.enabled||!supported.includes(row.target)||!Number.isFinite(state[row.target]))continue;
    const level=finite(bands?.[row.band],0,0,1),signal=Math.pow(level,row.curve);
    const [,min,max]=META[row.target];let delta;
    if(row.mode==='range'){
      const activity=Math.min(1,Math.max(level,row.band==='beat'?0:finite(bands?.all,0,0,1))*8);
      const destination=row.from+(row.to-row.from)*(row.reverse?1-signal:signal);
      delta=(destination-state[row.target])*activity;
    }else delta=(max-min)*signal*(row.reverse?-1:1);
    changes[row.target]=(changes[row.target]||0)+delta*c.mix*row.amount;
  }
  const result={...state};let changed=false;
  for(const [key,delta] of Object.entries(changes)) {
    const [,min,max]=META[key];
    if(!Number.isFinite(state[key]))continue;
    const value=clamp(state[key]+delta,min,max);
    if(value!==state[key]){result[key]=value;changed=true;}
  }
  return changed?result:state;
}

export function audioMappingHint(state,row) {
  if(row.mode!=='range'&&((!row.reverse&&state[row.target]>=META[row.target][2])||(row.reverse&&state[row.target]<=META[row.target][1])))return 'Già al limite: inverti la direzione oppure scegli un intervallo.';
  const parent={pTentacleWave:'pTentacle',pTentacleCurl:'pTentacle',pTentacleLength:'pTentacle',pWarpTwist:'pSpaceWarp',pWarpScale:'pSpaceWarp',pWanderScale:'pWander',pCohesion:'pOrganic',pWarp:'pOrganic'}[row.target];
  if(parent&&state[parent]===0&&!normalizeAudio(state.audioReactive,state.engine).mappings.some(r=>r.enabled&&r.target===parent))return `Richiede ${META[parent][0]}: ora è a zero. Collegalo all’audio o aumentalo in Moto.`;
  return '';
}

export const AUDIO_HELP={
  recordSeconds:'Quanti secondi di reazione registrare, da 2 a 60. Salva i segnali analizzati; non registra la voce o il file sonoro.',
  clipSeam:'Smussa questa percentuale all’inizio e alla fine verso lo stesso valore, mantenendo la durata. A zero può esserci uno stacco. Non chiude automaticamente tutti i movimenti della geometria.',
  clipLoop:'Ripete i segnali registrati. Disattivato, li riproduce una volta e ritorna alla scena di base con il Rilascio.',

  bpm:'Battiti al minuto del ritmo manuale. Puoi scriverli oppure batterli con Tap. Non è un rilevamento automatico della musica.',
  rhythmEvery:'Distanza tra gli impulsi: mezzo battito, un battito oppure ogni 2, 4 o 8 battiti.',
  rhythmWidth:'Percentuale del ciclo occupata dall’impulso, dal 5 al 100%. Il resto è una pausa.',
  rhythmSoftness:'Smussa la salita e la discesa dell’impulso: basso per scatti, alto per un respiro graduale. Attacco audio non modifica questo segnale.',
  rhythmPhase:'Sposta l’impulso nel suo ciclo. Zero e uno coincidono. Allinea riparte dal battito iniziale.',

  autoLevel:'Adatta il livello di riferimento alla sorgente, mantenendo la soglia del rumore. Non amplifica il silenzio.',
  animate:'Avvia il loop insieme all’ascolto: orbite, correnti e velocità possono muoversi. Pausa resta disponibile.',
  curve:'Sotto 1 rende più visibili i suoni deboli; sopra 1 seleziona quelli forti. Nella singola mappatura agisce solo su quel collegamento.',
  mode:'Scostamento aumenta o riduce il valore base; Intervallo attraversa due valori scelti e torna alla base nel silenzio.',
  from:'Primo estremo dell’intervallo, nelle unità del parametro.',to:'Secondo estremo dell’intervallo. Può essere inferiore al primo.',
  onsetSensitivity:'Sensibilità alle variazioni dello spettro. Gli impulsi non sono una stima certa del tempo musicale.',
  onsetHold:'Tempo minimo fra due impulsi, per evitare ripetizioni ravvicinate.',
  source:'Scegli microfono o file locale. Il cambio ferma la sorgente precedente; avvia tu il nuovo ascolto.',
  gain:'Amplifica il segnale misurato. Aumenta se la scena reagisce poco, riduci se raggiunge spesso il massimo.',
  threshold:'I suoni sotto questa soglia non muovono la scena. Calibra rumore misura due secondi di ambiente: resta in silenzio.',
  mix:'Intensità complessiva di tutte le modulazioni. A zero vedi la creazione di base.',
  attack:'Quanto impiega la risposta a salire. Valori alti rendono più morbidi gli attacchi.',
  release:'Quanto impiega a tornare verso la base dopo il suono, Ferma ascolto o Ferma ritmo.',
  lowCut:'Confine tra bassi e medi. La prima banda parte da 30 Hz.',
  highCut:'Confine tra medi e alti. Gli alti arrivano fino a 16000 Hz o al limite del dispositivo.',
  amount:'Forza fino al 200%. Scostamento usa una percentuale della corsa del parametro; Intervallo usa un peso rispetto alla base. I limiti restano rispettati.',
  reverse:'Aumenta somma alla base; Diminuisci sottrae. Nel silenzio il contributo torna a zero.',
  target:'Parametro continuo da modulare. Il suo valore salvato rimane la base; seed e quantità non vengono rigenerati.',
  band:'Volume e bande per il flusso, Picchi e Impulsi per gli attacchi. Brillantezza distingue suoni scuri/chiari tramite il centroide; Rumorosità distingue toni puri/rumore tramite la piattezza spettrale. Ritmo è il generatore manuale BPM/Tap. Non riconosce parole o note.',
  enabled:'Sospende questo collegamento conservandone le impostazioni.'
};
