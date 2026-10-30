import {prepareDirector} from '../director-request.js';
import {DIRECTOR_SCHEMA,validateDirectorPlan} from '../director-model.js';

export const SESSION_LIMIT=12,DAY_LIMIT=60,MODEL='gpt-5.4-mini';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const usage=row=>({attempts:row.attempts,limit:row.limit_count,inputTokens:row.input_tokens,outputTokens:row.output_tokens});
async function readBody(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail('Formato non valido.',415);
 if(Number(request.headers.get('content-length'))>3200000)throw fail('Scena troppo grande.',413);
 const reader=request.body?.getReader();if(!reader)throw fail('Richiesta vuota.');
 const decoder=new TextDecoder();let size=0,text='';
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>3200000){await reader.cancel();throw fail('Scena troppo grande.',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}catch(e){if(e.status)throw e;throw fail('Richiesta non valida.');}finally{reader.releaseLock();}
}
const configured=env=>!!env.OPENAI_API_KEY;
export async function handleDirector(request,env,{fetcher=fetch,now=()=>Date.now()}={}){
 const url=new URL(request.url),route=url.pathname;
 const owner=request.headers.get('oai-authenticated-user-id');
 if(!owner)return json({error:'Accedi con il tuo account per usare la regia.'},401);
 // Sites is owner-private. Identity comes from its authenticated dispatch, never a browser token.
 if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Apri la regia dal suo sito personale.'},403);
 if(route==='/api/assistant/status'&&request.method==='GET')return json({available:configured(env),director:true,cloud:true,token:'same-origin',model:MODEL,sessionLimit:SESSION_LIMIT,dayLimit:DAY_LIMIT,message:configured(env)?'Regia online pronta.':'Regia online predisposta. Manca il collegamento dell’account API; Forma, Particelle e Flow sono disponibili.'});
 if(request.method!=='POST')return json({error:'Metodo non disponibile.'},405);
 if(request.headers.get('x-prisma-assistant')!=='same-origin'||request.headers.get('origin')!==url.origin)return json({error:'Collegamento non valido.'},403);
 try{
  if(!env.DB)throw fail('Archivio della regia non disponibile.',503);
  const body=await readBody(request),time=now();
  if(route==='/api/director/session'){
   if(!configured(env))throw fail('Collega l’account API per attivare la regia online.',503);
   // Clean expired records; never store frames, API keys or full scene states.
   await env.DB.prepare('DELETE FROM director_sessions WHERE expires < ?').bind(time-86400000).run();
   const busy=await env.DB.prepare('SELECT id FROM director_sessions WHERE owner=? AND lease>? AND stopped=0 LIMIT 1').bind(owner,time).first();
   if(busy)throw fail('Una decisione è già in corso. Attendi qualche secondo.',409);
   const day=new Date(time).toISOString().slice(0,10);
   const daily=await env.DB.prepare('SELECT attempts FROM director_days WHERE owner=? AND day=?').bind(owner,day).first();
   if(daily?.attempts>=DAY_LIMIT)throw fail('Limite giornaliero raggiunto. Puoi continuare manualmente.',429);
   await env.DB.prepare('UPDATE director_sessions SET stopped=1 WHERE owner=?').bind(owner).run();
   const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO director_sessions (id,owner,expires,limit_count) VALUES (?,?,?,?)').bind(id,owner,time+3600000,SESSION_LIMIT).run();
   return json({id,limit:SESSION_LIMIT,dayLimit:DAY_LIMIT,dayUsed:daily?.attempts||0});
  }
  if(!['/api/director','/api/director/stop'].includes(route))throw fail('Operazione non disponibile.',404);
  if(typeof body.session!=='string'||body.session.length>80)throw fail('Sessione non valida.');
  let session=await env.DB.prepare('SELECT * FROM director_sessions WHERE id=? AND owner=?').bind(body.session,owner).first();
  if(!session)throw fail('Sessione non trovata.',404);
  if(route==='/api/director/stop'){await env.DB.prepare('UPDATE director_sessions SET stopped=1 WHERE id=? AND owner=?').bind(body.session,owner).run();return json({stopped:true});}
  if(!configured(env))throw fail('Account API non collegato.',503);
  if(session.stopped||session.expires<time)throw fail('Sessione conclusa. Premi Regia AI per ricominciare.',410);
  const prepared=prepareDirector({...body,memory:session.attempts?session.memory:body.memory,history:session.attempts?JSON.parse(session.history):body.history});
  const lease=time+180000;
  const locked=await env.DB.prepare('UPDATE director_sessions SET lease=?,attempts=attempts+1 WHERE id=? AND owner=? AND stopped=0 AND expires>? AND lease<=? AND attempts<limit_count RETURNING *').bind(lease,body.session,owner,time,time).first();
  if(!locked)throw fail(session.attempts>=session.limit_count?'Limite della sessione raggiunto. Puoi continuare manualmente.':'Una decisione è già in corso.',session.attempts>=session.limit_count?429:409);
  session=locked;
  const day=new Date(time).toISOString().slice(0,10),leaseOwner=session.id+':'+session.attempts;
  try{
   await env.DB.prepare('INSERT INTO director_days (owner,day,attempts) VALUES (?,?,0) ON CONFLICT(owner,day) DO NOTHING').bind(owner,day).run();
   const quota=await env.DB.prepare('UPDATE director_days SET attempts=attempts+1,lease=?,lease_owner=? WHERE owner=? AND day=? AND attempts<? AND lease<=? RETURNING attempts').bind(lease,leaseOwner,owner,day,DAY_LIMIT,time).first();
   if(!quota)throw fail('Limite giornaliero raggiunto o decisione ancora in corso. Puoi continuare manualmente.',429);
   const response=await fetcher('https://api.openai.com/v1/responses',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.OPENAI_API_KEY},
    body:JSON.stringify({model:MODEL,store:false,max_output_tokens:4096,reasoning:{effort:'low'},
     input:[{role:'user',content:[{type:'input_text',text:prepared.prompt},...prepared.frames.map(image_url=>({type:'input_image',image_url,detail:'low'}))]}],
     text:{format:{type:'json_schema',name:'prisma_direction',strict:true,schema:DIRECTOR_SCHEMA}},tools:[]}),
    signal:AbortSignal.any([request.signal,AbortSignal.timeout(145000)]),
   });
   if(!response.ok){await response.body?.cancel();throw fail(response.status===429?'Credito o limite API raggiunto. La scena resta disponibile.':'Il servizio AI non ha completato la richiesta. La scena è conservata.',502);}
   const result=await response.json(),tokens=result.usage||{};
   const input=Number.isSafeInteger(tokens.input_tokens)?Math.max(0,tokens.input_tokens):0,output=Number.isSafeInteger(tokens.output_tokens)?Math.max(0,tokens.output_tokens):0;
   await env.DB.prepare('UPDATE director_sessions SET input_tokens=input_tokens+?,output_tokens=output_tokens+? WHERE id=?').bind(input,output,body.session).run();
   if(result.status!=='completed')throw fail('La decisione AI è incompleta. Nessuna modifica applicata.',502);
   const texts=(result.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text);
   if(texts.length!==1)throw fail('La regia non ha restituito una decisione valida.',502);
   let plan;try{plan=validateDirectorPlan(JSON.parse(texts[0]),prepared.decks);}catch{throw fail('La proposta AI contiene controlli non validi. La scena è conservata.',502);}
   const history=[...(session.attempts>1?JSON.parse(session.history):(Array.isArray(body.history)?body.history:[])),{at:new Date(time).toISOString(),observation:plan.observation,intent:plan.intent,name:plan.name,source:plan.source}].slice(-8).map(h=>Object.fromEntries(['at','observation','intent','name','source'].map(k=>[k,String(h?.[k]||'').slice(0,1000)])));
   const saved=await env.DB.prepare('UPDATE director_sessions SET memory=?,history=? WHERE id=? AND owner=? AND stopped=0 AND lease=? RETURNING *').bind(plan.memory,JSON.stringify(history),body.session,owner,lease).first();
   if(!saved)throw fail('Regia interrotta. La risposta non verrà applicata.',410);
   return json({...plan,usage:{...usage(saved),dayUsed:quota.attempts,dayLimit:DAY_LIMIT}});
  }finally{await env.DB.prepare('UPDATE director_sessions SET lease=0 WHERE id=? AND owner=? AND lease=?').bind(body.session,owner,lease).run();await env.DB.prepare('UPDATE director_days SET lease=0,lease_owner=\'\' WHERE owner=? AND day=? AND lease_owner=?').bind(owner,day,leaseOwner).run();}
 }catch(error){return json({error:error.name==='AbortError'||error.name==='TimeoutError'?'Regia interrotta o tempo di attesa superato.':error.status?error.message:'La regia non ha completato la richiesta. Nessuna modifica applicata.'},error.status||503);}
}
