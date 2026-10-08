import {SPRITES,COLOR_MODES} from './particle-model.js?v=94ae8e7aefbb';
export function particlePanel(tab,s,h,shared,selectedLight){
 const {slider,section,details,colorField,check}=h;
 const sliders=keys=>keys.map(k=>slider(k)).join('');
 const select=(key,label,items)=>`<label class="field">${label}<select data-particle-select="${key}">${items.map((n,i)=>`<option value="${i}" ${s[key]===i?'selected':''}>${n}</option>`).join('')}</select></label>`;
 if(tab==='shape')return section('CAMPO DI PARTICELLE','<p class="help">Un unico nucleo Pathfinder: regola come si addensa, si apre, si intreccia e ritorna.</p>'+sliders(['pCount','pOpening','pThickness','pFill']))
  +details('Lobi, rami e addensamenti',sliders(['pLobes','pLobeDepth','pClumps','pSymmetry']))
  +details('Materia organica · dettaglio procedurale',sliders(['pOrganic','pFrequency','pDetail','pRough','pWarp'])+'<p class="help">Scala del campo decide la grandezza delle pieghe. Le ottave sovrappongono dettagli più fini; il loro peso è indipendente.</p>')
  +details('Struttura neuronale',sliders(['pNeural','pNodes','pConnect'])+'<p class="help">Raggruppa i percorsi del nucleo in fibre collegate. Nodi e connettività agiscono quando Struttura neuronale è maggiore di zero. I segnali si regolano in Moto.</p>')
  +details('Tentacoli del nucleo',sliders(['pTentacle','pTentacleCount','pTentacleLength','pTentacleTaper','pTentacleCurl'])+'<p class="help">La stessa materia si allunga in bracci. Porta Tentacolarità sopra 0; in Moto puoi farli ondeggiare.</p>')
  +details('Fasci esterni',sliders(['pOuter','pReach','pBranches'])+'<p class="help">Porta Fasci esterni a 0 per tenere tutta la materia nel nucleo.</p>')
  +details('Proporzioni e inquadratura',sliders(['volume','stretchX','stretchY','stretchZ','scale','positionX','positionY','rotateX','rotateY','rotateZ']))
  +details('Deformazioni aggiuntive',sliders(['deform','twist','waves','waveScale']));
 if(tab==='material')return section('GRANELLI',sliders(['pSize','pSizeVar','pOpacity'])+select('pSprite','Sagoma delle particelle',SPRITES)+slider('pSoftness')+'<p class="help">Diametri da 0,08 px a 16 px, riferiti a un video alto 1080 px. Sotto il pixel cambia la copertura luminosa: i granelli diventano più fini e meno luminosi.</p>')
  +section('SCIE',sliders(['pTrailCount','pTrailLength','pTrailWidth','pTrailOpacity']))
  +details('Finitura delle scie',sliders(['pTrailFade','pTrailTaper','pTrailScatter'])+'<p class="help">Numero di scie = 0 le spegne. Il numero di particelle resta indipendente.</p>')
  +details('Materia e riflessi',sliders(['pLighting','metal','roughness','gloss','iridescence','transparency','emission'])+'<p class="help">Riflessi e iridescenza sono calcolati su ogni granello. Le particelle sono accumulate come materia luminosa.</p>');
 if(tab==='color')return section('COLORE DELLA MATERIA',select('pColorMode','Il gradiente segue…',COLOR_MODES)+sliders(['pColorScatter','pLumaVar'])+'<p class="help">Solidale alla forma iniziale assegna il colore prima del movimento: resta sulla stessa particella. Campo nello spazio fa attraversare il gradiente alla materia.</p>')+shared(tab,s,h,selectedLight);
 if(tab==='motion')return section('IL TUO LOOP',sliders(['duration','speed','pCycles'])+`<label class="field">Verso<select data-particle-select="pDirection"><option value="1" ${s.pDirection===1?'selected':''}>Normale</option><option value="-1" ${s.pDirection===-1?'selected':''}>Inverso</option></select></label>`+check('perfectLoop','Loop perfetto · include colori e luci')+`<p class="help">Durata effettiva: <strong id="effective-duration">${(s.duration/s.speed).toFixed(1)} s</strong>. Il campo di particelle torna sempre al punto di partenza.</p>`)
  +section('QUANTO È VIVO',sliders(['pLife','pPulse','pSignal','pPropagation'])+'<p class="help">Vitalità deforma la materia con pulsazioni coordinate. I segnali viaggiano lungo i filamenti; Propagazione ne sfalsa l’arrivo tra le zone.</p>')
  +section('MORBIDEZZA',sliders(['pMotionSoftness','pFollow','pCohesion'])+'<p class="help">Morbidezza distende accelerazioni, dettagli rapidi e microfluttuazioni. Ritardo sfalsa la risposta delle fibre.</p>')
  +details('Orbite e precessione',sliders(['pTravel','pOrbitOval','pOrbitTilt','pOrbitPrecession','pOrbitSpread','pOrbitDrift']))
  +details('Casualità del movimento',sliders(['pWander','pWanderScale','pWanderCycles','pFlowBalance','pRandom','pMotionSeed'])+'<button id="vary-motion" type="button" class="secondary full">Varia solo il movimento</button><p class="help">Esplorazione casuale attiva le correnti. Corale / individuale: 0 muove le zone insieme, 1 rende indipendenti le particelle. Il seed cambia i percorsi conservando materia e colori.</p>')
  +details('Tentacoli in movimento',sliders(['pTentacle','pTentacleWave','pTentacleCycles'])+'<p class="help">Con Tentacolarità sopra 0, le onde viaggiano lungo i bracci. Numero, lunghezza e arricciamento sono in Forma.</p>')
  +details('Warp dello spazio',sliders(['pSpaceWarp','pWarpScale','pWarpCycles','pWarpTwist'])+'<p class="help">Attiva Warp dello spazio per piegare il campo intero. Scala e torsione decidono dove e quanto si avvolge.</p>')
  +details('Ritmo e cadenze',sliders(['pRhythm','pPause','pSpeedSpread']))
  +details('Vortici, respiro e rientri',sliders(['pVortex','pReentry','pBreath','pJitter']))
  +details('Attrazione, repulsione e magnetismo',sliders(['pAttract','pRepel','pMagnet','pPoles','pRadius','pField'])+'<p class="help">Campi artistici periodici: i poli attirano, respingono e avvolgono la materia. Raggio sposta i poli; Influenza ne regola l’area d’azione.</p>')
  +shared('particle-motion',s,h,selectedLight);
 if(tab==='light')return section('LUCE SULLA MATERIA',sliders(['pLighting','pDepthFade']))+shared('particle-light',s,h,selectedLight);
 if(tab==='background')return section('FONDO',`<label class="field">Tipo di sfondo<select id="bg-mode">${[['solid','Tinta unita'],['gradient','Gradiente'],['studio','Fondale morbido'],['transparent','Trasparente · PNG']].map(([v,n])=>`<option value="${v}" ${s.bgMode===v?'selected':''}>${n}</option>`).join('')}</select></label>`+colorField('background','Colore di fondo')+(s.bgMode!=='solid'?colorField('background2','Secondo colore'):'')+(s.bgMode==='gradient'?slider('bgAngle'):'')+(s.bgMode==='studio'?sliders(['bgHeight','bgSoftness','bgWash']):''));
 return shared(tab,s,h,selectedLight);
}
