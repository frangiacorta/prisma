import {BODY_META,BODY_LABELS,normalizeBodyTracking,BodyTrackingState,bodyPreviewState} from './body-tracking-model.js?v=14e2ae89e5f8';
import {BodyCamera} from './body-camera.js?v=14e2ae89e5f8';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountBodyTracking({board,getState,remember,mark,renderControls,showTab,toast,invalidate}){
 const runtime=new BodyTrackingState(),overlay=document.createElement('div');
 overlay.id='body-tracking-overlay';overlay.setAttribute('aria-hidden','true');board.append(overlay);
 let mode='off',connection='',fields=[],arms=[],diagnostics=[],signature='',lastStatus=0,lastPacket=0;
 const camera=new BodyCamera({onStatus:message=>{connection=message;updateStatus();},onError:message=>{stop();connection=message;updateStatus();},onResult:packet=>{runtime.receive(packet,performance.now());arms=packet.arms;diagnostics=packet.diagnostics||[];lastPacket=performance.now();}});
 const settings=()=>normalizeBodyTracking(getState().bodyTracking);
 function stop(){camera.stop();mode='off';connection='';runtime.clear();fields=[];arms=[];diagnostics=[];signature='';overlay.replaceChildren();invalidate();drawCamera();}
 function status(){
  if(mode==='off')return connection||'Webcam spenta. Avviala oppure prova i gesti simulati.';
  if(mode==='demo')return 'Demo · mani e braccia simulate, webcam spenta';
  if(connection!=='Webcam attiva')return connection;
  const unstable=fields.filter(p=>p.unstable);if(unstable.length)return 'Aggancio instabile · '+unstable.map(p=>p.label).join(' · ')+' · attendo conferma prima di muovere';
  const current=fields.filter(p=>!p.lost);
  return current.length?'Rilevati: '+current.map(p=>p.label+(p.partial?' (polso)':'')).join(' · '):'Webcam attiva · inquadra mani, gomiti e spalle. Una persona alla volta.';
 }
 function diagnosticText(){if(mode!=='camera'||connection!=='Webcam attiva')return '';return diagnostics.map(d=>BODY_LABELS[d.id]+': '+(!settings().sources[d.id]?.enabled?'disattivato nei controlli':d.missing.length?d.missing.join(', ')+' non abbastanza visibili':'spalla, gomito e polso rilevati')).join(' · ');}
 function updateStatus(){const note=document.getElementById('body-camera-diagnostics');if(note){note.textContent=diagnosticText();note.hidden=!note.textContent;}const el=document.getElementById('body-tracking-status');if(el&&el.textContent!==status())el.textContent=status();}
 function drawCamera(){
  const canvas=document.getElementById('body-camera-preview');if(!canvas)return;
  canvas.hidden=mode!=='camera'||!camera.stream;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  if(canvas.hidden||camera.video.readyState<2)return;
  const video=camera.video;canvas.height=Math.round(canvas.width*video.videoHeight/video.videoWidth);
  ctx.drawImage(video,0,0,canvas.width,canvas.height);ctx.strokeStyle='#a6efcd';ctx.lineWidth=2;
  if(performance.now()-lastPacket>500)return;
  for(const arm of arms){if(runtime.tracks.get(arm.id)?.rejected)continue;ctx.beginPath();arm.joints.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x*canvas.width,p.y*canvas.height));ctx.stroke();}
  for(const [id,t] of runtime.tracks){if(performance.now()-t.seen>500)continue;ctx.fillStyle=id.startsWith('arm')?'#ffe2a8':'#a6efcd';ctx.beginPath();ctx.arc(t.raw.x*canvas.width,t.raw.y*canvas.height,4,0,Math.PI*2);ctx.fill();ctx.font='12px sans-serif';ctx.fillText(BODY_LABELS[id],Math.min(canvas.width-65,Math.max(2,t.raw.x*canvas.width+6)),Math.max(14,t.raw.y*canvas.height-6));}
 }
 function panel(){
  const c=settings(),isFields=getState().engine==='particles'&&c.target==='fields';
  const slider=(key,path=key,value=c[key])=>{const [name,min,max,step]=BODY_META[key];return `<div class="param"><div class="param-line"><label for="body-${path}">${name}</label><input class="number" type="number" data-body-number="${path}" aria-label="${name}: valore" min="${min}" max="${max}" step="${step}" value="${value}"></div><input id="body-${path}" type="range" data-body-param="${path}" min="${min}" max="${max}" step="${step}" value="${value}" style="--fill:${(value-min)/(max-min)*100}%"></div>`;};
  const check=(key,label,value)=>`<label class="check"><input type="checkbox" data-body-check="${key}" ${value?'checked':''}>${label}</label>`;
  return `<details id="body-tracking-controls" class="control-details" open><summary>Mani e braccia</summary>
   <p id="body-tracking-status" class="help" role="status">${escape(status())}</p>
   <div class="force-actions"><button class="outline" data-body-action="connect">Avvia webcam</button><button class="quiet" data-body-action="stop">Spegni webcam</button><button class="quiet" data-body-action="demo">Prova i gesti</button></div>
   <canvas id="body-camera-preview" class="body-camera-preview" width="320" height="240" hidden aria-label="Anteprima webcam con mani e braccia rilevate"></canvas>
   <p id="body-camera-diagnostics" class="help" ${diagnosticText()?'':'hidden'}>${escape(diagnosticText())}</p>
   <p class="help">Inquadra mani, gomiti e spalle. I punti A e B sono indicati nel video. Il riconoscimento avviene sul dispositivo; il video non viene registrato né inviato.</p>
   <button class="outline full" data-body-action="centre">Fissa posizione neutra</button>
   <p class="help">Mettiti comodo e premi per partire da qui. La prima posizione rilevata è usata automaticamente come riferimento.</p>
   ${getState().engine==='particles'?`<label class="field">Risposta<select data-body-select="target"><option value="fields" ${c.target==='fields'?'selected':''}>Attrazione e repulsione locali</option><option value="move" ${c.target==='move'?'selected':''}>Muovi l’intera forma</option></select></label>`:''}
   <details class="control-details" open><summary>${isFields?'Risposta dei campi':'Movimento della forma'}</summary>${isFields?'<p class="help">Mani e braccia spostano quattro campi indipendenti. Regola forza e raggio nelle sezioni sotto.</p>':`<p class="help">Sposta le mani o le braccia per traslare e orientare la forma. Allontana A e B per ingrandirla; inclinale per ruotarla. Imposta a zero le risposte che non vuoi usare.</p>${['moveAmount','turnAmount','sizeAmount'].map(k=>slider(k)).join('')}`}${slider('smoothing')}</details>
   ${Object.entries(BODY_LABELS).map(([id,label])=>{const p=c.sources[id];return `<details class="control-details"><summary>${label}</summary>${check('sources.'+id+'.enabled','Usa '+label.toLowerCase(),p.enabled)}<label class="field">Azione<select data-body-select="sources.${id}.mode"><option value="attract" ${p.mode==='attract'?'selected':''}>${isFields?'Attira':'Segue il gesto'}</option><option value="repel" ${p.mode==='repel'?'selected':''}>${isFields?'Respingi':'Movimento opposto'}</option></select></label>${(isFields?['strength','radius','swirl','z']:['strength']).map(k=>slider(k,'sources.'+id+'.'+k,p[k])).join('')}</details>`;}).join('')}
   <details class="control-details"><summary>Inquadratura e sensibilità</summary>${['gainX','gainY','offsetX','offsetY','rotation','deadzone'].map(k=>slider(k)).join('')}${check('mirrorX','Inverti destra e sinistra',c.mirrorX)}${check('mirrorY','Inverti alto e basso',c.mirrorY)}<p class="help">Dopo aver cambiato gli assi, fissa di nuovo la posizione neutra. L’anteprima video mostra sempre l’inquadratura originale.</p></details>
   <details class="control-details"><summary>Perdita e riaggancio</summary><label class="field">Quando esci dall’inquadratura<select data-body-select="loss"><option value="fade" ${c.loss==='fade'?'selected':''}>Attenua e torna alla scena di base</option><option value="hold" ${c.loss==='hold'?'selected':''}>Mantieni l’ultima influenza</option></select></label>${slider('hold')}${slider('fade')}${check('show','Mostra i punti sulla scena',c.show)}</details>
   <button class="outline full" data-body-action="freeze">Congela questa influenza nel preset</button><p class="help">Le impostazioni si salvano nel preset. I gesti sono live: per esportare la posa attuale, congelala. La registrazione animata dei gesti non è ancora disponibile.</p></details>`;
 }
 const controls=document.querySelector('#controls');
 controls.addEventListener('input',e=>{const el=e.target,path=el.dataset.bodyParam||el.dataset.bodyNumber||el.dataset.bodyCheck||el.dataset.bodySelect;if(!path)return;if(!el.dataset.bodyEditing){remember();el.dataset.bodyEditing='1';}const c=settings(),keys=path.split('.');let obj=c;for(const key of keys.slice(0,-1))obj=obj[key];obj[keys.at(-1)]=el.hasAttribute('data-body-check')?el.checked:el.hasAttribute('data-body-select')?el.value:Number(el.value);getState().bodyTracking=normalizeBodyTracking(c);mark();const v=keys.reduce((a,k)=>a[k],getState().bodyTracking);for(const other of controls.querySelectorAll('[data-body-param],[data-body-number]'))if((other.dataset.bodyParam||other.dataset.bodyNumber)===path){other.value=v;if(other.type==='range')other.style.setProperty('--fill',(v-other.min)/(other.max-other.min)*100+'%');}});
 controls.addEventListener('change',e=>{delete e.target.dataset.bodyEditing;if(e.target.dataset.bodySelect==='target')renderControls();});
 controls.addEventListener('click',e=>{
  const action=e.target.closest('[data-body-action]')?.dataset.bodyAction;if(!action)return;
  if(action==='connect'){stop();mode='camera';camera.start();}
  if(action==='demo'){stop();mode='demo';}
  if(action==='stop')stop();
  if(action==='centre'){if(!fields.some(f=>!f.lost)){toast('Inquadra almeno una mano o un braccio prima di centrare.');return;}runtime.centre();toast('Posizione neutra fissata.');}
  if(action==='freeze'){
   if(!fields.length){toast('Attendi un punto visibile o avvia la demo.');return;}
   const s=getState(),c=settings();
   if(s.engine==='particles'&&c.target==='fields'){
    const original=s.forcePoints||[];if(original.length+fields.length>8){toast('Libera '+(original.length+fields.length-8)+' punti manuali prima di congelare.');return;}
    remember();let id=Math.max(0,...original.map(p=>p.id));s.forcePoints=[...original,...fields.map(p=>({id:++id,enabled:true,x:p.x,y:p.y,z:p.z,strength:p.strength,radius:p.radius,swirl:p.swirl}))];
   }else{remember();const moved=bodyPreviewState(s,fields);for(const key of ['positionX','positionY','rotateX','rotateY','rotateZ','scale'])s[key]=moved[key];}
   stop();mark();toast('Posa congelata nel preset e negli export.');
  }
  renderControls();
 });
 const button=document.createElement('button');button.id='body-tracking-tool';button.className='tool';button.innerHTML='◉<span class="tool-label">Mani e braccia</span>';button.title='Controllo mani e braccia';button.setAttribute('aria-label','Controllo mani e braccia');document.querySelector('.canvas-tools .tool-separator').before(button);
 button.onclick=()=>{showTab('body');const panel=document.querySelector('#body-tracking-controls');panel.open=true;panel.scrollIntoView({block:'nearest'});};
 addEventListener('pagehide',stop);
 return {panel,get active(){return mode!=='off';},preview:s=>bodyPreviewState(s,fields),tick(now){
  if(mode==='off'){updateStatus();return false;}
  if(mode==='demo'){const t=now*.0006;runtime.receive({cameraActive:true,points:Object.keys(BODY_LABELS).map((id,i)=>({id,x:.5+(i%2?1:-1)*(.22+.08*Math.sin(t))+.09*Math.sin(t*.7),y:.5+.1*Math.cos(t+(i%2))+(i>1?-.12:0),ageMs:0}))},now);}
  fields=runtime.sample(getState().bodyTracking,board.clientWidth/Math.max(1,board.clientHeight),now);
  const next=JSON.stringify([settings(),...fields.map(p=>[p.id,...['x','y','z','strength','radius','swirl','opacity'].map(k=>Math.round(p[k]*10000)),p.origin,p.lost,p.unstable])]);const changed=next!==signature;signature=next;
  if(changed){const visible=settings().show?fields:[],ids=new Set(visible.map(p=>p.id));for(const dot of [...overlay.children])if(!ids.has(dot.dataset.point))dot.remove();for(const p of visible){let dot=overlay.querySelector(`[data-point="${p.id}"]`);if(!dot){dot=document.createElement('span');dot.dataset.point=p.id;dot.textContent=p.label;overlay.append(dot);}dot.className='body-tracking-point'+(p.lost?' lost':'');dot.style.cssText=`left:${p.screen.x*100}%;top:${p.screen.y*100}%;opacity:${p.opacity}`;}}
  if(now-lastStatus>100){updateStatus();drawCamera();lastStatus=now;}
  return changed;
 }};
}
