import {veilPanel} from './veil-panel.js?v=88d17b3ed245';
import {livingPanel,livingComposition,livingMotion} from './living-panel.js?v=88d17b3ed245';
import {SPRITES,COLOR_MODES} from './particle-model.js?v=88d17b3ed245';
export function particlePanel(tab,s,h,shared,selectedLight){
 const veil=s.pLiving===4?veilPanel(tab,s,{...h,baseShapePanel:()=>particlePanel('shape',{...s,pLiving:s.pVeilSourceKind===4?0:s.pVeilSourceKind,engine:'solid'},h,shared,selectedLight)},shared,selectedLight):null;if(veil!==null)return veil;
 const {slider,section,details,colorField,check}=h;
 const sliders=keys=>keys.map(k=>slider(k)).join('');
 const select=(key,label,items)=>`<label class="field">${label}<select data-particle-select="${key}">${items.map((n,i)=>`<option value="${i}" ${s[key]===i?'selected':''}>${n}</option>`).join('')}</select></label>`;
 if(tab==='grains'){
  const sizes=details('Distribuzione dimensioni',
   sliders(['pSizeVar','pSizeSpread','pSizeBias'])+
   details('Diametro per gruppo e nodi',sliders(['pLargeCount','pSizeRatio','pNodeRatio'])+
    '<p class="help">Scegli quanti granelli hanno un diametro dedicato. Il rapporto moltiplica il diametro di base per quel gruppo. Il rapporto dei nodi ha la precedenza sui granelli usati dalle connessioni. A zero i nodi seguono la distribuzione del gruppo.</p>')+
   '<button type="button" class="outline" data-uniform-grains>Uniforma i diametri</button>'+
   '<p class="help">Il diametro dei granelli scala l’intero insieme. La variazione fine introduce differenze fino a ±85%. L’escursione amplia la gamma in entrambe le direzioni. La prevalenza sposta la distribuzione verso taglie grandi o piccole.</p>');
  return (h.cloud?livingComposition(s,h):'')+section('Granelli',
   sliders(['pCount','pSize'])+(!h.cloud?sliders(['pFill','pCloudCore']):'')+sizes+
   select('pSprite','Sagoma',SPRITES)+details('Bordi e visibilità',sliders(['pOpacity','pSoftness']))+
   (h.cloud?details('Distribuzione nello spazio',sliders(['pGrainSpacing','pGroupSpacing','pDistributionCells'])+
    '<p class="help">Dispersione nei gruppi regola la distanza dal centro di ciascun gruppo. Distanza tra gruppi separa i centri. Il valore 1 mantiene la distribuzione iniziale.</p>'):''));
 }
 if(tab==='shape')return section('Corpo',slider('pOpening',['Sfera · nessun foro','Anello aperto'])+sliders(['pFill','pThickness'])+`<button id="particle-sphere" class="outline full">Sfera piena · elimina deformazioni</button><p class="help">Azzera deformazioni e campi, conservando materia, palette e durata.</p>`)
  +details('Trasformazione',sliders(['scale','positionX','positionY','rotateX','rotateY','rotateZ'])+details('Proporzioni',sliders(['volume','stretchX','stretchY','stretchZ'])))
  +details('Volume particellare',sliders(['pCloudCore','pCloudHalo','pCloudRadius'])+'<p class="help">La concentrazione dipende anche dal riempimento. L’alone sposta una quota dei granelli già presenti verso l’esterno. Regola le ombre in Luci.</p>')
  +details('Cellule di granelli',sliders(['pCellAmount','pCellDensity','pCellSize'])+slider('pCellAspect',['Schiacciate','Allungate'])+sliders(['pCellRelief','pCellVariation'])+'<p class="help">Raggruppamento trasforma la stessa nube in cellule. A zero nelle Proporzioni le cellule sono sferiche; Rilievo aggiunge lobi e pieghe. Variazione sposta leggermente i centri e sfalsa il respiro. Il gradiente fra cellule è in Luci.</p>')
  +details('Lobi, rami e addensamenti',sliders(['pLobes','pLobeDepth','pClumps','pSymmetry']))
  +details('Rumore multiscala',sliders(['pOrganic','pFrequency','pDetail','pRough','pWarp'])+'<p class="help">Scala del campo decide la grandezza delle pieghe. Le ottave sovrappongono dettagli più fini; il loro peso è indipendente.</p>')
  +details('Rete di percorsi',sliders(['pNeural','pNodes','pConnect'])+'<p class="help">Raggruppa i percorsi del nucleo in fibre collegate. Nodi e connettività agiscono quando Rete di percorsi è maggiore di zero. I segnali si regolano in Moto.</p>')
  +details('Tentacoli del nucleo',sliders(['pTentacle','pTentacleCount','pTentacleLength','pTentacleTaper','pTentacleCurl'])+'<p class="help">La stessa materia si allunga in bracci. Porta Tentacolarità sopra 0; in Moto puoi farli ondeggiare.</p>')
  +details('Fasci esterni',sliders(['pOuter','pReach','pBranches'])+'<p class="help">Porta Fasci esterni a 0 per tenere tutta la materia nel nucleo.</p>')
  +details('Deformazioni',sliders(['deform','twist','waves','waveScale']))+details('Pelle',livingPanel(s,h));
 if(tab==='trails'){
  const links=section('Connessioni',
   '<div class="fiber-styles"><button class="outline" data-link-style="web">Maglia aperta</button><button class="outline" data-link-style="veil">Maglia fitta</button></div>'+
   sliders(['pLinks','pLinkWidth','pLinkNodes','pLinkNeighbors'])+
   details('Distanza e forma dei legami',sliders(['pLinkMinReach','pLinkReach','pLinkSurface','pLinkTurns','pLinkCurve','pLinkStretch']))+
   '<p class="help">I fili collegano coppie di granelli scelte nella distribuzione iniziale e le seguono nel movimento. Le distanze minima e massima selezionano i vicini. I giri aggiuntivi allungano il percorso fra gli stessi estremi. Il limite di allungamento fa sfumare i legami tesi.</p>'+
   '<p class="help">In Granelli, apri Distribuzione dimensioni per regolare il diametro dei nodi. Spessore connessioni regola il filo che li unisce.</p>');
  const trails=section('Scie',
   '<div class="fiber-styles"><button class="outline" data-fiber-style="fibres">Scie corte</button><button class="outline" data-fiber-style="threads">Scie lunghe</button><button class="outline" data-fiber-style="fabric">Scie intrecciate</button></div>'+
   sliders(['pTrailWidth','pTrailCount','pTrailLength','pTrailPersistence','pTrailOpacity','pTrailCoherence','pTrailStraighten'])+
   details('Ramificazione delle scie',sliders(['pTrailFork','pTrailForkSpread'])+
    '<p class="help">Genera rami lungo la traiettoria delle particelle. Gli impulsi si propagano anche nei rami.</p>')+
   details('Bordi e densità delle scie',sliders(['pTrailSoftness','pTrailFade','pTrailTaper','pTrailScatter','pTrailDensity','pTrailQuality']))+
   '<p class="help">Ogni scia disegna il percorso di un granello. Una lunghezza di 1 copre il loop intero. La persistenza conserva la luminosità verso la coda. Azzera l’opacità dei granelli per vedere soltanto le scie.</p>');
  return links+trails;
 }
 if(tab==='fields')return (h.forcePanel?.()||'')+(h.guidePanel?.()||'');
 if(tab==='material')return section('Materia e riflessi',details('Esempi di materia','<div class="fiber-styles"><button class="outline" data-particle-material="pearl">Madreperla</button><button class="outline" data-particle-material="metal">Metallo</button></div>')+sliders(['transparency','gloss','roughness','metal']))
  +details('Trasparenza e diffusione',slider('refraction')+'<p class="help">L’indice modifica i riflessi dei granelli trasparenti e la luce proiettata sul piano. Per vedere le caustiche, attivale in Scena.</p>')
  +details('Riflessi delle fibre',slider('pFiberSheen',['Spento','Setoso'])+slider('pFiberSpread',['Stretto','Diffuso'])+'<p class="help">La luce segue la direzione di ogni filo. Servono fibre visibili, Lucentezza e Risposta alle luci sopra 0. Quantità e spessore sono in Struttura → Fibre e scie.</p>')
  +section('Pellicola',details('Esempi di pellicola','<div class="fiber-styles"><button class="outline" data-film-look="cobalt">Cobalto e oro</button><button class="outline" data-particle-film="living">Pellicola viva</button><button class="outline" data-particle-film="satin">Perla satinata</button></div>')+sliders(['iridescence','filmThickness','pFilmVariation','pFilmScale','iridShift'])+details('Interferenza',slider('filmIslands',['Venature','Isole'])+sliders(['filmPattern','filmPatternScale','filmPatternWarp','filmPatternDetail','filmChroma','filmDuo'])+'<p class="help">Venature solidali alla materia. Spessore cambia le tinte; Contrasto separa i colori riflessi. A zero conservi la pellicola precedente.</p>')+'<p class="help">Riflessi colorati distribuiti sulla materia 3D. Premi Riproduci per farli scorrere. Lucentezza e Risposta alle luci devono essere sopra 0. A Pellicola viva 0 ritrovi il materiale precedente.</p>')
  +details('Satinatura ed emissione',slider('emission'));
 if(tab==='color')return shared(tab,s,{...h,particleColorPanel:()=>details('Distribuzione sulle particelle',select('pColorMode','Il gradiente segue…',COLOR_MODES)+sliders(['pColorScatter','pLumaVar'])+'<p class="help">Solidale alla forma iniziale assegna il colore prima del movimento: resta sulla stessa particella. Campo nello spazio fa attraversare il gradiente alla materia.</p>')},selectedLight);
 if(tab==='motion')return section('Tempo',sliders(['duration','speed','pCycles'])+`<label class="field">Verso<select data-particle-select="pDirection"><option value="1" ${s.pDirection===1?'selected':''}>Normale</option><option value="-1" ${s.pDirection===-1?'selected':''}>Inverso</option></select></label>`+check('perfectLoop','Loop perfetto · include colori e luci')+`<p class="help">Durata effettiva: <strong id="effective-duration">${(s.duration/s.speed).toFixed(1)} s</strong>. Il campo di particelle torna sempre al punto di partenza.</p>`)
  +livingMotion(s,h)+section('Interpolazione del moto',sliders(['pMotionSoftness','pFollow','pCohesion'])+'<p class="help">Morbidezza distende accelerazioni, dettagli rapidi e microfluttuazioni. Ritardo sfalsa la risposta delle fibre.</p>')
  +details('Orbite',sliders(['pTravel','pOrbitOval','pOrbitTilt'])+details('Precessione e dispersione',sliders(['pOrbitPrecession','pOrbitSpread','pOrbitDrift']))+details('Rotazione e ricircolo',sliders(['pVortex','pCounterflow','pReentry']))+'<p class="help">Ampiezza regola quanto si allontanano le particelle; ovalità e inclinazione disegnano le orbite. Precessione ne fa ruotare il piano. Con Rientro verso il nucleo oltre 1 il bordo si ripiega e torna verso la cavità.</p>')
  +details('Pulsazione',sliders(['pLife','pBreath','pPulse'])+details('Segnali lungo le fibre',sliders(['pSignal','pPropagation','pTrailPulse','pTrailPulseWidth']))+'<p class="help">Vitalità deforma la materia con pulsazioni coordinate. I segnali viaggiano lungo i filamenti; Propagazione ne sfalsa l’arrivo tra le zone.</p>')
  +details('Casualità del movimento',sliders(['pWander','pFlowBalance','pRandom'])+'<button id="vary-motion" type="button" class="secondary full">Varia solo il movimento</button>'+details('Scala, frequenza e seed',sliders(['pWanderScale','pWanderCycles','pJitter','pMotionSeed']))+'<p class="help">Esplorazione casuale attiva le correnti. Corale / individuale: 0 muove le zone insieme, 1 rende indipendenti le particelle. Il seed cambia i percorsi conservando materia e colori.</p>')
  +details('Tentacoli in movimento',sliders(['pTentacleWave','pTentacleCycles'])+'<p class="help">Con Tentacolarità sopra 0, le onde viaggiano lungo i bracci. Numero, lunghezza e arricciamento sono in Forma.</p>')
  +details('Distorsione',sliders(['pSpaceWarp','pWarpScale','pWarpCycles','pWarpTwist'])+'<p class="help">Attiva Distorsione per piegare il campo intero. Scala e torsione decidono dove e quanto si avvolge.</p>')
  +details('Scorrimento pellicola',sliders(['filmFlow','filmSwirl','filmCycles']))+details('Ritmo e cadenze',sliders(['pRhythm','pPause','pSpeedSpread']))
  +details('Campi',sliders(['pAttract','pRepel','pMagnet','pPoles','pRadius','pField'])+'<p class="help">Campi artistici periodici: i poli attirano, respingono e avvolgono la materia. Raggio sposta i poli; Influenza ne regola l’area d’azione.</p>')
  +shared('particle-motion',s,h,selectedLight);
 if(tab==='light')return section('Illuminazione',sliders(['pLighting','pDepthFade'])+slider('pCellLight',['Inverti','Diretto'])+'<p class="help">Il gradiente assegna una luminosità diversa ai gruppi e la conserva mentre si muovono. Usa l’angolo del gradiente in Colori. A zero la luminosità fra gruppi segue la scena.</p>');
 if(tab==='background')return details('Ombra e caustica dei granelli',sliders(['pShadow','pShadowHeight','pShadowSoftness','pVolumeShadow','pCaustic'])+details('Dettaglio e sfumatura',sliders(['pOpticalExtent','pCausticSoftness']))+`<button data-jump-tab="light" data-jump-param="pSelfShadow">Regola sorgente e ombre di contatto</button><p class="help">Proiezione di granelli, fili, scie e pelle su un piano orizzontale. Il piano resta fermo quando sposti la figura. Solo le parti fra piano e luce proiettano ombra. Dimensione della luce e morbidezza sfumano i bordi. Sul nero puro l’ombra non è visibile; nel PNG trasparente viene conservata. Caustica usa Trasparenza e Rifrazione in Materiale; sul metallo opaco resta spenta. Assorbimento della nube usa la quantità di granelli lungo il raggio. A zero le ombre seguono la prima superficie vista dalla luce. Area della mappa luce deve contenere tutta la figura.</p>`);
 return shared(tab,s,h,selectedLight);
}
