import {SignalRecorder,sampleAudioClip,emptySignals} from './audio-recording.js?v=b18a20e380e3';
import {RhythmClock,TapTempo} from './audio-rhythm.js?v=b18a20e380e3';
import {OrbAudioInput,silentBands} from './vendor/orb/orb-audio.js?v=b18a20e380e3';
import {AUDIO_BANDS,AUDIO_META,normalizeAudio,audioPreset,audioTargets,audioTargetGroups,audioMappingHint,audioPreviewState} from './audio-model.js?v=b18a20e380e3';
import {META} from './model.js?v=b18a20e380e3';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountAudioReactive({getState,remember,mark,renderControls,showTab,toast,invalidate,setPlaying}) {
  const rhythm=new RhythmClock(),tapTempo=new TapTempo();
  const input=new OrbAudioInput(),controls=document.getElementById('controls'),parking=document.createElement('div');
  parking.hidden=true;parking.setAttribute('aria-hidden','true');document.body.append(parking);
  let resumePlayer=false;
  let recorder=null,recordOwner=null,replay=null,replayTail=emptySignals(),clipNotice='',displayedClip=getState().audioClip;
  function stopReplay(release=true){
    if(replay)replayTail=release?{...bands}:emptySignals();
    else if(!release)replayTail=emptySignals();
    replay=null;invalidate();
  }
  function cancelRecording(){recorder=null;recordOwner=null;}

  let bands=silentBands(),mode='off',pending=false,request=0,lastTime=0,lastUi=0,signature='',notice='',fileName='',devices=[],deviceId='',calibration=null;
  const settings=()=>normalizeAudio(getState().audioReactive,getState().engine);
  const hasSignal=()=>Object.values(bands).some(value=>value>0);
  const hasAudio=()=>Object.entries(input.smoothed).some(([key,value])=>key!=='beat'&&value>0);
  const status=()=>pending?'Attendo la sorgente audio…':notice|| (mode==='microphone'?'Microfono attivo':mode==='file'?(input.player?.ended?'File terminato · ritorno alla base':input.player?.paused?'File in pausa':'File in riproduzione'):hasAudio()?'Ascolto fermato · ritorno alla base':'Ascolto spento');

  function stop(release=true) {
    request++;input.stop({release});pending=false;mode='off';calibration=null;fileName='';notice='';
    if(!release)bands={...silentBands(),beat:rhythm.value};
    invalidate();syncUi();
  }
  async function listDevices() {
    if(!navigator.mediaDevices?.enumerateDevices)return;
    try { devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');syncDevices(); } catch { /* Input can still use the default device. */ }
  }
  function syncDevices() {
    const select=document.getElementById('audio-device');if(!select)return;
    select.replaceChildren(new Option('Microfono predefinito',''),...devices.filter(d=>d.deviceId&&d.deviceId!=='default').map((d,i)=>new Option(d.label||`Microfono ${i+1}`,d.deviceId)));
    select.value=deviceId;if(select.selectedIndex<0){deviceId='';select.value='';}
  }
  function syncUi() {
    const statusNode=document.getElementById('audio-status');if(statusNode)statusNode.textContent=calibration?'Resta in silenzio · misuro il rumore per 2 secondi…':status();
    const name=document.getElementById('audio-filename');if(name)name.textContent=fileName;
    for(const [band,value]of Object.entries(bands)){
      const meter=document.querySelector(`[data-audio-meter="${band}"]`),out=document.querySelector(`[data-audio-level="${band}"]`);
      if(meter)meter.value=value;if(out)out.textContent=Math.round(value*100)+'%';
    }
    const start=controls.querySelector('[data-audio-action="start"]');if(start)start.disabled=pending;
    const stopButton=controls.querySelector('[data-audio-action="stop"]');if(stopButton)stopButton.disabled=mode==='off'&&!pending&&!hasAudio();
    const noise=controls.querySelector('[data-audio-action="noise"]');if(noise)noise.disabled=mode!=='microphone'||pending||!!calibration;
    const freeze=controls.querySelector('[data-audio-action="freeze"]');if(freeze)freeze.disabled=!hasSignal();
    const tool=document.getElementById('audio-tool');tool?.classList.toggle('listening',mode!=='off'||rhythm.running||!!replay);
    const rhythmStatus=document.getElementById('audio-rhythm-status');if(rhythmStatus)rhythmStatus.textContent=rhythm.running?'Ritmo in corso · '+settings().bpm+' BPM':rhythm.value>0?'Ritmo fermato · ritorno alla base':'Ritmo spento · avvio manuale';
    const playRhythm=controls.querySelector('[data-audio-action="rhythm-start"]');if(playRhythm)playRhythm.disabled=rhythm.running;
    const stopRhythm=controls.querySelector('[data-audio-action="rhythm-stop"]');if(stopRhythm)stopRhythm.disabled=!rhythm.running&&rhythm.value===0;
    const clip=getState().audioClip,clipStatus=document.getElementById('audio-clip-status');
    if(clip!==displayedClip){displayedClip=clip;clipNotice='';}
    if(clipStatus)clipStatus.textContent=recorder?'Registro la reazione · '+Math.min(recorder.duration,recorder.time).toFixed(1)+' / '+recorder.duration+' s':replay?'Replay · '+(settings().clipLoop?replay.position%replay.clip.duration:replay.position).toFixed(1)+' / '+replay.clip.duration+' s':clipNotice||(clip?'Registrazione pronta · '+clip.duration+' s':'Nessuna registrazione');
    const progress=document.getElementById('audio-clip-progress');if(progress){progress.max=recorder?.duration||clip?.duration||1;progress.value=recorder?Math.min(recorder.duration,recorder.time):replay?(settings().clipLoop?replay.position%replay.clip.duration:replay.position):0;}
    for(const [action,disabled] of Object.entries({'record':!!recorder||!!replay,'record-cancel':!recorder,'clip-play':!clip||!!recorder,'clip-stop':!replay&&!Object.values(replayTail).some(v=>v>0),'clip-delete':!clip||!!recorder})){
      const el=controls.querySelector('[data-audio-action="'+action+'"]');if(el)el.disabled=disabled;
    }
    const view=audioPreviewState(getState(),bands);
    for(const node of controls.querySelectorAll('[data-audio-value]')){const key=node.dataset.audioValue;node.textContent=`${Number(getState()[key].toFixed(3))} → ${Number(view[key].toFixed(3))}`;}
  }
  function beforeRender() {resumePlayer=!!input.player&&!input.player.paused&&!input.player.ended;input.attachPlayer(parking);}
  function afterRender() {
    input.attachPlayer(document.getElementById('audio-player')||parking);
    if(resumePlayer&&input.player){const player=input.player;void player.play().catch(()=>{if(input.player===player){notice='Premi Play sul file per riprendere.';syncUi();}});}
    resumePlayer=false;syncDevices();syncUi();
    // Direct links from existing Prisma controls, including the Motion tab.
    const supported=audioTargets(getState().engine);
    for(const range of controls.querySelectorAll('input[data-param]')){
      const key=range.dataset.param,line=range.closest('.param')?.querySelector('.param-line');
      if(!supported.includes(key)||!line||line.querySelector('[data-audio-link]'))continue;
      const button=document.createElement('button');button.type='button';button.className='audio-link quiet';button.dataset.audioLink=key;button.textContent='♫';button.title=`Collega ${META[key][0]} all’audio`;button.setAttribute('aria-label',button.title);line.append(button);
    }
  }

  async function start(file) {
    stopReplay(false);stop();notice='';pending=true;const token=++request;syncUi();
    try {
      const ok=file?await input.file(file,document.getElementById('audio-player')||parking):await input.microphone(()=>{mode='off';notice='Microfono scollegato · ritorno alla base';calibration=null;syncUi();},deviceId);
      if(token!==request||!ok)return;
      pending=false;mode=file?'file':'microphone';fileName=file?.name||'';
      if(settings().animate)setPlaying?.(true);
      if(!file)void listDevices();afterRender();invalidate();
    } catch(error) {
      if(token!==request)return;
      stop();notice=error.name==='NotAllowedError'?'Accesso al microfono o riproduzione non consentiti. Controlla il permesso nel browser e riprova.':error.name==='NotFoundError'||error.name==='OverconstrainedError'?'Microfono non disponibile: scegli il predefinito e riprova.':error.name==='NotSupportedError'?'Formato audio non supportato: prova un file WAV o MP3.':error.message||'Impossibile aprire la sorgente audio.';
      syncUi();toast(notice);
    }
  }

  const slider=(key,value,attr='data-audio-setting',label,min,max,step)=>{
    const meta=AUDIO_META[key]||[label,min,max,step],[name,lo,hi,increment]=meta,id='audio-'+key.replaceAll('.','-');
    return `<div class="param"><div class="param-line"><label for="${id}">${name}</label><input data-audio class="number" type="number" ${attr}="${key}" aria-label="${name}: valore" min="${lo}" max="${hi}" step="${increment}" value="${Number(value.toFixed(3))}"></div><input data-audio id="${id}" type="range" ${attr}="${key}" min="${lo}" max="${hi}" step="${increment}" value="${value}" style="--fill:${(value-lo)/(hi-lo)*100}%"></div>`;
  };
  const options=(values,current)=>Object.entries(values).map(([id,label])=>`<option value="${escape(id)}" ${id===current?'selected':''}>${escape(label)}</option>`).join('');
  const targetOptions=current=>Object.entries(audioTargetGroups(getState().engine)).map(([group,keys])=>`<optgroup label="${escape(group)}">${options(Object.fromEntries(keys.filter(k=>META[k]).map(k=>[k,META[k][0]])),current)}</optgroup>`).join('')+(!audioTargets(getState().engine).includes(current)?`<option selected value="${escape(current)}">${escape(META[current][0])} · altro motore</option>`:'');
  function panel() {
    const c=settings(),targets=Object.fromEntries(audioTargets(getState().engine).map(key=>[key,META[key][0]]));
    return `<details id="audio-input-controls" class="control-details primary-section"><summary>Ascolto</summary>
      <label class="field">Sorgente<select data-audio data-audio-setting="source">${options({microphone:'Microfono · voce e ambiente',file:'File musicale sul dispositivo'},c.source)}</select></label>
      ${c.source==='microphone'?'<label class="field">Microfono<select data-audio id="audio-device" aria-label="Microfono"><option value="">Microfono predefinito</option></select></label>':''}
      <div class="force-actions"><button type="button" class="primary" data-audio-action="start">${c.source==='file'?'Scegli e riproduci file':'Avvia ascolto'}</button><button type="button" class="outline" data-audio-action="stop">Ferma ascolto</button></div>
      <input data-audio id="audio-file" type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" hidden><p id="audio-status" class="help" role="status"></p><p id="audio-filename" class="help audio-filename"></p><div id="audio-player"></div>
      <div class="audio-levels">${Object.entries(AUDIO_BANDS).filter(([key])=>key!=='beat').map(([key,label])=>`<label>${label}<meter data-audio-meter="${key}" min="0" max="1" value="0" aria-label="Livello ${label.toLowerCase()}"></meter><output data-audio-level="${key}">0%</output></label>`).join('')}</div>
      <div class="force-actions"><button type="button" class="primary" data-audio-preset="diretta">Diretta · moto completo</button></div>
      ${slider('gain',c.gain)}${slider('mix',c.mix)}<label class="check"><input data-audio type="checkbox" data-audio-setting="autoLevel" ${c.autoLevel?'checked':''}>Adatta il livello alla sorgente</label><label class="check"><input data-audio type="checkbox" data-audio-setting="animate" ${c.animate?'checked':''}>Avvia anche il moto</label><p class="help">Diretta collega subito correnti, orbite e warp. Elaborazione sul dispositivo; nessun ascolto automatico.</p></details>
      <details id="audio-rhythm-controls" class="control-details primary-section"><summary>Ritmo · BPM e Tap</summary>
      <p class="help">Impulsi regolari per muovere la scena, anche senza microfono. Puoi combinarli con voce e musica.</p>
      <div class="force-actions"><button type="button" class="primary" data-audio-action="rhythm-start">Avvia ritmo</button><button type="button" class="outline" data-audio-action="rhythm-stop">Ferma ritmo</button></div>
      <p id="audio-rhythm-status" class="help" role="status"></p><div class="audio-levels"><label>Impulso Ritmo<meter data-audio-meter="beat" min="0" max="1" value="0" aria-label="Livello ritmo"></meter><output data-audio-level="beat">0%</output></label></div>
      <div class="force-actions"><button type="button" class="outline" data-audio-action="tap" title="Premi almeno due volte a tempo; una pausa di oltre due secondi ricomincia la misura">Tap · batti il tempo</button><button type="button" class="outline" data-audio-action="align">Allinea battito</button></div>
      <p id="audio-tap-status" class="help" role="status"></p>
      ${slider('bpm',c.bpm)}<label class="field">Un impulso ogni<select data-audio data-audio-setting="rhythmEvery">${options({'0.5':'Mezzo battito','1':'1 battito','2':'2 battiti','4':'4 battiti','8':'8 battiti'},String(c.rhythmEvery))}</select></label>
      ${slider('rhythmWidth',c.rhythmWidth)}${slider('rhythmSoftness',c.rhythmSoftness)}${slider('rhythmPhase',c.rhythmPhase)}
      <button type="button" class="outline full" data-audio-preset="ritmo">Risposta Ritmo · moto e riflessi</button>
      <p class="help">Il primo avvio aggiunge i collegamenti Ritmo se mancano. Per personalizzarli scegli il segnale Ritmo in Risposta e collegamenti. Ferma ritmo usa il Rilascio; Ferma ascolto ferma solo il microfono o il file. BPM impostato a mano, senza sincronizzazione automatica con la musica.</p></details>
      <details id="audio-record-controls" class="control-details primary-section"><summary>Registra e ripeti la reazione</summary>
      <p class="help">Registra come il suono muove la scena. Poi ripeti la reazione senza microfono, anche con altri collegamenti.</p>
      ${slider('recordSeconds',c.recordSeconds)}
      <div class="force-actions"><button type="button" class="primary" data-audio-action="record">Registra reazione</button><button type="button" class="outline" data-audio-action="record-cancel">Annulla registrazione</button></div>
      <p id="audio-clip-status" class="help" role="status"></p><progress id="audio-clip-progress" aria-label="Avanzamento registrazione o replay" max="1" value="0" style="width:100%"></progress>
      <div class="force-actions"><button type="button" class="primary" data-audio-action="clip-play">Riproduci dall’inizio</button><button type="button" class="outline" data-audio-action="clip-stop">Ferma replay</button></div>
      <label class="check"><input data-audio type="checkbox" data-audio-setting="clipLoop" ${c.clipLoop?'checked':''}>Ripeti in loop</label>
      ${slider('clipSeam',c.clipSeam)}
      <details class="control-details"><summary>Salvataggio e limiti</summary><p class="help">Avvia prima microfono, file o Ritmo. Una registrazione per preset: quella nuova sostituisce la precedente solo quando è completa. Il replay ferma gli ingressi live e usa i collegamenti attuali. I segnali si salvano nel preset, senza voce né file sonoro. Il raccordo chiude la reazione, non garantisce un loop perfetto della geometria. Replay ed esportazione video non sono ancora collegati.</p><button type="button" class="quiet" data-audio-action="clip-delete">Elimina registrazione</button></details></details>
      <details id="audio-response-controls" class="control-details primary-section"><summary>Risposta e collegamenti · ${c.mappings.length}/24</summary><div class="force-actions audio-presets">${Object.entries({diretta:'Diretta',respiro:'Respiro',marea:'Orbite',tentacoli:'Tentacoli',impulsi:'Impulsi',timbro:'Timbro'}).map(([id,label])=>`<button type="button" class="outline" data-audio-preset="${id}">${label}</button>`).join('')}</div><p class="help">Cambiano i collegamenti e i tempi audio. Timbro lega suoni brillanti ai riflessi e suoni rumorosi a correnti e deformazioni. I valori originali restano recuperabili.</p>
      ${slider('attack',c.attack)}${slider('release',c.release)}${slider('curve',c.curve)}
      ${c.mappings.map((row,i)=>`<details class="control-details audio-mapping"><summary>${escape(AUDIO_BANDS[row.band])} → ${escape(META[row.target][0])}${row.enabled?'':' · spento'}</summary>
        <label class="check"><input data-audio type="checkbox" data-audio-map="${i}.enabled" ${row.enabled?'checked':''}>Usa questo collegamento</label>
        <label class="field">Segnale<select data-audio data-audio-map="${i}.band">${options(AUDIO_BANDS,row.band)}</select></label>
        <label class="field">Parametro<select data-audio data-audio-map="${i}.target">${targetOptions(row.target)}</select></label>
        <p class="help">Base → valore live: <output data-audio-value="${row.target}"></output></p>
        <label class="field">Tipo di controllo<select data-audio data-audio-map="${i}.mode">${options({add:'Scostamento dalla base',range:'Intervallo scelto'},row.mode)}</select></label>
        ${row.mode==='range'?slider(i+'.from',row.from,'data-audio-map','Da',META[row.target][1],META[row.target][2],META[row.target][3])+slider(i+'.to',row.to,'data-audio-map','A',META[row.target][1],META[row.target][2],META[row.target][3]):''}
        ${slider(i+'.amount',row.amount*100,'data-audio-map','Forza del collegamento · %',0,200,1)}${slider(i+'.curve',row.curve,'data-audio-map','Curva del collegamento',.25,4,.05)}
        ${audioMappingHint(getState(),row)?`<p class="help audio-hint">${escape(audioMappingHint(getState(),row))}</p>`:''}
        <label class="field">Direzione<select data-audio data-audio-map="${i}.reverse">${options({false:'Aumenta rispetto alla base',true:'Diminuisci rispetto alla base'},String(row.reverse))}</select></label>
        ${!Object.hasOwn(targets,row.target)?'<p class="help">Questo parametro appartiene all’altro motore: collegamento conservato, senza influenza sulla scena attuale.</p>':''}<button type="button" class="quiet" data-audio-remove="${i}">Rimuovi collegamento</button></details>`).join('')}
      <button type="button" class="outline full" data-audio-action="add" ${c.mappings.length>=24?'disabled':''}>Aggiungi collegamento</button></details>
      <details id="audio-filter-controls" class="control-details primary-section"><summary>Rumore, frequenze e impulsi</summary><button type="button" class="outline full" data-audio-action="noise">Calibra rumore · 2 secondi in silenzio</button>${slider('threshold',c.threshold)}${slider('lowCut',c.lowCut)}${slider('highCut',c.highCut)}${slider('onsetSensitivity',c.onsetSensitivity)}${slider('onsetHold',c.onsetHold)}<p class="help">Impulsi segue gli attacchi dello spettro: non è una stima del BPM.</p></details>
      <details id="audio-save-controls" class="control-details primary-section"><summary>Preset ed esportazione</summary><p class="help">I collegamenti audio si salvano con il preset Prisma. Aprire l’editor non avvia l’ascolto. Il file musicale e i suoni non vengono inseriti nel preset.</p><button type="button" class="outline full" data-audio-action="freeze">Congela risposta nella scena</button><p class="help">Congela l’influenza attuale per includerla negli export. Puoi registrare e ripetere la reazione nella sezione dedicata. Gli export attuali usano la scena di base o lo stato congelato; il replay animato e il suono nel video sono ancora da collegare.</p></details>`;
  }

  function saveSettings(c) {getState().audioReactive=normalizeAudio(c,getState().engine);mark();}
  function syncSliders(c) {
    for(const el of controls.querySelectorAll('input[data-audio-setting],input[data-audio-map]')) {
      const key=el.dataset.audioSetting,path=el.dataset.audioMap?.split('.');
      let value=key?c[key]:c.mappings[+path[0]]?.[path[1]];if(path?.[1]==='amount')value*=100;
      if(el.type==='checkbox'){el.checked=value;continue;}if(value===undefined)continue;
      if(el!==document.activeElement)el.value=Number(value.toFixed(3));
      if(el.type==='range')el.style.setProperty('--fill',(value-el.min)/(el.max-el.min)*100+'%');
    }
  }
  controls.addEventListener('input',event=>{
    const el=event.target,key=el.dataset.audioSetting,path=el.dataset.audioMap?.split('.');if(!key&&!path)return;
    if(el.type==='number'&&(el.value===''||!Number.isFinite(el.valueAsNumber)))return;
    if(!el.dataset.audioEditing){remember();el.dataset.audioEditing='1';}
    const c=settings();
    if(key)c[key]=el.type==='checkbox'?el.checked:key==='source'?el.value:Number(el.value);
    else {const row=c.mappings[+path[0]];if(!row)return;const k=path[1];row[k]=k==='enabled'?el.checked:k==='reverse'?el.value==='true':k==='amount'?Number(el.value)/100:['from','to','curve'].includes(k)?Number(el.value):el.value;if(k==='target'){row.from=META[row.target][1];row.to=META[row.target][2];}}
    saveSettings(c);syncSliders(settings());
  });
  controls.addEventListener('change',event=>{
    const el=event.target;if(el.dataset.audioEditing)delete el.dataset.audioEditing;
    if(el.id==='audio-device'){deviceId=el.value;stop();return;}
    if(el.id==='audio-file'){const file=el.files?.[0];if(file)void start(file);el.value='';return;}
    if(el.dataset.audioSetting==='source')stop();
    if(el.matches('select[data-audio],input[type="checkbox"][data-audio]')&&el.id!=='audio-device')renderControls();
  });
  controls.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    const action=button.dataset.audioAction,preset=button.dataset.audioPreset,remove=button.dataset.audioRemove;
    const linked=button.dataset.audioLink;
    if(linked){const c=settings();let i=c.mappings.findIndex(r=>r.target===linked);if(i<0){if(c.mappings.length>=24){toast('Hai già 24 collegamenti: rimuovine uno in Audio.');return;}remember();i=c.mappings.length;c.mappings.push({band:'all',target:linked,amount:.35,reverse:getState()[linked]>=META[linked][2]});saveSettings(c);}showTab('audio');const section=document.getElementById('audio-response-controls');section.open=true;const row=section.querySelectorAll('.audio-mapping')[i];row.open=true;row.scrollIntoView({block:'nearest'});return;}
    if(preset){remember();const c=settings(),p=audioPreset(preset,getState().engine);saveSettings({...c,mappings:p.mappings,attack:p.attack,release:p.release,mix:p.mix,curve:p.curve,autoLevel:true});renderControls();if(mode!=='off'&&c.animate)setPlaying?.(true);toast('Risposta '+button.textContent+' applicata');return;}
    if(remove!==undefined){remember();const c=settings();c.mappings.splice(+remove,1);saveSettings(c);renderControls();return;}
    if(action==='record'){
      if(replay){toast('Ferma il replay e avvia una sorgente live prima di registrare.');return;}
      if(!rhythm.running&&mode!=='microphone'&&!(mode==='file'&&input.player&&!input.player.paused&&!input.player.ended)){toast('Avvia prima microfono, file musicale oppure Ritmo.');return;}
      if(recorder)return;
      recordOwner=getState();recorder=new SignalRecorder(performance.now(),settings().recordSeconds,bands);clipNotice='';invalidate();syncUi();
    }
    if(action==='record-cancel'){cancelRecording();clipNotice='Registrazione annullata · la precedente è conservata';syncUi();}
    if(action==='clip-play'){
      const clip=getState().audioClip;if(!clip||recorder)return;
      stopReplay(false);rhythm.stop(false);stop(false);clipNotice='';
      replay={clip,start:performance.now(),position:0};if(settings().animate)setPlaying?.(true);invalidate();syncUi();
    }
    if(action==='clip-stop'){stopReplay();clipNotice='Replay fermato · ritorno alla base';syncUi();}
    if(action==='clip-delete'){if(recorder)return;remember();stopReplay(false);getState().audioClip=null;clipNotice='Registrazione eliminata · puoi annullare';mark();renderControls();}
    if(action==='rhythm-start'){
      stopReplay(false);
      const c=settings();
      if(!c.mappings.some(r=>r.band==='beat'&&r.enabled)){
        const rows=audioPreset('ritmo',getState().engine).mappings;
        if(c.mappings.length+rows.length>24){toast('Servono quattro posti per i collegamenti Ritmo: libera spazio oppure applica Risposta Ritmo.');return;}
        remember();c.mappings.push(...rows);saveSettings(c);renderControls();
      }
      rhythm.start(performance.now(),settings());if(c.animate)setPlaying?.(true);invalidate();syncUi();
    }
    if(action==='rhythm-stop'){rhythm.stop();invalidate();syncUi();}
    if(action==='align'){rhythm.align(performance.now(),settings());invalidate();toast('Battito allineato.');}
    if(action==='tap'){
      const now=performance.now(),bpm=tapTempo.tap(now),c=settings();
      if(bpm!==null){remember();c.bpm=bpm;saveSettings(c);syncSliders(settings());}
      rhythm.align(now,settings());
      const feedback=document.getElementById('audio-tap-status');if(feedback)feedback.textContent=bpm===null?'Premi ancora a tempo…':bpm+' BPM · '+tapTempo.taps.length+' tocchi';
      invalidate();syncUi();
    }
    if(action==='start'){if(settings().source==='file')document.getElementById('audio-file').click();else void start();}
    if(action==='stop')stop();
    if(action==='add'){const c=settings();if(c.mappings.length>=24)return;remember();c.mappings.push({band:'all',target:getState().engine==='particles'?'pWander':'deform',amount:.35,reverse:false,enabled:true});saveSettings(c);renderControls();const rows=controls.querySelectorAll('.audio-mapping');rows[rows.length-1].open=true;rows[rows.length-1].scrollIntoView({block:'nearest'});}
    if(action==='noise'&&mode==='microphone'){calibration={start:performance.now(),samples:[]};syncUi();}
    if(action==='freeze'){
      const base=getState(),view=audioPreviewState(base,bands);if(view===base){toast('Nessuna influenza audio da congelare in questo momento.');return;}
      remember();for(const key of audioTargets(base.engine))if(view[key]!==base[key])base[key]=view[key];cancelRecording();stopReplay(false);rhythm.stop(false);stop(false);mark();renderControls();toast('Risposta congelata · inclusa nel preset e negli export.');
    }
  });
  const tool=document.createElement('button');tool.id='audio-tool';tool.className='tool';tool.innerHTML='♫<span class="tool-label">Audio</span>';tool.title='Voce e musica';tool.setAttribute('aria-label','Audio · voce e musica');document.querySelector('.canvas-tools .tool-separator').before(tool);
  tool.onclick=()=>{showTab('audio');const section=document.getElementById('audio-input-controls');section.open=true;section.scrollIntoView({block:'nearest'});};
  addEventListener('pagehide',()=>{cancelRecording();stopReplay(false);rhythm.stop(false);stop(false);});
  return {
    panel,beforeRender,afterRender,stop,get active(){return !!recorder||!!replay||rhythm.running||mode==='microphone'||(mode==='file'&&input.player&&!input.player.paused&&!input.player.ended)||pending||hasSignal();},preview:state=>audioPreviewState(state,bands),
    tick(now){
      const c=settings(),dt=lastTime?Math.max(0,Math.min(.1,(now-lastTime)/1000)):1/60;lastTime=now;
      Object.assign(input,{gain:c.gain*.7,threshold:c.threshold,attack:c.attack,release:c.release,curve:c.curve,autoLevel:c.autoLevel,lowCut:c.lowCut,highCut:c.highCut,onsetSensitivity:c.onsetSensitivity,onsetHold:c.onsetHold});
      bands={...input.read(dt),beat:rhythm.tick(now,c)};
      if(calibration&&mode==='microphone'){
        calibration.samples.push(input.rms);
        if(now-calibration.start>=2000){const values=calibration.samples.sort((a,b)=>a-b),measured=values[Math.floor((values.length-1)*.9)]||0;remember();c.threshold=Math.min(.1,Math.max(.001,measured*1.25+.001));saveSettings(c);calibration=null;syncSliders(settings());toast('Soglia aggiornata sul rumore misurato.');}
      }

      if(recorder){
        if(getState()!==recordOwner){cancelRecording();clipNotice='Registrazione annullata perché la creazione è cambiata.';}
        else{
          const clip=recorder.feed(now,bands);
          if(recorder.error){clipNotice=recorder.error;cancelRecording();toast(clipNotice);}
          else if(clip){remember();getState().audioClip=clip;cancelRecording();clipNotice='Registrazione pronta · '+clip.duration+' s';mark();renderControls();toast('Reazione registrata · salvata nel preset.');}
        }
      }
      if(replay&&getState().audioClip!==replay.clip){stopReplay(false);clipNotice='Replay fermato: registrazione cambiata.';}
      if(replay){
        replay.position=Math.max(0,(now-replay.start)/1000);
        bands=sampleAudioClip(replay.clip,replay.position,{loop:c.clipLoop,seam:c.clipSeam});
        if(!c.clipLoop&&replay.position>=replay.clip.duration){stopReplay();clipNotice='Replay completato · ritorno alla base';}
      }else{
        for(const key of Object.keys(replayTail)){
          replayTail[key]*=Math.exp(-dt/c.release);if(replayTail[key]<.0001)replayTail[key]=0;
          bands[key]=Math.min(1,(bands[key]||0)+replayTail[key]);
        }
      }
      const next=Object.values(bands).map(value=>Math.round(value*10000)).join(','),changed=next!==signature;signature=next;
      if(now-lastUi>100){syncUi();lastUi=now;}return changed;
    }
  };
}
