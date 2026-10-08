import {sameAssistantSource} from './assistant-model.js?v=94ae8e7aefbb';
const local=()=>['127.0.0.1','localhost','[::1]'].includes(location.hostname);
export function mountCreativeAssistant({getState,applyPlan,quickCommand,setPlaying,importCreation,getSnapshot}){
 const $=id=>document.getElementById(id),status=$('description-status'),mode=$('description-engine'),submit=$('description-apply'),cancel=$('assistant-cancel'),connect=$('assistant-retry'),pc=$('assistant-open-pc');
 let token=null,controller=null,history=[],available=false;
 function message(text,kind='success'){status.textContent=text;status.dataset.kind=kind;}
 function readyUI(){submit.textContent=controller?'Interpreto…':mode.value==='codex'?'Interpreta e applica':'Applica comando';submit.disabled=!!controller;mode.disabled=!!controller;cancel.hidden=!controller;pc.hidden=local()||mode.value!=='codex';connect.hidden=!local()||mode.value!=='codex'||available;}
 async function connection(){
  if(!local()){$('description-mode').textContent='Assistente disponibile sul PC';readyUI();return;}
  try{const r=await fetch('/api/assistant/status',{cache:'no-store',signal:AbortSignal.timeout(18000)});const s=await r.json();available=r.ok&&s.available;token=available?s.token:null;$('description-mode').textContent=available?'Codex collegato':'Codex non collegato';if(!available)message(s.message||'Avvia Prisma con PRISMA-CREATIVO.cmd sul PC.','partial');}
  catch{$('description-mode').textContent='Servizio locale non disponibile';available=false;token=null;}
  readyUI();
 }
 async function submitDescription(event){
  event?.preventDefault();if(controller)return;
  const prompt=$('creation-description').value.trim();if(!prompt)return message('Descrivi quello che vuoi cambiare.','partial');
  if(mode.value==='quick'){try{quickCommand(prompt);}catch(e){message(e.message,'error');}return;}
  if(!local())return message('Per il testo libero usa “Continua sul PC”: porta con te questa creazione. Su cellulare puoi usare tutti i controlli e i comandi rapidi.','partial');
  if(!available||!token){await connection();if(!available)return message('L’assistente non è collegato. Apri Codex sul PC e premi Ricollega.','error');}
  const source=structuredClone(getState()),abort=new AbortController();controller=abort;readyUI();message('Sto interpretando la tua richiesta sulla creazione attuale…');$('assistant-changes').hidden=true;
  try{
   const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json','X-Prisma-Assistant':token},body:JSON.stringify({prompt,state:source,history}),signal:abort.signal});const response=await r.json();
   if(!r.ok)throw Error(response.error||'Richiesta non completata.');
   if(abort.signal.aborted)return;
   if(!sameAssistantSource(getState(),source))return message('Hai modificato la creazione durante la risposta. Ho conservato le tue modifiche: premi Interpreta di nuovo per adattare la richiesta alla scena attuale.','partial');
   if(response.clarification){history.push({request:prompt,reply:response.clarification});history=history.slice(-4);message(response.clarification,'partial');return;}
   const result=applyPlan(response.plan);if(response.play!==null)setPlaying(response.play);
   history.push({request:prompt,reply:response.message});history=history.slice(-4);
   message(response.message+(result.changed?'':response.play!==null?'':' I valori erano già impostati.'));
   const list=$('assistant-change-list');list.replaceChildren();for(const note of result.notes){const li=document.createElement('li');li.textContent=note;list.append(li);}$('assistant-changes').hidden=!result.notes.length;
  }catch(e){message(abort.signal.aborted?'Richiesta interrotta. Nessuna modifica applicata.':e.message,'error');}
  finally{controller=null;readyUI();}
 }
 $('description-form').onsubmit=submitDescription;
 cancel.onclick=()=>controller?.abort();connect.onclick=()=>connection();mode.onchange=()=>{readyUI();$('description-help').textContent=mode.value==='quick'?'Comandi rapidi senza AI: usa nomi dei controlli e valori precisi. Le parti non riconosciute vengono segnalate.':'Descrivi liberamente quello che vuoi, anche per immagini e sensazioni. Codex legge questa scena e le ultime richieste scritte qui. Ogni modifica si può annullare.';};
 pc.onclick=()=>{const snapshot={...getSnapshot(),prompt:$('creation-description').value};const url='http://127.0.0.1:8242/?engine='+getState().engine+'#prisma-assistant='+encodeURIComponent(JSON.stringify(snapshot));window.open(url,'_blank','noopener');message('Sul PC si apre la stessa creazione con il testo pronto. Il servizio deve essere avviato con PRISMA-CREATIVO.cmd.');};
 if(local()&&location.hash.startsWith('#prisma-assistant=')){
  try{const data=JSON.parse(decodeURIComponent(location.hash.slice('#prisma-assistant='.length)));if(location.hash.length>120000)throw Error('Trasferimento troppo grande');importCreation(data);$('creation-description').value=String(data.prompt||'').slice(0,4000);message('Creazione trasferita. Premi Interpreta e applica per inviare la richiesta a Codex.');}
  catch{message('Trasferimento non valido: la creazione precedente è conservata.','error');}
  window.history.replaceState(null,'',location.pathname+location.search);
 }
 readyUI();connection();window.addEventListener('pagehide',()=>controller?.abort());
}
