import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {handleDirector} from '../director-api.mjs';
import {newCreation} from '../../creative-model.js';
import {validateDirectorPlan} from '../../director-model.js';

const time=Date.parse('2026-11-02T12:00:00Z');
const plan={observation:'Volume chiaro su fondo nero.',intent:'Mantieni la scena.',memory:'Memoria dal server.',action:'hold',source:'A',name:'Prova',changes:[],palette:[],transition:'fade',direction:0,curve:'smooth',seconds:2,blend:1,holdSeconds:8};
const jpeg=Buffer.alloc(120);jpeg[0]=255;jpeg[1]=216;
const scene={frames:Array(2).fill('data:image/jpeg;base64,'+jpeg.toString('base64')),decks:{A:{name:'A',state:newCreation()},B:{name:'B',state:newCreation()}},brief:'Prova.',memory:'',history:[],mix:0,stats:{}};
test('a replacement palette creates its new slots before applying color changes',()=>{
 const proposal={...plan,action:'evolve',palette:['#112233','#445566'],changes:[{path:'palette.1',value:'#778899'}]};
 assert.deepEqual(validateDirectorPlan(proposal,scene.decks).state.palette,['#112233','#778899']);
 assert.throws(()=>validateDirectorPlan({...proposal,palette:[]},scene.decks),/Controllo non valido: palette.1/);
});
const provider=(proposal=plan)=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(proposal)}]}],usage:{input_tokens:321,output_tokens:123}});
async function setup(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of ['0000_ancient_thunderbolt.sql','0001_certain_sentinel.sql','0002_next_cassandra_nova.sql'])sqlite.exec(await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const DB={prepare(sql){const s=sqlite.prepare(sql);let args=[];return {bind(...v){args=v;return this;},async first(){return s.get(...args)||null;},async run(){return s.run(...args);}};}};
 const env={DB,OPENAI_API_KEY:'unit-test-placeholder'};
 async function call(path,body={},fetcher=async()=>provider(),owner='owner'){
  const request=new Request('https://prisma.test'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://prisma.test','X-Prisma-Assistant':'same-origin',...(owner?{'oai-authenticated-user-id':owner}:{})},body:JSON.stringify(body)});
  const response=await handleDirector(request,env,{fetcher,now:()=>time});return {status:response.status,body:await response.json()};
 }
 const session=async()=>{const r=await call('/api/director/session');assert.equal(r.status,200);return r.body.id;};
 return {sqlite,call,session};
}

test('rejected AI plans and stop report consumed attempts and returned tokens',async()=>{
 const q=await setup();try{
  const session=await q.session();
  const invalid={...plan,changes:[{path:'unavailableControl',value:1}]};
  const result=await q.call('/api/director',{...scene,session},async()=>provider(invalid));
  assert.equal(result.status,502);assert.equal(result.body.usage.attempts,1);assert.equal(result.body.usage.dayUsed,1);
  assert.equal(result.body.usage.inputTokens+result.body.usage.outputTokens,444);
  const row=q.sqlite.prepare('SELECT memory,history FROM director_sessions WHERE id=?').get(session);
  assert.equal(row.memory,'');assert.equal(row.history,'[]');
  const stopped=await q.call('/api/director/stop',{session});assert.equal(stopped.body.usage.attempts,1);assert.equal(stopped.body.usage.outputTokens,123);
 }finally{q.sqlite.close();}
});

test('second decision uses persisted memory and history instead of stale client values',async()=>{
 const q=await setup();try{
  const session=await q.session();assert.equal((await q.call('/api/director',{...scene,session})).status,200);
  let prompt='';const result=await q.call('/api/director',{...scene,session,memory:'CLIENT_STALE',history:[]},async(_url,options)=>{prompt=JSON.parse(options.body).input[0].content[0].text;return provider({...plan,memory:'Memoria aggiornata.'});});
  assert.equal(result.status,200);assert.match(prompt,/MEMORIA="Memoria dal server\."/);assert.doesNotMatch(prompt,/CLIENT_STALE/);
  const row=q.sqlite.prepare('SELECT memory,history FROM director_sessions WHERE id=?').get(session);
  assert.equal(row.memory,'Memoria aggiornata.');assert.equal(JSON.parse(row.history).length,2);assert.equal(result.body.usage.attempts,2);
 }finally{q.sqlite.close();}
});

test('stop during inference prevents a late proposal from being applied',async()=>{
 const q=await setup();try{
  const session=await q.session();let entered,release;
  const ready=new Promise(resolve=>entered=resolve);const pending=new Promise(resolve=>release=resolve);
  const decision=q.call('/api/director',{...scene,session},async()=>{entered();await pending;return provider();});
  await ready;const stopped=await q.call('/api/director/stop',{session});assert.equal(stopped.body.usage.attempts,1);
  release();const result=await decision;assert.equal(result.status,410);assert.equal(result.body.usage.outputTokens,123);
  const row=q.sqlite.prepare('SELECT memory,history,stopped FROM director_sessions WHERE id=?').get(session);
  assert.equal(row.memory,'');assert.equal(row.history,'[]');assert.equal(row.stopped,1);
 }finally{q.sqlite.close();}
});

test('owner isolation and persistent session/day quotas prevent provider calls',async()=>{
 const q=await setup();try{
  const session=await q.session();let requests=0;const fetcher=async()=>{requests++;return provider();};
  assert.equal((await q.call('/api/director',{...scene,session},fetcher,'other-owner')).status,404);
  assert.equal((await q.call('/api/director',{...scene,session},fetcher,'')).status,401);
  q.sqlite.prepare('UPDATE director_sessions SET attempts=12 WHERE id=?').run(session);
  const exhausted=await q.call('/api/director',{...scene,session},fetcher);assert.equal(exhausted.status,429);assert.equal(exhausted.body.usage.attempts,12);
  q.sqlite.prepare('INSERT INTO director_days(owner,day,attempts) VALUES(?,?,60)').run('owner','2026-11-02');
  assert.equal((await q.call('/api/director/session')).status,429);assert.equal(requests,0);
 }finally{q.sqlite.close();}
});
