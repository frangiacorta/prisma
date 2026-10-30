import {onlineDirector} from './director-connection.js?v=35455dbed4a0';
import {DIRECTOR_BRIEF,validateDirectorPlan} from './director-model.js?v=35455dbed4a0';

const wait=(ms,signal)=>new Promise((resolve,reject)=>{if(signal.aborted)return reject(new DOMException('Interrotto','AbortError'));const done=()=>{signal.removeEventListener('abort',abort);resolve();},timer=setTimeout(done,ms),abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new DOMException('Interrotto','AbortError'));};signal.addEventListener('abort',abort,{once:true});});
export class PlaygroundDirector{
 constructor(engine,{notify=()=>{},save=()=>{},request=(...args)=>fetch(...args)}={}){this.engine=engine;this.notify=notify;this.save=save;this.request=request;this.running=false;this.phase='idle';this.controller=null;this.loading=null;this.turn=0;}
 status(text){this.text=text;this.notify(this);}
 stop(text='Regia interrotta. Hai il controllo del mix attuale.'){
  this.running=false;this.controller?.abort();this.controller=null;this.endOnlineSession();
  if(this.loading){this.engine.generation[this.loading]++;this.engine.pending[this.loading]=false;this.loading=null;}
  this.engine.mix(this.engine.config.mix);this.phase='idle';this.status(text);this.save();
 }
 async start(){
  if(this.running)return;
  if(!onlineDirector()&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname)){this.phase='unavailable';this.status('Apri la sessione nella Regia online per usarla anche dal telefono, oppure sul PC con Codex.');return;}
  if(!this.engine.decks.A||!this.engine.decks.B||Object.values(this.engine.pending).some(Boolean)){this.status('Attendi che entrambe le scene siano pronte.');return;}
  this.engine.flow.stop();this.engine.mix(this.engine.config.mix);
  const controller=new AbortController(),signal=controller.signal;this.controller=controller;this.running=true;this.phase='connecting';this.status(onlineDirector()?'Collego la regia online…':'Collego Codex…');
  try{
   const response=await this.request('/api/assistant/status',{cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])}),connection=await response.json();
   if(!response.ok||!connection.available||!connection.token)throw Error(connection.message||'Apri Codex e accedi, poi riprova.');
   if(!connection.director)throw Error('Il servizio Prisma sul PC va aggiornato e riavviato per usare la regia AI.');
   if(connection.cloud){const r=await this.request('/api/director/session',{method:'POST',headers:{'Content-Type':'application/json','X-Prisma-Assistant':connection.token},body:'{}',signal});const session=await r.json();if(!r.ok)throw Error(session.error||'Avvio non riuscito.');if(signal.aborted)return;this.onlineSession={id:session.id,token:connection.token};this.usage={attempts:0,limit:session.limit,dayUsed:session.dayUsed,dayLimit:session.dayLimit};}
   while(!signal.aborted){
    if(document.hidden)throw Error('Regia sospesa: torna a questa scheda e riavviala quando vuoi.');
    const e=this.engine,c=e.config,d=c.director;
    this.phase='observing';this.status('Osservo la scena e il movimento…');
    const frames=[this.capture()];await wait(1000,signal);frames.push(this.capture());
    const decks={A:{name:e.decks.A.name,state:structuredClone(e.decks.A.state)},B:{name:e.decks.B.name,state:structuredClone(e.decks.B.state)}};
    this.phase='thinking';this.status('La regia sta scegliendo il prossimo intervento. La scena continua a muoversi.');
    const r=await this.request('/api/director',{method:'POST',headers:{'Content-Type':'application/json','X-Prisma-Assistant':connection.token},body:JSON.stringify({session:this.onlineSession?.id,frames,decks,mix:c.mix,stats:e.stats,brief:d.brief||DIRECTOR_BRIEF,memory:d.memory,history:d.history}),signal:AbortSignal.any([signal,AbortSignal.timeout(165000)])});
    const raw=await r.json();if(!r.ok)throw Error(raw.error||'Regia non disponibile.');if(signal.aborted)break;
    if(raw.usage)this.usage=raw.usage;
    const plan=validateDirectorPlan(raw,decks);
    this.phase='preparing';this.status(plan.observation+' '+plan.intent);
    if(plan.action==='evolve'){
     // Settle a held overlay before replacing a texture. Never replace a visible deck.
     const visible=c.mix<.5?'A':'B',hidden=visible==='A'?'B':'A',endpoint=visible==='A'?0:1;
     if(Math.abs(c.mix-endpoint)>.001){Object.assign(c,{duration:2,unit:'seconds',curve:'smooth',quantize:false,transition:'fade'});e.take(endpoint);await this.transition(signal);}
     if(signal.aborted)break;this.loading=hidden;
     const ok=await e.load(hidden,{state:plan.state,name:plan.name||'Regia AI',ratio:e.ratio,phase:0,playing:true});this.loading=null;
     if(signal.aborted)break;if(!ok)throw Error('La nuova scena non è pronta. Il mix precedente è conservato.');
     Object.assign(c,{transition:plan.transition,direction:plan.direction,curve:plan.curve,duration:plan.seconds,unit:'seconds',quantize:false});
     this.phase='transition';this.status(plan.intent);e.take(hidden==='B'?plan.blend:1-plan.blend);await this.transition(signal);
    }
    if(signal.aborted)break;
    d.memory=plan.memory;d.history=[...d.history,{at:new Date().toISOString(),observation:plan.observation,intent:plan.intent,name:plan.name,source:plan.source}].slice(-8);this.turn++;
    this.save();if(this.usage&&this.usage.attempts>=this.usage.limit){this.phase='idle';this.status('Sessione completata: limite di '+this.usage.limit+' decisioni raggiunto. La scena continua; puoi riprendere i comandi.');break;}this.phase='watching';this.status(plan.intent+' Â· Osservo questo passaggio.');await wait(plan.holdSeconds*1000,signal);
   }
  }catch(error){if(!signal.aborted){this.engine.mix(this.engine.config.mix);this.phase='error';this.running=false;this.status(error.message+' Puoi continuare manualmente o riprovare.');}}
  finally{if(this.controller===controller){this.endOnlineSession();this.controller=null;this.running=false;this.notify(this);}}
 }
 endOnlineSession(){const session=this.onlineSession;this.onlineSession=null;if(session)this.request('/api/director/stop',{method:'POST',headers:{'Content-Type':'application/json','X-Prisma-Assistant':session.token},body:JSON.stringify({session:session.id}),keepalive:true}).catch(()=>{});}
 capture(){const source=this.engine.mixer.canvas;if(!source.width||!source.height)throw Error('Uscita video non pronta.');const c=document.createElement('canvas');c.width=640;c.height=Math.max(160,Math.round(640*source.height/source.width));const ctx=c.getContext('2d');ctx.drawImage(source,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.78);}
 async transition(signal){while(this.engine.job){await wait(100,signal);if(document.hidden)throw Error('Regia sospesa: la scheda non è visibile.');}}
}
